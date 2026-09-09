# Domain Import Graph

R1 introduces reusable import resolution for R2's rule engine. It does not change
the effective policy in `lints/check-deps.ts`. The existing lint command continues
to run that checker; the new filesystem fixtures run in normal `pnpm test:unit`.

## Resolution Contract

`buildImportGraph(rootDir)` reads that root's `tsconfig.json` with TypeScript's
configuration parser and module resolver. Invalid or missing configuration fails
visibly. Configured project files seed the graph; resolved local TypeScript and
JavaScript dependencies are followed even when not initial config roots.

- Relative paths, configured `paths` aliases, `.js` references to TypeScript,
  directory barrels, and literal dynamic imports use real module resolution.
- Every edge carries its absolute source/target, specifier, import kind, type-only
  flag, and one-based source line/column at the module expression.
- Static imports, named/star reexports, import-type expressions, and TypeScript
  import-equals declarations are included. Mixed type/value imports are value edges.
- Missing relative, absolute, or configured-alias imports are `unresolved-local`
  entries in `issues`. Unconfigured bare specifiers are classified as `external`,
  including missing packages: package-install diagnostics belong to TypeScript.
- Resolved external packages, `node_modules`, and targets outside the project root
  are `external`; their internals are not traversed. The graph is project-scoped,
  not a workspace-wide package ownership graph.
- Nonliteral dynamic imports are `nonliteral` entries in `issues` with source
  locations and no guessed target. R2 must give those findings an explicit policy.
  Plain CommonJS `require()` calls are not modeled by this ESM import collector.
- TypeScript-unresolved relative assets are also unresolved-local findings. R2
  must inventory legitimate asset imports explicitly rather than silently ignoring
  all unresolved imports.

`findImportPath` returns a shortest module dependency trace, including reexport
edges and source locations. It follows both type and value edges; the rule engine
decides which restrictions apply. This is a module graph, not an analysis of which
individual barrel export a consumer uses. `findImportCycles` returns deterministic
DFS cycle witnesses, not every possible simple cycle. Visited sets stop both
operations from looping through cyclic barrels.

## R1 Handoff

Owner: R1 implementation agent. Base: accepted R0
`f26b24e93dc6b3c8aa1890a9a36ade7bb5a102d6` ([PR #98](https://github.com/linuxlewis/dnd-character-manager/pull/98)).
The coordinator records the delivered commit and successor PR after review.

Owned paths: `lints/import-graph.ts`, `lints/import-references.ts`, and
`lints/import-graph.test.ts`. Shared configuration: `vitest.config.ts` adds lint
fixtures to the normal unit suite. Documentation: this record, milestone ledger,
testing procedure, and quality tracker. No compatibility bridges or domain moves.

Acceptance evidence supplied for coordinator review:

- Equivalent relative/alias imports resolve to identical absolute targets in a
  real temporary project; directory barrels and TSX also resolve.
- Cyclic named/star reexports return a finite trace with useful source locations;
  self-cycles and disconnected cycles return deterministic witnesses.
- Fixtures distinguish unresolved local aliases, installed and missing external
  packages, Node imports, literal and nonliteral dynamic imports, and type-only edges.
- All fixtures write source/config/package files to disk and call TypeScript's
  actual resolver. No mocked graph edges substitute for module resolution.
- Existing lint policy is unchanged. R2 owns graph integration and report-only
  policy; R10 owns enforcing the completed migration against application code.

Validation logs are recorded as `/tmp/domain-r1-{lint,unit,build,docs,diff,quality}.log`
in the implementation environment. The coordinator must verify results at the
delivered commit before marking R1 accepted.

| Check | Result |
| --- | --- |
| `pnpm lint` | Passed; existing policy remains functional |
| `pnpm test:unit` | Passed: 174 files, 583 tests, including eight filesystem graph fixtures |
| `pnpm build` | Passed: generated API freshness, TypeScript, client/PWA, server |
| `pnpm check:docs` | Passed: 26 Markdown files |
| `git diff --check` | Passed |
| `ripwire . --quality-delta` | Exit 0, no existing-symbol regressions; six new-symbol observations reviewed |

The quality observations flag the graph builder's 66-line, multi-step resolution
routine, three TypeScript interfaces as dead code despite typed references, and
the nested AST visitor as duplicate text within its containing function. The
builder deliberately keeps its TypeScript configuration and resolution cache in
one scope; no abstraction was added solely to change a metric.
