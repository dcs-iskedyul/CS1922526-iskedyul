FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Accept Render's automatic build args
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY

# Set them as environment variables for the build step
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY

# Build the SvelteKit app (this creates the 'build' folder)
RUN npm run build

# Remove devDependencies to keep the final image small
RUN npm prune --production

# ---------------------------------------------------------

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
# Allow Render to override the port, but provide a fallback
ENV PORT=3000 
# Bind to all network interfaces (Crucial for Render)
ENV HOST=0.0.0.0 

# Run as a non-root user for better security
USER node

# Start the Node server
CMD ["node", "build/index.js"]