import { Alert, Box, Button, Group, Modal, NumberInput, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
	apiMutations,
	apiQueryKeys,
	type CharacterDetailResponse,
} from "../../../generated/api-client.generated.js";
import { validateCharacterLevel, validateCharacterName } from "./create-character-form.js";

import classes from "./health-workspace.module.css";

export function CharacterEditor({
	characterId,
	experiencePoints,
	level,
	name,
	opened: controlledOpened,
	onClose,
}: {
	characterId: string;
	experiencePoints: number;
	level: number;
	name: string;
	opened?: boolean;
	onClose?: () => void;
}) {
	const [localOpened, setLocalOpened] = useState(false);
	const opened = controlledOpened ?? localOpened;
	function setOpened(next: boolean) {
		setLocalOpened(next);
		if (!next) onClose?.();
	}
	const saving = useRef(false);
	const [savedFields, setSavedFields] = useState<string[]>([]);
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
		setSavedFields([]);
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
	}

	async function saveCharacter(values: {
		experiencePoints: number | string;
		level: number | string;
		name: string;
	}) {
		if (saving.current) return;
		saving.current = true;
		setSavedFields([]);
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
			saving.current = false;
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
				setSavedFields((fields) => [...fields, "Name"]);
				didSave = true;
			}

			if (shouldUpdateLevel) {
				const response = await updateLevelMutation.mutateAsync({
					params: { characterId },
					body: { level: nextLevel },
				});
				applyCharacterResponse(response);
				setSavedFields((fields) => [...fields, "Level"]);
				didSave = true;
			}

			if (shouldUpdateExperiencePoints) {
				const response = await updateExperienceMutation.mutateAsync({
					params: { characterId },
					body: { experiencePoints: nextExperiencePoints },
				});
				applyCharacterResponse(response);
				setSavedFields((fields) => [...fields, "Experience"]);
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
		} finally {
			saving.current = false;
		}
	}

	return (
		<>
			{controlledOpened === undefined && (
				<Button mih={44} onClick={openEditor} variant="subtle">
					Edit character
				</Button>
			)}
			<Modal
				classNames={{
					inner: classes.sheetInner,
					content: classes.sheetContent,
					body: classes.sheetBody,
				}}
				onClose={closeEditor}
				opened={opened}
				title="Edit character"
				closeOnEscape={!isSaving}
				closeOnClickOutside={!isSaving}
				closeButtonProps={{ "aria-label": "Close", size: 44, disabled: isSaving }}
			>
				<Box
					component="form"
					onSubmit={form.onSubmit(saveCharacter, (errors) => {
						form.getInputNode(Object.keys(errors)[0])?.focus();
					})}
				>
					<Stack gap="md">
						<TextInput
							{...form.getInputProps("name")}
							size="md"
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
							size="md"
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
							size="md"
							label="Experience points"
							max={9_999_999}
							min={0}
							thousandSeparator=","
							withAsterisk
						/>
						<Group className={classes.actions} justify="flex-end">
							<Button
								mih={44}
								disabled={isSaving}
								onClick={closeEditor}
								type="button"
								variant="default"
							>
								Cancel
							</Button>
							<Button
								className="workspace-primary-action"
								c="black"
								mih={44}
								loading={isSaving}
								type="submit"
							>
								Save character
							</Button>
						</Group>
						{updateError && (
							<Alert color="red" title="Character update failed" variant="light">
								{savedFields.length > 0
									? `${savedFields.join(", ")} saved. Remaining changes could not be saved.`
									: "Changes could not be saved."}{" "}
								Your draft is kept. Retry to save the remaining changes.
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
	if (
		value === "" ||
		!Number.isInteger(experiencePoints) ||
		experiencePoints < 0 ||
		experiencePoints > 9_999_999
	) {
		return "Experience must be a whole number from 0 to 9,999,999";
	}
	return null;
}
