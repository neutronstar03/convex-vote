# Voting & Claiming Implementation Plans

Two independent features to add to Convex Vote. Claiming is prioritized first.

---

## Feature A: Votium Bribe Claiming (Priority)

### Overview

Allow users to claim Votium bribe tokens directly from the app, for the last 5 completed rounds. Uses the `MultiMerkleStash` contract on Ethereum mainnet with merkle proofs from the `oo-00/Votium` GitHub repo.

### Key contracts and data sources

| Resource                                | Value                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| **MultiMerkleStash** (claim contract)   | `0x378Ba9B7D083c3157B8e7CfA7a0dA2170D26f8eE`                                              |
| **Active tokens list**                  | `https://raw.githubusercontent.com/oo-00/Votium/main/merkle/activeTokens.json`            |
| **Per-token round data**                | `https://raw.githubusercontent.com/oo-00/Votium/main/merkle/{SYMBOL}/{ROUND_PADDED}.json` |
| **Llama rounds (round number mapping)** | `https://api.llama.airforce/bribes/votium/cvx-crv/rounds`                                 |

### Claim contract ABI (relevant functions)

```json
[
  {
    "inputs": [
      { "name": "token", "type": "address" },
      { "name": "index", "type": "uint256" },
      { "name": "account", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "merkleProof", "type": "bytes32[]" }
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "account", "type": "address" },
      {
        "name": "claims",
        "type": "tuple[]",
        "components": [
          { "name": "token", "type": "address" },
          { "name": "index", "type": "uint256" },
          { "name": "amount", "type": "uint256" },
          { "name": "merkleProof", "type": "bytes32[]" }
        ]
      }
    ],
    "name": "claimMulti",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "token", "type": "address" },
      { "name": "index", "type": "uint256" }
    ],
    "name": "isClaimed",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
]
```

### Merkle JSON file format (per token per round)

```json
{
  "merkleRoot": "0x...",
  "tokenTotal": "0x...",
  "claims": {
    "0xVoterAddress...": {
      "index": 42,
      "amount": "0x...",
      "proof": "0xabc 0xdef 0x123 ..."
    }
  }
}
```

Notes:

- `amount` is hex-encoded uint256 (parse with BigInt)
- `proof` is space-separated bytes32 values (split by space to get `bytes32[]`)
- Round numbers are zero-padded to 4 digits: `0042.json`

### Data flow

```
1. Fetch activeTokens.json from GitHub
   -> array of { symbol, address, decimals }

2. Fetch Llama rounds to get latest round number
   -> latest round N

3. For rounds N, N-1, N-2, N-3, N-4:
   a. For each active token, fetch merkle JSON from GitHub
   b. Look up connected wallet address in claims{} object
   c. If found, record { token, symbol, decimals, index, amount, proof, round }

4. On-chain: isClaimed(token, index) for each found claim
   -> filter out already-claimed

5. Display unclaimed tokens grouped by round
   -> "Claim All" button builds claimMulti() tx

6. claimMulti(account, [{ token, index, amount, proof }, ...])
   -> single on-chain transaction, costs gas
```

### Implementation steps

#### Step 1: ABI and constants

**New file: `src/lib/abi/votium.ts`**

- Export the `MULTI_MERKLE_STASH_ABI` array (claim, claimMulti, isClaimed as above)

**Modify: `src/lib/constants.ts`**

- Add `VOTIUM_MULTI_MERKLE_STASH = '0x378Ba9B7D083c3157B8e7CfA7a0dA2170D26f8eE'`
- Add `VOTIUM_GITHUB_RAW = 'https://raw.githubusercontent.com/oo-00/Votium/main/merkle'`
- Add `VOTIUM_CLAIM_ROUNDS = 5` (how many past rounds to check)

#### Step 2: API layer

**New file: `src/features/claim/types.ts`**

```ts
interface ActiveToken {
  symbol: string
  address: string
  decimals: number
}

interface ClaimProof {
  index: number
  amount: bigint // parsed from hex
  proof: `0x${string}`[] // split from space-separated string
}

interface ClaimableToken {
  round: number
  token: string // ERC-20 address
  symbol: string
  decimals: number
  amount: bigint
  amountFormatted: number // amount / 10^decimals
  index: number
  proof: `0x${string}`[]
  claimed: boolean | undefined // undefined until on-chain check
}
```

**New file: `src/features/claim/api.ts`**

Functions to implement:

- `fetchActiveTokens(): Promise<ActiveToken[]>` -- fetch from GitHub
- `fetchMerkleData(symbol: string, round: number): Promise<MerkleRoundData>` -- fetch round JSON
- `findClaimsForVoter(voterAddress: string, rounds: number[]): Promise<ClaimableToken[]>` -- iterate tokens x rounds, look up voter in each JSON

Use the Llama API (already proxied) to determine the latest round number via `fetchRounds()`.

Consider caching: GitHub raw files are cacheable. Could add a CF Function to cache them, or rely on browser cache with appropriate headers.

#### Step 3: React Query hooks

**New file: `src/features/claim/queries.ts`**

- `useClaimableTokens(voterAddress?: string)` -- fetches and assembles all claimable token data for the last 5 rounds
- `useIsClaimed(token: string, index: number)` -- uses `useReadContract` with the MultiMerkleStash ABI to check if a specific claim is already taken

For checking multiple `isClaimed` statuses efficiently, use `useReadContracts` (multicall) to batch all checks in one RPC call.

#### Step 4: Claim write logic

**New file: `src/features/claim/use-claim-tokens.ts`**

- `useClaimTokens()` hook that wraps `useWriteContract` for `claimMulti()`
- Takes an array of `ClaimableToken` (filtered to unclaimed)
- Builds the `claimParam[]` struct array
- Returns `{ write, isPending, isError, isSuccess, data (txHash), error }`
- Use `useWaitForTransactionReceipt` to track confirmation

#### Step 5: Claims page UI

**New file: `src/routes/claims.tsx`**

Page layout:

- Header: "Claim Votium Bribes" with wallet connect prompt if disconnected
- Loading state while fetching claim data
- Empty state: "No claimable tokens found for your wallet"
- For each round (newest first), a collapsible section:
  - Round number + date range
  - Token rows: symbol, amount (formatted), USD value if available, claimed status indicator
  - "Already claimed" badge for claimed tokens
- Sticky bottom bar or prominent "Claim All" button:
  - Shows total tokens to claim
  - Disabled if nothing to claim or wallet not connected
  - Click triggers claimMulti() via the write hook
- TX status feedback:
  - Pending: spinner + "Waiting for confirmation in wallet..."
  - Submitted: "Transaction submitted, waiting for confirmation..."
  - Success: green checkmark + tx link to Etherscan + "Refetch claims" button
  - Error: red error message with retry option

#### Step 6: Route and navigation

**Modify: `src/app/router.tsx`**

- Add route: `/claims` -> `claims.tsx`

**Modify: `src/components/layout/app-shell.tsx`**

- Add "Claims" nav link in the navbar

#### Step 7: Edge cases to handle

- Wallet not connected: show connect prompt
- No claims found: friendly empty state
- All tokens already claimed: "All caught up!" message
- Partial claims (some tokens claimed, some not): claimMulti with only unclaimed
- GitHub fetch failures: error state with retry
- RPC failures for isClaimed: show "unknown" status, allow attempting claim
- Very large number of tokens: claimMulti handles this, but warn about gas if >10 tokens
- Round data not yet published (round just ended): "Claims not yet available for this round"

#### Step 8: Verification

- `bun run typecheck`
- `bun run lint`
- `bun run build`

---

## Feature B: In-App Snapshot Voting

### Overview

Allow users to cast weighted gauge votes directly from the proposal page, using `@snapshot-labs/snapshot.js` (already installed). Off-chain EIP-712 signature, no gas cost.

### Key technical details

| Resource               | Value                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| **Snapshot space**     | `cvx.eth`                                                              |
| **Proposal type**      | `weighted`                                                             |
| **Snapshot.js client** | `new snapshot.Client712('https://hub.snapshot.org')`                   |
| **Choice format**      | `{ "1": 60, "2": 30, "3": 10 }` (1-based string keys)                  |
| **Signing**            | EIP-712 typed data, handled by snapshot.js, triggered via wallet popup |
| **Cost**               | Free (signature only, no gas)                                          |

### snapshot.js vote API

```ts
import { Web3Provider } from '@ethersproject/providers'
import snapshot from '@snapshot-labs/snapshot.js'

const client = new snapshot.Client712('https://hub.snapshot.org')

const web3 = new Web3Provider(window.ethereum) // ethers v5 provider

await client.vote(web3, account, {
  space: 'cvx.eth',
  proposal: proposalId, // IPFS hash from Snapshot GraphQL
  type: 'weighted',
  choice: { 1: 60, 2: 30, 3: 10 },
  reason: '',
  app: 'convex-vote',
})
// Success: returns { id: "Qm..." } (IPFS hash of vote receipt)
// User rejects wallet: throws with code 4001
// Sequencer error: throws with JSON body
```

Important:

- `choice` is auto-`JSON.stringify()`-ed by the library for weighted votes -- pass raw object
- `type` and `privacy` are deleted from the signed payload by the library
- Need ethers v5 `Web3Provider` wrapping `window.ethereum` -- wagmi v3 uses viem internally, so bridge via `window.ethereum` directly
- `@ethersproject/providers` is a transitive dependency of `@snapshot-labs/snapshot.js`, available without separate install

### Implementation steps

#### Step 1: Allocation validation

**New file: `src/features/voting/validateAllocation.ts`**

```ts
interface AllocationError {
  type: 'not_connected' | 'proposal_closed' | 'zero_vp' | 'total_not_100' | 'empty' | 'negative'
  message: string
}

function validateAllocation(params: {
  isConnected: boolean
  proposalActive: boolean
  votingPower: number | undefined
  allocations: Record<string, number> // choiceIndex -> weight
}): AllocationError | null
```

Rules:

- Wallet must be connected
- Proposal must be active (start <= now <= end)
- At least one allocation > 0
- No negative values
- Total must equal 100 (or within epsilon like 99.9-100.1)
- Consider warning (not blocking) if VP is 0 or unknown

#### Step 2: Vote submission wrapper

**New file: `src/features/voting/submitVote.ts`**

```ts
async function submitVote(params: {
  proposalId: string
  allocations: Record<string, number> // { "1": 60, "2": 30, "3": 10 }
  account: string
}): Promise<{ id: string }> // IPFS receipt hash
```

Implementation:

1. Create `Web3Provider` from `window.ethereum`
2. Create `snapshot.Client712`
3. Call `client.vote(web3, account, { space, proposal, type: 'weighted', choice, app: 'convex-vote' })`
4. Return receipt or throw

#### Step 3: React Query mutation hook

**New file: `src/features/voting/use-submit-vote.ts`**

```ts
function useSubmitVote() {
  return useMutation({
    mutationFn: submitVote,
    onSuccess: () => {
      // invalidate user vote query to refetch
      queryClient.invalidateQueries({ queryKey: ['userVote'] })
    },
  })
}
```

#### Step 4: Allocation editor component

**New file: `src/features/voting/allocation-editor.tsx`**

UI elements:

- Pool selector: searchable list of proposal choices (pools), with add/remove buttons
- For each selected pool: a numeric input for weight %, with inline validation
- Running total bar at the bottom: shows current total / 100%, color-coded (green = 100%, yellow = incomplete, red = over)
- Quick actions: "Equal weight" (split evenly), "Clear all"
- Pre-fill existing vote: if `useUserVote()` returns data, pre-populate the allocations

State management:

- Local state in the component (react-hook-form or plain useState)
- `allocations: Record<string, number>` maps 1-based choice index to weight

UX:

- Disabled pools cannot be added (proposal closed)
- Only show for active proposals
- If user already voted, show "Update your vote" instead of "Cast your vote"

#### Step 5: Review/confirm modal

**New file: `src/features/voting/review-modal.tsx`**

Before signing, show a modal with:

- Summary of allocations: pool name + weight %
- Total verification: "100% -- Valid"
- Warning: "You are re-voting. This replaces your previous vote." (if applicable)
- "Sign in wallet" button (triggers the mutation)
- "Cancel" button
- During signing: "Waiting for wallet signature..." with spinner
- On error: show error message, "Try again" button

#### Step 6: Integration into proposal page

**Modify: `src/routes/proposal.tsx`**

Add a "Vote" section/panel on the proposal page:

- Only shown when wallet is connected and proposal is active (or for revoting)
- Tab or collapsible section: "My Vote" / "Cast Vote"
- Contains the `AllocationEditor` component
- "Review Vote" button opens the `ReviewModal`
- After successful vote: show confirmation, refetch user vote data

The existing "Your proposal position" section already shows current vote data. The voting UI should complement it:

- If no vote yet: show the allocation editor
- If already voted: show current vote + "Edit vote" button that opens the editor

#### Step 7: Revote support

- Snapshot allows re-voting -- latest vote replaces previous
- If `useUserVote()` returns existing vote data, pre-fill the editor with current allocations
- Show a notice: "You have already voted. Submitting will replace your current vote."
- The `choice` field from existing vote: if number -> single choice at 100%, if object -> weighted allocations

#### Step 8: Edge cases

- **User rejects signature**: catch error code 4001, show "Vote cancelled" message
- **Proposal closes while editing**: check proposal state before submit, show "This proposal has closed"
- **Snapshot sequencer down**: catch network error, show "Snapshot is temporarily unavailable, please try again"
- **Zero voting power**: show warning "You may not have voting power for this space"
- **Wallet not connected**: show connect prompt instead of editor
- **Decimals in allocation**: allow decimals (e.g., 33.3%), Snapshot handles fractional weights
- **Single pool at 100%**: valid weighted vote with single entry `{ "5": 100 }`

#### Step 9: Verification

- `bun run typecheck`
- `bun run lint`
- `bun run build`

---

## Shared considerations

### wagmi version compatibility

The project uses wagmi v3 + viem v2. Both features need:

- **Claiming**: `useReadContract` (for `isClaimed`), `useWriteContract` (for `claimMulti`) -- standard wagmi v3 APIs
- **Voting**: ethers v5 `Web3Provider` via `window.ethereum` -- snapshot.js requires ethers-style provider. wagmi v3 uses viem internally, so we bridge via `window.ethereum` directly for the signing step only.

### No new dependencies needed

- `@snapshot-labs/snapshot.js` is already installed
- `@ethersproject/providers` is a transitive dep of snapshot.js
- wagmi/viem already support `useReadContract` and `useWriteContract`
- No new packages should be needed for either feature

### File structure after both features

```
src/
  features/
    claim/
      api.ts              -- fetch active tokens, merkle data, voter claims
      types.ts            -- ActiveToken, ClaimableToken, ClaimProof
      queries.ts          -- useClaimableTokens, useIsClaimed (multicall)
      use-claim-tokens.ts -- useWriteContract wrapper for claimMulti
    voting/
      validateAllocation.ts  -- pre-submit validation rules
      submitVote.ts          -- snapshot.js client.vote wrapper
      use-submit-vote.ts     -- React Query mutation hook
      allocation-editor.tsx  -- weighted allocation UI component
      review-modal.tsx       -- sign confirmation modal
  routes/
    claims.tsx              -- /claims page (new)
    proposal.tsx            -- /proposal/:id (modified: add voting UI)
  lib/
    abi/
      votium.ts             -- MultiMerkleStash ABI
    constants.ts            -- updated with contract addresses, URLs
  app/
    router.tsx              -- updated with /claims route
  components/
    layout/
      app-shell.tsx         -- updated with Claims nav link
```

### Implementation order

1. Feature A: Claiming (Steps 1-8)
2. Feature B: Voting (Steps 1-9)
3. Final verification: typecheck + lint + build
