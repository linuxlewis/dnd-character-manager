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
		<section
			className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg mb-6 flex-wrap sm:flex-nowrap"
			data-testid="share-url-section"
			aria-label="Share character link"
		>
			<span className="font-semibold text-muted-foreground whitespace-nowrap">Share:</span>
			<code
				className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-foreground break-all max-w-[200px] sm:max-w-none font-mono"
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
		</section>
	);
}
