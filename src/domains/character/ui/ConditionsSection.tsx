import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../../app/components/ui/badge.tsx";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../../../app/components/ui/tooltip.tsx";
import { cn } from "../../../app/lib/utils.ts";
import { CONDITION_DETAILS, type CharacterConditionName } from "../types/conditions.js";
import type { Character } from "../types/index.js";

const SRD_CONDITIONS = [
	"Blinded",
	"Charmed",
	"Deafened",
	"Frightened",
	"Grappled",
	"Incapacitated",
	"Invisible",
	"Paralyzed",
	"Petrified",
	"Poisoned",
	"Prone",
	"Restrained",
	"Stunned",
	"Unconscious",
] as const satisfies CharacterConditionName[];

async function postCharacterJson<T>(url: string, body?: unknown): Promise<T | null> {
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}

export function ConditionsSection({
	character,
	readOnly,
	onUpdate,
}: {
	character: Character;
	readOnly: boolean;
	onUpdate: (character: Character) => void;
}) {
	const activeNames = new Set(character.conditions.map((condition) => condition.name));

	const toggle = async (conditionName: CharacterConditionName) => {
		const shouldEnable = !activeNames.has(conditionName);
		let durationRounds: number | null = null;
		if (shouldEnable) {
			const input = prompt(`Duration in rounds for ${conditionName}? Leave blank for indefinite.`);
			if (input && input.trim().length > 0) {
				const parsed = Number.parseInt(input, 10);
				if (!Number.isNaN(parsed) && parsed > 0) durationRounds = parsed;
			}
		}
		try {
			const data = await postCharacterJson<Character>(
				`/api/characters/${character.id}/conditions/toggle`,
				{
					conditionName,
					durationRounds,
				},
			);
			if (data) {
				onUpdate(data);
				toast.success(shouldEnable ? `${conditionName} applied` : `${conditionName} removed`);
			} else {
				toast.error("Failed to update condition");
			}
		} catch {
			toast.error("Network error");
		}
	};

	return (
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Conditions
			</h2>
			{character.conditions.length > 0 ? (
				<div className="flex flex-wrap gap-2 mb-3" aria-label="Active conditions list">
					{character.conditions.map((condition) => (
						<ConditionBadge key={condition.name} condition={condition} active />
					))}
				</div>
			) : (
				<div className="text-sm text-muted-foreground mb-3">No active conditions.</div>
			)}
			<div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
				{SRD_CONDITIONS.map((conditionName) => {
					const active = activeNames.has(conditionName);
					const duration = character.conditions.find(
						(condition) => condition.name === conditionName,
					)?.durationRounds;
					return (
						<button
							key={conditionName}
							type="button"
							className={cn(
								"flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
								active
									? "border-destructive/40 bg-destructive/10"
									: "border-border bg-card hover:border-primary/40",
							)}
							onClick={() => !readOnly && toggle(conditionName)}
							disabled={readOnly}
						>
							<div className="flex items-center gap-2">
								{active && <AlertTriangle className="h-4 w-4 text-destructive" />}
								<span className="text-sm font-medium text-foreground">{conditionName}</span>
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex items-center gap-1">
										{duration ? <Badge variant="outline">{duration}r</Badge> : null}
										<Badge variant={active ? "destructive" : "secondary"}>
											{active ? "Active" : "Info"}
										</Badge>
									</div>
								</TooltipTrigger>
								<TooltipContent className="max-w-sm">
									<p className="font-semibold mb-1">{conditionName}</p>
									<p>{CONDITION_DETAILS[conditionName].summary}</p>
									{CONDITION_DETAILS[conditionName].effects.length > 0 && (
										<ul className="list-disc pl-4 mt-2 space-y-1">
											{CONDITION_DETAILS[conditionName].effects.map((effect) => (
												<li key={effect}>{effect}</li>
											))}
										</ul>
									)}
								</TooltipContent>
							</Tooltip>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function ConditionBadge({
	condition,
	active,
}: {
	condition: Character["conditions"][number];
	active: boolean;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div>
					<Badge variant={active ? "destructive" : "secondary"} className="cursor-default">
						{condition.name}
						{condition.durationRounds ? ` (${condition.durationRounds}r)` : ""}
					</Badge>
				</div>
			</TooltipTrigger>
			<TooltipContent className="max-w-sm">
				<p className="font-semibold mb-1">{condition.name}</p>
				<p>{CONDITION_DETAILS[condition.name].summary}</p>
				{CONDITION_DETAILS[condition.name].effects.length > 0 && (
					<ul className="list-disc pl-4 mt-2 space-y-1">
						{CONDITION_DETAILS[condition.name].effects.map((effect) => (
							<li key={effect}>{effect}</li>
						))}
					</ul>
				)}
			</TooltipContent>
		</Tooltip>
	);
}
