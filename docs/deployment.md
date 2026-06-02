# Production Deployment

Last verified: 2026-06-02

This document describes the production deployment contract for the shared `dev-server-1` host. See
[production.md](./production.md) for Docker image, Compose, and runtime internals.

## Environment

| What | Value |
|------|-------|
| Host | `dev-server-1` |
| App workspace | `/home/sbolgert/workspace/dnd-character-manager` |
| App service unit source | `systemd/dnd-character-manager-prod.service` |
| Intended host service | `dnd-character-manager-prod.service` |
| Shared tunnel workspace | `/home/sbolgert/workspace/cloudflare-tunnel` |
| Live tunnel config | `/etc/cloudflared/config.yml` |
| Tunnel ID | `60aeb0c1-58ee-490f-b255-63fa4f0d3a25` |

The current production host already runs other production services through the same Cloudflare
Tunnel. Treat every existing tunnel route as production and preserve it unless there is an explicit
decommission plan.

This service is not a replacement for the existing D&D inventory manager at
`dndinventorymanager.com`.

## Ownership

The app repo owns:

- production image and Compose stack
- `.env.production.example`
- systemd unit source copy
- app deployment and rollback procedures

The shared tunnel workspace owns:

- hostname registry
- workspace copy of the tunnel config
- procedures for adding and validating routes

The host owns:

- `/etc/systemd/system/*.service`
- `/etc/cloudflared/config.yml`
- uncommitted `.env.production` secrets
- Docker volumes containing production data

## Request Flow

```text
Browser
  -> Cloudflare DNS
  -> shared Cloudflare Tunnel
  -> cloudflared.service on dev-server-1
  -> http://127.0.0.1:8090
  -> dnd-character-manager-prod.service
  -> docker-compose.prod.yml app container :4000
  -> Fastify API, OpenAPI, and built React app
  -> Postgres container :5432
```

Cloudflare terminates public TLS. The local app origin should stay plain HTTP on loopback.

## Deployment States

| State | Meaning |
|-------|---------|
| Local dev | `pnpm start` uses dynamic ports and is not production. |
| Manual production smoke | `pnpm prod:up` runs the production Compose stack from a shell. Useful before installing or restarting systemd. |
| Host production | `dnd-character-manager-prod.service` is enabled and running the production Compose stack. |
| Public production | Host production is healthy and the shared Cloudflare Tunnel routes a public hostname to the app origin. |

A deployment is not complete until both the local origin and public hostname are verified.

## Runtime Configuration

Create `/home/sbolgert/workspace/dnd-character-manager/.env.production` from
`.env.production.example`. Do not commit real secrets.

Recommended production values for this host:

```env
APP_PORT=127.0.0.1:8090
BETTER_AUTH_URL=https://characters.dndinventorymanager.com
POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD=<real password>
BETTER_AUTH_SECRET=<real secret>
```

Port `8080` is reserved for the existing D&D inventory manager. Use an exact Cloudflare Tunnel route
for this app. If the hostname is under `dndinventorymanager.com`, the exact route must be placed
above the existing `*.dndinventorymanager.com` wildcard route.

## First Deployment

1. Configure `.env.production` with real secrets and a loopback `APP_PORT`.
2. Validate the repo:

```bash
pnpm lint
pnpm test:unit
pnpm build
pnpm build:image
pnpm check:docs
```

3. Smoke test production Compose manually:

```bash
pnpm prod:up
curl http://127.0.0.1:8090/healthz
curl http://127.0.0.1:8090/openapi.json
pnpm prod:down
```

4. Install the host service:

```bash
sudo cp /home/sbolgert/workspace/dnd-character-manager/systemd/dnd-character-manager-prod.service /etc/systemd/system/dnd-character-manager-prod.service
sudo systemctl daemon-reload
sudo systemctl enable --now dnd-character-manager-prod.service
```

5. Add the public route in `/home/sbolgert/workspace/cloudflare-tunnel`, validate it, create the DNS
   route, then deploy `/etc/cloudflared/config.yml`.
6. Verify the public hostname:

```bash
curl -I https://characters.dndinventorymanager.com
```

## Routine App Deployment

Use this when the tunnel route and host service already exist.

1. Pull or checkout the intended revision in `/home/sbolgert/workspace/dnd-character-manager`.
2. Run validation locally.
3. Restart the production service:

```bash
sudo systemctl restart dnd-character-manager-prod.service
```

4. Verify:

```bash
systemctl status dnd-character-manager-prod.service
curl http://127.0.0.1:8090/healthz
curl -I https://characters.dndinventorymanager.com
```

The service unit runs `docker compose ... up -d --build`, so restart rebuilds the production image
from the current workspace revision and starts the updated containers.

## Data And Migrations

The app container runs migrations before starting the production server:

```bash
node dist/server/db-migrate.mjs && node dist/server/prod-server.mjs
```

Production data lives in the Docker Compose Postgres volume. Do not run `docker compose down -v`
against production unless intentionally deleting production data.

Before deploying schema changes:

- confirm migrations are committed
- run `pnpm test:integration` or `pnpm test` when database behavior changed
- take a database backup once real user data exists
- have a rollback plan for code and data compatibility

## Tunnel Deployment

Tunnel changes are production infrastructure changes. Use the shared tunnel workspace process:

```bash
cloudflared tunnel --config /home/sbolgert/workspace/cloudflare-tunnel/config.yml ingress validate
diff -u /etc/cloudflared/config.yml /home/sbolgert/workspace/cloudflare-tunnel/config.yml
sudo cp /home/sbolgert/workspace/cloudflare-tunnel/config.yml /etc/cloudflared/config.yml
sudo systemctl reload-or-restart cloudflared.service
```

When adding this app under `dndinventorymanager.com`, use an exact hostname route above the wildcard:

```yaml
  - hostname: characters.dndinventorymanager.com
    service: http://localhost:8090
  - hostname: "*.dndinventorymanager.com"
    service: http://localhost:8080
```

## Rollback

For app-only regressions:

1. Check out the previous known-good revision.
2. Restart `dnd-character-manager-prod.service` to rebuild and relaunch from that revision.
3. Verify local and public health checks.

For tunnel regressions:

1. Restore the previous `/etc/cloudflared/config.yml`.
2. Validate the restored config.
3. Restart `cloudflared.service`.
4. Verify every existing production hostname, not only this app.

For migration regressions, do not assume code rollback is enough. Data migrations may need a manual
forward fix or database restore.

## Operations

Inspect service status:

```bash
systemctl status dnd-character-manager-prod.service
journalctl -u dnd-character-manager-prod.service -n 120 --no-pager
```

Inspect app logs:

```bash
cd /home/sbolgert/workspace/dnd-character-manager
pnpm prod:logs
```

Inspect containers:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

