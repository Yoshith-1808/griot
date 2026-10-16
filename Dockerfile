# ==============================================================================
# Griot Production Dockerfile
# Node.js 22 LTS with embedded SQLite & Streamable HTTP MCP Server
# ==============================================================================

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Install build dependencies for native sqlite
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY package.json pnpm-workspace.yaml tsconfig.json biome.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/demo-client/package.json ./packages/demo-client/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/mcp-server ./packages/mcp-server
COPY packages/demo-client ./packages/demo-client
COPY scripts ./scripts

# Build packages
RUN pnpm --recursive run build || true

# Prepare runtime directory
RUN mkdir -p /app/data

EXPOSE 3000
EXPOSE 5173

CMD ["node", "scripts/dev-all.js"]
