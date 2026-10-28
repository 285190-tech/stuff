export default {
  async mount(el, api) {
    el.innerHTML = `
      <h1>Blackjack</h1>
      <div id="msg" class="result"></div>
      <div class="hands">
        <div><div class="hand-label">Dealer</div><div class="cards" id="dealer"></div></div>
        <div><div class="hand-label">You</div><div class="cards" id="player"></div></div>
      </div>
      <div class="row">
        <label>Stake <input type="number" id="stake" value="10" min="1" /></label>
        <button class="primary" id="deal">Deal</button>
        <button id="hit" disabled>Hit</button>
        <button id="stand" disabled>Stand</button>
        <button id="double" disabled>Double</button>
      </div>
    `;
    const $ = s => el.querySelector(s);

    function paint(r) {
      if (!r.view) return;
      $('#dealer').innerHTML = r.view.dealer.map(c => c.hidden
        ? `<div class="card hidden">?</div>`
        : `<div class="card">${c.rank}${c.suit}</div>`).join('');
      $('#player').innerHTML = r.view.player.map(c =>
        `<div class="card">${c.rank}${c.suit}</div>`).join('');
      $('#msg').textContent = r.message;
      const playing = !r.settled;
      $('#deal').disabled  = playing;
      $('#hit').disabled   = !playing;
      $('#stand').disabled = !playing;
      $('#double').disabled = !playing || r.view.player.length !== 2;
    }

    async function send(action) {
      const stake = Math.floor(Number($('#stake').value));
      if (action === 'start' && (!Number.isInteger(stake) || stake < 1)) return ($('#msg').textContent = 'Bad stake.');
      const r = await api.bet({ game: 'blackjack', stake, action });
      if (r.error) return ($('#msg').textContent = r.error);
      paint(r);
    }

    // Resume in-progress hand
    const resumed = await fetch('/api/state/blackjack').then(r => r.json()).catch(() => ({}));
    if (resumed.view) paint({ view: resumed.view, settled: false, message: 'Resumed hand.' });

    $('#deal').onclick  = () => send('start');
    $('#hit').onclick   = () => send('hit');
    $('#stand').onclick = () => send('stand');
    $('#double').onclick = () => send('double');
  },
};
