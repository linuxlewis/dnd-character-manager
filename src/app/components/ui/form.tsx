import type { LabelProps } from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
	type ComponentPropsWithoutRef,
	type HTMLAttributes,
	createContext,
	useContext,
	useId,
} from "react";
import {
	type ControllerProps,
	type FieldPath,
	type FieldValues,
	Controller as FormController,
	FormProvider,
	useFormContext,
} from "react-hook-form";
import { cn } from "../../lib/utils.ts";
import { Label } from "./label.tsx";

export const Form = FormProvider;

interface FormFieldContextValue<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
	name: TName;
}

const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue);

export function FormField<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<FormController {...props} />
		</FormFieldContext.Provider>
	);
}

interface FormItemContextValue {
	id: string;
}

const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue);

function useFormField() {
	const fieldContext = useContext(FormFieldContext);
	const itemContext = useContext(FormItemContext);
	const { getFieldState, formState } = useFormContext();

	const fieldState = getFieldState(fieldContext.name, formState);

	const { id } = itemContext;

	return {
		id,
		name: fieldContext.name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		...fieldState,
	};
}

export function FormItem({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	const id = useId();
	return (
		<FormItemContext.Provider value={{ id }}>
			<div className={cn("space-y-1", className)} {...props} />
		</FormItemContext.Provider>
	);
}

export function FormLabel({ className, ...props }: LabelProps) {
	const { error, formItemId } = useFormField();
	return (
		<Label className={cn(error && "text-destructive", className)} htmlFor={formItemId} {...props} />
	);
}

export function FormControl({ ...props }: ComponentPropsWithoutRef<typeof Slot>) {
	const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
	return (
		<Slot
			id={formItemId}
			aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
			aria-invalid={!!error}
			{...props}
		/>
	);
}

export function FormDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
	const { formDescriptionId } = useFormField();
	return (
		<p
			id={formDescriptionId}
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

export function FormMessage({
	className,
	children,
	...props
}: HTMLAttributes<HTMLParagraphElement>) {
	const { error, formMessageId } = useFormField();
	const body = error ? String(error?.message) : children;

	if (!body) return null;

	return (
		<p
			id={formMessageId}
			className={cn("text-sm font-medium text-destructive", className)}
			{...props}
		>
			{body}
		</p>
	);
}
