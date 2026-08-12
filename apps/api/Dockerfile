FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@9.15.5 --activate

FROM base AS build
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma
COPY deploy/staging-seed.cjs deploy/staging-seed.cjs
RUN pnpm install --frozen-lockfile --filter @aqua/api...
COPY apps/api apps/api
RUN pnpm --filter @aqua/api exec prisma generate \
  && pnpm --filter @aqua/api build

FROM base AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/package.json package.json
COPY --from=build /repo/apps/api/node_modules apps/api/node_modules
COPY --from=build /repo/apps/api/package.json apps/api/package.json
COPY --from=build /repo/apps/api/prisma apps/api/prisma
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/deploy/staging-seed.cjs deploy/staging-seed.cjs
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
