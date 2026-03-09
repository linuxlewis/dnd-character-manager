import { Sparkles } from "lucide-react";
import { toast } from "sonner";
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
				if (data) {
					onUpdate(data);
					toast.success("Long rest complete — all spell slots restored");
				}
			})
			.catch(() => toast.error("Failed to complete long rest"));
	};

	if (!character.spellSlots || character.spellSlots.length === 0) return null;

	return (
		<section className="mb-6" aria-label="Spell Slots">
			<h2 className="text-base font-heading font-bold text-foreground mb-3 pb-1 border-b-2 border-arcane/30 flex items-center gap-2">
				<Sparkles className="h-4 w-4 text-arcane" aria-hidden="true" />
				Spell Slots
			</h2>
			<div className="rounded-lg border border-border overflow-hidden">
				{character.spellSlots.map((slot, i) => (
					<div
						key={slot.level}
						className={cn(
							"flex items-center gap-3 px-3 py-2.5 min-h-[44px]",
							i % 2 === 0 ? "bg-card" : "bg-muted/30",
						)}
					>
						<span className="text-sm font-heading font-bold w-16 shrink-0 text-foreground">
							Level {slot.level}
						</span>
						<fieldset
							className="flex gap-2 flex-1 flex-wrap border-0 p-0 m-0"
							aria-label={`Level ${slot.level} spell slots`}
						>
							{Array.from({ length: slot.available }, (_, j) => {
								const isUsed = j < slot.used;
								return (
									<button
										key={`slot-${slot.level}-${j}`}
										type="button"
										className={cn(
											"w-7 h-7 rounded-full border-2 p-0 cursor-pointer transition-all duration-200",
											isUsed
												? "border-arcane/40 bg-transparent hover:border-arcane"
												: "border-arcane bg-arcane hover:shadow-md",
										)}
										onClick={() =>
											isUsed ? handleRestoreSpellSlot(slot.level) : handleUseSpellSlot(slot.level)
										}
										aria-label={`Level ${slot.level} slot ${j + 1} - ${isUsed ? "used, click to restore" : "available, click to use"}`}
									/>
								);
							})}
						</fieldset>
						<span className="text-sm text-muted-foreground w-10 text-right shrink-0 font-mono">
							{slot.available - slot.used}/{slot.available}
						</span>
					</div>
				))}
			</div>
			<Button variant="primary-ghost" className="w-full mt-3" onClick={handleLongRest}>
				Long Rest (Restore All)
			</Button>
		</section>
	);
}
