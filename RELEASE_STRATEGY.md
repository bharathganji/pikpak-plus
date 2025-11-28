# Automated GitHub Release Strategy for PikPak Plus

## Overview

This document outlines the strategy for implementing automated GitHub releases that automatically generate release notes from commit details using conventional commits in the PikPak Plus monorepo.

## Conventional Commits Mapping to Semantic Versioning

### Commit Types and Version Bumps
- **feat**: New features → Minor version bump (0.1.0 → 0.2.0)
- **fix**: Bug fixes → Patch version bump (0.1.0 → 0.1.1)
- **BREAKING CHANGE**: Breaking changes in commit footer → Major version bump (0.1.0 → 1.0.0)
- **perf**: Performance improvements → Patch or Minor based on impact
- **refactor**: Code refactoring → Patch (if no behavior change) or Minor (if behavior changes)
- **docs**: Documentation changes → Patch
- **style**: Code style changes → Patch
- **test**: Test-related changes → Patch
- **chore**: Build process, tooling, etc. → Patch

### Example Commit Messages
```
feat: add user authentication system
fix: resolve issue with file download
feat: implement dark mode support
BREAKING CHANGE: changed API endpoint structure
refactor: optimize database queries for better performance
docs: update API documentation
```

## GitHub Actions Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches:
      - main

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci
        working-directory: ./pikpak-plus-client

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install Python dependencies
        run: pip install -r requirements.txt
        working-directory: ./pikpak-plus-server

      - name: Semantic Release
        uses: cycjimmy/semantic-release-action@v4
        with:
          semantic_version: 19
          extra_plugins: |
            @semantic-release/github
            @semantic-release/npm
            conventional-changelog-conventionalcommits
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Version Synchronization Strategy

Since this is a monorepo with both client (Next.js) and server (Python Flask) components:

1. **Single Version Approach**: Maintain a single version number across the entire monorepo
2. **Package Version Updates**: 
   - Update `pikpak-plus-client/package.json` version
   - Update a version file in the server directory (e.g., `pikpak-plus-server/VERSION`)
3. **Automated Sync**: The GitHub Action will handle updating both package versions during the release process

## Release Notes Generation

The automated release process will:
1. Parse conventional commits since the last release
2. Group commits by type (Features, Bug Fixes, Performance Improvements, etc.)
3. Generate release notes in markdown format
4. Include breaking changes in a separate section
5. Create GitHub releases with these auto-generated notes

## Changelog Generation

The system will maintain an automated changelog that:
- Gets updated with each release
- Contains a history of all changes
- Follows the same grouping as release notes
- Is maintained in a `CHANGELOG.md` file at the root of the repository

## Pre-release Strategy

For beta and pre-release versions:
- Use `prerelease` branches (e.g., `beta`, `alpha`)
- Configure semantic-release to create pre-releases when commits are merged to these branches
- Pre-releases will be tagged with suffixes like `-beta.1`, `-beta.2`, etc.

## Branch Protection Rules

To enforce conventional commits, implement these branch protection rules:
- Require pull request reviews before merging
- Require status checks to pass (including commit linting)
- Consider using a commit linting action to validate commit message format

## Commit Message Guidelines for the Team

### Required Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Allowed Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

### Breaking Changes
Mark breaking changes in the footer:
```
feat: new API implementation

BREAKING CHANGE: The old API endpoints have been removed
```

## Implementation Steps

1. **Set up semantic-release** in the repository
2. **Configure the GitHub Action** as shown above
3. **Update package.json** to ensure version synchronization
4. **Create a release configuration file** (`.releaserc` or `release.config.js`)
5. **Add commit linting** to enforce conventional commit format
6. **Document the process** for team members

## Release Configuration

Create a `.releaserc` file in the root directory:

```json
{
  "branches": [
    "main",
    {
      "name": "beta",
      "prerelease": true
    },
    {
      "name": "alpha",
      "prerelease": true
    }
  ],
  "plugins": [
    [
      "@semantic-release/commit-analyzer",
      {
        "preset": "conventionalcommits"
      }
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        "preset": "conventionalcommits"
      }
    ],
    [
      "@semantic-release/github",
      {
        "assets": ["dist/**", "pikpak-plus-client/package.json", "pikpak-plus-server/**"],
        "releasedLabels": ["Status: Released"],
        "releasedMilestones": ["Next"]
      }
    ]
  ]
}
```

## Version Synchronization Process

To maintain version synchronization between client and server:

1. **Root package.json**: Consider adding a root package.json for monorepo-level versioning
2. **Server version file**: Create a simple version file in the server directory
3. **Update scripts**: Create scripts that update both client and server versions simultaneously

Example server version file (`pikpak-plus-server/VERSION`):
```
v0.1.0
```

This strategy ensures that your releases are automated, consistent, and provide clear information about what changes are included in each release based on your commit history.