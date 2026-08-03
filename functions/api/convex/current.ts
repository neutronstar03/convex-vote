// Fixed same-origin proxy for the canonical current Convex Curve gauge round.
// The target is intentionally not derived from request input.

const CONVEX_CURRENT_PROPOSAL_URL = 'https://www.convexfinance.com/api/vote/weights/curve/proposal/current'

const RESPONSE_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=30, s-maxage=60',
  'Content-Type': 'application/json',
}

export const onRequestGet: PagesFunction = async () => {
  try {
    const response = await fetch(CONVEX_CURRENT_PROPOSAL_URL, {
      headers: { Accept: 'application/json' },
    })

    return new Response(response.body, {
      status: response.status,
      headers: RESPONSE_HEADERS,
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: `Convex proxy error: ${message}` }), {
      status: 502,
      headers: RESPONSE_HEADERS,
    })
  }
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Max-Age': '86400',
    },
  })
}
