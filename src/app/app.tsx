/**
 * Root application component.
 *
 * Root layout shell. Domain UI modules are composed here as they are added.
 */

import {
	Alert,
	Anchor,
	Avatar,
	Box,
	Button,
	Container,
	Divider,
	Group,
	Menu,
	Modal,
	Paper,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { CharacterWorkspace, parseCharacterRoute } from "../domains/characters/ui/index.js";
import {
	apiMutations,
	apiQueries,
	type CurrentUserResponse,
} from "../generated/api-client.generated.js";
import { useBrowserPathname } from "../providers/navigation/index.js";
import { parseAppRoute } from "./app-route.js";
import { ApplicationMenu } from "./application-menu.js";
import { CurrentUserProvider, useCurrentUser } from "./current-user-provider.js";
import { MagicLinkLoginForm } from "./magic-link-login.js";
import { PrivacyPolicy } from "./privacy-policy.js";
import { SiteFooter } from "./site-footer.js";

interface AppProps {
	pathname?: string;
}

export function App({ pathname }: AppProps) {
	const browserPathname = useBrowserPathname();
	const currentPathname = pathname ?? browserPathname;
	const route = parseAppRoute(currentPathname);

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
			<CharacterApplication pathname={currentPathname} />
		</CurrentUserProvider>
	);
}

function CharacterApplication({ pathname }: { pathname: string }) {
	const characterDetail = parseCharacterRoute(pathname).screen === "detail";
	const { currentUser, error, isLoading } = useCurrentUser();

	return (
		<AppLayout characterDetail={characterDetail}>
			{!characterDetail && (
				<>
					<SiteHeader currentUser={currentUser} isLoading={isLoading} />
					<Divider />
				</>
			)}
			{characterDetail && !currentUser && (
				<Group justify="space-between">
					<Anchor href="/characters">Back to characters</Anchor>
					<ApplicationMenu currentUser={currentUser} />
				</Group>
			)}
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
					<CharacterWorkspace
						pathname={pathname}
						renderApplicationMenu={() => <ApplicationMenu currentUser={currentUser} />}
					/>
				</Stack>
			)}
		</AppLayout>
	);
}

function AppLayout({
	children,
	characterDetail = false,
}: {
	children: ReactNode;
	characterDetail?: boolean;
}) {
	return (
		<Box className={characterDetail ? "app-shell app-shell-character" : "app-shell"}>
			<Container
				component="main"
				className="app-main"
				size="md"
				pt={characterDetail ? "xs" : { base: "xl", sm: "calc(var(--mantine-spacing-xl) * 2)" }}
				pb={
					characterDetail
						? { base: "calc(80px + env(safe-area-inset-bottom, 0px))", sm: "xs" }
						: { base: "xl", sm: "calc(var(--mantine-spacing-xl) * 2)" }
				}
			>
				<Stack gap="xl">{children}</Stack>
			</Container>
			{!characterDetail && <SiteFooter />}
		</Box>
	);
}

function SiteHeader({
	currentUser,
	isLoading,
}: {
	currentUser?: CurrentUserResponse["user"] | null;
	isLoading?: boolean;
}) {
	const [loginOpen, setLoginOpen] = useState(false);

	return (
		<Stack gap="xs">
			<Group justify="space-between" gap="sm" align="center" wrap="nowrap">
				<Anchor href="/" c="inherit" underline="never">
					<Title order={1} size="h2">
						D&amp;D Character Manager
					</Title>
				</Anchor>
				{isLoading ? (
					<Avatar color="gray" size="md" variant="light">
						...
					</Avatar>
				) : currentUser && !currentUser.isAnonymous ? (
					<AccountMenu currentUser={currentUser} />
				) : currentUser ? (
					<Button onClick={() => setLoginOpen(true)} size="sm" variant="light">
						Sign in
					</Button>
				) : null}
			</Group>
			<Text c="dimmed" maw={640}>
				A free workspace for your tabletop characters.
			</Text>
			<Modal opened={loginOpen} onClose={() => setLoginOpen(false)} title="Sign in" centered>
				<MagicLinkLoginForm />
			</Modal>
		</Stack>
	);
}

function AccountMenu({ currentUser }: { currentUser: CurrentUserResponse["user"] }) {
	const queryClient = useQueryClient();
	const signOutMutation = useMutation({
		...apiMutations.signOutCurrentUser(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["api"] });
			await queryClient.ensureQueryData(apiQueries.getCurrentUser());
		},
	});
	const avatarLabel = currentUser.name || "Account";
	const initial = avatarLabel.trim().charAt(0).toUpperCase() || "A";

	return (
		<Menu closeOnItemClick shadow="md" width={220}>
			<Menu.Target>
				<Button aria-label="Open account menu" color="gray" p={0} size="md" variant="subtle">
					<Avatar color="bloodstone" radius="xl" size="md" variant="light">
						{initial}
					</Avatar>
				</Button>
			</Menu.Target>
			<Menu.Dropdown>
				<Menu.Label>{currentUser.name}</Menu.Label>
				<Menu.Divider />
				<Menu.Item
					color="red"
					disabled={signOutMutation.isPending}
					onClick={() => signOutMutation.mutate()}
				>
					Sign out
				</Menu.Item>
			</Menu.Dropdown>
		</Menu>
	);
}
