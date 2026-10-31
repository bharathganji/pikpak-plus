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
