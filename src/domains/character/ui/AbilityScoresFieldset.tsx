import { Input } from "../../../app/components/ui/input.tsx";
import { Label } from "../../../app/components/ui/label.tsx";
import type { AbilityScores } from "../types/index.js";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

const ABILITY_LABELS: Record<string, string> = {
	STR: "Strength",
	DEX: "Dexterity",
	CON: "Constitution",
	INT: "Intelligence",
	WIS: "Wisdom",
	CHA: "Charisma",
};

interface AbilityScoresFieldsetProps {
	abilityScores: AbilityScores;
	onChange: (ability: keyof AbilityScores, value: number) => void;
}

export function AbilityScoresFieldset({ abilityScores, onChange }: AbilityScoresFieldsetProps) {
	return (
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
							value={abilityScores[key]}
							onChange={(e) => onChange(key, e.target.valueAsNumber || 10)}
						/>
					</div>
				))}
			</div>
		</fieldset>
	);
}
