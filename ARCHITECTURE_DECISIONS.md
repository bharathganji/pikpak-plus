# Architecture Decision Records (ADRs)

## ADR 1: Retention & First-Class Integration of `WebDavMixin`

- **Status**: Accepted
- **Context**: The reference library `PikPakAPI/pikpakapi` completely omits `webdav.py` and WebDAV management methods. However, `pikpak-plus-server/app/services/pikpak_service.py` (lines 450-511) and background Celery workers rely on `get_webdav_applications`, `toggle_webdav`, `create_webdav_application`, `delete_webdav_application`, and `modify_webdav_application` for daily WebDAV provisioning.
- **Decision**: Retain `WebDavMixin` as a first-class module in `pikpak-plus-server/PikPakAPI/webdav.py` and integrate it into the `PikPakApi` inheritance chain alongside `BaseClient`, `AuthMixin`, `FilesMixin`, etc.
- **Consequences**: Strictly preserves all WebDAV business logic and backward compatibility without breaking background automation or external WebDAV consumers.

---

## ADR 2: Reference SDK Defect Remediation

- **Status**: Accepted
- **Context**: Static analysis and inspection of `PikPakAPI/pikpakapi` revealed 5 specific defects:
  1. `files.py`: `path_to_id` pagination cursor leak across directory segments.
  2. `utils.py`: `PACKAG_ENAME` identifier typo.
  3. `utils.py`: Trailing whitespace in `SDK_VERSION` User-Agent string.
  4. `__init__.py`: `NoneType` import crashing on Python <3.10.
  5. `client.py`: Stale caller headers in 401 token refresh retry loop.
- **Decision**: Remediate all 5 defects during the porting and modernization of `pikpak-plus-server/PikPakAPI`.
- **Consequences**: Guarantees rock-solid path resolution, clean User-Agent headers, compatibility with older Python versions, and reliable token refresh behavior.

---

## ADR 3: Anti-429 Sliding-Window Limiter & Circuit Breaker

- **Status**: Accepted
- **Context**: PikPak's upstream API enforces aggressive rate limits (IP/account lockout for up to 24 hours upon excessive requests).
- **Decision**: Integrate the sliding-window `Throttler` (3 requests/second ceiling with 60-second login cooldown) and an active `CircuitBreaker` that parses `Retry-After` headers and immediately halts subsequent dispatches until the timeout expires.
- **Consequences**: Prevents cascade failures and eliminates 429-triggered service outages during burst workloads or background polling.

---

## ADR 4: 3-Tier Auth Guardian with Supabase & Redis Token Synchronization

- **Status**: Accepted
- **Context**: The reference SDK uses disk-based session files (`~/.pikpak/sessions`), whereas `pikpak-plus-server` manages tokens centrally via Supabase database table `pikpak_tokens` and Redis locks.
- **Decision**: Implement `token_refresh_callback` in `PikPakApi` to trigger database updates in Supabase and distributed lock synchronization in Redis whenever tokens are refreshed. Retain disk caching as an optional secondary layer. Guard auth resolution with `asyncio.Lock` to avoid concurrent login storms.
- **Consequences**: Seamless zero-network-call token hit when fresh, zero password re-exposure on token refresh, and synchronization across distributed workers.

---

## ADR 5: Multi-Worker JWT Secret & Security Hardening

- **Status**: Accepted
- **Context**:
  1. `app/core/config.py` generated random bytes on startup if `JWT_SECRET_KEY` was missing. In multi-worker Gunicorn deployments (`workers = 2`), each worker generated a different secret, causing random 401 token rejections.
  2. `PIKPAK_USER` defaulted to `os.getenv("USER")`, colliding with the Linux OS username.
  3. `@internal_only` decorator relied solely on `request.remote_addr`, susceptible to IP spoofing behind proxies.
- **Decision**:
  1. Mandate persistent `JWT_SECRET_KEY` with deterministic fallback.
  2. Prioritize `PIKPAK_USER` and `PIKPAK_USERNAME` over generic `$USER`.
  3. Verify reverse proxy headers (`X-Forwarded-For` with trusted proxy validation) for internal route protection.
- **Consequences**: Robust multi-worker session stability, immune to OS environment collisions, hardened route authorization.

---

## ADR 6: Next.js Client Architecture, Middleware Restoration & Error Boundaries

- **Status**: Accepted
- **Context**:
  1. `src/proxy.ts` was not recognized by Next.js App Router (must be `src/middleware.ts`).
  2. `AuthProvider` blocked `/reset-password` and `/maintenance` for unauthenticated visitors.
  3. UI lacked loading skeletons and React error boundaries.
  4. Core file navigation and direct download capabilities were missing from the UI.
- **Decision**:
  1. Rename `src/proxy.ts` to `src/middleware.ts` with standard Next.js export.
  2. Fix auth route guards in `AuthProvider` to whitelist password reset and maintenance.
  3. Build dedicated File Explorer component (`src/components/features/files/`), direct download triggers, and remote share management.
  4. Implement `error.tsx`, `loading.tsx`, and reusable `skeleton.tsx` components.
- **Consequences**: Seamless user recovery flow, responsive loading experience, zero white-screen crashes, full feature completeness.

---

## ADR 7: Virtualization & Pagination for Large Listings

- **Status**: Accepted
- **Context**: Large file directories (thousands of items) and extensive task queues caused DOM bloat, memory leaks, and UI lag when rendered with naive `.map()`.
- **Decision**: Implement windowed virtualized scrolling and paginated list views in `pikpak-plus-client` for file listings and task histories.
- **Consequences**: Constant DOM size regardless of directory size, smooth 60fps scrolling, and minimal client memory consumption.

---

## ADR 8: Right-to-Left Reverse Proxy IP Resolution

- **Status**: Accepted
- **Context**: The `@internal_only` endpoint decorator in `app/api/decorators.py` protects sensitive administrative, health, and statistics endpoints. Naively trusting `request.remote_addr` or the leftmost IP of `X-Forwarded-For` exposes the system to IP spoofing, where an attacker prepends arbitrary internal IPs (`127.0.0.1`, `10.0.0.1`) to the header.
- **Decision**: Implement right-to-left evaluation of the `X-Forwarded-For` IP chain. Known trusted reverse proxies are stripped starting from the client connection backwards until the first untrusted upstream hop is reached. This verified IP is validated against RFC 1918 private subnets and localhost before granting access.
- **Consequences**: Total immunity against IP header injection across multi-tier reverse proxies, load balancers, and Cloudflare CDNs.

---

## ADR 9: Modular Frontend Service Layer & Edge Middleware

- **Status**: Accepted
- **Context**: Direct `axios` calls were scattered across React components, leading to duplicate Bearer token parsing, disjointed error responses, and inability to handle backend downtime gracefully. Furthermore, Next.js App Router requires edge routing in `src/middleware.ts` rather than non-standard entry points.
- **Decision**: Standardize `src/middleware.ts` to actively monitor backend health and route failovers to `/maintenance`. Consolidate all frontend network operations into strongly-typed singleton services (`src/services/api-client.ts`, `file-service.ts`, `task-service.ts`, `share-service.ts`, `quota-service.ts`, `auth-service.ts`) with automated authorization headers and standardized error models.
- **Consequences**: Unified network contracts, automated backend outage failover, zero FOUC during token renewal, and clean separation between UI components and API communication.

---

## ADR 10: Multi-Tier Error Boundary Architecture & List Virtualization

- **Status**: Accepted
- **Context**: Unexpected client exceptions could crash the entire React DOM tree, leaving users with unrecoverable white screens. Simultaneously, rendering hundreds or thousands of files and tasks simultaneously in the DOM triggered noticeable UI lag and high memory consumption.
- **Decision**: Deploy a comprehensive 3-tier error boundary architecture: `global-error.tsx` for root layout crashes, `error.tsx` for App Router segment recovery, and `src/components/ui/error-boundary.tsx` for isolated component card containment. For large dataset presentation, build `VirtualList` (`src/components/ui/virtual-list.tsx`) utilizing fixed/dynamic windowing and spacer divs to keep DOM node counts bounded.
- **Consequences**: Fault isolation prevents single component failures from cascading to the whole application. Directory browsing and task inspection remain fluid at 60 FPS with constant DOM memory overhead.

---

## ADR 11: Exception Handling Hierarchy & API Boundary Safety

- **Status**: Accepted
- **Context**: Unhandled exceptions inside Flask route handlers either crash the worker or produce HTML 500 error pages, violating the client JSON contract. Conversely, blindly catching `Exception` deep in core parsers or business logic masks coding bugs (`NameError`, `AttributeError`) and triggers linter errors (`BLE001`).
- **Decision**: Establish an explicit 4-tier exception handling architecture:
  1. **HTTP Route Layer (`app/api/routes/*.py`)**: Catch `Exception`, log the stack trace with `logger.error()`, and return a 500 JSON response (`{"error": "Internal server error"}`). Mark with `# noqa: BLE001` as this is an intentional outer boundary.
  2. **Core Parsers & Utilities (`app/core/`, `app/utils/`)**: Catch only specific, expected exceptions (e.g. `(ValueError, TypeError)` in date/token parsing; `jwt.PyJWTError` in auth decoding). Never catch blind `Exception`.
  3. **Service Layer (`app/services/`)**: Fail fast. Catch low-level network/SDK errors and re-raise them wrapped in domain exceptions (`raise PikpakRequestError(...) from err`). Never swallow exceptions silently with `except Exception: pass`.
  4. **System Bootstrap (`app/__init__.py`)**: Catch `Exception` around optional or auxiliary services (Redis connection pooling, WebDAV background generation) to allow the core server to boot in degraded mode rather than aborting startup. Mark with `# noqa: BLE001`.
- **Consequences**: Guarantees consistent JSON error contracts for clients, resilient degradation for non-critical services, zero masked bugs in business logic, and automated compliance with Ruff `BLE001` lint rules.

---

## ADR 11: Exception Handling Hierarchy & API Boundary Safety

- **Status**: Accepted
- **Context**: Unhandled exceptions inside Flask route handlers either crash the worker or produce HTML 500 error pages, violating the client JSON contract. Conversely, blindly catching `Exception` deep in core parsers or business logic masks coding bugs (`NameError`, `AttributeError`) and triggers linter errors (`BLE001`).
- **Decision**: Establish an explicit 4-tier exception handling architecture:
  1. **HTTP Route Layer (`app/api/routes/*.py`)**: Catch `Exception`, log the stack trace with `logger.error()`, and return a 500 JSON response (`{"error": "Internal server error"}`). Mark with `# noqa: BLE001` as this is an intentional outer boundary.
  2. **Core Parsers & Utilities (`app/core/`, `app/utils/`)**: Catch only specific, expected exceptions (e.g. `(ValueError, TypeError)` in date/token parsing; `jwt.PyJWTError` in auth decoding). Never catch blind `Exception`.
  3. **Service Layer (`app/services/`)**: Fail fast. Catch low-level network/SDK errors and re-raise them wrapped in domain exceptions (`raise PikpakRequestError(...) from err`). Never swallow exceptions silently with `except Exception: pass`.
  4. **System Bootstrap (`app/__init__.py`)**: Catch `Exception` around optional or auxiliary services (Redis connection pooling, WebDAV background generation) to allow the core server to boot in degraded mode rather than aborting startup. Mark with `# noqa: BLE001`.
- **Consequences**: Guarantees consistent JSON error contracts for clients, resilient degradation for non-critical services, zero masked bugs in business logic, and automated compliance with Ruff `BLE001` lint rules.
