import type { ClaimableToken } from '../features/claim/types'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { AppShell } from '../components/layout/app-shell'
import { useClaimableTokens, useIsClaimedBatch } from '../features/claim/queries'
import { useClaimTokens } from '../features/claim/use-claim-tokens'
import { formatNumber } from '../lib/format'

export function ClaimsRoute() {
  const { address, isConnected } = useAccount()
  const claimsQuery = useClaimableTokens(address)
  const rawClaims = claimsQuery.data ?? []
  const { enrichedClaims, isLoading: isClaimedLoading } = useIsClaimedBatch(rawClaims)

  const claims = enrichedClaims
  const unclaimedClaims = claims.filter(c => c.claimed === false)
  const claimedClaims = claims.filter(c => c.claimed === true)
  const unknownClaims = claims.filter(c => c.claimed === undefined)
  const claimableTokens = unclaimedClaims.length > 0 ? unclaimedClaims : unknownClaims
  const totalAvailable = unclaimedClaims.length + unknownClaims.length

  if (!isConnected) {
    return (
      <AppShell>
        <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--cloud-tint)]">Claim Votium Bribes</h1>
          <p className="mt-3 text-[var(--dust-tint)]">Connect your wallet to view and claim available bribes.</p>
        </section>
      </AppShell>
    )
  }

  if (claimsQuery.isPending) {
    return (
      <AppShell>
        <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-8 text-[var(--dust-tint)]">
          Loading claim data from the live Votium registry…
        </section>
      </AppShell>
    )
  }

  if (claimsQuery.isError) {
    return (
      <AppShell>
        <section className="rounded-lg border border-[var(--hot-fuchsia)]/40 bg-[color:rgba(255,22,84,0.1)] p-8 text-[var(--cloud-tint)]">
          <p className="font-semibold">Failed to load claim data</p>
          <p className="mt-2 text-sm text-[var(--dust-tint)]">{claimsQuery.error.message}</p>
          <button
            type="button"
            onClick={() => claimsQuery.refetch()}
            className="mt-4 rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110"
          >
            Retry
          </button>
        </section>
      </AppShell>
    )
  }

  if (claims.length === 0) {
    return (
      <AppShell>
        <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--cloud-tint)]">Claim Votium Bribes</h1>
          <p className="mt-3 text-[var(--dust-tint)]">No claimable Votium tokens were found for your wallet in the live claim registry.</p>
          <p className="mt-2 text-sm text-[var(--fog-tint)]">
            This view now checks the same token-level claim source Votium uses, then verifies claim status onchain.
          </p>
        </section>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--pearl-aqua)]">Votium bribes</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--cloud-tint)]">Claim Votium Bribes</h1>
              <p className="mt-2 text-sm text-[var(--dust-tint)]">
                Pulled from Votium&apos;s live token-level claim registry, then checked against the onchain stash contract.
              </p>
            </div>
            <div className="flex gap-3">
              {isClaimedLoading
                ? (
                    <span className="rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-3 py-2 text-sm text-[var(--fog-tint)]">
                      Checking claim status…
                    </span>
                  )
                : (
                    <>
                      {totalAvailable > 0 && (
                        <span className="rounded-md border border-[var(--pearl-aqua)]/35 bg-[color:rgba(120,218,228,0.08)] px-3 py-2 text-sm font-medium text-[var(--pearl-aqua)]">
                          {totalAvailable}
                          {' '}
                          available
                        </span>
                      )}
                      {claimedClaims.length > 0 && (
                        <span className="rounded-md border border-[var(--lime-cream)]/35 bg-[color:rgba(231,255,122,0.08)] px-3 py-2 text-sm font-medium text-[var(--lime-cream)]">
                          {claimedClaims.length}
                          {' '}
                          already claimed
                        </span>
                      )}
                    </>
                  )}
            </div>
          </div>
        </section>

        {totalAvailable > 0 && (
          <TokenSection
            title="Available to claim"
            subtitle="These tokens are currently claimable or still awaiting an onchain claimed-status check."
            claims={claimableTokens}
            tone="available"
          />
        )}

        {claimedClaims.length > 0 && (
          <TokenSection
            title="Already claimed"
            subtitle="These claim records still exist in the registry, but the stash contract reports them as already claimed."
            claims={claimedClaims}
            tone="claimed"
            defaultExpanded={false}
          />
        )}

        {totalAvailable > 0 && (
          <ClaimAllBar
            address={address!}
            claimableTokens={claimableTokens}
            onClaimSuccess={() => claimsQuery.refetch()}
          />
        )}

        {totalAvailable === 0 && claimedClaims.length > 0 && (
          <section className="rounded-lg border border-[var(--lime-cream)]/35 bg-[color:rgba(231,255,122,0.08)] p-6 text-center">
            <p className="text-lg font-semibold text-[var(--lime-cream)]">All caught up!</p>
            <p className="mt-2 text-sm text-[var(--dust-tint)]">Every Votium token found for this wallet is already claimed.</p>
          </section>
        )}
      </div>
    </AppShell>
  )
}

function TokenSection(
  {
    title,
    subtitle,
    claims,
    tone,
    defaultExpanded = true,
  }: {
    title: string
    subtitle: string
    claims: ClaimableToken[]
    tone: 'available' | 'claimed'
    defaultExpanded?: boolean
  },
) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const availableCount = claims.filter(claim => claim.claimed !== true).length
  const isClaimedSection = tone === 'claimed'

  return (
    <section className={`overflow-hidden rounded-lg border ${isClaimedSection ? 'border-[var(--steel-haze)]/60' : 'border-[var(--pearl-aqua)]/30'} bg-[var(--slate-machine)]`}>
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--gunmetal-mist)]/30"
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-[var(--cloud-tint)]">{title}</span>
            {isClaimedSection && (
              <span className="rounded-md border border-[var(--lime-cream)]/35 bg-[color:rgba(231,255,122,0.08)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lime-cream)]">
                Claimed
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--dust-tint)]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-[var(--dust-tint)]">
          <span>
            {isClaimedSection ? claims.length : availableCount}
            {' '}
            token
            {(isClaimedSection ? claims.length : availableCount) !== 1 ? 's' : ''}
          </span>
          <span className="text-[var(--fog-tint)]">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--steel-haze)]/60 px-5 py-4">
          <div className="space-y-2">
            {claims.map(claim => (
              <TokenRow key={`${claim.token}-${claim.index}`} claim={claim} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function TokenRow({ claim }: { claim: ClaimableToken }) {
  const isClaimed = claim.claimed === true
  const isUnknown = claim.claimed === undefined

  return (
    <div className={`flex items-center justify-between gap-4 rounded-md border px-4 py-3 ${isClaimed ? 'border-[var(--steel-haze)]/40 bg-[var(--carbon-ink)]/50 opacity-60' : isUnknown ? 'border-[var(--steel-haze)] bg-[var(--carbon-ink)]' : 'border-[var(--pearl-aqua)]/25 bg-[var(--carbon-ink)]'}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-[var(--cloud-tint)]">{claim.symbol}</span>
          {isClaimed && (
            <span className="rounded-md border border-[var(--lime-cream)]/35 bg-[color:rgba(231,255,122,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--lime-cream)]">
              Claimed
            </span>
          )}
          {isUnknown && (
            <span className="rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/50 px-2 py-0.5 text-[10px] text-[var(--fog-tint)]">
              Checking…
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--fog-tint)]">{shortAddress(claim.token)}</p>
      </div>
      <div className="text-right">
        <p className={`text-lg font-semibold ${isClaimed ? 'text-[var(--fog-tint)]' : 'text-[var(--pearl-aqua)]'}`}>
          {formatNumber(claim.amountFormatted, claim.amountFormatted >= 1 ? 2 : 4)}
        </p>
        <p className="text-xs text-[var(--fog-tint)]">{claim.symbol}</p>
      </div>
    </div>
  )
}

function ClaimAllBar({ address, claimableTokens, onClaimSuccess }: { address: `0x${string}`, claimableTokens: ClaimableToken[], onClaimSuccess: () => void }) {
  const { claimMulti, hash, isWritePending, isWriteError, writeError, isConfirming, isConfirmed, reset } = useClaimTokens()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClaim = () => {
    claimMulti(address, claimableTokens)
  }

  if (isConfirmed && hash) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--lime-cream)]/40 bg-[var(--slate-machine)] px-5 py-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-[var(--lime-cream)]">Claim submitted successfully</p>
            <p className="mt-1 text-sm text-[var(--dust-tint)]">
              Transaction:
              {' '}
              <a
                href={`https://etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--pearl-aqua)] underline hover:no-underline"
              >
                {shortAddress(hash)}
              </a>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              reset()
              onClaimSuccess()
            }}
            className="rounded-md bg-[var(--pearl-aqua)] px-4 py-2 text-sm font-medium text-[var(--carbon-ink)] transition hover:brightness-110"
          >
            Refresh claims
          </button>
        </div>
      </div>
    )
  }

  if (isConfirming) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--pearl-aqua)]/40 bg-[var(--slate-machine)] px-5 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="size-5 animate-spin rounded-full border-2 border-[var(--pearl-aqua)] border-t-transparent" />
          <div>
            <p className="text-[var(--cloud-tint)]">Waiting for transaction confirmation…</p>
            <p className="mt-1 text-xs text-[var(--fog-tint)]">This may take a moment on the Ethereum network.</p>
          </div>
        </div>
      </div>
    )
  }

  if (isWritePending) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] px-5 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="size-5 animate-spin rounded-full border-2 border-[var(--pearl-aqua)] border-t-transparent" />
          <p className="text-[var(--cloud-tint)]">Waiting for wallet confirmation…</p>
        </div>
      </div>
    )
  }

  if (showConfirm) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--hyper-magenta)]/50 bg-[var(--slate-machine)] px-5 py-4 shadow-lg">
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-[var(--cloud-tint)]">Confirm claim</p>
            <p className="mt-1 text-sm text-[var(--dust-tint)]">
              You are about to claim
              {' '}
              {claimableTokens.length}
              {' '}
              token
              {claimableTokens.length !== 1 ? 's' : ''}
              {' '}
              in a single transaction. This will cost gas.
            </p>
          </div>

          <div className="space-y-1">
            {claimableTokens.slice(0, 8).map(claim => (
              <div key={`${claim.token}-${claim.index}`} className="flex items-center justify-between rounded-md bg-[var(--carbon-ink)] px-3 py-2 text-sm">
                <span className="text-[var(--cloud-tint)]">{claim.symbol}</span>
                <span className="text-[var(--pearl-aqua)]">{formatNumber(claim.amountFormatted, claim.amountFormatted >= 1 ? 2 : 4)}</span>
              </div>
            ))}
            {claimableTokens.length > 8 && (
              <p className="text-xs text-[var(--fog-tint)]">
                +
                {' '}
                {claimableTokens.length - 8}
                {' '}
                more token
                {claimableTokens.length - 8 !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {claimableTokens.length > 10 && (
            <p className="text-xs text-[var(--hot-fuchsia)]">
              Note: Claiming many tokens at once may result in higher gas costs.
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClaim}
              className="rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110"
            >
              Confirm in wallet
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false)
                reset()
              }}
              className="rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isWriteError) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--hot-fuchsia)]/40 bg-[var(--slate-machine)] px-5 py-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-[var(--hot-fuchsia)]">Transaction failed</p>
            <p className="mt-1 text-sm text-[var(--dust-tint)]">{writeError?.message ?? 'Unknown error'}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                reset()
                setShowConfirm(true)
              }}
              className="rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky bottom-4 rounded-lg border border-[var(--pearl-aqua)]/30 bg-[var(--slate-machine)] px-5 py-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--dust-tint)]">
          <span className="font-semibold text-[var(--pearl-aqua)]">{claimableTokens.length}</span>
          {' '}
          token
          {claimableTokens.length !== 1 ? 's' : ''}
          {' '}
          available to claim
        </p>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="rounded-md bg-[var(--hyper-magenta)] px-5 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110"
        >
          Claim All
        </button>
      </div>
    </div>
  )
}

function shortAddress(address?: string) {
  if (!address)
    return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
