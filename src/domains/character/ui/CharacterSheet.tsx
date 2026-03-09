import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../app/components/ui/button.tsx";
import { cn } from "../../../app/lib/utils.ts";
import { useNavigate } from "../../../app/router.tsx";
import { getAbilityModifier } from "../types/character.js";
import type { Character } from "../types/index.js";
import { ArmorClassSection } from "./ArmorClassSection.tsx";
import { DeleteCharacterDialog } from "./DeleteCharacterDialog.tsx";
import { EquipmentSection } from "./EquipmentSection.tsx";
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
		fetch(`/api/characters/${characterId}/damage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ amount }),
		})
			.then((r) => (r.ok ? r.json() : null))
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
		fetch(`/api/characters/${characterId}/heal`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ amount }),
		})
			.then((r) => (r.ok ? r.json() : null))
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
		<div className="max-w-full sm:max-w-[600px] mx-auto p-4 transition-colors overflow-x-hidden [&_*]:max-w-full [&_*]:box-border">
			<Button variant="outline" className="mb-4" onClick={() => navigate("/")}>
				<ArrowLeft className="h-4 w-4" />
				Back
			</Button>
			<h1 className="text-2xl text-foreground mb-1">{character.name}</h1>
			<p className="text-muted-foreground mb-4">
				{character.race} {character.class} · Level {character.level}
			</p>
			{character.slug && !readOnly && <ShareSection slug={character.slug} />}
			<AbilityScoresGrid character={character} />
			<HitPointsSection
				character={character}
				hpPercent={hpPercent}
				readOnly={readOnly}
				onDamage={handleDamage}
				onHeal={handleHeal}
			/>
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
}: {
	character: Character;
	hpPercent: number;
	readOnly: boolean;
	onDamage: () => void;
	onHeal: () => void;
}) {
	return (
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Hit Points
			</h2>
			<div className="mb-2">
				<span className="text-lg font-bold text-foreground">
					{character.hp.current} / {character.hp.max}
					{character.hp.temp > 0 ? ` (+${character.hp.temp} temp)` : ""}
				</span>
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
				<div className="flex gap-3 max-sm:flex-col">
					<Button variant="destructive-ghost" className="flex-1" onClick={onDamage}>
						Damage
					</Button>
					<Button variant="success-ghost" className="flex-1" onClick={onHeal}>
						Heal
					</Button>
				</div>
			)}
		</div>
	);
}
