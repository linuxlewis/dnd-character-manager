# DnD Character Manager

A **D&D 5e character manager** built with modern web technologies. Create, manage, and track your Dungeons & Dragons 5th Edition characters — including hit points, skills, equipment, spells, and more.

## Tech Stack

| Layer     | Technology                |
| --------- | ------------------------- |
| Frontend  | React 19, Vite 7          |
| Backend   | Fastify 5, TypeScript     |
| Database  | Drizzle ORM, SQLite       |
| Linting   | Biome                     |
| Testing   | Vitest                    |
| Runtime   | Node.js ≥ 22              |

## Setup & Installation

```bash
# Clone the repository
git clone <repo-url>
cd dnd-character-manager

# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Start development servers (frontend + backend)
pnpm dev
```

The app runs on **port 4000** by default.

## Scripts

| Script          | Description                                      |
| --------------- | ------------------------------------------------ |
| `pnpm dev`      | Start both server and web dev servers concurrently |
| `pnpm dev:server` | Start only the Fastify backend (with watch)     |
| `pnpm dev:web`  | Start only the Vite frontend dev server          |
| `pnpm build`    | Typecheck and build the frontend for production  |
| `pnpm test`     | Run all tests with Vitest                        |
| `pnpm test:watch` | Run tests in watch mode                        |
| `pnpm lint`     | Run Biome checks and architectural lint          |
| `pnpm lint:fix` | Auto-fix linting issues                          |
| `pnpm format`   | Format code with Biome                           |
| `pnpm db:generate` | Generate Drizzle ORM migrations               |
| `pnpm db:migrate`  | Run database migrations                        |
| `pnpm check:docs`  | Verify documentation freshness                 |

## Project Structure

```
src/
├── app/                        # Frontend application (React + Vite)
│   ├── app.tsx                 # Root app component
│   ├── main.tsx                # Entry point
│   ├── router.tsx              # Client-side routing
│   └── vite.config.ts          # Vite configuration
├── domains/
│   └── character/              # Character domain (layered architecture)
│       ├── types/              # Type definitions and validation
│       ├── repo/               # Data access layer (Drizzle ORM)
│       ├── service/            # Business logic
│       ├── runtime/            # Fastify route handlers
│       └── ui/                 # React components
├── providers/
│   └── telemetry/              # Logging and observability
└── server.ts                   # Fastify server entry point
```

### Layered Architecture

Each domain follows the pattern: **Types → Config → Repo → Service → Runtime → UI**

- **Types** — Data shapes, validation, constants
- **Repo** — Database access via Drizzle ORM
- **Service** — Business logic and orchestration
- **Runtime** — HTTP route handlers (Fastify)
- **UI** — React components

## API Endpoints

### Characters CRUD

| Method   | Endpoint                  | Description              |
| -------- | ------------------------- | ------------------------ |
| `GET`    | `/api/characters`         | List all characters      |
| `POST`   | `/api/characters`         | Create a new character   |
| `GET`    | `/api/characters/:id`     | Get a character by ID    |
| `PUT`    | `/api/characters/:id`     | Update a character       |
| `DELETE` | `/api/characters/:id`     | Delete a character       |

### Character Actions

| Method   | Endpoint                              | Description                    |
| -------- | ------------------------------------- | ------------------------------ |
| `POST`   | `/api/characters/:id/damage`          | Apply damage to a character    |
| `POST`   | `/api/characters/:id/heal`            | Heal a character               |
| `POST`   | `/api/characters/:id/skills/:name`    | Update a character's skills    |
| `POST`   | `/api/characters/:id/equipment`       | Add equipment to a character   |
| `DELETE` | `/api/characters/:id/equipment/:itemId` | Remove equipment             |
| `POST`   | `/api/characters/:id/spells/:level`   | Add spells to a character      |
| `POST`   | `/api/characters/:id/long-rest`       | Perform a long rest            |

## Screenshots

> _Screenshots coming soon. Run `pnpm dev` and visit `http://localhost:4000` to see the app in action._

## Contributing

1. **Fork** the repository
2. **Create a branch** for your feature: `git checkout -b feat/my-feature`
3. **Install dependencies**: `pnpm install`
4. **Make your changes** following the layered architecture pattern
5. **Write tests** for new functionality
6. **Run checks** before committing:
   ```bash
   pnpm lint
   pnpm test
   pnpm build
   ```
7. **Commit** with a clear message: `feat: add new feature`
8. **Open a Pull Request** with a description of your changes

### Code Style

- Code is formatted and linted with [Biome](https://biomejs.dev/)
- Run `pnpm format` and `pnpm lint:fix` to auto-fix issues
- Follow the existing layered architecture when adding new domains

## License

This project is private and not currently published under an open-source license.
