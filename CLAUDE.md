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

## Task Master Integration 🎯

**Philosophy:** MCP tools are preferred over CLI for better performance, structured data, and error handling.

### Essential MCP Tools (Prioritized Usage)

**Project Setup:**
- `mcp__task-master-ai__initialize_project` - Initialize project structure (⚠️ Only run once at project start if `.taskmasterconfig` doesn't exist!)
- `mcp__task-master-ai__parse_prd` - Generate initial tasks from PRD (⚠️ AI call - takes ~1 min)
- `mcp__task-master-ai__models` - Configure AI models and API keys

**Task Management:**
- `mcp__task-master-ai__get_tasks` - View current tasks with optional filtering
- `mcp__task-master-ai__next_task` - Get next available task based on dependencies
- `mcp__task-master-ai__get_task` - View detailed task information
- `mcp__task-master-ai__set_task_status` - Update task status (pending, in-progress, done, etc.)

**Task Creation & Updates:**
- `mcp__task-master-ai__add_task` - Add new task with AI structuring (⚠️ AI call)
- `mcp__task-master-ai__update_task` - Update specific task (⚠️ AI call)
- `mcp__task-master-ai__update_subtask` - Append timestamped notes to subtask (⚠️ AI call)
- `mcp__task-master-ai__update` - Update multiple tasks from ID onwards (⚠️ AI call)

**Task Structure:**
- `mcp__task-master-ai__expand_task` - Break down complex task into subtasks (⚠️ AI call)
- `mcp__task-master-ai__expand_all` - Expand all eligible tasks (⚠️ AI call)
- `mcp__task-master-ai__add_subtask` - Add subtask to parent task
- `mcp__task-master-ai__remove_task` - Remove task/subtask permanently
- `mcp__task-master-ai__move_task` - Reorganize task hierarchy

**Dependencies:**
- `mcp__task-master-ai__add_dependency` - Create task dependencies
- `mcp__task-master-ai__remove_dependency` - Remove dependencies
- `mcp__task-master-ai__validate_dependencies` - Check for circular refs
- `mcp__task-master-ai__fix_dependencies` - Auto-fix dependency issues

**Analysis:**
- `mcp__task-master-ai__analyze_project_complexity` - Analyze task complexity (⚠️ AI call)
- `mcp__task-master-ai__complexity_report` - View complexity analysis
- `mcp__task-master-ai__generate` - Generate markdown files from tasks.json

**⚠️ AI Processing Note:** Tools marked with "AI call" can take up to 1 minute. These include: `parse_prd`, `add_task`, `update_task`, `update_subtask`, `update`, `expand_task`, `expand_all`, `analyze_project_complexity`.

**File Structure:**
- Configuration: `.taskmasterconfig` (auto-managed, never edit manually)
- Tasks: `tasks/tasks.json` (main task file)
- Generated: `tasks/` directory (individual markdown files)
- Reports: `.taskmaster/reports/task-complexity-report.json`

## Development Workflow 🔄

### Standard Session Flow
1. **Start session:** Use `get_tasks` to see current status
2. **Select task:** Use `next_task` for priority-based selection  
3. **Implement:** Follow task details and dependencies
4. **Update progress:** Mark tasks with `set_task_status`
5. **Add discoveries:** Use `add_task` for new requirements

### Advanced Workflows

**Initial Project Setup:**
1. Run `initialize_project` with project root
2. Create PRD in `.taskmaster/docs/prd.txt`
3. Run `parse_prd` to generate initial tasks (ask the user if it should force loaded or appended)
4. Run `analyze_project_complexity` for task breakdown recommendations
5. Use `expand_all` or individual `expand_task` for complex tasks

**Handling Changes:**
- **Single task updates:** Use `update_task` with specific changes
- **Multiple task updates:** Use `update` with `from` ID for cascading changes
- **Implementation notes:** Use `update_subtask` to append timestamped details
- **Task reorganization:** Use `move_task` for hierarchy changes

**Quality Assurance:**
- Run `validate_dependencies` before major milestones
- Use `complexity_report` to review task breakdown adequacy
- Use `generate` to sync markdown files with tasks.json

### Task Status Lifecycle
- `pending` → `in-progress` → `review` → `done`
- Alternative paths: `deferred`, `cancelled`
- Blocked tasks: Use dependencies rather than status

## Code Style

- Follow NestJS patterns and conventions
- Use dependency injection and decorators
- Implement proper error handling
- Maintain service-controller separation
- Keep code DRY and well-documented
- **Package Installation:** Always install packages without version numbers (e.g., `pnpm add react-hook-form` not `pnpm add react-hook-form@7.48.2`)

## Testing Strategy

- Unit tests with Jest (80% coverage threshold)
- E2E tests with supertest
- Database isolation for tests
- Mock external services

## Real-time Features

- WebSocket connections with JWT auth
- Permission-aware event broadcasting
- Connection management for user sessions

## Task Master Configuration 🔧

### Environment Setup
**API Keys** (required for corresponding AI providers):
- `ANTHROPIC_API_KEY` - For Claude models (recommended)
- `PERPLEXITY_API_KEY` - For research-backed operations
- `OPENAI_API_KEY` - For GPT models
- `GOOGLE_API_KEY` - For Gemini models
- `OPENROUTER_API_KEY` - For OpenRouter models
- `XAI_API_KEY` - For Grok models

**Location:**
- CLI usage: Add to `.env` file in project root
- MCP usage: Add to `env` section in `.cursor/mcp.json`

### Model Configuration
Use `mcp__task-master-ai__models` to:
- View current model assignments
- Set primary, research, and fallback models
- Configure custom Ollama/OpenRouter models
- List available models with cost information

**Never manually edit `.taskmasterconfig`** - always use the models tool.

## Quick Reference 📚

**Task States:**
- `pending` - Ready to work on
- `in-progress` - Currently being worked on
- `review` - Completed, awaiting review
- `done` - Completed and verified
- `deferred` - Postponed
- `cancelled` - No longer needed

**Common Commands:**
```bash
# View tasks and get next one
mcp__task-master-ai__get_tasks
mcp__task-master-ai__next_task

# Update task status
mcp__task-master-ai__set_task_status --id="5" --status="in-progress"

# Add new task
mcp__task-master-ai__add_task --prompt="Implement user authentication"

# Expand complex task
mcp__task-master-ai__expand_task --id="5"

# Validate dependencies
mcp__task-master-ai__validate_dependencies
```

**File Locations:**
- Tasks: `.taskmaster/tasks/tasks.json`
- Config: `.taskmasterconfig` (auto-managed)
- PRD: `.taskmaster/docs/prd.txt`
- Reports: `.taskmaster/reports/`

For complete Task Master documentation, refer to `.cursor/rules/taskmaster.mdc`.

## Internationalization (i18n) 🌍

**Supported Languages:**
- English (en) - Default
- German (de) - Vollständig unterstützt

**Translation Files Location:**
- English: `frontend/public/locales/en/`
- German: `frontend/public/locales/de/`

**Translation Keys Structure:**
- `auth.json` - Authentication related texts (login, register, validation)
- `common.json` - General UI texts (navigation, actions, lists, notifications)

**Usage in Components:**
```tsx
import { useTranslation } from '../hooks';

const { t } = useTranslation('common'); // or 'auth'
<span>{t('navigation.dashboard')}</span>
```

**Recently Added German Translations:**
- Login form "Remember me" checkbox → "Angemeldet bleiben"
- List management UI (create, edit, validation messages)
- List card statistics and actions
- All hardcoded German texts moved to translation files