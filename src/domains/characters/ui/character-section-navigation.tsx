import { Anchor, Box, Group } from "@mantine/core";
import { useCallback, useState } from "react";
import type { CharacterSection } from "./character-route.js";
import { characterSectionPath, shouldHandleCharacterLink } from "./character-route.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";

const sections: readonly { key: CharacterSection; label: string; compactLabel: string }[] = [
	{ key: "attributes", label: "Attributes & Rolls", compactLabel: "Rolls" },
	{ key: "spells", label: "Spells & Abilities", compactLabel: "Spells" },
	{ key: "inventory", label: "Inventory", compactLabel: "Inventory" },
];

export function CharacterSectionNavigation({
	activeSection,
	characterId,
	onNavigate,
}: {
	activeSection: CharacterSection;
	characterId: string;
	onNavigate: NavigateToCharacterRoute;
}) {
	const [canScrollRight, setCanScrollRight] = useState(false);
	const setScrollNode = useCallback((node: HTMLDivElement | null) => {
		if (!node) return;

		const updateScrollCue = () => {
			setCanScrollRight(
				canScrollRightFromMetrics({
					clientWidth: node.clientWidth,
					scrollLeft: node.scrollLeft,
					scrollWidth: node.scrollWidth,
				}),
			);
		};
		updateScrollCue();
		node.addEventListener("scroll", updateScrollCue, { passive: true });
		const resizeObserver =
			typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateScrollCue);
		resizeObserver?.observe(node);
		if (node.firstElementChild) resizeObserver?.observe(node.firstElementChild);

		return () => {
			node.removeEventListener("scroll", updateScrollCue);
			resizeObserver?.disconnect();
		};
	}, []);

	return (
		<Box
			component="nav"
			aria-label="Character sections"
			className="character-section-navigation"
			py="xs"
		>
			<Box className="character-section-navigation-scroll" ref={setScrollNode}>
				<Group
					className={
						canScrollRight
							? "character-section-navigation-track has-overflow"
							: "character-section-navigation-track"
					}
					gap={0}
					wrap="nowrap"
				>
					{sections.map((section) => {
						const active = section.key === activeSection;
						return (
							<Anchor
								aria-current={active ? "page" : undefined}
								aria-label={section.label}
								className={active ? "character-section-link active" : "character-section-link"}
								data-active={active || undefined}
								href={characterSectionPath(characterId, section.key)}
								key={section.key}
								onClick={(event) => {
									if (!shouldHandleCharacterLink(event)) return;
									event.preventDefault();
									onNavigate({ screen: "detail", id: characterId, section: section.key });
								}}
								underline="never"
							>
								<span className="character-section-full-label">{section.label}</span>
								<span aria-hidden="true" className="character-section-compact-label">
									{section.compactLabel}
								</span>
							</Anchor>
						);
					})}
				</Group>
			</Box>
			{canScrollRight && (
				<Box aria-hidden="true" className="character-section-navigation-affordance" />
			)}
		</Box>
	);
}

export function canScrollRightFromMetrics({
	clientWidth,
	scrollLeft,
	scrollWidth,
}: {
	clientWidth: number;
	scrollLeft: number;
	scrollWidth: number;
}) {
	return scrollLeft + clientWidth < scrollWidth - 1;
}
