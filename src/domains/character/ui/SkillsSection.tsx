import { Checkbox } from "../../../app/components/ui/checkbox.tsx";
import { cn } from "../../../app/lib/utils.ts";
import type { Character } from "../types/index.js";
import { SKILLS, calculateSkillBonus } from "../types/skills.js";

interface SkillsSectionProps {
	character: Character;
	characterId: string;
	readOnly: boolean;
	onUpdate: (c: Character) => void;
}

export function SkillsSection({ character, characterId, readOnly, onUpdate }: SkillsSectionProps) {
	const handleToggleSkill = (skillName: string) => {
		fetch(`/api/characters/${characterId}/skills/${encodeURIComponent(skillName)}/toggle`, {
			method: "POST",
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) onUpdate(data);
			})
			.catch(() => {});
	};

	return (
		<section className="mb-6" aria-label="Skills">
			<h2 className="text-base font-heading font-bold text-foreground mb-3 pb-1 border-b-2 border-primary/20">
				Skills
			</h2>
			<div className="rounded-lg border border-border overflow-hidden">
				{SKILLS.map((skill, i) => {
					const charSkill = character.skills?.find((s) => s.name === skill.name);
					const proficient = charSkill?.proficient ?? false;
					const bonus = calculateSkillBonus(
						character.abilityScores[skill.abilityKey],
						proficient,
						character.level,
					);
					const formatted = bonus >= 0 ? `+${bonus}` : `${bonus}`;
					const skillId = `skill-checkbox-${skill.name.replace(/\s+/g, "-").toLowerCase()}`;
					return (
						<div
							key={skill.name}
							className={cn(
								"flex items-center gap-3 px-3 py-2 min-h-[44px] cursor-pointer transition-colors",
								i % 2 === 0 ? "bg-card" : "bg-muted/30",
								"hover:bg-primary/5 active:bg-primary/10",
							)}
						>
							<Checkbox
								id={skillId}
								checked={proficient}
								onCheckedChange={() => handleToggleSkill(skill.name)}
								disabled={readOnly}
							/>
							<label
								htmlFor={skillId}
								className="flex-1 text-sm text-foreground cursor-pointer select-none"
							>
								{skill.name}
							</label>
							<span className="text-xs text-muted-foreground w-8 text-center font-mono">
								{skill.abilityKey}
							</span>
							<span
								className={cn(
									"font-bold text-sm w-10 text-right font-mono",
									proficient ? "text-primary" : "text-foreground",
								)}
							>
								{formatted}
							</span>
						</div>
					);
				})}
			</div>
		</section>
	);
}
