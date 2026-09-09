# Main Rebase Acceptance: Domain Refactor

Date: 2026-09-08. Native stack #100 contains 15 PRs, #98 through #121 as
listed below. Local implementation validation is complete; publication, exact
remote-head verification and CI for every rebased layer remain coordinator gates.
No merge, deployment or attributes adaptation is part of this record.

## Pinned Inputs And Deliveries

- Main: `2fc8a274862298424da679e2537aca4e7ed35a4e`, including PR #120 mobile UX.
- Old stack base: `faf519271e2b06a825025ba433c38005340b116e`.
- Old stack top: `5b0a343f13a2ef1806ddfe5ea495d38e50dbb1e3`.
- Rebased implementation R10: `3d9c9979fd129e9e2b29a5070bf0bab7c461610c`.
- Corrected browser run R11: `cf93e2424d8d512663c2ec8979b915443e5aef73`.
  This note and accompanying status/module-map edits follow that run and change
  documentation only; R11's published head is verified separately by coordinator.

| Layer / PR | Old remote head | Rebased local head before this note |
| --- | --- | --- |
| R0 / #98 | `f26b24e93dc6b3c8aa1890a9a36ade7bb5a102d6` | `00fe2f781c16b82e6013acfd663ea81c1c0da14e` |
| R1 / #99 | `5ed2f8fc5dc7ac6432618ba40d3c1b9f83d0b747` | `60241ebe0c6ef1f309a512d07cda7760660a0b87` |
| R2 / #104 | `091934709c212fd7626c70a091e9063b7d4ecbf0` | `ce3372de04342771a688d3b395250aa20cb0e80b` |
| R2t / #107 | `a28b6a9a0f2ad6d74424facacbd39771f1c65bea` | `c560f04dd171801fabd4045fd09c19470984529c` |
| R2a / #108 | `a345d79ab0786d0fd1357a2309480a339ea88a6d` | `70bb7f4c01861fc1abcd8a971a5c1b116fad5c15` |
| R3 / #110 | `c1d70de3dd45a3906d46a3cbe89f7331c22a4d64` | `e0042076346c5bcc9f2858c38273c6b1934f49dd` |
| R4a / #111 | `9e9f77ee4fbd33656f14e4085e225255f01808e3` | `12866d907488c40742fa385dac0e7d082986eeeb` |
| R4b / #113 | `b94446457a1cf9c812ecd82f1b9341d1d5d5a3e2` | `880f7fb0b1361bcf2fdc670cd794037173456f2d` |
| R5 / #114 | `4d735cc8d7c792e239e931d2c9c359a7b9d624d9` | `35378f62275dc6322c9d3ef6fd8dad961fe9d8bc` |
| R6 / #115 | `2d6eb6eb831ef4852e2ae7794f71beb8d5d57c95` | `29f8a0e7b0ae7af879c711fefcf4b423d7421939` |
| R7 / #116 | `0198553fe11ca4a00aaa4816eaba6c6a931b4f0f` | `e342007b4a2d61055470352f529b62c23e326e39` |
| R8 / #117 | `624c89b38369cc1fa26ab4092537bf2917dea713` | `1a36a3bc5e712fcc27bc94ac02c07f9277c855e7` |
| R9 / #118 | `cc6387549d8bd82295761f7eeb3f6050ddc8ae5a` | `5dc2eb26885287421d820ced219528ec1513ec22` |
| R10 / #119 | `2824232f0b9acd844868025bd747607175042dfd` | `3d9c9979fd129e9e2b29a5070bf0bab7c461610c` |
| R11 / #121 | `5b0a343f13a2ef1806ddfe5ea495d38e50dbb1e3` | `cf93e2424d8d512663c2ec8979b915443e5aef73` |

Work used an isolated clone and native `gh stack rebase`, with small corrective
commits inserted in the owning layer and cascaded using `gh stack rebase --no-trunk`.
Original worktrees were preserved. Backup refs use
`refs/backup/domain-rebase-20260908/<branch-name>` in the isolated clone; an additional
Git bundle was retained outside the repository. Reconstruct the patch comparison:

```bash
git range-diff faf519271e2b06a825025ba433c38005340b116e..5b0a343f13a2ef1806ddfe5ea495d38e50dbb1e3 2fc8a274862298424da679e2537aca4e7ed35a4e..cf93e2424d8d512663c2ec8979b915443e5aef73
git diff 8eff3b6da1830adda0963a09fd0b3e16181d2779 cf93e2424d8d512663c2ec8979b915443e5aef73 -- src lints scripts package.json pnpm-lock.yaml migrations
```

The second command is empty. Its unrestricted equivalent changes only 19 deleted
lines in the mobile browser spec: duplicate per-spec catalogue setup/cleanup.
Coordinator's range-diff accounts for all 17 original commits across 23 rebased
commits, including six focused inserted fixes. No original commit was dropped;
the final R10 strict-enforcement patch is unchanged.

## Conflict Decisions By Owner

| Layers | Resolution and preserved behavior |
| --- | --- |
| R0/R1/R3/R4a/R7/R11 | Combined mobile and refactor historical documentation; neither evidence lineage substitutes for new validation. |
| R2 | Allowed only the existing browser navigation provider entry/implementation paths. Positive browser-import and negative transitive `node:fs`/unapproved-sibling fixtures preserve browser closure checks. |
| R2t | Kept main locale/timezone/reduced-motion and `PLAYWRIGHT_GREP`; retained suite-owned catalogue global setup and removed obsolete per-spec SQL hooks, including the newly added mobile workspace spec. |
| R2a | Main XP presentation test imports its moved calculator from public config. |
| R5 | Narrowed ribbon and XP panel props to identity/XP contracts without changing presentation; fixed import sorting at this layer. |
| R6 | Application owns main detail/navigation/scroll composition. Identity ribbon stays identity-owned; health sheets/history stay health-owned. Health mutations report originating character IDs to application cache coordination. Shared sheet declarations moved once into app theme, including doubled specificity, media queries and safe-area geometry. |
| R8 | Moved main configuration modal/tests and spell CSS into spellcasting UI. Preserved pending controls, mobile sizing and removal of player spell history/inline totals. |
| R9 | Preserved search/details/remove async ownership and retries. Configuration owns drafts/defaults/totals. Late configuration/default/use/restore responses update only their originating cache and cannot close a newer dialog or discard another character's edits. Ordinary use/restore still exits edit mode. |
| R10 | Strict normal lint retains zero boundary findings; provider support does not add a broad exemption. |

API URLs, envelopes, operation IDs, published OpenAPI JSON, physical migrations and
lockfile remain unchanged. Backend slot events remain available even though player
spell history UI stays removed. There is no attributes feature work in this rebase.

## Validation And Failed Intermediate Run

| Check | Pinned result |
| --- | --- |
| `pnpm lint` | Pass at `8eff3b6d`: strict boundaries zero findings. Existing main reference HTML emits one Biome warning and one informational diagnostic. |
| `pnpm build` | Pass at `8eff3b6d`, including API freshness and TypeScript. |
| Unit portion of full `pnpm test` | 208 files / 706 tests pass at `8eff3b6d`. |
| Integration portion | 30 files / 98 tests pass at `8eff3b6d`. |
| First browser run | 42 pass, one beforeAll timeout, nine not run: mobile workspace reacquired the suite-owned catalogue advisory lock. This run failed and is not acceptance. |
| Corrected `pnpm test:e2e` | All 52 Chromium journeys pass in 1.5 minutes at `cf93e242`, including all ten main mobile workspace scenarios. |
| Corrected R2t and R5 | Independent lint/build/API/typecheck pass at the exact heads in the delivery table. |
| Documentation Gate D | `git diff --check` and `pnpm check:docs` pass for this note and the accompanying historical-status/module-map amendments. |

Unit/integration/build/lint evidence applies to the corrected implementation because
all source, tooling, dependency, generated and unit/integration test blobs are
identical across the two run SHAs. Only duplicate browser lifecycle hooks changed.
No timeout, retry, assertion or suite coverage was weakened. Corrected suite cleanup
removed its owned database container, volume and network.

Other conflict-layer lint/build checks passed at R2 `ce3372de`, R2a `b362fb0f`,
R6 `f86eb1bd` and R8 `9ce10276`; after the final cascade their code/tooling trees are
identical to the corresponding heads in the delivery table. R5 initially failed
Biome import sorting at `3d2f8564`; the explicit lower-layer fix cleared it.

The expensive commands ran sequentially with `VITEST_MAX_WORKERS=4` and reserved
Compose subnet `10.253.241.0/28`. Supplemental logs are
`/tmp/domain-rebase-final-{lint,build,test}.log`,
`/tmp/domain-rebase-corrected-browser.log`, and
`/tmp/domain-rebase-corrected-{r2t,r5}-{lint,build}.log`. The pinned commands, counts,
failure diagnosis, executable tests and acceptance limitations here are durable;
these temporary log paths are supplementary.

## Independent Preservation Review

`r1_finish` reviewed mobile source against main; coordinator reviewed narrow and
scrolled mobile captures and configuration error/footer geometry. No outstanding
source findings remained after restoring ordinary use/restore exit-edit behavior.
Browser evidence includes main's responsive geometry, sticky chrome, real links,
back/forward, per-character scroll/filter restoration, inactive section unmounting,
identity/history focus return, failure drafts, pending actions, 44px controls,
200% text, fallback fonts and configuration error clearance. Real browser tests
also hold A's configuration/default/use/restore completion while B edits, proving
cache origin and newer-dialog preservation.

Of 328 paths added by main, 317 remain byte-identical at the corrected implementation,
three have focused changes (identity ribbon and its props test, mobile fixture
lifecycle), and eight are relocated or split into their proper owner. No main-added
path was silently discarded. Shared health-sheet declarations move to app theme;
section navigation/scroll move to application; configuration/CSS move to spellcasting.

`r2_rules` compared the backend/API/schema/generated/dependency path union against
the accepted old top: 367 paths, 364 identical, three expected main navigation
provider additions whose blobs match main. It independently reviewed the lifecycle
fix and found no remaining per-spec catalogue preparation/cleanup. Actual SQL
ownership remains the semantic-review obligation documented in
[the original acceptance](./domain-refactor-acceptance.md); legal imports alone
cannot prove that a registered Drizzle handle reads only owned tables.

Physical-device software keyboards, installed PWA mode and native safe-area checks
remain NOT RUN. Chromium geometry is not evidence of those physical checks.
Generated screenshots/manifests/traces remain run artifacts, not new pixel baselines.
Coordinator sampled six corrected-run captures: configuration full error at 320px,
identity editor at 320px, spell actions at 200% text/320px, landscape at 844x390,
failed item draft at 320px, and desktop direct health history at 1280px. No visual
findings arose in this representative sample; it is not an exhaustive image audit.

## Source Accounting Against Current Main

Application source is **+282 lines**, not a net reduction. Counts compare main to
rebased R10, separate moves from behavior cleanup, and exclude later R11 docs.
Old +273-line accounting belongs to the historical base and remains labeled there.

| Category | Main files / lines | R10 files / lines | Net lines |
| --- | --- | --- | --- |
| Configuration and operations | 19 / 670 | 19 / 674 | +4 |
| Documentation | 29 / 5,285 | 45 / 7,777 | +2,492 |
| Tooling implementation | 21 / 1,922 | 31 / 2,792 | +870 |
| SQL migrations | 15 / 378 | 15 / 378 | +0 |
| Lockfile | 1 / 6,197 | 1 / 6,197 | +0 |
| Tests and test support | 225 / 23,654 | 270 / 26,592 | +2,938 |
| Handwritten application | 206 / 20,683 | 252 / 20,965 | +282 |
| Static assets | 8 / 94 | 8 / 94 | +0 |
| Generated artifacts | 14 / 12,318 | 14 / 12,328 | +10 |
| Historical design review artifacts | 296 / 27,850 | 296 / 27,850 | +0 |

Historical design review artifacts include 193 binary images and remain unchanged;
they are classified separately from configuration. Line counts use tracked Git blobs,
exclude binary content, and classify tests/test support before application/tooling.
Source movement creates explicit owners; it is not reported as deleted functionality.

The R9 ripwire quality delta reported five observations, including three gating
observations: search complexity 11 to 16, search size 93 to 132 lines, and a normalized
41-token deferred-helper clone in tests. Async ownership/retry behavior explains the
search increase; the helper predates this rebase. Details size increased 88 to 93;
a Window type declaration produced a dead-code observation. This is a recorded
quality tradeoff, not a claim that the quality tool passed.

## Remaining Publication Gate

Coordinator must publish all 15 rebased heads with the recorded remote leases,
verify native order/base/head identities, and verify each layer's CI. Historical
green CI does not certify these new heads. Gate D passed for these documentation
edits. Follow the updated [module map](./domain-refactor-module-map.md) for the later
attributes adaptation; this task neither merges the stack nor adapts attributes.
