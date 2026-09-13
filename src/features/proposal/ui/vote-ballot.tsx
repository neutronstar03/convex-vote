import type { GaugeRound } from '../types'
import { Eyebrow, Panel } from '../../../components/ui/primitives'
import { cn } from '../../../lib/cn'
import { AllocationEditor } from '../../voting/allocation-editor'
import { ReviewModal } from '../../voting/review-modal'
import { capitalize, shortAddress, shortHash } from './format'
import { StatusNote } from './shared'
import { INLINE_BUTTON_CLASS, PRIMARY_ACTION_CLASS, SECONDARY_ACTION_CLASS } from './styles'

export interface BallotEditorState {
  isOpen: boolean
  allocations: Record<string, number>
  onOpen: () => void
  onClose: () => void
  onAllocationsChange: (allocations: Record<string, number>) => void
  onSubmit: (allocations: Record<string, number>) => void
}

export interface BallotSubmissionState {
  isError: boolean
  isSuccess: boolean
  errorMessage?: string
  transactionHash?: string
  onDismiss: () => void
}

export interface BallotReviewState {
  isOpen: boolean
  allocations: Record<string, number> | null
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

export interface BallotPanelProps {
  proposal: GaugeRound
  address?: string
  voted: boolean
  votingPower?: number
  isSubmitting: boolean
  editor: BallotEditorState
  submission: BallotSubmissionState
  review: BallotReviewState
}

/**
 * The ballot section: source status notes, the allocation editor and the
 * submit feedback. The route keeps the mutation and passes it in as state.
 */
export function BallotPanel({
  proposal,
  address,
  voted,
  votingPower,
  isSubmitting,
  editor,
  submission,
  review,
}: BallotPanelProps) {
  const choiceNames = Object.fromEntries(proposal.gauges.map(gauge => [gauge.key, gauge.label]))
  const reviewTotal = review.allocations ? Object.values(review.allocations).reduce((total, value) => total + value, 0) : 0

  return (
    <Panel id="vote-ballot" className="scroll-mt-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>Cast your vote</Eyebrow>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)]">
            {voted ? 'Update your vote' : 'Vote on this proposal'}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-faint)]">
            This is an on-chain Ethereum vote. Voting directly overrides the delegate allocation for your weight.
          </p>
        </div>
        {!editor.isOpen
          ? (
              <button type="button" onClick={editor.onOpen} className={SECONDARY_ACTION_CLASS}>
                {voted ? 'Edit vote' : 'Start voting'}
              </button>
            )
          : null}
      </div>

      <div className="mt-3 space-y-2">
        {!address
          ? (
              <StatusNote tone="info" title="Connect a wallet to submit a vote">
                You can build a ballot without one; the submit step needs a connected wallet to sign the transaction.
              </StatusNote>
            )
          : null}
        {voted && !editor.isOpen
          ? (
              <StatusNote tone="neutral" title="You already voted on this proposal">
                Opening the editor pre-fills your current allocation. Submitting replaces it on-chain.
              </StatusNote>
            )
          : null}
      </div>

      {editor.isOpen
        ? (
            <div className="mt-3">
              <AllocationEditor
                choices={proposal.gauges.map(gauge => ({
                  key: gauge.key,
                  name: gauge.label,
                  subtitle: `${capitalize(gauge.blockchainId)} · Gauge ${shortAddress(gauge.gaugeAddress)} · Root ${shortAddress(gauge.rootGaugeAddress)}`,
                  searchText: [
                    gauge.gaugeAddress,
                    gauge.rootGaugeAddress,
                    gauge.poolAddress,
                    gauge.blockchainId,
                    ...gauge.coins.map(coin => coin.symbol),
                    ...gauge.coins.map(coin => coin.address),
                  ].filter(Boolean).join(' '),
                }))}
                isConnected={Boolean(address)}
                proposalActive={proposal.state === 'active'}
                votingPower={voted ? votingPower : undefined}
                allocations={editor.allocations}
                isRevote={voted}
                onChange={editor.onAllocationsChange}
                onSubmit={editor.onSubmit}
                isSubmitting={isSubmitting}
              />
              <button
                type="button"
                onClick={editor.onClose}
                className="mt-2 text-sm text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
              >
                Close ballot editor
              </button>
            </div>
          )
        : null}

      {submission.isError && !review.isOpen
        ? (
            <div className="mt-3">
              <StatusNote tone="danger" title="Vote submission failed">
                {submission.errorMessage}
                {' Reopen the ballot and submit again once the wallet is ready.'}
              </StatusNote>
            </div>
          )
        : null}

      {submission.isSuccess
        ? (
            <div className="mt-3">
              <StatusNote
                tone="success"
                title="Vote submitted on-chain"
                action={(
                  <button type="button" onClick={submission.onDismiss} className={INLINE_BUTTON_CLASS}>
                    Dismiss
                  </button>
                )}
              >
                Your vote has been recorded for this Convex round.
                {' '}
                {submission.transactionHash
                  ? (
                      <a
                        href={`https://etherscan.io/tx/${submission.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-info)] underline hover:no-underline"
                      >
                        View transaction
                        {' '}
                        {shortHash(submission.transactionHash)}
                      </a>
                    )
                  : null}
              </StatusNote>
            </div>
          )
        : null}

      <ReviewModal
        allocations={review.allocations ?? {}}
        choiceNames={choiceNames}
        total={reviewTotal}
        votingPower={voted ? votingPower : undefined}
        isRevote={voted}
        isOpen={review.isOpen}
        isSubmitting={isSubmitting}
        error={review.error}
        onConfirm={review.onConfirm}
        onCancel={review.onCancel}
      />
    </Panel>
  )
}

export interface BallotSummaryBarProps {
  gaugeCount: number
  total: number
  isValid: boolean
  hasEmptyWeight: boolean
  hasWallet: boolean
  onEqualize: () => void
  onReview: () => void
}

/** Sticky draft-total bar shown while the ballot holds at least one gauge. */
export function BallotSummaryBar({
  gaugeCount,
  total,
  isValid,
  hasEmptyWeight,
  hasWallet,
  onEqualize,
  onReview,
}: BallotSummaryBarProps) {
  return (
    <>
      <div className="h-16" aria-hidden="true" />
      <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-positive)]/40 bg-[var(--color-surface-inset)]/97 px-4 py-3 shadow-2xl backdrop-blur sm:inset-x-6">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {gaugeCount}
            {' '}
            {gaugeCount === 1 ? 'gauge' : 'gauges'}
            {' in ballot'}
          </p>
          <p className={cn('text-xs', isValid ? 'text-[var(--color-positive)]' : 'text-[var(--color-danger)]')}>
            {'Total '}
            {total.toFixed(1)}
            %
            {isValid
              ? ' · Ready to review'
              : hasEmptyWeight
                ? ' · Set every selected gauge above 0%'
                : ' · Must equal 100%'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEqualize}
            className="ui-interactive rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]"
          >
            Equal split
          </button>
          <a
            href="#vote-ballot"
            className="ui-interactive rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]"
          >
            View ballot
          </a>
          <button
            type="button"
            disabled={!isValid || !hasWallet}
            onClick={onReview}
            className={PRIMARY_ACTION_CLASS}
          >
            {hasWallet ? 'Review vote' : 'Connect wallet to review'}
          </button>
        </div>
      </div>
    </>
  )
}
