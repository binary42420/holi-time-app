# Dockerfile for a Next.js / Prisma application with fixes

# 1. Builder Stage: Install dependencies and build the application
FROM node:20-slim AS builder

# ---> FIX #2: Install openssl, which is required by Prisma.
# ---> FIX #3: Install dependencies for Puppeteer (for PDF generation)
RUN apt-get update -y && apt-get install -y \
    openssl \
    ca-certificates \
    wget \
    gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies first to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm install

# ---> FIX #1: Copy ALL project files (including /src, /public, and /prisma)
# This MUST happen BEFORE running prisma generate.
COPY . .

# Now that prisma/schema.prisma exists in the container, we can generate the client.
# Also, accept the dummy DATABASE_URL from the build argument.
ARG DATABASE_URL
RUN npx prisma generate

# Finally, run the main build command
RUN npm run build


# 2. Runner Stage: Create the final, small production image
FROM node:20-slim AS runner

# ---> FIX #2 (Again): Also need openssl in the runner stage for the live app.
# ---> FIX #3 (Again): Also need Puppeteer dependencies in the runner stage
RUN apt-get update -y && apt-get install -y \
    openssl \
    ca-certificates \
    wget \
    gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy only the necessary, optimized files from the builder stage.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Make scripts executable
RUN chmod +x ./scripts/migrate.sh ./scripts/startup-with-migration.js

EXPOSE 3000
# Run the app as a non-root user for better security
USER node

# The command to start the app with migration check
CMD ["npm", "run", "start:prod"]
