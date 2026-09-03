import { Box, Stack, Text, Tooltip } from "@mantine/core";
import type { LucideIcon } from "lucide-react";
import { Coins, Package, Pencil, Trash2 } from "lucide-react";
import { formatFullTimestamp, formatHistoryEntry, formatRelativeTime } from "./activity-format.js";
import type { FormattedActivityEntry } from "./activity-format-shared.js";
import { getItemTypeIcon } from "./item-presentation.js";
import "./activity.css";

const TONE_COLORS = {
	negative: "bloodstone",
	neutral: "blue",
	positive: "teal",
	treasury: "candle",
} as const;

export function ActivityEntry({
	entry,
	compact = false,
}: {
	entry: Parameters<typeof formatHistoryEntry>[0];
	compact?: boolean;
}) {
	return (
		<FormattedActivityEntryView
			compact={compact}
			createdAt={entry.createdAt}
			entry={formatHistoryEntry(entry)}
		/>
	);
}

export function FormattedActivityEntryView({
	createdAt,
	entry,
	compact = false,
}: {
	createdAt: string;
	entry: FormattedActivityEntry;
	compact?: boolean;
}) {
	const Icon = getActivityIcon(entry);
	const iconColor = TONE_COLORS[entry.tone];
	const summaryColor =
		entry.tone === "treasury" ? TONE_COLORS[entry.valueTone ?? "neutral"] : undefined;

	return (
		<Box
			className="character-activity-entry"
			style={{
				display: "grid",
				gridTemplateColumns: "32px minmax(0, 1fr)",
				gap: "var(--mantine-spacing-sm)",
				position: "relative",
			}}
		>
			<Box
				aria-hidden="true"
				className="character-activity-seal"
				style={{
					alignItems: "center",
					backgroundColor: "var(--mantine-color-dark-7)",
					border: `1px solid var(--mantine-color-${iconColor}-6)`,
					display: "flex",
					height: 32,
					justifyContent: "center",
					position: "relative",
					width: 32,
					zIndex: 1,
				}}
			>
				<Icon color={`var(--mantine-color-${iconColor}-5)`} size={16} strokeWidth={2} />
			</Box>
			<Box style={{ minWidth: 0 }}>
				<Box className="character-activity-summary">
					<Text
						aria-label={entry.accessibleSummary}
						c={summaryColor}
						className={entry.tone === "treasury" ? "character-activity-number" : undefined}
						fw={600}
						lineClamp={compact ? 2 : undefined}
						size="sm"
					>
						{entry.summary}
					</Text>
					<ActivityTime createdAt={createdAt} />
				</Box>
				{entry.detail && (
					<Text
						aria-label={entry.accessibleDetail ?? entry.detail}
						className={`${
							compact ? "character-activity-detail" : "character-activity-drawer-detail"
						} character-activity-number`}
						c="dimmed"
						size="sm"
					>
						{entry.detail}
					</Text>
				)}
				{entry.note && (
					<Text
						className={compact ? "character-activity-note" : "character-activity-drawer-note"}
						c="dimmed"
						fs="italic"
						size="sm"
					>
						&ldquo;{entry.note}&rdquo;
					</Text>
				)}
			</Box>
		</Box>
	);
}

export function ActivityTime({ createdAt }: { createdAt: string }) {
	const fullTimestamp = formatFullTimestamp(createdAt);
	return (
		<Tooltip label={fullTimestamp} withArrow>
			<Text
				aria-label={`Recorded ${fullTimestamp}`}
				className="character-activity-time"
				c="dimmed"
				component="time"
				dateTime={createdAt}
				size="xs"
			>
				{formatRelativeTime(createdAt)}
			</Text>
		</Tooltip>
	);
}

export function ActivitySkeleton({ count = 1 }: { count?: number }) {
	const skeletonKeys = ["one", "two", "three", "four"];
	return (
		<Stack gap="lg">
			{skeletonKeys.slice(0, count).map((key) => (
				<Box
					aria-hidden="true"
					key={key}
					style={{
						display: "grid",
						gridTemplateColumns: "32px minmax(0, 1fr)",
						gap: "var(--mantine-spacing-sm)",
						width: "100%",
					}}
				>
					<Box h={32} bg="dark.6" style={{ borderRadius: "var(--mantine-radius-sm)" }} />
					<Box pt={2}>
						<Box
							h={12}
							bg="dark.6"
							mb={8}
							style={{ borderRadius: "var(--mantine-radius-sm)" }}
							w="72%"
						/>
						<Box h={10} bg="dark.7" style={{ borderRadius: "var(--mantine-radius-sm)" }} w="48%" />
					</Box>
				</Box>
			))}
		</Stack>
	);
}

function getActivityIcon(entry: FormattedActivityEntry): LucideIcon {
	if (entry.icon === "coins") return Coins;
	if (entry.icon === "pencil") return Pencil;
	if (entry.icon === "trash") return Trash2;
	return entry.itemType ? getItemTypeIcon(entry.itemType) : Package;
}
