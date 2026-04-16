/// <reference types="@cloudflare/workers-types" />

import { findClaimsForVoter, serializeClaimableToken } from '../../../../src/features/claim/source'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60, s-maxage=120',
    },
  })
}

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const rawAddress = Array.isArray(context.params.address)
      ? context.params.address[0]
      : context.params.address

    if (!rawAddress) {
      return jsonResponse({ error: 'Missing wallet address' }, 400)
    }

    // Address validation is handled inside findClaimsForVoter
    const claims = await findClaimsForVoter(fetch, rawAddress)

    return jsonResponse({
      address: rawAddress.toLowerCase(),
      claims: claims.map(serializeClaimableToken),
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Votium claims error:', error)
    return jsonResponse({ error: `Votium claim proxy error: ${message}` }, 502)
  }
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
