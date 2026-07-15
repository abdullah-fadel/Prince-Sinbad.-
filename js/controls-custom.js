"use strict";
/* =========================================================
   controls-custom.js — simple, modern touch-control tuning.
   Two knobs only: a global SIZE scale and a HANDEDNESS mirror
   (swap the movement joystick and the action-button cluster
   left↔right). No per-button dragging — the edit screen shows
   the real controls and updates them live. Prefs persist to
   localStorage; input.js still owns reading control state.
   ========================================================= */

const CONTROLS_KEY = 'db_controls';
const BTN_IDS = ['btnJ', 'btnD', 'btnA', 'btnF'];

/* base scheme (fractions of a landscape touch viewport): joystick on the
   LEFT, action buttons clustered on the RIGHT, jump largest at bottom-right.
   The mirror pref flips x across the screen for left/right-handed players. */
const DEFAULT_LAYOUT = {
  btnJ:  { x: 0.90, y: 0.83, s: 1.15 },  // jump — primary, bottom-right
  btnA:  { x: 0.93, y: 0.55, s: 1 },     // sword — upper right
  btnF:  { x: 0.76, y: 0.63, s: 1 },     // fireball — inner upper
  btnD:  { x: 0.73, y: 0.88, s: 1 },     // roll — inner lower
  stick: { x: 0.02, y: 0.30, w: 0.44, h: 0.68 }
};

function loadPrefs(){
  try{
    const s = JSON.parse(localStorage.getItem(CONTROLS_KEY));
    if (s && s.v === 2) return { scale: Math.min(1.4, Math.max(0.7, s.scale || 1)), mirror: !!s.mirror };
  }catch(e){}
  return { scale: 1, mirror: false };   // includes migrating away from the old v:1 drag layout
}
function savePrefs(p){ localStorage.setItem(CONTROLS_KEY, JSON.stringify({ v: 2, scale: p.scale, mirror: p.mirror })); }

/* applies a {scale, mirror} pref to the REAL gameplay controls. Uses plain
   left/top so it never fights the .tbtn.on{transform:scale} press feedback. */
function applyControlLayout(pref){
  const P0 = pref || loadPrefs();
  const scale = P0.scale, mirror = P0.mirror;
  for (const id of BTN_IDS){
    const el = document.getElementById(id), c = DEFAULT_LAYOUT[id];
    const size = 92 * c.s * scale;
    const x = mirror ? (1 - c.x) : c.x;
    el.style.width = el.style.height = size + 'px';
    el.style.left = (x * innerWidth - size / 2) + 'px';
    el.style.top  = (c.y * innerHeight - size / 2) + 'px';
    el.style.right = el.style.bottom = 'auto';
  }
  const zx = document.getElementById('stickZone'), sc = DEFAULT_LAYOUT.stick;
  const zxX = mirror ? (1 - sc.x - sc.w) : sc.x;
  zx.style.left = (zxX * innerWidth) + 'px';
  zx.style.top  = (sc.y * innerHeight) + 'px';
  zx.style.width  = (sc.w * innerWidth) + 'px';
  zx.style.height = (sc.h * innerHeight) + 'px';
  zx.style.right = zx.style.bottom = 'auto';
  document.documentElement.style.setProperty('--stick-base', (112 * scale) + 'px');
  document.documentElement.style.setProperty('--stick-knob', (50 * scale) + 'px');
  document.documentElement.style.setProperty('--stick-max',  (40 * scale) + 'px');

  /* while customizing, park a ghost joystick at the zone centre so its size
     and side are visible (the real one only appears under a live thumb) */
  if (document.body.classList.contains('customizing') && typeof stickBase !== 'undefined'){
    const cx = (zxX + sc.w / 2) * innerWidth, cy = (sc.y + sc.h / 2) * innerHeight;
    stickBase.style.left = cx + 'px'; stickBase.style.top = cy + 'px';
    knobEl.style.left = cx + 'px'; knobEl.style.top = cy + 'px';
    knobEl.style.transform = 'translate(-50%, -50%)';
    stickBase.classList.add('on'); knobEl.classList.add('on');
  }
}
addEventListener('resize', () => applyControlLayout());
applyControlLayout();

/* ---------------- edit mode ---------------- */
let draft = null;
const sizeSlider = document.getElementById('ctlSizeAll');
const sizeVal    = document.getElementById('ctlSizeVal');
const mirrorBtn  = document.getElementById('ctlMirrorBtn');

function refreshEditUI(){
  sizeSlider.value = draft.scale;
  sizeVal.textContent = Math.round(draft.scale * 100) + '%';
  mirrorBtn.textContent = t(draft.mirror ? 'controls.handRight' : 'controls.handLeft');
}
function enterEditMode(){
  draft = loadPrefs();
  document.body.classList.add('customizing');
  refreshEditUI();
  applyControlLayout(draft);
  show('controlsOv');
}
function exitEditMode(){
  document.body.classList.remove('customizing');
  if (typeof stickBase !== 'undefined'){ stickBase.classList.remove('on'); knobEl.classList.remove('on'); }
}

sizeSlider.addEventListener('input', () => { draft.scale = +sizeSlider.value; refreshEditUI(); applyControlLayout(draft); });
mirrorBtn.addEventListener('click', () => { draft.mirror = !draft.mirror; refreshEditUI(); applyControlLayout(draft); if (typeof buzz === 'function') buzz(10); });

document.getElementById('customizeBtn').onclick = enterEditMode;
document.getElementById('controlsResetBtn').onclick = () => {
  draft = { scale: 1, mirror: false };
  refreshEditUI(); applyControlLayout(draft);
};
document.getElementById('controlsDoneBtn').onclick = () => {
  savePrefs(draft);
  exitEditMode();
  applyControlLayout();
  show('settingsOv');
};
