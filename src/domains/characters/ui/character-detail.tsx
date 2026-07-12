import {
	Alert,
	Badge,
	Box,
	Button,
	Group,
	Modal,
	NumberInput,
	Paper,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	ApiClientError,
	apiMutations,
	apiQueries,
	apiQueryKeys,
	type CharacterDetailResponse,
} from "../../../generated/api-client.generated.js";
import { characterRoutePath, shouldHandleCharacterLink } from "./character-route.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";
import { validateCharacterLevel } from "./create-character-form.js";
import { CharacterHealthPanel } from "./health-panel.js";
import { CharacterSpellSlotsPanel } from "./spell-slot-panel.js";

interface CharacterDetailProps {
	id: string;
	onNavigate: NavigateToCharacterRoute;
}

export function CharacterDetail({ id, onNavigate }: CharacterDetailProps) {
	const characterQuery = useQuery(apiQueries.getCharacter({ characterId: id }));

	return (
		<Stack gap="lg">
			<Group justify="space-between" align="center">
				<Title order={2}>Character details</Title>
				<BackToListButton onNavigate={onNavigate} />
			</Group>

			{characterQuery.isLoading && (
				<Paper withBorder p="lg">
					<Text c="dimmed">Loading character...</Text>
				</Paper>
			)}

			{isNotFound(characterQuery.error) && (
				<Alert color="yellow" title="Character not found" variant="light">
					<Text size="sm">This character is not available in the current session.</Text>
				</Alert>
			)}

			{characterQuery.error && !isNotFound(characterQuery.error) && (
				<Alert color="red" title="Character unavailable" variant="light">
					Refresh the page to try again.
				</Alert>
			)}

			{characterQuery.data && (
				<Paper withBorder p="lg">
					<Stack gap="md">
						<Title order={3}>{characterQuery.data.character.name}</Title>
						<Group gap="xs">
							<Badge variant="light">{characterQuery.data.character.className}</Badge>
							<Badge color="candle" variant="light">
								Level {characterQuery.data.character.level}
							</Badge>
							<CharacterLevelEditor
								characterId={characterQuery.data.character.id}
								level={characterQuery.data.character.level}
							/>
						</Group>
						<CharacterHealthPanel
							characterId={characterQuery.data.character.id}
							health={characterQuery.data.character.health}
							recentHealthChanges={characterQuery.data.character.recentHealthChanges}
						/>
						<CharacterSpellSlotsPanel
							characterId={characterQuery.data.character.id}
							level={characterQuery.data.character.level}
						/>
					</Stack>
				</Paper>
			)}
		</Stack>
	);
}

function CharacterLevelEditor({ characterId, level }: { characterId: string; level: number }) {
	const [opened, setOpened] = useState(false);
	const queryClient = useQueryClient();
	const form = useForm<{ level: number | string }>({
		mode: "controlled",
		initialValues: { level },
		validate: { level: validateCharacterLevel },
	});
	const updateMutation = useMutation({
		...apiMutations.updateCharacterLevel(),
		onSuccess: async (response) => {
			queryClient.setQueryData(
				apiQueryKeys.getCharacter({ characterId }),
				(current: CharacterDetailResponse | undefined) => (current ? response : current),
			);
			await queryClient.invalidateQueries({ queryKey: apiQueryKeys.listCharacters() });
			form.setValues({ level: response.character.level });
			setOpened(false);
		},
	});

	function openEditor() {
		form.setValues({ level });
		setOpened(true);
	}

	return (
		<>
			<Button onClick={openEditor} size="compact-xs" variant="subtle">
				Edit level
			</Button>
			<Modal onClose={() => setOpened(false)} opened={opened} title="Edit level">
				<Box
					component="form"
					onSubmit={form.onSubmit((values) => {
						updateMutation.mutate({
							params: { characterId },
							body: { level: Number(values.level) },
						});
					})}
				>
					<Stack gap="md">
						<NumberInput
							{...form.getInputProps("level")}
							allowDecimal={false}
							allowNegative={false}
							data-autofocus
							hideControls
							label="Character level"
							max={20}
							min={1}
							withAsterisk
						/>
						<Group justify="flex-end">
							<Button onClick={() => setOpened(false)} type="button" variant="default">
								Cancel
							</Button>
							<Button loading={updateMutation.isPending} type="submit">
								Save level
							</Button>
						</Group>
						{updateMutation.error && (
							<Alert color="red" title="Level update failed" variant="light">
								Try the change again.
							</Alert>
						)}
					</Stack>
				</Box>
			</Modal>
		</>
	);
}

function BackToListButton({ onNavigate }: { onNavigate: NavigateToCharacterRoute }) {
	return (
		<Button
			component="a"
			href={characterRoutePath({ screen: "list" })}
			onClick={(event) => {
				if (!shouldHandleCharacterLink(event)) return;
				event.preventDefault();
				onNavigate({ screen: "list" });
			}}
			variant="subtle"
		>
			Back to characters
		</Button>
	);
}

function isNotFound(error: Error | null) {
	return error instanceof ApiClientError && error.status === 404;
}
