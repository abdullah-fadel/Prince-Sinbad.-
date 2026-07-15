"use strict";
/* =========================================================
   controls-custom.js — per-control touch tuning.
   Each of the four action buttons and the joystick can be
   moved (drag it directly on screen) and resized (select it,
   use the size slider) independently, plus a global opacity.
   Prefs persist to localStorage; input.js reads control state
   (its handlers no-op while editingControls is true).
   ========================================================= */

const CONTROLS_KEY = 'db_controls';
const BTN_IDS = ['btnJ', 'btnD', 'btnA', 'btnF'];
const ITEM_ICON = { btnJ:'⬆', btnA:'⚔', btnF:'🔥', btnD:'💨', stick:'🕹' };

/* base scheme (fractions of a landscape touch viewport): joystick on the
   LEFT, action buttons clustered on the RIGHT, jump largest at bottom-right. */
const DEFAULT_LAYOUT = {
  btnJ:  { x: 0.90, y: 0.83, s: 1.15 },
  btnA:  { x: 0.93, y: 0.55, s: 1 },
  btnF:  { x: 0.76, y: 0.63, s: 1 },
  btnD:  { x: 0.73, y: 0.88, s: 1 },
  stick: { x: 0.02, y: 0.30, w: 0.44, h: 0.68, s: 1 },
  opacity: 1
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function defaults(){ return JSON.parse(JSON.stringify(DEFAULT_LAYOUT)); }

function loadPrefs(){
  try{
    const s = JSON.parse(localStorage.getItem(CONTROLS_KEY));
    if (s && s.v === 3){
      const d = defaults();
      for (const id of BTN_IDS) if (s[id]) d[id] = { x:s[id].x, y:s[id].y, s:s[id].s };
      if (s.stick) d.stick = { x:s.stick.x, y:s.stick.y, w:s.stick.w, h:s.stick.h, s:s.stick.s };
      d.opacity = (s.opacity != null) ? s.opacity : 1;
      return d;
    }
  }catch(e){}
  return defaults();   // includes migrating away from older v1/v2 layouts
}
function savePrefs(p){ localStorage.setItem(CONTROLS_KEY, JSON.stringify(Object.assign({ v:3 }, p))); }

/* applies a full layout to the REAL controls (plain left/top so it never
   fights the .tbtn.on press transform) */
function applyControlLayout(pref){
  const L = pref || loadPrefs();
  for (const id of BTN_IDS){
    const el = document.getElementById(id), c = L[id];
    const size = 92 * c.s;
    el.style.width = el.style.height = size + 'px';
    el.style.left = (c.x * innerWidth - size / 2) + 'px';
    el.style.top  = (c.y * innerHeight - size / 2) + 'px';
    el.style.right = el.style.bottom = 'auto';
  }
  const zx = document.getElementById('stickZone'), sc = L.stick;
  zx.style.left = (sc.x * innerWidth) + 'px';
  zx.style.top  = (sc.y * innerHeight) + 'px';
  zx.style.width  = (sc.w * innerWidth) + 'px';
  zx.style.height = (sc.h * innerHeight) + 'px';
  zx.style.right = zx.style.bottom = 'auto';
  document.documentElement.style.setProperty('--stick-base', (112 * sc.s) + 'px');
  document.documentElement.style.setProperty('--stick-knob', (50 * sc.s) + 'px');
  document.documentElement.style.setProperty('--stick-max',  (40 * sc.s) + 'px');
  document.documentElement.style.setProperty('--ctl-opacity', L.opacity);

  /* while customizing, park a ghost joystick at the zone centre as a drag
     handle so its position and size are visible/adjustable */
  if (document.body.classList.contains('customizing') && typeof stickBase !== 'undefined'){
    const cx = (sc.x + sc.w / 2) * innerWidth, cy = (sc.y + sc.h / 2) * innerHeight;
    stickBase.style.left = cx + 'px'; stickBase.style.top = cy + 'px';
    knobEl.style.left = cx + 'px'; knobEl.style.top = cy + 'px';
    knobEl.style.transform = 'translate(-50%, -50%)';
    stickBase.classList.add('on'); knobEl.classList.add('on');
  }
}
addEventListener('resize', () => applyControlLayout());
applyControlLayout();

/* ---------------- edit mode ---------------- */
let draft = null, selectedId = 'btnJ';
const sizeSlider = document.getElementById('ctlSizeSel');
const sizeVal    = document.getElementById('ctlSizeVal');
const selIcon    = document.getElementById('ctlSelIcon');
const opSlider   = document.getElementById('ctlOpacity');
const opVal      = document.getElementById('ctlOpacityVal');

function selEl(id){ return id === 'stick' ? stickBase : document.getElementById(id); }
function selectItem(id){
  selectedId = id;
  [...BTN_IDS, 'stick'].forEach(i => selEl(i).classList.toggle('ctlSel', i === id));
  selIcon.textContent = ITEM_ICON[id];
  sizeSlider.value = draft[id].s;
  sizeVal.textContent = Math.round(draft[id].s * 100) + '%';
}
function refreshEditUI(){
  selectItem(selectedId);
  opSlider.value = draft.opacity;
  opVal.textContent = Math.round(draft.opacity * 100) + '%';
}

/* drag any control directly on screen to reposition it */
function makeDraggable(el, id){
  el.addEventListener('pointerdown', e => {
    if (!editingControls) return;
    e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId);
    selectItem(id);
    const move = ev => {
      const fx = clamp(ev.clientX / innerWidth, .04, .96), fy = clamp(ev.clientY / innerHeight, .10, .96);
      if (id === 'stick'){ draft.stick.x = clamp(fx - draft.stick.w / 2, 0, 1 - draft.stick.w); draft.stick.y = clamp(fy - draft.stick.h / 2, 0, 1 - draft.stick.h); }
      else { draft[id].x = fx; draft[id].y = fy; }
      applyControlLayout(draft);
    };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  });
}
BTN_IDS.forEach(id => makeDraggable(document.getElementById(id), id));
makeDraggable(stickBase, 'stick');

sizeSlider.addEventListener('input', () => {
  draft[selectedId].s = +sizeSlider.value;
  sizeVal.textContent = Math.round(draft[selectedId].s * 100) + '%';
  applyControlLayout(draft);
});
opSlider.addEventListener('input', () => {
  draft.opacity = +opSlider.value;
  opVal.textContent = Math.round(draft.opacity * 100) + '%';
  applyControlLayout(draft);
});

function enterEditMode(){
  draft = loadPrefs();
  editingControls = true;
  document.body.classList.add('customizing');
  selectedId = 'btnJ';
  refreshEditUI();
  applyControlLayout(draft);
  show('controlsOv');
}
function exitEditMode(){
  editingControls = false;
  document.body.classList.remove('customizing');
  [...BTN_IDS, 'stick'].forEach(i => selEl(i).classList.remove('ctlSel'));
  if (typeof stickBase !== 'undefined'){ stickBase.classList.remove('on'); knobEl.classList.remove('on'); }
}

document.getElementById('customizeBtn').onclick = enterEditMode;
document.getElementById('controlsResetBtn').onclick = () => { draft = defaults(); refreshEditUI(); applyControlLayout(draft); };
document.getElementById('controlsDoneBtn').onclick = () => {
  savePrefs(draft);
  exitEditMode();
  applyControlLayout();
  show('settingsOv');
};
