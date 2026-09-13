import assert from "node:assert/strict";
import test from "node:test";
import handler from "../api/weather.js";

function responseRecorder() {
  return {
    code: 200,
    body: null,
    headers: {},
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; }
  };
}

test("rejects requests without a location", async () => {
  const response = responseRecorder();
  await handler({ method: "GET", query: {} }, response);
  assert.equal(response.code, 400);
  assert.equal(response.body.error, "Valid location is required");
});

test("rejects non-GET requests", async () => {
  const response = responseRecorder();
  await handler({ method: "POST", query: { location: "Delhi" } }, response);
  assert.equal(response.code, 405);
  assert.equal(response.headers.Allow, "GET");
});
