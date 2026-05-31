import { createTheme } from "@mantine/core";

export const theme = createTheme({
	primaryColor: "bloodstone",
	primaryShade: { light: 7, dark: 5 },
	defaultRadius: "sm",
	focusRing: "auto",
	cursorType: "pointer",
	colors: {
		bloodstone: [
			"#fff1f2",
			"#ffe4e6",
			"#fecdd3",
			"#fda4af",
			"#fb7185",
			"#f43f5e",
			"#e11d48",
			"#be123c",
			"#9f1239",
			"#881337",
		],
		candle: [
			"#fff8e1",
			"#ffefb5",
			"#ffe082",
			"#ffd54f",
			"#ffca28",
			"#ffc107",
			"#ffb300",
			"#ffa000",
			"#ff8f00",
			"#ff6f00",
		],
	},
	defaultGradient: {
		from: "bloodstone.6",
		to: "candle.5",
		deg: 135,
	},
	fontFamily:
		"Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
	headings: {
		fontFamily:
			"Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
		fontWeight: "700",
		textWrap: "balance",
	},
	components: {
		Button: {
			defaultProps: {
				radius: "sm",
			},
		},
		Paper: {
			defaultProps: {
				radius: "sm",
			},
		},
		TextInput: {
			defaultProps: {
				radius: "sm",
			},
		},
	},
	other: {
		accentColor: "candle",
	},
});
