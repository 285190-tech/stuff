import { list as metas } from '/lib/registry.js';
import coinflip  from '/games/coinflip.js';
import dice      from '/games/dice.js';
import blackjack from '/games/blackjack.js';
import limbo     from '/games/limbo.js';
import keno      from '/games/keno.js';
import wheel     from '/games/wheel.js';
import hilo      from '/games/hilo.js';
import plinko    from '/games/plinko.js';
import baccarat  from '/games/baccarat.js';
import roulette  from '/games/roulette.js';
import crash     from '/games/crash.js';
import mines     from '/games/mines.js';

const registry = {
  coinflip, dice, blackjack,
  limbo, keno, wheel, hilo, plinko,
  baccarat, roulette, crash, mines,
};
const app = document.getElementById('app');
const balanceEl = document.getElementById('balance');
let balance = 0;

async function refresh() {
  const r = await fetch('/api/wallet');
  if (!r.ok) return;
  const d = await r.json();
  balance = d.balance;
  balanceEl.textContent = balance.toLocaleString() + ' SC';
}

async function bet(payload) {
  const r = await fetch('/api/bet', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const d = await r.json();
  if (d.balance !== undefined) {
    balance = d.balance;
    balanceEl.textContent = balance.toLocaleString() + ' SC';
  }
  return d;
}

function renderLobby() {
  const cats = [...new Set(metas.map(m => m.category))];
  app.innerHTML = `
    <h1>Lobby</h1>
    <p class="muted">Pick a game. Stakes are sandbox credits.</p>
    ${cats.map(cat => `
      <h2 style="margin-top:24px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">${cat}</h2>
      <div class="grid">
        ${metas.filter(m => m.category === cat).map(m => `
          <a class="tile" href="#/g/${m.id}">
            <div class="title">${m.title}</div>
            <div class="cat">${m.min}–${m.max} SC</div>
          </a>`).join('')}
      </div>
    `).join('')}
  `;
}

async function renderGame(id) {
  const client = registry[id];
  if (!client) { app.innerHTML = `<p class="muted">Unknown game.</p>`; return; }
  app.innerHTML = `<div class="shell" id="shell"></div>`;
  await client.default.mount(document.getElementById('shell'), { bet, refresh, balance: () => balance });
}

function route() {
  const m = (location.hash || '#/').match(/^#\/g\/(\w+)/);
  m ? renderGame(m[1]) : renderLobby();
}

window.addEventListener('hashchange', route);
refresh().then(route);
