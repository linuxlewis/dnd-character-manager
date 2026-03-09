import { BookOpen } from "lucide-react";
import { Textarea } from "../../../app/components/ui/textarea.tsx";

interface NotesSectionProps {
	notes: string;
	readOnly: boolean;
	onChange: (value: string) => void;
	onBlur: (() => void) | undefined;
}

export function NotesSection({ notes, readOnly, onChange, onBlur }: NotesSectionProps) {
	return (
		<section className="mb-6" aria-label="Character Notes">
			<h2 className="text-base font-heading font-bold text-foreground mb-3 pb-1 border-b-2 border-primary/20 flex items-center gap-2">
				<BookOpen className="h-4 w-4 text-muted-foreground" />
				Notes
			</h2>
			<Textarea
				value={notes}
				onChange={(e) => onChange(e.target.value)}
				onBlur={readOnly ? undefined : onBlur}
				placeholder="Record your character's story, backstory, allies, enemies..."
				rows={6}
				readOnly={readOnly}
				aria-label="Character notes"
			/>
			{!readOnly && (
				<p className="text-xs text-muted-foreground mt-1">
					Notes save automatically when you click away.
				</p>
			)}
		</section>
	);
}
