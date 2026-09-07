import type { InventoryViewState } from "../../inventory/ui/index.js";
import { CharacterDetail } from "./character-detail.js";
import { CharacterList } from "./character-list.js";
import type { CharacterRoute } from "./character-route.js";
import { characterRoutePath, parseCharacterRoute } from "./character-route.js";
import { CreateCharacterForm } from "./create-character-form.js";

export type NavigateToCharacterRoute = (route: CharacterRoute) => void;

export function CharacterWorkspace({
	pathname,
	renderApplicationMenu,
}: {
	pathname?: string;
	renderApplicationMenu?: (characterActions?: ReactNode) => ReactNode;
}) {
	const route = parseCharacterRoute(
		pathname ?? (typeof window === "undefined" ? "/" : window.location.pathname),
	);

	const [inventoryViews, setInventoryViews] = useState<Record<string, InventoryViewState>>({});
	const scrollPositions = useRef(new Map<string, number>());
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
		navigateBrowserPath(characterRoutePath(route));
	}

	if (route.screen === "create") return <CreateCharacterForm onNavigate={navigate} />;
	if (route.screen === "detail") {
		return (
			<div ref={scrollRef}>
				<CharacterDetail
					key={route.id}
					id={route.id}
					section={route.section ?? "spells"}
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

import { type ReactNode, useCallback, useRef, useState } from "react";
import { navigateBrowserPath } from "../../../providers/navigation/index.js";
import { restoreSectionScroll } from "./section-scroll.js";
