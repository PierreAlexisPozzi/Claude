// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « index ») ; typage strict progressif à venir.
/* eslint-disable */

// Ordre d'évaluation de game.html : chaque section s'initialise dans l'ordre du fichier d'origine.
import { initPhoto } from './photo';
import * as m0 from './core';
import * as m1 from './render';
import * as m2 from './world-data';
import * as m3 from './terrain';
import * as m4 from './pistes';
import * as m5 from './materials';
import * as m6 from './tunnels';
import * as m7 from './vegetation';
import * as m8 from './buildings';
import * as m9 from './cannons';
import * as m10 from './lifts';
import * as m11 from './npcs';
import * as m12 from './vehicles';
import * as m13 from './assembly';
import * as m14 from './fauna';
import * as m15 from './trails';
import * as m16 from './park';
import * as m17 from './furniture';
import * as m18 from './humans';
import * as m19 from './particles';
import * as m20 from './player';
import * as m21 from './animation';
import * as m22 from './camera';
import * as m23 from './audio';
import * as m24 from './maps';
import * as m25 from './progression';
import * as m26 from './chronos';
import * as m27 from './people';
import * as m28 from './missions';
import * as m29 from './journal';
import * as m30 from './hud';
import * as m31 from './input';
import * as m32 from './touch';
import * as m33 from './loop';
import * as m34 from './boot';

export function runGame(): void {
  m0.__init_525();
  m1.__init_553();
  m2.__init_574();
  m0.__init_643();
  m3.__init_670();
  m4.__init_740();
  m3.__init_952();
  m1.__init_1211();
  m5.__init_1374();
  m3.__init_1747();
  m6.__init_1796();
  m7.__init_2016();
  m8.__init_2113();
  m9.__init_2681();
  m10.__init_2755();
  m11.__init_2901();
  m12.__init_3276();
  m13.__init_3396();
  m14.__init_4131();
  m15.__init_4397();
  m16.__init_4553();
  m17.__init_4622();
  m18.__init_4659();
  m19.__init_5087();
  m20.__init_5131();
  m21.__init_5693();
  m22.__init_5896();
  m23.__init_5990();
  m24.__init_6080();
  m25.__init_6203();
  m26.__init_6379();
  m27.__init_6559();
  m28.__init_6698();
  m29.__init_6914();
  m30.__init_6975();
  m31.__init_7168();
  m32.__init_7213();
  m33.__init_7311();
  m34.__init_7403();
  initPhoto();   // T7 : mode photo (après le HUD et les commandes)
}
