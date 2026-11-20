# Waymark — personal job application tracker

React + Node.js + Postgres in an npm workspace. Start with a company and role, then track answers, your CV reference, next actions, and interview preparation.

## Run everything with Docker

Requires Docker with Compose. From this directory:

```sh
npm start
```

Or, without Node installed on your host:

```sh
docker compose up --build -d --wait
```

Open http://localhost:3001. The Node server serves both the built React frontend and the API. Postgres uses a named Docker volume, so data survives refreshes, restarts, rebuilds, and `docker compose down`.

```sh
npm stop                       # stop app and DB, preserve data
npm start                      # start again
```

**Do not use `docker compose down -v` unless you intend to delete all tracker data.**

## Development

Requires Node.js 24+ and Docker:

```sh
npm ci
npm run dev
```

Open http://localhost:5173. This starts Postgres, the watched Node API on port 3001, and Vite on port 5173. Stop the containerized app first (`docker compose stop app`) if it already occupies port 3001. Ctrl+C stops the development servers; `npm stop` also stops Postgres.

```sh
npm run typecheck
npm test
npm run build
npm run format
```

## Daily workflow

- Add an application using just company and role. Open it by clicking its company/role in the list.
- Edit details, rate it (click the same star again to clear), record a filename/version/link for your CV, and add submitted questions and answers.
- Add named interview stages with dates, statuses, summaries, and multiline notes. Use the up/down controls to reorder them. Choose the current stage independently of the overall application status.
- Round numbers follow stage order. Leave total rounds empty until known; the total must be at least the number of stages you have added.
- Set one optional next action and due date. Save changes explicitly. Leaving an unsaved detail screen prompts before discarding.
- Search company/role, filter overall status, and sort by rating or next action date. Unrated applications and undated actions sort last.

## Layout and conventions

- `apps/web/src/App.tsx`: composes the shell, pages, and add dialog.
- `apps/web/src/components`: shared UI components with adjacent CSS (shell, cards, fields, badges, ratings, headings, feedback).
- `apps/web/src/pages`: list page, add dialog, and detail page with opportunity, questions, interview stages, and sidebar sections. Page/section styles live beside their components.
- `apps/web/src/hooks/useApplicationTracker.ts`: application loading, draft edits, saves, and unsaved-change protection.
- `apps/web/src/api`: typed application API methods and the shared fetch client.
- `apps/web/src/styles`: only shared global defaults and control/utility styles.
- `apps/api/src/index.ts`: database initialization and server lifecycle.
- `apps/api/src/app.ts`: Express composition, static frontend, and shared error handling.
- `apps/api/src/health/routes.ts`: database-backed health endpoint.
- `apps/api/src/applications`: application routes/validation and a separate Postgres repository.
- `apps/api/src/db`: database pool creation and schema initialization.
- `packages/shared`: shared TypeScript models, Zod validation, and workflow tests.
- `compose.yaml`: app + Postgres 17, health checks, persistent volume.

Reuses the Node Starter's ES modules, TypeScript, Pino logger implementation, Vitest testing convention, and Prettier/ESLint configurations. The starter remains untouched. ESLint configuration is retained for extension; no lint script/dependencies are installed in v1.

The API creates its initial `applications` table on startup. Each application is one validated JSONB document; questions and ordered stages are saved atomically with it. Metadata lives in typed UUID and timestamp columns. This keeps v1 compact while leaving room for later migrations and normalized tables.

`DATABASE_URL` and `PORT` may be supplied as process environment variables for a different database/API port. The development defaults match Compose; production Compose injects its internal database URL. `.env` files are not automatically loaded by the Node server.

This version is a personal local app with no authentication. Docker publishes only to localhost; its database credentials are for local development. Use authentication and private networking before hosting beyond your machine. Changes from concurrent editors use last-save-wins.

Out of scope: transcripts, AI integrations, uploads, reminders, and Kanban.

## Persistence verification

With the Docker app running, execute `node scripts/verify-persistence.mjs`. It creates a disposable record, saves all core fields, recreates both containers, compares every field, and removes only its own test record. This briefly interrupts the local app.
