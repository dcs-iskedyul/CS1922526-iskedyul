# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the SvelteKit app (this creates the 'build' folder)
RUN npm run build

# Remove devDependencies to keep the final image small
RUN npm prune --production

# ---------------------------------------------------------

# Stage 2: Run the production application
FROM node:18-alpine

WORKDIR /app

# Copy the built app and production node_modules from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose the port SvelteKit runs on
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000

# Run as a non-root user for better security
USER node

# Start the Node server
CMD ["node", "build/index.js"]