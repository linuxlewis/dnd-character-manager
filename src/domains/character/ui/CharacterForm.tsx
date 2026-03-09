import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../../app/components/ui/button.tsx";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "../../../app/components/ui/form.tsx";
import { Input } from "../../../app/components/ui/input.tsx";
import { useNavigate } from "../../../app/router.tsx";
import { AbilityScoresSchema } from "../types/index.js";
import type { Character } from "../types/index.js";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

const CharacterFormSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	race: z.string().min(1, "Race is required").max(100),
	class: z.string().min(1, "Class is required").max(100),
	level: z.coerce.number().int().min(1, "Level must be at least 1").max(20, "Level must be at most 20"),
	abilityScores: AbilityScoresSchema,
});

type CharacterFormValues = z.infer<typeof CharacterFormSchema>;

interface CharacterFormProps {
	id?: string;
}

export function CharacterForm({ id }: CharacterFormProps) {
	const navigate = useNavigate();
	const isEdit = id !== undefined && id !== "new";
	const [serverError, setServerError] = useState<string | null>(null);
	const [loading, setLoading] = useState(isEdit);

	const form = useForm<CharacterFormValues>({
		resolver: zodResolver(CharacterFormSchema),
		defaultValues: {
			name: "",
			race: "",
			class: "",
			level: 1,
			abilityScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
		},
	});

	useEffect(() => {
		if (!isEdit) return;
		fetch(`/api/characters/${id}`)
			.then((r) => r.json())
			.then((c: Character) => {
				form.reset({
					name: c.name,
					race: c.race,
					class: c.class,
					level: String(c.level),
					abilityScores: c.abilityScores,
				});
			})
			.catch(() => setServerError("Failed to load character"))
			.finally(() => setLoading(false));
	}, [id, isEdit, form]);

	async function onSubmit(values: CharacterFormValues) {
		setServerError(null);
		const data = {
			...values,
			level: Number(values.level),
			hp: { current: 10, max: 10, temp: 0 },
		};

		try {
			const url = isEdit ? `/api/characters/${id}` : "/api/characters";
			const method = isEdit ? "PUT" : "POST";
			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) {
				setServerError("Failed to save character");
				return;
			}
			navigate("/");
		} catch {
			setServerError("Network error");
		}
	}

	if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

	return (
		<div className="max-w-[600px] mx-auto p-4">
			<Button variant="outline" className="mb-4" onClick={() => navigate("/")}>
				<ArrowLeft className="h-4 w-4" />
				Back
			</Button>
			<h1 className="text-2xl font-heading text-foreground mb-4">
				{isEdit ? "Edit Character" : "New Character"}
			</h1>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="race"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Race</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="class"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Class</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="level"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Level</FormLabel>
								<FormControl>
										<Input type="number" min={1} max={20} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<fieldset className="border-0 p-0 m-0">
						<legend className="text-sm font-semibold text-foreground mb-2">Ability Scores</legend>
						<div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
							{ABILITY_KEYS.map((key) => (
								<FormField
									key={key}
									control={form.control}
									name={`abilityScores.${key}`}
									render={({ field }) => (
										<FormItem>
											<FormLabel>{key}</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={1}
													max={30}
													{...field}
													onChange={(e) => field.onChange(e.target.valueAsNumber)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							))}
						</div>
					</fieldset>
					{serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}
					<Button
						type="submit"
						size="lg"
						className="w-full mt-2"
						disabled={form.formState.isSubmitting}
					>
						{form.formState.isSubmitting
							? "Saving..."
							: isEdit
								? "Save Changes"
								: "Create Character"}
					</Button>
				</form>
			</Form>
		</div>
	);
}
