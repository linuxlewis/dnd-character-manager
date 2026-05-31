import { describe, expect, it } from "vitest";
import { accountTable, authTables, sessionTable, userTable, verificationTable } from "./schema.js";

describe("authTables", () => {
	it("maps Better Auth model names to Drizzle table objects", () => {
		expect(authTables).toEqual({
			user: userTable,
			session: sessionTable,
			account: accountTable,
			verification: verificationTable,
		});
	});
});
