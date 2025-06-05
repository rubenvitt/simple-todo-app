-- Simple Todo App Database Initialization
-- This file is executed when the PostgreSQL container starts for the first time

-- Create schema if not exists (optional, mainly for documentation)
-- The database and user are already created via environment variables

-- Set timezone to UTC
SET timezone = 'UTC';

-- Enable UUID extension for better primary keys (will be used by Prisma)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create test database for E2E tests
CREATE DATABASE todo_test;

-- Grant permissions to test database
GRANT ALL PRIVILEGES ON DATABASE todo_test TO todo_user;

-- Switch to test database and enable extensions there too
\c todo_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log successful initialization
SELECT 'Simple Todo App database initialized successfully' AS message; 