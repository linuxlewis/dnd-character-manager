import type { ReactNode } from "react";
import { cn } from "../../../app/lib/utils.ts";

export function QuickStat({
	icon,
	label,
	value,
	sub,
}: {
	icon?: ReactNode;
	label: string;
	value: string;
	sub?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center p-3 rounded-lg bg-card border border-border text-center",
			)}
		>
			<div className="flex items-center gap-1 mb-0.5">
				{icon}
				<span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold">
					{label}
				</span>
			</div>
			<span className="text-2xl font-heading font-bold text-foreground">{value}</span>
			{sub && <span className="text-[0.65rem] text-muted-foreground">{sub}</span>}
		</div>
	);
}
