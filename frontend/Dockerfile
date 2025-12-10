# Step 1: Build the frontend
FROM node:25-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build the production version
RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:stable-alpine

# Copy build output to Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx config (optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script that writes env.js at runtime
COPY /docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 5173
EXPOSE 5173

ENTRYPOINT ["/docker-entrypoint.sh"]
# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
