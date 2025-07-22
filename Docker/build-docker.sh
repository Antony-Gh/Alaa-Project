#!/bin/bash

echo "======================================"
echo "     DOCKER BUILD HELPER SCRIPT"
echo "======================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

echo "Docker is running. Proceeding with build..."
echo ""

# Build the Docker images
echo "Building Docker images..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
  echo ""
  echo "Error: Docker build failed. Please check the error messages above."
  exit 1
else
  echo ""
  echo "======================================"
  echo "Docker images built successfully!"
  echo ""
  echo "You can now run the application with:"
  echo "docker-compose up -d"
  echo "======================================"
  echo ""
fi 