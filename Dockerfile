# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# ── Stage 2: Production Runtime ────────────────────────
FROM node:20-alpine

# Install Chromium for Playwright browser automation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 7860
ENV PORT=7860
ENV NODE_ENV=production
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

CMD ["node", "dist/index.js"]
