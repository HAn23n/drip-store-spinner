// Shared response init for every API route: explicitly disables caching so a
// save is never masked by a stale response from a CDN or proxy sitting
// between Vercel and the browser.
export const NO_STORE = { headers: { "Cache-Control": "no-store, max-age=0" } };

// YYYY-MM-DD in Asia/Bangkok, for filenames — matches the timezone every
// timestamp in the app is already displayed in (see formatDateTime in
// app/admin/history/page.tsx), instead of the UTC date toISOString() gives.
export function bangkokDateStamp(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);
}
