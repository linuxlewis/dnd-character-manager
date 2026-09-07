import { afterEach, describe, expect, it, vi } from "vitest";
import { navigateBrowserPath } from "./browser-navigation.js";

afterEach(() => vi.unstubAllGlobals());
describe("navigateBrowserPath", () => {
	it("pushes a browser entry and notifies subscribers without reloading", () => {
		const pushState = vi.fn();
		const dispatchEvent = vi.fn();
		vi.stubGlobal("window", {
			location: { pathname: "/characters" },
			history: { pushState },
			dispatchEvent,
		});
		navigateBrowserPath("/characters/mira/inventory");
		expect(pushState).toHaveBeenCalledWith(null, "", "/characters/mira/inventory");
		expect(dispatchEvent).toHaveBeenCalledOnce();
	});
	it("does not duplicate an already active location", () => {
		const pushState = vi.fn();
		vi.stubGlobal("window", { location: { pathname: "/characters" }, history: { pushState } });
		navigateBrowserPath("/characters");
		expect(pushState).not.toHaveBeenCalled();
	});
});
