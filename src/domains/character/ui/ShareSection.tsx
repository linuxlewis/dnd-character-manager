import { useCallback, useState } from "react";
import styles from "./CharacterSheet.module.css";

export function ShareSection({ slug }: { slug: string }) {
	const [copied, setCopied] = useState(false);
	const shareUrl = `${window.location.origin}/characters/${slug}`;

	const handleCopy = useCallback(() => {
		navigator.clipboard
			.writeText(shareUrl)
			.then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			})
			.catch(() => {});
	}, [shareUrl]);

	return (
		<div className={styles.shareSection} data-testid="share-url-section">
			<span className={styles.shareLabel}>Share:</span>
			<code className={styles.shareUrl} data-testid="share-url">
				{shareUrl}
			</code>
			<button
				type="button"
				className={styles.copyButton}
				onClick={handleCopy}
				data-testid="copy-share-url"
			>
				{copied ? "Copied!" : "Copy"}
			</button>
		</div>
	);
}
