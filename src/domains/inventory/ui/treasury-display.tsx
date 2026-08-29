import { Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import {
	formatTreasuryAmount,
	formatTreasuryGpValue,
	TREASURY_DENOMINATIONS,
} from "./treasury-format.js";
import type { TreasuryData } from "./treasury-types.js";

export interface TreasuryDisplayProps {
	scopeLabel: string;
	treasury: TreasuryData;
	onAddFunds: () => void;
	onSpendFunds: () => void;
}

export function TreasuryDisplay({
	scopeLabel,
	treasury,
	onAddFunds,
	onSpendFunds,
}: TreasuryDisplayProps) {
	return (
		<Stack gap="md">
			<Group align="flex-start" justify="space-between" gap="sm" wrap="wrap">
				<Stack gap={2}>
					<Group gap="xs">
						<Title order={3} size="h5">
							Treasury
						</Title>
						<Badge color="candle" variant="light">
							{scopeLabel}
						</Badge>
					</Group>
					<Text c="dimmed" size="sm">
						Spend only after checking the server-backed result preview.
					</Text>
				</Stack>
				<Group gap="xs" wrap="wrap">
					<Button onClick={onAddFunds} size="sm" variant="light">
						Add funds
					</Button>
					<Button onClick={onSpendFunds} size="sm" variant="default">
						Spend
					</Button>
				</Group>
			</Group>

			<SimpleGrid cols={{ base: 2, xs: 4 }} spacing="sm">
				{TREASURY_DENOMINATIONS.map(({ key, abbreviation, label, color }) => (
					<Card
						data-testid={`treasury-${key}-balance`}
						key={key}
						withBorder
						padding="sm"
						radius="sm"
					>
						<Stack gap={4}>
							<Text c={color} fw={700} size="sm">
								{abbreviation}
							</Text>
							<Text fz="xl" fw={700} lh={1.1}>
								{formatTreasuryAmount(treasury.balances[key])}
							</Text>
							<Text c="dimmed" size="xs">
								{label}
							</Text>
						</Stack>
					</Card>
				))}
			</SimpleGrid>

			<Card data-testid="treasury-total" withBorder padding="sm" radius="sm">
				<Group align="baseline" gap="xs">
					<Text c="dimmed" size="sm">
						Total GP value
					</Text>
					<Text fw={700} size="lg">
						{formatTreasuryGpValue(treasury.totalValue.gp)} GP
					</Text>
				</Group>
			</Card>
		</Stack>
	);
}
