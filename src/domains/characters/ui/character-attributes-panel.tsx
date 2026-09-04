import {
	Alert,
	Button,
	Divider,
	Group,
	Loader,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	apiQueries,
	apiQueryKeys,
	type CharacterAttributesResponse,
} from "../../../generated/api-client.generated.js";
import { CHARACTER_ABILITIES } from "../config/index.js";
import { formatSignedModifier } from "../types/index.js";
import { CharacterAttributesEditor } from "./character-attributes-editor.js";
import {
	type RollFilter,
	rollMatchesCategory,
	rollMatchesSearch,
} from "./character-attributes-ui.js";
import { RollGroups } from "./character-roll-reference.js";

export function CharacterAttributesPanel({
	characterId,
	characterLevel,
}: {
	characterId: string;
	characterLevel: number;
}) {
	const queryClient = useQueryClient();
	const [editorOpen, setEditorOpen] = useState(false);
	const [editorVersion, setEditorVersion] = useState(0);
	const attributesQuery = useQuery({
		...apiQueries.getCharacterAttributes({ characterId }),
		retry: false,
	});

	return (
		<Stack gap="lg" py="lg">
			<Group align="flex-start" justify="space-between" gap="sm" wrap="wrap">
				<Stack gap={2}>
					<Title id="character-section-heading" order={3} size="h4">
						Attributes &amp; Rolls
					</Title>
					<Text c="dimmed" size="sm">
						A quick reference for ability checks, saves, and skills.
					</Text>
				</Stack>
				<Button
					onClick={() => {
						setEditorVersion((version) => version + 1);
						setEditorOpen(true);
					}}
					variant="light"
				>
					Edit attributes
				</Button>
			</Group>

			{attributesQuery.isLoading && (
				<Group justify="center" py="xl">
					<Loader size="sm" />
					<Text c="dimmed">Loading attributes and rolls...</Text>
				</Group>
			)}
			{attributesQuery.error && (
				<Alert color="red" title="Attributes and rolls unavailable" variant="light">
					Could not load this reference. Try again.
					<Button mt="sm" onClick={() => void attributesQuery.refetch()} size="sm" variant="light">
						Retry attributes
					</Button>
				</Alert>
			)}
			{attributesQuery.data && (
				<CharacterAttributesContent
					attributes={attributesQuery.data.attributes}
					characterId={characterId}
					characterLevel={characterLevel}
					editorVersion={editorVersion}
					editorOpen={editorOpen}
					onCloseEditor={() => setEditorOpen(false)}
					onSaved={(response) => {
						queryClient.setQueryData(
							apiQueryKeys.getCharacterAttributes({ characterId }),
							response,
						);
						setEditorOpen(false);
					}}
				/>
			)}
		</Stack>
	);
}

function CharacterAttributesContent({
	attributes,
	characterId,
	characterLevel,
	editorVersion,
	editorOpen,
	onCloseEditor,
	onSaved,
}: {
	attributes: CharacterAttributesResponse["attributes"];
	characterId: string;
	characterLevel: number;
	editorVersion: number;
	editorOpen: boolean;
	onCloseEditor: () => void;
	onSaved: (response: CharacterAttributesResponse) => void;
}) {
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<RollFilter>("all");
	const [expanded, setExpanded] = useState<string[]>([]);
	const abilityLabels = new Map(CHARACTER_ABILITIES.map((ability) => [ability.key, ability.label]));
	const visibleRolls = attributes.rollReference.filter((roll) => {
		return (
			rollMatchesCategory(roll.category, filter) &&
			rollMatchesSearch(roll.label, abilityLabels.get(roll.ability) ?? roll.ability, search)
		);
	});

	return (
		<>
			<SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="xl">
				<Stack gap="sm">
					<Text fw={700} size="sm" tt="uppercase">
						Ability scores
					</Text>
					<SimpleGrid cols={{ base: 1, xs: 2, md: 1 }} spacing="xs">
						{CHARACTER_ABILITIES.map((ability) => (
							<Group justify="space-between" key={ability.key} wrap="nowrap">
								<Text>{ability.label}</Text>
								<Group className="numeric" gap="md" wrap="nowrap">
									<Text c="dimmed">{attributes.scores[ability.key]}</Text>
									<Text fw={700}>{formatSignedModifier(attributes.modifiers[ability.key])}</Text>
								</Group>
							</Group>
						))}
					</SimpleGrid>
				</Stack>
				<Stack gap="sm">
					<Text fw={700} size="sm" tt="uppercase">
						Derived references
					</Text>
					<DerivedReference label="Proficiency bonus" value={attributes.proficiencyBonus} />
					<DerivedReference label="Initiative" value={getRollTotal(attributes, "initiative")} />
					<DerivedReference
						label="Passive Perception"
						unsigned
						value={getRollTotal(attributes, "passive-perception")}
					/>
				</Stack>
				<Stack gap="sm" className="attributes-reference-note">
					<Text fw={700} size="sm" tt="uppercase">
						Reference notes
					</Text>
					<Text c="dimmed" size="sm">
						Totals are calculated from this character&apos;s saved scores and proficiency
						selections.
					</Text>
				</Stack>
			</SimpleGrid>

			<Divider />
			<Stack gap="sm">
				<Group align="flex-end" gap="sm" justify="space-between" wrap="wrap">
					<Stack gap={2}>
						<Text fw={700} size="lg">
							Roll reference
						</Text>
						<Text c="dimmed" size="sm">
							Expand a row to see every saved contribution.
						</Text>
					</Stack>
					<TextInput
						aria-label="Search rolls"
						placeholder="Search rolls or abilities"
						value={search}
						onChange={(event) => setSearch(event.currentTarget.value)}
						w={{ base: "100%", sm: 280 }}
					/>
				</Group>
				<RollFilterButtons activeFilter={filter} onChange={setFilter} />
				{visibleRolls.length === 0 ? (
					<Text c="dimmed" py="md">
						No rolls match this search.
					</Text>
				) : (
					<RollGroups expanded={expanded} onExpandedChange={setExpanded} rolls={visibleRolls} />
				)}
			</Stack>
			<CharacterAttributesEditor
				attributes={attributes}
				characterId={characterId}
				characterLevel={characterLevel}
				key={editorVersion}
				onClose={onCloseEditor}
				onSaved={onSaved}
				opened={editorOpen}
			/>
		</>
	);
}

function DerivedReference({
	label,
	unsigned = false,
	value,
}: {
	label: string;
	unsigned?: boolean;
	value: number;
}) {
	return (
		<Group justify="space-between" wrap="nowrap">
			<Text c="dimmed" size="sm">
				{label}
			</Text>
			<Text className="numeric" fw={700}>
				{unsigned ? value : formatSignedModifier(value)}
			</Text>
		</Group>
	);
}

function getRollTotal(attributes: CharacterAttributesResponse["attributes"], id: string) {
	return attributes.rollReference.find((roll) => roll.id === id)?.total ?? 0;
}

function RollFilterButtons({
	activeFilter,
	onChange,
}: {
	activeFilter: RollFilter;
	onChange: (filter: RollFilter) => void;
}) {
	return (
		<Group aria-label="Roll category filters" gap="xs" role="group" wrap="wrap">
			{(
				[
					["all", "All"],
					["checks", "Checks & skills"],
					["saves", "Saving throws"],
					["other", "Other"],
				] as const
			).map(([value, label]) => (
				<Button
					aria-pressed={activeFilter === value}
					key={value}
					onClick={() => onChange(value)}
					size="sm"
					variant={activeFilter === value ? "light" : "default"}
				>
					{label}
				</Button>
			))}
		</Group>
	);
}
