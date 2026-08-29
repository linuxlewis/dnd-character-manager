import type { CatalogueSource, RulesVersion } from "../types/index.js";

const SOURCE_PRECEDENCE: Record<string, number> = {
	"foundry-dnd5e": 0,
	open5e: 10,
	"dnd5eapi-legacy": 20,
};

export interface CatalogueItemPrecedenceCandidate {
	source: CatalogueSource;
	sourceKey: string;
	sourcePath: string;
	sourceRevision: string;
	rulesVersion: RulesVersion;
	identifier: string;
}

export function deduplicateCatalogueItems<T extends CatalogueItemPrecedenceCandidate>(
	items: readonly T[],
) {
	return deduplicateCatalogueItemCandidates(items);
}

export function deduplicateCatalogueItemCandidates<T extends CatalogueItemPrecedenceCandidate>(
	items: readonly T[],
) {
	const winners = new Map<string, T>();
	for (const item of items) {
		const identity = `${item.rulesVersion}|${normalizeIdentity(item.identifier)}`;
		const current = winners.get(identity);
		if (!current || comparePrecedence(item, current) < 0) winners.set(identity, item);
	}
	return [...winners.values()].sort((left, right) =>
		`${left.rulesVersion}|${normalizeIdentity(left.identifier)}|${left.sourcePath}`.localeCompare(
			`${right.rulesVersion}|${normalizeIdentity(right.identifier)}|${right.sourcePath}`,
		),
	);
}

export function comparePrecedence(
	left: CatalogueItemPrecedenceCandidate,
	right: CatalogueItemPrecedenceCandidate,
) {
	return (
		(SOURCE_PRECEDENCE[left.source] ?? Number.MAX_SAFE_INTEGER) -
			(SOURCE_PRECEDENCE[right.source] ?? Number.MAX_SAFE_INTEGER) ||
		left.sourceRevision.localeCompare(right.sourceRevision) ||
		left.sourcePath.localeCompare(right.sourcePath)
	);
}

function normalizeIdentity(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}
