// netlify/functions/tasks.js
// Cloud-Sync via Netlify Blobs (eingebaut, keine npm dependency nötig)

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(decoded);
  } catch { return null; }
}

exports.handler = async (event, context) => {
  // User-ID aus JWT holen
  let userId = context.clientContext?.user?.sub;
  if (!userId) {
    const auth = event.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) userId = decodeJwt(token)?.sub;
  }

  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Nicht eingeloggt' }) };
  }

  // Netlify Blobs aus der eingebauten Runtime laden (kein npm install nötig)
  let getStore;
  try {
    ({ getStore } = require('@netlify/blobs'));
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: '@netlify/blobs nicht verfügbar' }) };
  }

  const store = getStore('weekflow-tasks');
  const key = `tasks-${userId}`;

  // GET: Tasks laden
  if (event.httpMethod === 'GET') {
    try {
      const data = await store.get(key, { type: 'json' });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || []),
      };
    } catch {
      return { statusCode: 200, body: '[]' };
    }
  }

  // POST: Tasks speichern
  if (event.httpMethod === 'POST') {
    try {
      const tasks = JSON.parse(event.body || '[]');
      await store.setJSON(key, tasks);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
