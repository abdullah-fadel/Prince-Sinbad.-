"use strict";
/* =========================================================
   actors.js — character rendering. The hero, the evil-soldier
   quartet (bandit/thrower/elite/shieldman), the chief boss and the
   princess are real image sprites rendered from the uploaded 3D
   character models (img/*.png). The scorpion, wolf and mid-roster
   warlord boss have no matching model and stay procedural vector
   art. Where a clip covers the pose (hero run/jump, leader's whole
   moveset, soldier run/jump/idle) real per-frame skeletal poses are
   used; states with no matching clip still fake motion by
   transforming a still frame (lean, bob, squash/stretch, rotation).
   ========================================================= */

function loadSprite(src){ const img = new Image(); img.src = src; return img; }
const HERO_RUN_FRAMES = 10, HERO_JUMP_FRAMES = 8, HERO_ROLL_FRAMES = 8, HERO_FIRE_FRAMES = 8;
/* flip to true once img/hero_fire/fire_0..7.png exist (rendered from the
   "Swing Arms" clip). Kept off by default so no missing-file requests fire. */
const HERO_FIRE_ENABLED = false;
const LEADER_IDLE_FRAMES = 6, LEADER_WALK_FRAMES = 8, LEADER_WINDUP_FRAMES = 6,
      LEADER_SLAM_FRAMES = 5, LEADER_THROW_FRAMES = 6, LEADER_DEATH_FRAMES = 8;
const SOLDIER_RUN_FRAMES = 10, SOLDIER_JUMP_FRAMES = 8, SOLDIER_IDLE_FRAMES = 8;
/* display height for the bandit/thrower/shieldman body — close to the
   hero's own 118, since the old 66 (tuned for the flat static sprite)
   read as a toy next to him */
const SOLDIER_H = 108, ELITE_H = 128;
const SPR = {
  hero: loadSprite('img/hero.png'),
  princess: loadSprite('img/princess.png'),
  /* real running/jumping/rolling animation frames, rendered from the
     rigged hero model (Jogging / Jump Up clips, and a hand-keyed tuck
     pose on the same skeleton for the roll) rather than faked — the
     actual joints bend and the cloak flows per frame */
  heroRun: Array.from({length: HERO_RUN_FRAMES}, (_, i) => loadSprite(`img/hero_run/run_${i}.png`)),
  heroJump: Array.from({length: HERO_JUMP_FRAMES}, (_, i) => loadSprite(`img/hero_jump/jump_${i}.png`)),
  heroRoll: Array.from({length: HERO_ROLL_FRAMES}, (_, i) => loadSprite(`img/hero_roll/roll_${i}.png`)),
  /* fireball cast: frames rendered from the model's "Swing Arms" clip
     (arm raised to chest). Drop transparent PNGs at img/hero_fire/fire_0..7.png
     — same camera/scale as the run frames — and they play automatically;
     until then heroFireReady() is false and drawHero fakes the arm instead. */
  heroFire: HERO_FIRE_ENABLED ? Array.from({length: HERO_FIRE_FRAMES}, (_, i) => loadSprite(`img/hero_fire/fire_${i}.png`)) : [],
  sword: loadSprite('img/sword.png'),
  /* villain leader: real per-frame poses rendered from the uploaded
     "Sword and Shield" rigged model+animation pack (idle/walk/power-up/
     impact/casting/death clips) — actual skeleton and joints driving
     each pose, matching the hero's run/jump/roll treatment instead of
     transforming one static image */
  leaderIdle: Array.from({length: LEADER_IDLE_FRAMES}, (_, i) => loadSprite(`img/leader_idle/idle_${i}.png`)),
  leaderWalk: Array.from({length: LEADER_WALK_FRAMES}, (_, i) => loadSprite(`img/leader_walk/walk_${i}.png`)),
  leaderWindup: Array.from({length: LEADER_WINDUP_FRAMES}, (_, i) => loadSprite(`img/leader_windup/windup_${i}.png`)),
  leaderSlam: Array.from({length: LEADER_SLAM_FRAMES}, (_, i) => loadSprite(`img/leader_slam/slam_${i}.png`)),
  leaderThrow: Array.from({length: LEADER_THROW_FRAMES}, (_, i) => loadSprite(`img/leader_throw/throw_${i}.png`)),
  leaderDeath: Array.from({length: LEADER_DEATH_FRAMES}, (_, i) => loadSprite(`img/leader_death/death_${i}.png`)),
  /* evil soldier army (bandit/thrower/elite/shieldman): real per-frame
     poses rendered from the uploaded rigged "humanoid" model + its
     Jogging/Jump Up/Waiting clips — same real-frame-sequence convention
     as the hero and leader, replacing the old single static soldier.png
     and its faked lean/bob transform */
  soldierRun: Array.from({length: SOLDIER_RUN_FRAMES}, (_, i) => loadSprite(`img/soldier_run/run_${i}.png`)),
  soldierJump: Array.from({length: SOLDIER_JUMP_FRAMES}, (_, i) => loadSprite(`img/soldier_jump/jump_${i}.png`)),
  soldierIdle: Array.from({length: SOLDIER_IDLE_FRAMES}, (_, i) => loadSprite(`img/soldier_idle/idle_${i}.png`))
};
/* true once the optional cast frames have actually decoded (a missing file
   leaves naturalWidth 0, so we transparently fall back to the drawn arm) */
function heroFireReady(){ const a = SPR.heroFire[0]; return !!a && a.complete && a.naturalWidth > 0; }
/* the sword sprite's own grip point (where the crossguard meets the
   handle), as a fraction of its width/height — the blade is drawn
   pivoting around this point so it swings naturally from the hand */
const SWORD_GRIP = { x: 807 / 939, y: 73 / 161 };
const SWORD_LEN = 76; // on-screen blade length, sized to the hero's own 118-tall sprite

/* draws `img` bottom-centered at the current transform's origin, at a
   fixed display height `h` (width follows the image's own aspect
   ratio); `tint` optionally flashes a color over the sprite's own
   silhouette (used for the hurt flash) via source-atop compositing. */
function drawSprite(img, h, tint){
  if (!img.complete || !img.naturalWidth) return;
  const w = h * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, -w / 2, -h, w, h);
  if (tint){
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tint;
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.restore();
  }
}

/* ---- HERO: Prince Abdullah.
   Running and jumping/falling use real per-frame poses rendered from
   the rigged, animated hero model (Jogging / Jump Up clips) — actual
   bent knees and arm/cloak motion, not a faked transform. The sprite
   base faces RIGHT, so ctx.scale(P.face,1) flips it to face the travel
   direction. Idle/attack/roll/climb/dead have no matching animation
   clip, so those still fake motion by transforming the static pose. ---- */
function drawHero(){
  if (!P.dead) drawShadow(P.x + P.w / 2, P.y + P.h, P.w);
  const flick = P.inv > 0 && Math.floor(P.inv * 12) % 2 === 0;
  if (flick) return;
  const t = P.anim, run = P.state === 'run';
  /* running stride phase, tied to how fast the hero actually moves so
     the feet don't "skate" — faster run = quicker cadence */
  const cadence = 9 + Math.min(6, Math.abs(P.vx) / 40);
  const stride = t * cadence;
  ctx.save();
  ctx.translate(P.x + P.w / 2, P.y + P.h);
  ctx.scale(P.face, 1);
  /* squash & stretch anchored at the feet (landing / jump take-off) */
  let sx = 1 + P.squash * .5 - P.stretch * .3, sy = 1 - P.squash * .5 + P.stretch * .35;
  if (P.state === 'idle'){ const br = Math.sin(t * 2.2) * .02; sx -= br; sy += br; } // breathing
  ctx.scale(sx, sy);
  if (P.dead) ctx.rotate(Math.sin(t * 3) * .3);
  /* dodge roll: a real tucked-tumble pose (knees drawn up, spine and
     neck curved, arms pulled in — hand-keyed on the same skeleton used
     for run/jump, since no source clip covers this state) spun once
     through the dash for the actual "rolling" motion */
  if (P.state === 'roll'){
    const spin = (1 - Math.max(0, P.rollT) / ROLL_TIME) * 6.283;
    ctx.translate(0, -55); ctx.rotate(spin); ctx.translate(0, 55);
  }

  if (P.punchT > 0 && heroFireReady()){
    /* real "Swing Arms" cast frames when available — play them by cast
       progress (the flame/fist effect is still drawn separately below) */
    const prog = 1 - Math.max(0, P.punchT) / .28;
    const frame = SPR.heroFire[Math.min(HERO_FIRE_FRAMES - 1, Math.floor(prog * HERO_FIRE_FRAMES))];
    drawSprite(frame, 118);
  } else if (run){
    const phase = ((stride / (2 * Math.PI)) % 1 + 1) % 1;
    const frame = SPR.heroRun[Math.floor(phase * HERO_RUN_FRAMES)];
    drawSprite(frame, 118);
  } else if (P.state === 'jump' || P.state === 'fall'){
    /* pick the pose by actual vertical velocity — strong upward thrust
       reads as the takeoff frame, terminal fall reads as the landing-
       ready frame, so the pose always matches the physics */
    const vFrac = Math.min(1, Math.max(0, (P.vy - PHYS.jumpV) / (PHYS.maxFall - PHYS.jumpV)));
    const frame = SPR.heroJump[Math.min(HERO_JUMP_FRAMES - 1, Math.floor(vFrac * HERO_JUMP_FRAMES))];
    drawSprite(frame, 118);
  } else if (P.state === 'roll'){
    const prog = 1 - Math.max(0, P.rollT) / ROLL_TIME;
    const frame = SPR.heroRoll[Math.min(HERO_ROLL_FRAMES - 1, Math.floor(prog * HERO_ROLL_FRAMES))];
    drawSprite(frame, 118);
  } else {
    /* no dedicated clip for this state — fake it on the static pose */
    let yOff = 0, xOff = 0, rot = 0;
    if (P.punchT > 0){
      /* fireball cast: the hero lifts his arm and fires from his fist —
         a small upright brace + slight lean, not a big forward lunge */
      const pr = 1 - Math.max(0, P.punchT) / .28;
      const jab = Math.sin(Math.min(1, pr) * Math.PI);   // 0 → 1 → 0 over the throw
      xOff = jab * 6; rot = -.05 - jab * .09;
    } else if (P.swordT > 0 || P.state === 'attack') rot = -.16;
    else if (P.state === 'climb') yOff = Math.sin(t * 8) * 4;
    else if (P.state === 'idle') yOff = Math.sin(t * 2.2) * 1.5; // gentle idle bob
    ctx.translate(xOff, yOff);
    ctx.rotate(rot);
    drawSprite(SPR.hero, 118);
  }
  /* melee swing: the real curved sword sprite, pivoting from the grip
     (crossguard) held near the hand. An ease-out curve gives the slash
     a natural committed-swing feel — quick to accelerate, then settling
     through the follow-through — and a faint motion-blur trail behind
     the blade sells the speed. */
  if (P.swordT > 0){
    const prog = 1 - P.swordT / SWORD_TIME;
    const eased = 1 - (1 - prog) * (1 - prog);
    const ang = -1.5 + eased * 2.7;
    const img = SPR.sword;
    if (img.complete && img.naturalWidth){
      const w = SWORD_LEN, h = w * (img.naturalHeight / img.naturalWidth);
      const px = SWORD_GRIP.x * w, py = SWORD_GRIP.y * h;
      ctx.save();
      ctx.translate(22, -48);
      for (let k = 3; k >= 1; k--){
        ctx.save();
        ctx.rotate(ang - k * .18);
        ctx.scale(-1, 1); // blade points along the swing direction, not back toward the hilt art
        ctx.globalAlpha = .1 * (4 - k);
        ctx.drawImage(img, -px, -py, w, h);
        ctx.restore();
      }
      ctx.rotate(ang);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -px, -py, w, h);
      ctx.restore();
    }
  } else if (P.punchT > 0){
    /* No drawn arm: the fire simply emanates from the hero's own hand. When
       real raised-arm cast frames are playing the flame sits at chest height;
       otherwise it comes off his actual (lowered) hand in the static pose. */
    const pr = 1 - Math.max(0, P.punchT) / .28;
    const jab = Math.sin(Math.min(1, pr) * Math.PI);
    const fx = (heroFireReady() ? 26 : 24) + jab * 8;
    const fy = heroFireReady() ? -62 : -47;            // chest vs. real lowered hand
    ctx.save();
    const R = 9 + jab * 17;                            // flame swells as the cast releases
    const fg = ctx.createRadialGradient(fx + 4, fy, 2, fx + 4, fy, R);
    fg.addColorStop(0, 'rgba(255,244,190,.95)');
    fg.addColorStop(.45, 'rgba(255,150,50,.85)');
    fg.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fx + 4, fy, R, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ---- scorpion (no matching model — stays procedural) ---- */
function drawScorp(e){
  const pal = e.pal || PAL.desert;
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w * .8);
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h); ctx.scale(Math.sign(e.vx) || 1, 1);
  if (e.dead) ctx.scale(1, -1);
  const w = Math.sin(e.anim * 10) * 2;
  ctx.fillStyle = e.hurt > 0 ? '#ffb0a0' : pal.body;
  ctx.beginPath(); ctx.ellipse(0, -12, 20, 11, 0, 0, 7); ctx.fill();
  ctx.fillStyle = e.hurt > 0 ? '#ffb0a0' : pal.body2;
  ctx.beginPath(); ctx.ellipse(-14, -14, 8, 7, 0, 0, 7); ctx.fill();
  /* tail */
  ctx.strokeStyle = pal.body2; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(14, -14); ctx.quadraticCurveTo(26, -30 + w, 18, -36 + w); ctx.stroke();
  ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(17, -38 + w, 3.4, 0, 7); ctx.fill();
  /* legs */
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++){
    const lw = Math.sin(e.anim * 12 + i) * 3;
    ctx.beginPath(); ctx.moveTo(-8 + i * 8, -8); ctx.lineTo(-11 + i * 8 + lw, 0); ctx.stroke();
  }
  /* pincers + eyes */
  ctx.fillStyle = pal.body2; ctx.beginPath(); ctx.ellipse(20, -8, 6, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -17, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(9, -17, 1.5, 0, 7); ctx.fill();
  ctx.lineCap = 'butt'; ctx.restore();
}

/* ---- evil soldier: shared body for the bandit/thrower/elite/shieldman
   quartet so the whole enemy roster reads as one army — only the display
   height, shadow width and post-body overlays (nameplate, alert, shield)
   differ per type. Real per-frame poses rendered from the uploaded rigged
   "humanoid" model + its Jogging/Jump Up/Waiting clips (running legs
   actually bend, the cape actually flows, and a leap over a gap is a real
   airborne pose) — only the death spin and the windup brace still fake
   motion by transforming a still frame, since no clip covers those. ---- */
function drawSoldierBody(e, h){
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w * (h > 70 ? 1.1 : 1));
  /* sprite base faces RIGHT; scale(d,1) turns it to the patrol direction */
  const hurt = e.hurt > 0, d = Math.sign(e.vx) || 1, tint = hurt ? 'rgba(255,150,130,.6)' : null;
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h);
  ctx.scale(d, 1);
  if (e.dead){
    ctx.rotate(.9);
    drawSprite(SPR.soldierIdle[0], h, tint);
    ctx.restore();
    return;
  }
  const windup = e.windup > 0 || e.throwWindup > 0, lunge = e.lunge > 0;
  let frame, rot = 0;
  if (e.onG === false){
    /* airborne: pick the pose by actual vertical velocity, same trick
       as the hero's own jump frames */
    const vFrac = Math.min(1, Math.max(0, (e.vy - SOLDIER_JUMP_VY) / (700 - SOLDIER_JUMP_VY)));
    frame = SPR.soldierJump[Math.min(SOLDIER_JUMP_FRAMES - 1, Math.floor(vFrac * SOLDIER_JUMP_FRAMES))];
  } else if (windup){
    rot = -.18; // brace/rear back before striking or throwing — no dedicated clip, so fake the lean
    frame = SPR.soldierIdle[Math.floor(e.anim * 4) % SOLDIER_IDLE_FRAMES];
  } else {
    if (lunge) rot = .12; // committed forward lunge — still a run cycle, just leaned in
    const cadence = 9 + Math.min(6, Math.abs(e.vx) / 40);
    const phase = ((e.anim * cadence / (2 * Math.PI)) % 1 + 1) % 1;
    frame = SPR.soldierRun[Math.floor(phase * SOLDIER_RUN_FRAMES)];
  }
  ctx.rotate(rot);
  drawSprite(frame, h, tint);
  ctx.restore();
}
function drawBandit(e){
  drawSoldierBody(e, SOLDIER_H);
  if (e.alert > 0 && !e.dead){
    ctx.fillStyle = 'rgba(255,220,80,' + Math.min(1, e.alert * 2) + ')';
    ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x + e.w / 2, e.y - 10 - Math.sin(e.alert * 12) * 3);
  }
}
function drawThrower(e){
  drawSoldierBody(e, SOLDIER_H);
  if (e.alert > 0 && !e.dead){
    ctx.fillStyle = 'rgba(255,220,80,' + Math.min(1, e.alert * 2) + ')';
    ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x + e.w / 2, e.y - 10 - Math.sin(e.alert * 12) * 3);
  }
}

/* ---- wolf (no matching model — stays procedural) ---- */
function drawWolf(e){
  const pal = e.pal || PAL.forest;
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w * .85);
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h); ctx.scale(Math.sign(e.vx) || 1, 1);
  if (e.dead) ctx.scale(1, -1);
  const run = Math.sin(e.anim * 16), hurt = e.hurt > 0;
  const bodyC = hurt ? '#ffb0a0' : pal.body, darkC = hurt ? '#ffb0a0' : pal.body2;
  /* legs (trotting) */
  ctx.strokeStyle = darkC; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, -6); ctx.lineTo(-12 + run * 4, -1);
  ctx.moveTo(10, -6); ctx.lineTo(10 - run * 4, -1);
  ctx.moveTo(-6, -8); ctx.lineTo(-6 - run * 3, -1);
  ctx.moveTo(4, -8); ctx.lineTo(4 + run * 3, -1);
  ctx.stroke();
  /* body */
  ctx.fillStyle = bodyC;
  ctx.beginPath(); ctx.ellipse(-1, -14, 17, 9, -.05, 0, 7); ctx.fill();
  /* tail */
  ctx.strokeStyle = darkC; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-16, -14); ctx.quadraticCurveTo(-26, -18 + run * 2, -24, -8); ctx.stroke();
  /* head + ears */
  ctx.fillStyle = bodyC;
  ctx.beginPath(); ctx.ellipse(15, -16, 8, 6.4, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(11, -22); ctx.lineTo(14, -30); ctx.lineTo(16, -21); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(17, -22); ctx.lineTo(21, -29); ctx.lineTo(20, -20); ctx.closePath(); ctx.fill();
  /* snout + eye */
  ctx.fillStyle = darkC; ctx.beginPath(); ctx.ellipse(22, -14, 4, 3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(17, -18, 1.6, 0, 7); ctx.fill();
  ctx.lineCap = 'butt'; ctx.restore();
}

/* ---- mummy (Egypt — procedural): a bandaged shambler with arms out and
   faintly glowing eyes ---- */
function drawMummy(e){
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w * .8);
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h); ctx.scale(Math.sign(e.vx) || 1, 1);
  if (e.dead) ctx.rotate(Math.sin(e.anim * 4) * .35);
  const sway = Math.sin(e.anim * 4) * 2, hurt = e.hurt > 0;
  const band = hurt ? '#ffd9c0' : '#d9cdae', bandDark = hurt ? '#e6b498' : '#ab9d78';
  /* torso + head */
  ctx.fillStyle = band;
  rr(-14, -52, 28, 52, 9); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -58, 13, 0, 7); ctx.fill();
  /* wrappings */
  ctx.strokeStyle = bandDark; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++){ ctx.beginPath(); ctx.moveTo(-14, -46 + i * 8); ctx.lineTo(14, -44 + i * 8 + (i % 2 ? 1.5 : -1)); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-12, -64); ctx.lineTo(12, -60); ctx.moveTo(-12, -56); ctx.lineTo(12, -60); ctx.stroke();
  /* outstretched arms */
  ctx.strokeStyle = band; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(6, -42); ctx.lineTo(30, -38 + sway); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -36); ctx.lineTo(27, -32 + sway); ctx.stroke();
  ctx.lineCap = 'butt';
  /* glowing eyes */
  ctx.fillStyle = '#8ce6d6';
  ctx.beginPath(); ctx.arc(5, -60, 2.3, 0, 7); ctx.arc(-4, -59, 1.9, 0, 7); ctx.fill();
  ctx.restore();
}

/* ---- desert snake (Egypt — procedural): a low, slithering serpent ---- */
function drawSnake(e){
  const pal = e.pal || PAL.egypt;
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w * .7);
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h); ctx.scale(Math.sign(e.vx) || 1, 1);
  if (e.dead) ctx.scale(1, -1);
  const t = e.anim, hurt = e.hurt > 0;
  const body = hurt ? '#ffb0a0' : (pal.body || '#4a8a3a');
  /* slithering body */
  ctx.strokeStyle = body; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 11; i++){ const x = -24 + i * 4, y = -6 + Math.sin(t * 10 + i * .7) * 3; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  /* head + eye + flicking tongue */
  const hy = -6 + Math.sin(t * 10 + 7.7) * 3;
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(22, hy, 7, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.arc(25, hy - 1.5, 1.6, 0, 7); ctx.fill();
  if (Math.sin(t * 7) > .5){ ctx.strokeStyle = '#e0483c'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(28, hy); ctx.lineTo(34, hy); ctx.stroke(); }
  ctx.lineCap = 'butt'; ctx.restore();
}

/* ---- shield soldier (Levant — sprite body + drawn shield): same army
   sprite as the bandit, but carrying a tall steel shield on his facing
   side. The shield flashes bright when a blocked hit clangs off it. ---- */
function drawShieldman(e){
  drawSoldierBody(e, SOLDIER_H);
  if (!e.dead){
    /* shield size/anchor scaled up along with the body (both were sized
       for the old 66px-tall sprite) so it still sits over the chest */
    const k = SOLDIER_H / 66, d = Math.sign(e.vx) || 1;
    ctx.save();
    ctx.translate(e.x + e.w / 2 + d * 17 * k, e.y + e.h - 27 * k);
    const flash = e.blockT > 0;
    ctx.fillStyle = flash ? '#eef2f6' : '#8a929c';
    ctx.beginPath(); ctx.ellipse(0, 0, 8 * k, 17 * k, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#4a525c'; ctx.lineWidth = 2.4 * k;
    ctx.beginPath(); ctx.ellipse(0, 0, 8 * k, 17 * k, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = '#d4af37'; ctx.beginPath(); ctx.arc(0, 0, 3.2 * k, 0, 7); ctx.fill();
    if (flash){
      ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(1, e.blockT * 4) + ')';
      ctx.lineWidth = 2 * k;
      ctx.beginPath(); ctx.moveTo(d * 6 * k, -14 * k); ctx.lineTo(d * 14 * k, -20 * k);
      ctx.moveTo(d * 8 * k, 0); ctx.lineTo(d * 17 * k, 0);
      ctx.moveTo(d * 6 * k, 14 * k); ctx.lineTo(d * 14 * k, 20 * k); ctx.stroke();
    }
    ctx.restore();
  }
  if (e.alert > 0 && !e.dead){
    ctx.fillStyle = 'rgba(255,220,80,' + Math.min(1, e.alert * 2) + ')';
    ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x + e.w / 2, e.y - 10 - Math.sin(e.alert * 12) * 3);
  }
}

/* ---- falcon (Levant — procedural): a hovering raptor. Wings beat in a
   slow glide on patrol, fold back into a dart while diving. ---- */
function drawFalcon(e){
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
  const d = e.mode === 'dive' ? (Math.sign(e.dvx) || 1) : (Math.sign(e.vx) || 1);
  ctx.scale(d, 1);
  if (e.dead) ctx.scale(1, -1);
  const hurt = e.hurt > 0;
  const body = hurt ? '#ffb0a0' : '#6a4a34', wing = hurt ? '#ffb0a0' : '#4e3626';
  const dive = e.mode === 'dive' && !e.dead;
  const flap = dive ? -.9 : Math.sin(e.anim * 9) * .8;
  /* wings */
  ctx.fillStyle = wing;
  for (const s of [-1, 1]){
    ctx.save(); ctx.rotate(flap * s * (dive ? 1 : .8));
    ctx.beginPath(); ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-10, -14 * s * 0 - 16, -30, dive ? 10 : -8);
    ctx.quadraticCurveTo(-14, -2, -2, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* body + tail */
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(2, 0, 15, 8, dive ? .35 : 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(-24, -1 + Math.sin(e.anim * 6) * 2); ctx.lineTo(-12, 4); ctx.closePath(); ctx.fill();
  /* head, beak, eye */
  ctx.fillStyle = body; ctx.beginPath(); ctx.arc(15, -4, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8b23c'; ctx.beginPath(); ctx.moveTo(20, -5); ctx.lineTo(27, -2); ctx.lineTo(20, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.arc(16, -5, 1.8, 0, 7); ctx.fill();
  ctx.restore();
  if (e.alert > 0 && !e.dead){
    ctx.fillStyle = 'rgba(255,220,80,' + Math.min(1, e.alert * 2) + ')';
    ctx.font = 'bold 20px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x + e.w / 2, e.y - 8);
  }
}

/* ---- snow leopard (Levant — procedural): a pale spotted cat. Crouches
   low through the pounce telegraph, stretches out mid-leap. ---- */
function drawLeopard(e){
  const pal = e.pal || PAL.snow;
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w * .85);
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h); ctx.scale(Math.sign(e.vx) || 1, 1);
  if (e.dead) ctx.scale(1, -1);
  const hurt = e.hurt > 0;
  const bodyC = hurt ? '#ffb0a0' : '#dce4ec', darkC = hurt ? '#ffb0a0' : '#9aa6b4';
  const crouch = e.pounceWind > 0, leap = e.pounceT > 0 && !e.onG;
  const run = Math.sin(e.anim * 15);
  if (crouch) ctx.scale(1.08, .75);
  if (leap) ctx.scale(1.2, .85);
  /* legs (trot / tucked in flight) */
  ctx.strokeStyle = darkC; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath();
  if (leap){
    ctx.moveTo(-14, -8); ctx.lineTo(-20, -3);
    ctx.moveTo(14, -8); ctx.lineTo(21, -3);
  } else {
    ctx.moveTo(-13, -7); ctx.lineTo(-13 + run * 4, 0);
    ctx.moveTo(12, -7); ctx.lineTo(12 - run * 4, 0);
    ctx.moveTo(-6, -8); ctx.lineTo(-6 - run * 3, 0);
    ctx.moveTo(5, -8); ctx.lineTo(5 + run * 3, 0);
  }
  ctx.stroke();
  /* body */
  ctx.fillStyle = bodyC;
  ctx.beginPath(); ctx.ellipse(-1, -15, 20, 10, leap ? -.12 : 0, 0, 7); ctx.fill();
  /* rosette spots */
  ctx.fillStyle = 'rgba(90,100,115,.55)';
  for (const [sx, sy] of [[-12, -17], [-4, -13], [4, -18], [11, -13], [-8, -20]]){
    ctx.beginPath(); ctx.arc(sx, sy, 2, 0, 7); ctx.fill();
  }
  /* thick tail */
  ctx.strokeStyle = bodyC; ctx.lineWidth = 5.5;
  ctx.beginPath(); ctx.moveTo(-19, -16);
  ctx.quadraticCurveTo(-30, -24 + run * 2, -33, -12); ctx.stroke();
  /* head + ears */
  ctx.fillStyle = bodyC;
  ctx.beginPath(); ctx.arc(18, -19, 8, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(13, -25); ctx.lineTo(15, -31); ctx.lineTo(18, -24); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(20, -25); ctx.lineTo(24, -30); ctx.lineTo(24, -23); ctx.closePath(); ctx.fill();
  /* muzzle + eye */
  ctx.fillStyle = darkC; ctx.beginPath(); ctx.ellipse(24, -16, 3.6, 2.6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = crouch || leap ? '#8fd8f0' : '#3a4650';
  ctx.beginPath(); ctx.arc(20, -21, 1.8, 0, 7); ctx.fill();
  ctx.lineCap = 'butt'; ctx.restore();
  if (e.alert > 0 && !e.dead){
    ctx.fillStyle = 'rgba(255,220,80,' + Math.min(1, e.alert * 2) + ')';
    ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x + e.w / 2, e.y - 12 - Math.sin(e.alert * 12) * 3);
  }
}

/* ---- elite evil soldier: the tougher foe blocking each new scenario's
   exit — same sprite as the rank-and-file soldier, just bigger, plus a
   nameplate and hp bar ---- */
function drawElite(e){
  drawSoldierBody(e, ELITE_H);
  if (!e.dead){
    const bw = 56, bx = e.x + e.w / 2 - bw / 2, by = e.y - 26;
    ctx.textAlign = 'center'; ctx.font = 'bold 12px Tahoma';
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(LT(e.name), e.x + e.w / 2, by - 4);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(bx, by, bw, 7, 3); ctx.fill();
    ctx.fillStyle = '#e0483c'; rr(bx, by, bw * Math.max(0, e.hp / e.maxHp), 7, 3); ctx.fill();
  }
  if (e.alert > 0 && !e.dead){
    ctx.fillStyle = 'rgba(255,220,80,' + Math.min(1, e.alert * 2) + ')';
    ctx.font = 'bold 24px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x + e.w / 2, e.y - 40 - Math.sin(e.alert * 12) * 3);
  }
}

/* ---- boss ---- */
function drawBoss(){
  const b = G.boss; if (!b) return;
  const isWarlord = b.kind === 'warlord';
  if (!b.dead) drawShadow(b.x + b.w / 2, b.y + b.h, b.w);
  ctx.save(); ctx.translate(b.x + b.w / 2, b.y); ctx.scale(b.face, 1);
  if (b.dead && isWarlord){
    /* the warlord has no death clip, so it still fakes the fall */
    ctx.translate(0, Math.min(60, b.dead * 80));
    ctx.rotate(Math.min(1.4, b.dead * 1.6));
    ctx.globalAlpha = Math.max(0, 1 - b.dead * .5);
  }

  if (isWarlord){
    /* mid-roster warlord: no matching model — stays procedural
       cool steel-blue/silver armor */
    const hurt = b.hurt > 0, wob = Math.sin(b.anim * 3) * 3;
    const wind = b.dashT > 0.9;
    const crouch = wind ? Math.sin(b.dashT * 30) * 2 + 6 : 0;
    const robeCol = hurt ? '#ffb0a0' : wind ? '#3a4d68' : '#2a3550';
    const trimCol = '#c7ccd2';
    const armCol = hurt ? '#ffb0a0' : '#2a3550';
    const chestCol = '#7a8290', chestAccent = '#aeb6c0';
    const turbanCol = '#3a4560', turban2Col = '#4a5878', jewelCol = '#7ec8e0';
    const eyeCol = wind ? '#3ec8f0' : '#1a4a5a';

    ctx.fillStyle = '#141019'; rr(-26, 84, 20, 32, 7); ctx.fill(); rr(8, 84, 20, 32, 7); ctx.fill();
    ctx.fillStyle = trimCol; ctx.fillRect(-26, 108, 20, 4); ctx.fillRect(8, 108, 20, 4);
    ctx.fillStyle = robeCol;
    ctx.beginPath(); ctx.moveTo(-40, 30 + wob + crouch); ctx.quadraticCurveTo(0, 4 + wob + crouch, 40, 30 + wob + crouch);
    ctx.lineTo(44, 78); ctx.lineTo(46, 96); ctx.lineTo(-46, 96); ctx.lineTo(-44, 78); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = trimCol; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-34, 36 + wob + crouch); ctx.lineTo(-40, 92);
    ctx.moveTo(34, 36 + wob + crouch); ctx.lineTo(40, 92); ctx.stroke();
    ctx.fillStyle = chestCol; rr(-20, 34 + wob + crouch, 40, 34, 9); ctx.fill();
    ctx.fillStyle = trimCol; ctx.beginPath(); ctx.moveTo(-20, 44 + wob + crouch); ctx.lineTo(20, 44 + wob + crouch); ctx.lineTo(16, 50 + wob + crouch); ctx.lineTo(-16, 50 + wob + crouch); ctx.closePath(); ctx.fill();
    ctx.fillStyle = chestAccent; ctx.beginPath(); ctx.arc(0, 50 + wob + crouch, 6, 0, 7); ctx.fill();
    const sl = wind ? -2.2 : (b.dashT > 0 && b.dashT <= 0.9 ? -1.8 : Math.sin(b.anim * 2.4) * .25 - .4);
    ctx.save(); ctx.translate(26, 36 + wob + crouch); ctx.rotate(sl);
    ctx.strokeStyle = armCol; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 10); ctx.stroke();
    ctx.fillStyle = chestCol; ctx.beginPath(); ctx.arc(26, 12, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8ecf0'; ctx.beginPath(); ctx.moveTo(28, 6);
    ctx.quadraticCurveTo(70, -6, 84, -30); ctx.quadraticCurveTo(60, -8, 30, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = chestCol; ctx.fillRect(24, 4, 8, 16);
    ctx.restore();
    ctx.strokeStyle = armCol; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-26, 38 + wob + crouch); ctx.lineTo(-38, 62 + wob + crouch); ctx.stroke();
    ctx.fillStyle = chestCol; ctx.beginPath(); ctx.arc(-40, 66 + wob + crouch, 7, 0, 7); ctx.fill();
    ctx.fillStyle = turbanCol; ctx.beginPath(); ctx.ellipse(4, 14 + wob + crouch, 17, 19, 0, 0, 7); ctx.fill();
    ctx.fillStyle = turban2Col; ctx.beginPath(); ctx.ellipse(4, 8 + wob + crouch, 15, 11, 0, 3.14, 0); ctx.fill();
    const eg = ctx.createRadialGradient(12, 10 + wob + crouch, 0, 12, 10 + wob + crouch, 9);
    eg.addColorStop(0, wind ? 'rgba(255,90,50,.95)' : 'rgba(120,30,20,.65)'); eg.addColorStop(1, 'rgba(255,90,50,0)');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(12, 10 + wob + crouch, 9, 0, 7); ctx.fill();
    ctx.fillStyle = eyeCol; ctx.beginPath(); ctx.arc(12, 10 + wob + crouch, 3, 0, 7); ctx.fill();
    ctx.fillStyle = trimCol; ctx.fillRect(-1, 1 + wob + crouch, 21, 4);
    ctx.beginPath(); ctx.moveTo(-11, 4 + wob + crouch); ctx.lineTo(-19, -15 + wob + crouch); ctx.lineTo(-3, -2 + wob + crouch); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(19, 2 + wob + crouch); ctx.lineTo(29, -13 + wob + crouch); ctx.lineTo(11, -2 + wob + crouch); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -4 + wob + crouch); ctx.lineTo(4, -21 + wob + crouch); ctx.lineTo(9, -4 + wob + crouch); ctx.closePath(); ctx.fill();
    ctx.fillStyle = jewelCol; ctx.beginPath(); ctx.arc(4, -7 + wob + crouch, 3.2, 0, 7); ctx.fill();
    ctx.lineCap = 'butt';
  } else {
    /* villain leader: real per-frame poses rendered from the uploaded
       "Sword and Shield" rigged model — actual skeleton/joint motion
       (idle sway, walk cycle, power-up windup, slam impact, blade-throw
       lunge, death collapse) drive the sprite instead of one static
       image being faked with a transform. */
    const hurt = b.hurt > 0, tint = hurt ? 'rgba(255,150,130,.6)' : null;
    ctx.save();
    ctx.translate(0, b.h); // origin at the feet

    if (b.dead > 0){
      const prog = Math.min(1, b.dead / 1.4);
      const idx = Math.min(LEADER_DEATH_FRAMES - 1, Math.floor(prog * LEADER_DEATH_FRAMES));
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, b.dead - 1.4) * .8);
      drawSprite(SPR.leaderDeath[idx], 150, tint);
    } else if (b.windup > 0){
      const prog = 1 - b.windup / .35;
      const idx = Math.min(LEADER_WINDUP_FRAMES - 1, Math.floor(prog * LEADER_WINDUP_FRAMES));
      const eg = ctx.createRadialGradient(6, -120, 4, 6, -120, 44); // telegraph glow
      eg.addColorStop(0, 'rgba(255,90,40,.6)'); eg.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(6, -120, 44, 0, 7); ctx.fill();
      drawSprite(SPR.leaderWindup[idx], 150, tint);
    } else if (b.slamFxT > 0){
      const prog = 1 - b.slamFxT / .4;
      const idx = Math.min(LEADER_SLAM_FRAMES - 1, Math.floor(prog * LEADER_SLAM_FRAMES));
      drawSprite(SPR.leaderSlam[idx], 150, tint);
    } else if (b.act === 'slam'){
      // airborne leap before landing — hold the fully wound-up strike pose
      drawSprite(SPR.leaderWindup[LEADER_WINDUP_FRAMES - 1], 150, tint);
    } else if (b.act === 'throw'){
      const prog = 1 - Math.max(0, b.actT) / .9;
      const idx = Math.min(LEADER_THROW_FRAMES - 1, Math.floor(prog * LEADER_THROW_FRAMES));
      drawSprite(SPR.leaderThrow[idx], 150, tint);
    } else if (b.act === 'walk'){
      const idx = Math.floor(b.anim * 6.5) % LEADER_WALK_FRAMES;
      drawSprite(SPR.leaderWalk[idx], 150, tint);
    } else {
      const idx = Math.floor(b.anim * 1.4) % LEADER_IDLE_FRAMES;
      drawSprite(SPR.leaderIdle[idx], 150, tint);
    }
    ctx.restore();
  }
  ctx.restore();
  /* blades */
  for (const bl of b.blades){
    ctx.save(); ctx.translate(bl.x, bl.y);
    if (bl.ground){
      const fg = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
      fg.addColorStop(0, 'rgba(255,200,90,.95)'); fg.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill();
    } else {
      ctx.rotate(bl.t * 14);
      ctx.fillStyle = '#dfe4ea';
      for (let i = 0; i < 3; i++){
        ctx.rotate(2.09); ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(14, -4); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
}

/* ---- princess Nawfa: real character-model sprite. Chains and the
   freed golden aura/sparkle stay vector overlays since they represent
   the captivity state rather than the character herself. ---- */
function drawPrincess(dt){
  const pr = G.princess; if (!pr) return;
  pr.anim += dt;
  const t = pr.anim, b = Math.sin(t * 2.2) * 2, sway = Math.sin(t * 1.6) * 3;
  ctx.save(); ctx.translate(pr.x + 20, pr.y + 42);

  if (pr.freed){
    const gl = ctx.createRadialGradient(0, -46, 6, 0, -46, 52);
    gl.addColorStop(0, 'rgba(255,232,150,.4)'); gl.addColorStop(1, 'rgba(255,232,150,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -46, 52, 0, 7); ctx.fill();
  }

  ctx.save();
  ctx.translate(sway * .3, b);
  const s = 1 + Math.sin(t * 2.2) * .02;         // gentle breathing
  ctx.scale(s, 2 - s);
  ctx.rotate(sway * .01);                          // soft weight-shift sway
  if (pr.freed) ctx.translate(0, -Math.abs(Math.sin(t * 4)) * 3); // little joyful bob once freed
  drawSprite(SPR.princess, 84);
  ctx.restore();

  /* sparkle when freed */
  if (pr.freed){
    const sp = Math.abs(Math.sin(t * 3));
    ctx.fillStyle = 'rgba(255,255,255,' + (.4 + sp * .5) + ')';
    ctx.beginPath(); ctx.arc(11, -62 + b, 1 + sp, 0, 7); ctx.arc(-12, -56 + b, .8 + sp * .6, 0, 7); ctx.fill();
  }

  /* chains until freed */
  if (!pr.freed){
    ctx.strokeStyle = '#8a929b'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(-3, -27 + b); ctx.quadraticCurveTo(-22, -20, -30, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, -27 + b); ctx.quadraticCurveTo(22, -20, 30, -8); ctx.stroke();
    ctx.fillStyle = '#5b636b';
    ctx.beginPath(); ctx.arc(-5, -27 + b, 2.4, 0, 7); ctx.arc(5, -27 + b, 2.4, 0, 7); ctx.fill();
  }
  ctx.restore();
}
