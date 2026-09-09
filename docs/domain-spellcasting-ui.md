# Spellcasting UI Ownership (R8)

Base: locally accepted R7 `0198553fe11ca4a00aaa4816eaba6c6a931b4f0f`,
[PR #116](https://github.com/linuxlewis/dnd-character-manager/pull/116).
Predecessor CI run `34175991433` passed. R8 is accepted at
`624c89b38369cc1fa26ab4092537bf2917dea713`,
[PR #117](https://github.com/linuxlewis/dnd-character-manager/pull/117), successful
CI run `34176310606`.

## Mechanical Scope

Ten spell UI modules and their ten co-located test files move from character UI
to spellcasting UI: slot panel/list, non-slot list, search/details/remove modals,
edit actions, alerts, history, and formatting. The new public UI entrypoint exports
only `CharacterSpellSlotsPanel`. Application detail imports that entrypoint;
character UI no longer exports spell controls and has no compatibility reexport.

Four direct spellcasting type imports become local public `types/index.ts`
imports. Generated client imports keep their existing paths. NumberDraft already
belongs to the spell list module from R6 and moves with it; no health dependency
is introduced. A byte comparison against R7 confirms every moved file is identical
after those four required import substitutions. No component, callback, query,
mutation, state, formatting, layout, modal, cache, or retry body changes occur.

This preserves the existing slot configure/default/use/restore/history and saved
spell search/add/details/remove workflows. The R6 application health-cache callback,
lazy inventory tab and page navigation remain unchanged. Workflow simplification
and local modal error/retry changes belong to R9, not this relocation.

## Validation

Lint, build/typecheck/API freshness pass. The report-only boundary scan remains at
zero findings. Full Gate B passes: 203 unit files / 674 tests, 30 integration files /
98 tests, and all 26 Chromium journeys in 43.5 seconds. The runner exits 0 and
cleans up its owned stack. Documentation links and whitespace checks pass. Existing
spell/slot browser journeys exercise controls, cantrips/features, details, removal,
defaults, configuration, use/restore and history. No new tests mirror the unchanged
implementation; existing tests relocate with their owners.

Logs: `/tmp/domain-r8-{install,lint,build,test,boundaries,quality,docs,diff}.log`.
The full runner uses `VITEST_MAX_WORKERS=4` and the coordinator-reserved Compose
network override `/tmp/domain-r2a-compose-network.yml`. Only its owned stack is
started and removed; no shared network pruning occurs.

## Movement And Quality

The accepted R7 baseline has 866 production and 727 test lines across these twenty
files: 1,593 lines relocated, not eliminated. Git recognizes every rename. The
rename-aware production delta is +6/-6 (net zero), consisting of four type imports,
one application import and the public entrypoint ownership change. Tests have zero
line changes. Documentation is counted separately. No generated artifact, migration,
SQL metadata or API contract changes occur.

Ripwire quality-delta exits 2 with 36 observations, six gating. Moved JSX components,
callbacks and types have live uses despite dead-code classifications. Existing
component verbosity is reported as new at the moved paths, with identical bodies.
The six normalized helper clone reports involve unchanged small validation helpers.
The coordinator reviewed these observations and requested no source changes.
No helper abstraction, source rewrite, suppression, or acknowledgement is introduced
to change the metric during a mechanical move. R9 will assess actual workflow
responsibilities independently.

Rollback is a code revert on a new branch or predecessor deployment; no data
migration is needed. R9 starts from this accepted move and changes only spellcasting
workflow ownership and focused recovery behavior, with its own acceptance/gates.
