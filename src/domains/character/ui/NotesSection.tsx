import styles from "./CharacterSheet.module.css";

interface NotesSectionProps {
	notes: string;
	readOnly: boolean;
	onChange: (value: string) => void;
	onBlur: (() => void) | undefined;
}

export function NotesSection({ notes, readOnly, onChange, onBlur }: NotesSectionProps) {
	return (
		<div className={styles.section}>
			<h2 className={styles.sectionTitle}>Notes</h2>
			<textarea
				className={styles.notesTextarea}
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
