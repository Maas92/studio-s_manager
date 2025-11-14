#!/bin/bash

set -e

echo "🐳 Testing Docker Build and Deployment"
echo "======================================="

# Build the image
echo "1. Building Docker image..."
docker build -t studio-s-auth:test .

# Run container
echo "2. Starting container..."
docker run -d --name auth-test \
  -p 5003:5002 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/studio-s-auth-test \
  -e NODE_ENV=production \
  studio-s-auth:test

# Wait for container to be ready
echo "3. Waiting for container to be ready..."
sleep 5

# Test health endpoint
echo "4. Testing health endpoint..."
response=$(curl -s http://localhost:5003/health)
if echo "$response" | grep -q "ok"; then
  echo "✅ Container is healthy"
else
  echo "❌ Container health check failed"
  docker logs auth-test
  exit 1
fi

# Cleanup
echo "5. Cleaning up..."
docker stop auth-test
docker rm auth-test
docker rmi studio-s-auth:test

echo "✅ Docker tests passed"