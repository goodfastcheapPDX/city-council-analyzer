# Supabase Local Development Migration Plan

## Overview
Replace plain PostgreSQL with local Supabase instance in docker-compose to align with production architecture and enable full Supabase feature set locally.

## Implementation Steps

### Phase 1: Research & Analysis (High Priority)

1. **Research Supabase local development setup and CLI requirements**
   - Review Supabase CLI documentation
   - Understand local development workflow
   - Identify Docker integration patterns

2. **Analyze current docker-compose.yml and PostgreSQL configuration**
   - Review existing PostgreSQL service configuration
   - Identify dependencies and volume mounts
   - Document current database initialization process

### Phase 2: Supabase Setup (High Priority)

3. **Install and configure Supabase CLI in Docker environment**
   - Add Supabase CLI to Dockerfile.dev
   - Ensure CLI tools available in container
   - Configure CLI authentication for local use

4. **Create supabase/config.toml with local development settings**
   - Initialize Supabase project structure
   - Configure local development settings
   - Set up project-specific configurations

5. **Replace PostgreSQL service with Supabase stack in docker-compose.yml**
   - Remove existing PostgreSQL service
   - Add Supabase local development services
   - Configure service dependencies and networking

### Phase 3: Migration & Configuration (Medium Priority)

6. **Convert postgres init.sql to Supabase migrations**
   - Transform existing SQL schema to migration files
   - Ensure proper migration ordering
   - Test migration execution

7. **Update .env.docker with Supabase local development URLs**
   - Replace PostgreSQL connection strings
   - Add Supabase-specific environment variables
   - Configure API endpoints for local instance

8. **Ensure pgvector extension is enabled in Supabase local setup**
   - Verify pgvector extension availability
   - Configure extension in migration files
   - Test vector operations functionality

### Phase 4: Testing & Validation (High Priority)

9. **Test Supabase local environment startup and connectivity**
   - Start Supabase services via docker-compose
   - Verify all services are healthy
   - Test database connectivity

10. **Verify app connects properly to local Supabase instance**
    - Test application startup with new configuration
    - Verify database operations work correctly
    - Validate API connectivity

### Phase 5: Documentation & Cleanup (Low Priority)

11. **Update DOCKER.md with Supabase local development instructions**
    - Document new setup process
    - Add troubleshooting section
    - Update command references

12. **Remove old PostgreSQL-specific files and configurations**
    - Clean up docker/postgres/init.sql
    - Remove unused PostgreSQL volumes
    - Archive or delete obsolete configuration files

## Success Criteria

- [ ] Supabase local instance starts successfully via docker-compose
- [ ] Application connects to local Supabase without errors
- [ ] Database schema matches production environment
- [ ] pgvector extension works for vector operations
- [ ] All existing tests pass with new setup
- [ ] Documentation reflects new development workflow

## Dependencies

- Supabase CLI availability
- Docker and docker-compose functionality
- Existing application database logic
- Current test suite compatibility

## Rollback Plan

- Keep current docker-compose.yml as backup
- Maintain .env.docker.backup for quick restoration
- Document PostgreSQL service configuration for quick revert

---
*Generated: 2025-06-17*
*Status: Planning Complete - Ready for Implementation*