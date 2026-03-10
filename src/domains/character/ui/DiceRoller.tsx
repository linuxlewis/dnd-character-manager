import { Dices, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../app/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../../app/components/ui/dialog.tsx";
import { cn } from "../../../app/lib/utils.ts";
import { DICE_TYPES, type RollMode, formatModifier } from "../types/dice.js";
import { useDiceRoller } from "./DiceRollerContext.tsx";

const MODE_LABELS: Record<RollMode, string> = {
	normal: "Normal",
	advantage: "Advantage",
	disadvantage: "Disadvantage",
};

export function DiceRoller() {
	const { results, rolling, roll, clearHistory } = useDiceRoller();
	const [mode, setMode] = useState<RollMode>("normal");

	const handleRoll = (die: (typeof DICE_TYPES)[number]) => {
		roll({ die, modifier: 0, mode, label: "" });
	};

	const cycleMode = () => {
		const modes: RollMode[] = ["normal", "advantage", "disadvantage"];
		const idx = modes.indexOf(mode);
		setMode(modes[(idx + 1) % modes.length]);
	};

	const latest = results[0];
	const isCrit = latest?.isCrit ?? false;
	const isFumble = latest?.isFumble ?? false;

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" aria-label="Open dice roller">
					<Dices className="h-4 w-4" />
					<span className="max-sm:hidden">Dice</span>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Dices
							className={cn("h-5 w-5 text-primary", rolling && "animate-dice-roll")}
							aria-hidden="true"
						/>
						Dice Roller
					</DialogTitle>
				</DialogHeader>

				<div className="flex items-center justify-between mb-3">
					<Button
						variant="outline"
						size="sm"
						onClick={cycleMode}
						className={cn(
							"text-xs font-bold",
							mode === "advantage" && "border-green-500 text-green-600",
							mode === "disadvantage" && "border-red-500 text-red-600",
						)}
					>
						{MODE_LABELS[mode]}
					</Button>
					{results.length > 0 && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearHistory}
							className="text-xs text-muted-foreground"
							aria-label="Clear roll history"
						>
							<Trash2 className="h-3 w-3 mr-1" />
							Clear
						</Button>
					)}
				</div>

				<div className="grid grid-cols-4 gap-2 mb-4">
					{DICE_TYPES.map((die) => (
						<Button
							key={die}
							variant="outline"
							className="h-14 text-lg font-heading font-bold hover:bg-primary/10 hover:border-primary transition-all active:scale-95"
							onClick={() => handleRoll(die)}
							disabled={rolling}
						>
							d{die}
						</Button>
					))}
				</div>

				{latest && <RollResultDisplay result={latest} isCrit={isCrit} isFumble={isFumble} />}

				{results.length > 1 && (
					<div>
						<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
							History
						</h4>
						<div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
							{results.slice(1).map((r) => (
								<span
									key={r.timestamp}
									className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-md bg-muted text-muted-foreground"
								>
									<span className="text-xs opacity-60">{r.label ? r.label : `d${r.die}`}</span>
									{r.modifier !== 0 && (
										<span className="text-xs opacity-60">{formatModifier(r.modifier)}</span>
									)}
									<span
										className={cn(
											"font-bold",
											r.isCrit && "text-gold",
											r.isFumble && "text-blood",
											!r.isCrit && !r.isFumble && "text-foreground",
										)}
									>
										{r.total}
									</span>
								</span>
							))}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function RollResultDisplay({
	result,
	isCrit,
	isFumble,
}: {
	result: {
		die: number;
		rolls: number[];
		selectedRoll: number;
		modifier: number;
		total: number;
		mode: string;
		label: string;
		isCrit: boolean;
		isFumble: boolean;
		timestamp: number;
	};
	isCrit: boolean;
	isFumble: boolean;
}) {
	return (
		<div
			key={result.timestamp}
			className={cn(
				"text-center py-6 rounded-lg border-2 mb-4 animate-fade-in-scale",
				isCrit && "border-gold bg-gold/10",
				isFumble && "border-blood bg-blood/10",
				!isCrit && !isFumble && "border-border bg-muted",
			)}
		>
			{result.label && (
				<div className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
					{result.label}
				</div>
			)}
			<div className="text-sm text-muted-foreground font-heading">
				d{result.die}
				{result.mode !== "normal" && (
					<span
						className={cn(
							"ml-1 text-xs",
							result.mode === "advantage" ? "text-green-600" : "text-red-600",
						)}
					>
						({result.mode === "advantage" ? "ADV" : "DIS"})
					</span>
				)}
			</div>
			{result.rolls.length > 1 && (
				<div className="text-xs text-muted-foreground mb-1">
					Rolls: {result.rolls.join(", ")} → {result.selectedRoll}
				</div>
			)}
			<div
				className={cn(
					"text-5xl font-bold font-heading",
					isCrit && "text-gold",
					isFumble && "text-blood",
					!isCrit && !isFumble && "text-foreground",
				)}
			>
				{result.total}
			</div>
			{result.modifier !== 0 && (
				<div className="text-xs text-muted-foreground mt-1">
					{result.selectedRoll} {formatModifier(result.modifier)}
				</div>
			)}
			{isCrit && (
				<div className="text-sm font-bold text-gold mt-1 animate-pulse-glow inline-block px-3 py-0.5 rounded-full">
					Critical Hit!
				</div>
			)}
			{isFumble && <div className="text-sm font-bold text-blood mt-1">Critical Fail!</div>}
		</div>
	);
}
