#!/bin/bash
export DATABASE_URL="postgresql://neondb_owner:npg_JW5ns7puXzoN@ep-silent-feather-anpv5jzh.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
/Users/sorn/.nvm/versions/node/v22.15.0/bin/node /Users/sorn/.openclaw/workspace/slabhub/scripts/migrate-to-postgres.js
