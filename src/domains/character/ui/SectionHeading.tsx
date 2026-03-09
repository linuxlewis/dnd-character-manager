import type { ReactNode } from "react";

export function SectionHeading({ children }: { children: ReactNode }) {
	return (
		<h2 className="text-base font-heading font-bold text-foreground mb-3 pb-1 border-b-2 border-primary/20">
			{children}
		</h2>
	);
}
