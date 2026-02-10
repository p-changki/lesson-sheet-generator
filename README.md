# english monorepo

pnpm workspaces setup with frontend and backend apps.

## Workspace Layout

- `apps/web`: Next.js frontend (frontend standard)
- `apps/api`: Express + TypeScript backend (backend standard)
- `packages`: shared packages (reserved)

## Requirements

- Node.js 20.19+ (`.nvmrc`)
- pnpm 10+

## Setup

```bash
nvm install
nvm use
pnpm install
pnpm run prepare
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Fill values in `apps/web/.env.local` and `apps/api/.env` before running dev servers.

## Run

```bash
pnpm run dev      # web + api together
pnpm run dev:web  # web only
pnpm run dev:api  # api only
```

## Quality Checks

```bash
pnpm run lint
pnpm run format:check
pnpm run type-check
pnpm run test
pnpm run build
```

## API Quick Check

When `apps/api` is running:

- `GET http://localhost:4000/health` -> `{ "status": "ok" }`
