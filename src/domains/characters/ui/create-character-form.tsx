import {
	Alert,
	Box,
	Button,
	Group,
	NumberInput,
	Select,
	Stack,
	TextInput,
	Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiMutations, apiQueryKeys } from "../../../generated/api-client.generated.js";
import { CHARACTER_CLASSES, type CharacterClass } from "../types/index.js";
import { characterRoutePath, shouldHandleCharacterLink } from "./character-route.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";

interface CreateCharacterFormProps {
	onNavigate: NavigateToCharacterRoute;
}

interface CharacterFormValues {
	class: CharacterClass | "";
	level: number | string;
	name: string;
}

const characterClassOptions = CHARACTER_CLASSES.map((characterClass) => ({
	value: characterClass,
	label: characterClass,
}));

export function CreateCharacterForm({ onNavigate }: CreateCharacterFormProps) {
	const queryClient = useQueryClient();
	const form = useForm<CharacterFormValues>({
		mode: "controlled",
		initialValues: {
			name: "",
			class: "",
			level: 1,
		},
		validate: {
			name: validateCharacterName,
			class: validateCharacterClass,
			level: validateCharacterLevel,
		},
	});
	const createMutation = useMutation({
		...apiMutations.createCharacter(),
		onSuccess: async (character) => {
			queryClient.setQueryData(apiQueryKeys.getCharacter({ id: character.id }), character);
			await queryClient.invalidateQueries({ queryKey: apiQueryKeys.listCharacters() });
			form.reset();
			onNavigate({ screen: "detail", id: character.id });
		},
	});

	return (
		<Stack gap="lg" maw={520}>
			<Group justify="space-between" align="center">
				<Title order={2}>Create character</Title>
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
			</Group>

			{createMutation.error && (
				<Alert color="red" title="Character could not be saved" variant="light">
					Check the fields and try again.
				</Alert>
			)}

			<Box
				component="form"
				onSubmit={form.onSubmit((values) => {
					createMutation.mutate({
						name: values.name.trim(),
						class: values.class as CharacterClass,
						level: Number(values.level),
					});
				})}
			>
				<Stack gap="md">
					<TextInput
						{...form.getInputProps("name")}
						autoComplete="off"
						label="Name"
						maxLength={120}
						withAsterisk
					/>
					<Select
						{...form.getInputProps("class")}
						data={characterClassOptions}
						label="Class"
						placeholder="Select a class"
						withAsterisk
					/>
					<NumberInput
						{...form.getInputProps("level")}
						allowDecimal={false}
						allowNegative={false}
						label="Level"
						max={20}
						min={1}
						withAsterisk
					/>
					<Group justify="flex-start">
						<Button loading={createMutation.isPending} type="submit">
							Create character
						</Button>
					</Group>
				</Stack>
			</Box>
		</Stack>
	);
}

export function validateCharacterName(value: string) {
	const trimmed = value.trim();
	if (trimmed.length === 0) return "Name is required";
	if (trimmed.length > 120) return "Name must be 120 characters or fewer";
	return null;
}

export function validateCharacterClass(value: CharacterClass | "") {
	if (!CHARACTER_CLASSES.includes(value as CharacterClass)) return "Class is required";
	return null;
}

export function validateCharacterLevel(value: number | string) {
	const level = Number(value);
	if (!Number.isInteger(level) || level < 1 || level > 20) {
		return "Level must be a whole number from 1 to 20";
	}
	return null;
}
