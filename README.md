# Todos App (Express + React)

A React UI with an Express/TypeORM API and an embedded SQLite database. The API
owns accounts, cookie sessions, and each user's private todos.

```bash
git clone --recurse-submodules https://github.com/jerrylusato/todos-app.git
cd todos-app
```

For an existing checkout, use `git submodule sync --recursive` followed by
`git submodule update --init --recursive`.

## Running modes

Run one mode at a time: all three use UI `http://localhost:3000` and API
`http://localhost:8080` (Swagger `/docs`, health `/health`). No external database
server is required. Register an account first; there are no seeded login credentials.

### 1. Local API and UI services

Requires Node.js 20 or newer and Yarn Classic (1.x). In one terminal:

```bash
cd todos-api
yarn install --frozen-lockfile
yarn dev
```

In another terminal, from the main repository:

```bash
cd todos-ui
yarn install --frozen-lockfile
yarn dev
```

The browser calls `http://localhost:8080` with session cookies. The API creates
`todos-api/data.sqlite`, which persists on restart. Its environment defaults are
`PORT=8080`, `CORS_ORIGIN=http://localhost:3000`, and `SESSION_TTL_DAYS=7`.
The API reads process environment variables; prefix `yarn dev` to override them.
The UI reads Vite `.env.local` settings (`VITE_API_URL`); restart Vite after changes.
Stop both services with Ctrl+C. API source changes require restarting `yarn dev`;
UI source changes reload automatically.

See [API local setup](todos-api/README.md) and [UI local setup](todos-ui/README.md).

### 2. Docker development

Requires Docker with Compose v2:

```bash
docker compose -f compose.yml up -d --build --wait
```

The API runs with `NODE_ENV=development`; UI runs Vite. Sources are bind-mounted,
with separate Linux `node_modules` volumes. UI edits hot reload; restart the API
container after API edits (`docker compose -f compose.yml restart api`). The
browser uses same-origin `/api/v1`; Vite forwards requests to `http://api:8080`.
The UI waits for API health before startup. After dependency changes, rebuild
and renew dependency volumes with `up -d --build --renew-anon-volumes --wait`.

```bash
docker compose -f compose.yml logs -f
docker compose -f compose.yml down
```

### 3. Docker production

```bash
docker compose -f compose.prod.yml up -d --build --wait
```

The API runs compiled JavaScript with `NODE_ENV=production`; Nginx serves the
compiled UI and forwards `/api/v1` to `http://api:8080`. SPA routes work on direct
navigation and reload. No source bind mounts or Vite server are used.

The supplied ports support HTTP local testing, so this Compose file explicitly
defaults `SESSION_COOKIE_SECURE=false`. For an HTTPS deployment, terminate TLS
in front of the UI and set `SESSION_COOKIE_SECURE=true` when starting Compose.
Keep UI and API requests on the same origin
through the proxy. This file does not configure a public hostname or TLS.

```bash
docker compose -f compose.prod.yml logs -f
docker compose -f compose.prod.yml down
```

Both Docker modes use the Compose-managed `todos_app_network` bridge and
`todos_app_data` named volume at `/app/data/data.sqlite`. Using the same Compose
project shares this database between modes; `-p <name>` isolates projects.
`down` preserves data; `down -v` deletes it. Stop the current mode before switching.
TypeORM currently uses `synchronize: true` in every mode; back up the SQLite
volume before deploying schema changes.

## Verification

In each service repository, run `yarn test` and `yarn build`. The API suite
enforces 90% coverage thresholds. To check UI coverage, use `yarn test --coverage`.

After starting each mode, open the UI, register, sign out, sign in, add a todo,
and reload `/todos` to verify the session and saved todo persist. Also restart
the API and reload to check database persistence. The smoke test creates unique
test accounts and checks real HTTP authentication, CRUD, and user isolation:

```bash
node scripts/smoke-test.mjs local
# For either Docker mode, exercise the UI proxy:
SMOKE_API_URL=http://localhost:3000 node scripts/smoke-test.mjs docker
```

The script deletes its own todo; test accounts remain in the selected database.
