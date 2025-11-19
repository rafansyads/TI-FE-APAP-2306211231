# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Arguments
ARG VITE_API_URL

# Environment variables
ENV VITE_API_URL=$VITE_API_URL

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Is the API variable is saved for build
RUN echo "VITE_API_URL=$VITE_API_URL" > .env.production

# Build the application
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -q0- --verbose --tries=1 --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]