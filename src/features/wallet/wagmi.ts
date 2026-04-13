import { createConfig, http } from 'wagmi'
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
    [mainnet.id]: http(),
  },
})
