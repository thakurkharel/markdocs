#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting MarkDocs..."
exec npx tsx server.ts
