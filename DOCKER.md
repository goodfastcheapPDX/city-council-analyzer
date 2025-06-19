# Docker Setup for Transcript Analysis System

This document covers Docker usage for **application deployment**. For local development, use the Supabase CLI workflow (see [Local Development](#local-development) section).

## Architecture Overview

**Local Development:** Supabase CLI manages database services
**Deployment:** Docker containers connect to remote Supabase instances

## Local Development Workflow

### Prerequisites
```bash
# Install Supabase CLI
npm install -g supabase

# Verify installation
supabase --version
```

### Development Setup
```bash
# 1. Start Supabase services locally
npx supabase start

# 2. Run development server
npm run dev

# 3. Run tests
npm test

# 4. Stop Supabase services when done
npx supabase stop
```

This uses Supabase CLI to manage PostgreSQL, API Gateway, Auth, and other services automatically.

## Docker Deployment

Use Docker for deploying the application to environments with remote Supabase instances.

### Quick Start

```bash
# Build and run production container
docker-compose up app

# Or build standalone
docker build -t transcript-analyzer .
docker run -p 3000:3000 --env-file .env.production transcript-analyzer
```

### Development with Docker (Optional)
```bash
# Run containerized development environment
docker-compose up dev

# View logs
docker-compose logs -f dev
```

## Available Services

### Production Services
- **app**: Optimized Next.js production build
- **redis**: Optional caching layer

### Development Services (Optional)
- **dev**: Development environment with hot reload
- **redis**: Cache for development testing

## Docker Compose Commands

### Production Deployment
```bash
# Start production services
docker-compose up app

# Run in background
docker-compose up -d app

# Build and start
docker-compose up --build app
```

### Development (Alternative to Local Setup)
```bash
# Start development environment
docker-compose up dev

# Rebuild and start
docker-compose up --build dev

# Run specific commands
docker-compose run dev npm run lint
```

### Management
```bash
# Stop all services
docker-compose down

# Remove volumes (careful: deletes Redis data)
docker-compose down -v

# View logs
docker-compose logs app
docker-compose logs redis
```

## Environment Configuration

### Required for All Environments
```bash
# Supabase (Remote Instance)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Storage
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# AI Services
OPENAI_API_KEY=your-openai-key
```

### Optional
```bash
GITHUB_TOKEN=your-github-token
REDIS_URL=redis://redis:6379        # For Docker Compose
ENABLE_PROCESSING=true
ENABLE_CACHING=true
DEBUG_MODE=false
```

## Port Mapping

| Service | Container Port | Host Port | Description |
|---------|---------------|-----------|-------------|
| app/dev | 3000 | 3000 | Next.js application |
| redis | 6379 | 6379 | Redis cache (optional) |
| dev (debug) | 9229 | 9229 | Node.js debugger |

## Container Details

### Production Container (Dockerfile)
- **Base**: Node.js 20 Alpine
- **Features**: Standalone Next.js output, non-root user
- **Security**: Minimal attack surface
- **Size**: Optimized multi-stage build

### Development Container (Dockerfile.dev)
- **Base**: Node.js 20 Alpine  
- **Tools**: TypeScript, ESLint, development dependencies
- **Features**: Hot reload, volume mounts, debugging support
- **Debugging**: Port 9229 exposed for Node.js inspector

## Volume Mounts

### Development
- `.:/app` - Source code hot reload
- `/app/node_modules` - Prevent overwriting container modules
- `/app/.next` - Next.js build cache

### Data Persistence
- `redis_data:/data` - Redis persistence (if used)

## Comparison: Local vs Docker Development

| Aspect | Supabase CLI (Recommended) | Docker Compose |
|--------|---------------------------|----------------|
| **Database** | Supabase manages PostgreSQL | Manual Redis only |
| **API Services** | Auto-configured | Requires remote Supabase |
| **Setup Time** | ~30 seconds | ~2-3 minutes |
| **Resource Usage** | Optimized | Higher overhead |
| **Debugging** | Native tooling | Container debugging |
| **Use Case** | Daily development | Deployment testing |

## Troubleshooting

### Local Development Issues
```bash
# Check Supabase status
npx supabase status

# Reset Supabase (careful: deletes data)
npx supabase stop
npx supabase start

# View Supabase logs
npx supabase logs
```

### Docker Issues
```bash
# Port conflicts
lsof -i :3000
kill -9 <PID>

# Build failures
docker system prune -a
docker-compose build --no-cache

# Redis connection issues
docker-compose logs redis
```

## Production Deployment

### Build Optimization
```bash
# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t transcript-analyzer .

# Size optimization
docker build --target=runner -t transcript-analyzer:slim .
```

### Security Considerations
- Container runs as non-root user (nextjs:nodejs)
- Environment variables for secrets (never hardcoded)
- Connect to remote Supabase instances only
- Redis optional and isolated

### Health Checks
```bash
# Add to docker-compose.yml for production monitoring
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Summary

- **Local Development**: Use `npx supabase start` + `npm run dev`
- **Testing**: Use `npm test` with Supabase CLI services
- **Deployment**: Use Docker containers with remote Supabase
- **Docker Compose**: Optional for development, required for deployment

This approach provides the simplest local development experience while maintaining deployment flexibility.