import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { mobileFixtureVersion } from "./mobile-workspace-fixture.js";

export async function assertReachable(locator: Locator, page: Page) {
	await expect(locator).toBeVisible();
	const geometry = await locator.evaluate((element) => {
		const box = element.getBoundingClientRect();
		const inset = Math.min(4, box.width / 4, box.height / 4);
		const points = [
			[box.x + box.width / 2, box.y + box.height / 2],
			[box.left + inset, box.top + inset],
			[box.right - inset, box.top + inset],
			[box.left + inset, box.bottom - inset],
			[box.right - inset, box.bottom - inset],
		];
		const hits = points.map(([x, y]) => document.elementFromPoint(x, y));
		return {
			x: box.x,
			y: box.y,
			width: box.width,
			height: box.height,
			hit: hits.every((hit) => hit === element || element.contains(hit)),
		};
	});
	expect(geometry.x).toBeGreaterThanOrEqual(-1);
	expect(geometry.y).toBeGreaterThanOrEqual(-1);
	expect(geometry.x + geometry.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
	expect(geometry.y + geometry.height).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1);
	expect(
		geometry.hit,
		`${await locator.getAttribute("aria-label")} center and inset corners must receive pointer`,
	).toBe(true);
	return geometry;
}

export async function assertTouchTarget(locator: Locator, page: Page) {
	const box = await assertReachable(locator, page);
	expect(box.width).toBeGreaterThanOrEqual(44);
	expect(box.height).toBeGreaterThanOrEqual(44);
	const clippedText = await locator.evaluate((element) => {
		const box = element.getBoundingClientRect();
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
		const clipped: string[] = [];
		while (walker.nextNode()) {
			const text = walker.currentNode;
			if (!text.textContent?.trim()) continue;
			const range = document.createRange();
			range.selectNodeContents(text);
			for (const rect of range.getClientRects()) {
				if (
					rect.width > 0 &&
					(rect.left < box.left - 1 ||
						rect.right > box.right + 1 ||
						rect.top < box.top - 1 ||
						rect.bottom > box.bottom + 1)
				)
					clipped.push(text.textContent);
			}
		}
		return clipped;
	});
	expect(clippedText, "visible action labels must fit their target without clipping").toEqual([]);
}

export async function assertNoOverflow(page: Page) {
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
		(page.viewportSize()?.width ?? 0) + 1,
	);
}

export async function captureMobileEvidence(
	page: Page,
	info: TestInfo,
	state: string,
	criteria: string[],
) {
	await page.evaluate(async () => {
		await document.fonts.ready;
		await Promise.allSettled(
			document
				.getAnimations()
				.filter(
					(animation) => animation.effect?.getTiming().iterations !== Number.POSITIVE_INFINITY,
				)
				.map((animation) => animation.finished),
		);
		await new Promise<void>((resolve) =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
		);
	});
	const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
	const patch = execFileSync("git", ["diff", "HEAD"], { encoding: "utf8" });
	const status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
	const viewport = page.viewportSize();
	const name = `${state}-${viewport?.width}x${viewport?.height}`;
	const directory = info.outputPath("mobile-workspace");
	await mkdir(directory, { recursive: true });
	const geometry = await page.evaluate(() => ({
		scrollY,
		scrollWidth: document.documentElement.scrollWidth,
		deviceScale: devicePixelRatio,
		elements: [
			...document.querySelectorAll(
				'header,nav,[aria-label="Character workspace header"],[data-testid="treasury-summary"],button,input,[role="dialog"]',
			),
		].map((e) => ({
			label: e.getAttribute("aria-label") ?? e.textContent,
			rect: e.getBoundingClientRect().toJSON(),
		})),
	}));
	await page.screenshot({ path: join(directory, `${name}.png`), animations: "disabled" });
	await page.screenshot({
		path: join(directory, `${name}-full.png`),
		fullPage: true,
		animations: "disabled",
	});
	await writeFile(
		join(directory, `${name}.json`),
		JSON.stringify(
			{
				sha,
				dirty: Boolean(status),
				patchHash: createHash("sha256").update(patch).digest("hex"),
				fixture: mobileFixtureVersion,
				route: page.url(),
				viewport,
				state,
				criteria,
				geometry,
				browser: page.context().browser()?.version(),
				platform: process.platform,
				locale: "en-US",
				timezone: "UTC",
				nativeDevice: "NOT RUN",
				command: "pnpm test:e2e",
			},
			null,
			2,
		),
	);
	await info.attach(name, { path: join(directory, `${name}.png`), contentType: "image/png" });
}
