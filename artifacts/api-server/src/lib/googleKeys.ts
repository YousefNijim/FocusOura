/**
 * Google API keys, split by where the request comes from.
 *
 * One key cannot serve both callers. The browser key is published to every
 * visitor by `GET /api/config/firebase` — that is correct for a Firebase web
 * key, and it should be restricted by HTTP referrer so a copied key is useless
 * elsewhere. But a referrer restriction rejects server-to-server calls
 * outright, because they carry no referrer at all:
 *
 *   API_KEY_HTTP_REFERRER_BLOCKED — "Requests from referer <empty> are blocked."
 *
 * So the server needs its own key, restricted by API rather than by referrer,
 * and never sent to a browser.
 *
 * `GOOGLE_SERVER_API_KEY` falls back to `GOOGLE_API_KEY` so nothing breaks
 * before the new variable is set; once it is, remove the browser key's reach
 * over server APIs.
 */
export function serverGoogleApiKey(): string | undefined {
  return process.env.GOOGLE_SERVER_API_KEY || process.env.GOOGLE_API_KEY;
}

/** The Firebase web key handed to browsers. Safe to publish, by design. */
export function browserFirebaseApiKey(): string | undefined {
  return process.env.GOOGLE_API_KEY;
}
