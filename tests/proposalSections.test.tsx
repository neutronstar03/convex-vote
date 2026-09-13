import type { PoolRow } from '../src/features/proposal/types'
import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { formatRelativeTime, formatTimeRemaining, GaugeRow, StatusNote } from '../src/routes/proposal'

const NOW = 1_700_000_000_000

const poolRow: PoolRow = {
  choiceKey: '0xabc',
  label: 'AQUA+crvUSD',
  votes: 1_234_567,
  voteShare: 0.0123,
  incentiveUsd: 7350,
  rewardEfficiency: 0.0059,
  gaugeAddress: '0x1111111111111111111111111111111111111111',
  rootGaugeAddress: '0x2222222222222222222222222222222222222222',
  poolAddress: null,
  blockchainId: 'ethereum',
  poolUrls: [],
  bribeTokens: [{ symbol: 'AQUA', amount: 1000, amountUsd: 7350 }],
}

function noop() {}

function rowProps(overrides: Partial<Parameters<typeof GaugeRow>[0]> = {}): Parameters<typeof GaugeRow>[0] {
  return {
    row: poolRow,
    isWalletRow: false,
    isBallotRow: false,
    isReadOnly: false,
    ballotWeight: undefined,
    copiedLabel: null,
    onAddToBallot: noop,
    onRemoveFromBallot: noop,
    onWeightChange: noop,
    onCopy: noop,
    ...overrides,
  }
}

describe('proposal freshness feedback', () => {
  it('formats the age of each data source', () => {
    expect(formatRelativeTime(0, NOW)).toBe('not loaded yet')
    expect(formatRelativeTime(NOW - 2000, NOW)).toBe('just now')
    expect(formatRelativeTime(NOW - 12_000, NOW)).toBe('12s ago')
    expect(formatRelativeTime(NOW - 4 * 60_000, NOW)).toBe('4m ago')
    expect(formatRelativeTime(NOW - 70 * 60_000, NOW)).toBe('1h 10m ago')
    expect(formatRelativeTime(NOW - 50 * 60 * 60_000, NOW)).toBe('2d ago')
  })

  it('reports the time left before the round closes and stops at the deadline', () => {
    const end = 2_000_000
    expect(formatTimeRemaining(end, (end - 3720) * 1000)).toBe('1h 2m')
    expect(formatTimeRemaining(end, (end - 185) * 1000)).toBe('3m 5s')
    expect(formatTimeRemaining(end, (end - 9) * 1000)).toBe('9s')
    expect(formatTimeRemaining(end, end * 1000)).toBeNull()
    expect(formatTimeRemaining(end, (end + 60) * 1000)).toBeNull()
  })
})

describe('GaugeRow', () => {
  it('keeps the pool identity and every metric label in a single dense row', () => {
    const markup = renderToStaticMarkup(<GaugeRow {...rowProps()} />)

    expect(markup).toContain('data-testid="gauge-row"')
    expect(markup).toContain('AQUA+crvUSD')
    expect(markup).toContain('Ethereum · Gauge 0x1111…1111')
    expect(markup).toContain('AQUA · $7.35K')
    expect(markup).toContain('1,234,567')
    expect(markup).toContain('1.23%')
    expect(markup).toContain('$0.00590')

    for (const label of ['Votes', 'Vote share', 'Total incentives', 'Incentives / vote']) {
      expect(markup).toContain(label)
    }

    expect(markup).toContain('<dt')
    expect(markup).toContain('Add to ballot')
  })

  it('keeps copy actions available to read-only viewers without ballot actions', () => {
    const markup = renderToStaticMarkup(<GaugeRow {...rowProps({ isReadOnly: true })} />)

    expect(markup).toContain('Copy the gauge address for AQUA+crvUSD')
    expect(markup).not.toContain('Add to ballot')
  })

  it('swaps the add action for a weight input once a gauge is on the ballot', () => {
    const markup = renderToStaticMarkup(<GaugeRow {...rowProps({ isBallotRow: true, ballotWeight: 42.5 })} />)

    expect(markup).toContain('In ballot')
    expect(markup).toContain('aria-label="Vote weight for AQUA+crvUSD"')
    expect(markup).toContain('value="42.5"')
    expect(markup).not.toContain('Add to ballot')
  })

  it('marks gauges the connected wallet already voted on', () => {
    const markup = renderToStaticMarkup(<GaugeRow {...rowProps({ isWalletRow: true })} />)

    expect(markup).toContain('Your vote')
    expect(markup).toContain('Edit allocation')
  })

  it('reports when a pool carries tokens without reward amounts', () => {
    const markup = renderToStaticMarkup(
      <GaugeRow
        {...rowProps({
          row: { ...poolRow, bribeTokens: [], incentiveUsd: 0 },
        })}
      />,
    )

    expect(markup).toContain('No reward tokens detected')
  })
})

describe('StatusNote', () => {
  it('announces blocking failures and renders the recovery action', () => {
    const markup = renderToStaticMarkup(
      <StatusNote tone="danger" title="Vote submission failed" action={<button type="button">Retry</button>}>
        The wallet rejected the transaction.
      </StatusNote>,
    )

    expect(markup).toContain('role="alert"')
    expect(markup).toContain('Vote submission failed')
    expect(markup).toContain('The wallet rejected the transaction.')
    expect(markup).toContain('>Retry<')
  })

  it('stays silent for informational notes', () => {
    const markup = renderToStaticMarkup(
      <StatusNote tone="info" title="Connect a wallet to submit a vote" />,
    )

    expect(markup).not.toContain('role="alert"')
    expect(markup).toContain('Connect a wallet to submit a vote')
  })
})
