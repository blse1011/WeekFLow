// netlify/functions/odds.js
// Proxy für The Odds API – hält den API-Key serverseitig versteckt

exports.handler = async (event, context) => {
  const API_KEY = process.env.ODDS_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ODDS_API_KEY is not set in environment variables.' }),
    };
  }

  // Sport kann via Query-Parameter übergeben werden, Standard: soccer_epl
  const sport = event.queryStringParameters?.sport || 'soccer_epl';
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Odds API error: ${response.status}`, detail: errorText }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache für 5 Minuten um API-Quota zu schonen
        'Cache-Control': 'public, max-age=300',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Fetch failed', message: err.message }),
    };
  }
};
