import { ArrowLeft, ShieldAlert, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../../app/components/ui/badge.tsx";
import { Button } from "../../../app/components/ui/button.tsx";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../../../app/components/ui/tooltip.tsx";
import { cn } from "../../../app/lib/utils.ts";
import { useNavigate } from "../../../app/router.tsx";
import { getAbilityModifier } from "../types/character.js";
import type { Character, LevelUpResult } from "../types/index.js";
import { ArmorClassSection } from "./ArmorClassSection.tsx";
import { ConditionsSection } from "./ConditionsSection.tsx";
import { DeleteCharacterDialog } from "./DeleteCharacterDialog.tsx";
import { EquipmentSection } from "./EquipmentSection.tsx";
import { HitPointsSection } from "./HitPointsSection.tsx";
import { LevelUpWizard } from "./LevelUpWizard.tsx";
import { NotesSection } from "./NotesSection.tsx";
import { SavingThrowsSection } from "./SavingThrowsSection.tsx";
import { ShareSection } from "./ShareSection.tsx";
import { SkillsSection } from "./SkillsSection.tsx";
import { SpellSlotsSection } from "./SpellSlotsSection.tsx";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

function formatMod(score: number): string {
	const mod = getAbilityModifier(score);
	return mod >= 0 ? `+${mod}` : `${mod}`;
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
	const [showLevelUpWizard, setShowLevelUpWizard] = useState(false);
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

	const handleLevelUpClick = () => {
		if (character && character.level < 20) {
			setShowLevelUpWizard(true);
		} else {
			toast.error("Character is already at maximum level");
		}
	};

	const handleLevelUpComplete = (result: { character: Character; result: LevelUpResult }) => {
		setCharacter(result.character);
		setShowLevelUpWizard(false);
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
					<div className="flex-1">
						<h1 className="text-2xl text-foreground">{character.name}</h1>
						<div className="flex items-center gap-3 mb-4">
							<p className="text-muted-foreground">
								{character.race} {character.class} · Level {character.level}
							</p>
							{!readOnly && character.level < 20 && (
								<Button 
									size="sm" 
									variant="outline" 
									className="h-7 px-2 text-xs gap-1"
									onClick={handleLevelUpClick}
								>
									<TrendingUp className="h-3 w-3" />
									Level Up
								</Button>
							)}
						</div>
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
						strScore={character.abilityScores.STR}
						readOnly={readOnly}
						onUpdate={setCharacter}
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
					<>
						<LevelUpWizard
							character={character}
							isOpen={showLevelUpWizard}
							onClose={() => setShowLevelUpWizard(false)}
							onLevelUp={handleLevelUpComplete}
						/>
						<DeleteCharacterDialog
							characterId={character.id}
							characterName={character.name}
							isOpen={showDeleteDialog}
							onClose={() => setShowDeleteDialog(false)}
							onDeleted={handleDeleteConfirm}
						/>
					</>
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
