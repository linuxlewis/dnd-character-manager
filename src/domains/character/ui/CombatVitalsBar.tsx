import { AlertTriangle, Shield } from "lucide-react";
import { Badge } from "../../../app/components/ui/badge.tsx";
import { cn } from "../../../app/lib/utils.ts";
import { calculateAC, getAbilityModifier } from "../types/character.js";
import type { Character } from "../types/index.js";

interface CombatVitalsBarProps {
	character: Character;
}

export function CombatVitalsBar({ character }: CombatVitalsBarProps) {
	const acValue = calculateAC(character.abilityScores.DEX, character.armorClass);
	const hpPercent = character.hp.max > 0 ? (character.hp.current / character.hp.max) * 100 : 0;
	const activeConditions = character.conditions;
	const initiativeMod = getAbilityModifier(character.abilityScores.DEX);
	const formattedInit = initiativeMod >= 0 ? `+${initiativeMod}` : `${initiativeMod}`;

	return (
		<div
			className="grid grid-cols-[auto_1fr_auto] gap-3 items-center p-3 bg-muted/50 border border-border rounded-lg mb-4"
			aria-label="Combat vitals"
		>
			<div className="flex items-center gap-3">
				<div className="flex flex-col items-center justify-center w-14 h-16 border-2 border-steel rounded-b-[50%] bg-card shadow-sm">
					<span
						className="text-xl font-heading font-bold text-foreground leading-none"
						data-testid="vitals-ac-value"
					>
						{acValue}
					</span>
					<span className="text-[0.55rem] text-muted-foreground uppercase font-semibold tracking-wider">
						AC
					</span>
				</div>
				<div className="text-center px-2">
					<span className="text-lg font-mono font-bold text-foreground">{formattedInit}</span>
					<div className="text-[0.55rem] text-muted-foreground uppercase font-semibold tracking-wider">
						Init
					</div>
				</div>
			</div>

			<div className="min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span className="text-sm font-bold text-foreground">
						{character.hp.current}/{character.hp.max}
					</span>
					<span className="text-xs text-muted-foreground">HP</span>
					{character.hp.temp > 0 && (
						<Badge variant="success" className="text-[10px] px-1.5 py-0">
							+{character.hp.temp}
						</Badge>
					)}
					{character.concentration && (
						<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
							Conc
						</Badge>
					)}
				</div>
				<div className="w-full h-2.5 bg-muted border border-border rounded-full overflow-hidden">
					<div
						className={cn(
							"h-full rounded-full transition-all duration-300",
							hpPercent > 50 ? "bg-success" : hpPercent > 25 ? "bg-warning" : "bg-destructive",
						)}
						style={{ width: `${hpPercent}%` }}
					/>
				</div>
			</div>

			{activeConditions.length > 0 && (
				<div className="flex items-center">
					<Badge variant="destructive" className="gap-1 whitespace-nowrap">
						<AlertTriangle className="h-3 w-3" />
						{activeConditions.length}
					</Badge>
				</div>
			)}
		</div>
	);
}
