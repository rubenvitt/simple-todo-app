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

**Database (Prisma):**
- `pnpm run db:generate` - Generate Prisma client
- `pnpm run db:migrate` - Run database migrations
- `pnpm run db:deploy` - Deploy migrations in production
- `pnpm run db:seed` - Seed database with test data
- `pnpm run db:studio` - Open Prisma Studio

## Architecture Overview

**Tech Stack:**
- NestJS backend with PostgreSQL
- Prisma ORM with generated client in `generated/prisma/`
- JWT authentication with Passport
- WebSocket gateway for real-time updates
- Module-based architecture

**Core Domain:**
- Users, Lists, Tasks, ListShares, Notifications, Invitations
- Permission system: VIEWER/EDITOR/OWNER roles
- Task states: BACKLOG → TODO → IN_PROGRESS → REVIEW → DONE

**Key Directories:**
- `src/common/` - Shared services, guards, interceptors
- `src/auth/` - JWT authentication and authorization
- `src/websockets/` - Real-time WebSocket gateway
- `prisma/` - Database schema and migrations
- `test/` - E2E tests with database isolation

**Environment Setup:**
- Copy `env.example` to `.env`
- Required: `JWT_SECRET`, `DATABASE_URL`
- Supports AWS Secrets Manager and HashiCorp Vault

## Task Master Integration

Use MCP tools for project management (preferred over CLI):
- `mcp__task-master-ai__initialize_project` - Initialize project
- `mcp__task-master-ai__get_tasks` - View current tasks
- `mcp__task-master-ai__next_task` - Get next task to work on
- `mcp__task-master-ai__expand_task` - Break down complex tasks
- `mcp__task-master-ai__set_task_status` - Update task status

Task files are generated in `tasks/` directory from `tasks.json`.

## Development Workflow

1. **Start session:** Use `get_tasks` to see current status
2. **Select task:** Use `next_task` for priority-based selection
3. **Implement:** Follow task details and dependencies
4. **Update progress:** Mark tasks with `set_task_status`
5. **Add discoveries:** Use `add_task` for new requirements

## Code Style

- Follow NestJS patterns and conventions
- Use dependency injection and decorators
- Implement proper error handling
- Maintain service-controller separation
- Keep code DRY and well-documented

## Testing Strategy

- Unit tests with Jest (80% coverage threshold)
- E2E tests with supertest
- Database isolation for tests
- Mock external services

## Real-time Features

- WebSocket connections with JWT auth
- Permission-aware event broadcasting
- Connection management for user sessions

## Quick Reference

**Task States:**
- `pending` - Ready to work on
- `done` - Completed and verified
- `deferred` - Postponed

**Dependency Check:**
```bash
task-master validate-dependencies
```

**Complexity Analysis:**
```bash
task-master analyze-complexity --research
```

For detailed Task Master documentation, refer to the separate .cursor/rules/taskmaster.mdc file.