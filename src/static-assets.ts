import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import type { FastifyInstance } from "fastify";

const CONTENT_TYPES: Record<string, string> = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".ico": "image/x-icon",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml",
	".txt": "text/plain; charset=utf-8",
	".webmanifest": "application/manifest+json; charset=utf-8",
	".webp": "image/webp",
};

const REVALIDATED_CACHE_CONTROL = "no-cache, must-revalidate";
const IMMUTABLE_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

const REVALIDATED_ASSET_PATHS = new Set([
	"/",
	"/index.html",
	"/manifest.webmanifest",
	"/registerSW.js",
	"/sw.js",
]);

export function registerStaticAssetFallback(app: FastifyInstance, staticRoot: string) {
	const root = resolve(staticRoot);

	app.setNotFoundHandler(async (request, reply) => {
		if (request.url.startsWith("/api/")) {
			return reply.status(404).send({ error: "Not found" });
		}

		const pathname = getRequestPathname(request.url);
		const requested = getAssetPath(root, pathname);
		const isRequestedFile = requested ? await isFile(requested) : false;
		const filePath = requested && isRequestedFile ? requested : join(root, "index.html");

		if (!(await isFile(filePath))) {
			return reply.status(404).send({ error: "Not found" });
		}

		const response = reply.type(CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream");
		const cacheControl = getCacheControl(pathname, isRequestedFile);
		if (cacheControl) response.header("Cache-Control", cacheControl);

		return response.send(createReadStream(filePath));
	});
}

function getRequestPathname(url: string) {
	return new URL(url, "http://localhost").pathname;
}

function getAssetPath(root: string, pathname: string) {
	const decoded = decodeURIComponent(pathname);
	const normalized = normalize(decoded).replace(/^[/\\]+/, "");
	const candidate = resolve(root, normalized || "index.html");
	const relativePath = relative(root, candidate);

	if (relativePath.startsWith("..") || relativePath === ".." || relativePath.includes(`..${sep}`)) {
		return null;
	}

	return candidate;
}

function getCacheControl(pathname: string, isRequestedFile: boolean) {
	if (!isRequestedFile || REVALIDATED_ASSET_PATHS.has(pathname)) {
		return REVALIDATED_CACHE_CONTROL;
	}

	if (pathname.startsWith("/assets/")) {
		return IMMUTABLE_ASSET_CACHE_CONTROL;
	}

	return undefined;
}

async function isFile(path: string) {
	try {
		await access(path);
		return (await stat(path)).isFile();
	} catch {
		return false;
	}
}
