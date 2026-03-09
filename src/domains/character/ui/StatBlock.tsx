import { Tooltip } from "../../../app/components/ui/tooltip.tsx";
import { cn } from "../../../app/lib/utils.ts";
import { getAbilityModifier } from "../types/character.js";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

const ABILITY_LABELS: Record<string, string> = {
	STR: "Strength",
	DEX: "Dexterity",
	CON: "Constitution",
	INT: "Intelligence",
	WIS: "Wisdom",
	CHA: "Charisma",
};

function formatMod(score: number): string {
	const mod = getAbilityModifier(score);
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

interface StatBlockProps {
	abilityScores: Record<string, number>;
	className?: string;
}

export function StatBlock({ abilityScores, className }: StatBlockProps) {
	return (
		<fieldset
			className={cn("grid grid-cols-6 gap-2 max-sm:grid-cols-3 border-0 p-0 m-0", className)}
			aria-label="Ability Scores"
		>
			{ABILITY_KEYS.map((key, i) => (
				<Tooltip key={key} content={ABILITY_LABELS[key]}>
					<div
						className={cn(
							"relative flex flex-col items-center p-3 rounded-lg border-2 border-border bg-card transition-all hover:border-primary/50 hover:shadow-md",
							"animate-fade-in",
						)}
						style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
					>
						<span className="text-[0.65rem] font-heading font-bold uppercase tracking-wider text-muted-foreground">
							{key}
						</span>
						<span className="text-2xl font-bold text-foreground leading-tight">
							{formatMod(abilityScores[key])}
						</span>
						<span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 mt-1">
							{abilityScores[key]}
						</span>
					</div>
				</Tooltip>
			))}
		</fieldset>
	);
}
