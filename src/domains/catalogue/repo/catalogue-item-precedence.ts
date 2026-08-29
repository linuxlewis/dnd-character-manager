import type { CatalogueItemSeed } from "../types/index.js";

const SOURCE_PRECEDENCE: Record<string, number> = {
	"foundry-dnd5e": 0,
	open5e: 10,
	"dnd5eapi-legacy": 20,
};

export function deduplicateCatalogueItems(items: CatalogueItemSeed[]) {
	const winners = new Map<string, CatalogueItemSeed>();
	for (const item of items) {
		const identity = `${item.source}|${item.sourceKey}|${item.rulesVersion}`;
		const current = winners.get(identity);
		if (!current || comparePrecedence(item, current) < 0) winners.set(identity, item);
	}
	return [...winners.values()].sort((left, right) =>
		`${left.rulesVersion}|${left.sourceKey}|${left.sourcePath}`.localeCompare(
			`${right.rulesVersion}|${right.sourceKey}|${right.sourcePath}`,
		),
	);
}

function comparePrecedence(left: CatalogueItemSeed, right: CatalogueItemSeed) {
	return (
		(SOURCE_PRECEDENCE[left.source] ?? Number.MAX_SAFE_INTEGER) -
			(SOURCE_PRECEDENCE[right.source] ?? Number.MAX_SAFE_INTEGER) ||
		left.sourceRevision.localeCompare(right.sourceRevision) ||
		left.sourcePath.localeCompare(right.sourcePath)
	);
}
