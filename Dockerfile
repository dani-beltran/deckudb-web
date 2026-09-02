ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS build

ARG NPM_VERSION=11.12.1
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_RELEASE

# Avoid NUXT data collection and Playwright browser downloads in the build image.
ENV NUXT_TELEMETRY_DISABLED=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

# Install the specified version of npm globally. 
# Also cache the npm cache directory to speed up subsequent builds. 
# The cache is invalidated if the npm version changes.
RUN --mount=type=cache,target=/root/.npm \
    npm install --global npm@${NPM_VERSION}

COPY package.json package-lock.json .npmrc ./

# Installing dependencies before copying the rest of the source code allows Docker to cache 
# the npm install layer, which can speed up builds if package.json and package-lock.json haven't changed.
#
# Lifecycle scripts are disabled by .npmrc. The production build performs the
# Nuxt generation that the postinstall script would otherwise perform.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --no-audit

COPY . .

# The optional auth token is mounted for this command only and never stored in an image layer.
RUN --mount=type=secret,id=sentry_auth_token,required=false \
    if [ -f /run/secrets/sentry_auth_token ]; then \
      export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)"; \
    fi; \
    SENTRY_ORG="${SENTRY_ORG}" \
    SENTRY_PROJECT="${SENTRY_PROJECT}" \
    SENTRY_RELEASE="${SENTRY_RELEASE}" \
    npm run build

FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ARG PLAYWRIGHT_VERSION=1.62.0

ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=8080 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# The worker uses Playwright for source scraping. Keep its browser version in
# sync with package-lock.json and install only Chromium in the runtime image.
RUN --mount=type=cache,target=/root/.npm \
    apt-get update \
    && apt-get install --yes --no-install-recommends dumb-init \
    && npm install --global playwright@${PLAYWRIGHT_VERSION} \
    && playwright install --with-deps chromium \
    && npm uninstall --global playwright \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p logs && chown node:node /app /app/logs

COPY --from=build --chown=node:node /app/.output ./.output

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--import", "./.output/server/sentry.server.config.mjs", ".output/server/index.mjs"]
