# english monorepo

Turborepo + npm workspaces setup with frontend and backend standards.

## Workspace Layout

- `apps/web`: Next.js frontend (frontend standard)
- `apps/api`: Express + TypeScript backend (backend standard)
- `packages`: shared packages (reserved)

## Requirements

- Node.js 20.9.0 (`.nvmrc`)
- npm 10+

## Setup

```bash
nvm install
nvm use
npm install
npm run prepare
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Fill values in `apps/web/.env.local` and `apps/api/.env` before running dev servers.

## Run

```bash
npm run dev      # web + api together
npm run dev:web  # web only
npm run dev:api  # api only
```

## Quality Checks

```bash
npm run lint
npm run format:check
npm run type-check
npm run test
npm run build
```

## API Quick Check

When `apps/api` is running:

- `GET http://localhost:4000/health` -> `{ "status": "ok" }`
