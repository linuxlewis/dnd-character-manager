import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryItemSchema } from "../types/index.js";
import { ItemCard, ItemThumbnail } from "./item-card.js";

const thumbnailHarness = vi.hoisted(() => ({
	failedThumbnailUrl: null as string | null,
	interceptNextState: false,
	onError: undefined as (() => void) | undefined,
}));

vi.mock("react", async (importOriginal) => {
	const react = await importOriginal<typeof import("react")>();
	const renderState = react.useState;

	return {
		...react,
		useState<State>(initialState: State | (() => State)) {
			if (!thumbnailHarness.interceptNextState) return renderState(initialState);

			thumbnailHarness.interceptNextState = false;
			return [
				thumbnailHarness.failedThumbnailUrl as State,
				(value: React.SetStateAction<State>) => {
					const nextValue =
						typeof value === "function"
							? (value as (current: State) => State)(thumbnailHarness.failedThumbnailUrl as State)
							: value;
					thumbnailHarness.failedThumbnailUrl = nextValue as string | null;
				},
			] as const;
		},
	};
});

vi.mock("@mantine/core", async (importOriginal) => {
	const mantine = await importOriginal<typeof import("@mantine/core")>();
	const react = await import("react");

	return {
		...mantine,
		Image({ onError, ...props }: React.ComponentPropsWithoutRef<"img">) {
			thumbnailHarness.onError = onError
				? () => onError({} as React.SyntheticEvent<HTMLImageElement>)
				: undefined;
			return react.createElement("img", props);
		},
	};
});

beforeEach(() => {
	thumbnailHarness.failedThumbnailUrl = null;
	thumbnailHarness.interceptNextState = false;
	thumbnailHarness.onError = undefined;
});

describe("ItemCard", () => {
	it("renders the thumbnail fallback, rarity, quantity, type, values, and key stats", () => {
		const html = renderToString(
			<MantineProvider>
				<ItemCard item={item()} onClick={() => undefined} />
			</MantineProvider>,
		).replaceAll("<!-- -->", "");

		expect(html).toContain('aria-label="View Moonblade"');
		expect(html).toContain('aria-label="Equipment icon"');
		expect(html).toContain("Rare");
		expect(html).toContain("x2");
		expect(html).toContain("Equipment");
		expect(html).toContain("Weapons");
		expect(html).toContain("3 lb");
		expect(html).toContain("15 GP");
		expect(html).toContain("Damage:");
		expect(html).toContain("1d8 slashing");
	});

	it("uses the type fallback when the thumbnail is missing", () => {
		const html = renderThumbnail(item());

		expect(html).toContain('aria-label="Equipment icon"');
		expect(html).not.toContain("<img");
	});

	it("switches to the type fallback when the thumbnail fails to load", () => {
		const thumbnailUrl = "https://example.test/moonblade.webp";

		expect(renderThumbnail(item({ thumbnailUrl }))).toContain(`src="${thumbnailUrl}"`);
		expect(thumbnailHarness.onError).toBeTypeOf("function");

		thumbnailHarness.onError?.();

		const html = renderThumbnail(item({ thumbnailUrl }));
		expect(html).toContain('aria-label="Equipment icon"');
		expect(html).not.toContain("<img");
	});

	it("keeps a valid remote thumbnail rendered", () => {
		const thumbnailUrl = "https://example.test/moonblade.webp";
		const html = renderThumbnail(item({ thumbnailUrl }));

		expect(html).toContain(`src="${thumbnailUrl}"`);
		expect(html).not.toContain('aria-label="Equipment icon"');
	});
});

function renderThumbnail(inventoryItem: ReturnType<typeof item>) {
	return renderToString(
		<MantineProvider>
			<ArmThumbnailState>
				<ItemThumbnail item={inventoryItem} />
			</ArmThumbnailState>
		</MantineProvider>,
	);
}

function ArmThumbnailState({ children }: { children: React.ReactNode }) {
	thumbnailHarness.interceptNextState = true;
	return children;
}

function item(overrides: { thumbnailUrl?: string | null } = {}) {
	return InventoryItemSchema.parse({
		id: "00000000-0000-4000-8000-000000000040",
		inventoryScopeId: "00000000-0000-4000-8000-000000000049",
		name: "Moonblade",
		type: "equipment",
		category: "Weapons",
		rarity: "rare",
		description: "A luminous magical blade.",
		quantity: 2,
		weight: 3,
		estimatedValue: 15,
		notes: null,
		thumbnailUrl: overrides.thumbnailUrl ?? null,
		properties: {
			stats: {
				baseItem: "longsword",
				itemType: "martialM",
				damage: {
					base: { number: 1, denomination: 8, types: ["slashing"] },
					versatile: { number: 1, denomination: 10, types: ["slashing"] },
				},
			},
		},
		isEquipped: false,
		statModifiers: null,
		statOverrides: null,
		catalogueItemId: null,
		catalogueSourceKey: null,
		catalogueRulesVersion: null,
		createdAt: "2026-08-29T00:00:00.000Z",
		updatedAt: "2026-08-29T00:00:00.000Z",
	});
}
