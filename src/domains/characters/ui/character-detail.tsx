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
	TextInput,
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
import { validateCharacterLevel, validateCharacterName } from "./create-character-form.js";
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
						<Group gap="xs" align="center">
							<Title order={3}>{characterQuery.data.character.name}</Title>
							<CharacterEditor
								characterId={characterQuery.data.character.id}
								level={characterQuery.data.character.level}
								name={characterQuery.data.character.name}
							/>
						</Group>
						<Group gap="xs">
							<Badge variant="light">{characterQuery.data.character.className}</Badge>
							<Badge color="candle" variant="light">
								Level {characterQuery.data.character.level}
							</Badge>
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

function CharacterEditor({
	characterId,
	level,
	name,
}: {
	characterId: string;
	level: number;
	name: string;
}) {
	const [opened, setOpened] = useState(false);
	const queryClient = useQueryClient();
	const form = useForm<{ name: string; level: number | string }>({
		mode: "controlled",
		initialValues: { level, name },
		validate: { level: validateCharacterLevel, name: validateCharacterName },
	});
	const updateLevelMutation = useMutation(apiMutations.updateCharacterLevel());
	const updateNameMutation = useMutation(apiMutations.updateCharacterName());
	const isSaving = updateLevelMutation.isPending || updateNameMutation.isPending;
	const updateError = updateLevelMutation.error || updateNameMutation.error;

	function openEditor() {
		updateLevelMutation.reset();
		updateNameMutation.reset();
		form.clearErrors();
		form.setValues({ level, name });
		setOpened(true);
	}

	function closeEditor() {
		if (isSaving) return;
		setOpened(false);
	}

	function applyCharacterResponse(response: CharacterDetailResponse) {
		queryClient.setQueryData(
			apiQueryKeys.getCharacter({ characterId }),
			(current: CharacterDetailResponse | undefined) => (current ? response : current),
		);
		form.setValues({
			level: response.character.level,
			name: response.character.name,
		});
	}

	async function saveCharacter(values: { name: string; level: number | string }) {
		updateLevelMutation.reset();
		updateNameMutation.reset();

		const nextName = values.name.trim();
		const nextLevel = Number(values.level);
		const shouldUpdateName = nextName !== name;
		const shouldUpdateLevel = nextLevel !== level;

		if (!shouldUpdateName && !shouldUpdateLevel) {
			setOpened(false);
			return;
		}

		let didSave = false;
		try {
			if (shouldUpdateName) {
				const response = await updateNameMutation.mutateAsync({
					params: { characterId },
					body: { name: nextName },
				});
				applyCharacterResponse(response);
				didSave = true;
			}

			if (shouldUpdateLevel) {
				const response = await updateLevelMutation.mutateAsync({
					params: { characterId },
					body: { level: nextLevel },
				});
				applyCharacterResponse(response);
				didSave = true;
			}

			if (didSave) {
				await queryClient.invalidateQueries({ queryKey: apiQueryKeys.listCharacters() });
			}
			setOpened(false);
		} catch {
			if (didSave) {
				await queryClient.invalidateQueries({ queryKey: apiQueryKeys.listCharacters() });
			}
		}
	}

	return (
		<>
			<Button onClick={openEditor} size="compact-xs" variant="subtle">
				Edit character
			</Button>
			<Modal onClose={closeEditor} opened={opened} title="Edit character">
				<Box component="form" onSubmit={form.onSubmit(saveCharacter)}>
					<Stack gap="md">
						<TextInput
							{...form.getInputProps("name")}
							autoComplete="off"
							data-autofocus
							label="Character name"
							maxLength={120}
							withAsterisk
						/>
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
							<Button disabled={isSaving} onClick={closeEditor} type="button" variant="default">
								Cancel
							</Button>
							<Button loading={isSaving} type="submit">
								Save character
							</Button>
						</Group>
						{updateError && (
							<Alert color="red" title="Character update failed" variant="light">
								One or more changes could not be saved. Try the change again.
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
