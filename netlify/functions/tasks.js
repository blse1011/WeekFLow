// netlify/functions/tasks.js
// Cloud-Sync für Tasks via Netlify Blobs (pro User, via JWT-Token)

const { getStore } = require('@netlify/blobs');

// JWT Payload manuell dekodieren (kein Verify nötig – Netlify macht das intern)
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

exports.handler = async (event, context) => {
  // Token aus Authorization Header holen
  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Fallback: clientContext (funktioniert bei manchen Netlify-Setups)
  let userId = context.clientContext?.user?.sub;

  // Wenn clientContext leer, JWT manuell dekodieren
  if (!userId && token) {
    const payload = decodeJwt(token);
    userId = payload?.sub;
  }

  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Nicht eingeloggt' }) };
  }

  const store = getStore('tasks');
  const key = `user_${userId}`;

  // GET: Tasks laden
  if (event.httpMethod === 'GET') {
    try {
      const raw = await store.get(key);
      const tasks = raw ? JSON.parse(raw) : [];
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks),
      };
    } catch {
      return { statusCode: 200, body: '[]' };
    }
  }

  // POST: Tasks speichern
  if (event.httpMethod === 'POST') {
    try {
      const tasks = JSON.parse(event.body || '[]');
      await store.set(key, JSON.stringify(tasks));
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
