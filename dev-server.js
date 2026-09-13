import http from "node:http";
import healthHandler from "./api/health.js";
import weatherHandler from "./api/weather.js";

const port = Number(process.env.PORT || 3000);

function adaptResponse(response) {
  response.status = (code) => { response.statusCode = code; return response; };
  response.json = (body) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify(body));
    return response;
  };
  return response;
}

http.createServer(async (request, rawResponse) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const response = adaptResponse(rawResponse);
  request.query = Object.fromEntries(url.searchParams);
  if (url.pathname === "/api/health") return healthHandler(request, response);
  if (url.pathname === "/api/weather") return weatherHandler(request, response);
  return response.status(404).json({ error: "Not found" });
}).listen(port, "127.0.0.1", () => {
  console.log(`Weather backend: http://127.0.0.1:${port}`);
});
