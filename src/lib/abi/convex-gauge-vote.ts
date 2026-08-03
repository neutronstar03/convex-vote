import type { Address } from 'viem'

export const CONVEX_CURVE_GAUGE_VOTE_ADDRESS: Address = '0x64D9B5AC386B70af9EDCD20A58cE9262D2EAC278'

export const CONVEX_CURVE_GAUGE_VOTE_ABI = [
  {
    type: 'function',
    name: 'proposalCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'function',
    name: 'proposals',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      { name: 'startTime', type: 'uint48', internalType: 'uint48' },
      { name: 'endTime', type: 'uint48', internalType: 'uint48' },
      { name: 'epoch', type: 'uint48', internalType: 'uint48' },
    ],
  },
  {
    type: 'function',
    name: 'isFinalized',
    stateMutability: 'view',
    inputs: [{ name: '_proposalId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
  },
  {
    type: 'function',
    name: 'max_weight',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'function',
    name: 'vote',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_account', type: 'address', internalType: 'address' },
      { name: '_gauges', type: 'address[]', internalType: 'address[]' },
      { name: '_weights', type: 'uint256[]', internalType: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getVote',
    stateMutability: 'view',
    inputs: [
      { name: '_proposalId', type: 'uint256', internalType: 'uint256' },
      { name: '_user', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: 'gauges', type: 'address[]', internalType: 'address[]' },
      { name: 'weights', type: 'uint256[]', internalType: 'uint256[]' },
      { name: 'voted', type: 'bool', internalType: 'bool' },
      { name: 'baseWeight', type: 'uint256', internalType: 'uint256' },
      { name: 'adjustedWeight', type: 'int256', internalType: 'int256' },
    ],
  },
] as const

export const CONVEX_GAUGE_WEIGHT_TOTAL = 1_000_000n
