import { Alert, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import {
	formatTreasuryAmount,
	formatTreasuryBalance,
	formatTreasuryGpValue,
	TREASURY_DENOMINATIONS,
} from "./treasury-format.js";
import type { TreasuryBalance, TreasuryPreview as TreasuryPreviewData } from "./treasury-types.js";

export function TreasuryPreview({
	preview,
	returnedChange,
	errorMessage,
}: {
	preview?: TreasuryPreviewData;
	returnedChange?: TreasuryBalance;
	errorMessage?: string;
}) {
	return (
		<Stack gap="sm">
			<Text fw={700}>Preview</Text>
			{preview ? (
				<>
					<SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
						<BalanceSnapshot label="Current balances" balance={preview.previous} />
						<BalanceSnapshot label="After change" balance={preview.next} />
					</SimpleGrid>
					<Paper withBorder p="sm" radius="sm">
						<Stack gap="xs">
							<Text fw={700} size="sm">
								Net change
							</Text>
							<SimpleGrid cols={{ base: 2, xs: 4 }} spacing="xs">
								{TREASURY_DENOMINATIONS.map(({ key, abbreviation }) => (
									<Group key={key} justify="space-between" gap="xs">
										<Text c="dimmed" size="sm">
											{abbreviation}
										</Text>
										<Text c={getTreasuryDeltaColor(preview.delta[key])} size="sm">
											{formatSignedAmount(preview.delta[key])}
										</Text>
									</Group>
								))}
							</SimpleGrid>
						</Stack>
					</Paper>
					<Paper withBorder p="sm" radius="sm">
						<Group align="baseline" gap="xs">
							<Text c="dimmed" size="sm">
								Total GP value
							</Text>
							<Text fw={700}>
								{formatTreasuryGpValue(getBalanceGpValue(preview.previous))} GP
								{" -> "}
								{formatTreasuryGpValue(preview.totalValue.gp)} GP
							</Text>
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

					{!preview.canApply && preview.error && (
						<Alert
							color="red"
							title={
								preview.operation === "spend" ? "Insufficient funds" : "Unable to apply change"
							}
							variant="light"
						>
							{preview.error.message}
						</Alert>
					)}
				</>
			) : (
				<Alert color="orange" title="Preview unavailable" variant="light">
					{errorMessage ?? "Enter a valid positive amount to calculate the change."}
				</Alert>
			)}
		</Stack>
	);
}

function formatSignedAmount(amount: number) {
	return `${amount > 0 ? "+" : ""}${formatTreasuryAmount(amount)}`;
}

function getTreasuryDeltaColor(amount: number) {
	return amount > 0 ? "teal" : amount < 0 ? "red" : "dimmed";
}

function getBalanceGpValue(balance: TreasuryBalance) {
	return (balance.cp + balance.sp * 10 + balance.gp * 100 + balance.pp * 1_000) / 100;
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
