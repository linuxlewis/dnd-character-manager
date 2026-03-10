import { getAbilityModifier } from "../types/character.js";
import type { Character } from "../types/index.js";
import { QuickRollButton } from "./QuickRollButton.tsx";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

function formatMod(score: number): string {
	const mod = getAbilityModifier(score);
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function AbilityScoresGrid({ character }: { character: Character }) {
	return (
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Ability Scores
			</h2>
			<div className="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
				{ABILITY_KEYS.map((key) => {
					const mod = getAbilityModifier(character.abilityScores[key]);
					return (
						<div
							key={key}
							className="text-center p-2 border border-border rounded-lg bg-muted transition-colors relative group"
						>
							<div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<QuickRollButton modifier={mod} label={`${key} Check`} compact />
							</div>
							<div className="text-xs text-muted-foreground uppercase">{key}</div>
							<div className="text-lg font-bold text-foreground">
								{character.abilityScores[key]}
							</div>
							<div className="text-sm text-muted-foreground">
								{formatMod(character.abilityScores[key])}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
