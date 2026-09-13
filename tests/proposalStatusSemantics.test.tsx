import type { BribeDataAnomaly } from '../src/features/incentives/utils'
import type { PoolRow } from '../src/features/proposal/types'
import type { IncentiveMarketPanelProps } from '../src/features/proposal/ui/incentive-market'
import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { describeBribeDataAnomaly, summarizeRewardTokens } from '../src/features/proposal/ui/format'
import { compareRows } from '../src/features/proposal/ui/gauge-market'
import { IncentiveMarketPanel } from '../src/features/proposal/ui/incentive-market'
import { STATUS_NOTE_ICON_CLASS, STATUS_NOTE_TONE_CLASS, StatusNote } from '../src/features/proposal/ui/shared'
import { WalletPositionPanel } from '../src/features/proposal/ui/wallet-position'

function poolRow(overrides: Partial<PoolRow> = {}): PoolRow {
  return {
    choiceKey: '0xabc',
    label: 'AQUA+crvUSD',
    votes: 0,
    voteShare: 0,
    incentiveUsd: 0,
    rewardEfficiency: null,
    gaugeAddress: '0x1111111111111111111111111111111111111111',
    rootGaugeAddress: '0x2222222222222222222222222222222222222222',
    poolAddress: null,
    blockchainId: 'ethereum',
    poolUrls: [],
    bribeTokens: [],
    ...overrides,
  }
}

const TONES = ['info', 'warning', 'danger', 'success', 'neutral'] as const

function noop() {}

function marketProps(overrides: Partial<IncentiveMarketPanelProps> = {}): IncentiveMarketPanelProps {
  return {
    incentiveState: 'ready',
    anomaly: null,
    summary: '8 of 40 eligible gauges carry active Llama incentives',
    rows: [poolRow({ label: 'AQUA+crvUSD', incentiveUsd: 7350 })],
    sortedRows: [poolRow({ label: 'AQUA+crvUSD', incentiveUsd: 7350 })],
    totalIncentivesUsd: 7350,
    roundNumber: 42,
    canVote: false,
    walletChoiceKeys: new Set<string>(),
    isEditorOpen: false,
    allocations: {},
    copiedLabel: null,
    filters: {
      searchTerm: '',
      onSearchTermChange: noop,
      rewardTokenFilter: 'all',
      rewardTokenOptions: ['all', 'AQUA'],
      onRewardTokenFilterChange: noop,
      sortKey: 'incentives',
      onSortKeyChange: noop,
      showOnlyWalletVotes: false,
      onShowOnlyWalletVotesChange: noop,
      canFilterWalletVotes: false,
      isFiltered: false,
      onReset: noop,
    },
    ballot: { onAdd: noop, onRemove: noop, onWeightChange: noop },
    onCopy: noop,
    onRetryIncentives: noop,
    ...overrides,
  }
}

describe('extracted proposal sections', () => {
  it('keeps the incentive market chrome and row list intact', () => {
    const markup = renderToStaticMarkup(<IncentiveMarketPanel {...marketProps()} />)

    expect(markup).toContain('Votium incentive market')
    expect(markup).toContain('Incentivized gauges')
    expect(markup).toContain('Search pool, token or gauge address')
    expect(markup).toContain('data-testid="gauge-row"')
  })

  it('renders the unmatched-round note with the warning treatment', () => {
    const markup = renderToStaticMarkup(
      <IncentiveMarketPanel {...marketProps({ incentiveState: 'unmatched', rows: [], sortedRows: [] })} />,
    )

    expect(markup).toContain('No Llama round matched to this voting window yet')
    expect(markup).toContain('data-tone="warning"')
    expect(markup).toContain('--color-warning')
    expect(markup).not.toContain('data-testid="gauge-row"')
  })

  it('renders the wallet position section for a wallet without an on-chain vote', () => {
    const markup = renderToStaticMarkup(
      <WalletPositionPanel
        activeAddress="0x1234567890abcdef1234567890abcdef12345678"
        isWatchMode={false}
        voted={false}
        rows={[]}
        isPending={false}
        isError={false}
        onRetry={noop}
      />,
    )

    expect(markup).toContain('Wallet-voted gauges')
    expect(markup).toContain('No on-chain vote found for this wallet in this round')
  })
})

describe('proposal status semantics', () => {
  it('gives warning its own accent instead of reusing the positive lime', () => {
    const warning = renderToStaticMarkup(
      <StatusNote tone="warning" title="No incentivized gauges reported for this round">
        Llama Airforce reports $0 across 0 gauges.
      </StatusNote>,
    )
    const success = renderToStaticMarkup(
      <StatusNote tone="success" title="Vote submitted on-chain">
        Your vote has been recorded for this Convex round.
      </StatusNote>,
    )

    expect(warning).toContain('data-tone="warning"')
    expect(warning).toContain('--color-warning')
    expect(warning).not.toContain('--color-positive')

    expect(success).toContain('data-tone="success"')
    expect(success).toContain('--color-positive')
    expect(success).not.toContain('--color-warning')
  })

  it('keeps the five tones visually distinct', () => {
    const markup = TONES.map(tone => renderToStaticMarkup(<StatusNote tone={tone} title={tone} />))

    expect(new Set(TONES.map(tone => STATUS_NOTE_TONE_CLASS[tone])).size).toBe(TONES.length)
    expect(new Set(TONES.map(tone => STATUS_NOTE_ICON_CLASS[tone])).size).toBe(TONES.length)
    expect(new Set(markup).size).toBe(TONES.length)
  })

  it('announces only blocking failures as alerts', () => {
    const warning = renderToStaticMarkup(<StatusNote tone="warning" title="Incentives are far below the previous round" />)
    const success = renderToStaticMarkup(<StatusNote tone="success" title="Vote submitted on-chain" />)
    const danger = renderToStaticMarkup(<StatusNote tone="danger" title="Vote submission failed" />)

    expect(warning).not.toContain('role="alert"')
    expect(success).not.toContain('role="alert"')
    expect(danger).toContain('role="alert"')
  })
})

describe('describeBribeDataAnomaly', () => {
  it('names both rounds and both figures so the reader can judge the drift', () => {
    const anomaly: BribeDataAnomaly = {
      severity: 'severe',
      currentRound: 42,
      previousRound: 41,
      currentBribedGaugeCount: 3,
      previousBribedGaugeCount: 37,
      currentBribesUsd: 7922,
      previousBribesUsd: 286950,
      gaugeCountDrop: 0.91,
      bribesUsdDrop: 0.97,
      roundProgress: 0.4,
      tooltip: 'Incentives are far below the previous round.',
    }

    const summary = describeBribeDataAnomaly(anomaly)

    expect(summary).toContain('3 incentivized gauges in active Votium round 42')
    expect(summary).toContain('37 in completed round 41')
    expect(summary).toContain('$7.92K')
    expect(summary).toContain('$286.95K')
    expect(summary).toContain('can change')
  })
})

describe('summarizeRewardTokens', () => {
  it('caps the reward-token list and reports an empty round plainly', () => {
    expect(summarizeRewardTokens([])).toBe('None')

    const twoTokens = poolRow({
      bribeTokens: [
        { symbol: 'BOLD', amount: 1, amountUsd: 2 },
        { symbol: 'USDC', amount: 1, amountUsd: 3 },
      ],
    })
    expect(summarizeRewardTokens([twoTokens])).toBe('BOLD, USDC')

    const manyTokens = ['BOLD', 'USDC', 'CRV', 'AQUA', 'IQ'].map(symbol =>
      poolRow({ bribeTokens: [{ symbol, amount: 1, amountUsd: 1 }] }),
    )
    expect(summarizeRewardTokens(manyTokens)).toBe('BOLD, USDC, CRV, AQUA +1')
  })
})

describe('compareRows', () => {
  it('sorts by incentives by default and by votes on request', () => {
    const lowIncentive = poolRow({ choiceKey: 'a', label: 'a', incentiveUsd: 10, votes: 100 })
    const highIncentive = poolRow({ choiceKey: 'b', label: 'b', incentiveUsd: 30, votes: 50 })
    const rows = [lowIncentive, highIncentive]

    expect([...rows].sort((left, right) => compareRows(left, right, 'incentives')).map(row => row.label)).toEqual(['b', 'a'])
    expect([...rows].sort((left, right) => compareRows(left, right, 'votes')).map(row => row.label)).toEqual(['a', 'b'])
  })
})
