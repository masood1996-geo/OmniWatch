FROM node:22-slim

WORKDIR /app

# Set port for HuggingFace Spaces
ENV PORT=7860
ENV NODE_ENV=production

# --- Client Setup ---
COPY omniwatch-client/package.json ./client-package.json
RUN npm install --prefix ./client-package --omit=dev

COPY omniwatch-client/ ./client/
WORKDIR /app/client

# Modify client to fetch from localhost (or relative) instead of hardcoded 4100
RUN sed -i 's/http:\/\/localhost:4100//g' src/app/page.tsx

RUN npm install
RUN npm run build
WORKDIR /app

# --- Server Setup ---
COPY omniwatch-server/package.json ./server-package.json
RUN npm install --prefix ./server-package --omit=dev

COPY omniwatch-server/ ./server/
WORKDIR /app/server
RUN npm install
RUN npx tsc

WORKDIR /app

# Entry point script
RUN echo '#!/bin/sh\n\n# Start client in background\nNODE_ENV=production PORT=3000 npm run start --prefix ./client &\n\n# Start server in foreground on port 7860\nNODE_ENV=production PORT=7860 npm run start --prefix ./server' > entrypoint.sh
RUN chmod +x entrypoint.sh

# But wait, next "start" script runs on PORT env var. The client needs to be on port 3000, and server on 7860? Or reverse proxy?
# Let's fix this in the entrypoint properly.

EXPOSE 7860

CMD ["/app/entrypoint.sh"]
