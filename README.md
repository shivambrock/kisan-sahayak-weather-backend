# Kisan Sahayak Weather Backend

Vercel serverless proxy for the Android app. `WEATHER_API_KEY` remains server-side.
If the key is absent, expired, or the primary provider is unavailable, the endpoint
falls back to Open-Meteo.

## Local

1. Copy `.env.example` to `.env.local` and add the key locally.
2. Run `npm install`.
3. Run `npm run dev` (no Vercel login required).
4. Open `http://localhost:3000/api/weather?location=New%20Delhi`.

Use `npm run local` only when testing the Vercel CLI runtime itself.

Never commit `.env.local` or paste the key into Android source code.
