"use strict";
/* =========================================================
   actors.js — character rendering. The hero, the bandit/thrower/
   elite "evil soldier" trio, the chief boss and the princess are
   real image sprites rendered from the uploaded 3D character
   models (img/*.png). The scorpion, wolf and mid-roster warlord
   boss have no matching model and stay procedural vector art.
   Sprites carry no skeleton, so motion is faked by transforming
   the whole rigid image (lean, bob, squash/stretch, rotation)
   instead of animating limbs.
   ========================================================= */

function loadSprite(src){ const img = new Image(); img.src = src; return img; }
const HERO_RUN_FRAMES = 10, HERO_JUMP_FRAMES = 8, HERO_ROLL_FRAMES = 8;
const SPR = {
  hero: loadSprite('img/hero.png'),
  soldier: loadSprite('img/soldier.png'),
  leader: loadSprite('img/leader.png'),
  princess: loadSprite('img/princess.png'),
  /* real running/jumping/rolling animation frames, rendered from the
     rigged hero model (Jogging / Jump Up clips, and a hand-keyed tuck
     pose on the same skeleton for the roll) rather than faked — the
     actual joints bend and the cloak flows per frame */
  heroRun: Array.from({length: HERO_RUN_FRAMES}, (_, i) => loadSprite(`img/hero_run/run_${i}.png`)),
  heroJump: Array.from({length: HERO_JUMP_FRAMES}, (_, i) => loadSprite(`img/hero_jump/jump_${i}.png`)),
  heroRoll: Array.from({length: HERO_ROLL_FRAMES}, (_, i) => loadSprite(`img/hero_roll/roll_${i}.png`)),
  sword: loadSprite('img/sword.png')
};
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

  if (run){
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
      /* fireball "punch": a quick forward jab + lean, so the fire clearly
         launches off the thrusting fist rather than drifting from the body */
      const pr = 1 - Math.max(0, P.punchT) / .28;
      const jab = Math.sin(Math.min(1, pr) * Math.PI);   // 0 → 1 → 0 over the throw
      xOff = jab * 11; rot = -.08 - jab * .14;
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
    /* fire bursting off the thrusting fist: a knuckle + a bright flame that
       swells as the arm reaches full extension, positioned at the hand (the
       body's punch lunge above already carried the whole pose forward) */
    const pr = 1 - Math.max(0, P.punchT) / .28;
    const jab = Math.sin(Math.min(1, pr) * Math.PI);
    ctx.save(); ctx.translate(30 + jab * 8, -60);
    ctx.fillStyle = '#c69a54';                        // fist / knuckle
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill();
    const R = 10 + jab * 17;                          // flame grows through the throw
    const fg = ctx.createRadialGradient(6, 0, 2, 6, 0, R);
    fg.addColorStop(0, 'rgba(255,244,190,.95)');
    fg.addColorStop(.45, 'rgba(255,150,50,.85)');
    fg.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(6, 0, R, 0, 7); ctx.fill();
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

/* ---- evil soldier: shared sprite-based body for the bandit/thrower/
   elite trio so the whole enemy roster reads as one army — only the
   display height, shadow width and post-body overlays (nameplate,
   alert) differ per type. No rig, so windup/lunge/marching are faked
   by leaning and bobbing the whole rigid sprite. ---- */
function drawSoldierBody(e, h){
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w * (h > 70 ? 1.1 : 1));
  /* sprite base faces RIGHT; scale(d,1) turns it to the patrol direction */
  const hurt = e.hurt > 0, d = Math.sign(e.vx) || 1;
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h);
  ctx.scale(d, 1);
  if (e.dead) ctx.rotate(.9);
  else {
    const windup = e.windup > 0 || e.throwWindup > 0, lunge = e.lunge > 0;
    const march = e.anim * 10;
    let rot, yOff;
    if (windup){ rot = -.26; yOff = -2; }                              // rear back to strike/throw
    else if (lunge){ rot = .2; yOff = -Math.abs(Math.sin(march)) * 3; } // committed forward lunge
    else { rot = Math.sin(march) * .06; yOff = -Math.abs(Math.sin(march)) * 3.4; } // marching hop + sway
    ctx.translate(0, yOff);
    ctx.rotate(rot);
  }
  drawSprite(SPR.soldier, h, hurt ? 'rgba(255,150,130,.6)' : null);
  ctx.restore();
}
function drawBandit(e){
  drawSoldierBody(e, 66);
  if (e.alert > 0 && !e.dead){
    ctx.fillStyle = 'rgba(255,220,80,' + Math.min(1, e.alert * 2) + ')';
    ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x + e.w / 2, e.y - 10 - Math.sin(e.alert * 12) * 3);
  }
}
function drawThrower(e){
  drawSoldierBody(e, 66);
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

/* ---- elite evil soldier: the tougher foe blocking each new scenario's
   exit — same sprite as the rank-and-file soldier, just bigger, plus a
   nameplate and hp bar ---- */
function drawElite(e){
  drawSoldierBody(e, 84);
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
  if (b.dead){
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
    /* villain leader: real character-model sprite (base faces right; the
       boss's ctx.scale(b.face,1) turns it toward the player). Motion is
       faked on the rigid image — a heavy looming breath while idle, a
       rear-back + red head-glow telegraph on the windup, and a forward
       lunge on the slam. */
    const hurt = b.hurt > 0, breathe = Math.sin(b.anim * 2.2);
    const wind = b.windup > 0, slam = b.act === 'slam';
    ctx.save();
    ctx.translate(0, b.h);                       // origin at the feet
    let rot = breathe * .03, rise = breathe * 2; // idle looming sway
    if (wind){ rot = -.13; rise = -6 - Math.abs(Math.sin(b.windup * 30)) * 4; }
    else if (slam){ rot = .15; rise = 5; }
    ctx.translate(0, rise);
    const s = 1 + breathe * .02;                 // breathing
    ctx.scale(s, 2 - s);
    ctx.rotate(rot);
    if (wind){
      const eg = ctx.createRadialGradient(6, -120, 4, 6, -120, 44);
      eg.addColorStop(0, 'rgba(255,90,40,.6)'); eg.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(6, -120, 44, 0, 7); ctx.fill();
    }
    drawSprite(SPR.leader, 150, hurt ? 'rgba(255,150,130,.6)' : null);
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
