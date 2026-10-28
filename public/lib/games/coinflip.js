export const meta = { id: 'coinflip', title: 'Coinflip', category: 'instant', min: 1, max: 10000 };

export function start(stake, { choice = 'heads' } = {}, rng) {
  const flip = rng() < 0.5 ? 'heads' : 'tails';
  const win  = flip === choice;
  const payout = win ? Math.floor(stake * 1.98) : 0;
  return {
    settled: true,
    payout,
    view: { choice, flip, win },
    message: win ? `Flipped ${flip} — won!` : `Flipped ${flip} — lost.`,
  };
}
