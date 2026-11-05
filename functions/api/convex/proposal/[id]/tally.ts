import { proxyConvexProposal } from '../[id]'

export const onRequestGet: PagesFunction = context => proxyConvexProposal(context.params.id, true)
