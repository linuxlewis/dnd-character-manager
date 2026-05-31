import { describe, expect, it, vi } from "vitest";
import { forwardSetCookieHeaders, getSetCookieHeaders, toCurrentUserResponse } from "./session.js";

describe("toCurrentUserResponse", () => {
	it("keeps only the public current-user fields", () => {
		expect(
			toCurrentUserResponse({
				id: "00000000-0000-4000-8000-000000000000",
				isAnonymous: true,
				name: "Anonymous",
			}),
		).toEqual({
			user: {
				id: "00000000-0000-4000-8000-000000000000",
				isAnonymous: true,
				name: "Anonymous",
			},
		});
	});
});

describe("getSetCookieHeaders", () => {
	it("reads multiple Set-Cookie headers when available", () => {
		const headers = new Headers() as Headers & { getSetCookie: () => string[] };
		headers.getSetCookie = () => ["a=1", "b=2"];

		expect(getSetCookieHeaders(headers)).toEqual(["a=1", "b=2"]);
	});

	it("falls back to a single Set-Cookie header", () => {
		const headers = new Headers({ "set-cookie": "a=1" });

		expect(getSetCookieHeaders(headers)).toEqual(["a=1"]);
	});
});

describe("forwardSetCookieHeaders", () => {
	it("forwards Better Auth cookies to Fastify", () => {
		const header = vi.fn();
		const reply = { header } as never;
		const headers = new Headers({ "set-cookie": "a=1" });

		forwardSetCookieHeaders(headers, reply);

		expect(header).toHaveBeenCalledWith("set-cookie", ["a=1"]);
	});
});
