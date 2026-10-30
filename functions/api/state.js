import { load, save, lbGet, out } from '../_lib.js';

export async function onRequestGet(c) {
  const { sid, p, fresh } = await load(c);
  return out({ p, lb: await lbGet(c) }, sid, fresh);
}

export async function onRequestPost(c) {
  const { sid, p, fresh } = await load(c);
  const { action } = await c.request.json().catch(() => ({}));
  if (action === 'reset') p.bal = 1000; // peak (best run) is kept
  else if (action === 'daily') {
    if (Date.now() - p.bonus < 864e5) return out({ error: 'Daily bonus not ready yet', p }, sid, fresh, 400);
    p.bal += 250; p.bonus = Date.now();
  }
  await save(c, sid, p);
  return out({ p, lb: await lbGet(c) }, sid, fresh);
}
