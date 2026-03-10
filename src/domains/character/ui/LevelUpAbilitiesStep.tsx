import { Label } from "../../../app/components/ui/label.tsx";
import { Select } from "../../../app/components/ui/select.tsx";
import type { Character, LevelUpChoices } from "../types/index.js";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

interface LevelUpAbilitiesStepProps {
	character: Character;
	choices: LevelUpChoices;
	onAbilityScoreChange: (ability: string, value: string) => void;
}

function getAbilityPoints(choices: LevelUpChoices, ability: string): number {
	return choices.abilityScoreImprovements?.[ability] ?? 0;
}

function getTotalAbilityPoints(choices: LevelUpChoices): number {
	if (!choices.abilityScoreImprovements) return 0;
	return Object.values(choices.abilityScoreImprovements).reduce((sum, val) => sum + val, 0);
}

function getAvailablePoints(
	character: Character,
	choices: LevelUpChoices,
	ability: string,
): number {
	const currentScore = character.abilityScores[ability as keyof typeof character.abilityScores];
	const currentPoints = getAbilityPoints(choices, ability);
	const usedPoints = getTotalAbilityPoints(choices) - currentPoints;
	const remainingPoints = 2 - usedPoints;
	const maxPointsForAbility = Math.min(remainingPoints + currentPoints, 2, 20 - currentScore);
	return maxPointsForAbility;
}

export function LevelUpAbilitiesStep({
	character,
	choices,
	onAbilityScoreChange,
}: LevelUpAbilitiesStepProps) {
	return (
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
					const points = getAbilityPoints(choices, ability);
					const newScore = currentScore + points;
					const maxPoints = getAvailablePoints(character, choices, ability);

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
								onChange={(e) => onAbilityScoreChange(ability, e.target.value)}
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
				Points used: {getTotalAbilityPoints(choices)}/2
			</div>
		</div>
	);
}
