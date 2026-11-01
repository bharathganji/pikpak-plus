---
name: npx-skills
description: >-
  Manage, search, install, list, update, and remove AI agent skills using the `skills` / `npx skills` CLI from the open agent skills ecosystem (skills.sh). Use when the user asks to find, install, inspect, update, or remove skills, or when specialized domain skills/runbooks are needed for the project.
---

# Agent Skills Management (`npx skills`)

The `skills` CLI (from Vercel Labs and the open agent skills ecosystem at [skills.sh](https://skills.sh)) acts as a package manager for AI agent skills and runbooks. It natively supports **Antigravity** and **Antigravity CLI**, placing project skills into `.agents/skills/` and global skills into `~/.gemini/antigravity-cli/skills/`.

Both `skills` (installed globally) and `npx skills` are available in the terminal.

---

## Quick Reference

### 1. Search and Discover Skills

Search the public catalog of skills on [skills.sh](https://skills.sh):

```bash
# Search by keyword
skills find <query>

# Search within a specific GitHub owner or organization
skills find <query> --owner <owner>
```

### 2. Inspect Skills Before Installing

List the skills available inside a repository or package without downloading them:

```bash
skills add <owner/repo> -l
```

### 3. Install Skills

When running non-interactively within the agent environment, always provide `-y` (or `--yes`) and optionally target the agent:

```bash
# Install all skills from a repo into the current workspace (.agents/skills/)
skills add <owner/repo> --agent antigravity-cli -y

# Install a specific skill from a repository into the project
skills add <owner/repo> --skill <skill-name> --agent antigravity-cli -y

# Copy files instead of creating symlinks (recommended for VCS sharing)
skills add <owner/repo> --skill <skill-name> --copy --agent antigravity-cli -y

# Install globally for all workspaces on this machine (~/.gemini/antigravity-cli/skills/)
skills add <owner/repo> --skill <skill-name> -g --agent antigravity-cli -y
```

### 4. List Installed Skills

```bash
# List project-level skills
skills list

# List global-level skills
skills list -g

# Output machine-readable JSON
skills list --json
```

### 5. Update Skills

```bash
# Update all project skills
skills update

# Update a specific project skill
skills update <skill-name>

# Update global skills
skills update -g
```

### 6. Remove Skills

```bash
# Remove a project-level skill
skills remove <skill-name> -y

# Remove a global skill
skills remove -g <skill-name> -y
```

---

## Workspace Integration & Post-Install Checklist

Whenever a new skill is installed:

1. **Verify Location**:
   - Project skills reside in `.agents/skills/<skill-name>/`
   - Global skills reside in `~/.gemini/antigravity-cli/skills/<skill-name>/`
2. **Review `SKILL.md`**:
   - Inspect the installed `SKILL.md` to ensure frontmatter (`name`, `description`) is accurate and instructions do not contradict workspace rules ([`AGENTS.md`](file:///home/ubuntu/projects/pikpak-plus/AGENTS.md)).
3. **Commit to Git**:
   - For project skills intended to be shared with teammates, ensure the skill directory in `.agents/skills/` is committed to version control.
