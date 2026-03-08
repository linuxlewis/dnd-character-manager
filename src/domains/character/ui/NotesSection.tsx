import styles from "./CharacterSheet.module.css";

interface NotesSectionProps {
	notes: string;
	onNotesChange: (value: string) => void;
	onNotesBlur: (() => void) | undefined;
	readOnly: boolean;
}

export function NotesSection({ notes, onNotesChange, onNotesBlur, readOnly }: NotesSectionProps) {
	return (
		<div className={styles.section}>
			<h2 className={styles.sectionTitle}>Notes</h2>
			<textarea
				className={styles.notesTextarea}
				value={notes}
				onChange={(e) => onNotesChange(e.target.value)}
				onBlur={onNotesBlur}
				placeholder="Add notes about your character..."
				rows={6}
				readOnly={readOnly}
			/>
		</div>
	);
}
