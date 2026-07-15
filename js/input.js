"use strict";
/* =========================================================
   input.js — keyboard + touch input.
   Keys are tracked in a map; touch buttons use pointer
   events so multi-touch works (move + jump + fire at once).
   All state is reset on blur so keys never stick.
   ========================================================= */

const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') togglePause();
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => {           // window lost focus: release everything
  for (const k in keys) keys[k] = false;
  for (const k in T) T[k] = false;
});

/* light haptic feedback for touch — a short buzz on discrete actions
   (button taps, jump, roll, hits). Off on desktop, and user-toggleable
   from settings; persisted in localStorage. */
const HAPTIC_KEY = 'db_haptics';
let hapticsOn = localStorage.getItem(HAPTIC_KEY) !== '0';
function setHaptics(on){ hapticsOn = !!on; localStorage.setItem(HAPTIC_KEY, on ? '1' : '0'); }
function buzz(ms){ if (isTouch && hapticsOn && navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} } }

/* touch buttons. T.U/T.Dn are the joystick's vertical (climb up / climb
   down + drop-through); the four action buttons drive J/A/F/D. */
const T = { L:false, R:false, U:false, Dn:false, J:false, F:false, D:false, A:false };
function bindT(id, k){
  const el = document.getElementById(id);
  const on  = e => { e.preventDefault(); T[k] = true;  el.classList.add('on'); buzz(7); ac(); };
  const off = e => { e.preventDefault(); T[k] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); on(e); });
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
bindT('btnJ','J'); bindT('btnF','F'); bindT('btnD','D'); bindT('btnA','A');

/* free-floating virtual joystick (right side) — rather than sitting in
   one fixed spot, it spawns right under the thumb wherever the player
   first presses inside the zone, then drags freely from there. Size
   and drag range come from the --stick-* CSS variables so the whole
   thing can be resized in one place without touching this logic. */
const stickZone = document.getElementById('stickZone');
const stickBase = document.getElementById('stickBase'), knobEl = document.getElementById('knob');
const stickVar = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0;
const STICK_DEAD = 9;
let stickCX = 0, stickCY = 0, stickOn = false;

function stickShow(x, y){
  const half = stickVar('--stick-base') / 2 + 8;
  stickCX = Math.max(half, Math.min(x, innerWidth - half));
  stickCY = Math.max(half, Math.min(y, innerHeight - half));
  stickBase.style.left = stickCX + 'px'; stickBase.style.top = stickCY + 'px';
  knobEl.style.left = stickCX + 'px'; knobEl.style.top = stickCY + 'px';
  knobEl.style.transform = 'translate(-50%, -50%)';
  stickBase.classList.add('on'); knobEl.classList.add('on');
  stickOn = true;
}
function stickMove(x, y){
  const max = stickVar('--stick-max');
  let dx = x - stickCX, dy = y - stickCY;
  const len = Math.hypot(dx, dy) || 1;
  if (len > max){ dx = dx / len * max; dy = dy / len * max; }
  knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  /* 4-direction output: horizontal steers, vertical climbs ladders / drops
     through one-way platforms. A slightly larger vertical dead-zone keeps
     casual left/right steering from accidentally triggering climb/drop. */
  T.L = dx < -STICK_DEAD; T.R = dx > STICK_DEAD;
  T.U = dy < -STICK_DEAD * 1.6; T.Dn = dy > STICK_DEAD * 1.6;
}
function stickHide(){
  stickOn = false; T.L = T.R = T.U = T.Dn = false;
  stickBase.classList.remove('on'); knobEl.classList.remove('on');
}
stickZone.addEventListener('pointerdown', e => {
  e.preventDefault(); stickZone.setPointerCapture(e.pointerId); stickShow(e.clientX, e.clientY); buzz(5); ac();
});
stickZone.addEventListener('pointermove', e => { if (stickOn && stickZone.hasPointerCapture(e.pointerId)) stickMove(e.clientX, e.clientY); });
stickZone.addEventListener('pointerup', stickHide);
stickZone.addEventListener('pointercancel', stickHide);
stickZone.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('blur', stickHide);

const inL    = () => keys['ArrowLeft']  || keys['KeyA'] || T.L;
const inR    = () => keys['ArrowRight'] || keys['KeyD'] || T.R;
const inJ    = () => keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || T.J;
const inSword= () => keys['KeyJ'] || keys['KeyX'] || T.A;                 // permanent melee
const inF    = () => keys['KeyK'] || keys['KeyZ'] || T.F;                 // fireball (limited ammo)
const inRoll = () => keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyC'] || T.D;  // dedicated dodge button
/* climb/drop come from the joystick's vertical on touch (T.U/T.Dn), so the
   jump and roll buttons stay single-purpose */
const inUp   = () => keys['ArrowUp'] || keys['KeyW'] || T.U;
const inDn   = () => keys['ArrowDown'] || keys['KeyS'] || T.Dn;
