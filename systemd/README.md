# Production Service

This directory contains the host systemd unit for running the production Docker Compose stack.

The unit is a source copy only. Installing it changes host service state, so install intentionally.

## Configure

Create the production env file:

```bash
cd /home/sbolgert/workspace/dnd-character-manager
cp .env.production.example .env.production
```

Set real secrets and use a loopback-bound host port. Port `8080` is already used by the existing D&D inventory manager service.

Recommended host values for the Cloudflare Tunnel deployment:

```env
APP_PORT=127.0.0.1:8090
BETTER_AUTH_URL=https://characters.dndinventorymanager.com
POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD=<real password>
BETTER_AUTH_SECRET=<real secret>
```

## Manual Smoke Test

```bash
pnpm prod:up
curl http://127.0.0.1:8090/healthz
curl http://127.0.0.1:8090/openapi.json
pnpm prod:down
```

## Install

```bash
sudo cp /home/sbolgert/workspace/dnd-character-manager/systemd/dnd-character-manager-prod.service /etc/systemd/system/dnd-character-manager-prod.service
sudo systemctl daemon-reload
sudo systemctl enable --now dnd-character-manager-prod.service
```

## Operate

```bash
systemctl status dnd-character-manager-prod.service
journalctl -u dnd-character-manager-prod.service -n 120 --no-pager
cd /home/sbolgert/workspace/dnd-character-manager
pnpm prod:logs
```

## Stop

```bash
sudo systemctl stop dnd-character-manager-prod.service
```

