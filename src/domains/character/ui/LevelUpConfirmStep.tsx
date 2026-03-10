import type { Character, LevelUpChoices } from "../types/index.js";

interface LevelUpConfirmStepProps {
	character: Character;
	newLevel: number;
	hpGain: number;
	profBonusIncreases: boolean;
	newProfBonus: number;
	oldProfBonus: number;
	getsASI: boolean;
	hasNewSpells: boolean;
	choices: LevelUpChoices;
}

export function LevelUpConfirmStep({
	character,
	newLevel,
	hpGain,
	profBonusIncreases,
	newProfBonus,
	oldProfBonus,
	getsASI,
	hasNewSpells,
	choices,
}: LevelUpConfirmStepProps) {
	return (
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
}
