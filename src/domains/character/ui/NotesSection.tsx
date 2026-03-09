import { Textarea } from "../../../app/components/ui/textarea.tsx";

interface NotesSectionProps {
	notes: string;
	readOnly: boolean;
	onChange: (value: string) => void;
	onBlur: (() => void) | undefined;
}

export function NotesSection({ notes, readOnly, onChange, onBlur }: NotesSectionProps) {
	return (
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Notes
			</h2>
			<Textarea
				value={notes}
				onChange={(e) => onChange(e.target.value)}
				onBlur={readOnly ? undefined : onBlur}
				placeholder="Add notes about your character..."
				rows={6}
				readOnly={readOnly}
			/>
		</div>
	);
}
