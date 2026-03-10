import { Badge } from "../../../app/components/ui/badge.tsx";

interface LevelUpSummaryStepProps {
	characterName: string;
	newLevel: number;
	hpGain: number;
	profBonusIncreases: boolean;
	oldProfBonus: number;
	newProfBonus: number;
	getsASI: boolean;
	hasNewSpells: boolean;
}

export function LevelUpSummaryStep({
	characterName,
	newLevel,
	hpGain,
	profBonusIncreases,
	oldProfBonus,
	newProfBonus,
	getsASI,
	hasNewSpells,
}: LevelUpSummaryStepProps) {
	return (
		<div className="space-y-4">
			<div className="text-center">
				<h3 className="text-xl font-semibold">Level Up!</h3>
				<p className="text-muted-foreground">
					{characterName} is ready to advance to level {newLevel}
				</p>
			</div>

			<div className="space-y-3">
				<div className="flex items-center justify-between p-3 border rounded-lg">
					<span>Hit Points</span>
					<Badge variant="secondary">+{hpGain} HP</Badge>
				</div>

				{profBonusIncreases && (
					<div className="flex items-center justify-between p-3 border rounded-lg">
						<span>Proficiency Bonus</span>
						<Badge variant="secondary">
							+{newProfBonus - oldProfBonus} (now +{newProfBonus})
						</Badge>
					</div>
				)}

				{getsASI && (
					<div className="flex items-center justify-between p-3 border rounded-lg">
						<span>Ability Score Improvement</span>
						<Badge variant="outline">2 points to distribute</Badge>
					</div>
				)}

				{hasNewSpells && (
					<div className="flex items-center justify-between p-3 border rounded-lg">
						<span>Spell Slots</span>
						<Badge variant="outline">New spell slots available</Badge>
					</div>
				)}
			</div>
		</div>
	);
}
