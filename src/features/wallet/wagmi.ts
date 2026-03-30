import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet } from 'wagmi/chains'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'demo-project-id'

export const wagmiConfig = getDefaultConfig({
  appName: 'Convex Vote',
  appDescription: 'Custom Snapshot voting UI for Convex gauge rounds',
  appUrl: 'http://localhost:5173',
  projectId,
  chains: [mainnet],
  ssr: false,
})
