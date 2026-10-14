# Repository Guidelines

## Project Scope & Current State

This repository is the starting point for a personal website. Website source code, a package manifest, and tests have not been added. The structure below guides the first implementation.

## Project Structure & Module Organization

For an initial static website, use:

- `index.html` for the homepage and document metadata.
- `src/styles/` for CSS and `src/scripts/` for JavaScript.
- `assets/` for images, icons, and fonts. Optimize images before adding them.
- `tests/` for automated tests when a test runner is introduced.

Organize About, Projects, and Contact clearly. Update this guide when introducing a framework.

## Build, Test, and Development Commands

No development, build, lint, or test commands are configured yet.

- After creating `index.html`, run `python -m http.server 8000` from the root and open `http://localhost:8000`. Python is required.
- If Node.js tooling is introduced, define `npm run dev` (development), `npm run build` (production), `npm run lint` (style checks), and `npm test` (tests) in `package.json` before using them.

## Coding Style & Naming Conventions

Use two-space indentation and semantic HTML. Use `camelCase` for JavaScript variables and functions, and `kebab-case` for CSS classes and asset filenames. Keep presentation in stylesheets and behavior in scripts. Commit configuration alongside any formatter or linter added.

## Testing Guidelines

No test runner or coverage threshold exists. Check desktop/mobile layouts, keyboard navigation, image alternatives, links, and console errors. Use `*.test.js` for future tests; document the runner and cover interactions and regressions.

## Commit & Pull Request Guidelines

Use focused, imperative commits with `feat:`, `fix:`, or `docs:` prefixes. Pull requests should explain changes, list validation, link relevant issues, and include screenshots for visual changes.

## Version History & Session Checkpoints

Use `https://github.com/Unin-1/personal_web.git` as `origin`. Before development, inspect local changes and remote history; preserve existing work. Use `codex/` for new branches.

Every development conversation that changes repository files must leave at least one validated commit. Stage specific paths, review the staged diff, then commit and push to the corresponding remote branch. Verify the remote commit. Report the branch, commit hash, validation, and sync status. If syncing fails, retain the local commit and explain why. Pure discussion needs no empty commit.

Preserve published history: never force-push, amend published commits, or discard existing work. Use `git revert` for rollbacks.

## Security & Personal Content

Never commit credentials or private personal information. Review contact details before publishing. Use assets you have permission to distribute.
