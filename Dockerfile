FROM node:16-alpine3.15 AS builder
WORKDIR /app
COPY ./package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM node:16-alpine3.15
WORKDIR /app

# Installs latest Chromium (100) package.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# set environment variables
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/build ./build
COPY ./config ./config
COPY ./package*.json .
RUN npm ci --only=production

CMD ["node", "./build/index.js"]

HEALTHCHECK --interval=15s --timeout=30s --start-period=60s --retries=5 CMD wget --no-verbose --tries=3 --spider localhost:20000/ || exit 1