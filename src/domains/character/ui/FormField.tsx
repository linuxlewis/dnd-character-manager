import type { ReactNode } from "react";
import { Label } from "../../../app/components/ui/label.tsx";

export function FormField({
	label,
	id,
	error,
	children,
}: {
	label: string;
	id: string;
	error?: string;
	children: ReactNode;
}) {
	return (
		<div>
			<Label htmlFor={id}>{label}</Label>
			{children}
			{error && (
				<p id={`${id}-error`} className="text-sm text-destructive mt-1" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
