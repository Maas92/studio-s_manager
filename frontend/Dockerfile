# Step 1: Build the frontend
FROM node:25-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build the production version
# Note: We don't set VITE_API_BASE_URL here because it will be set at runtime
RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:stable-alpine

# Copy build output to Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script that writes env.js at runtime
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80 (nginx default)
EXPOSE 80

# Use entrypoint to generate env.js at runtime
ENTRYPOINT ["/docker-entrypoint.sh"]

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]