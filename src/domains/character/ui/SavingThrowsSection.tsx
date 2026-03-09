import { Checkbox } from "../../../app/components/ui/checkbox.tsx";
import type { Character } from "../types/index.js";
import { calculateSavingThrow } from "../types/skills.js";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

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
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Saving Throws
			</h2>
			<div className="flex flex-col gap-1">
				{ABILITY_KEYS.map((key) => {
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
							className="flex items-center gap-3 p-2 rounded-md min-h-[44px] cursor-pointer odd:bg-muted even:bg-background active:bg-primary/10 transition-colors"
							data-testid={`saving-throw-${key}`}
						>
							<Checkbox
								id={`saving-throw-checkbox-${key}`}
								checked={proficient}
								onCheckedChange={() => handleToggleSavingThrow(key)}
							/>
							<label
								htmlFor={`saving-throw-checkbox-${key}`}
								className="flex-1 text-[0.95rem] text-foreground cursor-pointer"
							>
								{key}
							</label>
							<span className="font-bold text-[0.95rem] w-10 text-right text-foreground">
								{formatted}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
