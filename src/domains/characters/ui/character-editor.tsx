import { Alert, Box, Button, Group, Modal, NumberInput, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	apiMutations,
	apiQueryKeys,
	type CharacterDetailResponse,
} from "../../../generated/api-client.generated.js";
import { validateCharacterLevel, validateCharacterName } from "./create-character-form.js";

export function CharacterEditor({
	characterId,
	experiencePoints,
	level,
	name,
}: {
	characterId: string;
	experiencePoints: number;
	level: number;
	name: string;
}) {
	const [opened, setOpened] = useState(false);
	const queryClient = useQueryClient();
	const form = useForm<{
		experiencePoints: number | string;
		level: number | string;
		name: string;
	}>({
		mode: "controlled",
		initialValues: { experiencePoints, level, name },
		validate: {
			experiencePoints: validateCharacterExperiencePoints,
			level: validateCharacterLevel,
			name: validateCharacterName,
		},
	});
	const updateExperienceMutation = useMutation(apiMutations.updateCharacterExperience());
	const updateLevelMutation = useMutation(apiMutations.updateCharacterLevel());
	const updateNameMutation = useMutation(apiMutations.updateCharacterName());
	const isSaving =
		updateExperienceMutation.isPending ||
		updateLevelMutation.isPending ||
		updateNameMutation.isPending;
	const updateError =
		updateExperienceMutation.error || updateLevelMutation.error || updateNameMutation.error;

	function openEditor() {
		updateExperienceMutation.reset();
		updateLevelMutation.reset();
		updateNameMutation.reset();
		form.clearErrors();
		form.setValues({ experiencePoints, level, name });
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
			experiencePoints: response.character.experiencePoints,
			level: response.character.level,
			name: response.character.name,
		});
	}

	async function saveCharacter(values: {
		experiencePoints: number | string;
		level: number | string;
		name: string;
	}) {
		updateExperienceMutation.reset();
		updateLevelMutation.reset();
		updateNameMutation.reset();

		const nextName = values.name.trim();
		const nextLevel = Number(values.level);
		const nextExperiencePoints = Number(values.experiencePoints);
		const shouldUpdateName = nextName !== name;
		const shouldUpdateLevel = nextLevel !== level;
		const shouldUpdateExperiencePoints = nextExperiencePoints !== experiencePoints;

		if (!shouldUpdateName && !shouldUpdateLevel && !shouldUpdateExperiencePoints) {
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

			if (shouldUpdateExperiencePoints) {
				const response = await updateExperienceMutation.mutateAsync({
					params: { characterId },
					body: { experiencePoints: nextExperiencePoints },
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
						<NumberInput
							{...form.getInputProps("experiencePoints")}
							allowDecimal={false}
							allowNegative={false}
							hideControls
							label="Experience points"
							max={9_999_999}
							min={0}
							thousandSeparator=","
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

function validateCharacterExperiencePoints(value: number | string) {
	const experiencePoints = Number(value);
	if (!Number.isInteger(experiencePoints) || experiencePoints < 0 || experiencePoints > 9_999_999) {
		return "Experience must be a whole number from 0 to 9,999,999";
	}
	return null;
}
