# MVP Plan

Last verified: 2026-09-01

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

The original name/class/level character slice is the pre-inventory foundation. The next scoped
implementation baseline is M1 Personal Treasury followed by M2 Personal Inventory; later party
milestones remain a roadmap after those character workflows are complete.

## Feature Specifications

- [Character creation MVP product spec](./character-creation-mvp-spec.md)
- [Character health MVP product spec](./character-health-mvp-spec.md)
- [Character attributes, proficiencies, and roll reference product spec](./character-attributes-rolls-spec.md)
- [Character detail navigation and layout design spec](./character-detail-navigation-design-spec.md)
- [D&D 5e catalogue source strategy](./superpowers/specs/2026-07-12-dnd5e-catalogue-source-strategy-design.md)
- [Character and party inventory product spec](./party-inventory-merge-spec.md)
- [Character and party inventory execution plan](./party-inventory-merge-plan.md)
- [Character and party inventory milestones](./party-inventory-milestones.md)

## Inventory Release Baseline

The next character-first releases are deliberately split into two complete user workflows:

- **M1 Personal Treasury:** A1-A4 provide independent PP, GP, SP, and CP balances for each
  character, including add, spend, making-change, persistence, and insufficient-funds behavior.
- **M2 Personal Inventory:** C1-C2 and A5-A7 provide personal item CRUD, catalogue search and
  auto-fill, filters, details, equip/unequip, and persistence without requiring a party.

The implementation stack remains `Types -> Config -> Repo -> Service -> Runtime -> UI`. M2 cannot
ship until C1 has encapsulated the third-party catalogue boundary and pinned source/provenance rules,
and C2 has delivered typed Foundry equipment ingestion, catalogue-owned search/detail APIs, readiness
status, and source-audit counts. Each milestone requires manual acceptance in a running stack plus a
focused Playwright e2e gate; the detailed checklists and commands live in
[party-inventory-milestones.md](./party-inventory-milestones.md).

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
- Character deletion.
- Character class editing.
- Race, background, subclass, ability scores, proficiencies, character-creation equipment loadouts,
  spell notes, and feature notes.
- Full hit point rules, temporary hit points, death saves, rests, damage types, and healing
  automation.
- Full character-builder rules automation.
- Published rules compendium content.
- Campaign management.
- Real-time collaboration.
- External auth providers.
- Payment or sharing features.
