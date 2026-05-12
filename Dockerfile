# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder
#   Install dependencies and produce the Vite production bundle (dist/).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# libc6-compat is needed by some Node.js native modules on Alpine
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runner
#   Serve static assets with nginx (SPA fallback for client-side routing).
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

RUN rm /etc/nginx/conf.d/default.conf \
 && printf '%s\n' \
    'server {' \
    '  listen 3000;' \
    '  root /usr/share/nginx/html;' \
    '  location / {' \
    '    try_files $uri $uri/ /index.html;' \
    '  }' \
    '}' \
    > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
