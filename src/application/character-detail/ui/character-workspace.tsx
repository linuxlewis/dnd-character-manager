import { type ReactNode, useCallback, useRef, useState } from "react";
import {
	CharacterList,
	type CharacterRoute,
	characterRoutePath,
	parseCharacterRoute,
} from "../../../domains/characters/ui/index.js";
import type { InventoryViewState } from "../../../domains/inventory/ui/index.js";
import { navigateBrowserPath } from "../../../providers/navigation/index.js";
import { CharacterDetail } from "./character-detail.js";
import { CreateCharacterForm } from "./create-character-form.js";
import { restoreSectionScroll } from "./section-scroll.js";

export function CharacterWorkspace({
	pathname,
	renderApplicationMenu,
}: {
	pathname?: string;
	renderApplicationMenu?: () => ReactNode;
}) {
	const route = parseCharacterRoute(
		pathname ?? (typeof window === "undefined" ? "/" : window.location.pathname),
	);

	const [inventoryViews, setInventoryViews] = useState<Record<string, InventoryViewState>>({});
	const scrollPositions = useRef(new Map<string, number>());
	const pendingSectionFocus = useRef<string | null>(null);
	const sectionKey =
		route.screen === "detail" ? `${route.id}/${route.section ?? "spells"}` : route.screen;
	const scrollRef = useCallback(
		(node: HTMLDivElement | null) => {
			if (!node) return;
			return restoreSectionScroll(node, scrollPositions.current.get(sectionKey) ?? 0, (y) =>
				scrollPositions.current.set(sectionKey, y),
			);
		},
		[sectionKey],
	);

	function navigate(route: CharacterRoute) {
		if (typeof window === "undefined") return;
		pendingSectionFocus.current = route.screen === "detail" && route.section ? route.section : null;
		navigateBrowserPath(characterRoutePath(route));
	}

	const focusSectionHeading = useCallback((node: HTMLHeadingElement | null) => {
		if (!node || !pendingSectionFocus.current) return;
		if (node.id !== `character-section-${pendingSectionFocus.current}-heading`) return;
		pendingSectionFocus.current = null;
		node.focus({ preventScroll: true });
	}, []);

	if (route.screen === "create") return <CreateCharacterForm onNavigate={navigate} />;
	if (route.screen === "detail") {
		return (
			<div ref={scrollRef}>
				<CharacterDetail
					key={route.id}
					id={route.id}
					section={route.section ?? "spells"}
					sectionHeadingRef={focusSectionHeading}
					onNavigate={navigate}
					renderApplicationMenu={renderApplicationMenu}
					inventoryView={inventoryViews[route.id] ?? { searchInput: "", activeType: "all" }}
					onInventoryViewChange={(next) =>
						setInventoryViews((current) => ({ ...current, [route.id]: next }))
					}
				/>
			</div>
		);
	}
	return <CharacterList onNavigate={navigate} />;
}
