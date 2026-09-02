import { Alert, Button } from "@mantine/core";

export function InventoryCountsAlert({ onRetry }: { onRetry: () => void }) {
	return (
		<Alert
			color="yellow"
			data-testid="inventory-counts-error"
			title="Inventory counts unavailable"
			variant="light"
		>
			Item cards remain available, but the total and type counts could not be loaded.
			<Button
				aria-label="Retry inventory counts"
				mt="sm"
				onClick={onRetry}
				size="sm"
				variant="light"
			>
				Retry counts
			</Button>
		</Alert>
	);
}
