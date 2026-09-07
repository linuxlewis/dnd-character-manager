import { afterEach, describe, expect, it, vi } from "vitest";
import { restoreSectionScroll } from "./section-scroll.js";

afterEach(() => vi.unstubAllGlobals());
describe("restoreSectionScroll", () => {
	it("waits for async content growth and releases observation on unmount", () => {
		let resize = () => {};
		let maxScroll = 0;
		const disconnect = vi.fn();
		vi.stubGlobal(
			"ResizeObserver",
			class {
				constructor(callback: () => void) {
					resize = callback;
				}
				observe() {}
				disconnect = disconnect;
			},
		);
		const browser = {
			scrollY: 0,
			scrollTo: vi.fn(({ top }: { top: number }) => {
				browser.scrollY = Math.min(top, maxScroll);
			}),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		};
		vi.stubGlobal("window", browser);
		const cleanup = restoreSectionScroll({} as HTMLElement, 500, vi.fn());
		expect(browser.scrollY).toBe(0);
		maxScroll = 900;
		resize();
		expect(browser.scrollY).toBe(500);
		cleanup();
		expect(disconnect).toHaveBeenCalledOnce();
		expect(browser.removeEventListener).toHaveBeenCalledTimes(5);
	});
	it("records the clamped position when a player interacts with shorter content", () => {
		const listeners = new Map<string, () => void>();
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe() {}
				disconnect() {}
			},
		);
		const browser = {
			scrollY: 20,
			scrollTo: vi.fn(),
			addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
			removeEventListener: vi.fn(),
		};
		vi.stubGlobal("window", browser);
		const save = vi.fn();
		const cleanup = restoreSectionScroll({} as HTMLElement, 900, save);
		listeners.get("pointerdown")?.();
		expect(save).toHaveBeenLastCalledWith(20);
		browser.scrollY = 40;
		listeners.get("scroll")?.();
		expect(save).toHaveBeenLastCalledWith(40);
		cleanup();
	});
});
