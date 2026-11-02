// The server is the referee: every outcome is decided here with crypto RNG.
import { load, save, out } from '../_lib.js';

const r = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const ri = n => Math.floor(r() * n);
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || a));
const REDS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const PLINKO = [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6];
const WHEEL = [0, 1.5, 0, 2, 0, 1.5, 0, 3, 0, 1.9];

const GAMES = {
  coinflip(p) {
    const o = ri(2) ? 'heads' : 'tails';
    return { o: `Landed ${o}`, m: p.pick === o ? 1.98 : 0, v: { o } };
  },
  dice(p) {
    const t = clamp(p.target, 2, 95), roll = +(r() * 100).toFixed(2);
    const over = p.side === 'over';
    const win = over ? roll > 100 - t : roll < t;
    return { o: `Rolled ${roll} (${over ? 'over ' + (100 - t) : 'under ' + t})`, m: win ? +(99 / t).toFixed(4) : 0, v: { roll, t, over } };
  },
  limbo(p) {
    const t = clamp(p.target, 1.01, 1000), crash = Math.floor(99 / (1 - r())) / 100;
    return { o: `Hit ${crash.toFixed(2)}×`, m: crash >= t ? t : 0, v: { crash, t } };
  },
  plinko() {
    let k = 0, path = '';
    for (let i = 0; i < 8; i++) { const b = ri(2); k += b; path += b ? 'R' : 'L'; }
    return { o: `Path ${path} → slot ${k + 1}`, m: PLINKO[k], v: { path, k } };
  },
  roulette(p) {
    const n = ri(37), red = REDS.includes(n);
    const num = p.num !== '' && p.num != null ? Math.floor(+p.num) : null;
    let win, m;
    if (num !== null) { if (!(num >= 0 && num <= 36)) throw 'Number must be 0–36'; win = n === num; m = 36; }
    else {
      m = 2;
      win = n > 0 && ({ red, black: !red, odd: n % 2 === 1, even: n % 2 === 0, low: n <= 18, high: n >= 19 })[p.pick];
    }
    return { o: `Ball landed on ${n} ${n === 0 ? 'green' : red ? 'red' : 'black'}`, m: win ? m : 0, v: { n, red } };
  },
  wheel() {
    const i = ri(WHEEL.length);
    return { o: `Wheel stopped on segment ${i + 1}`, m: WHEEL[i], v: { i } };
  },
  keno(p) {
    const pk = [...new Set((p.picks || []).map(Number))].filter(n => n >= 1 && n <= 40);
    if (pk.length < 1 || pk.length > 5) throw 'Pick 1–5 numbers';
    const pool = [...Array(40)].map((_, i) => i + 1), draw = [];
    while (draw.length < 10) draw.push(pool.splice(ri(pool.length), 1)[0]);
    const hits = pk.filter(n => draw.includes(n)).length;
    let prob = 1; for (let i = 0; i < pk.length; i++) prob *= (10 - i) / (40 - i);
    return { o: `Drew ${draw.sort((a, b) => a - b).join(', ')} — ${hits}/${pk.length} hit`, m: hits === pk.length ? +(0.97 / prob).toFixed(2) : 0, v: { draw, pk } };
  },
  baccarat(p) {
    const val = n => (n >= 10 ? 0 : n), card = () => ri(13) + 1;
    const tot = h => h.reduce((a, x) => a + val(x), 0) % 10;
    const P = [card(), card()], B = [card(), card()];
    let pt = tot(P), bt = tot(B);
    if (pt < 8 && bt < 8) {
      let p3 = null;
      if (pt <= 5) { p3 = card(); P.push(p3); }
      const v3 = p3 === null ? -1 : val(p3);
      const draw = p3 === null ? bt <= 5
        : bt <= 2 || (bt === 3 && v3 !== 8) || (bt === 4 && v3 >= 2 && v3 <= 7) || (bt === 5 && v3 >= 4 && v3 <= 7) || (bt === 6 && (v3 === 6 || v3 === 7));
      if (draw) B.push(card());
      pt = tot(P); bt = tot(B);
    }
    const w = pt > bt ? 'player' : bt > pt ? 'banker' : 'tie';
    const m = p.pick === 'tie' ? (w === 'tie' ? 9 : 0) : w === 'tie' ? 1 : p.pick === w ? (w === 'banker' ? 1.95 : 2) : 0;
    return { o: `Player ${pt} vs Banker ${bt} — ${w}${w === 'tie' && p.pick !== 'tie' ? ' (push)' : ''}`, m, v: { P, B } };
  },
  hilo(p) {
    const a = ri(13) + 1, b = ri(13) + 1;
    const win = p.pick === 'hi' ? b > a : b < a; // ties lose
    return { o: `Card ${a} → ${b}`, m: win ? 2.1 : 0, v: { a, b } };
  },
};

export async function onRequestPost(c) {
  const { sid, p, fresh } = await load(c);
  const q = await c.request.json().catch(() => ({}));
  const bet = Math.floor(+q.bet), game = GAMES[q.game];
  if (!game) return out({ error: 'Unknown game' }, sid, fresh, 400);
  if (!(bet >= 1) || bet > p.bal) return out({ error: 'Invalid bet' }, sid, fresh, 400);
  let x;
  try { x = game(q.params || {}); } catch (e) { return out({ error: String(e) }, sid, fresh, 400); }
  const pay = Math.floor(bet * x.m);
  p.bal += pay - bet;
  await save(c, sid, p);
  return out({ o: x.o, m: x.m, pay, win: pay > bet, v: x.v, p }, sid, fresh);
}
