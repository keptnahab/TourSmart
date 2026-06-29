// Server-Sent Events hub: real-time push for chat + presence. No external deps.
// Each client is an open HTTP response we write `event:`/`data:` frames to.

const clients = new Set(); // { res, userId, displayName }

export function addClient(res, user) {
  const client = { res, userId: user.id, displayName: user.display_name };
  clients.add(client);
  // Tell everyone the roster changed (someone came online).
  broadcastPresence();
  return client;
}

export function removeClient(client) {
  if (clients.delete(client)) {
    broadcastPresence();
  }
}

function writeEvent(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

// Push to every connected client.
export function broadcast(event, data) {
  for (const c of clients) {
    if (!writeEvent(c.res, event, data)) {
      clients.delete(c);
    }
  }
}

export function onlineUserIds() {
  const ids = new Set();
  for (const c of clients) ids.add(c.userId);
  return [...ids];
}

export function broadcastPresence() {
  broadcast('presence', { online: onlineUserIds() });
}

// Keep-alive comment ping so proxies/browsers don't drop idle SSE connections.
setInterval(() => {
  for (const c of clients) {
    try {
      c.res.write(': ping\n\n');
    } catch {
      clients.delete(c);
    }
  }
}, 25000).unref();
