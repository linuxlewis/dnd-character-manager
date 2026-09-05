import {
	Alert,
	Box,
	Button,
	Checkbox,
	Divider,
	Group,
	Modal,
	NumberInput,
	Select,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation } from "@tanstack/react-query";
import {
	apiMutations,
	type CharacterAttributesResponse,
} from "../../../generated/api-client.generated.js";
import {
	buildCharacterAttributes,
	CHARACTER_ABILITIES,
	CHARACTER_SKILLS,
} from "../config/index.js";
import type { CharacterAttributes } from "../types/index.js";
import { formatSignedModifier } from "../types/index.js";
import {
	type AttributeDraft,
	attributeDraftFromSaved,
	attributesEqual,
	normalizeAttributeDraft,
	validateAttributeDraft,
} from "./character-attributes-ui.js";

const skillRankOptions = [
	{ value: "none", label: "None" },
	{ value: "half", label: "Half proficiency" },
	{ value: "proficient", label: "Proficient" },
	{ value: "expertise", label: "Expertise" },
];

export function CharacterAttributesEditor({
	attributes,
	characterId,
	characterLevel,
	onClose,
	onSaved,
	opened,
}: {
	attributes: CharacterAttributes;
	characterId: string;
	characterLevel: number;
	onClose: () => void;
	onSaved: (response: CharacterAttributesResponse) => void;
	opened: boolean;
}) {
	const form = useForm<AttributeDraft>({
		mode: "controlled",
		initialValues: attributeDraftFromSaved(attributes),
	});
	const updateMutation = useMutation(apiMutations.updateCharacterAttributes());
	const normalizedPreview = normalizeAttributeDraft(form.values);
	const preview = normalizedPreview
		? buildCharacterAttributes({
				level: characterLevel,
				scores: normalizedPreview.scores,
				savingThrowProficiencies: normalizedPreview.savingThrowProficiencies
					.filter((entry) => entry.rank === "proficient")
					.map((entry) => ({ key: entry.key, rank: "proficient" as const })),
				skillProficiencies: normalizedPreview.skillProficiencies
					.filter((entry) => entry.rank !== "none")
					.map((entry) => ({
						key: entry.key,
						rank: entry.rank as "half" | "proficient" | "expertise",
					})),
			})
		: null;

	function closeEditor() {
		if (!updateMutation.isPending) onClose();
	}

	function saveDraft(values: AttributeDraft) {
		form.clearErrors();
		const errors = validateAttributeDraft(values);
		for (const [path, message] of Object.entries(errors)) form.setFieldError(path, message);
		if (Object.keys(errors).length > 0) return;

		const request = normalizeAttributeDraft(values);
		if (!request) return;
		const saved = normalizeAttributeDraft(attributeDraftFromSaved(attributes));
		if (saved && attributesEqual(request, saved)) {
			onClose();
			return;
		}

		updateMutation.reset();
		updateMutation.mutate({ params: { characterId }, body: request }, { onSuccess: onSaved });
	}

	return (
		<Modal
			centered
			closeButtonProps={{ "aria-label": "Close edit attributes dialog" }}
			fullScreen={isNarrowViewport()}
			onClose={closeEditor}
			opened={opened}
			size="xl"
			styles={{
				content: { maxWidth: "calc(100vw - 2rem)" },
				inner: { left: 0, padding: 0, right: 0 },
			}}
			title="Edit attributes"
			withinPortal={false}
		>
			<Box component="form" onSubmit={form.onSubmit(saveDraft)}>
				<Stack gap="lg">
					<Text c="dimmed" size="sm">
						Changes update the preview and save together.
					</Text>
					<SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
						<AbilityEditor form={form} />
						<SkillEditor form={form} />
					</SimpleGrid>
					<Divider />
					<Preview attributes={preview} />
					{updateMutation.error && (
						<Alert color="red" title="Attributes could not be saved" variant="light">
							Your draft is still here. Check the connection and try saving again.
						</Alert>
					)}
					<Group justify="flex-end">
						<Button
							disabled={updateMutation.isPending}
							onClick={closeEditor}
							type="button"
							variant="default"
						>
							Cancel
						</Button>
						<Button loading={updateMutation.isPending} type="submit">
							Save changes
						</Button>
					</Group>
				</Stack>
			</Box>
		</Modal>
	);
}

function AbilityEditor({ form }: { form: ReturnType<typeof useForm<AttributeDraft>> }) {
	return (
		<Stack gap="sm">
			<Title order={3} size="h5">
				Ability scores &amp; saves
			</Title>
			{CHARACTER_ABILITIES.map((ability, index) => {
				const savingThrow = form.values.savingThrowProficiencies[index];
				return (
					<Stack gap={4} key={ability.key}>
						<Group align="flex-end" gap="sm" wrap="nowrap">
							<NumberInput
								{...form.getInputProps(`scores.${ability.key}`)}
								allowDecimal={false}
								allowNegative={false}
								label={ability.label}
								max={30}
								min={1}
								style={{ flex: 1 }}
							/>
							<Checkbox
								checked={savingThrow?.rank === "proficient"}
								label={`${ability.label} save proficient`}
								onChange={(event) =>
									form.setFieldValue(
										`savingThrowProficiencies.${index}.rank`,
										event.currentTarget.checked ? "proficient" : "none",
									)
								}
							/>
						</Group>
					</Stack>
				);
			})}
		</Stack>
	);
}

function SkillEditor({ form }: { form: ReturnType<typeof useForm<AttributeDraft>> }) {
	return (
		<Stack gap="sm">
			<Title order={3} size="h5">
				Skill proficiencies
			</Title>
			{CHARACTER_SKILLS.map((skill, index) => (
				<Select
					{...form.getInputProps(`skillProficiencies.${index}.rank`)}
					data={skillRankOptions}
					key={skill.key}
					label={skill.label}
					leftSection={
						<Text c="dimmed" size="xs">
							{skill.ability.slice(0, 3).toUpperCase()}
						</Text>
					}
				/>
			))}
		</Stack>
	);
}

function Preview({ attributes }: { attributes: CharacterAttributes | null }) {
	if (!attributes) {
		return (
			<Text c="dimmed" size="sm">
				Preview appears when all scores are valid.
			</Text>
		);
	}
	const find = (id: string) => attributes.rollReference.find((roll) => roll.id === id)?.total ?? 0;
	return (
		<Stack gap={2}>
			<Text fw={700} size="sm">
				Preview
			</Text>
			<Text c="dimmed" size="sm">
				Stealth {formatSignedModifier(find("skill-stealth"))} / Wisdom save{" "}
				{formatSignedModifier(find("saving-throw-wisdom"))} / Passive Perception{" "}
				{find("passive-perception")}
			</Text>
		</Stack>
	);
}

function isNarrowViewport() {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(max-width: 47.99em)").matches
	);
}
