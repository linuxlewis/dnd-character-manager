import { Dices } from "lucide-react";
import { Button } from "../../../app/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../app/components/ui/tooltip.tsx";
import type { DiceRollInput } from "../types/dice.js";
import { formatModifier } from "../types/dice.js";
import { useDiceRoller } from "./DiceRollerContext.tsx";

interface QuickRollButtonProps {
	modifier: number;
	label: string;
	compact?: boolean;
}

export function QuickRollButton({ modifier, label, compact }: QuickRollButtonProps) {
	const { roll, rolling } = useDiceRoller();

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		const input: DiceRollInput = {
			die: 20,
			modifier,
			mode: "normal",
			label,
		};
		roll(input);
	};

	if (compact) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 p-0 hover:bg-primary/10"
						onClick={handleClick}
						disabled={rolling}
						aria-label={`Roll d20 ${formatModifier(modifier)} for ${label}`}
					>
						<Dices className="h-3 w-3 text-muted-foreground" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Roll d20 {formatModifier(modifier)}</p>
				</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-1.5 text-xs gap-1 hover:bg-primary/10"
					onClick={handleClick}
					disabled={rolling}
					aria-label={`Roll d20 ${formatModifier(modifier)} for ${label}`}
				>
					<Dices className="h-3 w-3" />
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>Roll d20 {formatModifier(modifier)}</p>
			</TooltipContent>
		</Tooltip>
	);
}
