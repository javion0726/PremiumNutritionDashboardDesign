// Netlify Function: USDA FoodData Central search proxy.
//
// Why this exists: the USDA API key must never ship in client-side JS (it was
// previously hardcoded in app.js and visible to anyone). The client now calls
// /.netlify/functions/food-search and the key lives in the site's environment.
//
// Setup (required on EACH Netlify site — test and live):
//   Site configuration → Environment variables → add USDA_API_KEY
//
// Query params:
//   q    — search text (required, 2..80 chars)
//   mode — "full"  → Foundation, SR Legacy, Survey (FNDDS), Branded  (meal search)
//          "basic" → Foundation, SR Legacy                            (ingredient search)

const DATA_TYPES = {
  full: 'Foundation,SR Legacy,Survey (FNDDS),Branded',
  basic: 'Foundation,SR Legacy',
};

export default async (request) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const mode = url.searchParams.get('mode') === 'basic' ? 'basic' : 'full';

  if (q.length < 2 || q.length > 80) {
    return json({ error: 'Query must be 2-80 characters' }, 400);
  }

  const key = process.env.USDA_API_KEY;
  if (!key) {
    // Misconfiguration, not a user error — surface clearly in function logs.
    console.error('USDA_API_KEY is not set on this Netlify site');
    return json({ error: 'Food search is not configured on this deployment' }, 503);
  }

  const upstream =
    'https://api.nal.usda.gov/fdc/v1/foods/search' +
    `?query=${encodeURIComponent(q)}` +
    '&pageSize=6' +
    `&dataType=${encodeURIComponent(DATA_TYPES[mode])}` +
    `&api_key=${key}`;

  try {
    const res = await fetch(upstream);
    if (!res.ok) return json({ error: `USDA upstream error (${res.status})` }, 502);
    const data = await res.json();
    // Pass through only what the client uses; strips the (large) unused fields
    // and keeps the response shape identical to what app.js already parses.
    return json({ foods: data.foods || [] }, 200, {
      // Identical queries within a short window can share a cached response at
      // the CDN — cuts USDA quota usage without ever going stale in practice.
      'Cache-Control': 'public, max-age=300',
    });
  } catch (err) {
    console.error('USDA fetch failed:', err);
    return json({ error: 'USDA request failed' }, 502);
  }
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
