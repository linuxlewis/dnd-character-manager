import { Heart } from "lucide-react";
import { Badge } from "../../../app/components/ui/badge.tsx";
import { Button } from "../../../app/components/ui/button.tsx";
import { cn } from "../../../app/lib/utils.ts";
import type { Character } from "../types/index.js";

interface HitPointsSectionProps {
	character: Character;
	hpPercent: number;
	readOnly: boolean;
	onDamage: () => void;
	onHeal: () => void;
}

export function HitPointsSection({
	character,
	hpPercent,
	readOnly,
	onDamage,
	onHeal,
}: HitPointsSectionProps) {
	return (
		<section className="mb-6" aria-label="Hit Points">
			<h2 className="text-base font-heading font-bold text-foreground mb-3 pb-1 border-b-2 border-blood/30 flex items-center gap-2">
				<Heart className="h-4 w-4 text-blood" aria-hidden="true" />
				Hit Points
			</h2>
			<div className="mb-2 flex items-baseline gap-2">
				<span className="text-2xl font-heading font-bold text-foreground">
					{character.hp.current}
				</span>
				<span className="text-muted-foreground">/</span>
				<span className="text-lg text-muted-foreground">{character.hp.max}</span>
				{character.hp.temp > 0 && (
					<Badge variant="outline" className="text-arcane border-arcane/30">
						+{character.hp.temp} temp
					</Badge>
				)}
			</div>
			<div
				className="w-full h-3 bg-muted border border-border rounded-full overflow-hidden mb-3"
				role="progressbar"
				tabIndex={-1}
				aria-valuenow={character.hp.current}
				aria-valuemin={0}
				aria-valuemax={character.hp.max}
				aria-label={`${character.hp.current} of ${character.hp.max} hit points`}
			>
				<div
					className={cn(
						"h-full rounded-full transition-all duration-500",
						hpPercent > 50 ? "bg-success" : hpPercent > 25 ? "bg-warning" : "bg-destructive",
					)}
					style={{ width: `${hpPercent}%` }}
				/>
			</div>
			{!readOnly && (
				<div className="flex gap-3 max-sm:flex-col">
					<Button variant="destructive-ghost" className="flex-1" onClick={onDamage}>
						Damage
					</Button>
					<Button variant="success-ghost" className="flex-1" onClick={onHeal}>
						Heal
					</Button>
				</div>
			)}
		</section>
	);
}
