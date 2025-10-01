# Multi-stage build for React frontend
FROM node:18-alpine as build

# Accept build arguments
ARG VITE_API_BASE_URL
ARG VITE_APP_MODE

# Set environment variables for Vite build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_MODE=$VITE_APP_MODE

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for Vite build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]