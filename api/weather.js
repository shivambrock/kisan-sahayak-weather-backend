const MAX_LOCATION_LENGTH = 120;

function weatherCodeLabel(code) {
  if (code === 0) return "साफ मौसम";
  if ([1, 2].includes(code)) return "आंशिक बादल";
  if (code === 3) return "बादल छाए हैं";
  if ([45, 48].includes(code)) return "कोहरा";
  if ([51, 53, 55, 56, 57].includes(code)) return "हल्की फुहार";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "बारिश";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "बर्फबारी";
  if ([95, 96, 99].includes(code)) return "गरज-चमक की संभावना";
  return "मौसम उपलब्ध";
}

async function fetchJson(url) {
  const result = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "KisanSahayakWeather/1.0" },
    signal: AbortSignal.timeout(8000)
  });
  if (!result.ok) throw new Error(`Provider returned HTTP ${result.status}`);
  return result.json();
}

async function fromWeatherApi(location, apiKey) {
  const url = new URL("https://api.weatherapi.com/v1/forecast.json");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", location);
  url.searchParams.set("days", "3");
  url.searchParams.set("aqi", "no");
  url.searchParams.set("alerts", "no");
  const data = await fetchJson(url);
  return {
    location: data.location.name,
    updatedAt: data.current.last_updated?.split(" ")[1] || "अभी",
    temperatureC: String(data.current.temp_c),
    condition: data.current.condition?.text || "मौसम उपलब्ध",
    humidity: String(data.current.humidity),
    windKph: String(data.current.wind_kph),
    days: data.forecast.forecastday.map((item) => ({
      date: item.date,
      temperatureC: String(item.day.avgtemp_c),
      rainChance: String(item.day.daily_chance_of_rain ?? 0)
    })),
    provider: "WeatherAPI.com"
  };
}

async function fromOpenMeteo(location) {
  const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.searchParams.set("name", location);
  geoUrl.searchParams.set("count", "1");
  geoUrl.searchParams.set("language", "en");
  geoUrl.searchParams.set("format", "json");
  geoUrl.searchParams.set("countryCode", "IN");
  const geo = await fetchJson(geoUrl);
  const place = geo.results?.[0];
  if (!place) throw new Error("Location not found");

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", place.latitude);
  url.searchParams.set("longitude", place.longitude);
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "weather_code,temperature_2m_mean,precipitation_probability_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "3");
  const data = await fetchJson(url);
  return {
    location: place.name || location,
    updatedAt: data.current.time?.split("T")[1] || "अभी",
    temperatureC: String(data.current.temperature_2m),
    condition: weatherCodeLabel(data.current.weather_code),
    humidity: String(data.current.relative_humidity_2m),
    windKph: String(data.current.wind_speed_10m),
    days: data.daily.time.map((date, index) => ({
      date,
      temperatureC: String(data.daily.temperature_2m_mean[index]),
      rainChance: String(data.daily.precipitation_probability_max[index] ?? 0)
    })),
    provider: "Open-Meteo"
  };
}

export async function getWeather(location, apiKey = process.env.WEATHER_API_KEY) {
  if (apiKey) {
    try {
      return await fromWeatherApi(location, apiKey);
    } catch {
      // A provider outage or expired key must not make weather disappear.
    }
  }
  return fromOpenMeteo(location);
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }
  const location = String(request.query.location || "").trim();
  if (!location || location.length > MAX_LOCATION_LENGTH) {
    return response.status(400).json({ error: "Valid location is required" });
  }
  try {
    return response.status(200).json(await getWeather(location));
  } catch {
    return response.status(502).json({ error: "Weather is temporarily unavailable" });
  }
}
