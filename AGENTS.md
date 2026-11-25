# Agent instructions

When the user asks you to update the job tracker with new data, you may bypass the frontend and use the backend APIs directly.

## Backend layout

Start in `apps/api/src/<domain>/http/` to find a route. For new logic, use the folder that owns it.

- `http/` handles request validation and responses.
- `services/` coordinates workflows. Simple CRUD routes can call a repository directly.
- `persistence/` handles SQL and file storage. `clients/` handles external APIs and network calls.
- `entities/` holds domain rules. Use `parsing/` and `rendering/` for format-specific logic.

`app.ts` wires dependencies together. Add folders as the domain needs them.
