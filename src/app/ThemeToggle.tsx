import { useTheme } from "./ThemeProvider.tsx";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	return (
		<button
			type="button"
			className={styles.toggleButton}
			onClick={toggleTheme}
			aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
		>
			{theme === "dark" ? "☀️" : "🌙"}
		</button>
	);
}
