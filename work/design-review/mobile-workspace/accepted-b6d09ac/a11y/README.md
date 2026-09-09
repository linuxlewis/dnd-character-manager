# Accessibility Diagnostic Evidence

These are settled axe 4.12.1 WCAG 2A/AA reports from real owned-stack application screens.
Fourteen surface reports have zero automatic violations; incomplete results are not passes.

Most reports were collected before the final history and badge fixes. Inventory history was
rechecked on f675112; its former 18 contrast violations are gone. The included history screenshot
shows that revision, not the final badge pixels. Post-HMR badge-colors-fixed.json and
badge-contrast-fixed.json verify source20b2d0e: inactive black/gray10.12:1 and active black/candle12.88:1.
The old badge-colors.json intentionally retains the before state for diagnostic traceability.
Do not treat a manual diagnostic capture as a frozen pixel baseline or a clean automated fixture.

All short-text contrast incompletes in the reports are the same inactive inventory count badges,
including those behind overlays. The additional About paragraphs, spell detail description and
spell-removal explanation use rgb201 text on rgb36 dialog background (>9:1); their live computed
colors are in the manual-colors files. Essential field-border colors are in field-colors.json.

History paragraph/time aria-label support remains incomplete in axe. Native visible text remains
available; expanded spoken currency wording and timestamp labels need screen-reader follow-up.
This preexisting limitation does not silently become an automatic pass or WCAG certification.
Browser scans cannot establish physical-device keyboard, notch or installed-mode behavior.
