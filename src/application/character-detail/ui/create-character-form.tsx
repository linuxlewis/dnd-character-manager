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
import { CHARACTER_CLASSES, type CharacterClass } from "../../../domains/characters/types/index.js";
import {
	characterRoutePath,
	type NavigateToCharacterRoute,
	shouldHandleCharacterLink,
	validateCharacterClass,
	validateCharacterLevel,
	validateCharacterName,
} from "../../../domains/characters/ui/index.js";
import { apiMutations, apiQueryKeys } from "../../../generated/api-client.generated.js";

interface CreateCharacterFormProps {
	onNavigate: NavigateToCharacterRoute;
}

interface CharacterFormValues {
	className: CharacterClass | "";
	level: number | string;
	name: string;
}

export const DEFAULT_CHARACTER_MAX_HP = 10;

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
			className: "",
			level: 1,
		},
		validate: {
			name: validateCharacterName,
			className: validateCharacterClass,
			level: validateCharacterLevel,
		},
	});
	const createMutation = useMutation({
		...apiMutations.createCharacter(),
		onSuccess: async (response) => {
			queryClient.setQueryData(
				apiQueryKeys.getCharacter({ characterId: response.character.id }),
				response,
			);
			await queryClient.invalidateQueries({ queryKey: apiQueryKeys.listCharacters() });
			form.reset();
			onNavigate({ screen: "detail", id: response.character.id });
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
						className: values.className as CharacterClass,
						level: Number(values.level),
						maxHp: DEFAULT_CHARACTER_MAX_HP,
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
						{...form.getInputProps("className")}
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
						hideControls
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
