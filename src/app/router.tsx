import { createBrowserRouter } from 'react-router'

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => ({ Component: (await import('../routes/home')).HomeRoute }),
  },
  {
    path: '/claims',
    lazy: async () => ({ Component: (await import('../routes/claims')).ClaimsRoute }),
  },
  {
    path: '/proposal/:proposalId',
    lazy: async () => ({ Component: (await import('../routes/proposal')).ProposalRoute }),
  },
  {
    path: '*',
    lazy: async () => ({ Component: (await import('../routes/not-found')).NotFoundRoute }),
  },
])
