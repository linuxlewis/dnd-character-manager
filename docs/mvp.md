# MVP Plan

Last verified: 2026-05-31

This document captures the current product direction before the first D&D domain is implemented.
Keep it short, concrete, and updated when scope changes.

## Product Goal

D&D Character Manager should help players create, edit, and reference D&D 5e characters. The first
MVP should favor dependable user-entered data and clear workflows over deep automation.

## Initial Scope

- Support D&D 5e as the first game target.
- Store user-created characters with names, basic identity fields, ability scores, hit points,
  proficiencies, equipment notes, spell notes, and free-form feature notes.
- Avoid broad rules-data ingestion in the first slice. Add rules automation only after the data
  ownership, licensing, and source-of-truth model is explicit.
- Preserve the agent-first layered architecture: Types -> Config -> Repo -> Service -> Runtime -> UI.

## User And Auth Direction

- Design the data model for multiple users from the start.
- Implement a simple session-cookie mechanism before adding external identity providers.
- Prefer server-owned session records in Postgres with secure, HTTP-only cookies.
- Keep account/session logic in a dedicated auth provider or auth domain instead of mixing it into
  character logic.
- Authorization checks should happen at runtime/service boundaries before returning or mutating
  user-owned character records.

## Suggested First Milestone

1. Add an `auth` provider or domain for local users and sessions.
2. Add a `characters` domain starting in `types/`.
3. Replace the template `example` domain only after the character vertical slice exists.
4. Add API contracts and regenerate the OpenAPI client.
5. Add a minimal UI for listing, creating, and editing one user's characters.
6. Add unit tests for schemas and services, integration tests for session and character persistence,
   and one e2e flow for signing in and editing a character.

## Out Of Scope For The Seed

- Full character-builder rules automation.
- Published rules compendium content.
- Campaign management.
- Real-time collaboration.
- External auth providers.
- Payment or sharing features.
