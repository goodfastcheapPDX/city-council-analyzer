#!/bin/bash
# Useful deployment commands for the Transcript Analysis System

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Format code
npm run format

# Run tests
npm run test

# Vercel CLI commands

# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Initialize Vercel project (first time)
vercel

# Deploy to production
vercel --prod

# Preview deployment
vercel

# List environment variables
vercel env ls

# Add environment variable
vercel env add [name]

# Remove environment variable
vercel env rm [name]

# Pull environment variables to .env.local
vercel env pull

# Link to existing Vercel project
vercel link

# Deploy with specific environment
vercel --env ENV_VAR=value

# List deployments
vercel ls

# Inspect a deployment
vercel inspect [deployment-url]

# View logs
vercel logs [deployment-url]

# Useful Git commands

# Initialize Git repository
git init

# Add all files
git add .

# Commit changes
git commit -m "Your commit message"

# Create and switch to new branch
git checkout -b feature/your-feature-name

# Push to remote repository
git push origin [branch-name]

# Database commands

# Supabase CLI setup (optional)
npm install -g supabase

# Login to Supabase
supabase login

# Initialize Supabase project locally
supabase init

# Link to existing Supabase project
supabase link --project-ref your-project-id

# Start Supabase locally
supabase start

# Generate database types
supabase gen types typescript --local > lib/database.types.ts

# Apply migrations
supabase db push

# Additional deployment help

# Check Next.js build output
next build

# Analyze bundle size
ANALYZE=true next build

# Check for TypeScript errors
npx tsc --noEmit

# Check for accessibility issues
npx a11y .

# Setup continuous deployment with GitHub Actions

# 1. Create a .github/workflows directory
mkdir -p .github/workflows

# 2. Create a deployment workflow file
cat > .github/workflows/deploy.yml << EOL
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.ORG_ID }}
          vercel-project-id: \${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
EOL

# Remember to set up the secrets in your GitHub repository:
# VERCEL_TOKEN, ORG_ID, PROJECT_ID