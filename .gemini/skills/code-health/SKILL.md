---
name: code-health
description: Analyze, plan, refactor, and verify code health improvement tasks (maintainability, readability, typing, duplication, dead code removal) across the codebase without changing observable runtime behavior.
---

# 🧹 Code Health Skill

This skill guides autonomous AI agents and engineers in diagnosing, planning, refactoring, and verifying code health improvements across the codebase.

## Objective & Prime Directive

> **Zero Functional Regressions: Preserve functionality over cleanliness.**
> Code health improvements must make the codebase cleaner, more readable, and more maintainable **without altering existing functional behavior, API contracts, or runtime semantics**.

---

## The 6-Step Code Health Workflow

When addressing any code health issue or candidate, execute these 6 steps methodically:

### 1. 🔍 UNDERSTAND - Analyze the Code Health Issue
* Review the surrounding code, call sites, and understand its original purpose.
* Identify the specific code health smell:
  - Dead code / unused imports / unused variables
  - Inverted or overly complex boolean logic
  - Inconsistent naming or typos in exported identifiers
  - Anti-patterns (e.g., synchronous `setState` in React `useEffect`, blind exceptions `except:`)
  - Duplicate logic or missing type annotations

### 2. ⚖️ ASSESS - Evaluate the Risk
* Identify all callers, consumers, and downstream dependencies across the workspace.
* Check if external users or other packages depend on exported symbols:
  - If renaming an identifier, **always preserve backward-compatibility aliases** (e.g., `DEPRECATED_NAME = NEW_NAME`).
* Check if tests rely on current behavior (even quirks or loose contracts).

### 3. 📋 PLAN - Design the Improvement
* Design the cleanest, minimal diff that resolves the issue.
* Keep diffs localized and atomic to the specific candidate; do not bundle unrelated changes.
* Verify existing patterns in the codebase to maintain idiomatic consistency.

### 4. 🔧 IMPLEMENT - Refactor with Care
* Write clean, readable code that addresses the issue.
* Retain backward-compatibility shims where required.
* Never weaken, skip, or delete existing tests to force a pass.

### 5. ✅ VERIFY - Deep Validation
Execute the workspace-specific verification commands:
* **PikPakAPI (Python):**
  - Run tests: `.venv\Scripts\pytest.exe tests/`
  - Run linter: `.venv\Scripts\ruff.exe check .`
* **pikpak-plus-server (Python):**
  - Set PYTHONPATH: `$env:PYTHONPATH="pikpak-plus-server"`
  - Run tests: `pytest pikpak-plus-server/tests/`
  - Run linter: `ruff check pikpak-plus-server/`
* **pikpak-plus-client (TypeScript/Next.js):**
  - Run linter: `npm --prefix pikpak-plus-client run lint`
  - Run type checks: `npx --prefix pikpak-plus-client tsc --noEmit`

### 6. 📝 DOCUMENT - Report & Deliver
Format the change or candidate using the standard Code Health Task format.

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
