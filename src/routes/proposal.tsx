import type { GaugeVote, PoolRow } from '../features/proposal/types'
import type { ConvexUserVote } from '../features/voting/use-convex-user-vote'
import { AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { isAddress } from 'viem'
import { useAccount } from 'wagmi'
import { AppShell } from '../components/layout/app-shell'
import { VoteSummaryStats } from '../components/shared/vote-summary-stats'
import { useEpochForRound, usePreviousEpoch } from '../features/incentives/queries'
import { getBribeDataAnomaly, mergeProposalAndEpoch } from '../features/incentives/utils'
import { useResolvedProposal } from '../features/proposal/queries'
import { AllocationEditor } from '../features/voting/allocation-editor'
import { ReviewModal } from '../features/voting/review-modal'
import { useConvexUserVote } from '../features/voting/use-convex-user-vote'
import { useSubmitVote } from '../features/voting/use-submit-vote'
import { formatCompactUsd, formatDateCompact, formatDateTime, formatNumber, formatPercent, getCurrentTimeZone } from '../lib/format'

type SortKey = 'incentives' | 'efficiency' | 'votes' | 'voteShare'

const SORT_OPTIONS: Array<{ value: SortKey, label: string }> = [
  { value: 'incentives', label: 'Total bribes' },
  { value: 'efficiency', label: 'Bribe efficiency' },
  { value: 'votes', label: 'Votes' },
  { value: 'voteShare', label: 'Vote share' },
]

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
  const rewardRate = totalIncentivesUsd !== undefined && bribedVotes > 0
    ? totalIncentivesUsd / bribedVotes
    : undefined
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

  if (proposalQuery.isPending) {
    return (
      <AppShell>
        <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-8 text-[var(--dust-tint)]">
          Loading proposal…
        </section>
      </AppShell>
    )
  }

  if (proposalQuery.isError) {
    return (
      <AppShell>
        <section className="rounded-lg border border-[var(--hot-fuchsia)]/40 bg-[color:rgba(255,22,84,0.1)] p-8 text-[var(--cloud-tint)]">
          Failed to load proposal:
          {' '}
          {proposalQuery.error.message}
        </section>
      </AppShell>
    )
  }

  const resolvedProposal = proposal!
  const statusLabel = resolvedProposal.state.toLowerCase() === 'closed'
    ? `Ended ${formatDateTime(resolvedProposal.end)}`
    : resolvedProposal.state.toLowerCase() === 'active'
      ? `Ends ${formatDateTime(resolvedProposal.end)}`
      : resolvedProposal.state
  const dashboardLink = activeAddress ? `/?watch=${activeAddress}` : '/'

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

  return (
    <AppShell>
      <VoteSummaryStats
        roundNumber={epoch?.round}
        totalVotes={resolvedProposal.totalVotes}
        efficiencyVotes={bribedVotes}
        totalIncentivesUsd={totalIncentivesUsd}
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-4 sm:p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--pearl-aqua)]">Proposal overview</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--cloud-tint)] sm:text-3xl">{resolvedProposal.title}</h1>
          <p className="mt-2 text-sm text-[var(--dust-tint)]">
            Window
            {' '}
            {formatDateCompact(resolvedProposal.start)}
            {' '}
            →
            {formatDateCompact(resolvedProposal.end)}
            {' '}
            ·
            {timeZone}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            <MetricCard label="Status" value={capitalize(resolvedProposal.state)} detail={statusLabel} tone="neutral" />
            <MetricCard label="Total votes" value={formatNumber(resolvedProposal.totalVotes, 0)} detail={`${resolvedProposal.voterCount} on-chain voters`} tone="neutral" />
            <MetricCard
              label="Bribed gauges"
              value={String(bribedRows.length)}
              detail="Gauges with active bribes"
              tone="aqua"
              warning={bribeDataAnomaly?.tooltip}
            />
            <MetricCard label="Bribe efficiency" value={formatUsdRate(rewardRate)} detail="Average $/vote across bribed gauges" tone="lime" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs sm:flex sm:flex-wrap">
            <CompactInfoChip label="Bribes" value={formatCompactUsd(totalIncentivesUsd)} tone="aqua" />
            <CompactInfoChip label="Votium round" value={epoch ? String(epoch.round) : epochQuery.isPending ? 'Loading…' : 'Not matched'} tone="neutral" />
            <CompactInfoChip label="Convex epoch" value={String(resolvedProposal.epoch)} tone="neutral" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link
              to={dashboardLink}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--hyper-magenta)] px-3 py-2 text-center text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110 sm:px-4"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="sm:hidden">Dashboard</span>
              <span className="hidden sm:inline">Back to dashboard</span>
            </Link>
            <a
              href="https://www.convexfinance.com/vote/weights/curve"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-3 py-2 text-center text-sm font-medium text-[var(--cloud-tint)] transition hover:bg-[var(--gunmetal-mist)] sm:px-4"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sm:hidden">Convex</span>
              <span className="hidden sm:inline">Open Convex Governance</span>
            </a>
          </div>
        </article>

        <article className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--pearl-aqua)]">Round details</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--cloud-tint)]">Market + wallet context</h2>
            </div>
            {isWatchMode
              ? <span className="rounded-md border border-[var(--pearl-aqua)]/40 bg-[color:rgba(120,218,228,0.1)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--pearl-aqua)]">Watching wallet</span>
              : null}
          </div>

          <dl className="mt-4 space-y-3 text-sm text-[var(--dust-tint)]">
            <DetailRow label="Start" value={formatDateTime(resolvedProposal.start)} />
            <DetailRow label="End" value={formatDateTime(resolvedProposal.end)} />
            <DetailRow label="Reward tokens" value={summarizeRewardTokens(bribedRows)} />
            <DetailRow
              label="Wallet"
              value={hasInvalidWatchAddress ? 'Invalid watch address' : activeAddress ? shortAddress(activeAddress) : 'Not selected'}
            />
          </dl>

          {hasInvalidWatchAddress
            ? (
                <div className="mt-4 rounded-md border border-[var(--hot-fuchsia)]/40 bg-[color:rgba(255,22,84,0.1)] p-3 text-sm text-[var(--dust-tint)]">
                  <p className="font-medium text-[var(--hot-fuchsia)]">Ignoring invalid watch address</p>
                  <p className="mt-1">
                    The
                    {' '}
                    <code className="rounded bg-[var(--gunmetal-mist)] px-1 py-0.5 text-xs">watch</code>
                    {' '}
                    query param must be a valid EVM address.
                  </p>
                </div>
              )
            : null}

          {copiedLabel
            ? <p className="mt-4 text-xs text-[var(--pearl-aqua)]">{copiedLabel}</p>
            : null}
        </article>
      </section>

      {activeAddress && (
        <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--pearl-aqua)]">Your proposal position</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--cloud-tint)]">Wallet-voted gauges</h2>
            </div>
            {voteQuery.data?.voted
              ? (
                  <p className="text-sm text-[var(--fog-tint)]">
                    Voting power
                    {' '}
                    {formatNumber(voteQuery.data.votingPower, 0)}
                  </p>
                )
              : null}
          </div>

          {voteQuery.isPending
            ? <p className="mt-4 text-sm text-[var(--dust-tint)]">Loading wallet vote…</p>
            : walletRows.length > 0
              ? (
                  <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    {walletRows.map(({ recap, row }) => (
                      <article key={recap.choiceKey} className="rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/55 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-[var(--cloud-tint)]">{recap.label}</p>
                            <p className="mt-1 text-xs text-[var(--fog-tint)]">
                              Your voting weight
                              {' '}
                              {formatNumber(recap.estimatedVotes, 0)}
                            </p>
                          </div>
                          <span className="text-lg font-semibold text-[var(--lime-cream)]">
                            {recap.weight.toFixed(2)}
                            %
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(row?.bribeTokens ?? []).map((token, index) => (
                            <TokenChip key={`${recap.choiceKey}-${token.symbol}-${index}`} symbol={token.symbol} />
                          ))}
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <MiniStat label="Total bribes" value={formatCompactUsd(row?.incentiveUsd)} tone="aqua" />
                          <MiniStat label="Your est. reward" value={formatCompactUsd(recap.estimatedUsd)} tone="lime" detail={recap.estimatedTokenSummary} />
                        </div>
                      </article>
                    ))}
                  </div>
                )
              : <p className="mt-4 text-sm text-[var(--dust-tint)]">No wallet vote found for this proposal.</p>}
        </section>
      )}

      {/* Voting section */}
      {address && !isWatchMode && proposal && proposal.state === 'active' && (
        <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--pearl-aqua)]">Cast your vote</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--cloud-tint)]">
                {voteQuery.data?.voted ? 'Update your vote' : 'Vote on this proposal'}
              </h2>
            </div>
            {!showVoteEditor && (
              <button
                type="button"
                onClick={() => setShowVoteEditor(true)}
                className="rounded-md bg-[var(--hyper-magenta)] px-4 py-2 text-sm font-medium text-[var(--cloud-tint)] transition hover:brightness-110"
              >
                {voteQuery.data?.voted ? 'Edit vote' : 'Start voting'}
              </button>
            )}
          </div>

          {voteQuery.data?.voted && !showVoteEditor && (
            <p className="mt-3 text-sm text-[var(--dust-tint)]">
              You have already voted on this proposal. You can update your vote at any time before the proposal closes.
            </p>
          )}

          <p className="mt-3 text-sm text-[var(--fog-tint)]">
            This is an on-chain Ethereum vote. If you delegated your gauge vote, voting directly overrides the delegate allocation for your weight.
          </p>

          {showVoteEditor && (
            <div className="mt-4">
              <AllocationEditor
                choices={proposal.gauges.map(gauge => ({ key: gauge.key, name: gauge.label }))}
                isConnected={Boolean(address)}
                proposalActive={proposal.state === 'active'}
                votingPower={voteQuery.data?.voted ? voteQuery.data.votingPower : undefined}
                existingAllocations={voteQuery.data?.voted ? voteQuery.data.allocationPercentages : undefined}
                onSubmit={(allocations) => {
                  setReviewAllocations(allocations)
                  setIsReviewOpen(true)
                }}
                isSubmitting={submitVoteMutation.isPending}
              />
              <button
                type="button"
                onClick={() => setShowVoteEditor(false)}
                className="mt-3 text-sm text-[var(--fog-tint)] hover:text-[var(--cloud-tint)]"
              >
                Cancel
              </button>
            </div>
          )}

          {submitVoteMutation.isSuccess && (
            <div className="mt-4 rounded-md border border-[var(--lime-cream)]/35 bg-[color:rgba(231,255,122,0.08)] p-4">
              <p className="font-semibold text-[var(--lime-cream)]">Vote submitted successfully!</p>
              <p className="mt-1 text-sm text-[var(--dust-tint)]">
                Your vote has been recorded on-chain.
                {submitVoteMutation.data?.transactionHash && (
                  <>
                    {' '}
                    Receipt:
                    {' '}
                    <a
                      href={`https://etherscan.io/tx/${submitVoteMutation.data.transactionHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--pearl-aqua)] underline hover:no-underline"
                    >
                      {submitVoteMutation.data.transactionHash.slice(0, 10)}
                      ...
                    </a>
                  </>
                )}
              </p>
            </div>
          )}

          <ReviewModal
            allocations={reviewAllocations ?? {}}
            choiceNames={Object.fromEntries(proposal.gauges.map(gauge => [gauge.key, gauge.label]))}
            total={reviewAllocations ? Object.values(reviewAllocations).reduce((s, v) => s + v, 0) : 0}
            isRevote={Boolean(voteQuery.data?.voted)}
            isOpen={isReviewOpen}
            isSubmitting={submitVoteMutation.isPending}
            error={submitVoteMutation.error?.message ?? null}
            onConfirm={() => {
              if (!reviewAllocations || !address || !proposal)
                return
              submitVoteMutation.mutate(
                {
                  proposalId: proposal.proposalId,
                  proposalStart: proposal.start,
                  proposalEnd: proposal.end,
                  allocations: reviewAllocations,
                  account: address,
                },
                {
                  onSuccess: () => {
                    setIsReviewOpen(false)
                    setReviewAllocations(null)
                  },
                  onError: () => {
                    // Keep modal open for retry
                  },
                },
              )
            }}
            onCancel={() => {
              setIsReviewOpen(false)
              setReviewAllocations(null)
            }}
          />
        </section>
      )}

      <section className="rounded-lg border border-[var(--steel-haze)] bg-[var(--slate-machine)] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--pearl-aqua)]">Bribed gauge market</p>
              {bribeDataAnomaly
                ? <WarningBadge message={bribeDataAnomaly.tooltip} align="right" />
                : null}
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--cloud-tint)]">All bribed gauges</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-[var(--fog-tint)]">
              Showing
              {' '}
              {sortedRows.length}
              {' '}
              of
              {bribedRows.length}
              {' '}
              bribed gauges.
            </p>
            <label className="flex items-center gap-2 text-sm text-[var(--dust-tint)]">
              Search
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Pool, token, gauge"
                className="w-44 rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-3 py-2 text-sm text-[var(--cloud-tint)] outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--dust-tint)]">
              Reward token
              <select
                value={rewardTokenFilter}
                onChange={event => setRewardTokenFilter(event.target.value)}
                className="rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-3 py-2 text-sm text-[var(--cloud-tint)] outline-none"
              >
                {rewardTokenOptions.map(option => (
                  <option key={option} value={option}>{option === 'all' ? 'All tokens' : option}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--dust-tint)]">
              Sort by
              <select
                value={sortKey}
                onChange={event => setSortKey(event.target.value as SortKey)}
                className="rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-3 py-2 text-sm text-[var(--cloud-tint)] outline-none"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {walletRows.length > 0
              ? (
                  <label className="flex items-center gap-2 text-sm text-[var(--dust-tint)]">
                    <input
                      type="checkbox"
                      checked={showOnlyWalletVotes}
                      onChange={event => setShowOnlyWalletVotes(event.target.checked)}
                    />
                    Only my voted gauges
                  </label>
                )
              : null}
          </div>
        </div>

        {bribeDataAnomaly?.severity === 'severe'
          ? (
              <div className="mt-4 flex items-start gap-3 rounded-md border border-[var(--lime-cream)]/35 bg-[color:rgba(231,255,122,0.08)] p-3 text-sm text-[var(--dust-tint)]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--lime-cream)]" aria-hidden="true" />
                <p>
                  Current incentive data is far below the previous round:
                  {' '}
                  {formatNumber(bribeDataAnomaly.currentBribedGaugeCount, 0)}
                  {' '}
                  bribed gauges vs
                  {' '}
                  {formatNumber(bribeDataAnomaly.previousBribedGaugeCount, 0)}
                  {' '}
                  last round. Active Votium/Llama data can update during the vote.
                </p>
              </div>
            )
          : null}

        <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
          {sortedRows.length === 0
            ? (
                <div className="rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] px-4 py-8 text-sm text-[var(--dust-tint)]">
                  No gauges match the current search/filter combination.
                </div>
              )
            : null}
          {sortedRows.map((row) => {
            const isWalletRow = walletChoiceKeys.has(row.choiceKey)

            return (
              <article
                key={row.choiceKey}
                className={`rounded-md border px-3 py-3 sm:px-4 sm:py-4 ${isWalletRow ? 'border-[var(--hyper-magenta)]/50 bg-[color:rgba(171,58,255,0.08)]' : 'border-[var(--steel-haze)] bg-[var(--carbon-ink)]'}`}
              >
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--cloud-tint)] sm:text-base">{row.label}</h3>
                      {isWalletRow
                        ? <span className="rounded-md border border-[var(--hyper-magenta)]/40 bg-[color:rgba(171,58,255,0.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--lime-cream)]">Your vote</span>
                        : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--fog-tint)]">
                      {capitalize(row.blockchainId)}
                      {' · '}
                      Gauge
                      {' '}
                      {shortAddress(row.gaugeAddress)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3">
                      {row.bribeTokens.length > 0
                        ? row.bribeTokens.map((token, index) => (
                            <TokenChip key={`${row.choiceKey}-${token.symbol}-${index}`} symbol={token.symbol} amountUsd={token.amountUsd} />
                          ))
                        : <span className="text-xs text-[var(--fog-tint)]">No reward tokens detected</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs sm:mt-3">
                      {row.gaugeAddress
                        ? (
                            <button
                              type="button"
                              onClick={() => handleCopy(row.gaugeAddress!, `Copied gauge ${shortAddress(row.gaugeAddress)}`)}
                              className="rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/45 px-2 py-1 text-[var(--dust-tint)] transition hover:bg-[var(--gunmetal-mist)] sm:px-2.5"
                            >
                              Copy gauge
                            </button>
                          )
                        : null}
                      <button
                        type="button"
                        onClick={() => handleCopy(row.label, `Copied pool ${row.label}`)}
                        className="rounded-md border border-[var(--steel-haze)] bg-[var(--gunmetal-mist)]/45 px-2 py-1 text-[var(--dust-tint)] transition hover:bg-[var(--gunmetal-mist)] sm:px-2.5"
                      >
                        Copy pool name
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[572px] xl:text-left">
                    <DataPill label="Votes" value={formatNumber(row.votes, 0)} tone="neutral" />
                    <DataPill label="Vote share" value={formatPercent(row.voteShare)} tone="neutral" />
                    <DataPill label="Total bribes" value={formatCompactUsd(row.incentiveUsd)} tone="aqua" />
                    <DataPill label="Bribe efficiency" value={formatUsdRate(row.rewardEfficiency ?? undefined)} tone="lime" />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </AppShell>
  )
}

function compareRows(a: PoolRow, b: PoolRow, sortKey: SortKey) {
  switch (sortKey) {
    case 'efficiency':
      return (b.rewardEfficiency ?? 0) - (a.rewardEfficiency ?? 0) || b.incentiveUsd - a.incentiveUsd
    case 'votes':
      return b.votes - a.votes || b.incentiveUsd - a.incentiveUsd
    case 'voteShare':
      return b.voteShare - a.voteShare || (b.incentiveUsd ?? 0) - (a.incentiveUsd ?? 0)
    case 'incentives':
    default:
      return b.incentiveUsd - a.incentiveUsd || b.votes - a.votes
  }
}

function MetricCard({
  label,
  value,
  detail,
  tone,
  warning,
}: { label: string, value: string, detail?: string, tone: 'neutral' | 'aqua' | 'lime', warning?: string }) {
  const valueClass = tone === 'aqua'
    ? 'text-[var(--pearl-aqua)]'
    : tone === 'lime'
      ? 'text-[var(--lime-cream)]'
      : 'text-[var(--cloud-tint)]'

  return (
    <div className="relative rounded-md border border-[var(--steel-haze)] bg-[var(--carbon-ink)] p-3 sm:p-4">
      {warning
        ? (
            <div className="absolute right-2 top-2">
              <WarningBadge message={warning} align="center" />
            </div>
          )
        : null}
      <p className="pr-9 text-xs text-[var(--fog-tint)] sm:text-sm">{label}</p>
      <p className={`mt-2 text-xl font-semibold sm:text-2xl ${valueClass}`}>{value}</p>
      {detail
        ? <p className="mt-1 text-[11px] leading-snug text-[var(--dust-tint)] sm:text-xs">{detail}</p>
        : null}
    </div>
  )
}

function WarningBadge({ message, align = 'left' }: { message: string, align?: 'center' | 'left' | 'right' }) {
  const [isOpen, setIsOpen] = useState(false)
  const tooltipId = useId()
  const positionClass = align === 'center'
    ? 'left-1/2 -translate-x-1/2'
    : align === 'right'
      ? 'right-0'
      : 'left-0'

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full border border-[var(--lime-cream)]/40 bg-[color:rgba(231,255,122,0.1)] text-[var(--lime-cream)] transition hover:bg-[color:rgba(231,255,122,0.16)] focus:outline-none focus:ring-2 focus:ring-[var(--lime-cream)]/60"
        aria-label="Show bribe data warning"
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(current => !current)}
      >
        <AlertTriangle className="size-4" aria-hidden="true" />
      </button>
      {isOpen
        ? (
            <span
              id={tooltipId}
              role="tooltip"
              className={`absolute ${positionClass} top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-[var(--lime-cream)]/35 bg-[var(--carbon-ink)] px-3 py-2 text-left text-xs leading-relaxed text-[var(--dust-tint)] shadow-xl`}
            >
              {message}
            </span>
          )
        : null}
    </span>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--steel-haze)]/60 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-[var(--fog-tint)]">{label}</dt>
      <dd className="text-right text-[var(--cloud-tint)]">{value}</dd>
    </div>
  )
}

function CompactInfoChip({ label, value, tone }: { label: string, value: string, tone: 'aqua' | 'lime' | 'neutral' }) {
  const toneClass = tone === 'aqua'
    ? 'border-[var(--pearl-aqua)]/25 bg-[color:rgba(120,218,228,0.08)] text-[var(--pearl-aqua)]'
    : tone === 'lime'
      ? 'border-[var(--lime-cream)]/25 bg-[color:rgba(231,255,122,0.08)] text-[var(--lime-cream)]'
      : 'border-[var(--steel-haze)] bg-[var(--carbon-ink)]/70 text-[var(--cloud-tint)]'

  return (
    <div className={`min-w-0 rounded-md border px-2 py-2 sm:px-2.5 ${toneClass}`}>
      <p className="truncate uppercase tracking-[0.12em] text-[10px] text-[var(--fog-tint)] sm:tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function TokenChip({ symbol, amountUsd }: { symbol: string, amountUsd?: number }) {
  return (
    <span className="rounded-md border border-[var(--pearl-aqua)]/35 bg-[color:rgba(120,218,228,0.08)] px-2 py-1 text-xs font-medium text-[var(--pearl-aqua)]">
      {symbol}
      {amountUsd !== undefined ? ` · ${formatCompactUsd(amountUsd)}` : ''}
    </span>
  )
}

function DataPill({ label, value, tone }: { label: string, value: string, tone: 'neutral' | 'aqua' | 'lime' }) {
  const valueClass = tone === 'aqua'
    ? 'text-[var(--pearl-aqua)]'
    : tone === 'lime'
      ? 'text-[var(--lime-cream)]'
      : 'text-[var(--cloud-tint)]'

  return (
    <div className="rounded-md border border-[var(--steel-haze)]/60 bg-[var(--gunmetal-mist)]/45 px-2.5 py-2 sm:px-3">
      <p className="truncate text-[10px] uppercase tracking-[0.12em] text-[var(--fog-tint)] sm:text-[11px] sm:tracking-[0.14em]">{label}</p>
      <p className={`mt-1 text-sm font-semibold leading-tight ${valueClass}`}>{value}</p>
    </div>
  )
}

function MiniStat({ label, value, tone, detail }: { label: string, value: string, tone: 'aqua' | 'lime', detail?: string }) {
  const valueClass = tone === 'aqua' ? 'text-[var(--pearl-aqua)]' : 'text-[var(--lime-cream)]'

  return (
    <div className="rounded-md border border-[var(--steel-haze)]/40 bg-[var(--carbon-ink)]/45 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--fog-tint)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueClass}`}>{value}</p>
      {detail
        ? <p className="mt-1 text-[11px] text-[var(--fog-tint)]">{detail}</p>
        : null}
    </div>
  )
}

interface WalletVoteRecapItem {
  choiceKey: string
  label: string
  weight: number
  estimatedVotes: number
  estimatedUsd?: number
  estimatedTokenSummary: string
}

function getWalletVoteRecap(vote: ConvexUserVote, gauges: GaugeVote[], poolRows: PoolRow[]): WalletVoteRecapItem[] {
  const poolRowsByChoiceKey = new Map(poolRows.map(row => [row.choiceKey, row]))
  const gaugeNames = new Map(gauges.map(gauge => [gauge.key, gauge.label]))

  return Object.entries(vote.allocationPercentages)
    .map(([choiceKey, weight]) => {
      const poolRow = poolRowsByChoiceKey.get(choiceKey)
      const estimatedVotes = vote.votingPower * (weight / 100)
      const userShareOfGauge = poolRow?.votes && poolRow.votes > 0
        ? estimatedVotes / poolRow.votes
        : undefined
      const estimatedUsd = userShareOfGauge !== undefined && poolRow
        ? poolRow.incentiveUsd * userShareOfGauge
        : undefined
      const estimatedTokens = userShareOfGauge !== undefined
        ? (poolRow?.bribeTokens ?? []).map(token => ({
            symbol: token.symbol,
            amount: token.amount * userShareOfGauge,
          }))
        : []

      return {
        choiceKey,
        label: gaugeNames.get(choiceKey) ?? shortAddress(choiceKey),
        weight,
        estimatedVotes,
        estimatedUsd,
        estimatedTokenSummary: estimatedTokens.length
          ? estimatedTokens.slice(0, 3).map(token => `~${formatTokenAmount(token.amount)} ${token.symbol}`).join(' + ')
          : 'No token estimate available',
      }
    })
    .sort((a, b) => b.weight - a.weight)
}

function summarizeRewardTokens(rows: PoolRow[]) {
  const symbols = [...new Set(rows.flatMap(row => row.bribeTokens.map(token => token.symbol)))]

  if (symbols.length === 0) {
    return 'None'
  }

  if (symbols.length <= 4) {
    return symbols.join(', ')
  }

  return `${symbols.slice(0, 4).join(', ')} +${symbols.length - 4}`
}

function shortAddress(address?: string) {
  if (!address) {
    return 'Wallet'
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatTokenAmount(value: number) {
  if (value >= 100) {
    return formatNumber(value, 0)
  }

  if (value >= 1) {
    return formatNumber(value, 2)
  }

  return formatNumber(value, 4)
}

function formatUsdRate(value?: number) {
  if (value === undefined) {
    return '—'
  }

  if (value >= 1) {
    return `$${value.toFixed(2)}`
  }

  return `$${value.toFixed(5)}`
}
