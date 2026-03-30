import { APP_NAME } from '../../lib/constants'
import { coinbaseWallet, injected, metaMask } from 'wagmi/connectors'
import { createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected(),
    metaMask({
      dappMetadata: {
        name: APP_NAME,
        url: 'http://localhost:5173',
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
