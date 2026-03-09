import { Checkbox } from "../../../app/components/ui/checkbox.tsx";
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
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Skills
			</h2>
			<div className="flex flex-col gap-1">
				{SKILLS.map((skill) => {
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
							className="flex items-center gap-3 p-2 rounded-md min-h-[44px] cursor-pointer odd:bg-muted even:bg-background active:bg-primary/10 transition-colors"
						>
							<Checkbox
								id={skillId}
								checked={proficient}
								onCheckedChange={() => handleToggleSkill(skill.name)}
								disabled={readOnly}
							/>
							<label
								htmlFor={skillId}
								className="flex-1 text-[0.95rem] text-foreground cursor-pointer"
							>
								{skill.name}
							</label>
							<span className="text-xs text-muted-foreground w-8 text-center">
								{skill.abilityKey}
							</span>
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
