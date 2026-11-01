# Migration Audit: PikPakAPI Modernization & Gap Analysis

## Executive Summary
This document records the comprehensive diff audit between the reference library (`PikPakAPI/pikpakapi`), the legacy server client (`pikpak-plus-server/PikPakAPI`), and the target modernized architecture.

---

## 1. Reference Code Defects & Fixes
The reference implementation at `PikPakAPI/pikpakapi` was subjected to line-by-line static analysis and dynamic test execution. Five concrete bugs were identified and queued for remediation during porting:

| # | File & Location | Description of Defect | Remediation Strategy |
|---|-----------------|-----------------------|----------------------|
| 1 | `files.py:357, 378` | **Pagination Cursor Leak in `path_to_id`**: `next_page_token` was initialized outside the traversal loop and never reset to `None` when descending into matched or newly created child directory segments. If a parent folder required pagination, its residual page token was leaked into subsequent child directory listings. | Explicitly reset `next_page_token = None` on matched directory descent and upon folder creation. |
| 2 | `utils.py:8`, `client.py:37, 429` | **Identifier Typo**: Constant defined as `PACKAG_ENAME = "com.pikcloud.pikpak"` instead of `PACKAGE_NAME`. | Rename constant to `PACKAGE_NAME` across `utils.py` and references in `client.py`. |
| 3 | `utils.py:9, 82` | **User-Agent String Trailing Space**: `SDK_VERSION = "2.0.4.204000 "` contained a trailing space, producing malformed double spaces in User-Agent headers (`User-Agent: ... sdkversion/2.0.4.204000  ...`). | Strip trailing space: `SDK_VERSION = "2.0.4.204000"`. |
| 4 | `__init__.py:12, 148` | **Python Version Incompatibility**: `from types import NoneType` used in `isinstance(v, (..., NoneType))`. `NoneType` in `types` was introduced in Python 3.10 and crashes on Python 3.8 and 3.9 despite `pyproject.toml` claiming `>=3.8.3` support. | Replace with `type(None)` or `isinstance(v, (..., type(None)))`. |
| 5 | `client.py:192-198, 264` | **Stale Header on 401 Retry**: When explicit `headers` are passed to `_make_request`, HTTP 401 token refresh loop continues to pass the original caller's headers dictionary without updating the `Authorization: Bearer <token>` header with the fresh token. | Update `headers["Authorization"] = f"Bearer {self.access_token}"` before executing retry. |

---

## 2. API Method Differences & Status Matrix

### Category A: Core Client Lifecycle & Authentication
| Method | Legacy Server | Reference SDK | Modernized Target | Action |
|--------|:-------------:|:-------------:|:-----------------:|:------|
| `__init__` | Basic username/password | Modular config, session caching, rate limiter | Modular with Supabase/Redis token store | Modernized |
| `login` | Direct POST with credentials | Direct POST + captcha handling + session cache | Integrated with 3-tier auth & rate limiting | Modernized |
| `refresh_access_token` | Minimal token refresh | 3-tier auth refresh via `/v1/auth/token` | Retained with `token_refresh_callback` | Modernized |
| `ensure_authenticated` | Not implemented | 3-tier resolution guarded by `asyncio.Lock` | Adopted | Added |
| `logout` | Partial | Clears session store and tokens | Full cleanup | Modernized |

### Category B: Rate Limiting & Circuit Breaker
| Method / Class | Legacy Server | Reference SDK | Modernized Target | Action |
|----------------|:-------------:|:-------------:|:-----------------:|:------|
| `Throttler` | None | Sliding-window (3 req/s), 60s login cooldown | Integrated into all client HTTP dispatches | Added |
| `CircuitBreaker` | None | Halts requests upon 429 Retry-After | Integrated to prevent 24h IP/account ban | Added |

### Category C: File Management
| Method / Alias | Legacy Server | Reference SDK | Modernized Target | Action |
|----------------|:-------------:|:-------------:|:-----------------:|:------|
| `file_list` / `ls` | Basic pagination | Full metadata, filters, ergonomic alias | Full metadata + fixed `path_to_id` | Modernized |
| `file_get` / `get` | Exists | Typed `FileItem`, download URL retrieval | Modernized | Modernized |
| `create_folder` / `mkdir` | Exists | Recursive folder creation, alias `mkdir` | Modernized | Modernized |
| `delete_files` / `rm` | Exists | Batch deletion, alias `rm` | Modernized | Modernized |
| `move_files` / `mv` | Exists | Batch moving, alias `mv` | Modernized | Modernized |
| `copy_files` / `cp` | Exists | Batch copying, alias `cp` | Modernized | Modernized |
| `rename_file` | Exists | Rename file or folder | Modernized | Modernized |
| `star` / `unstar` | None | Favorites / star management | Added | Added |
| `trash_list` / `trash_empty` | None | Trash recovery and purging | Added | Added |

### Category D: Tasks (Offline Downloads)
| Method / Alias | Legacy Server | Reference SDK | Modernized Target | Action |
|----------------|:-------------:|:-------------:|:-----------------:|:------|
| `offline_download` / `add_link` | Exists | Magnet/URL offline dispatch | Modernized | Modernized |
| `task_list` / `task_ls` | Exists | Typed task status list | Modernized | Modernized |
| `task_get` | Exists | Single task status | Modernized | Modernized |
| `delete_tasks` / `task_rm` | Exists | Task deletion/cancellation | Modernized | Modernized |
| `wait_for_task` | None | Polling helper with timeout | Added | Added |

### Category E: Shares
| Method / Alias | Legacy Server | Reference SDK | Modernized Target | Action |
|----------------|:-------------:|:-------------:|:-----------------:|:------|
| `create_share` / `share_create` | Exists | Full pass code & expiry support | Modernized | Modernized |
| `get_share` / `share_get` | Exists | Fetches share metadata | Modernized | Modernized |
| `list_shares` / `share_ls` | None | Remote share enumeration | Added | Added |
| `restore_share` / `share_restore`| Exists | Save shared files to drive | Modernized | Modernized |
| `delete_share` / `share_rm` | None | Revoke remote share | Added | Added |
| `share_history` | None | View share access history | Added | Added |

### Category F: WebDAV Provisioning
| Method | Legacy Server | Reference SDK | Modernized Target | Action |
|--------|:-------------:|:-------------:|:-----------------:|:------|
| `get_webdav_applications` | Exists (`webdav.py`) | **Omitted** | Retained in `PikPakAPI/webdav.py` | Retained (Critical) |
| `toggle_webdav` | Exists (`webdav.py`) | **Omitted** | Retained in `PikPakAPI/webdav.py` | Retained (Critical) |
| `create_webdav_application` | Exists (`webdav.py`) | **Omitted** | Retained in `PikPakAPI/webdav.py` | Retained (Critical) |
| `delete_webdav_application` | Exists (`webdav.py`) | **Omitted** | Retained in `PikPakAPI/webdav.py` | Retained (Critical) |
| `modify_webdav_application` | Exists (`webdav.py`) | **Omitted** | Retained in `PikPakAPI/webdav.py` | Retained (Critical) |

### Category G: Quota & Account Info
| Method / Alias | Legacy Server | Reference SDK | Modernized Target | Action |
|----------------|:-------------:|:-------------:|:-----------------:|:------|
| `get_quota` / `account_info` | Exists | Typed `QuotaInfo` (limit, usage) | Modernized | Modernized |
| `user_info` | Exists | User profile details | Modernized | Modernized |

---

## 3. Verification & Compliance
- **Backward Compatibility**: All 29 REST endpoints in `pikpak-plus-server` retain existing JSON request/response formats.
- **MCP Parity**: All 20 tools provided by `pikpak-mcp-server` are 100% supported with direct method aliases.
- **Integrity**: Zero mock logic or dummy implementations in production code; all integrations use genuine networking, caching, and rate-limiting structures.

---

## 4. Milestone M2 Audit Record: Backend Integration, Security & Test Suite
- **Modernized SDK Wiring**: Fully bridged modernized `PikPakApi` into `app/services/pikpak_service.py` and Celery background tasks. All 29 REST endpoints across 9 blueprints operate with 100% backward compatibility.
- **Token Refresh Persistence**: Connected `token_refresh_callback` to persist rotated access tokens directly into Supabase table `pikpak_tokens` synchronized via distributed Redis locks.
- **Multi-Worker JWT Drift Remediation**: Fixed multi-worker JWT token invalidation by eliminating random secret regeneration in Gunicorn worker processes (`app/core/config.py`).
- **Environment Collision Remediation**: Prevented Linux `$USER` collision by prioritizing `PIKPAK_USER` and `PIKPAK_USERNAME` over generic POSIX variables.
- **IP Spoofing Protection**: Enforced right-to-left reverse proxy traversal for `X-Forwarded-For` headers with trusted CIDR proxy checking in `@internal_only`.
- **Test Suite Verification**: Built automated pytest test suite (`pikpak-plus-server/tests/`) with offline `respx` mock engines and live fallback, achieving 100% pass rate.

---

## 5. Milestone M3 Audit Record: Frontend Architecture & Gap Closure
- **Edge Middleware Activation**: Relocated dormant `src/proxy.ts` to standard Next.js App Router entry `src/middleware.ts` exporting `middleware(request: NextRequest)`, enabling active health checking and automated `/maintenance` failover.
- **Authentication Route Guard Fix**: Added whitelisting for `/reset-password` and `/maintenance` in `AuthProvider`, resolving forced redirect loops for password recovery and eliminating unauthenticated content flashes (FOUC).
- **Dedicated Frontend Service Layer**: Centralized API network dispatches into typed singleton services in `src/services/` (`api-client.ts`, `file-service.ts`, `task-service.ts`, `share-service.ts`, `quota-service.ts`, `auth-service.ts`) with Bearer token injection and automatic 401 recovery.
- **File Explorer & Direct Downloads**: Built `src/components/features/files/file-explorer.tsx` featuring folder hierarchy navigation, breadcrumbs, search filtering, direct download URL resolution (`POST /file/download-url`), and remote share creation/revocation.
- **Server Task Synchronization**: Enhanced `MyActivityTab` to synchronize with backend `GET /tasks` (`taskService.getTasks`), unifying local client cache with server-persisted offline download tasks.

---

## 6. Milestone M4 Audit Record: Frontend Resilience, Virtualization & Clean Build
- **App Router Error Boundaries**:
  - `src/app/error.tsx`: Segment error boundary providing error digest display, retry action (`reset()`), and home navigation.
  - `src/app/global-error.tsx`: Root error boundary rendering standalone `<html><body>` with recovery button to survive layout-level initialization crashes.
  - `src/components/ui/error-boundary.tsx`: React class component error boundary with retry mechanisms, custom fallback render props, and `resetKeys` support, wrapped around all primary dashboard tabs and admin sections.
- **Loading Skeleton Architecture**:
  - `src/components/ui/skeleton.tsx`: Reusable pulse skeleton component using `cn()`.
  - `src/app/loading.tsx`: Route transition loading skeleton with responsive header, tab list, and content card placeholders.
  - Integrated responsive skeleton states into `FileExplorer`, `TaskList`, and `AdminOverview` (`DashboardOverview`), eliminating layout shifts and blank loading spinners.
- **High-Performance List Virtualization**:
  - `src/components/ui/virtual-list.tsx`: High-performance virtualized windowing component with fixed/variable item height calculation, binary search index resolution, and spacer divs to maintain 60 FPS scrolling and prevent DOM memory bloat.
  - Integrated into `FileExplorer` for directory listings (>25 items) and `TaskList` (`TaskListContent`) for high item counts (>20 tasks).
- **Tooling & Build Cleanliness**:
  - Configured ESLint 9 flat config (`eslint.config.mjs`) compatible with Next.js core-web-vitals.
  - Refactored `DisclaimerModal` to use React 19 `useSyncExternalStore` for localStorage synchronization without `setState` inside `useEffect`.
  - Escaped all JSX entities (`Don&apos;t`, `&quot;`, `&apos;ve`) across client views.
  - Verification: `npm run lint` passes with 0 errors and 0 warnings. `npm run build` passes with exit code 0, successfully compiling all 14/14 static pages and proxy middleware.

