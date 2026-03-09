import { AlertTriangle, ArrowLeft, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../../app/components/ui/badge.tsx";
import { Button } from "../../../app/components/ui/button.tsx";
import { Checkbox } from "../../../app/components/ui/checkbox.tsx";
import { Input } from "../../../app/components/ui/input.tsx";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../../../app/components/ui/tooltip.tsx";
import { cn } from "../../../app/lib/utils.ts";
import { useNavigate } from "../../../app/router.tsx";
import { CONDITION_DETAILS, getAbilityModifier } from "../types/character.js";
import type { Character, CharacterConditionName } from "../types/index.js";
import { ArmorClassSection } from "./ArmorClassSection.tsx";
import { DeleteCharacterDialog } from "./DeleteCharacterDialog.tsx";
import { EquipmentSection } from "./EquipmentSection.tsx";
import { NotesSection } from "./NotesSection.tsx";
import { SavingThrowsSection } from "./SavingThrowsSection.tsx";
import { ShareSection } from "./ShareSection.tsx";
import { SkillsSection } from "./SkillsSection.tsx";
import { SpellSlotsSection } from "./SpellSlotsSection.tsx";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const SRD_CONDITIONS = [
	"Blinded",
	"Charmed",
	"Deafened",
	"Frightened",
	"Grappled",
	"Incapacitated",
	"Invisible",
	"Paralyzed",
	"Petrified",
	"Poisoned",
	"Prone",
	"Restrained",
	"Stunned",
	"Unconscious",
] as const satisfies CharacterConditionName[];

function formatMod(score: number): string {
	const mod = getAbilityModifier(score);
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

async function updateCharacterJson<T>(url: string, body: unknown): Promise<T | null> {
	const response = await fetch(url, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return response.ok ? response.json() : null;
}

async function postCharacterJson<T>(url: string, body?: unknown): Promise<T | null> {
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
	});
	return response.ok ? response.json() : null;
}

export function CharacterSheet({ id, slug }: { id?: string; slug?: string }) {
	const navigate = useNavigate();
	const [character, setCharacter] = useState<Character | null>(null);
	const [loading, setLoading] = useState(true);
	const [notes, setNotes] = useState("");
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const readOnly = !!slug;
	const characterId = id ?? character?.id;

	useEffect(() => {
		const url = slug ? `/api/characters/by-slug/${slug}` : `/api/characters/${id}`;
		fetch(url)
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				setCharacter(data);
				if (data) setNotes(data.notes ?? "");
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [id, slug]);

	const handleDamage = () => {
		const input = prompt("How much damage?");
		if (input === null) return;
		const amount = Number.parseInt(input, 10);
		if (Number.isNaN(amount) || amount <= 0) return;
		postCharacterJson<Character>(`/api/characters/${characterId}/damage`, { amount })
			.then((data) => {
				if (data) {
					setCharacter(data);
					toast.success(`Applied ${amount} damage`);
				} else {
					toast.error("Failed to apply damage");
				}
			})
			.catch(() => toast.error("Network error"));
	};

	const handleHeal = () => {
		const input = prompt("How much healing?");
		if (input === null) return;
		const amount = Number.parseInt(input, 10);
		if (Number.isNaN(amount) || amount <= 0) return;
		postCharacterJson<Character>(`/api/characters/${characterId}/heal`, { amount })
			.then((data) => {
				if (data) {
					setCharacter(data);
					toast.success(`Healed ${amount} HP`);
				} else {
					toast.error("Failed to heal");
				}
			})
			.catch(() => toast.error("Network error"));
	};

	const handleNotesBlur = () => {
		if (!character) return;
		fetch(`/api/characters/${characterId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ notes }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) {
					setCharacter(data);
					toast.success("Notes saved");
				} else {
					toast.error("Failed to save notes");
				}
			})
			.catch(() => toast.error("Network error"));
	};

	const handleDeleteClick = () => {
		setShowDeleteDialog(true);
	};

	const handleDeleteConfirm = () => {
		navigate("/");
	};

	if (loading)
		return (
			<div className="max-w-full sm:max-w-[600px] mx-auto p-4 text-muted-foreground">
				Loading...
			</div>
		);
	if (!character)
		return (
			<div className="max-w-full sm:max-w-[600px] mx-auto p-4 text-muted-foreground">
				Character not found.
			</div>
		);

	const hpPercent = character.hp.max > 0 ? (character.hp.current / character.hp.max) * 100 : 0;

	return (
		<TooltipProvider>
			<div className="max-w-full sm:max-w-[600px] mx-auto p-4 transition-colors overflow-x-hidden [&_*]:max-w-full [&_*]:box-border">
				<Button variant="outline" className="mb-4" onClick={() => navigate("/")}>
					<ArrowLeft className="h-4 w-4" />
					Back
				</Button>
				<div className="flex items-start justify-between gap-4 mb-1">
					<div>
						<h1 className="text-2xl text-foreground">{character.name}</h1>
						<p className="text-muted-foreground mb-4">
							{character.race} {character.class} · Level {character.level}
						</p>
					</div>
					{character.conditions.length > 0 && (
						<Badge variant="destructive" className="gap-1" aria-label="Active conditions indicator">
							<ShieldAlert className="h-3.5 w-3.5" />
							{character.conditions.length} active
						</Badge>
					)}
				</div>
				{character.slug && !readOnly && <ShareSection slug={character.slug} />}
				<AbilityScoresGrid character={character} />
				<HitPointsSection
					character={character}
					hpPercent={hpPercent}
					readOnly={readOnly}
					onDamage={handleDamage}
					onHeal={handleHeal}
					onUpdate={setCharacter}
				/>
				<ConditionsSection character={character} readOnly={readOnly} onUpdate={setCharacter} />
				{!readOnly && characterId && (
					<>
						<ArmorClassSection
							character={character}
							characterId={characterId}
							onUpdate={setCharacter}
						/>
						<SavingThrowsSection
							character={character}
							characterId={characterId}
							onUpdate={setCharacter}
						/>
					</>
				)}
				{characterId && (
					<SkillsSection
						character={character}
						characterId={characterId}
						readOnly={readOnly}
						onUpdate={setCharacter}
					/>
				)}
				{characterId && (
					<SpellSlotsSection
						character={character}
						characterId={characterId}
						onUpdate={setCharacter}
					/>
				)}
				{characterId && (
					<EquipmentSection
						characterId={characterId}
						equipment={character.equipment ?? []}
						onUpdate={readOnly ? () => {} : setCharacter}
					/>
				)}
				<NotesSection
					notes={notes}
					readOnly={readOnly}
					onChange={setNotes}
					onBlur={handleNotesBlur}
				/>
				{!readOnly && (
					<div className="mb-6">
						<Button variant="destructive" className="w-full" onClick={handleDeleteClick}>
							Delete Character
						</Button>
					</div>
				)}
				{character && (
					<DeleteCharacterDialog
						characterId={character.id}
						characterName={character.name}
						isOpen={showDeleteDialog}
						onClose={() => setShowDeleteDialog(false)}
						onDeleted={handleDeleteConfirm}
					/>
				)}
			</div>
		</TooltipProvider>
	);
}

function AbilityScoresGrid({ character }: { character: Character }) {
	return (
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Ability Scores
			</h2>
			<div className="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
				{ABILITY_KEYS.map((key) => (
					<div
						key={key}
						className="text-center p-2 border border-border rounded-lg bg-muted transition-colors"
					>
						<div className="text-xs text-muted-foreground uppercase">{key}</div>
						<div className="text-lg font-bold text-foreground">{character.abilityScores[key]}</div>
						<div className="text-sm text-muted-foreground">
							{formatMod(character.abilityScores[key])}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function HitPointsSection({
	character,
	hpPercent,
	readOnly,
	onDamage,
	onHeal,
	onUpdate,
}: {
	character: Character;
	hpPercent: number;
	readOnly: boolean;
	onDamage: () => void;
	onHeal: () => void;
	onUpdate: (character: Character) => void;
}) {
	const [tempHp, setTempHpValue] = useState(String(character.hp.temp));
	const [maxHp, setMaxHpValue] = useState(String(character.hp.max));
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setTempHpValue(String(character.hp.temp));
		setMaxHpValue(String(character.hp.max));
	}, [character.hp.temp, character.hp.max]);

	const persistNumber = async (
		url: string,
		key: "amount",
		value: string,
		successMessage: string,
	) => {
		const amount = Number.parseInt(value, 10);
		if (Number.isNaN(amount) || amount < 0) {
			toast.error("Enter a valid non-negative number");
			return;
		}
		setIsSaving(true);
		try {
			const data = await updateCharacterJson<Character>(url, { [key]: amount });
			if (data) {
				onUpdate(data);
				toast.success(successMessage);
			} else {
				toast.error("Failed to update HP");
			}
		} catch {
			toast.error("Network error");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Hit Points
			</h2>
			<div className="mb-2 flex items-center gap-2 flex-wrap">
				<span className="text-lg font-bold text-foreground">
					{character.hp.current} / {character.hp.max}
				</span>
				{character.hp.temp > 0 && <Badge variant="success">+{character.hp.temp} temp</Badge>}
				{character.concentration && <Badge variant="secondary">Concentration</Badge>}
			</div>
			<div className="w-full h-4 bg-muted border border-border rounded-full overflow-hidden mb-3">
				<div
					className={cn(
						"h-full rounded-full transition-all duration-300",
						hpPercent > 50 ? "bg-success" : hpPercent > 25 ? "bg-warning" : "bg-destructive",
					)}
					style={{ width: `${hpPercent}%` }}
				/>
			</div>
			{!readOnly && (
				<>
					<div className="grid grid-cols-2 gap-3 mb-3 max-sm:grid-cols-1">
						<div>
							<label htmlFor="temp-hp" className="text-sm text-muted-foreground block mb-1">
								Temp HP
							</label>
							<Input
								id="temp-hp"
								type="number"
								min={0}
								value={tempHp}
								disabled={isSaving}
								onChange={(e) => setTempHpValue(e.target.value)}
								onBlur={() =>
									persistNumber(
										`/api/characters/${character.id}/hp/temp`,
										"amount",
										tempHp,
										"Temporary HP updated",
									)
								}
							/>
						</div>
						<div>
							<label htmlFor="max-hp" className="text-sm text-muted-foreground block mb-1">
								Max HP
							</label>
							<Input
								id="max-hp"
								type="number"
								min={1}
								value={maxHp}
								disabled={isSaving}
								onChange={(e) => setMaxHpValue(e.target.value)}
								onBlur={() =>
									persistNumber(
										`/api/characters/${character.id}/hp/max`,
										"amount",
										maxHp,
										"Max HP updated",
									)
								}
							/>
						</div>
					</div>
					<div className="flex items-center gap-2 mb-3">
						<Checkbox
							id="concentration"
							checked={character.concentration}
							onCheckedChange={(checked) => {
								updateCharacterJson<Character>(`/api/characters/${character.id}/concentration`, {
									concentration: checked === true,
								})
									.then((data) => {
										if (data) {
											onUpdate(data);
											toast.success(
												checked === true ? "Concentration enabled" : "Concentration cleared",
											);
										}
									})
									.catch(() => toast.error("Network error"));
							}}
						/>
						<label htmlFor="concentration" className="text-sm text-foreground">
							Concentration
						</label>
					</div>
					<div className="flex gap-3 max-sm:flex-col">
						<Button variant="destructive-ghost" className="flex-1" onClick={onDamage}>
							Damage
						</Button>
						<Button variant="success-ghost" className="flex-1" onClick={onHeal}>
							Heal
						</Button>
					</div>
				</>
			)}
		</div>
	);
}

function ConditionsSection({
	character,
	readOnly,
	onUpdate,
}: {
	character: Character;
	readOnly: boolean;
	onUpdate: (character: Character) => void;
}) {
	const activeNames = new Set(character.conditions.map((condition) => condition.name));

	const toggle = async (conditionName: CharacterConditionName) => {
		const shouldEnable = !activeNames.has(conditionName);
		let durationRounds: number | null = null;
		if (shouldEnable) {
			const input = prompt(`Duration in rounds for ${conditionName}? Leave blank for indefinite.`);
			if (input && input.trim().length > 0) {
				const parsed = Number.parseInt(input, 10);
				if (!Number.isNaN(parsed) && parsed > 0) durationRounds = parsed;
			}
		}
		try {
			const data = await postCharacterJson<Character>(
				`/api/characters/${character.id}/conditions/toggle`,
				{
					conditionName,
					durationRounds,
				},
			);
			if (data) {
				onUpdate(data);
				toast.success(shouldEnable ? `${conditionName} applied` : `${conditionName} removed`);
			} else {
				toast.error("Failed to update condition");
			}
		} catch {
			toast.error("Network error");
		}
	};

	return (
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Conditions
			</h2>
			{character.conditions.length > 0 ? (
				<div className="flex flex-wrap gap-2 mb-3" aria-label="Active conditions list">
					{character.conditions.map((condition) => (
						<ConditionBadge key={condition.name} condition={condition} active />
					))}
				</div>
			) : (
				<div className="text-sm text-muted-foreground mb-3">No active conditions.</div>
			)}
			<div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
				{SRD_CONDITIONS.map((conditionName) => {
					const active = activeNames.has(conditionName);
					const duration = character.conditions.find(
						(condition) => condition.name === conditionName,
					)?.durationRounds;
					return (
						<button
							key={conditionName}
							type="button"
							className={cn(
								"flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
								active
									? "border-destructive/40 bg-destructive/10"
									: "border-border bg-card hover:border-primary/40",
							)}
							onClick={() => !readOnly && toggle(conditionName)}
							disabled={readOnly}
						>
							<div className="flex items-center gap-2">
								{active && <AlertTriangle className="h-4 w-4 text-destructive" />}
								<span className="text-sm font-medium text-foreground">{conditionName}</span>
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex items-center gap-1">
										{duration ? <Badge variant="outline">{duration}r</Badge> : null}
										<Badge variant={active ? "destructive" : "secondary"}>
											{active ? "Active" : "Info"}
										</Badge>
									</div>
								</TooltipTrigger>
								<TooltipContent className="max-w-sm">
									<p className="font-semibold mb-1">{conditionName}</p>
									<p>{CONDITION_DETAILS[conditionName].summary}</p>
									{CONDITION_DETAILS[conditionName].effects.length > 0 && (
										<ul className="list-disc pl-4 mt-2 space-y-1">
											{CONDITION_DETAILS[conditionName].effects.map((effect) => (
												<li key={effect}>{effect}</li>
											))}
										</ul>
									)}
								</TooltipContent>
							</Tooltip>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function ConditionBadge({
	condition,
	active,
}: {
	condition: Character["conditions"][number];
	active: boolean;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div>
					<Badge variant={active ? "destructive" : "secondary"} className="cursor-default">
						{condition.name}
						{condition.durationRounds ? ` (${condition.durationRounds}r)` : ""}
					</Badge>
				</div>
			</TooltipTrigger>
			<TooltipContent className="max-w-sm">
				<p className="font-semibold mb-1">{condition.name}</p>
				<p>{CONDITION_DETAILS[condition.name].summary}</p>
				{CONDITION_DETAILS[condition.name].effects.length > 0 && (
					<ul className="list-disc pl-4 mt-2 space-y-1">
						{CONDITION_DETAILS[condition.name].effects.map((effect) => (
							<li key={effect}>{effect}</li>
						))}
					</ul>
				)}
			</TooltipContent>
		</Tooltip>
	);
}
