ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS build

ARG NPM_VERSION=11.12.1

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

RUN npm run build

FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ARG PLAYWRIGHT_VERSION=1.62.0

ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# The worker uses Playwright for source scraping. Keep its browser version in
# sync with package-lock.json and install only Chromium in the runtime image.
RUN --mount=type=cache,target=/root/.npm \
    apt-get update \
    && apt-get install --yes --no-install-recommends dumb-init \
    && npx --yes playwright@${PLAYWRIGHT_VERSION} install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p logs && chown node:node /app /app/logs

COPY --from=build --chown=node:node /app/.output ./.output

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]
