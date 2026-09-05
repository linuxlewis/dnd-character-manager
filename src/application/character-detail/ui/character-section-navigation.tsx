import { Anchor, Box, Group } from "@mantine/core";
import { Backpack, BookOpen, Dices } from "lucide-react";
import { useCallback, useState } from "react";
import type { NavigateToCharacterRoute } from "../../../domains/characters/ui/index.js";
import {
	type CharacterSection,
	characterRoutePath,
	shouldHandleCharacterLink,
} from "../../../domains/characters/ui/index.js";

const sections = [
	{
		id: "attributes",
		label: "Attributes & Rolls",
		compactLabel: "Rolls",
		accessibleLabel: "Attributes & Rolls",
		Icon: Dices,
	},
	{
		id: "spells",
		label: "Spells & Abilities",
		compactLabel: "Spells",
		accessibleLabel: "Spells & Abilities",
		Icon: BookOpen,
	},
	{
		id: "inventory",
		label: "Inventory",
		compactLabel: "Inventory",
		accessibleLabel: "Inventory",
		Icon: Backpack,
	},
] as const;

export function CharacterSectionNavigation({
	characterId,
	section,
	onNavigate,
}: {
	characterId: string;
	section: CharacterSection;
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
		<Box component="nav" className="character-section-navigation" aria-label="Character sections">
			<Box className="character-section-navigation-scroll" ref={setScrollNode}>
				<Group className="character-section-navigation-track" gap={0} wrap="nowrap">
					{sections.map(({ id, label, compactLabel, accessibleLabel, Icon }) => {
						const route = { screen: "detail", id: characterId, section: id } as const;
						return (
							<Anchor
								key={id}
								href={characterRoutePath(route)}
								aria-label={accessibleLabel}
								aria-current={section === id ? "page" : undefined}
								className="character-section-link"
								underline="never"
								onClick={(event) => {
									if (!shouldHandleCharacterLink(event)) return;
									event.preventDefault();
									onNavigate(route);
								}}
							>
								<Icon size={20} aria-hidden="true" />
								<span className="character-section-full-label">{label}</span>
								<span className="character-section-compact-label">{compactLabel}</span>
							</Anchor>
						);
					})}
				</Group>
			</Box>
			<Box
				aria-hidden="true"
				className={
					canScrollRight
						? "character-section-navigation-affordance"
						: "character-section-navigation-affordance is-hidden"
				}
			/>
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
