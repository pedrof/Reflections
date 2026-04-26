#!/bin/bash
set -e

REGISTRY=${1:-"registry.internal.example.com"}
TAG=${2:-"latest"}

echo "Building Reflections images for registry: $REGISTRY, tag: $TAG"

podman build -t "$REGISTRY/reflections-backend:$TAG" ./backend
podman build -t "$REGISTRY/reflections-frontend:$TAG" ./frontend

# Save for transfer via USB/removable media
podman save "$REGISTRY/reflections-backend:$TAG" | gzip > reflections-backend.tar.gz
podman save "$REGISTRY/reflections-frontend:$TAG" | gzip > reflections-frontend.tar.gz

echo ""
echo "Transfer these files to the air-gap environment:"
echo "  reflections-backend.tar.gz"
echo "  reflections-frontend.tar.gz"
echo ""
echo "Then load with:"
echo "  podman load < reflections-backend.tar.gz"
echo "  podman load < reflections-frontend.tar.gz"
echo ""
echo "Then push to your internal registry:"
echo "  podman push $REGISTRY/reflections-backend:$TAG"
echo "  podman push $REGISTRY/reflections-frontend:$TAG"
