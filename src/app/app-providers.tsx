import "@mantine/core/styles.css";
import "./theme.css";

import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { AppQueryProvider } from "./query-provider.js";
import { theme } from "./theme.js";

export function AppProviders({ children }: { children: ReactNode }) {
	return (
		<MantineProvider defaultColorScheme="dark" theme={theme}>
			<AppQueryProvider>{children}</AppQueryProvider>
		</MantineProvider>
	);
}
