// netlify/functions/tasks.js
// Cloud-Sync für Tasks via Netlify Blobs (pro User, via JWT-Token)

const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  // User aus Netlify Identity JWT auslesen
  const user = context.clientContext?.user;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Nicht eingeloggt' }) };
  }

  const userId = user.sub; // eindeutige User-ID aus dem JWT
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
