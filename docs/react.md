# React Conventions

Last verified: 2026-05-31

React code should be explicit, local, and easy for agents to modify without creating hidden synchronization paths.

## Core Rules

- Do not use `useEffect` in application source.
- Use `useState` for local interaction state: form inputs, open/closed controls, selected tabs, optimistic UI flags, and transient UI state.
- Use TanStack Query for server state: fetching, caching, invalidation, loading state, and mutations.
- Derive values during render when they can be computed from props, query results, or local state.
- Put side effects in event handlers, mutation callbacks, route handlers, or provider-level adapters instead of component lifecycle effects.

## Component Shape

- Keep components focused on one workflow or display concern.
- Prefer named function components.
- Keep state close to the component that owns the interaction.
- Extract a child component when state ownership or rendering branches become hard to scan.
- Parse API data before it reaches UI components; UI should render typed domain values.

## Mantine UI Patterns

Mantine is the default UI library for browser-visible app code.

- Wrap browser UI with `AppProviders` from `src/app/app-providers.tsx`; it owns `MantineProvider` and `AppQueryProvider`.
- Keep the theme in `src/app/theme.ts`. The app defaults to dark mode with `defaultColorScheme="dark"`.
- Prefer Mantine components over raw form controls and buttons: `Button`, `TextInput`, `NumberInput`, `Select`, `Checkbox`, `SegmentedControl`, `Tabs`, `Modal`, `Alert`, `Paper`, `Stack`, and `Group`.
- Use Mantine props and theme tokens before custom CSS: `c`, `bg`, `p`, `px`, `py`, `gap`, `radius`, `size`, `variant`, and theme color names.
- Use CSS modules or a focused app-level CSS file only when component props cannot express the layout or state cleanly.
- Avoid inline styles except for tiny compatibility bridges that Mantine props do not cover.
- Keep repeated tool-like surfaces at `radius="sm"` unless the product theme changes; avoid large rounded cards for dense app workflows.
- Preserve semantic HTML with Mantine's `component` prop when needed, for example `Box component="form"`.

## Mantine Form Patterns

Use `@mantine/form` for user-editable forms.

- Use `useForm` with explicit `initialValues` and `validate`.
- Use `form.getInputProps("fieldName")` to wire Mantine inputs.
- Use `form.onSubmit((values) => ...)` for submit handlers.
- Use `mode: "controlled"` for small forms and `mode: "uncontrolled"` for large character sheets when per-keystroke re-renders become expensive.
- Trim or normalize submitted values in the submit handler before calling generated API mutations.
- Reset forms from mutation success callbacks when persistence succeeds.

## State Patterns

Use `useState` for state caused by user interaction:

```tsx
const [newName, setNewName] = useState("");
```

Use derived values for anything that can be calculated:

```tsx
const visibleItems = items.filter((item) => item.status !== "archived");
```

Use TanStack Query for remote data and mutations:

```tsx
const itemsQuery = useQuery({
	queryKey: ["items"],
	queryFn: fetchItems,
});
```

## Avoiding `useEffect`

Common replacements:

| Instead Of | Use |
|------------|-----|
| Fetching in `useEffect` | `useQuery` |
| Posting in `useEffect` | `useMutation` from an event handler |
| Syncing props into state | Derived render values or a controlled component |
| Resetting state after submit | Mutation success callback or the submit handler |
| Watching state to call another setter | A single event handler that updates both states |

If behavior appears to require `useEffect`, move the side effect to a clearer boundary first: a query, mutation, event handler, provider, or server route.
