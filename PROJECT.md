# Project: pikpak-plus End-to-End Migration & Architectural Modernization

## Architecture
Modernized full-stack cloud drive client and server application:
- **Reference Library (`PikPakAPI/pikpakapi`)**: Modern Python async/sync client featuring 57 public methods, sliding-window rate limiting (3 req/s), circuit breaker, 3-tier auth with `asyncio.Lock`, session caching, and full 20-tool MCP parity.
- **Backend (`pikpak-plus-server`)**: Flask/Gunicorn backend with 29 endpoints across 9 blueprints, Celery background workers, Redis locks, Supabase database, and integrated `PikPakAPI` modern client including `WebDavMixin`.
- **Frontend (`pikpak-plus-client`)**: Next.js 16 App Router, React 19, Tailwind CSS v4, Radix UI primitives, resilient service layers, loading skeletons, error boundaries, and virtualized file/task listings.
- **Shared Contracts**: Preserved REST API contracts on server endpoints ensuring 100% backward compatibility for web client, mobile apps, and WebDAV consumers.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Modular SDK Architecture | Port modular `BaseClient`, `AuthMixin`, `FilesMixin`, `TasksMixin`, `SharesMixin`, `AccountMixin`, `Throttler`, `SessionStore`, typed models/enums from `PikPakAPI/pikpakapi` to `pikpak-plus-server/PikPakAPI` | M1 | Survey (spec_miner) |
| 2 | Reference Bug: `path_to_id` Pagination Leak | Reset `next_page_token = None` on child directory traversal in `files.py` | M1 | Survey (spec_miner, Defect A) |
| 3 | Reference Bug: `PACKAG_ENAME` Typo | Correct identifier typo in `utils.py` and `client.py` | M1 | Survey (spec_miner, Defect B) |
| 4 | Reference Bug: Trailing Whitespace in User-Agent | Fix double whitespace in `SDK_VERSION` header formatting | M1 | Survey (spec_miner, Defect C) |
| 5 | Reference Bug: Python 3.8/3.9 `NoneType` Crash | Replace `types.NoneType` import with compatible `type(None)` or tuple | M1 | Survey (spec_miner, Defect D) |
| 6 | Reference Bug: Stale 401 Retry Headers | Refresh `Authorization` header in explicit dictionary when retrying 401 | M1 | Survey (spec_miner, Defect E) |
| 7 | WebDAV Mixin Integration | Retain and integrate `WebDavMixin` (5 methods) into modernized `PikPakApi` | M1 | Survey (spec_miner & backend) |
| 8 | Anti-429 Sliding-Window & Circuit Breaker | Integrate 3 req/s sliding window, 60s login cooldown, and Retry-After circuit breaker | M1 | Survey (spec_miner) |
| 9 | 3-Tier Auth Guardian | Implement session cache hit (0 net calls), token refresh, and signin fallback with `asyncio.Lock` | M1 | Survey (spec_miner) |
| 10 | Backend Service Wiring | Wire modernized `PikPakApi` into `pikpak_service.py` and background Celery jobs | M2 | Survey (backend) |
| 11 | Token Refresh Callback to Supabase | Bridge `token_refresh_callback` to persist rotated access tokens in Supabase with Redis locks | M2 | Survey (backend) |
| 12 | Security: Multi-Worker JWT Secret Drift | Prevent random byte generation per process in Gunicorn; enforce stable persistent secret | M2 | Survey (backend) |
| 13 | Security: `PIKPAK_USER` Environment Collision | Prioritize `PIKPAK_USER`/`PIKPAK_USERNAME` over generic `$USER` to prevent POSIX hijacking | M2 | Survey (backend) |
| 14 | Security: IP Spoofing Prevention | Harden `@internal_only` route decorator against spoofed remote IP headers | M2 | Survey (backend) |
| 15 | Input Sanitization & Request Validation | Sanitize and validate request payloads across all 29 server endpoints | M2 | ORIGINAL_REQUEST R3 |
| 16 | Route Backward Compatibility | Maintain exact JSON schemas and status codes across all 29 endpoints | M2 | ORIGINAL_REQUEST R1 |
| 17 | Backend Automated Test Suite | Build pytest suite with `respx` mock fixtures and live fallback for 100% pass rate | M2 & E2E | ORIGINAL_REQUEST R1, R4 |
| 18 | Frontend Middleware Restoration | Rename `src/proxy.ts` to `src/middleware.ts` with standard export for health/maintenance routing | M3 | Survey (frontend) |
| 19 | Authentication Flow Bugfix | Whitelist `/reset-password` and `/maintenance` in `AuthProvider`; eliminate flash of unauthenticated content | M3 | Survey (frontend) |
| 20 | File Explorer & Directory Navigation | Implement file tree, folder traversal, breadcrumbs, and file item metadata view | M3 | Survey (frontend) |
| 21 | Direct File Download Flow | Implement direct download actions using signed/resolved octet-stream URLs | M3 | Survey (frontend) |
| 22 | Remote Share Management UI | Implement UI to view, create, list, and revoke remote shares | M3 | Survey (frontend) |
| 23 | Server-Synced Activity & Tasks | Unify task/activity state with backend `GET /tasks` instead of isolated `localStorage` | M3 | Survey (frontend) |
| 24 | Dedicated Frontend Service Layer | Modularize API client services with resilient state management and caching | M3 | ORIGINAL_REQUEST R2 |
| 25 | Error Boundary Resilience | Add Next.js App Router error boundaries (`error.tsx`, `global-error.tsx`, component boundaries) | M4 | Survey (frontend) |
| 26 | Loading Skeletons | Implement `loading.tsx` and responsive skeleton placeholders for files, tasks, and admin | M4 | Survey (frontend) |
| 27 | Large List Virtualization / Pagination | Implement virtual scrolling / pagination for large file lists and task queues | M4 | ORIGINAL_REQUEST R3 |
| 28 | Frontend Build & Tooling Hardening | Add missing `clsx` dependency, `.npmrc` allow-remote, ESLint 9 config, clean TypeScript build | M4 | Survey (frontend) |
| 29 | Living Documentation Maintenance | Maintain repository `MIGRATION_AUDIT.md`, `ARCHITECTURE_DECISIONS.md`, and `ROADMAP.md` | All & E2E | ORIGINAL_REQUEST R4 |
| 30 | Opaque-Box E2E Acceptance Testing | Execute complete multi-tier test verification and adversarial coverage hardening | E2E | ORIGINAL_REQUEST Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Modern Modular PikPakAPI & Bug Fixes | Features 1, 2, 3, 4, 5, 6, 7, 8, 9; port modular SDK, fix all reference bugs, retain WebDavMixin, verify SDK unit tests | none | DONE |
| M2 | Backend Service Integration, Security & Tests | Features 10, 11, 12, 13, 14, 15, 16, 17; wire SDK to pikpak_service & Celery, fix security flaws, build 100% pytest suite | M1 | DONE |
| M3 | Frontend Architecture Modernization & Gap Closure | Features 18, 19, 20, 21, 22, 23, 24; fix middleware & auth redirect, build file explorer, direct download, share UI, service layer | M2 | DONE |
| M4 | Frontend Resilience, Virtualization & Build Cleanliness | Features 25, 26, 27, 28; error boundaries, loading skeletons, virtualized listings, npm/eslint/tsc clean build | M3 | DONE |
| E2E | E2E Testing Track, Documentation & Final Acceptance | Features 29, 30; living docs (MIGRATION_AUDIT, ARCHITECTURE_DECISIONS, ROADMAP), E2E test verification, adversarial coverage | M1, M2, M3, M4 | IN_PROGRESS |

## Interface Contracts
### PikPakAPI ↔ pikpak-plus-server
- `PikPakApi`: Async/sync client class inheriting `BaseClient`, `AuthMixin`, `FilesMixin`, `TasksMixin`, `SharesMixin`, `AccountMixin`, `WebDavMixin`.
- `token_refresh_callback(token_data: dict) -> None`: Called whenever access token is rotated.
- `webdav`: `get_webdav_applications()`, `toggle_webdav(enable: bool)`, `create_webdav_application(name: str)`, `delete_webdav_application(username, password)`, `modify_webdav_application(username, password, props)`.
- Exceptions: `PikPakException`, `PikPakAuthError`, `PikPakRateLimitError`, `PikPakCircuitBreakerOpenError`.

### pikpak-plus-server ↔ pikpak-plus-client
- Base URL: `${NEXT_PUBLIC_API_URL}` (proxied via Next.js `/api/*` or direct).
- Auth: `POST /login`, `POST /register`, `GET /me`, `POST /refresh`, `POST /forgot-password`, `POST /reset-password`.
- Files: `GET /files?parent_id=...&page_token=...`, `GET /file/<id>`, `POST /file/download-url`.
- Tasks: `GET /tasks`, `POST /add`, `GET /task/<id>`, `DELETE /task/<id>`.
- Shares: `POST /share`, `GET /shares`.
- WebDAV: `GET /webdav/applications`, `POST /webdav/toggle`, `POST /webdav/application`, `GET /webdav/active-clients`.
- Quota: `GET /quota`.
- System/Health: `GET /health/live`, `GET /health/ready`, `GET /config`.

## Code Layout
- `pikpak-plus-server/`:
  - `PikPakAPI/`: Modernized modular client (`__init__.py`, `client.py`, `auth.py`, `files.py`, `tasks.py`, `shares.py`, `account.py`, `webdav.py`, `throttler.py`, `session_store.py`, `models.py`, `enums.py`, `exceptions.py`, `constants.py`, `utils.py`, `docs.py`).
  - `app/`:
    - `api/routes/`: Flask blueprints (`auth.py`, `tasks.py`, `quota.py`, `shares.py`, `webdav.py`, `health.py`, `system.py`, `statistics.py`, `admin.py`).
    - `services/`: Core services (`pikpak_service.py`, `webdav/`).
    - `core/`: Config (`config.py`), auth (`auth.py`), token manager (`token_manager.py`).
    - `utils/`: Redis locks, helpers.
  - `tests/`: Comprehensive pytest suite (`conftest.py`, `test_pikpak_sdk.py`, `test_auth_routes.py`, `test_task_routes.py`, `test_file_routes.py`, `test_webdav_routes.py`, `test_security.py`).
- `pikpak-plus-client/`:
  - `src/`:
    - `middleware.ts`: Health check & maintenance failover routing.
    - `app/`: Next.js App Router pages, `loading.tsx`, `error.tsx`, `global-error.tsx`.
    - `components/`: UI components, error boundaries, skeletons, auth provider.
      - `features/`: `files/` (file explorer, breadcrumbs), `downloads/`, `create-share/`, `admin/`.
      - `ui/`: `skeleton.tsx`, `error-boundary.tsx`, `virtual-list.tsx`.
    - `services/`: Dedicated API client services (`api-client.ts`, `file-service.ts`, `task-service.ts`, `auth-service.ts`, `share-service.ts`).
    - `hooks/`: Query/mutation hooks, state management.
    - `types/`: Full TypeScript models and API interfaces.
