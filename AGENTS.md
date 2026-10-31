# Workspace Rules & Agent Instructions

## Code Health Tasks

When formulating, assigning, or executing general bug fixes, feature implementations, codebase cleanups, or code health tasks, use the following standardized task template:

````markdown
## Task: {{TASK_NAME}}

**Details:**

- File: `{{FILE_PATH}}`
- Description: {{TASK_DESCRIPTION_AND_GOAL}}
- Language: {{PROGRAMMING_LANGUAGE}}

**Context:**

```{{PROGRAMMING_LANGUAGE}}
{{CURRENT_CODE_OR_CONTEXT_SNIPPET}}
```

**Rationale:** {{EXPLANATION_OF_WHY_THIS_IS_NEEDED_OR_APPROACH_GUIDANCE}}

**Your Task:**
Please analyze this item and implement a solution.

1. **Understand the Context**: Review the surrounding code and the description to understand what needs to be implemented or fixed.
2. **Implement the Solution**: Write clean, production-ready code that addresses the item completely.
3. **Follow Best Practices**: Ensure your solution follows the existing codebase patterns and conventions.
4. **Test Your Changes**: Make sure your implementation works correctly and doesn't break existing functionality.

Please focus on delivering a complete, working solution for this item.
````

## Engineering & Testing Conventions

- Verify all changes with deep automated verification:
  - Python: `pytest`, `ruff check`, `pyright`
  - TypeScript / Frontend: `npm run lint`, `npx tsc --noEmit`, `npm run build`
- Preserve existing public API behavior and provide backward-compatible aliases for any renamed identifier.

## Exception Handling & Boundary Safety Conventions

Follow this 4-tier exception hierarchy across the codebase to ensure robust error handling and avoid Ruff `BLE001` (blind `except Exception`) linting failures:

### 1. HTTP Route Handlers (`app/api/routes/*.py`) — Boundary Catching

- **Rule**: Catch `Exception`, log via `logger.error(...)`, and return structured JSON (e.g., status 500). **Never allow unhandled exceptions to crash or emit raw HTML 500 error pages.**
- **Linter Annotation**: Mark with `# noqa: BLE001` since catching top-level `Exception` at the HTTP boundary is intentional.

```python
@bp.route('/my-endpoint', methods=['POST'])
def my_endpoint():
    try:
        ...
    except Exception as e:  # noqa: BLE001
        logger.error(f"Endpoint failed: {e}")
        return jsonify({"error": "Internal server error", "message": "Failed to process request"}), 500
```

### 2. Core Utilities & Parsers (`app/core/`, `app/utils/`) — Specific Exceptions Only

- **Rule**: **Do NOT catch blind `Exception`.** Always catch explicit, expected exceptions (`(ValueError, TypeError)`, `KeyError`, `jwt.PyJWTError`).
- **Rationale**: Blind catches mask coding bugs (`NameError`, `AttributeError`), preventing fail-fast debugging.

```python
# CORRECT
try:
    expires_at = datetime.fromisoformat(raw_str)
except (ValueError, TypeError):
    logger.warning("Invalid ISO timestamp format")
    return False

# INCORRECT (Anti-Pattern)
try:
    expires_at = datetime.fromisoformat(raw_str)
except Exception:  # Bad: catches and hides unexpected errors
    return False
```

### 3. Service Layer (`app/services/`) — Re-raise with Domain Context

- **Rule**: **Do NOT swallow errors silently.** Never write `except Exception: pass`.
- Catch upstream network/SDK errors and wrap them into domain exceptions using causal chaining (`raise DomainException(...) from err`).

```python
try:
    return await client.fetch_data(...)
except httpx.HTTPError as err:
    logger.error(f"Upstream service failure: {err}")
    raise PikpakRequestError(f"Failed to communicate with PikPak API: {err}") from err
```

### 4. Application Startup & Subsystem Bootstrapping (`app/__init__.py`) — Degraded Mode

- **Rule**: Non-critical services (Redis cache pool, WebDAV manager) should catch `Exception`, log a warning or error, and fallback to `None` so the core server can still boot.
- **Linter Annotation**: Mark with `# noqa: BLE001`.

```python
try:
    redis_client = redis.Redis(...)
except Exception as e:  # noqa: BLE001
    logger.error(f"Failed to initialize Redis (running without cache): {e}")
    redis_client = None
```
