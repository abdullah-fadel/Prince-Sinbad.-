"use strict";
/* =========================================================
   audio.js — tiny WebAudio synth.
   All SFX are generated (no audio files): oscillator beeps
   with pitch slides, routed through a master gain so the
   whole mix can be muted/ducked at once. A light generative
   music loop (hijaz scale) plays during gameplay.
   ========================================================= */

let AC = null, masterGain = null, musicGain = null;
let soundOn = localStorage.getItem('db_sound') !== '0';

function ac(){
  if (!AC){
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = AC.createGain();
    masterGain.gain.value = soundOn ? 1 : 0;
    masterGain.connect(AC.destination);
    musicGain = AC.createGain();
    musicGain.gain.value = 0.55;
    musicGain.connect(masterGain);
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function setSound(on){
  soundOn = on;
  localStorage.setItem('db_sound', on ? '1' : '0');
  if (masterGain) masterGain.gain.value = on ? 1 : 0;
}

function beep(freq, dur, type = 'square', vol = .12, slide = 0, dest){
  try{
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + dur);
    o.connect(g); g.connect(dest || masterGain);
    o.start(); o.stop(a.currentTime + dur);
  }catch(e){}
}

const SFX = {
  jump : () => beep(340, .18, 'square',  .10, +220),
  djump: () => beep(430, .16, 'square',  .10, +260),
  land : () => beep(160, .08, 'triangle',.10, -60),
  coin : () => { beep(1000, .07, 'square', .09); setTimeout(() => beep(1420, .12, 'square', .09), 60); },
  fire : () => beep(210, .22, 'sawtooth',.12, -140),
  hit  : () => beep(150, .28, 'sawtooth',.15, -90),
  stomp: () => beep(240, .14, 'triangle',.14, -120),
  hurt : () => beep(120, .35, 'sawtooth',.16, -60),
  chest: () => { beep(600, .1, 'triangle', .12); setTimeout(() => beep(900, .16, 'triangle', .12), 90); },
  check: () => { beep(520, .12, 'triangle', .11); setTimeout(() => beep(780, .18, 'triangle', .11), 110); },
  boss : () => beep(90, .5, 'sawtooth', .18, -30),
  slash: () => { beep(880, .10, 'sawtooth', .10, -520); setTimeout(() => beep(1500, .06, 'square', .06, -300), 20); }, // steel swish
  roll : () => beep(360, .20, 'sine', .09, -220),                                                                      // soft whoosh
  bomb : () => { beep(70, .5, 'sawtooth', .2, -40); setTimeout(() => beep(900, .12, 'square', .08, -700), 20); },      // low thump + crack
  win  : () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, .25, 'triangle', .13), i * 140)); }
};

/* ---- generative ambient music ----
   A calm, old-Baghdad mood: slow oud-like plucks and an occasional
   qanun shimmer wander a D-hijaz maqam over a soft two-note drone,
   with a gentle hand-drum pulse. Everything is quiet and unhurried. */
const HIJAZ = [146.83, 155.56, 185.00, 196.00, 220.00, 233.08, 277.18, 293.66]; // D hijaz
let musicTimer = null, drones = [];

/* a plucked note that decays like a string (oud): quick attack, long tail */
function pluck(freq, dur, vol, type = 'triangle'){
  try{
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    const t0 = a.currentTime;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(musicGain);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }catch(e){}
}

function startMusic(){
  if (musicTimer) return;
  ac();
  /* NOTE: no continuous drone bed — a constant low sine pair used to sit
     under the music and read as an always-on "buzz/hum", so the mood now
     comes purely from the plucked oud phrases + soft hand-drum below. */
  drones = [];
  let step = 0, last = 4;
  musicTimer = setInterval(() => {
    if (G.state !== 'play') return;
    step++;
    /* soft hand-drum: a low "dum" on the down-beat, lighter "tek" between */
    if (step % 4 === 0) beep(84, .16, 'sine', .05, -20, musicGain);
    else if (step % 4 === 2 && Math.random() < .6) beep(150, .09, 'triangle', .03, -40, musicGain);

    if (step % 2 && Math.random() < .45) return;  // breathing, sparse phrasing
    /* stepwise melodic motion sounds more like a played maqam than random leaps */
    let idx = last + (Math.random() < .5 ? -1 : 1) * (1 + (Math.random() < .3 ? 1 : 0));
    idx = Math.max(0, Math.min(HIJAZ.length - 1, idx)); last = idx;
    const n = HIJAZ[idx];
    pluck(n, 1.6, .05);
    /* occasional qanun-like shimmer an octave up */
    if (Math.random() < .3) setTimeout(() => pluck(n * 2, 1.1, .028, 'sine'), 170);
  }, 470);
}
function stopMusic(){
  if (musicTimer){ clearInterval(musicTimer); musicTimer = null; }
  for (const o of drones){ try{ o.stop(); }catch(e){} }
  drones = [];
}
