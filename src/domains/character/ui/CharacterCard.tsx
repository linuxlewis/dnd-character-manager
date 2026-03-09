import { Heart, Shield, Sparkles } from "lucide-react";
import { Badge } from "../../../app/components/ui/badge.tsx";
import { Progress } from "../../../app/components/ui/progress.tsx";
import { cn } from "../../../app/lib/utils.ts";
import { calculateAC, getAbilityModifier } from "../types/character.js";
import type { Character } from "../types/index.js";

interface CharacterCardProps {
	character: Character;
	onClick: () => void;
	index?: number;
}

function getHpVariant(percent: number): "success" | "warning" | "destructive" {
	if (percent > 50) return "success";
	if (percent > 25) return "warning";
	return "destructive";
}

export function CharacterCard({ character, onClick, index = 0 }: CharacterCardProps) {
	const hpPercent = character.hp.max > 0 ? (character.hp.current / character.hp.max) * 100 : 0;
	const ac = calculateAC(character.abilityScores.DEX, character.armorClass);
	const hasSpells = character.spellSlots && character.spellSlots.length > 0;

	const topAbility = (["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).reduce((best, key) =>
		character.abilityScores[key] > character.abilityScores[best] ? key : best,
	);
	const topMod = getAbilityModifier(character.abilityScores[topAbility]);

	return (
		<button
			type="button"
			className={cn(
				"group relative w-full text-left rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 cursor-pointer overflow-hidden",
				"hover:border-primary hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				"animate-fade-in",
			)}
			style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
			onClick={onClick}
			aria-label={`View ${character.name}, level ${character.level} ${character.race} ${character.class}`}
		>
			<div className="absolute inset-x-0 top-0 h-1 bg-primary/60 group-hover:bg-primary transition-colors" />

			<div className="p-5">
				<div className="flex items-start justify-between mb-2">
					<div>
						<h3 className="text-lg font-heading font-bold text-foreground leading-tight">
							{character.name}
						</h3>
						<p className="text-sm text-muted-foreground">
							{character.race} {character.class}
						</p>
					</div>
					<Badge variant="outline" className="shrink-0 font-heading">
						Lvl {character.level}
					</Badge>
				</div>

				<div className="flex items-center gap-3 mb-3">
					<div className="flex items-center gap-1.5 text-sm">
						<Heart className="h-3.5 w-3.5 text-destructive" />
						<span className="font-semibold text-foreground">
							{character.hp.current}/{character.hp.max}
						</span>
					</div>
					<div className="flex items-center gap-1.5 text-sm">
						<Shield className="h-3.5 w-3.5 text-steel" />
						<span className="font-semibold text-foreground">{ac}</span>
					</div>
					{hasSpells && (
						<div className="flex items-center gap-1 text-sm">
							<Sparkles className="h-3.5 w-3.5 text-arcane" />
						</div>
					)}
				</div>

				<Progress
					value={character.hp.current}
					max={character.hp.max}
					variant={getHpVariant(hpPercent)}
				/>

				<div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
					<span className="text-xs text-muted-foreground">
						Best: {topAbility} {topMod >= 0 ? `+${topMod}` : topMod}
					</span>
					<span className="text-xs text-muted-foreground">
						{character.equipment?.length ?? 0} items
					</span>
				</div>
			</div>
		</button>
	);
}
