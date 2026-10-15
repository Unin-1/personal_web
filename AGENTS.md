# Repository Guidelines

## Project Scope & Current State

This repository contains Unin's anime-inspired personal blog, built with Astro, Svelte, and TypeScript from a pinned Firefly theme snapshot. It produces a static GitHub Pages site and includes a local-only author layout editor.

## Project Structure & Module Organization

- `src/pages/` contains Astro routes; `src/layouts/` and `src/components/` contain shared layouts and feature UI.
- `src/content/posts/`, `projects/`, and `spec/` contain Markdown/MDX articles, project introductions, and About/Friends content. Collection schemas live in `src/content.config.ts`.
- `src/config/` contains site settings. `layout.json` is the shared source for manual and visual layout editing.
- `src/styles/`, `src/scripts/`, `src/utils/`, and `src/plugins/` contain presentation, browser behavior, shared helpers, and Markdown processing.
- `public/assets/` and `public/gallery/<album-id>/` contain distributable media. Optimize images and record original asset sources in `assets-origin.md`.
- `src/editor/` and `scripts/editor/` contain the author-only local workbench; exclude its routes, scripts, and write API from production.
- `config/external-sources.json` selects public GitHub repositories and a Bilibili UID; `scripts/sync-external-data.mjs` creates the cached build snapshot in `src/data/`.
- `tests/*.test.js` contains Node behavior tests; `tests/e2e/` contains Playwright browser tests. `docs/` documents content maintenance, architecture, and deployment.
- `.github/workflows/pages.yml` validates branches and publishes `main` to GitHub Pages under `/personal_web/`.

## Build, Test, and Development Commands

Use Node.js 24 and pnpm 11; install with `pnpm install --frozen-lockfile`.

- `npm run dev`: ordinary development at `/personal_web/`.
- `npm run edit`: local-only author workbench at `http://127.0.0.1:4321/__editor/`.
- `npm run check` and `npm run lint`: Astro/TypeScript diagnostics and read-only Biome checks.
- `npm test`: Node behavior and regression tests.
- `npm run build`: external-data sync, static build, search indexing, and output validation.
- `npm run preview`: serve the production output; `npm run test:e2e`: Playwright validation using ports 4321 and 4322.

## Coding Style & Naming Conventions

Use two-space indentation and semantic HTML. Use `camelCase` for JavaScript variables and functions, and `kebab-case` for CSS classes and asset filenames. Keep presentation in stylesheets and behavior in scripts. Commit configuration alongside any formatter or linter added.

## Testing Guidelines

Use Node's built-in test runner for `*.test.js` and Playwright for browser interactions. Cover meaningful regressions in editor persistence and access checks, source sync/cache isolation, and music behavior. Check desktop/mobile layouts, keyboard navigation, image alternatives, links, and console errors. Browser tests must restore any layout files they temporarily change. Run output validation to verify `/personal_web/` paths and production exclusion of author tools.

## Commit & Pull Request Guidelines

Use focused, imperative commits with `feat:`, `fix:`, or `docs:` prefixes. Pull requests should explain changes, list validation, link relevant issues, and include screenshots for visual changes.

## Version History & Session Checkpoints

Use `https://github.com/Unin-1/personal_web.git` as `origin`. Before development, inspect local changes and remote history; preserve existing work. Use `codex/` for new branches.

Every development conversation that changes repository files must leave at least one validated commit. Stage specific paths, review the staged diff, then commit and push to the corresponding remote branch. Verify the remote commit. Report the branch, commit hash, validation, and sync status. If syncing fails, retain the local commit and explain why. Pure discussion needs no empty commit.

Preserve published history: never force-push, amend published commits, or discard existing work. Use `git revert` for rollbacks.

## Security & Personal Content

Never commit credentials or private personal information. Review contact details before publishing. Use assets you have permission to distribute.
