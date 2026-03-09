import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "../../ThemeProvider.tsx";

export function Toaster() {
	const { theme } = useTheme();
	return (
		<SonnerToaster
			theme={theme}
			position="bottom-right"
			toastOptions={{
				classNames: {
					toast: "group border-border bg-card text-card-foreground shadow-lg rounded-xl font-sans",
					title: "font-heading text-sm font-semibold",
					description: "text-sm text-muted-foreground",
					actionButton: "bg-primary text-primary-foreground",
					cancelButton: "bg-muted text-muted-foreground",
					success: "border-success/30 text-success",
					error: "border-destructive/30 text-destructive",
				},
			}}
		/>
	);
}
