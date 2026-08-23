import { Anchor, Box, Container, Divider, Group, Stack, Text } from "@mantine/core";

export function SiteFooter() {
	return (
		<Box component="footer" className="site-footer">
			<Container size="md">
				<Divider mb="md" />
				<Group justify="space-between" align="flex-start" gap="sm" wrap="wrap">
					<Stack gap={2}>
						<Text size="sm" fw={600}>
							D&amp;D Character Manager
						</Text>
						<Text size="xs" c="dimmed">
							A free community character management tool.
						</Text>
					</Stack>
					<Anchor href="/privacy" size="sm">
						Privacy Policy
					</Anchor>
				</Group>
				<Text size="xs" c="dimmed" mt="md">
					D&amp;D and related marks belong to their respective owners. This unofficial service is
					not affiliated with or endorsed by the game's publisher.
				</Text>
			</Container>
		</Box>
	);
}
