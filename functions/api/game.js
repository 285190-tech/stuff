// Stateful games (Crash, Mines, Blackjack). Secrets live in p.s on the server only.
import { load, save, out } from '../_lib.js';

const r = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const ri = n => Math.floor(r() * n);
const stake = (p, q) => {
  const b = Math.floor(+q.bet);
  if (!(b >= 1) || b > p.bal) throw 'Invalid bet';
  p.bal -= b; // starting a new game forfeits any unfinished one
  return b;
};
const need = (p, g) => { if (!p.s || p.s.g !== g) throw 'No active game'; return p.s; };

// ---- Crash: multiplier grows with time; server knows when it crashes
const cm = t => Math.floor(100 * Math.exp(0.15 * t / 1000)) / 100;

// ---- Mines: 5x5 board
const mm = (k, n) => { let x = 0.99; for (let i = 0; i < k; i++) x *= (25 - i) / (25 - n - i); return Math.floor(x * 100) / 100; };

// ---- Blackjack: 3:2 blackjack, dealer stands on all 17s
const hv = h => {
  let t = 0, a = 0;
  for (const c of h) { const x = c % 13 + 1; t += x > 10 ? 10 : x; if (x === 1) a++; }
  for (; a > 0 && t + 10 <= 21; a--) t += 10;
  return t;
};
const view = (s, done, ex = {}) => ({ bet: s.bet, ph: s.ph, dh: done ? s.dh : [s.dh[0]], pt: hv(s.ph), dt: done ? hv(s.dh) : null, done, ...ex });
const fin = (p, s, pay, res) => { p.bal += pay; p.s = null; return view(s, true, { pay, res }); };
const stand = (p, s) => {
  while (hv(s.dh) < 17) s.dh.push(s.dk.pop());
  const pt = hv(s.ph), dt = hv(s.dh);
  if (dt > 21 || pt > dt) return fin(p, s, s.bet * 2, 'win');
  return pt === dt ? fin(p, s, s.bet, 'push') : fin(p, s, 0, 'lose');
};

const ACT = {
  'crash.start': (p, q) => {
    const bet = stake(p, q);
    p.s = { g: 'crash', bet, pt: Math.max(1, Math.floor(99 / (1 - r())) / 100), t0: Date.now() };
    return { ok: 1 };
  },
  'crash.poll': p => { // read-only: no KV write unless the round ended
    const s = need(p, 'crash'), m = cm(Date.now() - s.t0);
    if (m >= s.pt) { p.s = null; return { crashed: 1, point: s.pt }; }
    return { m, _ns: 1 };
  },
  'crash.cash': p => {
    const s = need(p, 'crash'), m = cm(Date.now() - s.t0);
    p.s = null;
    if (m >= s.pt) return { crashed: 1, point: s.pt };
    const pay = Math.floor(s.bet * m); p.bal += pay;
    return { won: 1, m, pay };
  },

  'mines.start': (p, q) => {
    const n = Math.min(24, Math.max(1, Math.floor(+q.n) || 3)), bet = stake(p, q);
    const pool = [...Array(25).keys()], mines = [];
    for (let i = 0; i < n; i++) mines.push(pool.splice(ri(pool.length), 1)[0]);
    p.s = { g: 'mines', bet, n, mines, open: [] };
    return { ok: 1 };
  },
  'mines.pick': (p, q) => {
    const s = need(p, 'mines'), i = Math.floor(+q.i);
    if (!(i >= 0 && i < 25) || s.open.includes(i)) throw 'Bad tile';
    if (s.mines.includes(i)) { p.s = null; return { boom: 1, mines: s.mines }; }
    s.open.push(i);
    const m = mm(s.open.length, s.n);
    if (s.open.length === 25 - s.n) { const pay = Math.floor(s.bet * m); p.bal += pay; p.s = null; return { won: 1, m, pay, mines: s.mines }; }
    return { safe: 1, m };
  },
  'mines.cash': p => {
    const s = need(p, 'mines');
    if (!s.open.length) throw 'Open a tile first';
    const m = mm(s.open.length, s.n), pay = Math.floor(s.bet * m);
    p.bal += pay; p.s = null;
    return { won: 1, m, pay, mines: s.mines };
  },

  'blackjack.deal': (p, q) => {
    const bet = stake(p, q), dk = [...Array(52).keys()];
    for (let i = 51; i > 0; i--) { const j = ri(i + 1); [dk[i], dk[j]] = [dk[j], dk[i]]; }
    const s = { g: 'bj', bet, dk, ph: [dk.pop(), dk.pop()], dh: [dk.pop(), dk.pop()] };
    if (hv(s.ph) === 21) return hv(s.dh) === 21 ? fin(p, s, bet, 'push') : fin(p, s, Math.floor(bet * 2.5), 'blackjack');
    p.s = s;
    return view(s, false);
  },
  'blackjack.hit': p => {
    const s = need(p, 'bj');
    s.ph.push(s.dk.pop());
    const t = hv(s.ph);
    if (t > 21) return fin(p, s, 0, 'bust');
    return t === 21 ? stand(p, s) : view(s, false);
  },
  'blackjack.stand': p => stand(p, need(p, 'bj')),
};

export async function onRequestPost(c) {
  const { sid, p, fresh } = await load(c);
  const q = await c.request.json().catch(() => ({}));
  const f = ACT[q.game + '.' + q.act];
  if (!f) return out({ error: 'Bad action' }, sid, fresh, 400);
  let d;
  try { d = f(p, q); } catch (e) { return out({ error: String(e) }, sid, fresh, 400); }
  const ns = d._ns; delete d._ns;
  if (!ns) await save(c, sid, p);
  return out({ ...d, p }, sid, fresh);
}
