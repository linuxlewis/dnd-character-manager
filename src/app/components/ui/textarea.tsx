import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils.ts";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
	return (
		<textarea
			className={cn(
				"flex min-h-[120px] w-full rounded-lg border border-input bg-input-bg px-3 py-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y",
				className,
			)}
			{...props}
		/>
	);
}
