export const MULTI_MERKLE_STASH_ABI = [
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'index', type: 'uint256' },
      { name: 'account', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'merkleProof', type: 'bytes32[]' },
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      {
        name: 'claims',
        type: 'tuple[]',
        components: [
          { name: 'token', type: 'address' },
          { name: 'index', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'merkleProof', type: 'bytes32[]' },
        ],
      },
    ],
    name: 'claimMulti',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    name: 'isClaimed',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
