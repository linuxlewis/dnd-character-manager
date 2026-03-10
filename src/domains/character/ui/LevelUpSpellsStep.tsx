import { Badge } from "../../../app/components/ui/badge.tsx";
import type { Character } from "../types/index.js";

interface SpellSlot {
	level: number;
	available: number;
}

interface LevelUpSpellsStepProps {
	character: Character;
	newSpellSlots: SpellSlot[];
}

export function LevelUpSpellsStep({ character, newSpellSlots }: LevelUpSpellsStepProps) {
	return (
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
}
