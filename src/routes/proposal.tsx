import type { SortKey } from '../features/proposal/ui/gauge-market'
import type { IncentiveSourceState } from '../features/proposal/ui/incentive-market'
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { isAddress } from 'viem'
import { useAccount } from 'wagmi'
import { AppShell } from '../components/layout/app-shell'
import { VoteSummaryStats } from '../components/shared/vote-summary-stats'
import { Eyebrow, Panel } from '../components/ui/primitives'
import { useEpochForRound, usePreviousEpoch } from '../features/incentives/queries'
import { getBribeDataAnomaly, mergeProposalAndEpoch } from '../features/incentives/utils'
import { useResolvedProposal } from '../features/proposal/queries'
import { capitalize, shortAddress, summarizeRewardTokens } from '../features/proposal/ui/format'
import { compareRows } from '../features/proposal/ui/gauge-market'
import { IncentiveMarketPanel } from '../features/proposal/ui/incentive-market'
import { DataFreshness, RoundCountdown, StatusNote, Tag } from '../features/proposal/ui/shared'
import { INLINE_BUTTON_CLASS, PRIMARY_ACTION_CLASS, SECONDARY_ACTION_CLASS, TERTIARY_LINK_CLASS } from '../features/proposal/ui/styles'
import { BallotPanel, BallotSummaryBar } from '../features/proposal/ui/vote-ballot'
import { getWalletVoteRecap, WalletPositionPanel } from '../features/proposal/ui/wallet-position'
import { useConvexUserVote } from '../features/voting/use-convex-user-vote'
import { useSubmitVote } from '../features/voting/use-submit-vote'
import { cn } from '../lib/cn'
import { formatCompactUsd, formatDateCompact, formatDateTime, formatNumber, getCurrentTimeZone } from '../lib/format'

const CONVEX_GOVERNANCE_URL = 'https://www.convexfinance.com/vote/weights/curve'

/**
 * Proposal page shell: queries, derived round state and section composition.
 * The sections themselves live in ../features/proposal/ui so each one can be
 * read, tested and restyled on its own.
 */
export function ProposalRoute() {
  const { proposalId } = useParams()
  const { address } = useAccount()
  const [searchParams] = useSearchParams()
  const [sortKey, setSortKey] = useState<SortKey>('incentives')
  const [searchTerm, setSearchTerm] = useState('')
  const [rewardTokenFilter, setRewardTokenFilter] = useState('all')
  const [showOnlyWalletVotes, setShowOnlyWalletVotes] = useState(false)
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null)
  const [showVoteEditor, setShowVoteEditor] = useState(false)
  const [draftAllocations, setDraftAllocations] = useState<Record<string, number>>({})
  const [reviewAllocations, setReviewAllocations] = useState<Record<string, number> | null>(null)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const submitVoteMutation = useSubmitVote()
  const proposalQuery = useResolvedProposal(proposalId)
  const proposal = proposalQuery.data
  const epochQuery = useEpochForRound(proposal)
  const previousEpochQuery = usePreviousEpoch(epochQuery.data?.round)
  const watchParam = searchParams.get('watch')?.trim()
  const watchedAddress = watchParam && isAddress(watchParam) ? watchParam : undefined
  const activeAddress = watchedAddress ?? address
  const isWatchMode = Boolean(watchedAddress)
  const hasInvalidWatchAddress = Boolean(watchParam) && !watchedAddress
  const voteQuery = useConvexUserVote(proposal?.proposalId, activeAddress)
  const timeZone = getCurrentTimeZone()
  const epoch = epochQuery.data ?? null
  const previousEpoch = previousEpochQuery.data ?? null
  const totalIncentivesUsd = epoch?.bribes.reduce((sum, bribe) => sum + bribe.amountDollars, 0)
  const bribedRows = useMemo(
    () => proposal ? mergeProposalAndEpoch(proposal, epoch).filter(row => (row.incentiveUsd ?? 0) > 0 || row.bribeTokens.length > 0) : [],
    [epoch, proposal],
  )
  const bribedVotes = useMemo(
    () => bribedRows.reduce((sum, row) => sum + row.votes, 0),
    [bribedRows],
  )
  const walletVoteRecap = useMemo(
    () => proposal && voteQuery.data?.voted ? getWalletVoteRecap(voteQuery.data, proposal.gauges, bribedRows) : [],
    [bribedRows, proposal, voteQuery.data],
  )
  const walletChoiceKeys = useMemo(
    () => new Set(walletVoteRecap.map(item => item.choiceKey)),
    [walletVoteRecap],
  )
  const walletRows = useMemo(
    () => walletVoteRecap.map(item => ({
      recap: item,
      row: bribedRows.find(row => row.choiceKey === item.choiceKey),
    })),
    [bribedRows, walletVoteRecap],
  )
  const rewardTokenOptions = useMemo(
    () => ['all', ...new Set(bribedRows.flatMap(row => row.bribeTokens.map(token => token.symbol)).sort())],
    [bribedRows],
  )
  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return bribedRows.filter((row) => {
      if (rewardTokenFilter !== 'all' && !row.bribeTokens.some(token => token.symbol === rewardTokenFilter)) {
        return false
      }

      if (showOnlyWalletVotes && !walletChoiceKeys.has(row.choiceKey)) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return row.label.toLowerCase().includes(normalizedSearch)
        || row.bribeTokens.some(token => token.symbol.toLowerCase().includes(normalizedSearch))
        || row.gaugeAddress?.toLowerCase().includes(normalizedSearch)
        || row.choiceKey.includes(normalizedSearch)
    })
  }, [bribedRows, rewardTokenFilter, searchTerm, showOnlyWalletVotes, walletChoiceKeys])
  const sortedRows = useMemo(
    () => [...filteredRows].sort((a, b) => compareRows(a, b, sortKey)),
    [filteredRows, sortKey],
  )
  const bribeDataAnomaly = useMemo(
    () => proposal ? getBribeDataAnomaly(proposal, epoch, previousEpoch) : null,
    [epoch, previousEpoch, proposal],
  )
  const draftTotal = Object.values(draftAllocations).reduce((sum, value) => sum + value, 0)
  const draftGaugeCount = Object.keys(draftAllocations).length
  const hasEmptyDraftWeight = Object.values(draftAllocations).some(value => !Number.isFinite(value) || value <= 0)
  const isDraftValid = draftGaugeCount > 0
    && !hasEmptyDraftWeight
    && draftTotal >= 99.9
    && draftTotal <= 100.1

  if (proposalQuery.isPending) {
    return (
      <AppShell>
        <Panel className="p-6 sm:p-8">
          <p className="flex items-center gap-3 text-[var(--color-text-muted)]">
            <span className="size-4 animate-spin rounded-full border-2 border-[var(--color-info)] border-t-transparent" aria-hidden="true" />
            Loading Convex gauge round…
          </p>
        </Panel>
      </AppShell>
    )
  }

  if (proposalQuery.isError) {
    return (
      <AppShell>
        <div className="space-y-3">
          <StatusNote
            tone="danger"
            title="Could not load the Convex gauge round"
            action={(
              <button type="button" onClick={() => void proposalQuery.refetch()} className={INLINE_BUTTON_CLASS}>
                Retry
              </button>
            )}
          >
            {proposalQuery.error.message}
          </StatusNote>
          <Link to="/" className={SECONDARY_ACTION_CLASS}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </Link>
        </div>
      </AppShell>
    )
  }

  if (!proposal) {
    return (
      <AppShell>
        <Panel className="p-6 sm:p-8">
          <div className="max-w-2xl" data-testid="proposal-no-active-round">
            <Tag tone="neutral">Between rounds</Tag>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">
              No active Convex gauge vote
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              Convex has closed the previous voting window and has not opened the next one yet. There is nothing available to submit right now.
            </p>
            <p className="mt-3 text-xs text-[var(--color-text-faint)]">
              This page checks for a new round every 30 seconds and will recover automatically.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/" className={SECONDARY_ACTION_CLASS}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to dashboard
              </Link>
              <a href={CONVEX_GOVERNANCE_URL} target="_blank" rel="noreferrer" className={SECONDARY_ACTION_CLASS}>
                Check Convex Governance
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </Panel>
      </AppShell>
    )
  }

  const resolvedProposal = proposal
  const statusLabel = resolvedProposal.state.toLowerCase() === 'closed'
    ? `Ended ${formatDateTime(resolvedProposal.end)}`
    : resolvedProposal.state.toLowerCase() === 'active'
      ? `Ends ${formatDateTime(resolvedProposal.end)}`
      : resolvedProposal.state
  const dashboardLink = activeAddress ? `/?watch=${activeAddress}` : '/'
  const canVote = resolvedProposal.state === 'active' && !isWatchMode
  const incentiveState: IncentiveSourceState = epochQuery.isError
    ? 'error'
    : epochQuery.isPending
      ? 'loading'
      : epoch
        ? 'ready'
        : 'unmatched'
  const isRefreshing = proposalQuery.isFetching || epochQuery.isFetching
  const rewardTokenSummary = summarizeRewardTokens(bribedRows)
  const isFiltered = searchTerm.trim().length > 0 || rewardTokenFilter !== 'all' || showOnlyWalletVotes
  const marketSummary = incentiveState === 'ready'
    ? [
        `${formatNumber(bribedRows.length, 0)} of ${formatNumber(resolvedProposal.gauges.length, 0)} eligible gauges carry active Llama incentives`,
        epoch ? `Llama round ${epoch.round}` : null,
        `Total incentives ${formatCompactUsd(totalIncentivesUsd)}`,
        rewardTokenSummary === 'None' ? null : `Reward tokens ${rewardTokenSummary}`,
      ].filter((part): part is string => part !== null).join(' · ')
    : 'Llama Airforce supplies the incentive figures; Convex remains the vote source.'

  const handleRefresh = () => {
    void proposalQuery.refetch()
    void epochQuery.refetch()
  }

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedLabel(label)
      window.setTimeout(() => setCopiedLabel(current => current === label ? null : current), 1500)
    }
    catch {
      setCopiedLabel(`Failed: ${label}`)
      window.setTimeout(() => setCopiedLabel(current => current === `Failed: ${label}` ? null : current), 1500)
    }
  }

  const getExistingAllocations = () => voteQuery.data?.voted
    ? { ...voteQuery.data.allocationPercentages }
    : {}

  const openBallot = () => {
    if (!showVoteEditor)
      setDraftAllocations(getExistingAllocations())
    setShowVoteEditor(true)
  }

  const revealBallot = () => {
    openBallot()
    window.setTimeout(() => {
      document.getElementById('vote-ballot')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const addGaugeToBallot = (gaugeKey: string) => {
    setDraftAllocations((current) => {
      const next = showVoteEditor ? { ...current } : getExistingAllocations()
      if (!Object.hasOwn(next, gaugeKey))
        next[gaugeKey] = Object.keys(next).length === 0 ? 100 : 0
      return next
    })
    setShowVoteEditor(true)
  }

  const removeGaugeFromBallot = (gaugeKey: string) => {
    setDraftAllocations((current) => {
      const next = { ...current }
      delete next[gaugeKey]
      return next
    })
  }

  const setGaugeWeight = (gaugeKey: string, weight: number) => {
    setDraftAllocations(current => ({ ...current, [gaugeKey]: weight }))
  }

  const equalizeDraftAllocations = () => {
    const keys = Object.keys(draftAllocations)
    if (keys.length === 0)
      return

    const weight = Number((100 / keys.length).toFixed(2))
    const next: Record<string, number> = Object.fromEntries(keys.map(key => [key, weight]))
    const lastKey = keys.at(-1)!
    next[lastKey] = Number((weight + (100 - weight * keys.length)).toFixed(2))
    setDraftAllocations(next)
  }

  const resetFilters = () => {
    setSearchTerm('')
    setRewardTokenFilter('all')
    setShowOnlyWalletVotes(false)
  }

  const openReviewForDraft = () => {
    setReviewAllocations({ ...draftAllocations })
    setIsReviewOpen(true)
  }

  const confirmVote = () => {
    if (!reviewAllocations || !address)
      return

    submitVoteMutation.mutate(
      {
        proposalId: resolvedProposal.proposalId,
        proposalStart: resolvedProposal.start,
        proposalEnd: resolvedProposal.end,
        allocations: reviewAllocations,
        account: address,
      },
      {
        onSuccess: () => {
          setIsReviewOpen(false)
          setReviewAllocations(null)
          setDraftAllocations({})
          setShowVoteEditor(false)
        },
        onError: () => {
          // Keep the modal open so the voter can retry.
        },
      },
    )
  }

  const cancelReview = () => {
    setIsReviewOpen(false)
    setReviewAllocations(null)
  }

  return (
    <AppShell>
      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Eyebrow>Proposal overview</Eyebrow>
              <Tag tone={resolvedProposal.state === 'active' ? 'positive' : 'neutral'}>{capitalize(resolvedProposal.state)}</Tag>
              {isWatchMode
                ? (
                    <Tag tone="info">
                      Read-only watch
                      {shortAddress(activeAddress)}
                    </Tag>
                  )
                : null}
            </div>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">{resolvedProposal.title}</h1>

            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--color-text-muted)]">
              <span>
                {formatDateCompact(resolvedProposal.start)}
                {' → '}
                {formatDateCompact(resolvedProposal.end)}
              </span>
              <span className="text-[var(--color-text-faint)]">·</span>
              <span>
                {formatNumber(resolvedProposal.voterCount, 0)}
                {' '}
                on-chain voters
              </span>
              <span className="text-[var(--color-text-faint)]">·</span>
              <span>{timeZone}</span>
            </p>

            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-faint)]">
              <span>{statusLabel}</span>
              <RoundCountdown end={resolvedProposal.end} state={resolvedProposal.state} />
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <DataFreshness label="Convex round" updatedAt={proposalQuery.dataUpdatedAt} isFetching={proposalQuery.isFetching} />
              <DataFreshness
                label="Llama incentives"
                updatedAt={epochQuery.dataUpdatedAt}
                isFetching={epochQuery.isFetching}
                isError={epochQuery.isError}
              />
              <button
                type="button"
                onClick={handleRefresh}
                className="ui-interactive inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} aria-hidden="true" />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-52">
            {canVote
              ? (
                  <button type="button" onClick={revealBallot} className={PRIMARY_ACTION_CLASS}>
                    {voteQuery.data?.voted ? 'Edit your vote' : 'Start voting'}
                  </button>
                )
              : null}
            <a href={CONVEX_GOVERNANCE_URL} target="_blank" rel="noreferrer" className={SECONDARY_ACTION_CLASS}>
              <ExternalLink className="size-4" aria-hidden="true" />
              Open Convex Governance
            </a>
            <Link to={dashboardLink} className={TERTIARY_LINK_CLASS}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to dashboard
            </Link>
          </div>
        </div>

        {hasInvalidWatchAddress
          ? (
              <div className="mt-3">
                <StatusNote tone="danger" title="Ignoring invalid watch address">
                  The
                  {' '}
                  <code className="rounded bg-[var(--color-surface-raised)] px-1 py-0.5">watch</code>
                  {' '}
                  query parameter must be a valid EVM address.
                </StatusNote>
              </div>
            )
          : null}
      </Panel>

      <VoteSummaryStats
        roundNumber={epoch?.round}
        totalVotes={resolvedProposal.totalVotes}
        efficiencyVotes={bribedVotes}
        totalIncentivesUsd={totalIncentivesUsd}
      />

      <IncentiveMarketPanel
        incentiveState={incentiveState}
        anomaly={bribeDataAnomaly}
        summary={marketSummary}
        rows={bribedRows}
        sortedRows={sortedRows}
        totalIncentivesUsd={totalIncentivesUsd}
        roundNumber={epoch?.round}
        canVote={canVote}
        walletChoiceKeys={walletChoiceKeys}
        isEditorOpen={showVoteEditor}
        allocations={draftAllocations}
        copiedLabel={copiedLabel}
        filters={{
          searchTerm,
          onSearchTermChange: setSearchTerm,
          rewardTokenFilter,
          rewardTokenOptions,
          onRewardTokenFilterChange: setRewardTokenFilter,
          sortKey,
          onSortKeyChange: setSortKey,
          showOnlyWalletVotes,
          onShowOnlyWalletVotesChange: setShowOnlyWalletVotes,
          canFilterWalletVotes: walletChoiceKeys.size > 0,
          isFiltered,
          onReset: resetFilters,
        }}
        ballot={{
          onAdd: addGaugeToBallot,
          onRemove: removeGaugeFromBallot,
          onWeightChange: setGaugeWeight,
        }}
        onCopy={handleCopy}
        onRetryIncentives={() => void epochQuery.refetch()}
      />

      {activeAddress
        ? (
            <WalletPositionPanel
              activeAddress={activeAddress}
              isWatchMode={isWatchMode}
              voted={Boolean(voteQuery.data?.voted)}
              votingPower={voteQuery.data?.votingPower}
              rows={walletRows}
              isPending={voteQuery.isPending}
              isError={voteQuery.isError}
              errorMessage={voteQuery.error?.message}
              onRetry={() => void voteQuery.refetch()}
            />
          )
        : null}

      {canVote
        ? (
            <BallotPanel
              proposal={resolvedProposal}
              address={address}
              voted={Boolean(voteQuery.data?.voted)}
              votingPower={voteQuery.data?.votingPower}
              isSubmitting={submitVoteMutation.isPending}
              editor={{
                isOpen: showVoteEditor,
                allocations: draftAllocations,
                onOpen: openBallot,
                onClose: () => setShowVoteEditor(false),
                onAllocationsChange: setDraftAllocations,
                onSubmit: (allocations) => {
                  setReviewAllocations(allocations)
                  setIsReviewOpen(true)
                },
              }}
              submission={{
                isError: submitVoteMutation.isError,
                isSuccess: submitVoteMutation.isSuccess,
                errorMessage: submitVoteMutation.error?.message,
                transactionHash: submitVoteMutation.data?.transactionHash,
                onDismiss: () => submitVoteMutation.reset(),
              }}
              review={{
                isOpen: isReviewOpen,
                allocations: reviewAllocations,
                error: submitVoteMutation.error?.message ?? null,
                onConfirm: confirmVote,
                onCancel: cancelReview,
              }}
            />
          )
        : null}

      {canVote && showVoteEditor && draftGaugeCount > 0
        ? (
            <BallotSummaryBar
              gaugeCount={draftGaugeCount}
              total={draftTotal}
              isValid={isDraftValid}
              hasEmptyWeight={hasEmptyDraftWeight}
              hasWallet={Boolean(address)}
              onEqualize={equalizeDraftAllocations}
              onReview={openReviewForDraft}
            />
          )
        : null}

      <div role="status" aria-live="polite" className="sr-only">
        {copiedLabel
          ? copiedLabel.startsWith('Failed: ')
            ? `${copiedLabel.slice('Failed: '.length)} could not be copied.`
            : `Copied ${copiedLabel}.`
          : ''}
      </div>
    </AppShell>
  )
}

/*
 * Stable entry points for the proposal sections. The implementation lives in
 * ../features/proposal/ui; these re-exports keep `routes/proposal` usable as
 * the single import path for page-level tests and callers.
 */
export { describeBribeDataAnomaly, formatRelativeTime, formatTimeRemaining } from '../features/proposal/ui/format'
export { GaugeRow } from '../features/proposal/ui/gauge-market'
export type { IncentiveSourceState } from '../features/proposal/ui/incentive-market'
export { StatusNote } from '../features/proposal/ui/shared'
