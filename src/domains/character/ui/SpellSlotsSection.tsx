import { Button } from "../../../app/components/ui/button.tsx";
import { cn } from "../../../app/lib/utils.ts";
import type { Character } from "../types/index.js";

interface SpellSlotsSectionProps {
	character: Character;
	characterId: string;
	onUpdate: (c: Character) => void;
}

export function SpellSlotsSection({ character, characterId, onUpdate }: SpellSlotsSectionProps) {
	const handleUseSpellSlot = (level: number) => {
		fetch(`/api/characters/${characterId}/spells/${level}/use`, { method: "POST" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) onUpdate(data);
			})
			.catch(() => {});
	};

	const handleRestoreSpellSlot = (level: number) => {
		fetch(`/api/characters/${characterId}/spells/${level}/restore`, { method: "POST" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) onUpdate(data);
			})
			.catch(() => {});
	};

	const handleLongRest = () => {
		fetch(`/api/characters/${characterId}/long-rest`, { method: "POST" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) onUpdate(data);
			})
			.catch(() => {});
	};

	if (!character.spellSlots || character.spellSlots.length === 0) return null;

	return (
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Spell Slots
			</h2>
			{character.spellSlots.map((slot) => (
				<div key={slot.level} className="flex items-center gap-3 py-2 min-h-[44px]">
					<span className="text-sm font-semibold w-16 shrink-0 text-foreground">
						Level {slot.level}
					</span>
					<div className="flex gap-2 flex-1 flex-wrap">
						{Array.from({ length: slot.available }, (_, i) => {
							const isUsed = i < slot.used;
							return (
								<button
									key={`slot-${slot.level}-${i}`}
									type="button"
									className={cn(
										"w-7 h-7 rounded-full border-2 border-primary p-0 cursor-pointer transition-colors",
										isUsed ? "bg-transparent" : "bg-primary",
									)}
									onClick={() =>
										isUsed ? handleRestoreSpellSlot(slot.level) : handleUseSpellSlot(slot.level)
									}
									aria-label={`Level ${slot.level} slot ${i + 1} - ${isUsed ? "used" : "available"}`}
								/>
							);
						})}
					</div>
					<span className="text-sm text-muted-foreground w-10 text-right shrink-0">
						{slot.available - slot.used}/{slot.available}
					</span>
				</div>
			))}
			<Button variant="primary-ghost" className="w-full mt-3" onClick={handleLongRest}>
				Long Rest
			</Button>
		</div>
	);
}
