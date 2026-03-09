import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../app/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../../../app/components/ui/dialog.tsx";

interface DeleteCharacterDialogProps {
	characterId: string;
	characterName: string;
	isOpen: boolean;
	onClose: () => void;
	onDeleted: () => void;
}

export function DeleteCharacterDialog({
	characterId,
	characterName,
	isOpen,
	onClose,
	onDeleted,
}: DeleteCharacterDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	async function handleDelete() {
		setIsDeleting(true);
		try {
			const res = await fetch(`/api/characters/${characterId}`, {
				method: "DELETE",
			});
			if (!res.ok) {
				toast.error("Failed to delete character");
				return;
			}
			toast.success(`${characterName} has been deleted`);
			onDeleted();
			onClose();
		} catch {
			toast.error("Network error");
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Character</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete <strong>{characterName}</strong>? This action cannot be
						undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
						{isDeleting ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
