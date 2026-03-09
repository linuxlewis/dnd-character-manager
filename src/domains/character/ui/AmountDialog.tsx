import { type FormEvent, useEffect, useState } from "react";
import { Button } from "../../../app/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../../../app/components/ui/dialog.tsx";
import { Input } from "../../../app/components/ui/input.tsx";
import { Label } from "../../../app/components/ui/label.tsx";

interface AmountDialogProps {
	title: string;
	label: string;
	confirmLabel: string;
	confirmVariant?: "default" | "destructive" | "success";
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (amount: number) => void;
}

export function AmountDialog({
	title,
	label,
	confirmLabel,
	confirmVariant = "default",
	isOpen,
	onClose,
	onConfirm,
}: AmountDialogProps) {
	const [value, setValue] = useState("");

	useEffect(() => {
		if (isOpen) {
			setValue("");
		}
	}, [isOpen]);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const amount = Number.parseInt(value, 10);
		if (Number.isNaN(amount) || amount <= 0) return;
		onConfirm(amount);
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="py-4">
						<Label htmlFor="amount-input">{label}</Label>
						<Input
							id="amount-input"
							type="number"
							min="1"
							placeholder="Enter amount"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							className="mt-1.5 text-lg font-heading"
							autoFocus
							required
						/>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" variant={confirmVariant}>
							{confirmLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
