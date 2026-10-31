# 🧹 Code Health Improvement Rule

This rule guides autonomous agents and engineers when identifying, planning, refactoring, and verifying code health issues across the codebase.

## Objective

The mission of code health improvements is to enhance the maintainability, readability, type safety, and architectural elegance of the codebase **without changing existing functional behavior**.

When in doubt, **preserve functionality over cleanliness**.

---

## Code Health & Task Delegation Template

Use the following standardized template when formulating, delegating, or executing bug fixes, feature implementations, codebase cleanups, or code health tasks:

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

---

## Operational Principles

1. **Behavior Preservation (Zero Functional Regressions)**
   - Never alter the external API contract, return types, or observable behaviors of functions/components during a code health task unless explicitly instructed.
   - Maintain backward-compatibility aliases if modifying exported constants, functions, or class names.

2. **Mandatory Deep Verification**
   - Python (`pikpak-plus-server`): Run unit tests with `$env:PYTHONPATH="pikpak-plus-server"` and linter (`ruff check pikpak-plus-server/`).
   - Python (`PikPakAPI`): Run unit tests via `.venv\Scripts\pytest.exe tests/` and linter checks (`.venv\Scripts\ruff.exe check .`).
   - TypeScript/React (`pikpak-plus-client`): Run type checks (`npx tsc --noEmit`) and linter (`npm run lint`).
   - Never skip or delete existing tests to force a pass.

3. **Focused Diff Scope**
   - Keep diffs localized and atomic to the specific code health candidate.
   - Do not bundle unrelated refactorings or style debates into one change.

4. **Exception Handling & Linter Rules (`BLE001`)**
   - **HTTP Route Handlers (`app/api/routes/*.py`)**: Catch `Exception`, log error details, and return structured JSON 500. Annotate with `# noqa: BLE001` to denote intentional boundary containment.
   - **Core/Utils/Parsers (`app/core/`, `app/utils/`)**: Catch only specific, expected exceptions (`(ValueError, TypeError)`, `KeyError`). Never catch blind `Exception`.
   - **Service Layer (`app/services/`)**: Fail fast. Wrap low-level network errors into domain exceptions (`raise DomainError(...) from err`). Never swallow with `except Exception: pass`.
   - **Optional Subsystem Bootstrap (`app/__init__.py`)**: Catch `Exception` around non-critical services (Redis, WebDAV manager) with `# noqa: BLE001` to enable degraded-mode server operation.
