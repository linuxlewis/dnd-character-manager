import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../app/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../../../app/components/ui/dialog.tsx";
import { Separator } from "../../../app/components/ui/separator.tsx";
import {
	type Character,
	type LevelUpChoices,
	type LevelUpResult,
	calculateHpGain,
	calculateSpellSlots,
	getAbilityModifier,
	getProficiencyBonus,
	getsAbilityScoreImprovement,
} from "../types/index.js";
import { LevelUpAbilitiesStep } from "./LevelUpAbilitiesStep.tsx";
import { LevelUpConfirmStep } from "./LevelUpConfirmStep.tsx";
import { LevelUpSpellsStep } from "./LevelUpSpellsStep.tsx";
import { LevelUpSummaryStep } from "./LevelUpSummaryStep.tsx";

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

	const stepProps = {
		character,
		newLevel,
		hpGain,
		profBonusIncreases,
		oldProfBonus,
		newProfBonus,
		getsASI,
		hasNewSpells,
	};

	const getCurrentStepContent = () => {
		const stepType = steps[currentStep];
		switch (stepType) {
			case "summary":
				return <LevelUpSummaryStep characterName={character.name} {...stepProps} />;
			case "abilities":
				return (
					<LevelUpAbilitiesStep
						character={character}
						choices={choices}
						onAbilityScoreChange={handleAbilityScoreChange}
					/>
				);
			case "spells":
				return <LevelUpSpellsStep character={character} newSpellSlots={newSpellSlots} />;
			case "confirm":
				return <LevelUpConfirmStep choices={choices} {...stepProps} />;
			default:
				return <LevelUpSummaryStep characterName={character.name} {...stepProps} />;
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
