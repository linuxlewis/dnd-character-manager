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
	const sourceIdentityWinners = new Map<string, T>();
	for (const item of items) {
		const identity = `${item.source}|${item.sourceKey}|${item.rulesVersion}`;
		const current = sourceIdentityWinners.get(identity);
		if (!current || comparePrecedence(item, current) < 0) {
			sourceIdentityWinners.set(identity, item);
		}
	}

	const canonicalGroups = new Map<string, Map<CatalogueSource, T[]>>();
	for (const item of sourceIdentityWinners.values()) {
		const canonicalIdentity = `${item.rulesVersion}|${normalizeIdentity(item.identifier)}`;
		const sourceGroups = canonicalGroups.get(canonicalIdentity) ?? new Map();
		const sourceItems = sourceGroups.get(item.source) ?? [];
		sourceItems.push(item);
		sourceGroups.set(item.source, sourceItems);
		canonicalGroups.set(canonicalIdentity, sourceGroups);
	}

	const winners = [...canonicalGroups.values()].flatMap((sourceGroups) => {
		const preferredSource = [...sourceGroups.entries()].sort(([, left], [, right]) =>
			comparePrecedence(sourceRepresentative(left), sourceRepresentative(right)),
		)[0]?.[0];
		return preferredSource ? (sourceGroups.get(preferredSource) ?? []) : [];
	});

	return winners.sort((left, right) =>
		`${left.rulesVersion}|${normalizeIdentity(left.identifier)}|${left.sourcePath}|${left.sourceKey}`.localeCompare(
			`${right.rulesVersion}|${normalizeIdentity(right.identifier)}|${right.sourcePath}|${right.sourceKey}`,
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

function sourceRepresentative<T extends CatalogueItemPrecedenceCandidate>(items: readonly T[]) {
	return [...items].sort(comparePrecedence)[0] as T;
}
