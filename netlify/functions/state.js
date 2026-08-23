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

exports.handler = async (event) => {
  const store = getStore("roomcheck");

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
};
