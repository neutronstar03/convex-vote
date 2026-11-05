const PROPOSAL_ID_PATTERN = /^(?:0|[1-9]\d*)$/

export async function proxyConvexProposal(id: string | string[] | undefined, tally = false) {
  if (typeof id !== 'string' || !PROPOSAL_ID_PATTERN.test(id) || !Number.isSafeInteger(Number(id)))
    return Response.json({ error: 'Invalid Convex proposal id' }, { status: 400 })

  try {
    const response = await fetch(`https://www.convexfinance.com/api/vote/weights/curve/proposal/${id}${tally ? '/tally' : ''}`, { headers: { Accept: 'application/json' } })
    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': tally ? 'public, max-age=30' : 'public, max-age=300' },
    })
  }
  catch {
    return Response.json({ error: 'Convex history is unavailable' }, { status: 502 })
  }
}

export const onRequestGet: PagesFunction = context => proxyConvexProposal(context.params.id)
