import { Alert, Button, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import type {
	AddCharacterTreasuryPreviewResponse,
	SpendCharacterTreasuryPreviewResponse,
} from "../../../generated/api-client.generated.js";
import {
	formatTreasuryAmount,
	formatTreasuryBalance,
	formatTreasuryGpValue,
	TREASURY_DENOMINATIONS,
	type TreasuryBalance,
} from "./treasury-format.js";

type TreasuryPreview =
	| AddCharacterTreasuryPreviewResponse["preview"]
	| SpendCharacterTreasuryPreviewResponse["preview"];

export function TreasuryPreview({
	preview,
	returnedChange,
	onConfirm,
	confirmDisabled = false,
	confirmLabel,
}: {
	preview: TreasuryPreview;
	returnedChange?: TreasuryBalance;
	onConfirm?: () => void;
	confirmDisabled?: boolean;
	confirmLabel?: string;
}) {
	return (
		<Stack gap="sm">
			<Text fw={700}>Server-backed result preview</Text>
			<SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
				<BalanceSnapshot label="Previous balances" balance={preview.previous} />
				<BalanceSnapshot label="Next balances" balance={preview.next} />
			</SimpleGrid>
			<Paper withBorder p="sm" radius="sm">
				<Group align="baseline" gap="xs">
					<Text c="dimmed" size="sm">
						Next total GP value
					</Text>
					<Text fw={700}>{formatTreasuryGpValue(preview.totalValue.gp)} GP</Text>
				</Group>
			</Paper>

			{returnedChange && (
				<Paper withBorder p="sm" radius="sm">
					<Text c="candle" fw={700} size="sm">
						Returned change
					</Text>
					<Text>{formatTreasuryBalance(returnedChange)}</Text>
				</Paper>
			)}

			{!preview.canApply && (
				<Alert color="red" title="Insufficient funds" variant="light">
					{preview.error?.message ?? "The treasury cannot cover this spend."}
				</Alert>
			)}

			{onConfirm && (
				<Group justify="flex-end">
					<Button disabled={confirmDisabled || !preview.canApply} onClick={onConfirm} type="button">
						{confirmLabel}
					</Button>
				</Group>
			)}
		</Stack>
	);
}

function BalanceSnapshot({ label, balance }: { label: string; balance: TreasuryBalance }) {
	return (
		<Paper withBorder p="sm" radius="sm">
			<Stack gap={4}>
				<Text fw={700} size="sm">
					{label}
				</Text>
				{TREASURY_DENOMINATIONS.map(({ key, abbreviation }) => (
					<Group key={key} justify="space-between" gap="xs">
						<Text c="dimmed" size="sm">
							{abbreviation}
						</Text>
						<Text size="sm">{formatTreasuryAmount(balance[key])}</Text>
					</Group>
				))}
			</Stack>
		</Paper>
	);
}
