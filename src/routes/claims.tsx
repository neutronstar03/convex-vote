import type { ReactNode } from 'react'
import type { ClaimableToken } from '../features/claim/types'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { AppShell } from '../components/layout/app-shell'
import { useClaimableTokens, useIsClaimedBatch } from '../features/claim/queries'
import { useClaimTokens } from '../features/claim/use-claim-tokens'
import { partitionClaimsByStatus } from '../features/claim/utils'
import { formatNumber } from '../lib/format'

export function ClaimsRoute() {
  const { address, isConnected } = useAccount()
  const claimsQuery = useClaimableTokens(address)
  const rawClaims = claimsQuery.data ?? []
  const {
    enrichedClaims,
    isLoading: isClaimedLoading,
    isFetching: isClaimedFetching,
    refetch: refetchClaimStatuses,
  } = useIsClaimedBatch(rawClaims)

  const claims = enrichedClaims
  const {
    unclaimed: unclaimedClaims,
    claimed: claimedClaims,
    unverified: unknownClaims,
  } = partitionClaimsByStatus(claims)
  const claimableTokens = unclaimedClaims
  const totalAvailable = unclaimedClaims.length
  const isCheckingClaimStatus = isClaimedLoading || isClaimedFetching

  if (!isConnected) {
    return (
      <AppShell>
        <section className="ui-panel mx-auto w-full max-w-2xl p-6 text-center sm:p-8">
          <p className="ui-eyebrow">Votium bribes</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--cloud-tint)]">Connect your wallet</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
            Connect the wallet that received the bribe allocation to check its claim status.
          </p>
        </section>
      </AppShell>
    )
  }

  if (claimsQuery.isPending) {
    return (
      <AppShell>
        <section className="ui-panel p-6 sm:p-8" role="status" aria-live="polite" aria-label="Loading claim data">
          <div className="flex items-center gap-3">
            <div className="size-5 animate-spin rounded-full border-2 border-[var(--pearl-aqua)] border-t-transparent" aria-hidden="true" />
            <div>
              <p className="font-medium text-[var(--cloud-tint)]">Loading claim data</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">Checking the live Votium registry…</p>
            </div>
          </div>
        </section>
      </AppShell>
    )
  }

  if (claimsQuery.isError) {
    return (
      <AppShell>
        <section className="rounded-lg border border-[var(--hot-fuchsia)]/40 bg-[color:rgba(255,22,84,0.1)] p-6 sm:p-8" role="alert">
          <p className="text-lg font-semibold text-[var(--cloud-tint)]">Couldn’t load claim data</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">{claimsQuery.error.message}</p>
          <button
            type="button"
            onClick={() => claimsQuery.refetch()}
            className="ui-interactive mt-5 rounded-md border border-[var(--hyper-magenta)] bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] hover:brightness-110"
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
        <section className="ui-panel mx-auto w-full max-w-2xl p-6 text-center sm:p-8">
          <p className="ui-eyebrow">Votium bribes</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--cloud-tint)]">No claim records found</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--color-text-muted)]">
            This wallet has no entries in the live Votium claim registry. If you expected a bribe, check the connected account and try again later.
          </p>
        </section>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <section className="ui-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="ui-eyebrow">Votium bribes</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--cloud-tint)] sm:text-3xl">Claim available bribes</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
                Live registry entries are checked against the onchain stash before they can be submitted.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2" aria-live="polite">
              {isCheckingClaimStatus
                ? (
                    <span className="flex items-center gap-2 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                      <span className="size-2 animate-pulse rounded-full bg-[var(--pearl-aqua)]" aria-hidden="true" />
                      Verifying status…
                    </span>
                  )
                : (
                    <span className="rounded-md border border-[var(--pearl-aqua)]/35 bg-[color:rgba(120,218,228,0.08)] px-3 py-2 text-sm font-medium text-[var(--pearl-aqua)]">
                      {totalAvailable}
                      {' '}
                      available
                    </span>
                  )}
            </div>
          </div>
          {isCheckingClaimStatus && (
            <p className="mt-4 border-t border-[var(--steel-haze)]/60 pt-3 text-xs text-[var(--color-text-faint)]">
              Checking each registry entry onchain. Unverified entries stay excluded from transactions.
            </p>
          )}
        </section>

        {totalAvailable > 0 && (
          <TokenSection
            title="Available to claim"
            subtitle="Verified unclaimed balances ready for one transaction."
            claims={claimableTokens}
            tone="available"
          />
        )}

        {unknownClaims.length > 0 && !isCheckingClaimStatus && (
          <TokenSection
            title="Claim status unavailable"
            subtitle="These entries could not be verified and are excluded from transactions."
            claims={unknownClaims}
            tone="unknown"
            defaultExpanded={false}
            footer={(
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--steel-haze)]/60 pt-3">
                <p className="text-xs text-[var(--color-text-faint)]">Retry if the network request was interrupted.</p>
                <button
                  type="button"
                  onClick={() => refetchClaimStatuses()}
                  className="ui-interactive rounded-md border border-[var(--color-warning)]/40 px-3 py-2 text-sm font-medium text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10"
                >
                  Retry verification
                </button>
              </div>
            )}
          />
        )}

        {claimedClaims.length > 0 && (
          <TokenSection
            title="Already claimed"
            subtitle="Registry entries that the stash contract reports as settled."
            claims={claimedClaims}
            tone="claimed"
            defaultExpanded={false}
          />
        )}

        {totalAvailable > 0 && !isCheckingClaimStatus && (
          <ClaimAllBar
            address={address!}
            claimableTokens={claimableTokens}
            onClaimSuccess={async () => {
              await Promise.all([
                claimsQuery.refetch(),
                refetchClaimStatuses(),
              ])
            }}
          />
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
    footer,
  }: {
    title: string
    subtitle: string
    claims: ClaimableToken[]
    tone: 'available' | 'claimed' | 'unknown'
    defaultExpanded?: boolean
    footer?: ReactNode
  },
) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const availableCount = claims.filter(claim => claim.claimed !== true).length
  const isClaimedSection = tone === 'claimed'
  const isUnknownSection = tone === 'unknown'

  return (
    <section className={`overflow-hidden rounded-lg border ${isClaimedSection ? 'border-[var(--steel-haze)]/60' : isUnknownSection ? 'border-[var(--color-warning)]/30' : 'border-[var(--pearl-aqua)]/30'} bg-[var(--slate-machine)]`}>
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--gunmetal-mist)]/30"
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-[var(--cloud-tint)]">{title}</span>
            {isClaimedSection && (
              <span className="rounded-md border border-[var(--color-warning)]/35 bg-[var(--color-warning)]/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-warning)]">
                Claimed
              </span>
            )}
            {isUnknownSection && (
              <span className="rounded-md border border-[var(--lime-cream)]/35 bg-[color:rgba(231,255,122,0.08)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lime-cream)]">
                Unverified
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--dust-tint)]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-[var(--dust-tint)]">
          <span>
            {isClaimedSection || isUnknownSection ? claims.length : availableCount}
            {' '}
            token
            {(isClaimedSection || isUnknownSection ? claims.length : availableCount) !== 1 ? 's' : ''}
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
      {footer && <div className="border-t border-[var(--steel-haze)]/60 px-5 py-3">{footer}</div>}
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
          {isUnknown && (
            <span className="rounded-md border border-[var(--color-warning)]/35 bg-[var(--color-warning)]/8 px-2 py-0.5 text-[10px] text-[var(--color-warning)]">
              Unverified
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--fog-tint)]">{shortAddress(claim.token)}</p>
      </div>
      <div className="text-right">
        <p className={`text-lg font-semibold ${isClaimed ? 'text-[var(--fog-tint)]' : isUnknown ? 'text-[var(--color-warning)]' : 'text-[var(--pearl-aqua)]'}`}>
          {formatNumber(claim.amountFormatted, claim.amountFormatted >= 1 ? 2 : 4)}
        </p>
        <p className="text-xs text-[var(--fog-tint)]">{claim.symbol}</p>
      </div>
    </div>
  )
}

function ClaimAllBar({ address, claimableTokens, onClaimSuccess }: { address: `0x${string}`, claimableTokens: ClaimableToken[], onClaimSuccess: () => void | Promise<void> }) {
  const {
    claimMulti,
    hash,
    isWritePending,
    isWriteError,
    isWriteRejected,
    writeError,
    isConfirming,
    isConfirmed,
    isReceiptError,
    receiptError,
    isReceiptReverted,
    refetchReceipt,
    reset,
  } = useClaimTokens()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClaim = () => {
    setShowConfirm(false)
    claimMulti(address, claimableTokens)
  }

  if (isConfirmed && hash) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--lime-cream)]/40 bg-[var(--slate-machine)] px-5 py-4 shadow-lg" role="status" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-[var(--lime-cream)]">Claim confirmed</p>
            <p className="mt-1 text-sm text-[var(--dust-tint)]">
              Transaction confirmed on Ethereum:
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
            onClick={async () => {
              reset()
              await onClaimSuccess()
            }}
            className="ui-interactive rounded-md bg-[var(--pearl-aqua)] px-4 py-2 text-sm font-medium text-[var(--carbon-ink)] hover:brightness-110"
          >
            Refresh claims
          </button>
        </div>
      </div>
    )
  }

  if (isReceiptReverted && hash) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--hot-fuchsia)]/40 bg-[var(--slate-machine)] px-5 py-4 shadow-lg" role="alert">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-[var(--hot-fuchsia)]">Claim reverted onchain</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">The transaction was mined, but the stash contract did not accept the claim. No success state was recorded.</p>
            <a
              href={`https://etherscan.io/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-[var(--pearl-aqua)] underline hover:no-underline"
            >
              Inspect transaction
              {' '}
              {shortAddress(hash)}
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              reset()
              setShowConfirm(true)
            }}
            className="ui-interactive rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] hover:brightness-110"
          >
            Review again
          </button>
        </div>
      </div>
    )
  }

  if (isReceiptError && hash) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--hot-fuchsia)]/40 bg-[var(--slate-machine)] px-5 py-4 shadow-lg" role="alert">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-[var(--hot-fuchsia)]">Couldn’t verify the claim transaction</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">The receipt check failed, so this claim is not marked as successful. Check the transaction before trying again.</p>
            {receiptError && <p className="mt-1 text-xs text-[var(--color-text-faint)]">{receiptError.message}</p>}
            <a
              href={`https://etherscan.io/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-[var(--pearl-aqua)] underline hover:no-underline"
            >
              Inspect transaction
              {' '}
              {shortAddress(hash)}
            </a>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => refetchReceipt()}
              className="ui-interactive rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] hover:brightness-110"
            >
              Check again
            </button>
            <button
              type="button"
              onClick={reset}
              className="ui-interactive rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] hover:bg-[var(--gunmetal-mist)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isConfirming) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--pearl-aqua)]/40 bg-[var(--slate-machine)] px-5 py-4 shadow-lg" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <div className="size-5 animate-spin rounded-full border-2 border-[var(--pearl-aqua)] border-t-transparent" aria-hidden="true" />
          <div>
            <p className="font-medium text-[var(--cloud-tint)]">Confirming your claim</p>
            <p className="mt-1 text-xs text-[var(--color-text-faint)]">The transaction is broadcast. Keep this page open until it is mined.</p>
          </div>
        </div>
      </div>
    )
  }

  if (isWritePending) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] px-5 py-4 shadow-lg" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <div className="size-5 animate-spin rounded-full border-2 border-[var(--pearl-aqua)] border-t-transparent" aria-hidden="true" />
          <div>
            <p className="font-medium text-[var(--cloud-tint)]">Confirm the claim in your wallet</p>
            <p className="mt-1 text-xs text-[var(--color-text-faint)]">Your wallet will show the transaction and estimated gas.</p>
          </div>
        </div>
      </div>
    )
  }

  if (isWriteRejected) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] px-5 py-4 shadow-lg" role="status" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-[var(--cloud-tint)]">Claim cancelled in wallet</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">No transaction was submitted.</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                reset()
                setShowConfirm(true)
              }}
              className="ui-interactive rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] hover:brightness-110"
            >
              Review again
            </button>
            <button
              type="button"
              onClick={reset}
              className="ui-interactive rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] hover:bg-[var(--gunmetal-mist)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showConfirm) {
    return (
      <div className="sticky bottom-4 rounded-lg border border-[var(--hyper-magenta)]/50 bg-[var(--slate-machine)] px-5 py-4 shadow-lg" aria-labelledby="claim-confirm-title">
        <div className="space-y-4">
          <div>
            <p id="claim-confirm-title" className="text-lg font-semibold text-[var(--cloud-tint)]">Review claim</p>
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
              Claiming many tokens at once may result in higher gas costs.
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClaim}
              className="ui-interactive rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] hover:brightness-110"
            >
              Confirm in wallet
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false)
                reset()
              }}
              className="ui-interactive rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] hover:bg-[var(--gunmetal-mist)]"
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
      <div className="sticky bottom-4 rounded-lg border border-[var(--hot-fuchsia)]/40 bg-[var(--slate-machine)] px-5 py-4 shadow-lg" role="alert">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-[var(--hot-fuchsia)]">Claim transaction failed</p>
            <p className="mt-1 text-sm text-[var(--dust-tint)]">{writeError?.message ?? 'Unknown error'}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                reset()
                setShowConfirm(true)
              }}
              className="ui-interactive rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] hover:brightness-110"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={reset}
              className="ui-interactive rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] hover:bg-[var(--gunmetal-mist)]"
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
          className="ui-interactive rounded-md bg-[var(--hyper-magenta)] px-5 py-2 text-sm font-medium text-[var(--cloud-tint)] hover:brightness-110"
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
