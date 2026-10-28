import * as coinflip  from './games/coinflip.js';
import * as dice      from './games/dice.js';
import * as blackjack from './games/blackjack.js';
import * as limbo     from './games/limbo.js';
import * as keno      from './games/keno.js';
import * as wheel     from './games/wheel.js';
import * as hilo      from './games/hilo.js';
import * as plinko    from './games/plinko.js';
import * as baccarat  from './games/baccarat.js';
import * as roulette  from './games/roulette.js';
import * as crash     from './games/crash.js';
import * as mines     from './games/mines.js';

export const games = {
  coinflip, dice, blackjack,
  limbo, keno, wheel, hilo, plinko,
  baccarat, roulette, crash, mines,
};
export const list = Object.values(games).map(m => m.meta);
