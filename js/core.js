"use strict";
/* =========================================================
   core.js — world state, level loading, tile collision.
   G is the single world/game state object; P is the player.
   Collision is swept per-axis against the tile grid, with
   one-way platform support on the Y pass.
   ========================================================= */

/* per-biome enemy color palettes — reused across scorp/bandit/wolf/elite/
   thrower so each new scenario's foes read as a distinct faction at a glance. */
const PAL = {
  desert:    { body:'#a24a2e', body2:'#843a22', robe:'#7a5a3a', robeDark:'#3a2c1c', turban:'#a83232', turbanDark:'#8a2626', mask:'#2a2a2a' },
  forest:    { body:'#3f7d3a', body2:'#2c5c29', robe:'#3a5c2e', robeDark:'#203a1c', turban:'#2f6b3a', turbanDark:'#1f4a28', mask:'#22321c' },
  mountain:  { body:'#7a828c', body2:'#5c636b', robe:'#5a6570', robeDark:'#333a40', turban:'#48566a', turbanDark:'#2f3a48', mask:'#2c3238' },
  babylon:   { body:'#2aa79f', body2:'#1c7f79', robe:'#b8912a', robeDark:'#8a6a12', turban:'#d4af37', turbanDark:'#8a6a12', mask:'#2a2410' },
  oasis:     { body:'#4a9a6a', body2:'#357a4e', robe:'#c9a15a', robeDark:'#8a6a2e', turban:'#2f8a7a', turbanDark:'#1f5a4e', mask:'#20301c' },
  sandyCaves:{ body:'#9a8064', body2:'#7a6248', robe:'#6a5a48', robeDark:'#3a2f24', turban:'#8a6a4a', turbanDark:'#5a4530', mask:'#2a221a' },
  egypt:     { body:'#4a8a3a', body2:'#356a2a', robe:'#c9a24a', robeDark:'#8a6a1e', turban:'#2f8a7a', turbanDark:'#1f5a4e', mask:'#20301c' },
  /* Levant biomes — Damascus dusk stone, deep cedar green, icy peaks */
  damascus:  { body:'#7a4a6a', body2:'#5c3652', robe:'#8a5a7a', robeDark:'#4a2c40', turban:'#a04a5a', turbanDark:'#743040', mask:'#2a1c26' },
  cedar:     { body:'#3a6a4e', body2:'#28503a', robe:'#3a5c40', robeDark:'#1e3626', turban:'#2a6a50', turbanDark:'#1a4634', mask:'#182a1e' },
  snow:      { body:'#8fa4bd', body2:'#6e8098', robe:'#7a8aa2', robeDark:'#48566a', turban:'#5a7a9a', turbanDark:'#3c5470', mask:'#26303c' }
};
/* ground-enemy types sharing the same patrol/vision/damage plumbing —
   check membership here rather than repeating `e.t==='x'||e.t==='y'`
   conditions across enemies.js/player.js/boss.js */
const GROUND_ENEMY_TYPES = new Set(['scorp', 'bandit', 'wolf', 'elite', 'thrower', 'mummy', 'snake', 'shieldman', 'leopard']);
/* every enemy the player's sword/fireballs can hit — the ground roster plus
   the flying falcon (which has its own non-gravity movement branch) */
function enemyHittable(t){ return GROUND_ENEMY_TYPES.has(t) || t === 'falcon'; }
function enemyPoints(t){
  return t === 'scorp' ? 200 : t === 'wolf' ? 250 : t === 'snake' ? 260 : t === 'falcon' ? 280 :
         t === 'leopard' ? 320 : t === 'thrower' ? 350 : t === 'shieldman' ? 400 :
         t === 'mummy' ? 450 : t === 'elite' ? 800 : 300; // bandit/default
}
/* a level's exit door stays locked while ANY elite guard is still alive —
   checks the whole roster (not just G.elite) so multi-elite levels like
   the Inner Courtyard require every guard down; identical behaviour to the
   old single-elite check when a level has just one E. */
function anyEliteAlive(){ return G.ents.some(e => e.t === 'elite' && !e.dead && e.hp > 0); }

const G = {
  state:'menu', lvl:0, grid:[], W:0, H:0,
  coins:0, score:0, dispScore:0, lives:3, time:0,
  shake:0, hitstop:0, deathT:0, winT:0, fade:0,
  checkpoint:{x:100,y:100},
  ents:[], fireballs:[], knives:[], parts:[], motes:[],
  boss:null, princess:null, elite:null, eliteWarnT:0, cine:0, banner:0,
  cpDone:new Set(), won:false, dt:0.016
};
const P = {
  x:0, y:0, w:32, h:58, vx:0, vy:0, onG:false, wasG:false, face:1,
  jumps:0, coyote:0, jbuf:0, cut:false, squash:0, stretch:0,
  hp:3, maxHp:3, inv:0, fire:5, cool:0, anim:0, state:'idle',
  dead:false, climb:false, winWalk:false, atkT:0, stepT:0, dropDown:false,
  swordT:0, swordCool:0, rollT:0, rollCool:0, rollDir:1, bombs:1, punchT:0
};

function tileAt(c, r){ if (r < 0 || c < 0 || r >= G.H || c >= G.W) return '#'; return G.grid[r][c]; }
function solid(ch){ return ch === '#' || ch === 'X'; }
function aabb(a, b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

/* scan downward from (x, y) to find the ground surface — used for soft shadows */
function findGroundY(x, y, maxTiles = 6){
  const c = Math.floor(x / TILE);
  let r = Math.floor(y / TILE);
  for (let i = 0; i <= maxTiles; i++, r++){
    const ch = tileAt(c, r);
    if (solid(ch) || ch === '=') return r * TILE;
  }
  return -1;
}

function loadLevel(i){
  G.lvl = i; const L = LEVELS[i];
  const pal = PAL[L.biome] || PAL.desert;
  const w = Math.max(...L.rows.map(r => r.length));
  G.grid = L.rows.map(r => r.padEnd(w, ' ').split(''));
  G.H = G.grid.length; G.W = w;
  G.ents = []; G.fireballs = []; G.knives = []; G.parts = []; G.motes = [];
  G.boss = null; G.princess = null; G.elite = null; G.eliteWarnT = 0; G.cine = 0; G.banner = 3.8;
  G.deathT = 0; G.winT = 0; G.fade = 0; G.hitstop = 0; G.shake = 0;
  G.adBombUsedThisLevel = false; G.nearBombWall = null;
  let spawned = false;
  /* NOTE: 'X' (destructible wall) is deliberately NOT parsed/cleared here —
     unlike every other special char it must stay a live, solid grid tile
     until a bomb clears it (see clearBombWall below). Do not "fix" this. */
  for (let r = 0; r < G.H; r++) for (let c = 0; c < G.W; c++){
    const ch = G.grid[r][c], x = c * TILE, y = r * TILE;
    if (ch === 'S'){ G.ents.push(mkScorp(x, y, pal));  G.grid[r][c] = ' '; }
    if (ch === 'B'){ G.ents.push(mkBandit(x, y, pal)); G.grid[r][c] = ' '; }
    if (ch === 'V'){ G.ents.push(mkWolf(x, y, pal));   G.grid[r][c] = ' '; }
    if (ch === 'Y'){ G.ents.push(mkThrower(x, y, pal)); G.grid[r][c] = ' '; }
    if (ch === 'U'){ G.ents.push(mkMummy(x, y, pal));  G.grid[r][c] = ' '; }
    if (ch === 'N'){ G.ents.push(mkSnake(x, y, pal));  G.grid[r][c] = ' '; }
    if (ch === 'A'){ G.ents.push(mkFalcon(x, y, pal)); G.grid[r][c] = ' '; }
    if (ch === 'Q'){ G.ents.push(mkShieldman(x, y, pal)); G.grid[r][c] = ' '; }
    if (ch === 'J'){ G.ents.push(mkLeopard(x, y, pal)); G.grid[r][c] = ' '; }
    if (ch === 'E'){ const el = mkElite(x, y, pal, L.eliteName); G.ents.push(el); G.elite = el; G.grid[r][c] = ' '; }
    if (ch === 'M'){ G.ents.push(mkMover(x, y));  G.grid[r][c] = ' '; }
    if (ch === 'F'){ G.ents.push(mkFaller(x, y)); G.grid[r][c] = ' '; }
    if (ch === 'G'){ G.boss = mkBoss(x, y, L.bossKind, L.bossName); G.grid[r][c] = ' '; }
    if (ch === 'R'){ G.princess = { x:x, y:y+6, anim:0, freed:false }; G.grid[r][c] = ' '; }
    if (ch === 'K' && !spawned){ G.checkpoint = { x:x+8, y:y-20 }; spawned = true; }
  }
  P.x = G.checkpoint.x; P.y = G.checkpoint.y; P.vx = 0; P.vy = 0;
  P.hp = P.maxHp; P.dead = false; P.winWalk = false; P.climb = false;
  P.jumps = 0; P.coyote = 0; P.jbuf = 0; P.inv = 0; P.squash = 0; P.stretch = 0;
  P.swordT = 0; P.swordCool = 0; P.rollT = 0; P.rollCool = 0;
  P.fire = Math.max(P.fire, 5); G.time = 0;
  camSnap();
  if (G.boss){ G.cine = 2.6; SFX.boss(); } // any boss fight (final or mid-roster) gets the intro cinematic
}

/* ---------------- entity factories ---------------- */
function mkScorp(x, y, pal){ return { t:'scorp', x, y:y+18, w:44, h:30, vx:-42, hp:1,
  anim:Math.random()*9, hurt:0, dead:0, pause:0, pal: pal || PAL.desert }; }
function mkBandit(x, y, pal){ return { t:'bandit', x, y:y-6, w:36, h:54, vx:-70, hp:2,
  anim:Math.random()*9, hurt:0, dead:0, lunge:0, windup:0, alert:0, pal: pal || PAL.desert }; }
function mkWolf(x, y, pal){ return { t:'wolf', x, y:y+26, w:46, h:22, vx:-95, hp:1,
  anim:Math.random()*9, hurt:0, dead:0, pal: pal || PAL.forest }; }
function mkElite(x, y, pal, name){ return { t:'elite', x, y:y-10, w:44, h:64, vx:-55, hp:6, maxHp:6,
  anim:Math.random()*9, hurt:0, dead:0, lunge:0, windup:0, alert:0, pal: pal || PAL.desert,
  name: name || { ar:STR.ar['elite.default'], en:STR.en['elite.default'] } }; }
function mkThrower(x, y, pal){ return { t:'thrower', x, y:y-6, w:36, h:54, vx:-60, hp:2,
  anim:Math.random()*9, hurt:0, dead:0, alert:0, throwWindup:0, cool:0, pal: pal || PAL.desert }; }
/* Egypt roster: a slow, tanky bandaged mummy (shrugs off stomps like the
   elite and slowly pursues) and a fast, low, ground-hugging desert snake */
function mkMummy(x, y, pal){ return { t:'mummy', x, y:y-6, w:38, h:56, vx:-38, hp:4, maxHp:4,
  anim:Math.random()*9, hurt:0, dead:0, pal: pal || PAL.egypt }; }
function mkSnake(x, y, pal){ return { t:'snake', x, y:y+30, w:46, h:18, vx:-118, hp:1,
  anim:Math.random()*9, hurt:0, dead:0, pal: pal || PAL.egypt }; }
/* Levant roster: a hovering falcon that dives at the player from above, a
   shield-bearing soldier who blocks every frontal hit (strike his back, or
   stomp him), and a snow leopard that pounces in a long telegraphed leap */
function mkFalcon(x, y, pal){ return { t:'falcon', x, y:y+6, w:44, h:28, vx:-90, hp:1,
  ox:x, oy:y+6, range:TILE*3.5, mode:'patrol', cool:0, dvx:0, dvy:0, ty:0,
  anim:Math.random()*9, hurt:0, dead:0, alert:0, pal: pal || PAL.snow }; }
function mkShieldman(x, y, pal){ return { t:'shieldman', x, y:y-6, w:38, h:54, vx:-50, hp:3,
  anim:Math.random()*9, hurt:0, dead:0, alert:0, blockT:0, pal: pal || PAL.damascus }; }
function mkLeopard(x, y, pal){ return { t:'leopard', x, y:y+22, w:52, h:26, vx:-105, hp:2,
  anim:Math.random()*9, hurt:0, dead:0, alert:0, pounceWind:0, pounceT:0, pounceCool:0,
  pal: pal || PAL.snow }; }
function mkMover(x, y){ return { t:'mover', x, y, w:TILE*2, h:16, ox:x, range:TILE*3, dir:1, spd:70 }; }
function mkFaller(x, y){ return { t:'faller', x, y, w:TILE, h:14, oy:y, ox:x, timer:-1, vy:0, respawn:0 }; }
function mkBoss(x, y, kind, name){ return { t:'boss', kind: kind || 'chief', name, x, y:y-58, w:86, h:116, vx:0, vy:0, hp:14, maxHp:14,
  face:-1, anim:0, phase:1, act:'idle', actT:1.5, windup:0, hurt:0, dead:0, onG:true,
  blades:[], barHp:14, dashT:0, dashCool:1.4 }; }

/* ---------------- collision ---------------- */
function collideX(o){
  const dir = Math.sign(o.vx); if (!dir) return;
  const x1 = Math.floor(o.x / TILE), x2 = Math.floor((o.x + o.w) / TILE);
  const y1 = Math.floor(o.y / TILE), y2 = Math.floor((o.y + o.h - 1) / TILE);
  for (let r = y1; r <= y2; r++){
    const c = dir > 0 ? x2 : x1;
    if (solid(tileAt(c, r))){
      if (dir > 0) o.x = c * TILE - o.w - 0.01; else o.x = (c + 1) * TILE + 0.01;
      o.vx = 0; o.hitWall = true; return;
    }
  }
}
function collideY(o, oneWay){
  o.onG = false; const dir = Math.sign(o.vy); if (!dir) return;
  const x1 = Math.floor((o.x + 2) / TILE), x2 = Math.floor((o.x + o.w - 2) / TILE);
  const r = dir > 0 ? Math.floor((o.y + o.h) / TILE) : Math.floor(o.y / TILE);
  for (let c = x1; c <= x2; c++){
    const ch = tileAt(c, r);
    if (solid(ch) || (oneWay && dir > 0 && ch === '=' &&
        (o.y + o.h) - o.vy * G.dt <= r * TILE + 6 && !o.dropDown)){
      if (dir > 0){ o.y = r * TILE - o.h - 0.01; o.onG = true; }
      else o.y = (r + 1) * TILE + 0.01;
      o.vy = 0; return;
    }
  }
}
function overlapTile(o, ch, inset){
  const i = inset || 0;
  const x1 = Math.floor((o.x + i) / TILE), x2 = Math.floor((o.x + o.w - i) / TILE);
  const y1 = Math.floor((o.y + i) / TILE), y2 = Math.floor((o.y + o.h - i) / TILE);
  for (let r = y1; r <= y2; r++) for (let c = x1; c <= x2; c++)
    if (tileAt(c, r) === ch) return { c, r };
  return null;
}

/* depth-limited flood clear so a multi-tile-thick destructible wall
   fully opens from a single bomb detonated anywhere against it */
function clearBombWall(c, r){
  const seen = new Set(); const q = [[c, r]]; let n = 0;
  while (q.length && n < 40){
    const [cc, rr] = q.shift(); const key = cc + ',' + rr;
    if (seen.has(key)) continue; seen.add(key); n++;
    if (tileAt(cc, rr) !== 'X') continue;
    G.grid[rr][cc] = ' ';
    q.push([cc + 1, rr], [cc - 1, rr], [cc, rr + 1], [cc, rr - 1]);
  }
}
