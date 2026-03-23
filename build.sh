#!/bin/bash
# Build script for Render deployment
set -e

echo "=== Installing backend dependencies ==="
cd backend
pip install -r requirements.txt

echo "=== Installing frontend dependencies ==="
cd ../frontend
npm install

echo "=== Building frontend ==="
npm run build

echo "=== Copying frontend build to backend/static ==="
rm -rf ../backend/static
cp -r dist ../backend/static

echo "=== Seeding database if empty ==="
cd ../backend
python start.py

echo "=== Build complete ==="
