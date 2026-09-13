import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { AllocationEditor } from '../src/features/voting/allocation-editor'

function noop() {}

const choices = [
  { key: '0xaaa', name: 'AQUA+crvUSD', subtitle: 'Ethereum · Gauge 0x11…11' },
  { key: '0xbbb', name: 'BOLD+USDC' },
]

function renderEditor(overrides: Partial<Parameters<typeof AllocationEditor>[0]> = {}) {
  return renderToStaticMarkup(
    <AllocationEditor
      choices={choices}
      isConnected
      proposalActive
      votingPower={10_000}
      allocations={{ '0xaaa': 60, '0xbbb': 40 }}
      isRevote={false}
      onChange={noop}
      onSubmit={noop}
      isSubmitting={false}
      {...overrides}
    />,
  )
}

describe('AllocationEditor', () => {
  it('lists every selected gauge with its weight and a review action', () => {
    const markup = renderEditor()

    expect(markup).toContain('Your ballot')
    expect(markup).toContain('AQUA+crvUSD')
    expect(markup).toContain('BOLD+USDC')
    expect(markup).toContain('100.0')
    expect(markup).toContain('Review vote')
    expect(markup).toContain('Add another eligible gauge')
  })

  it('explains why submission is blocked when the total is not 100%', () => {
    const markup = renderEditor({ allocations: { '0xaaa': 60 } })

    expect(markup).toContain('60.0')
    expect(markup).toContain('Total allocation must equal 100%')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('asks for a wallet connection only when the ballot needs to be signed', () => {
    const markup = renderEditor({ isConnected: false })

    expect(markup).toContain('Connect your wallet to vote.')
  })

  it('points an empty ballot at the incentive market above', () => {
    const markup = renderEditor({ allocations: {} })

    expect(markup).toContain('Your ballot is empty')
    expect(markup).toContain('incentive market above')
  })

  it('closes the editor once the proposal is no longer active', () => {
    const markup = renderEditor({ proposalActive: false })

    expect(markup).toContain('This proposal is no longer active for voting.')
    expect(markup).not.toContain('Your ballot')
  })
})
