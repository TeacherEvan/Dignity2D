# Multiplayer + upload backend for Dignity Arcade.
# Listens on PORT (default 8787) and serves HTTP + WebSocket from server/.

FROM node:22-alpine

WORKDIR /app

# Install prod deps first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source (tsx runs TS directly; no separate build step needed).
COPY server ./server
COPY shared ./shared

ENV PORT=8787
ENV NODE_ENV=production

EXPOSE 8787

# tsx is in devDependencies; install it explicitly to keep the image lean.
RUN npm install --no-save tsx@^4.21.0

CMD ["npx", "tsx", "server/main.ts"]
