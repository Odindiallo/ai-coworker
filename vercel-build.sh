#!/bin/bash

# Vercel build script that handles complex dependency issues

# Exit on error
set -e

echo "Starting custom build process..."

# Install dependencies with force flag and legacy peer deps
echo "Installing dependencies..."
npm install --force --no-audit --no-fund --loglevel=error

# Build the application
echo "Building application..."
npm run build

echo "✅ Build completed successfully!"
