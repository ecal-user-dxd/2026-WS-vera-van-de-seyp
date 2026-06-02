/**
 * Minimal client for the CMS_central headless Kirby API.
 *
 * Copy this file into any project that needs CMS content. It has no
 * dependencies and works in the browser, Node, Vite, etc.
 *
 *   import { kql, page } from "./cms.js";
 *
 *   const list = await kql({ query: "site.children.listed",
 *                            select: { title: true, url: true } });
 *   const home = await page("home");
 *
 * Configure via env vars (CMS_URL / CMS_TOKEN, or VITE_*),
 * or call configureCms({ url, token }) once at startup.
 */

// Read config from whatever env is available (Vite, Node, or none).
function readEnv(name) {
  // Vite / bundlers that expose import.meta.env
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      return import.meta.env[`VITE_${name}`] ?? import.meta.env[name];
    }
  } catch {
    /* import.meta not available in this context */
  }
  // Node
  if (typeof process !== "undefined" && process.env) {
    return process.env[name];
  }
  return undefined;
}

const config = {
  url: readEnv("CMS_URL") ?? "http://localhost:8000",
  token: readEnv("CMS_TOKEN") ?? "",
};

/** Override the base URL / token at runtime (call once at startup). */
export function configureCms({ url, token } = {}) {
  if (url) config.url = url.replace(/\/$/, "");
  if (token) config.token = token;
}

function authHeaders(extra = {}) {
  if (!config.token) {
    throw new Error("CMS token is not set. Set CMS_TOKEN or call configureCms({ token }).");
  }
  return { Authorization: `Bearer ${config.token}`, ...extra };
}

/**
 * Run a KQL query against POST /api/kql.
 * Returns the unwrapped `result` (the API wraps it in { code, status, result }).
 *
 * @param {object} query - e.g. { query: "site.children", select: { title: true } }
 */
export async function kql(query) {
  const res = await fetch(`${config.url}/api/kql`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(query),
  });
  if (!res.ok) {
    throw new Error(`KQL request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.result;
}

/**
 * Fetch a single page as JSON by its id/uri (e.g. "home", "workshop-vera").
 * Page routes return the JSON directly (no { result } wrapper).
 */
export async function page(uri) {
  const res = await fetch(`${config.url}/${uri.replace(/^\//, "")}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Page "${uri}" failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
