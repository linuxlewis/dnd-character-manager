import { Dices } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "../../../app/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../../app/components/ui/dialog.tsx";
import { cn } from "../../../app/lib/utils.ts";

const DICE_TYPES = [4, 6, 8, 10, 12, 20] as const;

interface RollResult {
	die: number;
	value: number;
	timestamp: number;
}

export function DiceRoller() {
	const [results, setResults] = useState<RollResult[]>([]);
	const [rolling, setRolling] = useState(false);

	const rollDie = useCallback((die: number) => {
		setRolling(true);
		setTimeout(() => {
			const value = Math.floor(Math.random() * die) + 1;
			setResults((prev) => [{ die, value, timestamp: Date.now() }, ...prev].slice(0, 10));
			setRolling(false);
		}, 300);
	}, []);

	const latest = results[0];
	const isCrit = latest && latest.die === 20 && latest.value === 20;
	const isFumble = latest && latest.die === 20 && latest.value === 1;

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
					<DialogTitle>Dice Roller</DialogTitle>
				</DialogHeader>

				<div className="grid grid-cols-3 gap-2 mb-4">
					{DICE_TYPES.map((die) => (
						<Button
							key={die}
							variant="outline"
							className="h-14 text-lg font-heading font-bold hover:bg-primary/10 hover:border-primary"
							onClick={() => rollDie(die)}
							disabled={rolling}
						>
							d{die}
						</Button>
					))}
				</div>

				{latest && (
					<div
						className={cn(
							"text-center py-6 rounded-lg border-2 mb-4 animate-fade-in-scale",
							isCrit && "border-gold bg-gold/10",
							isFumble && "border-blood bg-blood/10",
							!isCrit && !isFumble && "border-border bg-muted",
						)}
					>
						<div className="text-sm text-muted-foreground font-heading">d{latest.die}</div>
						<div
							className={cn(
								"text-5xl font-bold font-heading",
								isCrit && "text-gold",
								isFumble && "text-blood",
								!isCrit && !isFumble && "text-foreground",
							)}
						>
							{latest.value}
						</div>
						{isCrit && <div className="text-sm font-bold text-gold mt-1">Critical Hit!</div>}
						{isFumble && <div className="text-sm font-bold text-blood mt-1">Critical Fail!</div>}
					</div>
				)}

				{results.length > 1 && (
					<div>
						<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
							History
						</h4>
						<div className="flex flex-wrap gap-2">
							{results.slice(1).map((r) => (
								<span
									key={r.timestamp}
									className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-md bg-muted text-muted-foreground"
								>
									<span className="text-xs opacity-60">d{r.die}</span>
									<span className="font-bold text-foreground">{r.value}</span>
								</span>
							))}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
