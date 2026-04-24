import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { fallback, http } from 'viem'
import { mainnet } from 'wagmi/chains'
import { APP_NAME } from '../../lib/constants'

export const wagmiConfig = getDefaultConfig({
  appName: APP_NAME,
  projectId: 'd4fc2fe4cb25810595477364f2c0d3bf',
  chains: [mainnet],
  transports: {
    [mainnet.id]: fallback([
      http('https://ethereum-rpc.publicnode.com'),
      http('https://1rpc.io/eth'),
      http('https://rpc.mevblocker.io'),
      http('https://rpc.flashbots.net/'),
      http('https://rpc.payload.de'),
      http('https://eth.meowrpc.com'),
      http('https://eth.drpc.org'),
      http('https://eth.merkle.io'),
      http('https://eth.blockrazor.xyz'),
      http('https://endpoints.omniatech.io/v1/eth/mainnet/public'),
      http('https://0xrpc.io/eth'),
    ], { rank: false, retryCount: 2 }),
  },
})
