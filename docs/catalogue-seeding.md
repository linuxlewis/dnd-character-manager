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
same pinned seed updates existing source identities and does not create duplicates. Verify through
`GET /api/catalogue/status`; item search must return readiness `ready` after a successful item seed
and `503` with readiness `unavailable` before one.

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
