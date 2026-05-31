import "@mantine/core/styles.css";
import "./theme.css";

import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { CurrentUserProvider } from "./current-user-provider.js";
import { AppQueryProvider } from "./query-provider.js";
import { theme } from "./theme.js";

export function AppProviders({ children }: { children: ReactNode }) {
	return (
		<MantineProvider defaultColorScheme="dark" theme={theme}>
			<AppQueryProvider>
				<CurrentUserProvider>{children}</CurrentUserProvider>
			</AppQueryProvider>
		</MantineProvider>
	);
}
