#!/bin/bash
set -e

# Run this on an internet-connected machine before transfer to air-gap environment
echo "Packaging npm dependencies for offline install..."

cd backend
npm ci
echo "Backend dependencies installed."

cd ../frontend
npm ci
echo "Frontend dependencies installed."

cd ..

# Bundle node_modules as a tarball for transfer
tar -czf reflections-node-modules.tar.gz backend/node_modules frontend/node_modules
echo ""
echo "Created: reflections-node-modules.tar.gz"
echo ""
echo "Transfer to air-gap environment and extract with:"
echo "  tar -xzf reflections-node-modules.tar.gz"
echo ""
echo "Then run builds without network:"
echo "  cd backend && npm ci --prefer-offline"
echo "  cd frontend && npm ci --prefer-offline"
