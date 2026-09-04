import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export interface CatalogueTestFixture {
	open5eBaseUrl: string;
	legacyBaseUrl: string;
	close: () => Promise<void>;
}

export async function startCatalogueTestFixture(): Promise<CatalogueTestFixture> {
	const server = createServer((request, response) => {
		void handleRequest(request, response);
	});

	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});

	const address = server.address();
	if (!address || typeof address === "string") {
		await closeServer(server);
		throw new Error("Catalogue test fixture did not expose a TCP address.");
	}

	const origin = `http://127.0.0.1:${address.port}`;
	return {
		open5eBaseUrl: `${origin}/open5e/v2`,
		legacyBaseUrl: `${origin}/legacy`,
		close: () => closeServer(server),
	};
}

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
	if (request.method !== "GET") {
		sendJson(response, 405, { error: "Method not allowed" });
		return;
	}

	const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
	if (requestUrl.pathname === "/open5e/v2/spells/") {
		sendJson(response, 200, {
			results: open5eSearchResults(requestUrl.searchParams.get("name__icontains")),
		});
		return;
	}
	if (requestUrl.pathname === "/open5e/v2/spells/srd-2024_light/") {
		sendJson(response, 200, open5eLightDetails);
		return;
	}
	if (requestUrl.pathname === "/open5e/v2/spells/srd-2024_divine-smite/") {
		sendJson(response, 200, open5eDivineSmiteDetails);
		return;
	}
	if (requestUrl.pathname === "/legacy/api/2014/features") {
		const query = requestUrl.searchParams.get("name")?.toLowerCase() ?? "";
		sendJson(response, 200, {
			results: query.includes("lay on hands")
				? [{ index: "lay-on-hands", name: "Lay on Hands" }]
				: [],
		});
		return;
	}
	if (requestUrl.pathname === "/legacy/api/2014/features/lay-on-hands") {
		sendJson(response, 200, legacyLayOnHandsDetails);
		return;
	}

	sendJson(response, 404, { error: "Fixture route not found" });
}

function open5eSearchResults(query: string | null) {
	const normalized = query?.toLowerCase() ?? "";
	if (normalized.includes("light")) {
		return [{ key: "srd-2024_light", name: "Light", level: 0 }];
	}
	if (normalized.includes("divine smite")) {
		return [{ key: "srd-2024_divine-smite", name: "Divine Smite", level: 1 }];
	}
	return [];
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
	response.statusCode = statusCode;
	response.setHeader("content-type", "application/json");
	response.end(JSON.stringify(body));
}

async function closeServer(server: ReturnType<typeof createServer>) {
	if (!server.listening) return;
	await new Promise<void>((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
}

const open5eLightDetails = {
	key: "srd-2024_light",
	name: "Light",
	level: 0,
	desc: "You touch one object that is no larger than 10 feet in any dimension.",
	higher_level: [],
	casting_time: "Action",
	range_text: "Touch",
	duration: "1 hour",
	verbal: true,
	somatic: true,
	material: true,
	material_specified: "A firefly or phosphorescent moss",
	school: { name: "Evocation" },
	classes: [{ name: "Artificer" }, { name: "Bard" }],
};

const open5eDivineSmiteDetails = {
	key: "srd-2024_divine-smite",
	name: "Divine Smite",
	level: 1,
	desc: "The target takes radiant damage from the weapon strike.",
	higher_level: "The damage increases when you use a higher-level spell slot.",
	casting_time: "Bonus Action",
	range_text: "Self",
	duration: "Instantaneous",
	verbal: false,
	somatic: true,
	material: false,
	school: { name: "Evocation" },
	classes: [{ name: "Paladin" }],
};

const legacyLayOnHandsDetails = {
	index: "lay-on-hands",
	name: "Lay on Hands",
	level: 1,
	url: "/api/2014/features/lay-on-hands",
	desc: ["Your blessed touch can heal wounds."],
	class: { name: "Paladin" },
};
