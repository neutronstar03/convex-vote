// Cloudflare Pages Function — Llama Airforce API proxy
// Handles GET /api/llama/* and forwards to the Llama Airforce API.
//
// This proxy is needed because the Llama Airforce API does not set CORS headers,
// so direct browser-side calls would be blocked by the browser's same-origin policy.
// By proxying through a same-origin CF Pages Function, the SPA can access the data
// without CORS issues.
//
// The backend is fixed to https://api.llama.airforce.

const DEFAULT_LLAMA_BACKEND = 'https://api.llama.airforce'
const TRAILING_SLASHES_REGEX = /\/+$/

export const onRequestGet: PagesFunction = async (context) => {
  const llamaBackend = DEFAULT_LLAMA_BACKEND.replace(TRAILING_SLASHES_REGEX, '')

  // The CF Pages router strips the /api/llama prefix and puts the remainder in params.path.
  // For a catch-all route [[path]], params.path is the remainder after the prefix.
  // If the route doesn't capture any remainder (e.g. just /api/llama), params.path may be empty.
  const remainingPath = context.params.path
    ? (Array.isArray(context.params.path) ? context.params.path.join('/') : context.params.path)
    : ''

  const targetUrl = remainingPath
    ? `${llamaBackend}/${remainingPath}`
    : llamaBackend

  // Forward query string
  const url = new URL(context.request.url)
  if (url.search) {
    const target = new URL(targetUrl)
    target.search = url.search
    return fetch(target.toString(), {
      headers: {
        Accept: 'application/json',
      },
    }).then(response => new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60, s-maxage=120',
      },
    }))
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Accept: 'application/json',
      },
    })

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60, s-maxage=120',
      },
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: `Llama proxy error: ${message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Handle CORS preflight for the proxy
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
