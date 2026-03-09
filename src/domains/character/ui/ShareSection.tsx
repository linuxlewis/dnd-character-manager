import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../app/components/ui/button.tsx";

export function ShareSection({ slug }: { slug: string }) {
	const [copied, setCopied] = useState(false);
	const shareUrl = `${window.location.origin}/characters/${slug}`;

	const handleCopy = () => {
		navigator.clipboard
			.writeText(shareUrl)
			.then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			})
			.catch((err) => {
				console.error("Failed to copy URL:", err);
			});
	};

	return (
		<div
			className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg mb-4 flex-wrap"
			data-testid="share-url-section"
		>
			<span className="font-semibold text-muted-foreground whitespace-nowrap">Share:</span>
			<code
				className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-foreground"
				data-testid="share-url"
			>
				{shareUrl}
			</code>
			<Button variant="default" size="sm" onClick={handleCopy} data-testid="copy-share-url">
				{copied ? (
					<>
						<Check className="h-3.5 w-3.5" />
						Copied!
					</>
				) : (
					<>
						<Copy className="h-3.5 w-3.5" />
						Copy
					</>
				)}
			</Button>
		</div>
	);
}
