# Passkeys And Account Creation Proposal

Status: proposal, not implemented. Written 2026-11-01 against Better Auth 1.6.13.

This proposal adds an explicit "create account" path and passkey sign-in on top of the current
anonymous-session plus email sign-in model described in [auth.md](./auth.md). It keeps email
(magic link or one-time code) as the recovery path and keeps anonymous workspaces as the default.

## Recommendation

1. Keep anonymous-first. Nobody has to create an account to use the app.
2. "Create account" and "Sign in" share one backend: verify an email with the existing link or
   code. Better Auth already creates the user on first verification and moves the anonymous
   session's characters. The difference is copy and what happens next.
3. Right after a successful email verification, offer to add a passkey to this device. Passkeys
   are an optional convenience layered on a verified email, never the only credential.
4. Add a "Sign in with passkey" button next to the email form. Keep email sign-in as the fallback
   and recovery path.
5. Do not let anonymous users register passkeys. A passkey on an account with no email has no
   recovery path.
6. Before building any UI, run a one-day device spike (issue 1 below). Passkey behavior inside an
   installed iOS home-screen app is the main unknown.

## What Better Auth Supports

- Passkeys ship as a separate package, `@better-auth/passkey`, built on SimpleWebAuthn. Version
  `1.6.13` exists and declares `better-auth ^1.6.13` as a peer, so it matches the repo's version.
  The plugin version must track the core version. The current core release is 1.7.x, so upgrading
  one means upgrading both.
- Endpoints: `/passkey/generate-register-options`, `/passkey/verify-registration`,
  `/passkey/generate-authenticate-options`, `/passkey/verify-authentication`,
  `/passkey/list-user-passkeys`, `/passkey/update-passkey`, `/passkey/delete-passkey`.
- By default, registration requires a fresh session (`registration.requireSession: true`).
  Passkey-first sign-up (`requireSession: false` plus `resolveUser`) exists, but this proposal does
  not use it, because it creates accounts with no verified email.
- The WebAuthn challenge is stored in a signed `better-auth-passkey` cookie plus a `verification`
  row that expires after five minutes.
- `rpID` defaults to the hostname of `BETTER_AUTH_URL` (`characters.dndinventorymanager.com`).
  `origin` defaults to the request `Origin` header. Set both explicitly.
- Conditional UI (passkey autofill) is supported through `autocomplete="username webauthn"` and
  `signIn.passkey({ autoFill: true })`.
- The anonymous plugin's account-link hook already matches `/passkey/verify-authentication`.
  Signing in with a passkey from an anonymous session therefore runs the existing character
  transfer, just like the link and code paths.

## Passkeys In Installed Apps

The useful property: a passkey is stored in the platform credential manager (iCloud Keychain or
Google Password Manager/Credential Manager) and scoped to the relying-party domain, not to a
browser's cookie jar. A passkey created in Safari should be usable from the home-screen app and
vice versa. That avoids the Safari-versus-home-screen split that broke magic links.

What the sources confirm, and what they don't:

- **iOS.** Safari on iOS 16+ creates synced, discoverable passkeys and supports conditional
  mediation. No primary Apple/WebKit source explicitly documents WebAuthn inside a standalone
  home-screen web app, and an Apple Developer Forums thread reports passkey problems when login
  pages are opened from Home Screen shortcuts (iOS 18.6.2). **Treat iOS standalone support as
  unverified until tested on Sam's phone.** WebKit also requires a user gesture for
  `navigator.credentials.create()`, so every passkey action must start from a button tap.
- **Android.** Chrome on Android 9+ supports passkeys stored in Google Password Manager. On
  Android 14+, Credential Manager also offers third-party providers. Installed Chrome PWAs run in
  Chrome rather than an embedded WebView, so they are expected to behave like Chrome. This is
  also unverified on device. Embedded WebViews (in-app browsers) need native bridging and are out
  of scope.
- **Desktop.** All current browsers support passkeys. Cross-device sign-in through a phone QR code
  works without extra code.

If the spike shows passkeys fail in the iOS standalone app, the one-time email code remains the
installed-app sign-in path and passkeys stay a browser convenience.

## UX Flow

Anonymous user, first time:

1. Uses the app anonymously as today.
2. Banner or menu item: "Create an account to keep your characters on every device."
3. "Create account" dialog: email field, then the existing link/code email, then the code step.
4. On success: characters transfer as today, then a prompt appears: "Sign in faster next time? Add
   a passkey to this device." [Add passkey] [Not now].
5. [Add passkey] runs `addPasskey` from the button tap. The default passkey name uses the device
   (`aaguid`) or "This device". Failures show a dismissible message and the account still works.

Returning user, signed out:

1. "Sign in" dialog shows [Sign in with passkey] above the email form. The email field uses
   `autocomplete="username webauthn"` so browsers that support passkey autofill can offer it.
2. A passkey sign-in from an anonymous session transfers that session's characters.
3. "Use email instead" keeps the existing link/code flow.

Signed-in user, account menu:

- "Passkeys" lists the user's passkeys (name, created date, device type) with rename and delete,
  plus [Add a passkey].

Lost passkey or new device (recovery):

1. Sign in with the email link or code.
2. Add a passkey on the new device. Optionally delete the lost one from "Passkeys".
3. No support-assisted recovery is needed while email stays a required credential.

Existing email on "Create account": verify as normal, which signs into the existing account.
Responses are identical for new and existing emails, so the flow does not reveal which emails have
accounts.

## Schema Changes

- New `passkey` table in `src/providers/auth/schema.ts` and a migration
  (`migrations/00NN_passkey.sql`): `id` uuid PK, `name` text null, `public_key` text, `user_id`
  uuid FK to `user` with `ON DELETE CASCADE`, `credential_id` text (unique index), `counter`
  integer, `device_type` text, `backed_up` boolean, `transports` text null, `created_at`
  timestamptz, `aaguid` text null, plus an index on `user_id`.
- No `user` changes are needed. `email`, `email_verified`, and `is_anonymous` already exist.
- Optional: Better Auth's `last-login-method` plugin to remember whether to show the passkey or
  email option first. Not needed for v1.

## Server Changes

- Add `passkey({ rpID, rpName: "D&D Character Manager", origin: BETTER_AUTH_URL })`. Derive
  `rpID` from `BETTER_AUTH_URL` in one place.
- Guard registration so anonymous users cannot add passkeys: either an app-owned route that checks
  `isAnonymous` before calling `auth.api.generatePasskeyRegistrationOptions`, or a Better Auth
  `before` hook on `/passkey/generate-register-options`.
- Decide between app-owned routes (matching the current magic-link and code pattern, with generated
  OpenAPI client calls) and the Better Auth client (`@better-auth/passkey/client`). WebAuthn
  ceremonies need `@simplewebauthn/browser` either way. Recommendation: app-owned routes for the
  list/rename/delete management actions, and the browser helper only for the two ceremonies.
- Update `docs/auth.md`, `docs/quality.md`, and `lints/boundary-modules.ts` for any new
  client-safe type modules.

## Testing

- Unit: registration guard, contracts, schema parsing.
- Integration: registration rejected for anonymous sessions, the passkey table cascades on user
  delete, and native endpoints exposed or blocked as decided.
- E2E: Chromium's virtual authenticator over CDP (`WebAuthn.addVirtualAuthenticator`) can cover
  add passkey → sign out → sign in with passkey → characters kept. **WebAuthn rejects IP-address
  origins**, and the local stack uses `127.0.0.1`. Browser tests need a `localhost` web URL and a
  matching `rpID: "localhost"`, which means a small stack/test-runner change.
- Manual: the iOS installed-app and Android installed-app checklist from issue 1, rerun before
  release.

## Risks

- **iOS standalone WebAuthn is unverified.** Mitigated by the spike and the email-code fallback.
- **The `rpID` is permanent.** Passkeys are bound to `characters.dndinventorymanager.com`. Moving
  the app to another hostname orphans every passkey. Choosing the registrable domain
  (`dndinventorymanager.com`) allows future subdomains but must be decided before the first
  passkey is created.
- **Origin checks behind the proxy.** Verification compares the browser `Origin` with the
  configured origin, so a misconfigured `BETTER_AUTH_URL` fails every ceremony in production.
- **Anonymous-account passkeys** would be unrecoverable. Mitigated by the registration guard.
- **Version coupling.** `@better-auth/passkey` must match `better-auth` exactly enough to satisfy
  its peer range. Upgrade them together.
- **Rate limiting.** App-owned routes bypass Better Auth's HTTP rate limiter (already true for the
  email routes). Add a per-IP limit before or with this work.

## Effort And Suggested Issues

Roughly 4–6 focused days in total.

1. **Spike: passkeys in installed apps (0.5–1 day).** Throwaway branch on a preview deploy. Verify
   register and sign-in in iOS Safari, iOS home-screen app, Android Chrome, and Android installed
   app. Record results in this doc. Go/no-go for iOS standalone.
2. **Server: passkey plugin, schema, and anonymous guard (1 day).** Migration, plugin config,
   `rpID`/origin config, registration guard, integration tests.
3. **Stack: localhost origin for WebAuthn browser tests (0.5 day).** Serve e2e on `localhost` and
   add a virtual-authenticator Playwright helper.
4. **UI: "Create account" entry point and post-verification passkey prompt (1 day).** Copy changes
   to the existing email dialog, the "Add a passkey" prompt, and e2e.
5. **UI: "Sign in with passkey" and autofill (1 day).** Button and conditional mediation, with
   character transfer from an anonymous session covered in e2e.
6. **UI: account "Passkeys" management (1 day).** List, rename, delete, add.
7. **Hardening: per-IP rate limits on auth routes (0.5 day).** Covers the email request, code
   verification, and passkey routes.

## Sources

- Better Auth passkey plugin docs: <https://www.better-auth.com/docs/plugins/passkey>
- `@better-auth/passkey@1.6.13` package source (endpoint list, schema, challenge storage, defaults)
- Google, passkey supported environments:
  <https://developers.google.com/identity/passkeys/supported-environments>
- Chrome for Developers, passkeys on Credential Manager:
  <https://developer.chrome.com/blog/passkeys-on-credential-manager>
- passkeys.dev Android reference: <https://passkeys.dev/docs/reference/android/>
- Apple Developer Forums, passkeys in iCloud Keychain (home-screen shortcut report):
  <https://developer.apple.com/forums/tags/passkeys-in-icloud-keychain?page=7>
- Safari passkey support by version:
  <https://mojoauth.com/blog/does-safari-support-passkeys-version-by-version>
