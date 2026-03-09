import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils.ts";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
	value: number;
	max?: number;
	variant?: "default" | "success" | "warning" | "destructive";
}

export function Progress({
	className,
	value,
	max = 100,
	variant = "default",
	...props
}: ProgressProps) {
	const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

	const variantClasses = {
		default: "bg-primary",
		success: "bg-success",
		warning: "bg-warning",
		destructive: "bg-destructive",
	};

	return (
		<div
			role="progressbar"
			tabIndex={-1}
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={max}
			className={cn(
				"relative h-3 w-full overflow-hidden rounded-full bg-muted border border-border",
				className,
			)}
			{...props}
		>
			<div
				className={cn(
					"h-full rounded-full transition-all duration-500 ease-out",
					variantClasses[variant],
				)}
				style={{ width: `${percent}%` }}
			/>
		</div>
	);
}
