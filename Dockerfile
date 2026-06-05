FROM node:22-alpine AS base

# ── Build ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Run ───────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy everything needed at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3001

CMD ["npx", "tsx", "server.ts"]
