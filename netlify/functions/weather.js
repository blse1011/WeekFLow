// netlify/functions/weather.js
// Proxy für WeatherAPI.com – API-Key bleibt serverseitig versteckt

exports.handler = async (event) => {
  const API_KEY = process.env.WEATHER_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'WEATHER_API_KEY ist nicht gesetzt.' }),
    };
  }

  const city = event.queryStringParameters?.city;
  if (!city) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Parameter "city" fehlt.' }) };
  }

  // 7-Tage Forecast + aktuelles Wetter in einem Request
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(city)}&days=7&lang=de`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Stadt nicht gefunden' }) };
    }
    const data = await response.json();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900', // 15 Minuten cachen
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
