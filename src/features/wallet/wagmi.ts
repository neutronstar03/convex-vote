import { createConfig, fallback, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { coinbaseWallet, injected, metaMask } from 'wagmi/connectors'
import { APP_NAME } from '../../lib/constants'

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected(),
    metaMask({
      dappMetadata: {
        name: APP_NAME,
        url: 'https://cvx.ns03.dev',
      },
    }),
    coinbaseWallet({
      appName: APP_NAME,
    }),
  ],
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
