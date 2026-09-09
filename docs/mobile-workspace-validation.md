# Mobile Workspace Browser Validation

The shared suite in `tests/e2e/mobile-workspace.spec.ts` exercises the running application using
real owned-stack API setup and the catalogue loopback fixture. It does not reconstruct application
screens from HTML. The separate reference HTML is a design artifact, not the tested application.

## Commands

Run the full required gate through `pnpm test`. For focused iteration, with this worktree's manual
stack stopped, run:

```bash
PLAYWRIGHT_GREP='mobile workspace' pnpm test:e2e
```

`PLAYWRIGHT_GREP` is an optional Playwright title regular expression; when absent every existing
browser test still runs. `scripts/test.ts` continues to own catalogue setup, dynamic ports, database
creation, signal cleanup, and stack shutdown. Do not append filenames to that script expecting
forwarding. The focused command is not a substitute for the final full test run.

## Fixture And Evidence

`mobile-workspace-fixture.ts` creates F2-main-v1: Mira Thorn, Wizard level 3, XP2196, returned health
18/27 with base max24 and temporary3; Light, Lay on Hands and Divine Smite from the local catalogue
fixture; numbered slots; twelve items with categories, quantities, equipped state and a long name;
four currency denominations and item/treasury history. All setup writes check responses. The second
health write deliberately accounts for main's temporary-HP delta behavior.

The browser suite fixes locale to en-US, timezone to UTC and reduced motion. Geometry tests cover
320/390/430/767/768/991/992/1280 widths and 844x390 landscape. Additional cases cover section state,
query isolation, failed item drafts, focus, XP boundaries, enlarged text, local treasury errors and
not-found escape. Existing character/spell/treasury/activity journeys remain necessary evidence for
mutation semantics and pagination. A test-only covering element proves that a plausible bounding
rectangle cannot pass the hit-testing gate when its control is obscured.

Each capture has a viewport and full-page PNG plus a JSON sidecar in the Playwright test output's
`mobile-workspace/` directory. Sidecars record candidate SHA, dirty status, tracked patch hash,
fixture version, route, viewport, scroll/element geometry, browser and platform. Untracked files
are indicated by dirty status but are not represented by the tracked patch hash: freeze a clean
commit before acceptance. Attachments are also accessible from `playwright-report/`.

Only independently accepted real-app images may become regression screenshot expectations. Do not
update baselines to silence a failing check. The orchestrator reviews screenshots against the
[design contract](./ui-design.md) and [acceptance protocol](./mobile-character-workspace-plan.md#visual-acceptance-protocol),
then records acceptance at the exact clean source SHA. Raw captures do not themselves prove that
all criteria passed.

## Device Follow-up

Physical iOS Safari and Android Chrome, installed standalone mode, actual software-keyboard
occlusion, notch/home-indicator safe areas and rotation are NOT RUN in headless Chromium.
Owner: product/device reviewer designated by the orchestrator. On each physical device, open an
existing character, scroll both sections, switch and go Back, open each long editor and focus its
last field, verify Save/Cancel above the keyboard, rotate, dismiss and check focus/context, then
repeat in installed mode where supported. Record device, OS, browser, build SHA and results.
Reduced viewport height or doubled text size must never be described as physical keyboard proof.

## Mantine Layout Verification

Prefer Mantine's Styles API and stable scoped classes for overlay internals. A class name or a
`position: fixed` declaration is not evidence that an element occupies the intended rectangle:
inspect computed styles and bounds after component styles apply. Ensure one scrolling editor body
and persistent actions actually win over component defaults. Check the last field and Save at
both scroll extremes, with enlarged text and validation errors.

A non-portalled overlay (`withinPortal={false}`) can inherit transformed or positioned ancestors;
its fixed inner container must still anchor to the viewport. Check the overlay above the sticky
header, and test on desktop as well as mobile. Closed modal roots can remain flex children and
introduce unexpected Stack gaps; inspect actual children and measured spacing rather than adding
compensating negative margins.

Wait for finite entrance/exit transitions, fonts and settled frames before capturing. A screenshot
of a fading overlay cannot establish text contrast or geometry. Verify full action-label ranges,
not just button rectangles: a 44px target with a truncated Restore label still fails acceptance.
The evidence helper combines rectangle bounds with center and four inset-corner hit-testing so a
control partly hidden beneath sticky navigation or an overlay fails even when Playwright reports
it as visible. Check complete last-card and error-body bounds, not only their action centers.
Assert every error title/body text range fits inside its Alert surface; a flex-shrunk background
can remain reachable while its message spills into the next field. Assert the actual generated
client error message too, rather than assuming the mocked response body is what the UI displays.

## Acceptance Record

The [acceptance report](./mobile-workspace-acceptance.md) separates verified source behavior,
independent visual review, automated accessibility results, and outstanding device checks. Locale
and timezone are pinned for Playwright; the server clock and recorded timestamps are not frozen.
Current captures support geometry and independent review, not pixel-golden approval. Before
adopting pixel expectations, make timestamps deterministic and independently accept those captures.
Review axe `incomplete` results manually: short numeric labels can conceal real contrast failures.
