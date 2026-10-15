# Kisan Sahayak Data Backend

Vercel serverless proxy for the Android app. `WEATHER_API_KEY` and `MANDI_API_KEY`
remain server-side and are never embedded in the Android bundle.

## Endpoints

- `/api/weather?location=New%20Delhi` returns current weather and forecast data.
- `/api/mandi?state=Uttar%20Pradesh&district=Agra&limit=100` returns normalized,
  current-first AGMARKNET records from Data.gov.in.

The weather endpoint falls back to Open-Meteo when the primary weather provider is
unavailable. The mandi endpoint prefers the current AGMARKNET resource and retains
the legacy resource only as a fallback.

## Local

1. Copy `.env.example` to `.env.local` and add the keys locally.
2. Run `npm install`.
3. Run `npm run dev` (no Vercel login required).
4. Open one of the endpoint URLs above on `http://localhost:3000`.

Use `npm run local` only when testing the Vercel CLI runtime itself.

Never commit `.env.local` or paste API keys into Android source code.
