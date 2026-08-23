/**
 * Root application component.
 *
 * Root layout shell. Domain UI modules are composed here as they are added.
 */

import {
	Alert,
	Anchor,
	Badge,
	Box,
	Container,
	Divider,
	Group,
	Paper,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import type { ReactNode } from "react";
import { CharacterWorkspace } from "../domains/characters/ui/index.js";
import { parseAppRoute } from "./app-route.js";
import { CurrentUserProvider, useCurrentUser } from "./current-user-provider.js";
import { PrivacyPolicy } from "./privacy-policy.js";
import { SiteFooter } from "./site-footer.js";

interface AppProps {
	pathname?: string;
}

export function App({ pathname = getCurrentPathname() }: AppProps) {
	const route = parseAppRoute(pathname);

	if (route.screen === "privacy") {
		return (
			<AppLayout>
				<SiteHeader />
				<Divider />
				<PrivacyPolicy />
			</AppLayout>
		);
	}

	return (
		<CurrentUserProvider>
			<CharacterApplication />
		</CurrentUserProvider>
	);
}

function CharacterApplication() {
	const { currentUser, error, isLoading } = useCurrentUser();
	const sessionLabel = isLoading
		? "Session..."
		: currentUser?.isAnonymous
			? "Anonymous session"
			: "Signed in";

	return (
		<AppLayout>
			<SiteHeader
				session={{
					color: currentUser ? "green" : "gray",
					label: sessionLabel,
				}}
			/>
			<Divider />
			{error ? (
				<Alert color="red" title="Session unavailable" variant="light">
					Refresh the page to try again.
				</Alert>
			) : isLoading || !currentUser ? (
				<Paper withBorder p="lg">
					<Text c="dimmed">Starting session...</Text>
				</Paper>
			) : (
				<Stack gap="md">
					<CharacterWorkspace />
					<Text c="dimmed" size="xs">
						Session user {currentUser.id}
					</Text>
				</Stack>
			)}
		</AppLayout>
	);
}

function AppLayout({ children }: { children: ReactNode }) {
	return (
		<Box className="app-shell">
			<Container
				component="main"
				className="app-main"
				size="md"
				py={{ base: "xl", sm: "calc(var(--mantine-spacing-xl) * 2)" }}
			>
				<Stack gap="xl">{children}</Stack>
			</Container>
			<SiteFooter />
		</Box>
	);
}

function SiteHeader({ session }: { session?: { color: "gray" | "green"; label: string } }) {
	return (
		<Stack gap="xs">
			<Group gap="sm" align="center">
				<Anchor href="/" c="inherit" underline="never">
					<Title order={1} size="h2">
						D&amp;D Character Manager
					</Title>
				</Anchor>
				<Badge color="candle" variant="light">
					D&amp;D 5e
				</Badge>
				{session ? (
					<Badge color={session.color} variant="light">
						{session.label}
					</Badge>
				) : null}
			</Group>
			<Text c="dimmed" maw={640}>
				A free workspace for your tabletop characters.
			</Text>
		</Stack>
	);
}

function getCurrentPathname() {
	if (typeof window === "undefined") return "/";
	return window.location.pathname;
}
