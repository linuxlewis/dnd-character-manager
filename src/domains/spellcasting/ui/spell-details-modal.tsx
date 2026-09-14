import { Alert, Button, Divider, Group, Modal, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { apiQueries } from "../../../generated/api-client.generated.js";
import { formatSpellLevel } from "./spell-slot-format.js";

export function SpellDetailsModal({
	characterId,
	spellId,
	onClose,
	withinPortal = true,
}: {
	characterId: string;
	spellId: string;
	onClose: () => void;
	withinPortal?: boolean;
}) {
	const mobile = useMediaQuery("(max-width: 47.999em)");
	const query = useQuery({
		...apiQueries.getCharacterSpellDetails({ characterId, spellId }),
		retry: false,
	});
	const details = query.data?.spell;

	return (
		<Modal
			classNames={{ body: "workspace-inputs" }}
			closeButtonProps={{ size: "xl", "aria-label": "Close spell dialog" }}
			fullScreen={mobile}
			size="lg"
			onClose={onClose}
			opened
			title={details?.name ?? "Spell details"}
			transitionProps={{ duration: 0 }}
			withinPortal={withinPortal}
		>
			{query.error ? (
				<Alert color="red" title="Spell details unavailable" variant="light">
					<Button
						mih={44}
						onClick={() => query.refetch()}
						loading={query.isFetching}
						variant="subtle"
					>
						Retry details
					</Button>
				</Alert>
			) : query.isFetching ? (
				<Text c="dimmed" size="sm">
					Loading details...
				</Text>
			) : details ? (
				<Stack gap="md">
					<Text c="dimmed" size="sm">
						{details.source === "feature" ? "Feature" : "Spell"} {formatSpellLevel(details.level)}
					</Text>

					{details.metadata.length > 0 && (
						<Stack gap="xs">
							{details.metadata.map((item) => (
								<Group key={item.label} justify="space-between" gap="xs" wrap="nowrap">
									<Text c="dimmed" size="sm">
										{item.label}
									</Text>
									<Text size="sm" ta="right">
										{item.value}
									</Text>
								</Group>
							))}
						</Stack>
					)}

					<Divider />

					<Stack gap="sm">
						{details.desc.map((paragraph) => (
							<Text key={paragraph} size="sm">
								{paragraph}
							</Text>
						))}
					</Stack>

					{details.higherLevel.length > 0 && (
						<Stack gap="xs">
							<Title order={4} size="sm">
								At Higher Levels
							</Title>
							{details.higherLevel.map((paragraph) => (
								<Text key={paragraph} size="sm">
									{paragraph}
								</Text>
							))}
						</Stack>
					)}
				</Stack>
			) : null}
		</Modal>
	);
}
