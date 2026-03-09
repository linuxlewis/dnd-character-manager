import { cn } from "@/lib/utils.ts";
import * as LabelPrimitive from "@radix-ui/react-label";
import type { ComponentPropsWithoutRef } from "react";

const labelClasses =
	"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";

function Label({ className, ...props }: ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) {
	return <LabelPrimitive.Root className={cn(labelClasses, className)} {...props} />;
}

export { Label };
