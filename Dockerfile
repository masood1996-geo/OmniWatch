# syntax=docker/dockerfile:1

FROM node:22-slim AS client-build
WORKDIR /app/client
COPY omniwatch-client/package.json omniwatch-client/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY omniwatch-client/ ./
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
RUN npm run build

FROM node:22-slim AS server-build
WORKDIR /app/server
COPY omniwatch-server/package.json omniwatch-server/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY omniwatch-server/ ./
RUN npx tsc

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=7860
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/package.json
COPY --from=client-build /app/client/out ./client/out
RUN mkdir -p /app/server/data && chown -R node:node /app
USER node
WORKDIR /app/server
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4100)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
