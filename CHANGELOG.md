# Changelog

All notable changes to this project will be documented in this file.

## v1.0.10 - 2026-08-04

- added direct vote controls to every incentivized gauge card
- unified card controls, ballot weights, and full-gauge search under one synchronized draft
- added search by pool, token, chain, pool address, gauge address, and root gauge address
- added a persistent ballot action bar and allowed ballot preparation before wallet connection
- rejected selected gauges with zero weight before vote review

## v1.0.9 - 2026-08-04

- fixed duplicate React keys when a gauge has multiple bribes denominated in the same token

## v1.0.8 - 2026-08-04

- switched the live Curve gauge round from stale Snapshot proposals to Convex's current on-chain proposal data
- matched Votium incentives to live gauges by contract address and exact voting window
- replaced Snapshot ballot submission with guarded on-chain Convex gauge voting
- added stale-round, finalized-proposal, timing, and weight-scale checks before wallet submission
- kept watch mode read-only and preserved the latest mobile, anomaly-warning, and claim-readiness improvements

## v1.0.7 - 2026-06-07

- tightened mobile proposal overview spacing and action buttons
- compacted mobile bribed-gauge cards with denser padding and 2x2 stat grids
- improved tap behavior and placement for bribe-data warning popovers

## v1.0.6 - 2026-06-07

- added active-round bribe anomaly detection against the previous Llama round
- added warning icons and severe-data callouts when current bribe data is far below the previous round
- kept current live bribe metrics visible while clarifying that active Votium/Llama data may still update

## v1.0.5 - 2026-06-07

- improved proposal page copy spacing and watched-wallet validation feedback
- moved Snapshot proposal and vote lookups to GraphQL variables
- delayed claim actions until the initial onchain claim-status check is ready

## v1.0.4 - 2026-04-25

- rolled wagmi back to a RainbowKit-compatible v2 release to restore reliable Rabby mobile connections
- updated the wallet transport import path to match the wagmi v2 stack again

## v1.0.3 - 2026-04-23

- enabled WalletConnect-powered RainbowKit mobile wallet connections
- switched wallet config to RainbowKit's default setup for more reliable mobile support

## v1.0.2 - 2026-04-17

- fixed 502 Bad Gateway on Votium claims by fetching directly from Firebase/GitHub
- removed Worker proxy to avoid Cloudflare's 50 subrequest limit

## v1.0.1 - 2026-04-17

- added footer component with version, git SHA, and external links
- fixed TypeScript type errors in Votium claims Cloudflare Function
- added @types/node for proper Node.js API type checking
- added repository and author fields to package.json

## v1.0.0 - 2026-04-17

- added Votium bribe claiming for the last 5 completed rounds via /claims page
- added in-app Snapshot weighted voting directly from the proposal page
- added robust RPC fallback with 10+ providers for improved reliability
- added navigation links for Dashboard and Claims in the header

## v0.1.0 - 2026-04-13

- first public release of Convex Vote
- added Cloudflare Pages deployment with same-origin Llama Airforce proxying
- added first-party Umami analytics proxy and bundled client tracking
- shipped the wallet-aware dashboard and detailed proposal analytics views
