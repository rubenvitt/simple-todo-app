# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Development:**
- `pnpm install` - Install dependencies
- `pnpm run start:dev` - Start development server with hot reload
- `pnpm run build` - Build the application
- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier

**Testing:**
- `pnpm run test` - Run unit tests
- `pnpm run test:e2e` - Run end-to-end tests
- `pnpm run test:cov` - Run tests with coverage report
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:ci` - Run tests for CI (includes coverage and timeout)

**Database (Prisma):**
- `pnpm run db:generate` - Generate Prisma client
- `pnpm run db:migrate` - Run database migrations in development
- `pnpm run db:deploy` - Deploy migrations in production
- `pnpm run db:seed` - Seed database with test data
- `pnpm run db:studio` - Open Prisma Studio
- `pnpm run db:reset` - Reset database (careful!)

## Architecture Overview

This is a NestJS-based collaborative todo application with real-time features:

**Core Domain Models:**
- Users, Lists, Tasks, ListShares, Notifications, Invitations
- Complex permission system with VIEWER/EDITOR/OWNER roles
- Task state management with BACKLOG → TODO → IN_PROGRESS → REVIEW → DONE flow

**Key Architectural Patterns:**
- Module-based organization with feature modules (auth, users, lists, tasks, etc.)
- Prisma ORM with PostgreSQL database
- JWT authentication with Passport
- WebSocket gateway for real-time updates
- Comprehensive permission guards and decorators
- Event-driven notification system

**Important Directories:**
- `src/common/` - Shared services, guards, interceptors, and configuration
- `src/auth/` - JWT authentication and authorization
- `src/websockets/` - Real-time WebSocket gateway with permission-aware broadcasting
- `prisma/` - Database schema and migrations
- `test/` - E2E tests with database setup/teardown

**Database Configuration:**
- Prisma client generated to `generated/prisma/` directory
- Comprehensive indexes for performance optimization
- Database connection managed by PrismaService with health checks

**Environment Setup:**
- Copy `env.example` to `.env` and configure required values
- JWT_SECRET, DATABASE_URL are mandatory
- Supports AWS Secrets Manager and HashiCorp Vault for production secrets

**Testing Strategy:**
- Unit tests with Jest (80% coverage threshold)
- E2E tests with supertest and test database isolation
- Global setup/teardown for database management in tests
- Comprehensive mocking for external services

**Real-time Features:**
- WebSocket connections with JWT authentication
- Permission-aware event broadcasting
- Connection management service for user session tracking

## Task Master Integration

This project uses Task Master for project management via MCP tools:

**Primary Interaction:** Use MCP tools (recommended) over CLI commands
- Access via `mcp__task-master-ai__*` tools in Claude Code
- Better performance and structured data exchange than CLI
- Run `mcp__task-master-ai__initialize_project` first if not already done

**Standard Workflow:**
- Use `get_tasks` to see current tasks and status
- Use `next_task` to determine what to work on next
- Use `get_task` with specific ID for detailed task information
- Use `set_task_status` to mark tasks as in-progress/done
- Use `expand_task` to break down complex tasks into subtasks
- Use `update_subtask` to log implementation notes and progress

**Configuration:**
- API keys must be in `.cursor/mcp.json` env section for MCP tools
- Use `models` tool to configure AI models if needed
- Task files generated in `tasks/` directory from tasks.json

## Code Style Guidelines

**From Cursor Rules:**
- Use bullet points for clarity in documentation
- Include both DO and DON'T examples when relevant
- Reference actual code over theoretical examples
- Use consistent formatting and maintain DRY principles
- Keep descriptions concise and actionable

**NestJS Patterns:**
- Follow existing module structure and dependency injection patterns
- Use decorators for guards, interceptors, and validation
- Implement proper error handling with custom filters
- Follow service-controller separation of concerns