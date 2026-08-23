import { Anchor, List, Paper, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

export function PrivacyPolicy() {
	return (
		<Stack gap="xl">
			<Stack gap="xs">
				<Anchor href="/" size="sm" c="dimmed">
					Back to D&amp;D Character Manager
				</Anchor>
				<Title order={2}>Privacy Policy</Title>
				<Text c="dimmed">Last updated: August 23, 2026</Text>
			</Stack>

			<Paper withBorder p={{ base: "md", sm: "xl" }}>
				<Stack gap="xl">
					<PolicySection title="Overview">
						<Text>
							D&amp;D Character Manager ("the Service") is offered as a free tool for creating and
							managing tabletop role-playing characters. This policy explains what information the
							Service collects, why it is used, and the choices available to you.
						</Text>
					</PolicySection>

					<PolicySection title="Information we collect">
						<List spacing="sm">
							<List.Item>
								<Text span fw={600}>
									Account and authentication information.
								</Text>{" "}
								The Service uses an essential browser session to keep your workspace separate from
								other users. If you request an email magic link, we also collect your email address
								and authentication records needed to send the link and secure your account.
							</List.Item>
							<List.Item>
								<Text span fw={600}>
									Content you provide.
								</Text>{" "}
								This includes character details and other information you choose to save in the
								Service.
							</List.Item>
							<List.Item>
								<Text span fw={600}>
									Technical and usage information.
								</Text>{" "}
								Servers may record information such as your IP address, browser type, request time,
								pages or API routes used, and error details for security and reliability.
							</List.Item>
							<List.Item>
								<Text span fw={600}>
									Cookies and browser storage.
								</Text>{" "}
								The Service uses cookies or similar storage that are necessary for sessions,
								authentication, preferences, and app functionality. It does not use them for
								targeted advertising.
							</List.Item>
						</List>
					</PolicySection>

					<PolicySection title="How we use information">
						<List spacing="xs">
							<List.Item>Provide, maintain, and improve the Service.</List.Item>
							<List.Item>Save and display your character information.</List.Item>
							<List.Item>
								Create and protect sessions, verify sign-in requests, and send requested magic-link
								emails.
							</List.Item>
							<List.Item>Detect abuse, investigate errors, and keep the Service secure.</List.Item>
							<List.Item>Comply with legal obligations and enforce applicable terms.</List.Item>
						</List>
						<Text mt="sm">
							Magic-link and account emails are transactional. We do not use your email address for
							marketing unless you separately and clearly consent to it.
						</Text>
					</PolicySection>

					<PolicySection title="How we share information">
						<Text>
							We do not sell or rent your personal information. We may share only the information
							needed with trusted service providers that support hosting, databases, security, and
							email delivery. We may also disclose information when required by law, to protect the
							Service or its users, or as part of a transfer of the Service. Providers may use the
							information only to perform services on our behalf.
						</Text>
					</PolicySection>

					<PolicySection title="Data retention and your choices">
						<Text>
							We keep information only for as long as reasonably necessary to operate and secure the
							Service, meet legal obligations, and resolve disputes. You may stop using the Service
							and clear its cookies through your browser. Account and data-management controls will
							be described here when email account features become available. Some information may
							remain temporarily in backups or when retention is legally required.
						</Text>
					</PolicySection>

					<PolicySection title="Security">
						<Text>
							We use reasonable administrative and technical safeguards designed to protect your
							information. No online service or storage method can guarantee absolute security, so
							please avoid storing sensitive personal information in character fields.
						</Text>
					</PolicySection>

					<PolicySection title="Children's privacy">
						<Text>
							The Service is not directed to children under 13, and we do not knowingly collect
							personal information from children under 13. If we learn that a child has provided
							personal information, we will review and delete it as appropriate.
						</Text>
					</PolicySection>

					<PolicySection title="Changes to this policy">
						<Text>
							We may update this policy as the Service changes. The revised policy will be posted on
							this page with a new last-updated date. Continued use of the Service after an update
							means the revised policy applies.
						</Text>
					</PolicySection>
				</Stack>
			</Paper>
		</Stack>
	);
}

function PolicySection({ children, title }: { children: ReactNode; title: string }) {
	return (
		<Stack component="section" gap="xs">
			<Title order={3} size="h4">
				{title}
			</Title>
			{children}
		</Stack>
	);
}
