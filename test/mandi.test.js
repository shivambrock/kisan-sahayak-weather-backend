import assert from "node:assert/strict";
import test from "node:test";
import { getMandi } from "../api/mandi.js";

test("normalizes current AGMARKNET records and keeps the key server-side", async (context) => {
  const originalFetch = global.fetch;
  context.after(() => { global.fetch = originalFetch; });
  let requestedUrl;
  global.fetch = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({
        total: 1,
        records: [{
          state: "Uttar Pradesh", district: "Etawah", market: "Bharthana",
          commodity: "Wheat", variety: "Dara", arrival_date: "15/10/2026",
          min_price: 2400, max_price: 2500, modal_price: 2450
        }]
      })
    };
  };

  const result = await getMandi({ limit: "25", state: "Uttar Pradesh" }, "secret-key");
  assert.equal(result.records[0].modal_price, "2450");
  assert.equal(result.records[0].arrival_date, "15/10/2026");
  assert.equal(requestedUrl.pathname, "/resource/9ef84268-d588-465a-a308-a864a43d0070");
  assert.equal(requestedUrl.searchParams.get("api-key"), "secret-key");
  assert.equal(requestedUrl.searchParams.get("filters[state]"), "Uttar Pradesh");
});

test("fails when the server key is missing", async () => {
  await assert.rejects(() => getMandi({}, ""), /not configured/);
});

test("a successful empty source result is returned as empty, not an outage", async (context) => {
  const originalFetch = global.fetch;
  context.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({ ok: true, json: async () => ({ total: 0, records: [] }) });
  const result = await getMandi({ state: "Uttar Pradesh", district: "NoSuchDistrict" }, "test-key");
  assert.deepEqual(result.records, []);
  assert.equal(result.total, 0);
});

test("passes commodity and market filters upstream with pagination", async (context) => {
  const originalFetch = global.fetch;
  context.after(() => { global.fetch = originalFetch; });
  const urls = [];
  global.fetch = async (url) => {
    urls.push(new URL(url));
    return { ok: true, json: async () => ({ total: 0, records: [] }) };
  };
  await getMandi({ state: "Uttar Pradesh", district: "Agra", commodity: "Onion", market: "Samsabad APMC", limit: "50", offset: "50" }, "test-key");
  for (const url of urls) {
    assert.equal(url.searchParams.get("filters[state]"), "Uttar Pradesh");
    assert.equal(url.searchParams.get("filters[district]"), "Agra");
    assert.equal(url.searchParams.get("filters[commodity]"), "Onion");
    assert.equal(url.searchParams.get("filters[market]"), "Samsabad APMC");
    assert.equal(url.searchParams.get("offset"), "50");
    assert.equal(url.searchParams.get("limit"), "50");
  }
});
