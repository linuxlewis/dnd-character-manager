import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider.tsx";
import { Button } from "./components/ui/button.tsx";

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	return (
		<Button
			variant="outline"
			size="icon"
			onClick={toggleTheme}
			aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
		>
			{theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
		</Button>
	);
}
