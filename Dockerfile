# Dockerfile for a Next.js / Prisma application with fixes

# 1. Builder Stage: Install dependencies and build the application
FROM node:20-slim AS builder

# ---> FIX #2: Install openssl, which is required by Prisma.
RUN apt-get update -y && apt-get install -y \
    openssl \
    ca-certificates \
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
RUN apt-get update -y && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the necessary, optimized files from the builder stage.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/package.json ./package.json

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Cloud Run expects the app to listen on PORT environment variable
ENV PORT=8080
EXPOSE 8080

# Start the Next.js standalone server directly
CMD ["node", "server.js"]
