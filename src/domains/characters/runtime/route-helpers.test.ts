import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CharacterNotFoundError, SpellSearchUnavailableError } from "../service/index.js";
import { parseBody, parseParams, parseSpellParams, sendSpellError } from "./route-helpers.js";

describe("route helpers", () => {
	it("parses character and spell route params", () => {
		const reply = fakeReply();

		expect(
			parseParams(fakeRequest({ characterId: "00000000-0000-4000-8000-000000000002" }), reply),
		).toEqual({ characterId: "00000000-0000-4000-8000-000000000002" });
		expect(
			parseSpellParams(
				fakeRequest({
					characterId: "00000000-0000-4000-8000-000000000002",
					spellId: "00000000-0000-4000-8000-000000000030",
				}),
				reply,
			),
		).toEqual({
			characterId: "00000000-0000-4000-8000-000000000002",
			spellId: "00000000-0000-4000-8000-000000000030",
		});
	});

	it("returns null and sends a bad request for invalid bodies", () => {
		const reply = fakeReply();

		expect(parseBody(z.object({ name: z.string() }), { name: 42 }, reply)).toBeNull();
		expect(reply.sent).toEqual({ error: "Invalid request body." });
		expect(reply.statusCode).toBe(400);
	});

	it("maps spell route errors to HTTP responses", () => {
		const notFoundReply = fakeReply();
		const unavailableReply = fakeReply();

		sendSpellError(new CharacterNotFoundError(), notFoundReply);
		sendSpellError(new SpellSearchUnavailableError(), unavailableReply);

		expect(notFoundReply.statusCode).toBe(404);
		expect(notFoundReply.sent).toEqual({ error: "Character not found." });
		expect(unavailableReply.statusCode).toBe(502);
		expect(unavailableReply.sent).toEqual({ error: "D&D spells could not be loaded." });
	});
});

function fakeRequest(params: unknown) {
	return { params } as FastifyRequest;
}

function fakeReply() {
	const reply = {
		sent: undefined as unknown,
		statusCode: 200,
		status(code: number) {
			this.statusCode = code;
			return this;
		},
		send(body: unknown) {
			this.sent = body;
			return this;
		},
	};
	return reply as FastifyReply & { sent: unknown; statusCode: number };
}
