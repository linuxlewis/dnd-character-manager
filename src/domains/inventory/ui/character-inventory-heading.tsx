import { Title } from "@mantine/core";

export function CharacterInventoryHeading({
	embedded,
	sectionHeadingRef,
}: {
	embedded: boolean;
	sectionHeadingRef?: (node: HTMLHeadingElement | null) => void;
}) {
	return (
		<Title
			id={embedded ? "character-section-inventory-heading" : undefined}
			order={3}
			ref={sectionHeadingRef}
			tabIndex={sectionHeadingRef ? -1 : undefined}
			size="h5"
		>
			Personal inventory
		</Title>
	);
}
