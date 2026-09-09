# Identity And Health Agent Evidence

Source freeze: `1cbc546` on `codex/mobile-ux-health`, includes shell `8b34882`.
Screenshots, exact fixture values, hashes, and capture source are recorded in `manifest.json`.
These are agent evidence, not approved visual-regression baselines. Root independently accepted the
compact hierarchy, long-name ellipsis, max/available state, and mobile-sheet placement. The final
contrast and extreme-number wrapping corrections need integrated QA captures.

## Verified

- H2-H6: authoritative XP labels with all seven spec boundaries in unit tests; no inferred level.
  Full name/class/level, exact XP/next threshold/remaining XP are in Character details. Single app
  menu exposes Edit character and Health history. HP readout opens editing.
- E2/E3/E6: browser journeys at 320/390/1280 prove temp-HP update, cap preview, controlled health
  failure with retained amount, retry, focus return, sequential name success/level failure with
  remaining draft retained, retry, and cancel/reopen using saved values.
- Existing character creation and legacy health/history journey pass after selector migration.
- Measured standard header: 106.8 px; title: 20 px; HP/Heal/Damage: at least 44 px height;
  no horizontal overflow. Mobile sheet x=0/width=320/bottom=740. Browser geometry waits for animation.
- Unit suite: 595 passing before final shell ancestry update; final logs tracked by orchestrator.
- Filled action foreground correction uses black: red5 ratio 7.57, green5 ratio 10.47,
  bloodstone5 ratio 5.72. Prior white labels failed AA and were corrected after image review.

## Evidence Limits

Spells are intentionally empty here: these captures establish identity/health behavior only and do
not establish populated-section density. Full integrated `pnpm test`, all section combinations,
large-text/landscape/extreme values, and final contrast scan belong to M7. Native iOS/Android keyboard,
safe area and installed-PWA checks are NOT RUN and require the device-owner follow-up in the plan.

A running Vite server retained pre-rebase transformed modules during one intermediate run. Those
captures were discarded/overwritten after restarting the owned stack; do not rebase under a running
visual-review server. The owned database/stack was stopped after verification, freeing its network.
