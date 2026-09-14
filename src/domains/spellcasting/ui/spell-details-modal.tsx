import { Alert, Button, Modal, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { apiQueries } from "../../../generated/api-client.generated.js";
import { SpellDetailsContent } from "./spell-details-content.js";

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
				<SpellDetailsContent details={details} />
			) : null}
		</Modal>
	);
}
