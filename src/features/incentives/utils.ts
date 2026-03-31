import type { LlamaEpoch } from './types'
import type { PoolRow, SnapshotProposal } from '../proposal/types'

function toSnapshotChoiceIndex(choice?: number) {
  if (typeof choice !== 'number' || choice < 0) {
    return undefined
  }

  return choice + 1
}

export function getBribedChoiceIndexes(epoch: LlamaEpoch | null) {
  return [...new Set(
    (epoch?.bribes ?? [])
      .map(bribe => toSnapshotChoiceIndex(bribe.choice))
      .filter((choice): choice is number => typeof choice === 'number' && choice > 0),
  )]
}

export function getBribedVotesTotal(proposal: SnapshotProposal, epoch: LlamaEpoch | null) {
  const bribedChoices = getBribedChoiceIndexes(epoch)

  if (bribedChoices.length === 0) {
    return proposal.scores_total
  }

  return bribedChoices.reduce((sum, choiceIndex) => sum + (proposal.scores[choiceIndex - 1] ?? 0), 0)
}

export function mergeProposalAndEpoch(proposal: SnapshotProposal, epoch: LlamaEpoch | null): PoolRow[] {
  const bribesByChoice = new Map<number, PoolRow['bribeTokens']>()
  const incentiveUsdByChoice = new Map<number, number>()
  const gaugeByChoice = new Map<number, string>()

  for (const bribe of epoch?.bribes ?? []) {
    const choiceIndex = toSnapshotChoiceIndex(bribe.choice)

    if (!choiceIndex)
      continue

    const tokens = bribesByChoice.get(choiceIndex) ?? []
    tokens.push({
      symbol: bribe.token,
      amount: bribe.amount,
      amountUsd: bribe.amountDollars,
    })
    bribesByChoice.set(choiceIndex, tokens)
    incentiveUsdByChoice.set(choiceIndex, (incentiveUsdByChoice.get(choiceIndex) ?? 0) + bribe.amountDollars)

    if (bribe.gauge) {
      gaugeByChoice.set(choiceIndex, bribe.gauge)
    }
  }

  return proposal.choices.map((label, index) => {
    const choiceIndex = index + 1
    const snapshotVotes = proposal.scores[index] ?? 0
    const incentiveUsd = incentiveUsdByChoice.get(choiceIndex)

    return {
      choiceIndex,
      choiceKey: String(choiceIndex),
      label,
      snapshotVotes,
      voteShare: proposal.scores_total > 0 ? snapshotVotes / proposal.scores_total : 0,
      incentiveUsd,
      rewardEfficiency: incentiveUsd && snapshotVotes > 0 ? incentiveUsd / snapshotVotes : undefined,
      gaugeAddress: gaugeByChoice.get(choiceIndex),
      bribeTokens: bribesByChoice.get(choiceIndex) ?? [],
    }
  })
}
