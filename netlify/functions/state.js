const { getStore } = require("@netlify/blobs");

// The very first apartment this app was built for keeps its original,
// un-suffixed storage key so none of its existing saved data moves or
// resets when multi-apartment support was added. Every apartment added
// after that gets its own key: "roomcheck-state-<slug>".
const LEGACY_KEY = "roomcheck-state";
const LEGACY_SLUG = "1953-101";
const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

const DEFAULT_STATE = {
  checked: {},
  checkedAt: {},
  rotationOffset: 0,
  lastReset: null,
  updatedAt: null
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

// Netlify Blobs is supposed to auto-configure itself inside a deployed
// Function with no extra setup. That auto-config hasn't been working on
// this deploy, so this falls back to explicit credentials instead:
// NETLIFY_AUTH_TOKEN is set as a site environment variable (Project
// configuration > Environment variables), and the site ID is hardcoded
// below since it's a stable identifier, not a secret. process.env checks
// come first in case Netlify's automatic values ever do become available.
const SITE_ID = "e81ae963-06c9-4870-99fa-e0c8e347fc39";

function getBlobsStore() {
  if (process.env.NETLIFY_AUTH_TOKEN) {
    return getStore({
      name: "roomcheck",
      siteID: process.env.NETLIFY_SITE_ID || SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });
  }
  return getStore("roomcheck");
}

// Turns a ?apartment=<slug> query param into the Blobs key that
// apartment's data lives under, or null if the slug is missing/invalid.
function keyForApartment(rawSlug) {
  const slug = (rawSlug || LEGACY_SLUG).toLowerCase();
  if (slug === LEGACY_SLUG) return LEGACY_KEY;
  if (!SLUG_PATTERN.test(slug)) return null;
  return LEGACY_KEY + "-" + slug;
}

exports.handler = async (event) => {
  try {
    const rawSlug = event.queryStringParameters && event.queryStringParameters.apartment;
    const key = keyForApartment(rawSlug);
    if (!key) {
      return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: "Invalid apartment" }) };
    }

    const store = getBlobsStore();

    if (event.httpMethod === "GET") {
      const data = await store.get(key, { type: "json" });
      // Object.assign over DEFAULT_STATE so records saved before the
      // checkedAt field existed still come back with an (empty) map
      // instead of undefined.
      const responseData = Object.assign({}, DEFAULT_STATE, data || {});
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(responseData)
      };
    }

    if (event.httpMethod === "POST") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch (e) {
        return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: "Invalid JSON" }) };
      }

      const current = Object.assign({}, DEFAULT_STATE, (await store.get(key, { type: "json" })) || {});

      // Merge per-checkbox so two people toggling different boxes at once
      // don't clobber each other's changes.
      const mergedChecked = Object.assign({}, current.checked, body.checkedPatch || {});
      const mergedCheckedAt = Object.assign({}, current.checkedAt, body.checkedAtPatch || {});

      const merged = {
        checked: mergedChecked,
        checkedAt: mergedCheckedAt,
        rotationOffset: typeof body.rotationOffset === "number" ? body.rotationOffset : current.rotationOffset,
        lastReset: body.lastReset !== undefined ? body.lastReset : current.lastReset,
        updatedAt: new Date().toISOString()
      };

      await store.setJSON(key, merged);

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(merged)
      };
    }

    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    console.error("[roomcheck] state function error:", err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: "Server error", message: err && err.message ? err.message : String(err) })
    };
  }
};
