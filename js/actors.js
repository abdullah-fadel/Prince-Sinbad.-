"use strict";
/* =========================================================
   actors.js — procedural character drawing: hero, scorpion,
   bandit, boss, princess. All vector-drawn, no sprites.
   ========================================================= */

/* ---- HERO: original Arabian adventurer (lean, bearded, ghutra + red bisht) ---- */
function drawHero(){
  if (!P.dead) drawShadow(P.x + P.w / 2, P.y + P.h, P.w);
  const x = P.x + P.w / 2, y = P.y, t = P.anim, run = P.state === 'run';
  const flick = P.inv > 0 && Math.floor(P.inv * 12) % 2 === 0;
  if (flick) return;
  ctx.save(); ctx.translate(x, y);
  /* squash & stretch anchored at the feet */
  const sq = P.squash, st = P.stretch;
  if (sq > 0 || st > 0){
    ctx.translate(0, 55);
    ctx.scale(1 + sq * .5 - st * .3, 1 - sq * .5 + st * .35);
    ctx.translate(0, -55);
  }
  ctx.scale(P.face, 1);
  if (P.dead) ctx.rotate(Math.sin(t * 3) * .3);
  /* dodge roll: spin the whole body once through the dash */
  if (P.state === 'roll'){
    const spin = (1 - Math.max(0, P.rollT) / ROLL_TIME) * 6.283;
    ctx.translate(0, 30); ctx.rotate(spin); ctx.translate(0, -30);
  }
  const leg = run ? Math.sin(t * 13) * 1 : 0, arm = run ? Math.sin(t * 13 + 3.14) : 0;
  /* idle breathing */
  const br = P.state === 'idle' ? Math.sin(t * 2.4) * 1.2 : 0;
  /* --- cloak (bright red bisht vest) flowing behind --- */
  const flow = Math.min(1, Math.abs(P.vx) / 265), wob = Math.sin(t * 9) * 4 * flow;
  ctx.fillStyle = '#C4202E';
  ctx.beginPath(); ctx.moveTo(-4, 12);
  ctx.quadraticCurveTo(-20 - 24 * flow, 26 + wob, -16 - 30 * flow, 52 + wob * .6);
  ctx.lineTo(-8, 54); ctx.lineTo(-2, 20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7A1520'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-4, 14);
  ctx.quadraticCurveTo(-19 - 23 * flow, 27 + wob, -15 - 29 * flow, 51 + wob * .6); ctx.stroke();
  /* --- legs / white thobe skirt --- */
  ctx.fillStyle = '#F6F1E7';
  ctx.beginPath(); ctx.moveTo(-9, 26); ctx.lineTo(9, 26); ctx.lineTo(12, 50); ctx.lineTo(-12, 50); ctx.closePath(); ctx.fill();
  /* sandaled feet */
  ctx.fillStyle = '#c8935f';
  const f1 = leg * 7, f2 = -leg * 7;
  ctx.beginPath(); ctx.ellipse(-5 + f1, 55, 6, 4, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6 + f2, 55, 6, 4, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#6b3f1e'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9 + f1, 54); ctx.lineTo(-1 + f1, 54);
  ctx.moveTo(2 + f2, 54); ctx.lineTo(10 + f2, 54); ctx.stroke();
  /* --- torso: thobe + open bisht --- */
  ctx.fillStyle = '#F6F1E7'; rr(-9, 8 + br, 18, 22 - br, 6); ctx.fill();
  ctx.fillStyle = '#C4202E';
  ctx.beginPath(); ctx.moveTo(-10, 8 + br); ctx.lineTo(-4, 8 + br); ctx.lineTo(-6, 30); ctx.lineTo(-12, 28); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 8 + br); ctx.lineTo(4, 8 + br); ctx.lineTo(6, 30); ctx.lineTo(12, 28); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7A1520'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-5, 9 + br); ctx.lineTo(-7, 29); ctx.moveTo(5, 9 + br); ctx.lineTo(7, 29); ctx.stroke();
  ctx.fillStyle = '#D4AF37'; ctx.fillRect(-8, 24, 16, 3); // belt
  /* --- arms (bare hands, tan skin) --- */
  ctx.strokeStyle = '#C4202E'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  if (P.swordT > 0){
    /* scimitar swing: overhead → forward, with a bright slash arc */
    const prog = 1 - P.swordT / SWORD_TIME, ang = -1.5 + prog * 2.7;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,250,230,' + (.75 * (1 - prog)) + ')'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(6, 14, 32, ang - .7, ang + .7); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#8E1F2F'; ctx.lineWidth = 6;
    ctx.save(); ctx.translate(4, 13); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.fillStyle = '#d8a06b'; ctx.beginPath(); ctx.arc(15, 0, 4.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#D4AF37'; ctx.fillRect(12, -4, 5, 8);         // hilt guard
    ctx.strokeStyle = '#eef2f6'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(17, 0); ctx.quadraticCurveTo(42, -8, 56, 8); ctx.stroke(); // curved blade
    ctx.restore();
    ctx.beginPath(); ctx.strokeStyle = '#8E1F2F'; ctx.lineWidth = 6;
    ctx.moveTo(-4, 13); ctx.lineTo(-11, 20); ctx.stroke();
    ctx.fillStyle = '#d8a06b'; ctx.beginPath(); ctx.arc(-12, 21, 4, 0, 7); ctx.fill();
  } else if (P.state === 'attack'){
    ctx.beginPath(); ctx.moveTo(4, 13); ctx.lineTo(20, 12); ctx.stroke();
    ctx.fillStyle = '#d8a06b'; ctx.beginPath(); ctx.arc(23, 12, 4.4, 0, 7); ctx.fill();
    const fg = ctx.createRadialGradient(28, 12, 2, 28, 12, 20);
    fg.addColorStop(0, 'rgba(255,170,60,.8)'); fg.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(28, 12, 20, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4, 13); ctx.lineTo(-11, 20); ctx.stroke();
    ctx.fillStyle = '#d8a06b'; ctx.beginPath(); ctx.arc(-12, 21, 4, 0, 7); ctx.fill();
  } else if (P.state === 'climb'){
    const cy = Math.sin(t * 8) * 5;
    ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(8, -2 + cy); ctx.moveTo(-4, 12); ctx.lineTo(-8, -2 - cy); ctx.stroke();
    ctx.fillStyle = '#d8a06b';
    ctx.beginPath(); ctx.arc(8, -3 + cy, 4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-8, -3 - cy, 4, 0, 7); ctx.fill();
  } else if (P.state === 'jump' || P.state === 'fall'){
    ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(13, 4); ctx.moveTo(-4, 12); ctx.lineTo(-12, 18); ctx.stroke();
    ctx.fillStyle = '#d8a06b';
    ctx.beginPath(); ctx.arc(14, 3, 4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-13, 19, 4, 0, 7); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(4, 12 + br); ctx.lineTo(10 + arm * 6, 22 + br);
    ctx.moveTo(-4, 12 + br); ctx.lineTo(-10 - arm * 6, 22 + br); ctx.stroke();
    ctx.fillStyle = '#d8a06b';
    ctx.beginPath(); ctx.arc(10 + arm * 6, 24 + br, 4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-10 - arm * 6, 24 + br, 4, 0, 7); ctx.fill();
  }
  ctx.lineCap = 'butt';
  /* --- head --- */
  ctx.save(); ctx.translate(0, br);
  ctx.fillStyle = '#d8a06b'; ctx.beginPath(); ctx.ellipse(1, -3, 9.5, 10.5, 0, 0, 7); ctx.fill(); // face
  /* beard: full and dark, trim around jaw */
  ctx.fillStyle = '#17110a';
  ctx.beginPath(); ctx.moveTo(-8, -4); ctx.quadraticCurveTo(-9, 10, 1, 11); ctx.quadraticCurveTo(11, 10, 10, -4);
  ctx.lineTo(8, -2); ctx.quadraticCurveTo(8, 5, 1, 6); ctx.quadraticCurveTo(-6, 5, -6, -2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 1.5, 4.5, 1.7, 0, 0, 7); ctx.fill(); // moustache
  /* mouth */
  if (P.state === 'victory'){ ctx.fillStyle = '#5a2b1c'; ctx.beginPath(); ctx.arc(4, 4, 2.4, 0, 3.14); ctx.fill(); }
  /* nose (small) */
  ctx.fillStyle = '#c78d59'; ctx.beginPath(); ctx.ellipse(8, -1, 2.6, 3.2, 0, 0, 7); ctx.fill();
  /* eyes (blink every few seconds) */
  const blink = (t % 3.7) > 3.55;
  if (!blink){
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(5.5, -6, 2.6, 3.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(6.3, -6, 1.5, 0, 7); ctx.fill();
  } else {
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(3, -6); ctx.lineTo(8, -6); ctx.stroke();
  }
  ctx.strokeStyle = '#17110a'; ctx.lineWidth = 1.9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(2.4, -9.8); ctx.lineTo(9, -10.6); ctx.stroke(); // stern angled brow
  ctx.lineCap = 'butt';
  /* ghutra (white headdress) + black agal */
  ctx.fillStyle = '#F6F1E7';
  ctx.beginPath(); ctx.moveTo(-9, -8); ctx.quadraticCurveTo(-1, -17, 9, -8);
  ctx.lineTo(9, -5); ctx.quadraticCurveTo(-1, -13, -9, -5); ctx.closePath(); ctx.fill();
  /* draped tail flowing behind */
  const gt = Math.sin(t * 8) * 3 * Math.max(.3, flow);
  ctx.beginPath(); ctx.moveTo(-8, -8); ctx.quadraticCurveTo(-16, -2 + gt, -15 - 14 * flow, 14 + gt);
  ctx.quadraticCurveTo(-10, 10, -7, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.beginPath(); ctx.moveTo(-8, -7); ctx.quadraticCurveTo(-14, 0 + gt, -13 - 12 * flow, 12 + gt);
  ctx.lineTo(-9, 6); ctx.closePath(); ctx.fill();
  /* agal: plain solid black band */
  ctx.strokeStyle = '#0e0e0e'; ctx.lineWidth = 4.4;
  ctx.beginPath(); ctx.ellipse(0, -11, 9, 3.4, 0, 0, 7); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/* ---- scorpion ---- */
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

/* ---- evil soldier: dark horned armor, glowing eyes, curved blade —
   shared silhouette language (armor/gold/eye-glow palette) reused by
   bandit/thrower/elite so the whole enemy roster reads as one army ---- */
const SOLDIER_PAL = { armor:'#231f28', armorLt:'#332c38', gold:'#c9982e', goldDk:'#8a6a1e', gem:'#c23b3b', blade:'#3a3d42', eye:'#ff4630' };
function drawSoldierHead(sp, hurt, hornScale){
  const armor = hurt ? '#ffb0a0' : sp.armor;
  /* helm */
  ctx.fillStyle = armor; ctx.beginPath(); ctx.arc(2, 8, 9, 0, 7); ctx.fill();
  /* eye glow (no visible face under the visor) */
  const eg = ctx.createRadialGradient(6, 6.2, 0, 6, 6.2, 4.4);
  eg.addColorStop(0, 'rgba(255,80,50,.95)'); eg.addColorStop(1, 'rgba(255,80,50,0)');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(6, 6.2, 4.4, 0, 7); ctx.fill();
  ctx.fillStyle = sp.eye; ctx.beginPath(); ctx.arc(6, 6.2, 1.4, 0, 7); ctx.fill();
  /* visor band */
  ctx.fillStyle = hurt ? '#ffb0a0' : sp.goldDk; ctx.fillRect(-6, 3, 16, 4);
  /* horns */
  ctx.fillStyle = hurt ? '#ffb0a0' : sp.gold;
  ctx.beginPath(); ctx.moveTo(-6, 1); ctx.lineTo(-9 - 3 * hornScale, -6 - 4 * hornScale); ctx.lineTo(-2, -1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(13 + 3 * hornScale, -5 - 4 * hornScale); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = sp.gem;
  ctx.beginPath(); ctx.arc(-8 - 2 * hornScale, -5 - 3 * hornScale, 1.3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(11 + 2 * hornScale, -4 - 3 * hornScale, 1.3, 0, 7); ctx.fill();
  /* brow ridge */
  ctx.fillStyle = hurt ? '#ffb0a0' : sp.goldDk; ctx.fillRect(-7, -1, 18, 3);
}

/* ---- bandit-line grunt: evil soldier with a curved blade ---- */
function drawBandit(e){
  const sp = SOLDIER_PAL;
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w);
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y); const d = Math.sign(e.vx) || 1; ctx.scale(d, 1);
  if (e.dead) ctx.rotate(.9);
  const run = Math.sin(e.anim * 11) * 5, hurt = e.hurt > 0;
  const armor = hurt ? '#ffb0a0' : sp.armor, armorLt = hurt ? '#ffb0a0' : sp.armorLt;
  /* legs (dark greaves) */
  ctx.fillStyle = armor;
  ctx.fillRect(-8 + run * .4, 38, 7, 14); ctx.fillRect(2 - run * .4, 38, 7, 14);
  ctx.fillStyle = sp.gold; ctx.fillRect(-8 + run * .4, 48, 7, 3); ctx.fillRect(2 - run * .4, 48, 7, 3);
  /* short tattered cape */
  ctx.fillStyle = '#1a1620';
  ctx.beginPath(); ctx.moveTo(-10, 18); ctx.quadraticCurveTo(-19, 30, -14, 47); ctx.lineTo(-11, 47); ctx.lineTo(-7, 40); ctx.lineTo(-7, 20); ctx.closePath(); ctx.fill();
  /* body (armored torso) */
  ctx.fillStyle = armorLt; rr(-11, 16, 22, 26, 7); ctx.fill();
  ctx.strokeStyle = sp.gold; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-11, 24); ctx.lineTo(11, 24); ctx.stroke();
  ctx.fillStyle = sp.goldDk; ctx.fillRect(-11, 28, 22, 4);
  ctx.fillStyle = sp.gem; ctx.beginPath(); ctx.arc(0, 21, 2.4, 0, 7); ctx.fill();
  /* sword arm — raised high during windup, thrust while lunging */
  ctx.strokeStyle = armorLt; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const sw = e.windup > 0 ? -1.6 : e.lunge > 0 ? -.9 : Math.sin(e.anim * 11) * .2;
  ctx.save(); ctx.translate(8, 20); ctx.rotate(sw);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 4); ctx.stroke();
  ctx.fillStyle = sp.blade;
  ctx.beginPath(); ctx.moveTo(10, 2); ctx.quadraticCurveTo(24, -7, 31, -2); ctx.quadraticCurveTo(21, 4, 11, 7); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sp.gem; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(12, 3); ctx.quadraticCurveTo(22, -4, 28, -1); ctx.stroke();
  ctx.restore();
  drawSoldierHead(sp, hurt, .4);
  ctx.lineCap = 'butt'; ctx.restore();
  /* alert "!" when the soldier spots the player */
  if (e.alert > 0 && !e.dead){
    ctx.fillStyle = 'rgba(255,220,80,' + Math.min(1, e.alert * 2) + ')';
    ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x + e.w / 2, e.y - 10 - Math.sin(e.alert * 12) * 3);
  }
}

/* ---- wolf: low, fast forest/mountain predator ---- */
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
   exit — bigger horns and a full cape, same armor language as the
   rank-and-file bandit/thrower ---- */
function drawElite(e){
  const sp = SOLDIER_PAL;
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w * 1.1);
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y); const d = Math.sign(e.vx) || 1; ctx.scale(d, 1);
  if (e.dead) ctx.rotate(.9);
  const run = Math.sin(e.anim * 9) * 5, hurt = e.hurt > 0;
  const armor = hurt ? '#ffb0a0' : sp.armor, armorLt = hurt ? '#ffb0a0' : sp.armorLt;
  /* legs */
  ctx.fillStyle = armor;
  ctx.fillRect(-11 + run * .3, 46, 9, 18); ctx.fillRect(3 - run * .3, 46, 9, 18);
  ctx.fillStyle = sp.gold; ctx.fillRect(-11 + run * .3, 60, 9, 3); ctx.fillRect(3 - run * .3, 60, 9, 3);
  /* tattered cape (dark with a red-bled hem, like the leader's) */
  ctx.fillStyle = '#1a1620';
  ctx.beginPath(); ctx.moveTo(-14, 14); ctx.quadraticCurveTo(-26, 30, -20, 58); ctx.lineTo(-16, 52); ctx.lineTo(-10, 54); ctx.lineTo(-10, 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7A1420';
  ctx.beginPath(); ctx.moveTo(-22, 50); ctx.lineTo(-19, 60); ctx.lineTo(-15, 51); ctx.closePath(); ctx.fill();
  /* body (broader than a bandit) */
  ctx.fillStyle = armorLt; rr(-14, 18, 28, 32, 8); ctx.fill();
  ctx.strokeStyle = sp.gold; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-14, 27); ctx.lineTo(14, 27); ctx.stroke();
  ctx.fillStyle = sp.goldDk; ctx.fillRect(-14, 34, 28, 5);
  ctx.fillStyle = sp.gem; ctx.beginPath(); ctx.arc(0, 24, 3, 0, 7); ctx.fill();
  /* pauldrons */
  ctx.fillStyle = sp.gold;
  ctx.beginPath(); ctx.ellipse(-13, 20, 5, 6, .3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(13, 20, 5, 6, -.3, 0, 7); ctx.fill();
  /* sword arm */
  ctx.strokeStyle = armorLt; ctx.lineWidth = 6.5; ctx.lineCap = 'round';
  const sw = e.windup > 0 ? -1.6 : e.lunge > 0 ? -.9 : Math.sin(e.anim * 9) * .2;
  ctx.save(); ctx.translate(11, 24); ctx.rotate(sw);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(13, 5); ctx.stroke();
  ctx.fillStyle = sp.blade; ctx.beginPath(); ctx.moveTo(13, 2); ctx.quadraticCurveTo(32, -10, 41, -5); ctx.quadraticCurveTo(28, 5, 14, 9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sp.gem; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(16, 3); ctx.quadraticCurveTo(30, -8, 38, -4); ctx.stroke();
  ctx.restore();
  /* head + tall horned crown-helm */
  ctx.fillStyle = armor; ctx.beginPath(); ctx.arc(3, 9, 11, 0, 7); ctx.fill();
  const eg = ctx.createRadialGradient(9, 7, 0, 9, 7, 5.4);
  eg.addColorStop(0, 'rgba(255,80,50,.95)'); eg.addColorStop(1, 'rgba(255,80,50,0)');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(9, 7, 5.4, 0, 7); ctx.fill();
  ctx.fillStyle = sp.eye; ctx.beginPath(); ctx.arc(9, 7, 1.7, 0, 7); ctx.fill();
  ctx.fillStyle = sp.goldDk; ctx.fillRect(-8, 3, 21, 5);
  ctx.fillStyle = sp.gold;
  ctx.beginPath(); ctx.moveTo(-8, 1); ctx.lineTo(-13, -10); ctx.lineTo(-3, -1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(19, -9); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(3, -13); ctx.lineTo(6, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = sp.gem; ctx.beginPath(); ctx.arc(3, -9, 1.6, 0, 7); ctx.fill();
  ctx.fillStyle = sp.goldDk; ctx.fillRect(-10, -1, 26, 4);
  ctx.lineCap = 'butt'; ctx.restore();

  /* nameplate + hp bar */
  if (!e.dead){
    const bw = 56, bx = e.x + e.w / 2 - bw / 2, by = e.y - 26;
    ctx.textAlign = 'center'; ctx.font = 'bold 12px Tahoma';
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(LT(e.name), e.x + e.w / 2, by - 4);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(bx, by, bw, 7, 3); ctx.fill();
    ctx.fillStyle = '#e0483c'; rr(bx, by, bw * Math.max(0, e.hp / e.maxHp), 7, 3); ctx.fill();
  }
  /* alert "!" like the rest of the roster */
  if (e.alert > 0 && !e.dead){
    ctx.fillStyle = 'rgba(255,220,80,' + Math.min(1, e.alert * 2) + ')';
    ctx.font = 'bold 24px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x + e.w / 2, e.y - 40 - Math.sin(e.alert * 12) * 3);
  }
}

/* ---- thrower: same evil-soldier silhouette as the bandit so the roster
   reads as one army, but the arm pose telegraphs a knife throw, not a
   sword swing ---- */
function drawThrower(e){
  const sp = SOLDIER_PAL;
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w);
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y); const d = Math.sign(e.vx) || 1; ctx.scale(d, 1);
  if (e.dead) ctx.rotate(.9);
  const run = Math.sin(e.anim * 11) * 5, hurt = e.hurt > 0;
  const armor = hurt ? '#ffb0a0' : sp.armor, armorLt = hurt ? '#ffb0a0' : sp.armorLt;
  /* legs */
  ctx.fillStyle = armor;
  ctx.fillRect(-8 + run * .4, 38, 7, 14); ctx.fillRect(2 - run * .4, 38, 7, 14);
  ctx.fillStyle = sp.gold; ctx.fillRect(-8 + run * .4, 48, 7, 3); ctx.fillRect(2 - run * .4, 48, 7, 3);
  /* short tattered cape */
  ctx.fillStyle = '#1a1620';
  ctx.beginPath(); ctx.moveTo(-10, 18); ctx.quadraticCurveTo(-19, 30, -14, 46); ctx.lineTo(-11, 46); ctx.lineTo(-7, 40); ctx.lineTo(-7, 20); ctx.closePath(); ctx.fill();
  /* body */
  ctx.fillStyle = armorLt; rr(-11, 16, 22, 26, 7); ctx.fill();
  ctx.strokeStyle = sp.gold; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-11, 24); ctx.lineTo(11, 24); ctx.stroke();
  ctx.fillStyle = sp.goldDk; ctx.fillRect(-11, 28, 22, 4);
  ctx.fillStyle = sp.gem; ctx.beginPath(); ctx.arc(0, 21, 2.4, 0, 7); ctx.fill();
  /* throwing arm — cocked back during the windup, released after */
  ctx.strokeStyle = armorLt; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const tw = e.throwWindup > 0 ? -2.0 : Math.sin(e.anim * 11) * .2;
  ctx.save(); ctx.translate(8, 20); ctx.rotate(tw);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9, 3); ctx.stroke();
  ctx.fillStyle = sp.blade; ctx.beginPath(); ctx.moveTo(9, 1); ctx.lineTo(19, -2); ctx.lineTo(10, 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sp.gem; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(17, -1); ctx.stroke();
  ctx.restore();
  drawSoldierHead(sp, hurt, .4);
  ctx.lineCap = 'butt'; ctx.restore();
  /* alert "!" when the thrower spots the player */
  if (e.alert > 0 && !e.dead){
    ctx.fillStyle = 'rgba(255,220,80,' + Math.min(1, e.alert * 2) + ')';
    ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x + e.w / 2, e.y - 10 - Math.sin(e.alert * 12) * 3);
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
  const hurt = b.hurt > 0, wob = Math.sin(b.anim * 3) * 3;
  /* telegraph: the chief crouches before a vertical slam; the warlord
     crouches before its horizontal dash burst — same visual language,
     driven by a different timer per kind */
  const wind = isWarlord ? (b.dashT > 0.9) : (b.windup > 0);
  const crouch = wind ? Math.sin((isWarlord ? b.dashT : b.windup) * 30) * 2 + 6 : 0;

  /* palette: cool steel-blue warlord vs the chief's dark-armor/gold
     villain-leader look (horned helm, glowing eyes, tattered cape) */
  const robeCol    = hurt ? '#ffb0a0' : wind ? (isWarlord ? '#3a4d68' : '#3a1620') : (isWarlord ? '#2a3550' : '#1b1620');
  const trimCol    = isWarlord ? '#c7ccd2' : '#c9982e';
  const armCol     = hurt ? '#ffb0a0' : (isWarlord ? '#2a3550' : '#1b1620');
  const chestCol   = isWarlord ? '#7a8290' : '#2a2530';
  const chestAccent= isWarlord ? '#aeb6c0' : '#c23b3b';
  const turbanCol  = isWarlord ? '#3a4560' : '#1b1620';
  const turban2Col = isWarlord ? '#4a5878' : '#2a2230';
  const jewelCol   = isWarlord ? '#7ec8e0' : '#6a4fd4';
  const eyeCol     = wind ? (isWarlord ? '#3ec8f0' : '#ff4630') : (isWarlord ? '#1a4a5a' : '#7a1010');

  /* legs (armored boots) */
  ctx.fillStyle = '#141019'; rr(-26, 84, 20, 32, 7); ctx.fill(); rr(8, 84, 20, 32, 7); ctx.fill();
  ctx.fillStyle = trimCol; ctx.fillRect(-26, 108, 20, 4); ctx.fillRect(8, 108, 20, 4);
  /* huge robe body — tattered red-black hem for the chief, smooth hem for the warlord */
  if (!isWarlord){
    ctx.fillStyle = '#7A1420';
    ctx.beginPath(); ctx.moveTo(-40, 30 + wob + crouch); ctx.quadraticCurveTo(0, 4 + wob + crouch, 40, 30 + wob + crouch);
    ctx.lineTo(46, 98); ctx.lineTo(-46, 98); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = robeCol;
  ctx.beginPath(); ctx.moveTo(-40, 30 + wob + crouch); ctx.quadraticCurveTo(0, 4 + wob + crouch, 40, 30 + wob + crouch);
  ctx.lineTo(44, 78);
  if (isWarlord){ ctx.lineTo(46, 96); ctx.lineTo(-46, 96); }
  else {
    ctx.lineTo(38, 88); ctx.lineTo(30, 78); ctx.lineTo(22, 92); ctx.lineTo(12, 76); ctx.lineTo(4, 90);
    ctx.lineTo(-4, 76); ctx.lineTo(-12, 90); ctx.lineTo(-22, 76); ctx.lineTo(-30, 92); ctx.lineTo(-38, 78);
  }
  ctx.lineTo(-44, 78); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = trimCol; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-34, 36 + wob + crouch); ctx.lineTo(-40, 92);
  ctx.moveTo(34, 36 + wob + crouch); ctx.lineTo(40, 92); ctx.stroke();
  /* armor chest */
  ctx.fillStyle = chestCol; rr(-20, 34 + wob + crouch, 40, 34, 9); ctx.fill();
  ctx.fillStyle = trimCol; ctx.beginPath(); ctx.moveTo(-20, 44 + wob + crouch); ctx.lineTo(20, 44 + wob + crouch); ctx.lineTo(16, 50 + wob + crouch); ctx.lineTo(-16, 50 + wob + crouch); ctx.closePath(); ctx.fill();
  ctx.fillStyle = chestAccent; ctx.beginPath(); ctx.arc(0, 50 + wob + crouch, 6, 0, 7); ctx.fill();
  /* weapon arm — the chief wields a glowing staff, the warlord a scimitar */
  const sl = wind ? -2.2 : isWarlord
    ? (b.dashT > 0 && b.dashT <= 0.9 ? -1.8 : Math.sin(b.anim * 2.4) * .25 - .4)
    : (b.act === 'slam' ? -1.6 : Math.sin(b.anim * 2.4) * .25 - .4);
  ctx.save(); ctx.translate(26, 36 + wob + crouch); ctx.rotate(sl);
  ctx.strokeStyle = armCol; ctx.lineWidth = 13; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 10); ctx.stroke();
  ctx.fillStyle = chestCol; ctx.beginPath(); ctx.arc(26, 12, 7, 0, 7); ctx.fill(); // gloved hand
  if (isWarlord){
    ctx.fillStyle = '#e8ecf0'; ctx.beginPath(); ctx.moveTo(28, 6);
    ctx.quadraticCurveTo(70, -6, 84, -30); ctx.quadraticCurveTo(60, -8, 30, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = chestCol; ctx.fillRect(24, 4, 8, 16);
  } else {
    ctx.strokeStyle = '#3a2f1c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(24, 10); ctx.lineTo(82, -34); ctx.stroke();
    const og = ctx.createRadialGradient(86, -38, 1, 86, -38, 15);
    og.addColorStop(0, wind ? 'rgba(255,170,70,1)' : 'rgba(255,120,50,.85)'); og.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(86, -38, 15, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff7a2e'; ctx.beginPath(); ctx.ellipse(86, -38, 6, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = trimCol; ctx.beginPath(); ctx.moveTo(78, -30); ctx.lineTo(86, -47); ctx.lineTo(94, -30); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  /* other arm */
  ctx.strokeStyle = armCol; ctx.lineWidth = 13; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-26, 38 + wob + crouch); ctx.lineTo(-38, 62 + wob + crouch); ctx.stroke();
  ctx.fillStyle = chestCol; ctx.beginPath(); ctx.arc(-40, 66 + wob + crouch, 7, 0, 7); ctx.fill();
  /* head — full dark horned helm, no visible face, glowing eyes like the rest of the army */
  ctx.fillStyle = turbanCol; ctx.beginPath(); ctx.ellipse(4, 14 + wob + crouch, 17, 19, 0, 0, 7); ctx.fill();
  ctx.fillStyle = turban2Col; ctx.beginPath(); ctx.ellipse(4, 8 + wob + crouch, 15, 11, 0, 3.14, 0); ctx.fill();
  /* eye glow */
  const eg = ctx.createRadialGradient(12, 10 + wob + crouch, 0, 12, 10 + wob + crouch, 9);
  eg.addColorStop(0, wind ? 'rgba(255,90,50,.95)' : 'rgba(120,30,20,.65)'); eg.addColorStop(1, 'rgba(255,90,50,0)');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(12, 10 + wob + crouch, 9, 0, 7); ctx.fill();
  ctx.fillStyle = eyeCol; ctx.beginPath(); ctx.arc(12, 10 + wob + crouch, 3, 0, 7); ctx.fill();
  /* brow ridge + horns */
  ctx.fillStyle = trimCol; ctx.fillRect(-1, 1 + wob + crouch, 21, 4);
  ctx.beginPath(); ctx.moveTo(-11, 4 + wob + crouch); ctx.lineTo(-19, -15 + wob + crouch); ctx.lineTo(-3, -2 + wob + crouch); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(19, 2 + wob + crouch); ctx.lineTo(29, -13 + wob + crouch); ctx.lineTo(11, -2 + wob + crouch); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(2, -4 + wob + crouch); ctx.lineTo(4, -21 + wob + crouch); ctx.lineTo(9, -4 + wob + crouch); ctx.closePath(); ctx.fill(); // center spike
  ctx.fillStyle = jewelCol; ctx.beginPath(); ctx.arc(4, -7 + wob + crouch, 3.2, 0, 7); ctx.fill(); // forehead gem
  ctx.lineCap = 'butt'; ctx.restore();
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

/* ---- princess Nawfa: a dark hooded cloak with gold trim over a white
   gown, a jewelled gold circlet with a central emerald ---- */
function drawPrincess(dt){
  const pr = G.princess; if (!pr) return;
  pr.anim += dt;
  const t = pr.anim, b = Math.sin(t * 2.2) * 2, sway = Math.sin(t * 1.6) * 3;
  ctx.save(); ctx.translate(pr.x + 20, pr.y - 10);

  /* freed: a soft golden aura behind her */
  if (pr.freed){
    const gl = ctx.createRadialGradient(0, 8, 6, 0, 8, 52);
    gl.addColorStop(0, 'rgba(255,232,150,.4)'); gl.addColorStop(1, 'rgba(255,232,150,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 8, 52, 0, 7); ctx.fill();
  }

  /* dark hooded cloak with a gold-trimmed hem */
  ctx.fillStyle = '#1c1a22';
  ctx.beginPath(); ctx.moveTo(-9, 12 + b); ctx.quadraticCurveTo(0, 5 + b, 9, 12 + b);
  ctx.quadraticCurveTo(20 + sway, 34, 17 + sway, 46);
  ctx.quadraticCurveTo(0, 52, -17 - sway, 46);
  ctx.quadraticCurveTo(-20 - sway, 34, -9, 12 + b); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c9982e'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-16 - sway, 42); ctx.quadraticCurveTo(0, 47, 16 + sway, 42); ctx.stroke();
  /* white inner gown showing through the open cloak */
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath(); ctx.moveTo(-7, 14 + b); ctx.quadraticCurveTo(0, 9 + b, 7, 14 + b);
  ctx.lineTo(6 + sway * .5, 44); ctx.quadraticCurveTo(0, 48, -6 - sway * .5, 44); ctx.closePath(); ctx.fill();
  /* gold hem + emerald belt buckle */
  ctx.strokeStyle = '#c9982e'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-17 - sway, 45); ctx.quadraticCurveTo(0, 50, 17 + sway, 45); ctx.stroke();
  ctx.fillStyle = '#c9982e'; rr(-8, 22 + b, 16, 3.4, 1.5); ctx.fill();
  ctx.fillStyle = '#2f8f6a'; ctx.beginPath(); ctx.arc(0, 23.7 + b, 2.6, 0, 7); ctx.fill();
  /* bodice */
  ctx.fillStyle = '#1c1a22'; rr(-7, 9 + b, 14, 15, 6); ctx.fill();
  ctx.strokeStyle = '#c9982e'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(0, 10 + b); ctx.lineTo(0, 22 + b); ctx.stroke();

  /* arms clasped gently */
  ctx.strokeStyle = '#e6b184'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-6, 15 + b); ctx.quadraticCurveTo(-11, 22 + b, -3, 25 + b);
  ctx.moveTo(6, 15 + b); ctx.quadraticCurveTo(11, 22 + b, 3, 25 + b); ctx.stroke();

  /* dark hood framing the shoulders, gold-trimmed at the edge */
  ctx.fillStyle = '#1c1a22';
  ctx.beginPath(); ctx.moveTo(-9, -3 + b); ctx.quadraticCurveTo(-17, 16 + b, -9, 30 + b);
  ctx.quadraticCurveTo(-6, 16 + b, -6, 8 + b); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(9, -3 + b); ctx.quadraticCurveTo(17, 16 + b, 9, 30 + b);
  ctx.quadraticCurveTo(6, 16 + b, 6, 8 + b); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c9982e'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-9, -3 + b); ctx.quadraticCurveTo(-17, 16 + b, -9, 30 + b); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, -3 + b); ctx.quadraticCurveTo(17, 16 + b, 9, 30 + b); ctx.stroke();
  /* dangling gem earrings */
  ctx.fillStyle = '#c23b3b';
  ctx.beginPath(); ctx.arc(-8.4, 6 + b, 1.6, 0, 7); ctx.arc(8.4, 6 + b, 1.6, 0, 7); ctx.fill();

  /* head */
  ctx.fillStyle = '#eab785'; ctx.beginPath(); ctx.ellipse(0, -3 + b, 8.6, 9.4, 0, 0, 7); ctx.fill();
  /* hood framing the face + a sliver of dark hair at the centre part */
  ctx.fillStyle = '#1c1a22'; ctx.beginPath(); ctx.arc(0, -6 + b, 9.6, 3.14, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-9.6, -6 + b); ctx.quadraticCurveTo(-12, 2 + b, -8.4, 6 + b); ctx.lineTo(-6.4, -2 + b); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(9.6, -6 + b); ctx.quadraticCurveTo(12, 2 + b, 8.4, 6 + b); ctx.lineTo(6.4, -2 + b); ctx.closePath(); ctx.fill();
  /* rosy cheeks */
  ctx.fillStyle = 'rgba(224,120,130,.4)';
  ctx.beginPath(); ctx.arc(-5, 0 + b, 2, 0, 7); ctx.arc(5, 0 + b, 2, 0, 7); ctx.fill();
  /* eyes with lashes */
  const blink = (t % 4.2) > 4.05;
  if (!blink){
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.ellipse(-3.2, -3 + b, 2.1, 2.7, 0, 0, 7); ctx.ellipse(3.2, -3 + b, 2.1, 2.7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a2c18'; ctx.beginPath();
    ctx.arc(-3.2, -2.6 + b, 1.3, 0, 7); ctx.arc(3.2, -2.6 + b, 1.3, 0, 7); ctx.fill();
  } else {
    ctx.strokeStyle = '#4a2c18'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-5, -3 + b); ctx.lineTo(-1.5, -3 + b);
    ctx.moveTo(1.5, -3 + b); ctx.lineTo(5, -3 + b); ctx.stroke();
  }
  ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-5, -6 + b); ctx.quadraticCurveTo(-3.2, -7 + b, -1.5, -6 + b);
  ctx.moveTo(1.5, -6 + b); ctx.quadraticCurveTo(3.2, -7 + b, 5, -6 + b); ctx.stroke();
  /* smile */
  ctx.strokeStyle = '#b0505f'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 2 + b, 2.4, .2, 2.94); ctx.stroke();
  ctx.lineCap = 'butt';

  /* jewelled gold circlet with a central emerald */
  ctx.fillStyle = '#e0c04e';
  ctx.beginPath(); ctx.moveTo(-8, -9 + b);
  ctx.lineTo(-5, -14 + b); ctx.lineTo(-2.5, -10 + b); ctx.lineTo(0, -16 + b);
  ctx.lineTo(2.5, -10 + b); ctx.lineTo(5, -14 + b); ctx.lineTo(8, -9 + b); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2f8f6a'; ctx.beginPath(); ctx.arc(0, -12 + b, 1.9, 0, 7); ctx.fill();
  ctx.fillStyle = '#c23b3b'; ctx.beginPath(); ctx.arc(-5, -12.5 + b, 1.1, 0, 7); ctx.arc(5, -12.5 + b, 1.1, 0, 7); ctx.fill();
  /* sparkle when freed */
  if (pr.freed){
    const sp = Math.abs(Math.sin(t * 3));
    ctx.fillStyle = 'rgba(255,255,255,' + (.4 + sp * .5) + ')';
    ctx.beginPath(); ctx.arc(11, -10 + b, 1 + sp, 0, 7); ctx.arc(-12, -4 + b, .8 + sp * .6, 0, 7); ctx.fill();
  }

  /* chains until freed */
  if (!pr.freed){
    ctx.strokeStyle = '#8a929b'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(-3, 25 + b); ctx.quadraticCurveTo(-22, 32, -30, 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, 25 + b); ctx.quadraticCurveTo(22, 32, 30, 44); ctx.stroke();
    ctx.fillStyle = '#5b636b';
    ctx.beginPath(); ctx.arc(-5, 25 + b, 2.4, 0, 7); ctx.arc(5, 25 + b, 2.4, 0, 7); ctx.fill();
  }
  ctx.restore();
}
