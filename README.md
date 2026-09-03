# DeckuDB

DeckuDB is a full-stack Nuxt application that collects community reports about how games run on Steam Deck. It combines Steam metadata with community reports from ProtonDB, ShareDeck, YouTube, and other web sources, then uses Claude to turn those sources into performance summaries.

The browser app, API, database bootstrap, and the job worker all live in this repository and are served from one Nuxt/Nitro process.

## Features

- Search the Steam catalog and browse the most-played Steam Deck games.
- View community-reported graphics settings, performance, compatibility, and source links.
- Generate concise AI summaries from collected reports.
- Ask DeckuBot questions in a floating, multi-turn game support chat.
- Vote on the usefulness of a game summary with an anonymous session.
- Monitor, queue, and remove processing jobs from the session-protected admin dashboard.
- Review an immutable audit trail of admin sign-ins, job actions, and sign-outs.

## Tech stack

- Nuxt 4, Vue 3, and Vue Router
- Nitro file-based API routes
- MongoDB with repository-style data models
- Vercel AI SDK, Anthropic Claude, Firecrawl, and Steam integrations
- Vitest, Nuxt Test Utils, and Playwright
- Biome for linting and formatting

Nuxt is currently configured as a client-rendered application (`ssr: false`). The frontend calls the same-origin API under `/api`.

## Getting started

### Requirements

- Node.js 22.18 or newer
- npm 11.12.1 or newer
- A running MongoDB instance
- Claude and Firecrawl API keys

### Setup

```bash
cp .env.example .env
npm install
npm exec -- nuxt prepare
npm exec -- playwright install chromium
npm run dev
```

Fill in the copied `.env` before starting the server. For local development, also set:

```dotenv
NUXT_WORKER_ENABLED=true
```

This will enable the background job worker in the same process as the web/API server. This worker is responsible for scraping sources, generating reports, and creating summaries.
Set it to `false` when the web/API process should accept and queue work without processing jobs itself.

The application is available at [http://localhost:3000](http://localhost:3000). The API uses the same process and origin, so no separate API server is required.

> npm lifecycle scripts are disabled by `.npmrc`, so Nuxt preparation and the Playwright browser installation must be run explicitly as shown above.

## Configuration

Server configuration is validated at startup. Nuxt runtime overrides use the `NUXT_`-prefixed variables in `.env.example`.

| Area | Variables |
| --- | --- |
| Sentry runtime | `NUXT_PUBLIC_SENTRY_DSN`, `NUXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` |
| Sentry builds | `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `SENTRY_RELEASE` |
| Database | `NUXT_MONGODB_URI`, `NUXT_MONGODB_DATABASE` |
| AI and scraping | `NUXT_CLAUDE_API_KEY`, `NUXT_CLAUDE_AI_MODEL`, `NUXT_FIRECRAWL_API_KEY`, `NUXT_DAYS_BETWEEN_SCRAPES` |
| Support chat | Uses the Claude credentials above |
| Sessions | `NUXT_SESSION_SECRET`, `NUXT_SESSION_MAX_AGE_MS` |
| Login rate limiting | `NUXT_LOGIN_RATE_LIMIT_ENABLED`, `NUXT_LOGIN_RATE_LIMIT_MAX_REQUESTS`, `NUXT_LOGIN_RATE_LIMIT_WINDOW_MS`, `NUXT_LOGIN_RATE_LIMIT_TRUSTED_PROXY_HOPS` |
| Chat rate limiting | `NUXT_CHAT_RATE_LIMIT_ENABLED`, `NUXT_CHAT_RATE_LIMIT_MAX_REQUESTS`, `NUXT_CHAT_RATE_LIMIT_WINDOW_MS` |
| Admin dashboard | `NUXT_ADMIN_USERNAME`, `NUXT_ADMIN_PASSWORD` |
| Job execution | `NUXT_JOB_TIMEOUT_MINUTES`, `NUXT_JOB_MAX_ATTEMPTS`, `NUXT_WORKER_ENABLED` |
| Worker polling | `NUXT_WORKER_POLL_INTERVAL_MS`, `NUXT_WORKER_POLL_JITTER_MS`, `NUXT_WORKER_REQUEUE_SWEEP_MS` |

Keep all API keys, admin credentials, and the session secret out of version control.

The Sentry DSN is safe to expose to the browser and Sentry stays disabled when it is empty. The
trace sample rate accepts values from `0` through `1` and defaults to `0.1`. Use the
`NUXT_PUBLIC_SENTRY_*` variables for both browser and server monitoring.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Home page and popular games |
| `/search?q=...` | Steam catalog search |
| `/game/:gameId` | Game reports, settings, and summary |
| `/admin/login` | Admin sign-in |
| `/admin` | Authenticated job dashboard |
| `/admin/audit-logs` | Authenticated, filterable dashboard audit trail |

Unknown routes render the application's not-found view.

## Admin dashboard

The backoffice is available at `/admin` and is intended for a single operator. Configure its
credentials through `NUXT_ADMIN_USERNAME` and `NUXT_ADMIN_PASSWORD`; both values stay in the
server-only Nuxt runtime configuration and must not be exposed through client-side variables.

Signing in at `/admin/login` creates an authenticated server-side session. The browser receives
only the signed, HTTP-only `decku.sid` cookie. A successful login rotates the anonymous session
identifier, subsequent visits to `/admin` reuse the authenticated session until it expires, and
logging out invalidates it. Admin page navigation without an authenticated session is redirected
to the login page, while unauthenticated job-management API requests return `401 Unauthorized`.

Use HTTPS and a strong, unique password in production. `NUXT_SESSION_SECRET` protects the signed
session cookie and must also be a strong secret.

The integrated dashboard and API use the application's origin. Cross-origin API access is not
allowed.

Dashboard login attempts, job runs, job deletions, and logouts are written to an append-only audit
collection with the acting user, outcome, affected job when available, and a small allow-list of
investigation context. The dashboard audit page lists newest entries first and filters by exact
user identity, action type, and inclusive UTC date range. Passwords, tokens, cookies, session IDs,
request bodies, headers, and raw error messages are never stored in audit entries.

## API

Nitro maps files in `server/api` directly to `/api` endpoints.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/admin/auth/session` | Report whether the current session is authenticated |
| `POST` | `/api/admin/auth/login` | Authenticate the admin session |
| `POST` | `/api/admin/auth/logout` | Invalidate the admin session |
| `GET` | `/api/admin/audit-logs` | List and filter immutable dashboard audit entries |
| `POST` | `/api/chat` | Send a message to the session's DeckuBot conversation |
| `GET` | `/api/games/:id` | Return a game and its reports; queue stale or missing data |
| `POST` | `/api/games/:id/summary-vote` | Record an anonymous `up` or `down` summary vote |
| `GET` | `/api/steam/games?term=...&limit=...` | Search Steam games |
| `GET` | `/api/steam/games/:id` | Fetch one Steam app |
| `GET` | `/api/steam/games/batch?ids=...` | Fetch multiple Steam apps |
| `GET` | `/api/steam/most-played-steam-deck-games` | Return a paginated popular-games list |
| `GET` | `/api/jobs` | List and filter jobs |
| `POST` | `/api/jobs/queue` | Queue a processing job |
| `DELETE` | `/api/jobs/:job_id` | Delete a job |

The job endpoints accept the authenticated admin session used by the integrated dashboard. Job types are `search`, `scrape`, `reports`, `summary`, and `full`.

### Rate limiting

`POST /api/admin/auth/login` and `POST /api/chat` use MongoDB-backed sliding-window limits shared
across application instances. Login allows 5 attempts per IP every 15 minutes by default. Chat
allows 10 messages per anonymous session every minute by default. Rejected requests return
`429 Too Many Requests`, `Retry-After`, and rate-limit policy headers.

The login IP policy uses the direct socket address by default. Behind trusted reverse proxies that
append `X-Forwarded-For`, set `NUXT_LOGIN_RATE_LIMIT_TRUSTED_PROXY_HOPS` to the exact number of
proxies between the client and the app. Do not trust forwarded headers when clients can connect
directly to the app.

## Support chat

The floating DeckuBot widget is available throughout the public application. It uses Vercel AI SDK
to stream Claude responses from DeckuDB's same-origin `/api/chat` endpoint. Claude credentials,
instructions, and tools remain on the server. Conversation history is bounded and stored in the
signed anonymous server-side session, so callers cannot choose or access another conversation.

Configure the Claude provider in `.env`:

```dotenv
NUXT_CLAUDE_API_KEY=your_anthropic_api_key
NUXT_CLAUDE_AI_MODEL=claude-haiku-4-5-20251001
```

DeckuBot can search the Steam catalog and retrieve DeckuDB performance summaries and recent
community reports through server-side tools. The endpoint accepts only one bounded user-text part;
callers cannot override the assistant instructions, tools, model settings, or conversation history.

## Background processing

The queue worker is a Nitro plugin in `server/plugins/queue-worker.ts`. When `NUXT_WORKER_ENABLED=true`, it starts with the server, uses its own MongoDB connection, processes queued jobs, retries failures up to the configured limit, and requeues timed-out work. It stops gracefully with the Nitro process.

A `full` job runs the pipeline in this order:

1. Discover report sources.
2. Scrape source content.
3. Generate structured game reports.
4. Generate the game summary.

## Project structure

```text
app/                 Vue pages, components, stores, and browser plugins
public/              Static site assets and metadata
server/api/          Nitro API route handlers
server/config/       Runtime configuration schema and validation
server/middleware/   CORS and anonymous-session middleware
server/models/       MongoDB repositories and schemas
server/plugins/      Database bootstrap and queue worker lifecycle
server/services/     AI SDK, Firecrawl, and Steam integrations
server/tasks/        Background processing pipeline
server/utils/        Database, mining, logging, and API utilities
shared/              Utilities shared by browser and server code
test/                 Unit, API integration, and Nuxt end-to-end tests
```

At startup, `server/plugins/bootstrap.ts` connects to MongoDB, constructs the repositories, verifies their indexes, and exposes them through each request's event context.

## Frontend component structure

The browser application is organized in layers, with page-specific composition at the top and small reusable components at the bottom:

```text
app/App.vue                 Global application shell
app/pages/                  Nuxt routes and page-level data orchestration
app/components/admin/       Admin dashboard components
app/components/ui/          DeckuDB feature and domain components
app/components/common/      Reusable composed widgets
app/components/base/        Small, generic UI primitives
app/components/icons/       Standalone icon components
```

- `App.vue` owns the shared page frame, including the main content container, dark-mode initialization, scroll-to-top control, and footer. Nuxt renders the active route inside its `<NuxtPage />` element.
- `pages/` maps URLs to complete screens. Pages define route metadata and own page-level concerns such as loading data, handling errors, and coordinating state. For example, `pages/game/[gameId].vue` loads a game and composes its navigation, description, reports, processing state, and AI summary.
- `components/admin/` contains focused backoffice components such as job statistics, the job table, pagination, and the run-job dialog.
- `components/ui/` contains components tied to DeckuDB features or game data, such as `GameSearch`, `PopularGames`, `GameReportsSection`, and `GameDescription`. These components may call browser services or stores and may compose other UI, common, and base components.
- `components/common/` contains reusable widgets that combine behavior and presentation but are not tied to one screen, such as `SearchBar`, `Carousel`, `AskAICard`, and `SourceBadge`.
- `components/base/` contains the lowest-level, domain-independent building blocks, such as `Button`, `Card`, `Spinner`, and `Tooltip`. Keep these components small and avoid coupling them to application services or game-specific data.
- `components/icons/` contains reusable SVG-based brand and source icons.

Dependencies should generally flow downward through these layers:

```text
App -> pages -> admin/ui -> common -> base
                            |
                          icons
```

Components do not have to use every intermediate layer: pages can use common or base components directly, and UI or common components can render icons. Shared browser behavior lives next to the component tree in `composables/`, state containers in `stores/`, API and analytics integrations in Nuxt `plugins/`, and framework-independent helpers in `utils/`.

## Logging

Server and worker logs are written to the console and to rotating files under `logs/`:

- `logs/combined-YYYY-MM-DD.log` contains every message enabled for the current environment.
- `logs/error-YYYY-MM-DD.log` contains only error messages.

Development enables `debug` and higher-priority messages; other non-test environments enable `info`, `warn`, and `error` messages. Logging is silenced when the application runs in the test environment.

Each log file rotates daily or when it reaches 20 MB. Archives are compressed and retained for 14 days. The `logs/` directory and `*.log` files are ignored by Git, so local log output is not committed to the repository.

### Sentry observability

The official `@sentry/nuxt` integration monitors uncaught browser and Nitro errors, page loads,
route changes, same-origin `/api` requests, server request performance, and supported downstream
operations such as MongoDB calls. Frontend and backend spans are joined with Sentry trace headers.
The `/api/health` transaction is excluded so container health checks do not consume trace volume.

Server `info`, `warn`, and `error` messages are also forwarded from Winston to Sentry Logs while
remaining in the console and rotating files. Repetitive worker-idle and audit-payload fallback
messages stay local. Browser console warnings and errors are captured as Sentry Logs, and logged
`Error` objects are captured as Sentry Issues. Expected HTTP `3xx` and `4xx` responses are excluded
from Issues. Automatic
collection of users, cookies, headers, bodies, query strings, AI prompts and responses, database
values, and stack-frame variables is disabled; application-authored events and logs receive an
additional credential, identity, and URL-query scrub before they are sent, as do performance span
attributes.

For readable production stack traces, set `SENTRY_ORG`, `SENTRY_PROJECT`, and the
`SENTRY_AUTH_TOKEN` secret during the build. Source maps are generated, uploaded, and removed from
the output only when all three are present. The release workflow reads the organization and project
from GitHub repository variables and the token from a GitHub Actions secret. See the
[Sentry Nuxt manual setup guide](https://docs.sentry.io/platforms/javascript/guides/nuxt/manual-setup/)
for creating these values.

## Testing

The test suite is configured in `vitest.config.mts` as three named Vitest projects:

| Project | Location | How it works |
| --- | --- | --- |
| `unit` | `test/unit/**/*.test.ts` | Runs in Node and tests services and utilities in isolation. Tests mock dependencies such as `fetch` as needed. |
| `api` | `test/integration/api/**/*.test.ts` | Runs the real H3 route handlers, middleware, repositories, and database client through Supertest. `test/server.setup.ts` supplies an in-memory session store and mocks external services like Steam, Firecrawl, and Claude. |
| `e2e` | `test/e2e/**/*.test.ts` | Uses the Nuxt Test Utils environment, which builds and starts the full Nuxt application for requests and Playwright-based browser tests. |

Vitest runs in `test` mode and loads the placeholder configuration from `.env.test`. Unit and API projects do not need working third-party API keys. The root `test/mongodb.global-setup.ts` starts one `mongodb-memory-server` process for the API and e2e projects, passes its URI to both, and stops it after the suite. A local MongoDB installation is therefore not required, although the first run may need to download a MongoDB binary.

Vitest runs test files and projects in parallel. Tests that write to MongoDB must use a separate database when another concurrently running test can write to or clear the database. Sharing a database is unsafe when cleanup calls such as `flushDB()` delete all collections, because one test can erase another test's fixtures.

The e2e project starts the actual Nuxt/Nitro application. Its external integrations are not replaced by `test/server.setup.ts`; mock them in an e2e test before exercising code that calls them. Install Playwright explicitly with `npm exec -- playwright install chromium` before running browser-based tests.

Run the complete suite with:

```bash
npm test
```

Run one project or one test file while developing with:

```bash
npx vitest run --project unit
npx vitest run --project api
npx vitest run --project e2e
npx vitest run test/integration/api/endpoints/game.test.ts
```

Use `npx vitest` instead of `npx vitest run` for watch mode. Add new `*.test.ts` files under the matching `test/unit`, `test/integration/api`, or `test/e2e` directory so Vitest assigns them to the intended project. API integration tests should create the in-process server with `createNuxtTestServer`, bootstrap a uniquely named database, seed data through its repositories, and clear that database between tests.

## Development commands

```bash
npm run dev          # Start the development server
npm run typecheck    # Run Nuxt/Vue TypeScript checks
npm run lint         # Lint source files with Biome
npm test             # Run the Vitest projects
npm run build        # Create a production build
npm run generate     # Generate a static build
npm run preview      # Preview the production build
```

For production, preload the generated Sentry server configuration when starting Nitro. Sentry's
server-side monitoring requires a production build and does not run under `npm run dev`:

```bash
npm run start
```

### Docker

Copy and fill in the application environment before starting the stack:

```bash
cp .env.example .env
docker compose up --build
```

Compose starts the application and MongoDB on the shared `decku` network. Compose overrides the local
development database settings with:

```dotenv
NUXT_MONGODB_URI=mongodb://mongodb:27017/deckudb
NUXT_MONGODB_DATABASE=deckudb
```

The `mongodb` hostname is the MongoDB service name resolved by Docker's internal DNS. MongoDB's
port does not need to be published to the host for the application to reach it. Database data is
kept in the named `mongodb-data` volume, and Compose waits for MongoDB's health check before
starting the application.

The application is available at [http://localhost:3000](http://localhost:3000). Stop the stack
with `docker compose down`; this preserves the MongoDB volume. The application image runs as a
non-root user and includes Chromium for the background scraping worker. 

## Deployment

Pushing a semantic version tag such as `v1.2.3` publishes the image to
`ghcr.io/<owner>/<repository>` with `1.2.3`, `1.2`, `1`,
and `latest` tags. Release tags must match `vMAJOR.MINOR.PATCH` or
`vMAJOR.MINOR.PATCH-PRERELEASE`.

Create a release with `npm version`, choosing the appropriate version increment, then push its
version commit and generated `v`-prefixed tag:

```bash
npm version patch # Or: npm version minor / npm version major
git push --follow-tags
```

To create or advance a prerelease, provide its identifier to `npm version`:

```bash
npm version prerelease --preid=rc
git push --follow-tags
```


## Disclaimer

Community recommendations may not suit every system configuration. Use them at your own discretion.
