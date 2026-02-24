export function generateSlug(name: string): string {
	const base = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");

	const bytes = new Uint8Array(2);
	crypto.getRandomValues(bytes);
	const suffix = Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `${base}-${suffix}`;
}
