import { createBrowserRouter } from 'react-router'
import { HomeRoute } from '../routes/home'
import { ProposalRoute } from '../routes/proposal'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomeRoute />,
  },
  {
    path: '/proposal/:proposalId',
    element: <ProposalRoute />,
  },
])
