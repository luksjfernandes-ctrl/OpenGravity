# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and compile TypeScript to JavaScript
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# ── Stage 2: Production Runtime ────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy only production dependencies manifest
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled JS from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 7860
ENV PORT=7860
ENV NODE_ENV=production

# Run compiled JS directly with Node — no tsx overhead
CMD ["node", "dist/index.js"]
