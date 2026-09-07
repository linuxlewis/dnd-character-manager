import { ActionIcon, Anchor, Menu, Modal, Stack, Text } from "@mantine/core";
import { useMergedRef } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";
import { type ReactNode, type Ref, useRef, useState } from "react";
import {
	apiMutations,
	apiQueries,
	type CurrentUserResponse,
} from "../generated/api-client.generated.js";
import { MagicLinkLoginForm } from "./magic-link-login.js";

export function ApplicationMenu({
	currentUser,
	children,
	triggerRef,
}: {
	currentUser?: CurrentUserResponse["user"] | null;
	children?: ReactNode;
	triggerRef?: Ref<HTMLButtonElement>;
}) {
	const localTriggerRef = useRef<HTMLButtonElement>(null);
	const mergedTriggerRef = useMergedRef(localTriggerRef, triggerRef);
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
					<ActionIcon
						ref={mergedTriggerRef}
						size={44}
						variant="subtle"
						color="gray"
						aria-label="Open application menu"
					>
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
				classNames={{ body: "workspace-inputs" }}
				closeButtonProps={{
					size: 44,
					"aria-label": dialog === "login" ? "Close sign in dialog" : "Close about dialog",
				}}
				opened={dialog !== null}
				onClose={() => {
					setDialog(null);
					localTriggerRef.current?.focus({ preventScroll: true });
				}}
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
