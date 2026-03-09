import { ArrowLeft, Edit, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../../app/components/ui/badge.tsx";
import { Button } from "../../../app/components/ui/button.tsx";
import { Skeleton } from "../../../app/components/ui/skeleton.tsx";
import { useNavigate } from "../../../app/router.tsx";
import type { Character } from "../types/index.js";
import { AmountDialog } from "./AmountDialog.tsx";
import { ArmorClassSection } from "./ArmorClassSection.tsx";
import { DeleteCharacterDialog } from "./DeleteCharacterDialog.tsx";
import { EquipmentSection } from "./EquipmentSection.tsx";
import { HitPointsSection } from "./HitPointsSection.tsx";
import { NotesSection } from "./NotesSection.tsx";
import { SavingThrowsSection } from "./SavingThrowsSection.tsx";
import { ShareSection } from "./ShareSection.tsx";
import { SkillsSection } from "./SkillsSection.tsx";
import { SpellSlotsSection } from "./SpellSlotsSection.tsx";
import { StatBlock } from "./StatBlock.tsx";

export function CharacterSheet({ id, slug }: { id?: string; slug?: string }) {
	const navigate = useNavigate();
	const [character, setCharacter] = useState<Character | null>(null);
	const [loading, setLoading] = useState(true);
	const [notes, setNotes] = useState("");
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showDamageDialog, setShowDamageDialog] = useState(false);
	const [showHealDialog, setShowHealDialog] = useState(false);
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

	const handleDamage = (amount: number) => {
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

	const handleHeal = (amount: number) => {
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

	if (loading)
		return (
			<div className="max-w-full sm:max-w-[600px] mx-auto p-4 space-y-6" aria-busy="true">
				<Skeleton className="h-10 w-24" />
				<div>
					<Skeleton className="h-8 w-48 mb-2" />
					<Skeleton className="h-5 w-32" />
				</div>
				<div className="grid grid-cols-6 max-sm:grid-cols-3 gap-2">
					{["s1", "s2", "s3", "s4", "s5", "s6"].map((k) => (
						<Skeleton key={k} className="h-20 rounded-lg" />
					))}
				</div>
				<Skeleton className="h-24 rounded-lg" />
				<Skeleton className="h-32 rounded-lg" />
			</div>
		);
	if (!character)
		return (
			<div className="max-w-full sm:max-w-[600px] mx-auto p-4 text-center py-16">
				<Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
				<h2 className="text-lg font-heading font-bold text-foreground mb-1">Character Not Found</h2>
				<p className="text-muted-foreground mb-4">
					This adventurer may have wandered into another realm.
				</p>
				<Button variant="outline" onClick={() => navigate("/")}>
					<ArrowLeft className="h-4 w-4" />
					Back to Characters
				</Button>
			</div>
		);

	const hpPercent = character.hp.max > 0 ? (character.hp.current / character.hp.max) * 100 : 0;

	return (
		<div className="max-w-full sm:max-w-[600px] mx-auto p-4 transition-colors overflow-x-hidden [&_*]:max-w-full [&_*]:box-border animate-fade-in">
			<div className="flex items-center justify-between mb-4">
				<Button variant="outline" onClick={() => navigate("/")}>
					<ArrowLeft className="h-4 w-4" />
					Back
				</Button>
				{!readOnly && characterId && (
					<Button variant="outline" onClick={() => navigate(`/character/${characterId}/edit`)}>
						<Edit className="h-4 w-4" />
						<span className="max-sm:hidden">Edit</span>
					</Button>
				)}
			</div>

			<div className="mb-6">
				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-heading font-bold text-foreground mb-0.5">
							{character.name}
						</h1>
						<p className="text-muted-foreground">
							{character.race} {character.class}
						</p>
					</div>
					<Badge variant="outline" className="font-heading text-sm shrink-0">
						Level {character.level}
					</Badge>
				</div>
			</div>

			{character.slug && !readOnly && <ShareSection slug={character.slug} />}

			<section className="mb-6" aria-label="Ability Scores">
				<h2 className="text-base font-heading font-bold text-foreground mb-3 pb-1 border-b-2 border-primary/20 flex items-center gap-2">
					<Sparkles className="h-4 w-4 text-arcane" aria-hidden="true" />
					Ability Scores
				</h2>
				<StatBlock abilityScores={character.abilityScores} />
			</section>

			<HitPointsSection
				character={character}
				hpPercent={hpPercent}
				readOnly={readOnly}
				onDamage={() => setShowDamageDialog(true)}
				onHeal={() => setShowHealDialog(true)}
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
				<SpellSlotsSection
					character={character}
					characterId={characterId}
					onUpdate={setCharacter}
				/>
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
				<div className="mb-6 pt-4 border-t border-border">
					<Button
						variant="destructive-ghost"
						className="w-full"
						onClick={() => setShowDeleteDialog(true)}
					>
						Delete Character
					</Button>
				</div>
			)}

			<DeleteCharacterDialog
				characterId={character.id}
				characterName={character.name}
				isOpen={showDeleteDialog}
				onClose={() => setShowDeleteDialog(false)}
				onDeleted={() => navigate("/")}
			/>

			<AmountDialog
				title="Apply Damage"
				label="How much damage?"
				confirmLabel="Apply Damage"
				confirmVariant="destructive"
				isOpen={showDamageDialog}
				onClose={() => setShowDamageDialog(false)}
				onConfirm={handleDamage}
			/>

			<AmountDialog
				title="Heal"
				label="How much healing?"
				confirmLabel="Heal"
				confirmVariant="success"
				isOpen={showHealDialog}
				onClose={() => setShowHealDialog(false)}
				onConfirm={handleHeal}
			/>
		</div>
	);
}
