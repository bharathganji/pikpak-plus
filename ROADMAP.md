# Modernization & Migration Roadmap

## Overview
This roadmap tracks the milestones, subtasks, verification requirements, and implementation status for the `pikpak-plus` modernization project.

---

## Milestone Status Overview
| Milestone | Description | Target Component | Status | Owner |
|-----------|-------------|------------------|:------:|-------|
| **M1** | Modern Modular PikPakAPI & Reference Bug Fixes | `pikpak-plus-server/PikPakAPI` | **DONE** | `worker_m1_it2` |
| **M2** | Backend Service Integration, Security Hardening & Pytest Suite | `pikpak-plus-server` | **DONE** | `worker_m2` |
| **M3** | Frontend Architectural Modernization & Gap Closure | `pikpak-plus-client` | **DONE** | `worker_m3` |
| **M4** | Frontend Resilience, Virtualization & Build Cleanliness | `pikpak-plus-client` | **DONE** | `worker_m4` |
| **E2E** | E2E Testing Track, Documentation & Final Acceptance | Full System | **IN_PROGRESS** | `orchestrator_1` / `e2e_track` |

---

## Detailed Milestone Breakdown

### Milestone 1: Modern Modular PikPakAPI & Reference Bug Fixes
- [x] Port modern modular architecture (`client.py`, `auth.py`, `throttler.py`, `session_store.py`, `files.py`, `tasks.py`, `shares.py`, `account.py`, `models.py`, `enums.py`, `exceptions.py`, `constants.py`, `utils.py`, `docs.py`).
- [x] Fix Defect 1: `files.py` `path_to_id` pagination token leak.
- [x] Fix Defect 2: `utils.py`/`client.py` typo `PACKAG_ENAME` -> `PACKAGE_NAME`.
- [x] Fix Defect 3: `utils.py` trailing space in `SDK_VERSION` User-Agent.
- [x] Fix Defect 4: `__init__.py` Python 3.8/3.9 `NoneType` import crash.
- [x] Fix Defect 5: `client.py` 401 retry stale Authorization header.
- [x] Remediate DEFECT-M1-ADV-1: Auth endpoint 401 recursion block in `client.py`.
- [x] Remediate DEFECT-M1-ADV-2: Task-reentrant `AsyncRLock` & double-checked token freshness in `auth.py`.
- [x] Remediate DEFECT-M1-ADV-3: Canary probe isolation in `CircuitState.HALF_OPEN` in `throttler.py`.
- [x] Integrate and retain `WebDavMixin` (`webdav.py`) with all 5 methods.
- [x] Verify SDK unit and mock tests with `respx` (74 tests passed, 100% pass rate).

### Milestone 2: Backend Service Integration, Security & Tests
- [x] Wire modernized `PikPakApi` into `pikpak_service.py` and Celery tasks.
- [x] Connect `token_refresh_callback` to Supabase token manager and Redis locks.
- [x] Fix `JWT_SECRET_KEY` multi-worker drift in `app/core/config.py`.
- [x] Fix `PIKPAK_USER` environment collision with Linux `$USER`.
- [x] Harden `@internal_only` against IP spoofing.
- [x] Validate and sanitize request payloads on all 29 routes.
- [x] Build comprehensive pytest test suite in `tests/` with 100% pass rate.

### Milestone 3: Frontend Architectural Modernization & Gap Closure
- [x] Rename `src/proxy.ts` to `src/middleware.ts` with standard Next.js export.
- [x] Whitelist `/reset-password` and `/maintenance` in `AuthProvider`; eliminate unauthenticated flash.
- [x] Build File Explorer component (folder traversal, breadcrumbs, file details).
- [x] Build Direct File Download action buttons and handlers.
- [x] Build Remote Share Management view (list, create, revoke).
- [x] Sync task and activity state with backend `GET /tasks` API.
- [x] Modularize frontend service layers with caching hooks.

### Milestone 4: Frontend Resilience, Virtualization & Build Cleanliness
- [x] Implement Next.js error boundaries (`error.tsx`, `global-error.tsx`, component boundaries).
- [x] Implement loading skeletons (`loading.tsx`, `skeleton.tsx`).
- [x] Implement virtualized list rendering / pagination for large directory and task views.
- [x] Add `clsx` to `package.json`, configure `.npmrc`, setup `eslint.config.mjs`.
- [x] Verify clean `npm run build` and `npm run lint` with 0 errors.

### E2E Testing & Final Acceptance
- [ ] Multi-tier test suite execution (Tiers 1-4 per `TEST_INFRA.md`).
- [ ] Adversarial coverage hardening (Tier 5).
- [ ] Forensic integrity audit: 100% genuine code, zero mock shortcuts in production.
- [ ] Final reporting to Sentinel.
