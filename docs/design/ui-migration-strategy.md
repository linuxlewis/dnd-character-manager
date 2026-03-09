# UI Migration Strategy: CSS Modules → shadcn/ui + Tailwind

## Overview

This document describes the gradual migration from CSS Modules to shadcn/ui components with Tailwind CSS. Both systems coexist — no big-bang rewrite required.

## Architecture

```
theme.css          → Legacy CSS custom properties (--color-*, --space-*, --font-*)
globals.css        → Tailwind + shadcn/ui design tokens (HSL-based CSS variables)
*.module.css       → Existing component styles (keep working as-is)
components/ui/*.tsx → New shadcn/ui primitives (Tailwind classes)
```

Both `theme.css` and `globals.css` are imported in `main.tsx`. The legacy variables and the new Tailwind theme variables coexist without conflict.

## Design Token Mapping

The existing theme variables map to shadcn/ui tokens as follows:

| Legacy Variable | shadcn/ui Token | Usage |
|---|---|---|
| `--color-bg` | `--background` | Page background |
| `--color-surface` | `--card` | Card/panel backgrounds |
| `--color-text` | `--foreground` | Primary text |
| `--color-text-secondary` | `--muted-foreground` | Secondary text |
| `--color-primary` | `--primary` | Primary actions |
| `--color-border` | `--border` | Border color |
| `--color-danger` | `--destructive` | Destructive actions |
| `--color-success` | `--success` | Success states |
| `--color-warning` | `--warning` | Warning states |
| `--color-input-bg` | `--input` (bg is transparent) | Input backgrounds |
| `--color-input-border` | `--input` | Input borders |

### D&D Fantasy Tokens

Additional tokens for the D&D aesthetic:

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--parchment` | Warm off-white | Dark warm brown | Character sheet backgrounds |
| `--gold` | Bright gold | Muted gold | Level-up, achievements, rare items |
| `--blood` | Dark crimson | Medium red | HP loss, critical damage |
| `--arcane` | Purple | Light purple | Spell slots, magic items |
| `--nature` | Forest green | Emerald | Nature/druid, healing |
| `--steel` | Slate gray | Dark gray | AC, equipment, weapons |

Use via Tailwind: `bg-parchment`, `text-gold-foreground`, `border-arcane`, etc.

## Migration Steps Per Component

### 1. Start with leaf components

Migrate simple, self-contained components first (badges, labels, small sections).

### 2. Replace CSS module imports

```tsx
// Before
import styles from "./MyComponent.module.css";

export function MyComponent() {
  return <div className={styles.container}>...</div>;
}

// After
import { cn } from "@/lib/utils.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>...</CardTitle>
      </CardHeader>
      <CardContent>...</CardContent>
    </Card>
  );
}
```

### 3. Mixed mode is fine

During migration, a component can use both CSS modules and Tailwind classes:

```tsx
import styles from "./MyComponent.module.css";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";

export function MyComponent() {
  return (
    <div className={styles.container}>
      <h2 className={cn(styles.title, "font-heading")}>Title</h2>
      <Button variant="default">New Action</Button>
    </div>
  );
}
```

### 4. Delete CSS module when fully migrated

Once a component uses only Tailwind classes and shadcn/ui primitives, delete the `.module.css` file.

## Adding New shadcn/ui Components

Use the shadcn/ui CLI:

```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add select
```

Components are installed to `src/app/components/ui/`. They are plain `.tsx` files you own and can modify.

## Available Components

Installed core components:

- `Button` — Primary actions with variants (default, destructive, outline, secondary, ghost, link)
- `Input` — Text input field
- `Textarea` — Multi-line text input
- `Card` — Container with header, content, footer sections
- `Label` — Accessible form labels
- `Badge` — Status indicators
- `Separator` — Visual divider

## Theming

Dark/light mode uses the existing `ThemeProvider` and `data-theme` attribute. Both the legacy CSS variables and the shadcn/ui HSL variables respond to `[data-theme="dark"]`, so the toggle works for both old and new components.

## File Structure

```
src/app/
├── globals.css              # Tailwind + shadcn/ui tokens
├── theme.css                # Legacy CSS variables (keep during migration)
├── lib/
│   └── utils.ts             # cn() utility for class merging
├── components/
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── textarea.tsx
│       ├── card.tsx
│       ├── label.tsx
│       ├── badge.tsx
│       └── separator.tsx
└── hooks/                   # Shared React hooks (future)
```

## Priority Order for Migration

1. **CharacterForm** — Most form elements, benefits most from Input/Label/Button
2. **CharacterList** — Card grid, benefits from Card component
3. **CharacterSheet sections** — Equipment, Notes, Saving Throws
4. **CharacterSheet main** — Large component, migrate last
5. **App shell** — Header, layout (low priority, already clean)
