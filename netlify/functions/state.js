const { getStore } = require("@netlify/blobs");

const KEY = "roomcheck-state";

const DEFAULT_STATE = {
  checked: {},
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

exports.handler = async (event) => {
  try {
    const store = getBlobsStore();

    if (event.httpMethod === "GET") {
      const data = await store.get(KEY, { type: "json" });
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(data || DEFAULT_STATE)
      };
    }

    if (event.httpMethod === "POST") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch (e) {
        return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: "Invalid JSON" }) };
      }

      const current = (await store.get(KEY, { type: "json" })) || DEFAULT_STATE;

      // Merge per-checkbox so two people toggling different boxes at once
      // don't clobber each other's changes.
      const mergedChecked = Object.assign({}, current.checked, body.checkedPatch || {});

      const merged = {
        checked: mergedChecked,
        rotationOffset: typeof body.rotationOffset === "number" ? body.rotationOffset : current.rotationOffset,
        lastReset: body.lastReset !== undefined ? body.lastReset : current.lastReset,
        updatedAt: new Date().toISOString()
      };

      await store.setJSON(KEY, merged);

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
