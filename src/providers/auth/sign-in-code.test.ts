import { APIError } from "better-auth/api";
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const signInEmailOTP = vi.fn();

vi.mock("./auth.js", () => ({
	getAuth: () => ({ api: { signInEmailOTP } }),
}));

const { invalidSignInCodeMessage, verifySignInCode } = await import("./sign-in-code.js");

afterEach(() => {
	signInEmailOTP.mockReset();
});

describe("verifySignInCode", () => {
	it("signs in through Better Auth's email OTP endpoint and forwards the session cookie", async () => {
		signInEmailOTP.mockResolvedValue({
			headers: new Headers({ "set-cookie": "better-auth.session_token=abc; Path=/; HttpOnly" }),
			response: { token: "abc", user: { id: "user-id" } },
		});

		const response = await inject({ email: " Player@Example.COM ", code: "482913" });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ signedIn: true });
		expect(response.headers["set-cookie"]).toEqual([
			"better-auth.session_token=abc; Path=/; HttpOnly",
		]);
		expect(signInEmailOTP).toHaveBeenCalledWith(
			expect.objectContaining({
				body: { email: "player@example.com", otp: "482913", name: "player@example.com" },
				returnHeaders: true,
			}),
		);
	});

	it("maps Better Auth OTP failures to one generic 401", async () => {
		signInEmailOTP.mockRejectedValue(new APIError("FORBIDDEN", { message: "Too many attempts" }));

		const response = await inject({ email: "player@example.com", code: "482913" });

		expect(response.statusCode).toBe(401);
		expect(response.json()).toEqual({ error: invalidSignInCodeMessage });
	});

	it("rejects malformed bodies before calling Better Auth", async () => {
		const response = await inject({ email: "player@example.com", code: "48291" });

		expect(response.statusCode).toBe(400);
		expect(signInEmailOTP).not.toHaveBeenCalled();
	});
});

async function inject(payload: unknown) {
	const app = Fastify();
	app.post("/verify", (request, reply) => verifySignInCode(request, reply));
	try {
		return await app.inject({ method: "POST", url: "/verify", payload: payload as object });
	} finally {
		await app.close();
	}
}
