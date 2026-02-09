#!/bin/bash

# Seed Database Script for Cloud Run

echo "Starting database seeding..."

# Run migrations first
node src/database/migrate.js

# Run seed
node src/database/seed.js

echo "Database seeding completed!"
