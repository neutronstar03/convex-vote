import type { BallotSummaryBarProps } from '../src/features/proposal/ui/vote-ballot'
import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { BallotSummaryBar } from '../src/features/proposal/ui/vote-ballot'

function renderBar(overrides: Partial<BallotSummaryBarProps> = {}) {
  return renderToStaticMarkup(<BallotSummaryBar gaugeCount={2} total={100} isValid hasEmptyWeight={false} hasWallet={false} onEqualize={() => {}} onReview={() => {}} onConnect={() => {}} {...overrides} />)
}

describe('ballot connection and review', () => {
  it('offers an enabled connection action without claiming the wallet is ready', () => {
    const markup = renderBar()
    expect(markup).toContain('Allocation valid')
    expect(markup).not.toContain('Ready to review')
    expect(markup).toContain('aria-label="Connect wallet to review"')
    expect(markup).not.toContain('disabled=""')
  })

  it('allows connection before fixing an incomplete allocation', () => {
    expect(renderBar({ total: 50, isValid: false })).not.toContain('disabled=""')
  })

  it('only enables connected-wallet review for a valid allocation', () => {
    expect(renderBar({ hasWallet: true })).toContain('Ready to review')
    expect(renderBar({ hasWallet: true })).not.toContain('disabled=""')
    expect(renderBar({ hasWallet: true, isValid: false })).toContain('disabled=""')
  })
})
