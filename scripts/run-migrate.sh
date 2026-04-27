#!/bin/bash
: "${DATABASE_URL:?DATABASE_URL is required}"
node scripts/migrate-to-postgres.js
