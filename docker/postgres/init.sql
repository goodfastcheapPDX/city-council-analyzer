-- Initialize the database for local development
-- This script runs when the PostgreSQL container starts for the first time

-- Create the main database if it doesn't exist
-- (Note: The database is already created via POSTGRES_DB env var)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create basic schema for development/testing
-- Note: In production, this would be managed by Supabase migrations

CREATE SCHEMA IF NOT EXISTS public;

-- Grant permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Log completion
SELECT 'Database initialization completed' AS status;