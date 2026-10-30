// Shared helpers: cookie identity + KV storage. Play money only.
export async function load(c) {
  const ck = c.request.headers.get('cookie') || '';
  let sid = (ck.match(/sid=([\w-]{36})/) || [])[1];
  const fresh = !sid;
  if (!sid) sid = crypto.randomUUID();
  const p = (await c.env.KV.get('p:' + sid, 'json')) ||
    { bal: 1000, peak: 1000, bonus: 0, name: 'Player-' + sid.slice(0, 4) };
  return { sid, p, fresh };
}

export async function save(c, sid, p) {
  const old = p.peak;
  p.peak = Math.max(p.peak, p.bal);
  await c.env.KV.put('p:' + sid, JSON.stringify(p));
  if (p.peak > old) { // only touch the leaderboard when a new peak is set
    const id = sid.slice(0, 8);
    let lb = (await c.env.KV.get('lb', 'json')) || [];
    lb = lb.filter(x => x.id !== id);
    lb.push({ id, name: p.name, peak: p.peak });
    lb.sort((a, b) => b.peak - a.peak);
    await c.env.KV.put('lb', JSON.stringify(lb.slice(0, 20)));
  }
}

export const lbGet = c => c.env.KV.get('lb', 'json').then(x => x || []);

export function out(data, sid, fresh, status = 200) {
  const h = new Headers({ 'content-type': 'application/json' });
  if (fresh) h.append('set-cookie', `sid=${sid}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
  return new Response(JSON.stringify(data), { status, headers: h });
}
