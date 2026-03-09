import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../app/components/ui/button.tsx";
import { Input } from "../../../app/components/ui/input.tsx";
import { Label } from "../../../app/components/ui/label.tsx";
import { Skeleton } from "../../../app/components/ui/skeleton.tsx";
import { useNavigate } from "../../../app/router.tsx";
import type { AbilityScores, Character } from "../types/index.js";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

const ABILITY_LABELS: Record<string, string> = {
	STR: "Strength",
	DEX: "Dexterity",
	CON: "Constitution",
	INT: "Intelligence",
	WIS: "Wisdom",
	CHA: "Charisma",
};

type CharacterFormValues = {
	name: string;
	race: string;
	class: string;
	level: number;
	abilityScores: AbilityScores;
};

type FormErrors = {
	name?: string;
	race?: string;
	class?: string;
	level?: string;
	[key: string]: string | undefined;
};

interface CharacterFormProps {
	id?: string;
}

export function CharacterForm({ id }: CharacterFormProps) {
	const navigate = useNavigate();
	const isEdit = id !== undefined && id !== "new";
	const [serverError, setServerError] = useState<string | null>(null);
	const [loading, setLoading] = useState(isEdit);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errors, setErrors] = useState<FormErrors>({});

	const [formData, setFormData] = useState<CharacterFormValues>({
		name: "",
		race: "",
		class: "",
		level: 1,
		abilityScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
	});

	useEffect(() => {
		if (!isEdit) return;
		fetch(`/api/characters/${id}`)
			.then((r) => r.json())
			.then((c: Character) => {
				setFormData({
					name: c.name,
					race: c.race,
					class: c.class,
					level: c.level,
					abilityScores: c.abilityScores,
				});
			})
			.catch(() => {
				setServerError("Failed to load character");
				toast.error("Failed to load character");
			})
			.finally(() => setLoading(false));
	}, [id, isEdit]);

	function validateForm(data: CharacterFormValues): FormErrors {
		const newErrors: FormErrors = {};

		if (!data.name.trim()) {
			newErrors.name = "Name is required";
		} else if (data.name.length > 255) {
			newErrors.name = "Name must be 255 characters or less";
		}

		if (!data.race.trim()) {
			newErrors.race = "Race is required";
		} else if (data.race.length > 100) {
			newErrors.race = "Race must be 100 characters or less";
		}

		if (!data.class.trim()) {
			newErrors.class = "Class is required";
		} else if (data.class.length > 100) {
			newErrors.class = "Class must be 100 characters or less";
		}

		if (data.level < 1 || data.level > 20) {
			newErrors.level = "Level must be between 1 and 20";
		}

		return newErrors;
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setServerError(null);
		setErrors({});

		const validationErrors = validateForm(formData);
		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			return;
		}

		setIsSubmitting(true);
		const data = {
			...formData,
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
				toast.error("Failed to save character");
				return;
			}
			toast.success(isEdit ? "Character updated!" : "Character created!");
			navigate("/");
		} catch {
			setServerError("Network error");
			toast.error("Network error — check your connection");
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleInputChange(
		field: keyof Omit<CharacterFormValues, "abilityScores">,
		value: string | number,
	) {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	}

	function handleAbilityScoreChange(ability: keyof AbilityScores, value: number) {
		setFormData((prev) => ({
			...prev,
			abilityScores: { ...prev.abilityScores, [ability]: value },
		}));
	}

	if (loading)
		return (
			<div className="max-w-full sm:max-w-[600px] mx-auto p-4 space-y-4" aria-busy="true">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-8 w-48" />
				<div className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			</div>
		);

	return (
		<div className="max-w-full sm:max-w-[600px] mx-auto p-4 animate-fade-in">
			<Button variant="outline" className="mb-4" onClick={() => navigate("/")}>
				<ArrowLeft className="h-4 w-4" />
				Back
			</Button>
			<h1 className="text-2xl font-heading font-bold text-foreground mb-4">
				{isEdit ? "Edit Character" : "New Character"}
			</h1>
			<form
				onSubmit={onSubmit}
				className="space-y-4"
				aria-label={isEdit ? "Edit character form" : "Create character form"}
			>
				<div>
					<Label htmlFor="name">Name</Label>
					<Input
						id="name"
						value={formData.name}
						onChange={(e) => handleInputChange("name", e.target.value)}
						placeholder="Enter character name"
						aria-invalid={!!errors.name}
						aria-describedby={errors.name ? "name-error" : undefined}
						autoComplete="off"
					/>
					{errors.name && (
						<p id="name-error" className="text-sm text-destructive mt-1" role="alert">
							{errors.name}
						</p>
					)}
				</div>

				<div>
					<Label htmlFor="race">Race</Label>
					<Input
						id="race"
						value={formData.race}
						onChange={(e) => handleInputChange("race", e.target.value)}
						placeholder="Enter character race"
						aria-invalid={!!errors.race}
						aria-describedby={errors.race ? "race-error" : undefined}
						autoComplete="off"
					/>
					{errors.race && (
						<p id="race-error" className="text-sm text-destructive mt-1" role="alert">
							{errors.race}
						</p>
					)}
				</div>

				<div>
					<Label htmlFor="class">Class</Label>
					<Input
						id="class"
						value={formData.class}
						onChange={(e) => handleInputChange("class", e.target.value)}
						placeholder="Enter character class"
						aria-invalid={!!errors.class}
						aria-describedby={errors.class ? "class-error" : undefined}
						autoComplete="off"
					/>
					{errors.class && (
						<p id="class-error" className="text-sm text-destructive mt-1" role="alert">
							{errors.class}
						</p>
					)}
				</div>

				<div>
					<Label htmlFor="level">Level</Label>
					<Input
						id="level"
						type="number"
						min={1}
						max={20}
						value={formData.level}
						onChange={(e) => handleInputChange("level", e.target.valueAsNumber || 1)}
						aria-invalid={!!errors.level}
						aria-describedby={errors.level ? "level-error" : undefined}
					/>
					{errors.level && (
						<p id="level-error" className="text-sm text-destructive mt-1" role="alert">
							{errors.level}
						</p>
					)}
				</div>

				<fieldset className="border-0 p-0 m-0">
					<legend className="text-sm font-heading font-bold text-foreground mb-3">
						Ability Scores
					</legend>
					<div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
						{ABILITY_KEYS.map((key) => (
							<div key={key}>
								<Label htmlFor={`ability-${key}`} className="text-xs">
									{ABILITY_LABELS[key]} ({key})
								</Label>
								<Input
									id={`ability-${key}`}
									type="number"
									min={1}
									max={30}
									value={formData.abilityScores[key]}
									onChange={(e) => handleAbilityScoreChange(key, e.target.valueAsNumber || 10)}
								/>
							</div>
						))}
					</div>
				</fieldset>

				{serverError && (
					<div
						role="alert"
						className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm font-medium text-destructive"
					>
						{serverError}
					</div>
				)}

				<Button type="submit" size="lg" className="w-full mt-2" disabled={isSubmitting}>
					{isSubmitting ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							Saving...
						</>
					) : isEdit ? (
						"Save Changes"
					) : (
						"Create Character"
					)}
				</Button>
			</form>
		</div>
	);
}
