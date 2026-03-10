import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../../app/components/ui/badge.tsx";
import { Button } from "../../../app/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../../../app/components/ui/dialog.tsx";
import { Label } from "../../../app/components/ui/label.tsx";
import { Select } from "../../../app/components/ui/select.tsx";
import { Separator } from "../../../app/components/ui/separator.tsx";
import {
	ABILITY_SCORE_IMPROVEMENT_LEVELS,
	type Character,
	type LevelUpChoices,
	type LevelUpResult,
	calculateHpGain,
	calculateSpellSlots,
	getAbilityModifier,
	getProficiencyBonus,
	getsAbilityScoreImprovement,
} from "../types/index.js";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

interface LevelUpWizardProps {
	character: Character;
	isOpen: boolean;
	onClose: () => void;
	onLevelUp: (result: { character: Character; result: LevelUpResult }) => void;
}

export function LevelUpWizard({ character, isOpen, onClose, onLevelUp }: LevelUpWizardProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [choices, setChoices] = useState<LevelUpChoices>({});
	const [loading, setLoading] = useState(false);

	const newLevel = character.level + 1;
	const getsASI = getsAbilityScoreImprovement(newLevel);
	const conModifier = getAbilityModifier(character.abilityScores.CON);
	const hpGain = calculateHpGain(character.class, conModifier);
	const oldProfBonus = getProficiencyBonus(character.level);
	const newProfBonus = getProficiencyBonus(newLevel);
	const profBonusIncreases = oldProfBonus !== newProfBonus;
	const newSpellSlots = calculateSpellSlots(character.class, newLevel);
	const hasNewSpells =
		newSpellSlots.length > character.spellSlots.length ||
		newSpellSlots.some((slot) => {
			const existingSlot = character.spellSlots.find((s) => s.level === slot.level);
			return !existingSlot || slot.available > existingSlot.available;
		});

	// Determine step order
	const steps = ["summary"];
	if (getsASI) steps.push("abilities");
	if (hasNewSpells) steps.push("spells");
	steps.push("confirm");

	const canProceed =
		!getsASI ||
		currentStep !== 1 ||
		(choices.abilityScoreImprovements &&
			Object.values(choices.abilityScoreImprovements).reduce((sum, val) => sum + val, 0) === 2);

	const handleAbilityScoreChange = (ability: string, value: string) => {
		const points = Number.parseInt(value) || 0;
		setChoices((prev) => ({
			...prev,
			abilityScoreImprovements: {
				...prev.abilityScoreImprovements,
				[ability]: points,
			},
		}));
	};

	const getAbilityPoints = (ability: string): number => {
		return choices.abilityScoreImprovements?.[ability] ?? 0;
	};

	const getTotalAbilityPoints = (): number => {
		if (!choices.abilityScoreImprovements) return 0;
		return Object.values(choices.abilityScoreImprovements).reduce((sum, val) => sum + val, 0);
	};

	const getAvailablePoints = (ability: string): number => {
		const currentScore = character.abilityScores[ability as keyof typeof character.abilityScores];
		const currentPoints = getAbilityPoints(ability);
		const usedPoints = getTotalAbilityPoints() - currentPoints;
		const remainingPoints = 2 - usedPoints;
		const maxPointsForAbility = Math.min(remainingPoints + currentPoints, 2, 20 - currentScore);
		return maxPointsForAbility;
	};

	const handleLevelUp = async () => {
		setLoading(true);
		try {
			const response = await fetch(`/api/characters/${character.id}/level-up`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(choices),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to level up character");
			}

			const result = await response.json();
			onLevelUp(result);
			toast.success(`${character.name} leveled up to level ${newLevel}!`);
			onClose();
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		setCurrentStep(0);
		setChoices({});
		onClose();
	};

	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			handleLevelUp();
		}
	};

	const renderSummaryStep = () => (
		<div className="space-y-4">
			<div className="text-center">
				<h3 className="text-xl font-semibold">Level Up!</h3>
				<p className="text-muted-foreground">
					{character.name} is ready to advance to level {newLevel}
				</p>
			</div>

			<div className="space-y-3">
				<div className="flex items-center justify-between p-3 border rounded-lg">
					<span>Hit Points</span>
					<Badge variant="secondary">+{hpGain} HP</Badge>
				</div>

				{profBonusIncreases && (
					<div className="flex items-center justify-between p-3 border rounded-lg">
						<span>Proficiency Bonus</span>
						<Badge variant="secondary">
							+{newProfBonus - oldProfBonus} (now +{newProfBonus})
						</Badge>
					</div>
				)}

				{getsASI && (
					<div className="flex items-center justify-between p-3 border rounded-lg">
						<span>Ability Score Improvement</span>
						<Badge variant="outline">2 points to distribute</Badge>
					</div>
				)}

				{hasNewSpells && (
					<div className="flex items-center justify-between p-3 border rounded-lg">
						<span>Spell Slots</span>
						<Badge variant="outline">New spell slots available</Badge>
					</div>
				)}
			</div>
		</div>
	);

	const renderAbilitiesStep = () => (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-semibold">Ability Score Improvement</h3>
				<p className="text-sm text-muted-foreground">
					Distribute 2 points among your ability scores. No ability can exceed 20.
				</p>
			</div>

			<div className="grid grid-cols-2 gap-4">
				{ABILITY_KEYS.map((ability) => {
					const currentScore = character.abilityScores[ability];
					const points = getAbilityPoints(ability);
					const newScore = currentScore + points;
					const maxPoints = getAvailablePoints(ability);

					return (
						<div key={ability} className="space-y-2">
							<Label className="flex items-center justify-between">
								<span>{ability}</span>
								<span className="text-sm text-muted-foreground">
									{currentScore} {points > 0 && `→ ${newScore}`}
								</span>
							</Label>
							<Select
								value={points.toString()}
								onChange={(e) => handleAbilityScoreChange(ability, e.target.value)}
								disabled={currentScore >= 20}
							>
								{Array.from({ length: maxPoints + 1 }, (_, i) => ({
									value: i,
									label: i === 0 ? "No change" : `+${i}`,
								})).map((option) => (
									<option key={`${ability}-${option.value}`} value={option.value.toString()}>
										{option.label}
									</option>
								))}
							</Select>
						</div>
					);
				})}
			</div>

			<div className="text-center text-sm text-muted-foreground">
				Points used: {getTotalAbilityPoints()}/2
			</div>
		</div>
	);

	const renderSpellsStep = () => (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-semibold">Spell Slots</h3>
				<p className="text-sm text-muted-foreground">Your spell casting abilities have improved!</p>
			</div>

			<div className="space-y-2">
				{newSpellSlots.map((slot) => {
					const existingSlot = character.spellSlots.find((s) => s.level === slot.level);
					const isNew = !existingSlot;
					const hasMore = existingSlot && slot.available > existingSlot.available;

					return (
						<div
							key={slot.level}
							className="flex items-center justify-between p-3 border rounded-lg"
						>
							<span>Level {slot.level} Spell Slots</span>
							<div className="flex items-center gap-2">
								{existingSlot && (
									<span className="text-sm text-muted-foreground">{existingSlot.available} →</span>
								)}
								<Badge variant={isNew || hasMore ? "default" : "secondary"}>
									{slot.available}
									{(isNew || hasMore) && " ✨"}
								</Badge>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);

	const renderConfirmStep = () => (
		<div className="space-y-4">
			<div className="text-center">
				<h3 className="text-lg font-semibold">Confirm Level Up</h3>
				<p className="text-sm text-muted-foreground">
					Review your choices and confirm to level up {character.name}
				</p>
			</div>

			<div className="space-y-3">
				<div className="p-4 border rounded-lg bg-muted/50">
					<h4 className="font-medium mb-2">Changes Summary:</h4>
					<ul className="space-y-1 text-sm">
						<li>
							• Level {character.level} → {newLevel}
						</li>
						<li>• +{hpGain} Hit Points</li>
						{profBonusIncreases && <li>• Proficiency Bonus +{newProfBonus - oldProfBonus}</li>}
						{getsASI &&
							choices.abilityScoreImprovements &&
							Object.entries(choices.abilityScoreImprovements).map(
								([ability, points]) =>
									points > 0 && (
										<li key={ability}>
											• {ability}:{" "}
											{character.abilityScores[ability as keyof typeof character.abilityScores]} →{" "}
											{character.abilityScores[ability as keyof typeof character.abilityScores] +
												points}
										</li>
									),
							)}
						{hasNewSpells && <li>• New spell slots available</li>}
					</ul>
				</div>
			</div>
		</div>
	);

	const getCurrentStepContent = () => {
		const stepType = steps[currentStep];
		switch (stepType) {
			case "summary":
				return renderSummaryStep();
			case "abilities":
				return renderAbilitiesStep();
			case "spells":
				return renderSpellsStep();
			case "confirm":
				return renderConfirmStep();
			default:
				return renderSummaryStep();
		}
	};

	const isLastStep = currentStep === steps.length - 1;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Level Up Wizard</DialogTitle>
					<DialogDescription>
						Level {character.level} → {newLevel} ({currentStep + 1}/{steps.length})
					</DialogDescription>
				</DialogHeader>

				{getCurrentStepContent()}

				<Separator />

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={handleClose} disabled={loading}>
						Cancel
					</Button>
					<Button onClick={handleNext} disabled={loading || !canProceed}>
						{loading ? "Leveling Up..." : isLastStep ? "Level Up!" : "Next"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
