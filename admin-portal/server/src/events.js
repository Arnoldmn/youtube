// Server-Sent Events hub: pushes notifications and "something changed" pings to
// every browser tab a user has open, so boards update and alerts pop up live.
const clients = new Map(); // userId -> Set<res>

export function subscribe(req, res) {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  const uid = req.user.id;
  if (!clients.has(uid)) clients.set(uid, new Set());
  clients.get(uid).add(res);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000);
  req.on("close", () => {
    clearInterval(ping);
    const set = clients.get(uid);
    set?.delete(res);
    if (set && !set.size) clients.delete(uid);
  });
}

function write(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function sendTo(userId, event, data) {
  for (const res of clients.get(userId) || []) write(res, event, data);
}

export function sendToMany(userIds, event, data) {
  for (const id of new Set(userIds)) sendTo(id, event, data);
}

export function connectedCount() {
  let n = 0;
  for (const s of clients.values()) n += s.size;
  return n;
}
