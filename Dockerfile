FROM node:22-slim

WORKDIR /app

# Set port for HuggingFace Spaces
ENV PORT=7860

# --- Build Client (Static Export) ---
WORKDIR /app/client
COPY omniwatch-client/package.json omniwatch-client/package-lock.json* ./
RUN npm install --include=dev

COPY omniwatch-client/ ./
# Point the API calls in page.tsx to relative paths instead of localhost:4100
RUN sed -i 's/http:\/\/localhost:4100//g' src/app/page.tsx
RUN npm run build

# --- Build Server ---
WORKDIR /app/server
COPY omniwatch-server/package.json omniwatch-server/package-lock.json* ./
RUN npm install

COPY omniwatch-server/ ./
RUN npx tsc

# Set Production Environment right before creating the container execution state
ENV NODE_ENV=production
EXPOSE 7860

# Start Express server, which is configured to serve the client's /out directory
CMD ["node", "dist/index.js"]
