# syntax=docker/dockerfile:1

# Base stage with Bun
FROM oven/bun:1.3.1-alpine AS base
WORKDIR /app

# Install dependencies stage
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/jrpc/package.json ./packages/jrpc/
COPY packages/zigbee/package.json ./packages/zigbee/
RUN bun install --frozen-lockfile

# Build dashboard stage
FROM base AS dashboard-builder

# Accept build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_DEFAULT_LATITUDE
ARG VITE_DEFAULT_LONGITUDE

# Set as environment variables for Vite build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_DEFAULT_LATITUDE=${VITE_DEFAULT_LATITUDE}
ENV VITE_DEFAULT_LONGITUDE=${VITE_DEFAULT_LONGITUDE}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY apps/dashboard ./apps/dashboard
COPY packages/jrpc ./packages/jrpc
COPY packages/zigbee ./packages/zigbee
COPY package.json bun.lock ./
COPY biome.json ./
WORKDIR /app/apps/dashboard
RUN bun run build

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy built dashboard
COPY --from=dashboard-builder /app/apps/dashboard/dist /app/apps/dashboard/dist

# Copy backend source (TypeScript runs directly with Bun)
COPY apps/backend/src /app/apps/backend/src
COPY apps/backend/package.json /app/apps/backend/

# Copy workspace packages
COPY packages/jrpc /app/packages/jrpc
COPY packages/zigbee /app/packages/zigbee

# Copy backend dependencies
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/backend/node_modules /app/apps/backend/node_modules

WORKDIR /app/apps/backend

EXPOSE 8000

CMD ["bun", "run", "src/index.ts"]
