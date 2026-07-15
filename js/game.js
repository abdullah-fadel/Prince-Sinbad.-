"use strict";
/* =========================================================
   game.js — main loop, game states and menu/overlay wiring.
   States: menu → play ⇄ pause, play → lvl/over/win.
   Death, respawn and victory all run on in-game timers so
   pausing freezes the whole world.
   ========================================================= */

let last = 0;

function loop(ts){
  requestAnimationFrame(loop);
  const dt = Math.min(.033, (ts - last) / 1000 || .016); last = ts; G.dt = dt;
  if (G.state !== 'play'){ $('btnBomb').classList.add('hidden'); return; }
  ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);

  G.time += dt;
  if (G.banner > 0) G.banner -= dt;
  if (G.cine > 0) G.cine -= dt;

  /* hit-stop: brief world freeze on big impacts (still renders) */
  if (G.hitstop > 0){ G.hitstop -= dt; }
  else {
    updatePlayer(dt); updateDeath(dt);
    updateEnemies(dt); updateBoss(dt); updateFireballs(dt); updateKnives(dt);
    updateParts(dt);
  }
  updateCamera(dt);
  updateMotes(dt);

  /* contextual "blow up wall / get a bomb" button */
  if (G.nearBombWall){
    $('btnBomb').classList.remove('hidden');
    $('btnBomb').textContent = P.bombs > 0 ? t('bomb.detonate') : t('bomb.getBomb');
  } else $('btnBomb').classList.add('hidden');

  /* victory trigger: reached the princess */
  if (P.winWalk && G.princess && !G.won &&
      Math.abs((P.x + P.w / 2) - (G.princess.x + 20)) < 52){
    G.won = true; G.score += Math.max(0, 3000 - Math.floor(G.time) * 10);
    G.winT = 1.4;
  }
  if (G.winT > 0){ G.winT -= dt; if (G.winT <= 0) showWin(); }

  /* ---------------- draw ---------------- */
  drawBG();
  ctx.save();
  const shX = G.shake > 0 ? (Math.random() - .5) * G.shake * 22 : 0;
  const shY = G.shake > 0 ? (Math.random() - .5) * G.shake * 22 : 0;
  /* zoom about the screen center, then translate to camera */
  ctx.translate(VW / 2, VH / 2); ctx.scale(cam.z, cam.z); ctx.translate(-VW / 2, -VH / 2);
  ctx.translate(-Math.round(cam.x * cam.z) / cam.z + shX, -Math.round(cam.y * cam.z) / cam.z + shY);
  drawTiles(G.time);
  drawPlatforms();
  drawMotes();
  for (const e of G.ents){
    if (e.t === 'scorp') drawScorp(e);
    else if (e.t === 'bandit') drawBandit(e);
    else if (e.t === 'wolf') drawWolf(e);
    else if (e.t === 'elite') drawElite(e);
    else if (e.t === 'thrower') drawThrower(e);
  }
  drawBoss(); drawPrincess(dt); drawFireballs(); drawKnives(); drawParts(); drawHero();
  ctx.restore();
  drawVignette();
  drawHUD();
}
requestAnimationFrame(loop);

/* ---------------- state / UI wiring ---------------- */
const $ = id => document.getElementById(id);
function show(id){
  ['menuOv', 'pauseOv', 'overOv', 'lvlOv', 'winOv', 'settingsOv', 'controlsOv', 'mapsOv'].forEach(o => $(o).classList.add('hidden'));
  if (id) $(id).classList.remove('hidden');
  document.body.classList.toggle('playing', G.state === 'play');
}

const BEST_KEY = 'db_best';
function updateBest(){
  const best = +(localStorage.getItem(BEST_KEY) || 0);
  if (G.score > best) localStorage.setItem(BEST_KEY, G.score);
}
function showBest(){
  const best = +(localStorage.getItem(BEST_KEY) || 0);
  $('bestScore').textContent = best > 0 ? t('best.score', { v: best }) : '';
}

/* save/continue — persists progress at level granularity (last level
   reached, total coins, remaining bombs), not exact mid-level position.
   `lvl` is a physical index into LEVELS. Because the WORLD/PLAY_ORDER
   chapter reordering is an indirection layer (LEVELS itself stays
   append-only), an old save's index still points at the same physical
   level, so pre-chapter saves keep working with no migration — the run
   simply resumes there and continues along the new PLAY_ORDER. */
const SAVE_KEY = 'db_save';
function loadSave(){
  try{ const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return (s && s.v === 1) ? s : null; }
  catch(e){ return null; }
}
function writeSave(){
  localStorage.setItem(SAVE_KEY, JSON.stringify({ v:1, lvl:G.lvl, coins:G.coins, bombs:P.bombs }));
}
function clearSave(){ localStorage.removeItem(SAVE_KEY); }
function refreshMenuButtons(){ $('continueBtn').classList.toggle('hidden', !loadSave()); }

/* ---------- keys / stage-unlock progression ----------
   The "keys" economy: 1 key for each distinct level cleared (first clear).
   Keys are a running TOTAL that is never spent — a later stage unlocks once
   the total reaches its `unlockKeys` threshold. Persisted separately from
   the resume save so progression survives quitting a run. */
const PROG_KEY = 'db_prog';
function loadCleared(){
  try{ const p = JSON.parse(localStorage.getItem(PROG_KEY));
       if (p && p.v === 1 && Array.isArray(p.cleared)) return new Set(p.cleared); }
  catch(e){}
  return new Set();
}
let CLEARED = loadCleared();
function saveCleared(){ localStorage.setItem(PROG_KEY, JSON.stringify({ v:1, cleared:[...CLEARED] })); }
function totalKeys(){ return CLEARED.size; }
function markCleared(idx){ if (!CLEARED.has(idx)){ CLEARED.add(idx); saveCleared(); } }
function stageUnlocked(st){ return !!st && !st.future && totalKeys() >= (st.unlockKeys || 0); }
function levelUnlocked(idx){
  const st = STAGE_OF[idx];
  if (!stageUnlocked(st)) return false;
  const pos = st.levels.indexOf(idx);
  if (pos <= 0) return true;                       // first level of an unlocked stage
  return CLEARED.has(st.levels[pos - 1]);          // otherwise the previous level must be cleared
}

function continueGame(){
  const s = loadSave();
  if (!s) return startGame();
  G.coins = s.coins || 0; G.score = 0; G.dispScore = 0; G.lives = 3;
  P.fire = 5; P.maxHp = 3; P.bombs = s.bombs ?? 1;
  G.cpDone = new Set(); G.won = false;
  loadLevel(Math.min(s.lvl || 0, LEVELS.length - 1));
  G.state = 'play'; show(null); ac(); startMusic(); goFullscreen();
}

/* bomb + destructible wall */
function onBombButtonPress(){
  if (!G.nearBombWall) return;
  if (P.bombs > 0) detonateBombWall(G.nearBombWall);
  else if (!G.adBombUsedThisLevel) requestBombViaAd(() => detonateBombWall(G.nearBombWall));
}
function requestBombViaAd(callback){
  /* placeholder for a future rewarded-ad flow — grants a bomb instantly,
     limited to once per level, until this is wired to a real ad SDK */
  G.adBombUsedThisLevel = true;
  P.bombs++; writeSave();
  callback();
}
function detonateBombWall(cell){
  P.bombs--; writeSave();
  clearBombWall(cell.c, cell.r);
  G.nearBombWall = null;
  SFX.bomb(); G.shake = Math.max(G.shake, .5);
  puff(cell.c * TILE + 24, cell.r * TILE + 24, 24, '#ff9a2e', 220, .6);
  ring(cell.c * TILE + 24, cell.r * TILE + 24, '#ffb03c', 70);
}
$('btnBomb').addEventListener('pointerdown', e => { e.preventDefault(); onBombButtonPress(); });

/* settings overlay — remembers which screen (menu/pause) it was opened from */
let settingsReturnTo = 'menuOv';
function openSettings(from){ settingsReturnTo = from; show('settingsOv'); }
function closeSettings(){ show(settingsReturnTo); }
function refreshLangBtns(){
  $('langArBtn').classList.toggle('active', lang === 'ar');
  $('langEnBtn').classList.toggle('active', lang === 'en');
}

/* ---------- rich world-map screen (maps → stages → levels) ----------
   Reference-style 3-panel layout: a maps list, a vertical stage path, and a
   stage-detail panel with a level grid + Play button. Stages/maps gate on the
   key total; tapping an unlocked level starts a fresh run there. */
function levelIcon(idx){
  const L = LEVELS[idx];
  if (L.boss) return '👑';                               // final confrontation (princess)
  if (L.rows.some(r => r.includes('G'))) return '☠';     // mid-roster boss (e.g. Warlord)
  if (L.eliteName) return '🛡';                           // elite-guarded gate
  return '⚔';                                            // ordinary level
}
function startAtLevel(idx){
  if (!levelUnlocked(idx)) return;                 // ignore taps on locked levels
  G.coins = 0; G.score = 0; G.dispScore = 0; G.lives = 3;
  P.fire = 5; P.maxHp = 3; P.bombs = 1;
  G.cpDone = new Set(); G.won = false;
  loadLevel(idx); writeSave();
  G.state = 'play'; show(null); ac(); startMusic(); goFullscreen();
}
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
function stageCleared(st){ return st.levels.length > 0 && st.levels.every(i => CLEARED.has(i)); }
function stageProgress(st){ return st.levels.filter(i => CLEARED.has(i)).length; }
function mapCleared(m){ return m.chapters.reduce((n, c) => n + stageProgress(c), 0); }
function mapTotal(m){ return m.chapters.reduce((n, c) => n + c.levels.length, 0); }

/* selection state for the map screen */
const mapsSel = { mapId: 'iraq', stage: 0 };

function buildMapsScreen(){
  $('mapsKeyCount').textContent = totalKeys();
  const selMap = WORLD.find(m => m.id === mapsSel.mapId) || WORLD[0];
  $('mapsScreenTitle').textContent = LT(selMap.name);

  /* ----- left column: maps list + key summary ----- */
  const list = $('mapsMaps'); list.textContent = '';
  for (const m of WORLD){
    const locked = m.future || totalKeys() < (m.unlockKeys || 0);
    const card = el('button', 'mapCard' + (m.id === mapsSel.mapId ? ' sel' : '') + (locked ? ' locked' : ''));
    card.appendChild(el('span', 'mapCardName', LT(m.name)));
    const sub = el('span', 'mapCardSub');
    sub.textContent = m.future ? t('maps.locked')
      : locked ? '🔒 ' + t('maps.needKeys', { v: m.unlockKeys })
      : t('maps.progress', { a: mapCleared(m), b: mapTotal(m) });
    card.appendChild(sub);
    if (!locked) card.onclick = () => { mapsSel.mapId = m.id; mapsSel.stage = 0; buildMapsScreen(); };
    list.appendChild(card);
  }
  const sum = el('div', 'keySummary');
  sum.appendChild(el('div', 'keySummaryTitle', t('maps.keysTotal')));
  sum.appendChild(el('div', 'keySummaryVal', '🔑 ' + totalKeys() + ' / ' + PLAY_ORDER.length));
  sum.appendChild(el('div', 'keySummaryHint', t('maps.keysHint')));
  list.appendChild(sum);

  /* ----- center column: stage path ----- */
  const path = $('mapsPath'); path.textContent = '';
  selMap.chapters.forEach((st, si) => {
    const node = el('button', 'stageNode' + (si === mapsSel.stage ? ' sel' : ''));
    const unlocked = stageUnlocked(st);
    const done = stageCleared(st);
    const badge = el('span', 'stageBadge ' + (done ? 'done' : unlocked ? 'open' : 'lock'),
                     done ? '✓' : unlocked ? (si + 1) : '🔒');
    node.appendChild(badge);
    node.appendChild(el('span', 'stageNodeName', LT(st.name)));
    const prog = el('span', 'stageNodeProg');
    prog.textContent = st.future ? t('maps.locked')
      : unlocked ? stageProgress(st) + '/' + st.levels.length
      : '🔒 ' + t('maps.needKeys', { v: st.unlockKeys });
    node.appendChild(prog);
    node.onclick = () => { mapsSel.stage = si; buildMapsScreen(); };
    path.appendChild(node);
    if (si < selMap.chapters.length - 1) path.appendChild(el('div', 'stagePathLink'));
  });

  /* ----- right column: selected-stage detail ----- */
  buildStageDetail(selMap, selMap.chapters[mapsSel.stage]);
}

function buildStageDetail(map, st){
  const d = $('mapsDetail'); d.textContent = '';
  if (!st){ return; }
  d.appendChild(el('div', 'detailTitle', LT(st.name)));
  d.appendChild(el('div', 'detailDesc', st.desc ? LT(st.desc) : ''));

  const unlocked = stageUnlocked(st);
  if (st.future || !st.levels.length){
    d.appendChild(el('div', 'detailLocked', '🔒 ' + t('maps.locked')));
    return;
  }
  if (!unlocked){
    d.appendChild(el('div', 'detailLocked', '🔒 ' + t('maps.needKeys', { v: st.unlockKeys })));
  }

  d.appendChild(el('div', 'detailSection', t('maps.levels')));
  const grid = el('div', 'lvlGrid');
  const playing = (G.state === 'play' || G.state === 'pause');
  st.levels.forEach((idx, pos) => {
    const lu = levelUnlocked(idx), cl = CLEARED.has(idx), cur = playing && G.lvl === idx;
    const b = el('button', 'lvlCell' + (cl ? ' cleared' : '') + (lu ? '' : ' locked') + (cur ? ' current' : ''));
    b.appendChild(el('span', 'lvlCellNum', String(pos + 1)));
    b.appendChild(el('span', 'lvlCellIcon', cl ? '✓' : lu ? levelIcon(idx) : '🔒'));
    b.title = LT(LEVELS[idx].name);
    if (lu) b.onclick = () => startAtLevel(idx);
    grid.appendChild(b);
  });
  d.appendChild(grid);

  /* Play button → next unbeaten unlocked level in the stage (or the first) */
  const target = st.levels.find(i => levelUnlocked(i) && !CLEARED.has(i));
  const play = el('button', 'btn detailPlay');
  if (unlocked && target != null){
    play.textContent = t('maps.play');
    play.onclick = () => startAtLevel(target);
  } else if (unlocked){
    play.textContent = t('maps.replay');
    play.onclick = () => startAtLevel(st.levels[0]);
  } else {
    play.textContent = '🔒 ' + t('maps.needKeys', { v: st.unlockKeys });
    play.disabled = true; play.classList.add('disabled');
  }
  d.appendChild(play);
}

function openMaps(){
  /* default the selection to the current level's stage when opened mid-run */
  const st = STAGE_OF[G.lvl], m = MAP_OF[G.lvl];
  if (m){ mapsSel.mapId = m.id; mapsSel.stage = Math.max(0, m.chapters.indexOf(st)); }
  buildMapsScreen(); show('mapsOv');
}

/* fullscreen + landscape lock on mobile — best effort, failures are fine */
function goFullscreen(){
  if (!isTouch) return;
  const el = document.documentElement;
  try{
    const p = el.requestFullscreen ? el.requestFullscreen() :
              el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null;
    const lock = () => { try{ screen.orientation.lock('landscape').catch(() => {}); }catch(e){} };
    if (p && p.then) p.then(lock).catch(() => {}); else lock();
  }catch(e){}
  setTimeout(resize, 250);
}

function startGame(){
  G.coins = 0; G.score = 0; G.dispScore = 0; G.lives = 3;
  P.fire = 5; P.maxHp = 3; P.bombs = 1;
  G.cpDone = new Set(); G.won = false;
  loadLevel(PLAY_ORDER[0]);
  G.state = 'play'; show(null); ac(); startMusic(); goFullscreen();
}
function levelComplete(){
  if (G.state !== 'play') return;
  markCleared(G.lvl);                              // earns a key toward stage unlocks
  G.state = 'lvl'; G.score += Math.max(0, 1500 - Math.floor(G.time) * 10);
  G.dispScore = G.score;
  $('lvlStats').innerHTML =
    t('stats.coins', { v: G.coins }) + '<br>' + t('stats.score', { v: G.score }) + '<br>' + t('stats.time', { v: Math.floor(G.time) });
  show('lvlOv'); SFX.win();
}
function showOver(){
  G.state = 'over'; updateBest(); stopMusic();
  $('overStats').innerHTML = t('stats.score', { v: G.score }) + '<br>' + t('stats.coins', { v: G.coins });
  show('overOv');
}
function showWin(){
  markCleared(G.lvl);                              // the finale also counts as a cleared level
  G.state = 'win'; updateBest(); stopMusic(); clearSave();
  $('winStats').innerHTML =
    t('stats.score', { v: G.score }) + '<br>' + t('stats.coins', { v: G.coins }) + '<br>' + t('stats.livesLeft', { v: G.lives });
  show('winOv');
}
function togglePause(){
  if (G.state === 'play'){ G.state = 'pause'; show('pauseOv'); }
  else if (G.state === 'pause'){ G.state = 'play'; show(null); last = performance.now(); }
}

/* auto-pause when the tab is hidden */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state === 'play') togglePause();
});

/* sound toggle buttons (menu + pause share state) */
function refreshSoundBtns(){
  const label = soundOn ? t('sound.on') : t('sound.off');
  $('soundBtn').textContent = label;
  $('soundBtn2').textContent = label;
}
function toggleSound(){ setSound(!soundOn); refreshSoundBtns(); }

$('startBtn').onclick = startGame;
$('continueBtn').onclick = continueGame;
$('retryBtn').onclick = startGame;
$('againBtn').onclick = startGame;
$('resumeBtn').onclick = togglePause;
$('pauseBtn').onclick = togglePause;
$('soundBtn').onclick = toggleSound;
$('soundBtn2').onclick = toggleSound;
const quit = () => { G.state = 'menu'; stopMusic(); updateBest(); showBest(); refreshMenuButtons(); show('menuOv'); };
$('quitBtn').onclick = quit;
$('quitBtn2').onclick = quit;
$('nextBtn').onclick = () => {
  /* advance along the play-order; if the next level sits in a still-locked
     stage (not enough keys), send the player to the map screen to see the
     gate instead of forcing them into a locked level */
  const nxt = nextLevelIndex(G.lvl);
  if (nxt < 0){ showWin(); return; }
  if (!levelUnlocked(nxt)){ G.state = 'menu'; stopMusic(); openMaps(); return; }
  loadLevel(nxt); writeSave(); G.state = 'play'; show(null); last = performance.now();
};

/* settings + language */
$('settingsBtn').onclick = () => openSettings('menuOv');
$('settingsBtn2').onclick = () => openSettings('pauseOv');
$('settingsCloseBtn').onclick = closeSettings;
$('mapsBtn').onclick = openMaps;
$('mapsCloseBtn').onclick = () => show('settingsOv');
$('langArBtn').onclick = () => setLang('ar');
$('langEnBtn').onclick = () => setLang('en');

applyLang();
refreshSoundBtns();
refreshLangBtns();
refreshMenuButtons();
showBest();
