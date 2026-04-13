# AGENTS.md (Agent Operator Manual)

Use this file to navigate the repo quickly, run the right commands, and avoid known footguns.

## Commands (copy/paste)

- Install: `bun install`
- Dev: `bun run dev`
- Typecheck: `bun run typecheck`
- Lint/format: `bun run lint`
- Build: `bun run build`
- Cloudflare Pages preview: `bun run preview:cf`
- Cloudflare Pages deploy: `bun run deploy:cf`

## Where to look first (common edits)

- Routes/pages: `src/routes/`
- App wiring/providers/router: `src/app/`
- Snapshot data logic: `src/features/proposal/`
- Llama incentives logic: `src/features/incentives/`
- Wallet setup: `src/features/wallet/`
- Shared utilities/constants: `src/lib/`
- Cloudflare Functions: `functions/`

## Invariants / gotchas (keep these true)

- The app is a client-side SPA; do not add SSR unless the user explicitly asks.
- Llama Airforce requests should go through the same-origin `/api/llama/...` proxy path.
- Umami analytics should use the same-origin `/ev` endpoint, not `/__ev`, because Cloudflare Pages reserves `/__*`.
- The production domain is `https://cvx.ns03.dev`.

## Verification (before you say "done")

- `bun run typecheck`
- `bun run lint`
- `bun run build`

## Release workflow

- Treat release prep as a repo workflow that updates `README.md`, `CHANGELOG.md`, and `package.json` together.
- Default to a patch bump; major/minor bumps should usually come from the user.
- Add the newest release entry at the top of `CHANGELOG.md` and the short recent-updates list in `README.md`.
- Re-run verification before releasing:
  - `bun run typecheck`
  - `bun run lint`
  - `bun run build`
- Release commit format:
  - `v1.2.xx: short summary`
- Release tag format:
  - `v1.2.xx`
- When the user explicitly asks to do the release now, finish by creating the git commit, creating the matching tag, and pushing both the branch and the tag.

## Lint workflow

- If lint fails on import order / formatting / other autofixable issues, run `bunx eslint . --fix` first.
- Prefer autofix first; only make manual lint-only edits when autofix cannot resolve the issue.

## House rules

- Do not commit secrets or credentials.
- Do not edit generated outputs without a clear reason.
- Use plain ASCII quotes in code/docs.
