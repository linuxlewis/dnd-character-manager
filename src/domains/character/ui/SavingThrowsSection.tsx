import { Checkbox } from "../../../app/components/ui/checkbox.tsx";
import { cn } from "../../../app/lib/utils.ts";
import type { Character } from "../types/index.js";
import { calculateSavingThrow } from "../types/skills.js";
import { QuickRollButton } from "./QuickRollButton.tsx";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

const ABILITY_LABELS: Record<string, string> = {
	STR: "Strength",
	DEX: "Dexterity",
	CON: "Constitution",
	INT: "Intelligence",
	WIS: "Wisdom",
	CHA: "Charisma",
};

export function SavingThrowsSection({
	character,
	characterId,
	onUpdate,
}: {
	character: Character;
	characterId: string;
	onUpdate: (c: Character) => void;
}) {
	const handleToggleSavingThrow = (abilityKey: string) => {
		fetch(`/api/characters/${characterId}/saving-throws/${abilityKey}/toggle`, {
			method: "POST",
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) onUpdate(data);
			})
			.catch(() => {});
	};

	return (
		<section className="mb-6" aria-label="Saving Throws">
			<h2 className="text-base font-heading font-bold text-foreground mb-3 pb-1 border-b-2 border-primary/20">
				Saving Throws
			</h2>
			<div className="rounded-lg border border-border overflow-hidden">
				{ABILITY_KEYS.map((key, i) => {
					const proficient = character.savingThrowProficiencies?.includes(key) ?? false;
					const bonus = calculateSavingThrow(
						character.abilityScores[key],
						proficient,
						character.level,
					);
					const formatted = bonus >= 0 ? `+${bonus}` : `${bonus}`;
					return (
						<div
							key={key}
							className={cn(
								"flex items-center gap-3 px-3 py-2 min-h-[44px] cursor-pointer transition-colors",
								i % 2 === 0 ? "bg-card" : "bg-muted/30",
								"hover:bg-primary/5 active:bg-primary/10",
							)}
							data-testid={`saving-throw-${key}`}
						>
							<Checkbox
								id={`saving-throw-checkbox-${key}`}
								checked={proficient}
								onCheckedChange={() => handleToggleSavingThrow(key)}
							/>
							<label
								htmlFor={`saving-throw-checkbox-${key}`}
								className="flex-1 text-sm text-foreground cursor-pointer select-none"
							>
								{ABILITY_LABELS[key]}
							</label>
							<span
								className={cn(
									"font-bold text-sm w-10 text-right font-mono",
									proficient ? "text-primary" : "text-foreground",
								)}
							>
								{formatted}
							</span>
							<QuickRollButton modifier={bonus} label={`${ABILITY_LABELS[key]} Save`} compact />
						</div>
					);
				})}
			</div>
		</section>
	);
}
