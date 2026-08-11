# DeckuDB

DeckuDB is a full-stack Nuxt application that collects community reports about how games run on Steam Deck. It combines Steam metadata with community reports from ProtonDB, ShareDeck, YouTube, and other web sources, then uses Claude to turn those sources into performance summaries.

The browser app, API, database bootstrap, and the job worker all live in this repository and are served from one Nuxt/Nitro process.

## Features

- Search the Steam catalog and browse the most-played Steam Deck games.
- View community-reported graphics settings, performance, compatibility, and source links.
- Generate concise AI summaries from collected reports.
- Vote on the usefulness of a game summary with an anonymous session.

## Tech stack

- Nuxt 4, Vue 3, and Vue Router
- Nitro file-based API routes
- MongoDB with repository-style data models
- Anthropic Claude, Firecrawl, and Steam integrations
- Vitest, Nuxt Test Utils, and Playwright
- Biome for linting and formatting

Nuxt is currently configured as a client-rendered application (`ssr: false`). The frontend calls the same-origin API under `/api`.

## Getting started

### Requirements

- Node.js 20 or newer
- npm 11.10 or newer
- A running MongoDB instance
- Claude and Firecrawl API keys for the data-processing pipeline

### Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Fill in the copied `.env` before starting the server. For local development, also set:

```dotenv
NUXT_WORKER_ENABLED=true
```

This will enable the background job worker in the same process as the web/API server. This worker is responsible for scraping sources, generating reports, and creating summaries.
Set it to `false` when the web/API process should accept and queue work without processing jobs itself.

The application is available at [http://localhost:3000](http://localhost:3000). The API uses the same process and origin, so no separate API server is required.

> `npm install` runs Nuxt preparation and installs the Playwright browser used by the end-to-end tests.

## Configuration

Server configuration is validated at startup. Nuxt runtime overrides use the `NUXT_`-prefixed variables in `.env.example`.

| Area | Variables |
| --- | --- |
| Database | `NUXT_MONGODB_URI`, `NUXT_MONGODB_DATABASE` |
| AI and scraping | `NUXT_CLAUDE_API_KEY`, `NUXT_CLAUDE_AI_MODEL`, `NUXT_FIRECRAWL_API_KEY`, `NUXT_DAYS_BETWEEN_SCRAPES` |
| Sessions and hosts | `NUXT_SESSION_SECRET`, `NUXT_SESSION_MAX_AGE_MS`, `NUXT_WEB_HOST`, `NUXT_DASHBOARD_HOST` |
| Protected job API | `NUXT_JOB_API_KEY` |
| Job execution | `NUXT_JOB_TIMEOUT_MINUTES`, `NUXT_JOB_MAX_ATTEMPTS`, `NUXT_WORKER_ENABLED` |
| Worker polling | `NUXT_WORKER_POLL_INTERVAL_MS`, `NUXT_WORKER_POLL_JITTER_MS`, `NUXT_WORKER_REQUEUE_SWEEP_MS`, `NUXT_WORKER_IDLE_LOG_EVERY` |

Keep all API keys and the session secret out of version control.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Home page and popular games |
| `/search?q=...` | Steam catalog search |
| `/game/:gameId` | Game reports, settings, and summary |

Unknown routes render the application's not-found view.

## API

Nitro maps files in `server/api` directly to `/api` endpoints.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/games/:id` | Return a game and its reports; queue stale or missing data |
| `POST` | `/api/games/:id/summary-vote` | Record an anonymous `up` or `down` summary vote |
| `GET` | `/api/steam/games?term=...&limit=...` | Search Steam games |
| `GET` | `/api/steam/games/:id` | Fetch one Steam app |
| `GET` | `/api/steam/games/batch?ids=...` | Fetch multiple Steam apps |
| `GET` | `/api/steam/most-played-steam-deck-games` | Return a paginated popular-games list |
| `GET` | `/api/jobs` | List and filter jobs |
| `POST` | `/api/jobs/queue` | Queue a processing job |
| `DELETE` | `/api/jobs/:job_id` | Delete a job |

The job endpoints require the configured job API key in the `X-API-Key` request header. Job types are `search`, `scrape`, `reports`, `summary`, and `full`.

## Background processing

The queue worker is a Nitro plugin in `server/plugins/queue-worker.ts`. When `NUXT_WORKER_ENABLED=true`, it starts with the server, uses its own MongoDB connection, processes queued jobs, retries failures up to the configured limit, and requeues timed-out work. It stops gracefully with the Nitro process.

A `full` job runs the pipeline in this order:

1. Discover report sources.
2. Scrape source content.
3. Generate structured game reports.
4. Generate the game summary.

## Project structure

```text
app/                 Vue pages, views, components, stores, and browser services
public/              Static site assets and metadata
server/api/          Nitro API route handlers
server/config/       Runtime configuration schema and validation
server/middleware/   CORS and anonymous-session middleware
server/models/       MongoDB repositories and schemas
server/plugins/      Database bootstrap and queue worker lifecycle
server/services/     Claude, Firecrawl, and Steam clients
server/tasks/        Background processing pipeline
server/utils/        Database, mining, logging, and API utilities
shared/              Utilities shared by browser and server code
test/                 Unit, API integration, and Nuxt end-to-end tests
```

At startup, `server/plugins/bootstrap.ts` connects to MongoDB, constructs the repositories, verifies their indexes, and exposes them through each request's event context.

## Development commands

```bash
npm run dev          # Start the development server
npm run typecheck    # Run Nuxt/Vue TypeScript checks
npm run lint         # Lint source files with Biome
npm run format       # Check source formatting with Biome
npm run check        # Run all Biome checks
npm test             # Run the Vitest projects
npm run build        # Create a production build
npm run generate     # Generate a static build
npm run preview      # Preview the production build
```

For production, run the generated Nitro entry point after building:

```bash
node .output/server/index.mjs
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
non-root user and includes Chromium for the background scraping worker. Pushing a semantic version
tag such as `v1.2.3` publishes the image to `ghcr.io/<owner>/<repository>` with `1.2.3`, `1.2`, `1`,
and `latest` tags.

## Disclaimer

Community recommendations may not suit every system configuration. Use them at your own discretion.
