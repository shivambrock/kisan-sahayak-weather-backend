import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const CURRENT_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";
const FALLBACK_RESOURCE = "35985678-0d79-46b4-9ed6-6f13308a1d24";
const MAX_LIMIT = 400;

function text(record, ...names) {
  for (const name of names) {
    const value = record?.[name];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return null;
}

function normalize(record) {
  return {
    state: text(record, "state", "State"),
    district: text(record, "district", "District"),
    market: text(record, "market", "Market"),
    commodity: text(record, "commodity", "Commodity"),
    variety: text(record, "variety", "Variety"),
    arrival_date: text(record, "arrival_date", "Arrival_Date"),
    min_price: text(record, "min_price", "Min_Price", "Min_x0020_Price"),
    max_price: text(record, "max_price", "Max_Price", "Max_x0020_Price"),
    modal_price: text(record, "modal_price", "Modal_Price", "Modal_x0020_Price"),
    arrivals: text(record, "arrival", "Arrival", "arrivals")
  };
}

async function fetchResource(resourceId, parameters, apiKey) {
  const url = new URL(`https://api.data.gov.in/resource/${resourceId}`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const result = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "KisanSahayakMandi/1.0" },
    signal: AbortSignal.timeout(12000)
  });
  if (!result.ok) throw new Error(`Data.gov.in returned HTTP ${result.status}`);
  const data = await result.json();
  if (!Array.isArray(data.records)) throw new Error("Invalid AGMARKNET response");
  return {
    records: data.records.map(normalize).filter((record) =>
      record.state && record.district && record.market && record.commodity &&
      record.arrival_date && record.min_price && record.max_price && record.modal_price
    ),
    total: Number.isFinite(Number(data.total)) ? Number(data.total) : null,
    count: data.records.length,
    source: "Data.gov.in / AGMARKNET"
  };
}

export async function getMandi(query, apiKey = process.env.MANDI_API_KEY) {
  if (!apiKey) throw new Error("Mandi API key is not configured");
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), MAX_LIMIT);
  const offset = Math.max(Number(query.offset) || 0, 0);
  const parameters = { limit, offset };
  if (query.state) parameters["filters[state]"] = String(query.state).trim();
  if (query.district) parameters["filters[district]"] = String(query.district).trim();

  let lastError;
  for (const resource of [CURRENT_RESOURCE, FALLBACK_RESOURCE]) {
    try {
      const result = await fetchResource(resource, parameters, apiKey);
      if (result.records.length) return { ...result, offset, limit };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No live mandi records available");
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }
  try {
    return response.status(200).json(await getMandi(request.query));
  } catch (error) {
    console.error("Mandi proxy request failed", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "UnknownError",
      cause: error instanceof Error && error.cause instanceof Error
        ? { message: error.cause.message, code: error.cause.code }
        : undefined
    });
    return response.status(502).json({ error: "Live mandi prices are temporarily unavailable" });
  }
}
