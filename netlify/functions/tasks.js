// netlify/functions/tasks.js
// Korrekte Implementierung nach offizieller Netlify Blobs Doku

import { getStore } from "@netlify/blobs";

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(decoded);
  } catch { return null; }
}

export default async (req, context) => {
  // User-ID aus JWT holen
  let userId = context.clientContext?.user?.sub;
  if (!userId) {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) userId = decodeJwt(token)?.sub;
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Nicht eingeloggt' }), { status: 401 });
  }

  const store = getStore("weekflow-tasks");
  const key = `tasks-${userId}`;

  // GET: Tasks laden
  if (req.method === 'GET') {
    try {
      const data = await store.get(key, { type: 'json' });
      return new Response(JSON.stringify(data || []), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    }
  }

  // POST: Tasks speichern
  if (req.method === 'POST') {
    try {
      const tasks = await req.json();
      await store.setJSON(key, tasks);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: "/.netlify/functions/tasks"
};
