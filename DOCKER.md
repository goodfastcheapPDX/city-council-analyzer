# Docker Setup for Transcript Analysis System

This document provides instructions for running the transcript analysis system using Docker.

## Quick Start

### 1. Environment Setup
```bash
# Copy the environment template
cp .env.docker .env.local

# Edit .env.local with your actual API keys and tokens
# Required: BLOB_READ_WRITE_TOKEN, SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY
```

### 2. Development with Docker Compose
```bash
# Start all services (app, postgres, redis)
docker-compose up dev

# Or run in background
docker-compose up -d dev

# View logs
docker-compose logs -f dev
```

### 3. Production Build
```bash
# Build and run production container
docker-compose up app

# Or build standalone
docker build -t transcript-analyzer .
docker run -p 3000:3000 --env-file .env.local transcript-analyzer
```

## Available Services

### Development Services
- **dev**: Full development environment with hot reload
- **postgres**: PostgreSQL 15 database
- **redis**: Redis for caching and job queues

### Production Services  
- **app**: Optimized production build

### Testing Services
- **test**: Run test suite
- **supabase-studio**: Database management UI (optional)

## Docker Compose Commands

### Development
```bash
# Start development environment
docker-compose up dev

# Rebuild and start
docker-compose up --build dev

# Run specific service
docker-compose run dev npm run lint
docker-compose run dev npm run test
```

### Testing
```bash
# Run all tests
docker-compose --profile test up test

# Run with coverage
docker-compose run test npm run test:coverage

# Run storage tests (sequential)
docker-compose run test npm run test:storage
```

### Database Management
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d transcript_analysis

# Start Supabase Studio
docker-compose --profile tools up supabase-studio
# Access at http://localhost:3001
```

### Cleanup
```bash
# Stop all services
docker-compose down

# Remove volumes (careful: deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Container Details

### Production Container (Dockerfile)
- **Base**: Node.js 20 Alpine
- **Size**: Optimized multi-stage build
- **Features**: Standalone Next.js output, non-root user
- **Security**: Minimal attack surface

### Development Container (Dockerfile.dev)
- **Base**: Node.js 20 Alpine  
- **Tools**: TypeScript, ESLint, Prettier, debugging support
- **Features**: Hot reload, volume mounts, development dependencies
- **Debugging**: Port 9229 exposed for Node.js inspector

## Environment Variables

### Required
```bash
BLOB_READ_WRITE_TOKEN=     # Vercel Blob storage token
SUPABASE_URL=              # Supabase project URL
SUPABASE_KEY=              # Supabase service role key
OPENAI_API_KEY=            # OpenAI API key for embeddings
```

### Optional
```bash
GITHUB_TOKEN=              # GitHub API token
ENABLE_PROCESSING=true     # Enable transcript processing
ENABLE_CACHING=true        # Enable Redis caching
DEBUG_MODE=false           # Debug logging
```

### Local Development (Docker Compose)
```bash
DATABASE_URL=              # Auto-configured for postgres service
REDIS_URL=                 # Auto-configured for redis service
```

## Port Mapping

| Service | Container Port | Host Port | Description |
|---------|---------------|-----------|-------------|
| app/dev | 3000 | 3000 | Next.js application |
| postgres | 5432 | 5432 | PostgreSQL database |
| redis | 6379 | 6379 | Redis cache |
| dev (debug) | 9229 | 9229 | Node.js debugger |
| supabase-studio | 3000 | 3001 | Database UI |

## Volume Mounts

### Development
- `.:/app` - Source code hot reload
- `/app/node_modules` - Prevent overwriting container modules
- `/app/.next` - Next.js build cache

### Data Persistence
- `postgres_data:/var/lib/postgresql/data` - Database data
- `redis_data:/data` - Redis persistence

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Find process using port 3000
lsof -i :3000
kill -9 <PID>
```

**Build failures:**
```bash
# Clear Docker cache
docker system prune -a
docker-compose build --no-cache
```

**Database connection issues:**
```bash
# Check postgres logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up postgres
```

### Performance

**Slow startup:**
- Use `.dockerignore` to exclude unnecessary files
- Consider using bind mounts only for source code

**Memory usage:**
```bash
# Monitor container resources
docker stats

# Limit memory if needed
docker-compose run --memory="2g" dev npm run build
```

## Production Deployment

### Build Optimization
```bash
# Multi-platform build (for ARM/x64)
docker buildx build --platform linux/amd64,linux/arm64 -t transcript-analyzer .

# Size optimization
docker build --target=runner -t transcript-analyzer:slim .
```

### Security Considerations
- Container runs as non-root user (nextjs:nodejs)
- Minimal base image (Alpine Linux)
- No unnecessary packages in production
- Environment variables for secrets (never hardcoded)

### Health Checks
The containers include basic health monitoring. For production:
```bash
# Add to docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Integration with CLAUDE.md

This Docker setup supports all commands mentioned in CLAUDE.md:

```bash
# Development commands
docker-compose run dev npm run dev
docker-compose run dev npm run build  
docker-compose run dev npm run lint

# Testing commands
docker-compose run test npm run test
docker-compose run test npm run test:storage
docker-compose run test npm run test:coverage

# Docker commands (already available)
docker-compose up -d          # npm run docker:up
docker-compose run test       # npm run test:with-docker
```

The setup provides the complete development environment needed for the transcript analysis system while maintaining consistency across different host systems.