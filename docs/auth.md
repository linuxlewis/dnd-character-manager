# Authentication

Last verified: 2026-06-29

This document describes the authentication system as it exists today. It is not a future account
roadmap.

## Current State

Authentication is implemented as an anonymous browser-session baseline:

- The server uses Better Auth with the anonymous plugin.
- Session and user records are stored in Postgres through the Drizzle adapter.
- The browser receives a server-owned session cookie from Better Auth.
- The React app bootstraps the current user with `GET /api/current-user`.
- User-visible sign-up, sign-in, sign-out, account linking, recovery, and account settings do not
  exist yet.

This matches the MVP direction in [mvp.md](./mvp.md): scope character data to a browser session now
and layer visible accounts on top later.

## Runtime Flow

The server registers auth routes from `src/providers/auth/routes.ts`:

| Route | Purpose |
|-------|---------|
| `/api/auth/*` | Pass-through route for Better Auth handlers |
| `GET /api/current-user` | App bootstrap route that returns or creates the current anonymous user |

`GET /api/current-user` is intentionally stateful:

1. Convert Fastify request headers into Better Auth headers.
2. Call `auth.api.getSession({ returnHeaders: true })`.
3. Forward any Better Auth `Set-Cookie` headers to the Fastify reply.
4. If a session exists, return the public current-user shape.
5. If no session exists, call `auth.api.signInAnonymous({ returnHeaders: true })`.
6. Forward the new session cookie and return the new anonymous user.

The public response shape is:

```ts
{
	user: {
		id: string;
		isAnonymous: boolean;
		name: string;
	};
}
```

The app does not expose Better Auth's internal session, token, account, or verification records to
the browser.

## Frontend Flow

`src/app/current-user-provider.tsx` calls the generated `apiQueries.getCurrentUser()` helper.
`App` waits for this query before rendering character workflows.

The UI treats the session as a browser-local workspace:

- While the query is loading, the app shows a session startup state.
- If the query fails, the app shows a recoverable session error.
- If the query succeeds, child UI can assume a current user exists.

The generated API client currently relies on same-origin requests. Development uses the Vite `/api`
proxy, and production serves the built React app and API from the same Fastify origin. If the web app
and API are split across origins later, the generated client and server CORS/cookie settings must be
updated intentionally.

## Data Model

Auth tables are defined in `src/providers/auth/schema.ts` and created by
`migrations/0001_auth.sql`.

| Table | Purpose |
|-------|---------|
| `user` | Better Auth user record, including `is_anonymous` |
| `session` | Server-side session records keyed by Better Auth token |
| `account` | Provider account records for future linked accounts or credentials |
| `verification` | Future verification tokens such as email or recovery flows |

The schema already supports account rows, provider IDs, tokens, and verification records because it
uses Better Auth's table shape. The application does not currently provide any user-facing flow that
creates or manages non-anonymous accounts.

Deleting a `user` cascades to its `session`, `account`, and character records through foreign keys.

## Character Ownership

Character routes never trust a browser-supplied user ID.

Each character route calls the current-user provider, extracts `currentUser.user.id`, and passes that
ID into the character service. Character repository queries filter by `characters.user_id` before
listing, reading, or mutating character-owned data.

The current behavior is:

- A browser with no valid session gets a new anonymous user.
- A browser with an existing valid session reuses the same anonymous user.
- Characters are visible only to the user ID attached to the current session.
- Looking up another user's character returns not found rather than exposing ownership details.

## Configuration

`src/providers/auth/auth.ts` owns auth configuration.

| Variable | Purpose |
|----------|---------|
| `BETTER_AUTH_SECRET` | Secret used by Better Auth; required when `NODE_ENV=production` |
| `BETTER_AUTH_URL` | Public app URL used by Better Auth |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated list of browser origins trusted by Better Auth |
| `HOST` / `PORT` | Used only to build a local default auth URL when `BETTER_AUTH_URL` is not set |

Local development uses a built-in development secret when `BETTER_AUTH_SECRET` is absent. Production
must provide a real secret through the deployment environment.

The development stack sets:

- `BETTER_AUTH_URL` to the web URL.
- `BETTER_AUTH_TRUSTED_ORIGINS` to the web URL.
- `DATABASE_URL` to the worktree-local Postgres container.

Production configuration is documented in [production.md](./production.md) and
[deployment.md](./deployment.md).

## Account Management

Account management is not implemented.

There is currently no:

- sign-up page
- sign-in page
- sign-out button
- password or email flow
- external identity provider
- account linking flow
- anonymous-to-permanent-account migration
- profile or account settings UI
- session management UI

The `account` and `verification` tables are present so those features can be layered in later without
remodeling user ownership. Until then, the browser session cookie is the user's only handle to their
workspace.

If the cookie is deleted, expires, or the user changes browsers/devices, the app creates a different
anonymous user and the previous browser-scoped characters are not visible from the new session.

## Tests

Current coverage includes:

- Auth config helper unit tests in `src/providers/auth/auth.test.ts`.
- Current-user response schema tests in `src/providers/auth/current-user.test.ts`.
- Session cookie forwarding tests in `src/providers/auth/session.test.ts`.
- Auth route adapter tests in `src/providers/auth/routes.test.ts`.
- Current-user provider UI tests in `src/app/current-user-provider.test.tsx`.
- Session reuse e2e coverage in `tests/e2e/session-flow.spec.ts`.
- Character route integration coverage proving another session user's character is not exposed.

## Known Limitations

- `GET /api/current-user` creates anonymous users as a side effect. This is intentional for the MVP,
  but production should eventually add cleanup, rate limiting, or another guard against unbounded
  anonymous account/session growth.
- There is no account recovery. Losing the browser cookie means losing access to that anonymous
  workspace through normal app flows.
- There is no user-facing way to inspect, revoke, or transfer sessions.
- The generated API client assumes same-origin browser requests today.
- Visible account features need an explicit product and migration design before implementation.

## When Changing Auth

Before changing authentication behavior:

1. Keep auth code in `src/providers/auth/`.
2. Preserve the rule that domain routes derive user identity server-side.
3. Update route contracts and run `pnpm api:generate` if browser-callable auth APIs change.
4. Add integration coverage for session and ownership behavior.
5. Add e2e coverage for any user-visible sign-in, sign-out, or account-management journey.
6. Update this document and [quality.md](./quality.md).
