# E2E Test Infra: pikpak-plus Modernization

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Tests derive directly from `ORIGINAL_REQUEST.md` and public API contracts, exercising the system as an end user / client consumer would.
- **Methodology**: Systematic 4-tier approach (Category-Partition, Boundary Value Analysis, Pairwise Combinatorial Testing, Real-World Workload Testing).
- **Integrity**: Zero mock shortcuts in production code. Verification tests distinguish between unit mock simulation and live network verification.

---

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|----------------------|:------:|:------:|:------:|
| 1 | Client Auth & Session Guardian | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ |
| 2 | Rate Limiting & Circuit Breaker | ORIGINAL_REQUEST R1, R3 | 5 | 5 | ✓ |
| 3 | File Listing, Navigation & Info | ORIGINAL_REQUEST R1, R2 | 5 | 5 | ✓ |
| 4 | File Download URL Resolution | ORIGINAL_REQUEST R1, R2 | 5 | 5 | ✓ |
| 5 | Folder Creation & Batch Operations | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ |
| 6 | Offline Download Tasks | ORIGINAL_REQUEST R1, R2 | 5 | 5 | ✓ |
| 7 | Share Management (Create, List, Revoke) | ORIGINAL_REQUEST R1, R2 | 5 | 5 | ✓ |
| 8 | WebDAV Provisioning | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ |
| 9 | Quota & Account Info | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ |
| 10 | Security & Route Hardening | ORIGINAL_REQUEST R3 | 5 | 5 | ✓ |
| 11 | Frontend Middleware & Auth Guards | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ |
| 12 | Frontend Resilience (Error/Skeleton) | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ |
| 13 | Large List Virtualization / Pagination | ORIGINAL_REQUEST R3 | 5 | 5 | ✓ |

---

## Test Architecture
- **Backend Test Runner**: `pytest` with `pytest-asyncio` and `respx` mock HTTP engine.
  - Location: `pikpak-plus-server/tests/`
  - Pass/Fail Semantics: 100% test pass rate with exit code 0.
- **Frontend Verification**: Next.js production build (`npm run build`) and lint verification (`npm run lint`).
  - Location: `pikpak-plus-client/`
  - Pass/Fail Semantics: Zero TypeScript compiler errors, zero build failures, exit code 0.

---

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | User Login, Session Caching, and Token Refresh without Password Exposure | F1, F2, F10 | Medium |
| 2 | Recursive Directory Traversal with Pagination (`path_to_id`) and File Inspection | F3, F5 | High |
| 3 | Dispatch Magnet Offline Task, Monitor Progress, and Resolve Download Link | F4, F6 | High |
| 4 | Create Remote File Share, Verify Access, and Revoke Remote Share | F7 | Medium |
| 5 | WebDAV Application Provisioning, Modification, and Toggle Sync | F8 | Medium |
| 6 | Server Multi-Worker Simulation & Concurrent Request Bursts under Rate Limiting | F1, F2, F10 | High |
| 7 | Frontend Large Directory Navigation (1,000+ items) with Virtualized 60fps Scrolling | F3, F12, F13 | High |
| 8 | Unauthenticated Password Recovery Flow through Middleware and Auth Provider | F10, F11 | Medium |

---

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥5 test cases per feature covering equivalence classes and happy paths (≥65 test cases).
- **Tier 2 (Boundary & Corner Cases)**: ≥5 test cases per feature covering null inputs, empty strings, limits, 429 Retry-After, token expiry, and error states (≥65 test cases).
- **Tier 3 (Cross-Feature Combinations)**: Pairwise coverage across major feature pairs (auth + files, files + shares, tasks + quota, webdav + auth).
- **Tier 4 (Real-World Application Scenarios)**: 8 realistic full-workflow test cases.
- **Tier 5 (Adversarial Coverage Hardening)**: White-box challenger penetration tests for edge cases, race conditions, and error recovery.
