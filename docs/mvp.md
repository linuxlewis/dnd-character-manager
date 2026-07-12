# MVP Plan

Last verified: 2026-06-02

This document captures the current product direction before the first D&D domain is implemented.
Keep it short, concrete, and updated when scope changes.

## Product Goal

D&D Character Manager should help players create and reference D&D 5e characters. The first MVP
should favor dependable user-entered data and clear workflows over deep automation.

## Initial Scope

- Support D&D 5e as the first game target.
- Deliver the first character vertical slice: create, persist, list, and view a character with only
  name, class, and level.
- Treat simple health tracking as a separate character-detail module rather than part of character
  creation.
- Avoid broad rules-data ingestion in the first slice. Add rules automation only after the data
  ownership, licensing, and source-of-truth model is explicit.
- Preserve the agent-first layered architecture: Types -> Config -> Repo -> Service -> Runtime -> UI.

## Feature Specifications

- [Character creation MVP product spec](./character-creation-mvp-spec.md)
- [Character health MVP product spec](./character-health-mvp-spec.md)

## User And Auth Direction

- Design the data model for multiple users from the start.
- Use a browser-based session cookie to scope the first character workflows.
- Automatically create an anonymous user/session when needed.
- Layer visible accounts and sign-in flows on top of the session model later.
- Implement a simple session-cookie mechanism before adding external identity providers or shared
  multi-user workflows.
- Prefer server-owned session records in Postgres with secure, HTTP-only cookies.
- Keep account/session logic in a dedicated auth provider or auth domain instead of mixing it into
  character logic.
- Authorization checks should happen at runtime/service boundaries before returning or mutating
  user-owned character records.

## Suggested First Milestone

1. Add a `characters` domain starting in `types/`.
2. Add persistence and service logic for name, class, and level.
3. Add API contracts and regenerate the OpenAPI client.
4. Add a minimal UI for creating, listing, and viewing characters.
5. Build the character slice on the auth/session baseline now in the app shell.
6. Add unit tests for schemas and services, integration tests for character persistence and routes,
   and one e2e flow for creating a character and opening its detail page.

## Out Of Scope For The Seed

- User-visible sign-up/sign-in unless auth is explicitly pulled into the first implementation pass.
- Character editing and deletion.
- Race, background, subclass, ability scores, proficiencies, equipment, spell notes, and feature
  notes.
- Full hit point rules, temporary hit points, death saves, rests, damage types, and healing
  automation.
- Full character-builder rules automation.
- Published rules compendium content.
- Campaign management.
- Real-time collaboration.
- External auth providers.
- Payment or sharing features.
