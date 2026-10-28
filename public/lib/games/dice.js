export default {
  async mount(el, api) {
    el.innerHTML = `
      <h1>Dice</h1>
      <p class="muted">Roll over or under a target. 1–100.</p>
      <div class="row">
        <label>Stake <input type="number" id="stake" value="10" min="1" /></label>
        <label>Target <input type="number" id="target" value="50" min="2" max="98" /></label>
        <select id="dir"><option value="over">Over</option><option value="under">Under</option></select>
        <button class="primary" id="play">Roll</button>
      </div>
      <div class="result" id="msg"></div>
      <div class="roll-display" id="roll">–</div>
    `;
    const $ = s => el.querySelector(s);
    $('#play').onclick = async () => {
      const stake = Math.floor(Number($('#stake').value));
      if (!Number.isInteger(stake) || stake < 1) return ($('#msg').textContent = 'Bad stake.');
      if (stake > api.balance()) return ($('#msg').textContent = 'Not enough credits.');
      const r = await api.bet({
        game: 'dice', stake,
        data: { target: Number($('#target').value), direction: $('#dir').value },
      });
      if (r.error) return ($('#msg').textContent = r.error);
      $('#roll').textContent = r.view.roll;
      $('#msg').textContent = r.message;
      $('#msg').className = 'result ' + (r.view.win ? 'win' : 'loss');
    };
  },
};
