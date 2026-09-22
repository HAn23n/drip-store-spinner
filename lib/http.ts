// Shared response init for every API route: explicitly disables caching so a
// save is never masked by a stale response from a CDN or proxy sitting
// between Vercel and the browser.
export const NO_STORE = { headers: { "Cache-Control": "no-store, max-age=0" } };
