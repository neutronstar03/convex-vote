import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReviewModal } from '../src/features/voting/review-modal'

describe('ReviewModal', () => {
  it('renders the transaction review as a labelled modal dialog', () => {
    const markup = renderToStaticMarkup(
      <ReviewModal
        allocations={{ gauge: 100 }}
        choiceNames={{ gauge: 'Test gauge' }}
        total={100}
        isRevote={false}
        isOpen
        isSubmitting={false}
        error={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('aria-labelledby=')
    expect(markup).toContain('aria-describedby=')
    expect(markup).toContain('Confirm your vote')
  })

  it('does not render when closed', () => {
    const markup = renderToStaticMarkup(
      <ReviewModal
        allocations={{}}
        choiceNames={{}}
        total={0}
        isRevote={false}
        isOpen={false}
        isSubmitting={false}
        error={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(markup).toBe('')
  })

  it('shows the ballot validity state and the estimated voting weight', () => {
    const markup = renderToStaticMarkup(
      <ReviewModal
        allocations={{ a: 60, b: 40 }}
        choiceNames={{ a: 'AQUA+crvUSD', b: 'BOLD+USDC' }}
        total={100}
        votingPower={12345.6}
        isRevote={false}
        isOpen
        isSubmitting={false}
        error={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(markup).toContain('Valid')
    expect(markup).toContain('12,346')
    expect(markup).not.toContain('Invalid')
  })

  it('flags an invalid total and disables submission', () => {
    const markup = renderToStaticMarkup(
      <ReviewModal
        allocations={{ a: 80 }}
        choiceNames={{ a: 'AQUA+crvUSD' }}
        total={80}
        isRevote={false}
        isOpen
        isSubmitting={false}
        error={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(markup).toContain('Invalid')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('keeps the voter informed while the transaction is pending', () => {
    const markup = renderToStaticMarkup(
      <ReviewModal
        allocations={{ a: 100 }}
        choiceNames={{ a: 'AQUA+crvUSD' }}
        total={100}
        isRevote
        isOpen
        isSubmitting
        error={null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(markup).toContain('Confirm the transaction in your wallet')
    expect(markup).toContain('Keep this window open')
    expect(markup).toContain('Submitting')
  })
})
