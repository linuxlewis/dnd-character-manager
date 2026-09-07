import { ActionIcon, Anchor, Menu, Modal, Stack, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
	apiMutations,
	apiQueries,
	type CurrentUserResponse,
} from "../generated/api-client.generated.js";
import { MagicLinkLoginForm } from "./magic-link-login.js";

export function ApplicationMenu({
	currentUser,
	children,
}: {
	currentUser?: CurrentUserResponse["user"] | null;
	children?: ReactNode;
}) {
	const [dialog, setDialog] = useState<"about" | "login" | null>(null);
	const queryClient = useQueryClient();
	const signOutMutation = useMutation({
		...apiMutations.signOutCurrentUser(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["api"] });
			await queryClient.ensureQueryData(apiQueries.getCurrentUser());
		},
	});
	return (
		<>
			<Menu shadow="md" width={240}>
				<Menu.Target>
					<ActionIcon size={44} variant="subtle" color="gray" aria-label="Open application menu">
						<MoreVertical size={22} />
					</ActionIcon>
				</Menu.Target>
				<Menu.Dropdown>
					{children}
					{currentUser && !currentUser.isAnonymous ? (
						<>
							<Menu.Label>{currentUser.name || "Account"}</Menu.Label>
							<Menu.Item
								disabled={signOutMutation.isPending}
								onClick={() => signOutMutation.mutate()}
							>
								Sign out
							</Menu.Item>
						</>
					) : (
						<Menu.Item mih={44} onClick={() => setDialog("login")}>
							Sign in
						</Menu.Item>
					)}
					<Menu.Divider />
					<Menu.Item mih={44} onClick={() => setDialog("about")}>
						About
					</Menu.Item>
					<Menu.Item mih={44} component="a" href="/privacy">
						Privacy Policy
					</Menu.Item>
				</Menu.Dropdown>
			</Menu>
			<Modal
				opened={dialog !== null}
				onClose={() => setDialog(null)}
				title={dialog === "login" ? "Sign in" : "About"}
				centered
			>
				{dialog === "login" ? (
					<MagicLinkLoginForm />
				) : (
					<Stack>
						<Text fw={700}>D&amp;D Character Manager</Text>
						<Text>A free community character management tool.</Text>
						<Text size="sm">
							D&amp;D and related marks belong to their respective owners. This unofficial service
							is not affiliated with or endorsed by the game's publisher.
						</Text>
						<Anchor href="/privacy">Privacy Policy</Anchor>
					</Stack>
				)}
			</Modal>
		</>
	);
}
