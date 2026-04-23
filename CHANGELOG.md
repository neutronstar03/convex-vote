# Changelog

All notable changes to this project will be documented in this file.

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
