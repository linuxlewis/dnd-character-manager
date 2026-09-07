import { Badge, Box, Button, Group, Stack, Text, Title } from "@mantine/core";
import type { MouseEventHandler } from "react";
import { formatTreasuryAmount, TREASURY_DENOMINATIONS } from "./treasury-format.js";
import "./inventory.css";
import type { TreasuryData } from "./treasury-types.js";

export interface TreasuryDisplayProps {
	scopeLabel?: string;
	treasury: TreasuryData;
	actionsDisabled?: boolean;
	onAddFunds: MouseEventHandler<HTMLButtonElement>;
	onSpendFunds: MouseEventHandler<HTMLButtonElement>;
}

export function TreasuryDisplay({
	scopeLabel,
	treasury,
	actionsDisabled = false,
	onAddFunds,
	onSpendFunds,
}: TreasuryDisplayProps) {
	return (
		<Stack className="inventory-treasury" data-testid="treasury-summary" gap={4}>
			<Group justify="space-between" gap={8} wrap="wrap">
				<Title order={3} size="h5">
					Treasury
				</Title>
				{scopeLabel && scopeLabel !== "Personal Treasury" && (
					<Badge color="candle" variant="light">
						{scopeLabel}
					</Badge>
				)}
				<Group gap={8} wrap="wrap">
					<Button
						disabled={actionsDisabled}
						onClick={onAddFunds}
						size="sm"
						mih={44}
						px={12}
						variant="light"
					>
						Add funds
					</Button>
					<Button
						disabled={actionsDisabled}
						onClick={onSpendFunds}
						size="sm"
						mih={44}
						px={12}
						variant="default"
					>
						Spend
					</Button>
				</Group>
			</Group>
			<Box className="inventory-currencies">
				{TREASURY_DENOMINATIONS.map(({ key, abbreviation, label, color }) => (
					<Box
						data-testid={`treasury-${key}-balance`}
						key={key}
						aria-label={`${label}: ${formatTreasuryAmount(treasury.balances[key])}`}
					>
						<Text c={color} fw={700} lh={1.2} size="xs">
							{abbreviation}
						</Text>
						<Text className="inventory-currency-amount" fw={700} lh={1.2} size="md">
							{formatTreasuryAmount(treasury.balances[key])}
						</Text>
					</Box>
				))}
			</Box>
		</Stack>
	);
}
