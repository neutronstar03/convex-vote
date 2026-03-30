import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { RouterProvider } from 'react-router/dom'
import { WagmiProvider } from 'wagmi'
import { router } from './router'
import { wagmiConfig } from '../features/wallet/wagmi'

const queryClient = new QueryClient()

export function AppProviders() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#b026ff',
            accentColorForeground: '#f3f6f7',
            borderRadius: 'small',
          })}
        >
          <RouterProvider router={router} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
