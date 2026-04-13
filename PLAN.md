# Custom Snapshot CVX Vote UI Plan

## Goal

Build a custom interface for Convex Snapshot gauge votes that:

1. shows the current/next vote window with countdown
2. shows a recap of pools with votes + incentives-style metrics
3. lets the user cast a weighted vote directly to Snapshot from the browser

## Proposed stack

- Runtime/package manager: **bun**
- App scaffold: **Vite + React + TypeScript**
- Routing: **react-router**
- Linting/style: **ESLint + @antfu/eslint-config**
- Wallet UX: **RainbowKit + wagmi + viem**
- Data fetching/cache: **@tanstack/react-query**
- Tables/derived views: **TanStack Table**
- Forms/state: **react-hook-form** for vote editing, plus local component state where simpler

## UI components recommendation

### Recommended: shadcn/ui + Tailwind CSS

Why:

- fast to start with in a Vite React app
- unopinionated enough to reproduce a Votium/Llama-style DeFi layout
- easy to combine with RainbowKit
- good primitives for dialogs, tables, cards, inputs, tooltips, accordions, tabs, toasts
- copy-into-project model makes customization easier than many locked component kits

### Suggested component set

- `Card` for countdown + summary boxes
- `Table` for pool recap
- `Input` for weight percentages
- `Slider` for weighted allocation editing
- `Dialog` for vote review/confirm
- `Sheet` or side panel for per-pool details
- `Badge` for state labels: active / ended / upcoming
- `Progress` for vote share visualization
- `Tabs` for `Recap | My Vote | Results`
- `Toast/Sonner` for wallet/signature/submission feedback

### Alternative if you want less setup

Use **Mantine** instead of shadcn/ui if you want a more batteries-included component system. It is excellent for dashboards, but slightly less “design-it-your-way” than shadcn.

## High-level architecture

### Frontend-only for voting

No backend is required for vote submission.

Flow:

1. connect wallet with RainbowKit
2. fetch active proposal + metadata from Snapshot GraphQL
3. build weighted choice payload from UI
4. sign Snapshot EIP-712 vote message in browser
5. submit signed envelope to Snapshot sequencer

Optional backend later only for:

- caching/normalization
- analytics
- draft persistence
- rate-limited custom APIs

## Data sources

### 1) Snapshot GraphQL

Use for:

- proposal metadata
- title, start, end, state
- proposal choices (pools)
- current scores/results
- recent votes
- space strategies / voting type

Useful entity coverage:

- `proposal(id)`
- `proposals(where: { space_in: [...] })`
- `votes(where: { proposal: ... })`
- `space(id)`

### 2) Llama Airforce API

Use for incentives recap.

Confirmed useful endpoints:

- `https://api.llama.airforce/bribes/votium/cvx-crv/rounds`
- `https://api.llama.airforce/bribes/votium/cvx-crv/119`

Provides:

- bribed totals by pool
- detailed bribes per pool/token
- proposal id for round
- round end
- useful reward data to derive `$ / vlCVX` style metrics

### 3) Optional extra sources later

- Votium pages for cross-checking display only
- ENS metadata/icons for nicer pool visuals
- token logo services

## Key product sections

### A. Vote timing / countdown

Show:

- current proposal status
- start/end timestamps
- live countdown to end
- last round / likely next round estimate

Implementation notes:

- current round countdown is deterministic from Snapshot proposal `end`
- “next vote” should initially be an estimate based on prior cadence, clearly labeled as estimated
- once enough historical proposal data is fetched, derive cadence from previous `Gauge Weight for Week of ...` proposals

### B. Pool recap

Each row should aim to show:

- pool name
- short identifier / gauge if available
- current total votes
- percent of total vote
- incentive total in USD
- derived `$ / vlCVX` or equivalent reward efficiency metric
- optional token/logo chip

Sorting/filtering:

- sort by rewards
- sort by votes
- sort by reward efficiency
- search pool name
- filter to bribed only / all pools / my allocations

### C. Vote interface

The proposal is **weighted**, so the UI should support multi-pool allocation.

Recommended UX:

- numeric percent input per selected pool
- optional slider per selected pool
- quick-add/remove pool actions
- running total with validation
- block submission unless total is exactly `100%`
- review modal before signing

Possible payload shape to Snapshot:

```json
{
  "465": 50,
  "202": 30,
  "99": 20
}
```

Where keys are **1-based Snapshot choice indexes** as strings.

## Vote submission details

### Proposal type

This Convex proposal is `weighted`.

### Browser submission approach

Recommended package:

- `@snapshot-labs/snapshot.js`

Implementation concept:

1. get connected account
2. create Snapshot client
3. call `client.vote(...)`
4. let Snapshot.js sign typed data and POST it to Snapshot sequencer

Important details:

- for weighted votes, Snapshot.js serializes `choice` as JSON string internally
- `reason`, `app`, and `metadata` can be included
- use proposal id exactly as returned by Snapshot

### Validation before submit

- wallet connected
- proposal still active
- user has non-zero voting power
- allocation total equals 100
- at least one pool selected

### Nice-to-have after submit

- fetch latest user vote
- show submitted allocation summary
- link back to Snapshot proposal

## Suggested app structure

```text
snapshot-cvx-vote-ui/
  src/
    app/
      router.tsx
      providers.tsx
    components/
      layout/
      countdown/
      pools/
      vote/
      shared/
    features/
      proposal/
        api.ts
        queries.ts
        types.ts
        utils.ts
      incentives/
        api.ts
        queries.ts
        types.ts
        utils.ts
      voting/
        buildChoicePayload.ts
        submitVote.ts
        validateAllocation.ts
      wallet/
        wagmi.ts
        chains.ts
    routes/
      home.tsx
      proposal.tsx
    lib/
      format.ts
      time.ts
      math.ts
      constants.ts
  public/
```

## Route plan

### V1 routes

- `/` -> latest active round overview
- `/proposal/:proposalId` -> explicit proposal page

### V2 routes

- `/history`
- `/address/:wallet`
- `/compare`

## State and data model notes

### Normalized pool model

Create a merged pool entity like:

```ts
interface PoolRow {
  choiceIndex: number
  choiceKey: string
  label: string
  gaugeAddress?: string
  snapshotVotes: number
  voteShare: number
  incentiveUsd?: number
  rewardEfficiency?: number
  bribeTokens?: Array<{ symbol: string, amount: number, amountUsd: number }>
}
```

### Matching strategy

Use a layered matching strategy:

1. exact choice index when available from Llama data
2. exact pool label match
3. normalized pool label match
4. gauge address match if extracted

Because names may drift, build normalization utilities early.

## Styling / UX direction

Blend:

- **Llama Airforce** for dense analytics layout
- **Votium** for simple pool cards / reward-centric summaries

Suggested visual approach:

- dark theme first
- compact table on desktop
- card stack on mobile
- sticky vote summary/footer
- right-side review drawer on desktop

## Risks / edge cases

- pool names may not match perfectly between Snapshot and Llama data
- vote percentages may be decimals in some real votes; decide whether to allow decimals in UI
- Snapshot proposal may close while user is preparing vote
- user may already have cast a vote; decide whether V1 supports editing/revoting cleanly
- some users may have delegated voting power, so “my vp” should be fetched from Snapshot-compatible logic, not guessed

## Suggested milestones

### Milestone 1 — foundation

- scaffold Vite React app with bun
- add router, wagmi, RainbowKit, ESLint antfu, React Query
- add shadcn/ui + Tailwind
- create app shell and wallet provider setup

### Milestone 2 — read-only proposal dashboard

- fetch active proposal from Snapshot
- fetch incentives from Llama Airforce
- merge into recap table
- implement countdown and summary cards

### Milestone 3 — vote builder

- add allocation editor
- enforce weighted total rules
- show review modal and payload preview

### Milestone 4 — vote submission

- integrate Snapshot.js
- sign and submit vote from browser
- handle success/error states

### Milestone 5 — polish

- query params for selected round/proposal
- my existing vote panel
- mobile UX
- sorting, filtering, search

## Initial package shortlist

```bash
bun add react-router @tanstack/react-query wagmi viem @rainbow-me/rainbowkit @snapshot-labs/snapshot.js react-hook-form zod @hookform/resolvers clsx tailwind-merge lucide-react
bun add -d typescript @types/react @types/react-dom vite eslint @antfu/eslint-config tailwindcss @tailwindcss/vite
```

If using shadcn/ui in Vite, also add the current shadcn prerequisites from its docs.

## Practical recommendation for V1

Start with:

- **shadcn/ui + Tailwind**
- **TanStack Query**
- **TanStack Table** only if the recap table becomes complex; otherwise plain table first

This gives the fastest path to a polished DeFi-style dashboard without overcommitting early.

## First build checklist

- [ ] scaffold app with bun + Vite React TS
- [ ] configure ESLint antfu
- [ ] configure wagmi + RainbowKit
- [ ] add shadcn/ui + Tailwind
- [ ] create Snapshot GraphQL client helpers
- [ ] create Llama Airforce client helpers
- [ ] build merged pool model
- [ ] implement countdown + proposal summary
- [ ] implement pool recap table
- [ ] implement weighted allocation editor
- [ ] implement Snapshot vote submit flow
- [ ] test with active cvx.eth proposal
