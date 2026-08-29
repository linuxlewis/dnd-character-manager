# Catalogue Seeding

Last verified: 2026-08-29

Catalogue schema migrations and catalogue data seeding are separate operations. Migrations create
the tables and can run automatically during application startup. Seeding downloads the pinned
Foundry source, validates every source record, and writes a complete capability batch. A deployment
is not considered catalogue-ready until the explicit seed command and status check have completed.

## Pinned Source

The local SRD 2024 catalogue uses Foundry `dnd5e` revision
`f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6` from
`https://github.com/foundryvtt/dnd5e`.

- Spells use `packs/_source/spells24/`.
- Items use `packs/_source/equipment24/`.
- The importer stores source revision, path, key, URL, rules version, per-record license,
  deterministic seed metadata, and raw YAML payload after parsing.

## Staging

Run migrations first, then seed the capabilities explicitly from the staging app environment:

```bash
pnpm db:migrate
pnpm seed spells
pnpm seed items
```

To seed both capabilities in one idempotent run:

```bash
pnpm seed all
```

The item seed fails before writing catalogue rows when any source file is rejected. Re-running the
same pinned seed replaces the complete source/capability/pack/rules-version projection, removing
rows absent from a later pinned snapshot, and does not create duplicates. The enforced baseline is
owned by `src/domains/catalogue/config/catalogue-item-audit.ts`; a pin change is not ready until a
new seed passes that gate. Its current immutable-pin minimums are processed `627`, accepted `627`,
weapons `82`, armor `32`, adventuring gear `161`, consumables `57`, potions `30`, scrolls `11`, and
magic items `351`; the code constant is the single source of truth for these thresholds. Verify through
`GET /api/catalogue/status`; item search must return readiness `ready` after a successful item seed
and `503` with readiness `unavailable` before one. Readiness requires the stored successful audit to
match the current source, revision, pack, and rules version and its accepted count to match the
current projection. A pin change or failed new-pin seed therefore leaves prior rows intact but
temporarily unavailable until the new pin is seeded successfully; a repeat failure on the same valid
pin does not invalidate the existing ready snapshot. Upserts preserve UUIDs for unchanged source
identities while removing identities absent from the incoming snapshot.

Record the seed output as release evidence with these fields:

| Capability | Source revision | Processed | Accepted | Rejected | Required category counts |
|---|---|---:|---:|---:|---|
| items | `f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6` | 627 | 627 | 0 | weapons, armor, adventuring gear, consumables, potions, scrolls, magic items |

The committed source-audit tests use representative fixtures for every required category. A real
staging run remains the evidence for the full pinned pack totals above.

## Production

Production startup runs migration semantics through the container entrypoint, but does not seed
remote source data. After the application revision is deployed and healthy, run the seed command once
from the production app environment with the production `DATABASE_URL`:

```bash
pnpm seed spells
pnpm seed items
curl "${APP_ORIGIN}/api/catalogue/status"
```

Keep the JSON status response and seed log with the deployment record. Confirm the source revision
matches the deployed code, `rejected` is zero, and accepted/category counts match staging evidence.
If the seed cannot complete, leave item consumers in the explicit unavailable state and investigate
the source or network failure; do not represent missing data as an empty successful search.
