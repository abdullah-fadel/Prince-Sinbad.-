"use strict";
/* =========================================================
   controls-custom.js — draggable/resizable touch controls.
   Persists button positions/sizes + the joystick zone rect to
   localStorage and applies them on load. Loaded right after
   input.js so this stays focused purely on *placing* controls;
   input.js still owns reading their state.

   Layout coordinates:
   - btnJ/btnD/btnA/btnF: {x,y,s} — x,y are the button's CENTER
     as a fraction (0..1) of the viewport; s scales its size.
   - stick: {x,y,w,h,s} — x,y are the zone rectangle's TOP-LEFT
     corner (fractions), w,h its size (fractions); s scales the
     cosmetic joystick base/knob shown while actually pressed.
   ========================================================= */

const CONTROLS_KEY = 'db_controls';
const BTN_IDS = ['btnJ', 'btnD', 'btnA', 'btnF'];

/* fractions computed from this project's shipped CSS defaults at a
   representative landscape touch viewport (900x420), so "no saved
   layout" looks the same as it always has. */
const DEFAULT_LAYOUT = {
  v: 1,
  btnJ:  { x: 0.073, y: 0.614, s: 1 },
  btnD:  { x: 0.073, y: 0.857, s: 1 },
  btnA:  { x: 0.936, y: 0.643, s: 1 },
  btnF:  { x: 0.936, y: 0.857, s: 1 },
  stick: { x: 0.36,  y: 0.24,  w: 0.64, h: 0.76, s: 1 }
};

function loadControlLayout(){
  try{ const s = JSON.parse(localStorage.getItem(CONTROLS_KEY)); return (s && s.v === 1) ? s : null; }
  catch(e){ return null; }
}
function saveControlLayout(l){ localStorage.setItem(CONTROLS_KEY, JSON.stringify(l)); }

/* applies a layout to the REAL gameplay controls. Uses plain left/top
   (position minus half the current size) rather than a transform, so
   it never fights the existing .tbtn.on{transform:scale(.94)} press
   feedback, which stays entirely untouched. */
function applyControlLayout(layout){
  const L = layout || loadControlLayout() || DEFAULT_LAYOUT;
  for (const id of BTN_IDS){
    const el = document.getElementById(id), c = L[id];
    const size = 84 * c.s;
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
  document.documentElement.style.setProperty('--stick-base', (96 * sc.s) + 'px');
  document.documentElement.style.setProperty('--stick-knob', (42 * sc.s) + 'px');
  document.documentElement.style.setProperty('--stick-max',  (34 * sc.s) + 'px');
}
addEventListener('resize', () => applyControlLayout());
applyControlLayout();

/* ---------------- edit mode ---------------- */
let draftLayout = null;
const stage = document.getElementById('ctlStage');
const zoneProxy = document.getElementById('ctlZoneProxy');
const zoneHandle = document.getElementById('ctlZoneHandle');
const btnProxies = {};
document.querySelectorAll('.ctlProxy').forEach(el => { btnProxies[el.dataset.id] = el; });
const sizeSliders = {};
document.querySelectorAll('.ctlSizeSlider').forEach(el => { sizeSliders[el.dataset.id] = el; });

function cloneLayout(l){ return JSON.parse(JSON.stringify(l)); }

function positionProxies(){
  for (const id of BTN_IDS){
    const c = draftLayout[id], el = btnProxies[id];
    el.style.left = (c.x * 100) + '%'; el.style.top = (c.y * 100) + '%';
  }
  const sc = draftLayout.stick;
  zoneProxy.style.left = (sc.x * 100) + '%'; zoneProxy.style.top = (sc.y * 100) + '%';
  zoneProxy.style.width = (sc.w * 100) + '%'; zoneProxy.style.height = (sc.h * 100) + '%';
  for (const id of [...BTN_IDS, 'stick']) sizeSliders[id].value = draftLayout[id].s;
}

function enterEditMode(){
  draftLayout = cloneLayout(loadControlLayout() || DEFAULT_LAYOUT);
  positionProxies();
  show('controlsOv');
}

/* drag a button proxy: its x/y follow the pointer 1:1 within the stage */
function dragProxy(el, id){
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId);
    const move = ev => {
      const r = stage.getBoundingClientRect();
      draftLayout[id].x = Math.min(0.97, Math.max(0.03, (ev.clientX - r.left) / r.width));
      draftLayout[id].y = Math.min(0.97, Math.max(0.03, (ev.clientY - r.top) / r.height));
      positionProxies(); applyControlLayout(draftLayout);
    };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  });
}
BTN_IDS.forEach(id => dragProxy(btnProxies[id], id));

/* drag the joystick zone's body: moves the whole rect, clamped so it stays on-stage */
zoneProxy.addEventListener('pointerdown', e => {
  if (e.target === zoneHandle) return; // the resize handle owns its own drag
  e.preventDefault(); zoneProxy.setPointerCapture(e.pointerId);
  const r = stage.getBoundingClientRect();
  const startX = (e.clientX - r.left) / r.width, startY = (e.clientY - r.top) / r.height;
  const origX = draftLayout.stick.x, origY = draftLayout.stick.y;
  const move = ev => {
    const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
    const sc = draftLayout.stick;
    sc.x = Math.min(1 - sc.w, Math.max(0, origX + (px - startX)));
    sc.y = Math.min(1 - sc.h, Math.max(0, origY + (py - startY)));
    positionProxies(); applyControlLayout(draftLayout);
  };
  const up = () => { zoneProxy.removeEventListener('pointermove', move); zoneProxy.removeEventListener('pointerup', up); };
  zoneProxy.addEventListener('pointermove', move); zoneProxy.addEventListener('pointerup', up);
});

/* resize the joystick zone from its bottom-right corner handle, anchored at top-left */
zoneHandle.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation(); zoneHandle.setPointerCapture(e.pointerId);
  const r = stage.getBoundingClientRect();
  const move = ev => {
    const sc = draftLayout.stick;
    const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
    sc.w = Math.min(1 - sc.x, Math.max(0.20, px - sc.x));
    sc.h = Math.min(1 - sc.y, Math.max(0.20, py - sc.y));
    positionProxies(); applyControlLayout(draftLayout);
  };
  const up = () => { zoneHandle.removeEventListener('pointermove', move); zoneHandle.removeEventListener('pointerup', up); };
  zoneHandle.addEventListener('pointermove', move); zoneHandle.addEventListener('pointerup', up);
});

/* size sliders (one per button + one for the joystick's cosmetic scale) */
for (const id of [...BTN_IDS, 'stick']){
  sizeSliders[id].addEventListener('input', () => {
    draftLayout[id].s = +sizeSliders[id].value;
    applyControlLayout(draftLayout);
  });
}

document.getElementById('customizeBtn').onclick = enterEditMode;
document.getElementById('controlsResetBtn').onclick = () => {
  draftLayout = cloneLayout(DEFAULT_LAYOUT);
  positionProxies(); applyControlLayout(draftLayout);
};
document.getElementById('controlsDoneBtn').onclick = () => {
  saveControlLayout(draftLayout);
  applyControlLayout();
  show('settingsOv');
};
