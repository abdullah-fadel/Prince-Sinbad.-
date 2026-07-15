"use strict";
/* =========================================================
   render.js — background (parallax sky, sun, clouds, city
   silhouettes, dunes, heat shimmer), tile drawing with
   view culling, moving platforms, fireballs, soft shadows
   and the screen-space vignette.
   ========================================================= */

function rr(x, y, w, h, r){
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* soft blob shadow projected onto the ground below (cx, footY) */
function drawShadow(cx, footY, w){
  const gy = findGroundY(cx, footY);
  if (gy < 0) return;
  const d = gy - footY;
  if (d < 0 || d > TILE * 5) return;
  const k = 1 - d / (TILE * 5);
  ctx.fillStyle = 'rgba(30,12,4,' + (0.28 * k) + ')';
  ctx.beginPath();
  ctx.ellipse(cx, gy + 3, (w / 2 + 6) * (0.6 + 0.4 * k), 5 * (0.6 + 0.4 * k), 0, 0, 7);
  ctx.fill();
}

/* ---- background: biome-aware sky/skyline/ground, with parallax.
   Each scenario (desert, forest, mountain, Babylon ruins) gets its own
   sky gradient, mist tint, skyline silhouette and ground color so the
   journey reads as moving through distinct places, not palette swaps. */
const BIOME_BG = {
  desert:    { sky:['#f9c979','#f0a668','#d97e5a','#b45f4d'], sun:'#fff3cf', cloud:'255,235,200', sil:'150,84,66',  ground:'96,48,42',  shape:'domes' },
  forest:    { sky:['#bfe0a8','#8fc47a','#5c9c5e','#3c6b48'], sun:'#eafccb', cloud:'220,240,200', sil:'40,74,46',   ground:'42,58,30',  shape:'trees' },
  mountain:  { sky:['#cfe3f2','#a8c7dd','#7c9cbd','#516583'], sun:'#f2f9ff', cloud:'230,240,250', sil:'70,86,102',  ground:'70,74,84',  shape:'peaks' },
  babylon:   { sky:['#f5d98a','#e0b463','#b98a4a','#7a5a34'], sun:'#fff0c8', cloud:'240,220,170', sil:'150,110,58', ground:'80,58,30',  shape:'ziggurat' },
  oasis:     { sky:['#bfe8d8','#8fd0b0','#5aa889','#3a7860'], sun:'#fff6c8', cloud:'220,245,230', sil:'40,90,66',   ground:'70,88,50',  shape:'oasis' },
  sandyCaves:{ sky:['#d9c9a8','#b8a480','#8a7458','#5a4a38'], sun:'#f0e0b0', cloud:'220,210,180', sil:'60,50,38',   ground:'60,50,36',  shape:'cavemouth' },
  egypt:     { sky:['#f6d891','#eab55f','#d6893f','#9c5a33'], sun:'#fff2c4', cloud:'250,230,185', sil:'150,108,60', ground:'112,78,42', shape:'pyramids' }
};
function biomeOf(){ return (LEVELS[G.lvl] && LEVELS[G.lvl].biome) || 'desert'; }

let skyGrads = {}, vignette = null;
function drawBG(){
  const bk = biomeOf(), bio = BIOME_BG[bk] || BIOME_BG.desert;
  let skyGrad = skyGrads[bk];
  if (!skyGrad){
    skyGrad = ctx.createLinearGradient(0, 0, 0, VH);
    skyGrad.addColorStop(0, bio.sky[0]); skyGrad.addColorStop(.45, bio.sky[1]);
    skyGrad.addColorStop(.75, bio.sky[2]); skyGrad.addColorStop(1, bio.sky[3]);
    skyGrads[bk] = skyGrad;
  }
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, VW, VH);
  /* sun with pulsing halo */
  const sx = VW * .72, sy = VH * .30;
  const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 180);
  sg.addColorStop(0, 'rgba(255,244,200,.95)'); sg.addColorStop(.25, 'rgba(255,214,130,.55)');
  sg.addColorStop(1, 'rgba(255,214,130,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 180, 0, 7); ctx.fill();
  ctx.fillStyle = bio.sun; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, 7); ctx.fill();
  /* clouds — two depths */
  ctx.fillStyle = 'rgba(' + bio.cloud + ',.30)';
  for (let i = 0; i < 5; i++){
    const cx2 = ((i * 260 - cam.x * .05 - G.time * 4) % (VW + 300) + VW + 300) % (VW + 300) - 150, cy = 44 + i * 34;
    ctx.beginPath(); ctx.ellipse(cx2, cy, 80, 15, 0, 0, 7); ctx.ellipse(cx2 + 50, cy + 8, 55, 12, 0, 0, 7); ctx.fill();
  }
  ctx.fillStyle = 'rgba(' + bio.cloud + ',.45)';
  for (let i = 0; i < 4; i++){
    const cx2 = ((i * 340 + 120 - cam.x * .09 - G.time * 7) % (VW + 340) + VW + 340) % (VW + 340) - 170, cy = 90 + i * 42;
    ctx.beginPath(); ctx.ellipse(cx2, cy, 62, 12, 0, 0, 7); ctx.ellipse(cx2 + 40, cy + 7, 42, 10, 0, 0, 7); ctx.fill();
  }
  /* far skyline silhouettes — shape depends on the scenario */
  drawSkyline(-cam.x * .15, VH * .62, 'rgba(' + bio.sil + ',.55)', 1, bio.shape);
  drawSkyline(-cam.x * .28 + 220, VH * .70, 'rgba(' + bio.sil + ',.7)', 1.25, bio.shape);
  /* heat shimmer above the horizon (desert only) */
  if (bk === 'desert'){
    ctx.fillStyle = 'rgba(255,240,210,.06)';
    for (let i = 0; i < 3; i++){
      const hy = VH * .58 + i * 22 + Math.sin(G.time * 1.6 + i * 2.1) * 4;
      ctx.beginPath();
      ctx.ellipse(VW / 2 + Math.sin(G.time * .8 + i) * 120, hy, VW * .45, 5 + Math.sin(G.time * 3 + i) * 2, 0, 0, 7);
      ctx.fill();
    }
  }
  /* ground */
  ctx.fillStyle = 'rgba(' + bio.ground + ',.85)';
  ctx.beginPath(); ctx.moveTo(0, VH);
  for (let x = 0; x <= VW; x += 20){
    const y = VH * .82 + Math.sin((x + cam.x * .4) * .006) * 26;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VW, VH); ctx.fill();
}
function drawSkyline(off, base, col, s, shape){
  ctx.fillStyle = col; const W = 560 * s;
  for (let k = -1; k < Math.ceil(VW / W) + 1; k++){
    const ox = ((off % W) + W) % W - W + k * W;
    ctx.save(); ctx.translate(ox, base); ctx.scale(s, s);
    if (shape === 'trees') drawTreeSilhouette();
    else if (shape === 'peaks') drawPeakSilhouette();
    else if (shape === 'ziggurat') drawZigguratSilhouette();
    else if (shape === 'oasis') drawOasisSilhouette();
    else if (shape === 'cavemouth') drawCaveMouthSilhouette();
    else if (shape === 'pyramids') drawPyramidSilhouette();
    else drawDomeSilhouette();
    ctx.restore();
  }
}
/* desert: domes & minarets */
function drawDomeSilhouette(){
  ctx.fillRect(30, -60, 90, 120); ctx.beginPath(); ctx.arc(75, -60, 45, 3.14, 0); ctx.fill();
  ctx.fillRect(150, -130, 16, 190); ctx.beginPath(); ctx.arc(158, -130, 12, 3.14, 0); ctx.fill();
  ctx.fillRect(200, -40, 120, 100); ctx.beginPath(); ctx.arc(260, -40, 32, 3.14, 0); ctx.fill();
  ctx.fillRect(350, -90, 14, 150); ctx.beginPath(); ctx.arc(357, -90, 10, 3.14, 0); ctx.fill();
  ctx.fillRect(400, -30, 100, 90); ctx.beginPath(); ctx.arc(450, -30, 28, 3.14, 0); ctx.fill();
}
/* forest: a row of pine/cedar silhouettes at varying heights */
function drawTreeSilhouette(){
  const trees = [[20,140],[90,190],[160,150],[230,210],[300,160],[370,180],[440,145],[500,200]];
  for (const [x, h] of trees){
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 22, -h * .55); ctx.lineTo(x - 10, -h * .55);
    ctx.lineTo(x - 18, -h * .8); ctx.lineTo(x - 6, -h * .8); ctx.lineTo(x, -h); ctx.lineTo(x + 6, -h * .8);
    ctx.lineTo(x + 18, -h * .8); ctx.lineTo(x + 10, -h * .55); ctx.lineTo(x + 22, -h * .55); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 3, -6, 6, 10);
  }
}
/* mountain: jagged snow-capped peaks */
function drawPeakSilhouette(){
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.lineTo(60, -170); ctx.lineTo(120, -40); ctx.lineTo(190, -220); ctx.lineTo(260, -60);
  ctx.lineTo(330, -190); ctx.lineTo(400, -30); ctx.lineTo(470, -150); ctx.lineTo(540, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.moveTo(45, -140); ctx.lineTo(60, -170); ctx.lineTo(75, -140); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(175, -190); ctx.lineTo(190, -220); ctx.lineTo(205, -190); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(315, -160); ctx.lineTo(330, -190); ctx.lineTo(345, -160); ctx.closePath(); ctx.fill();
}
/* babylon: stepped ziggurats and a slender obelisk */
function drawZigguratSilhouette(){
  for (let s = 0; s < 5; s++) ctx.fillRect(40 + s * 10, -22 * (s + 1), 130 - s * 20, 22);
  for (let s = 0; s < 4; s++) ctx.fillRect(300 + s * 9, -20 * (s + 1), 100 - s * 18, 20);
  ctx.fillRect(470, -160, 10, 160);
  ctx.beginPath(); ctx.moveTo(470, -160); ctx.lineTo(475, -176); ctx.lineTo(480, -160); ctx.closePath(); ctx.fill();
}
/* oasis: clustered palm trees over low mud-brick domed huts */
function drawOasisSilhouette(){
  const palms = [[30,150],[110,190],[280,165],[420,200]];
  for (const [x, h] of palms){
    ctx.fillRect(x - 4, -h, 8, h);
    for (const a of [-1.2, -0.5, 0.1, 0.7, 1.3]){
      ctx.beginPath(); ctx.moveTo(x, -h);
      ctx.quadraticCurveTo(x + Math.cos(a) * 40, -h - 18, x + Math.cos(a) * 58, -h + Math.sin(a) * 26);
      ctx.quadraticCurveTo(x + Math.cos(a) * 30, -h - 6, x, -h); ctx.fill();
    }
  }
  ctx.fillRect(160, -50, 90, 50); ctx.beginPath(); ctx.arc(205, -50, 30, 3.14, 0); ctx.fill();
  ctx.fillRect(330, -36, 70, 36); ctx.beginPath(); ctx.arc(365, -36, 24, 3.14, 0); ctx.fill();
}
/* sandy caves: a jagged rock arch / cave-mouth with hanging stalactites */
function drawCaveMouthSilhouette(){
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.lineTo(20, -90); ctx.lineTo(70, -60); ctx.lineTo(110, -150); ctx.lineTo(160, -70);
  ctx.lineTo(190, -100);
  /* cave-mouth opening cut into the rock silhouette */
  ctx.lineTo(190, -20); ctx.lineTo(230, -34); ctx.lineTo(260, -18); ctx.lineTo(300, -34); ctx.lineTo(340, -20);
  ctx.lineTo(340, -100);
  ctx.lineTo(380, -70); ctx.lineTo(430, -160); ctx.lineTo(470, -70); ctx.lineTo(520, -95); ctx.lineTo(560, 0);
  ctx.closePath(); ctx.fill();
  /* hanging stalactites at the cave mouth */
  ctx.beginPath(); ctx.moveTo(196, -34); ctx.lineTo(204, -34); ctx.lineTo(200, -10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(266, -30); ctx.lineTo(276, -30); ctx.lineTo(271, -4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(316, -34); ctx.lineTo(326, -34); ctx.lineTo(321, -12); ctx.closePath(); ctx.fill();
}

/* egypt: three pyramids of varying size + a slim obelisk */
function drawPyramidSilhouette(){
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(118, -150); ctx.lineTo(220, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(178, 0); ctx.lineTo(300, -205); ctx.lineTo(422, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(398, 0); ctx.lineTo(472, -108); ctx.lineTo(546, 0); ctx.closePath(); ctx.fill();
  ctx.fillRect(150, -96, 8, 96);
  ctx.beginPath(); ctx.moveTo(150, -96); ctx.lineTo(154, -108); ctx.lineTo(158, -96); ctx.closePath(); ctx.fill();
}

/* per-biome tint for solid ground tiles, so each scenario's terrain
   (sand, forest loam, mountain stone, sunbaked brick) reads distinctly */
const BIOME_TILE = {
  desert:    { face:'#b98a52', shade:'#a5764a', top:'#d9b077' },
  forest:    { face:'#6f8f47', shade:'#5c7a3a', top:'#8fae5c' },
  mountain:  { face:'#8f96a0', shade:'#767d88', top:'#c7ccd2' },
  babylon:   { face:'#c7a55c', shade:'#a8863e', top:'#e8cf8a' },
  oasis:     { face:'#5c8a5e', shade:'#4a7248', top:'#8fc27a' },
  sandyCaves:{ face:'#8a7458', shade:'#6e5c46', top:'#a99168' },
  egypt:     { face:'#c9a05a', shade:'#a8813e', top:'#e6c97e' }
};

/* ---- tiles (culled to camera view) ---- */
function drawTiles(t){
  const vw = camViewW(), vh = camViewH();
  const c0 = Math.max(0, Math.floor(cam.x / TILE) - 1), c1 = Math.min(G.W - 1, Math.ceil((cam.x + vw) / TILE) + 1);
  const r0 = Math.max(0, Math.floor(cam.y / TILE) - 1), r1 = Math.min(G.H - 1, Math.ceil((cam.y + vh) / TILE) + 2);
  const bioT = BIOME_TILE[biomeOf()] || BIOME_TILE.desert;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++){
    const ch = G.grid[r][c], x = c * TILE, y = r * TILE;
    if (ch === '#'){
      ctx.fillStyle = bioT.face; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = bioT.shade; ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      if ((c + r) % 2) ctx.fillRect(x + 6, y + TILE / 2, TILE - 12, 3);
      else ctx.fillRect(x + TILE / 2, y + 8, 3, TILE - 16);
      if (!solid(tileAt(c, r - 1))){ ctx.fillStyle = bioT.top; ctx.fillRect(x, y, TILE, 7); }
    }
    else if (ch === '='){
      ctx.fillStyle = '#8a5a34'; rr(x + 2, y + 4, TILE - 4, 14, 5); ctx.fill();
      ctx.fillStyle = '#c99a5e'; rr(x + 2, y + 4, TILE - 4, 6, 4); ctx.fill();
    }
    else if (ch === 'X'){
      /* destructible wall — visually distinct from '#' in every biome:
         dark cracked stone with a warning-red hazard stripe + crack lines */
      ctx.fillStyle = '#3a2a24'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#5a3f34'; ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.fillStyle = 'rgba(224,72,60,.35)'; ctx.fillRect(x, y, TILE, 6);
      ctx.strokeStyle = '#e0483c'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 10); ctx.lineTo(x + 20, y + 22); ctx.lineTo(x + 13, y + 28); ctx.lineTo(x + 27, y + 40);
      ctx.moveTo(x + 36, y + 9); ctx.lineTo(x + 27, y + 20); ctx.lineTo(x + 38, y + 33);
      ctx.stroke(); ctx.lineCap = 'butt';
    }
    else if (ch === '^'){
      ctx.fillStyle = '#cfd3d8';
      for (let i = 0; i < 3; i++){
        ctx.beginPath(); ctx.moveTo(x + i * 16, y + TILE); ctx.lineTo(x + i * 16 + 8, y + 14);
        ctx.lineTo(x + i * 16 + 16, y + TILE); ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x, y + TILE - 4, TILE, 4);
    }
    else if (ch === 'L'){
      ctx.strokeStyle = '#7a4c26'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 12, y + TILE);
      ctx.moveTo(x + 36, y); ctx.lineTo(x + 36, y + TILE);
      ctx.moveTo(x + 12, y + 12); ctx.lineTo(x + 36, y + 12);
      ctx.moveTo(x + 12, y + 34); ctx.lineTo(x + 36, y + 34); ctx.stroke();
    }
    else if (ch === 'C'){
      const b = Math.sin(t * 5 + c) * 4, sq = Math.abs(Math.cos(t * 3 + c));
      ctx.fillStyle = '#8a6a12'; ctx.beginPath(); ctx.ellipse(x + 24, y + 26 + b, 12 * sq + 2, 14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.ellipse(x + 24, y + 24 + b, 12 * sq + 2, 14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff0b8'; ctx.beginPath(); ctx.ellipse(x + 24, y + 24 + b, (12 * sq + 2) * .5, 7, 0, 0, 7); ctx.fill();
      /* sparkle glint */
      const sp = Math.sin(t * 2.2 + c * 7.3);
      if (sp > 0.92){
        const sa = (sp - 0.92) / 0.08;
        ctx.strokeStyle = 'rgba(255,255,255,' + sa + ')'; ctx.lineWidth = 2;
        const gx = x + 32, gy = y + 14 + b;
        ctx.beginPath(); ctx.moveTo(gx - 6, gy); ctx.lineTo(gx + 6, gy);
        ctx.moveTo(gx, gy - 6); ctx.lineTo(gx, gy + 6); ctx.stroke();
      }
    }
    else if (ch === 'H'){
      const b = Math.sin(t * 4 + c) * 4; ctx.fillStyle = '#e04a5e';
      ctx.beginPath(); ctx.arc(x + 18, y + 20 + b, 8, 0, 7); ctx.arc(x + 30, y + 20 + b, 8, 0, 7);
      ctx.moveTo(x + 9, y + 23 + b); ctx.lineTo(x + 24, y + 40 + b); ctx.lineTo(x + 39, y + 23 + b); ctx.fill();
    }
    else if (ch === 'P'){
      const b = Math.sin(t * 4 + c) * 4;
      ctx.fillStyle = '#ff8c2e'; ctx.beginPath(); ctx.moveTo(x + 24, y + 8 + b);
      ctx.quadraticCurveTo(x + 40, y + 24 + b, x + 24, y + 42 + b);
      ctx.quadraticCurveTo(x + 8, y + 24 + b, x + 24, y + 8 + b); ctx.fill();
      ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.moveTo(x + 24, y + 18 + b);
      ctx.quadraticCurveTo(x + 32, y + 27 + b, x + 24, y + 38 + b);
      ctx.quadraticCurveTo(x + 16, y + 27 + b, x + 24, y + 18 + b); ctx.fill();
    }
    else if (ch === 'T' || ch === 't'){
      ctx.fillStyle = '#7a4c26'; rr(x + 4, y + 16, 40, 28, 5); ctx.fill();
      ctx.fillStyle = '#956036'; rr(x + 4, y + 10, 40, 14, 6); ctx.fill();
      ctx.fillStyle = '#ffd75e'; ctx.fillRect(x + 21, y + 18, 6, 10);
      if (ch === 't'){ ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x + 8, y + 14, 32, 4); }
    }
    else if (ch === 'K'){
      const act = G.cpDone.has(c + ',' + r);
      const wave = Math.sin(t * 4 + c) * (act ? 3 : 1.5);
      ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x + 14, y + 46); ctx.lineTo(x + 14, y - 6); ctx.stroke();
      ctx.fillStyle = act ? '#4fc06a' : '#c9463c';
      ctx.beginPath(); ctx.moveTo(x + 16, y - 4);
      ctx.quadraticCurveTo(x + 30, y + wave, x + 42, y + 4 + wave);
      ctx.lineTo(x + 16, y + 13); ctx.fill();
      if (act){
        const gl = ctx.createRadialGradient(x + 14, y + 4, 2, x + 14, y + 4, 22);
        gl.addColorStop(0, 'rgba(123,224,123,.30)'); gl.addColorStop(1, 'rgba(123,224,123,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x + 14, y + 4, 22, 0, 7); ctx.fill();
      }
    }
    else if (ch === 'D'){
      ctx.fillStyle = '#5d3a1e'; rr(x + 4, y - TILE + 6, 40, TILE * 2 - 10, 8); ctx.fill();
      ctx.fillStyle = '#8a5a2e'; rr(x + 9, y - TILE + 11, 30, TILE * 2 - 20, 14); ctx.fill();
      ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.arc(x + 15, y + 8, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + 24, y - TILE + 22, 11, 3.14, 0); ctx.stroke();
      /* welcoming glow */
      const dg = ctx.createRadialGradient(x + 24, y, 6, x + 24, y, 44);
      dg.addColorStop(0, 'rgba(255,215,94,' + (0.12 + Math.sin(t * 3) * 0.05) + ')');
      dg.addColorStop(1, 'rgba(255,215,94,0)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(x + 24, y, 44, 0, 7); ctx.fill();
    }
    else if (ch === '*'){
      const gl = .6 + Math.sin(t * 6 + c) * .25;
      const sway = Math.sin(t * 2 + c * 1.7) * 2;
      ctx.strokeStyle = '#4a3016'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + 24, y); ctx.lineTo(x + 24 + sway, y + 10); ctx.stroke();
      const lg = ctx.createRadialGradient(x + 24 + sway, y + 26, 2, x + 24 + sway, y + 26, 30);
      lg.addColorStop(0, 'rgba(255,196,90,' + (gl * .85) + ')'); lg.addColorStop(1, 'rgba(255,196,90,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x + 24 + sway, y + 26, 30, 0, 7); ctx.fill();
      ctx.fillStyle = '#3d2a12'; rr(x + 16 + sway, y + 12, 16, 24, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,130,' + gl + ')'; rr(x + 19 + sway, y + 16, 10, 16, 3); ctx.fill();
    }
    else if (ch === 'p'){
      const sway = Math.sin(t * 1.4 + c * 2.3) * 3;
      ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 8; ctx.beginPath();
      ctx.moveTo(x + 24, y + 48); ctx.quadraticCurveTo(x + 30, y + 10, x + 22 + sway, y - 26); ctx.stroke();
      ctx.strokeStyle = '#4d8a3e'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (const a of [-1.0, -0.5, 0.15, 0.7, 1.2]){
        const fs = sway * (0.6 + Math.abs(a) * .3);
        ctx.beginPath(); ctx.moveTo(x + 22 + sway, y - 26);
        ctx.quadraticCurveTo(x + 22 + sway + Math.cos(a) * 34, y - 26 + Math.sin(a) * 10 - 16,
          x + 22 + fs + Math.cos(a) * 52, y - 26 + Math.sin(a) * 18 + 6);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    else if (ch === 'W'){
      ctx.fillStyle = 'rgba(52,140,190,.85)'; ctx.fillRect(x, y + 8, TILE, TILE - 8);
      ctx.fillStyle = 'rgba(90,180,220,.5)'; ctx.fillRect(x, y + 8, TILE, 10);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      const wy = y + 8 + Math.sin(t * 4 + c * 1.3) * 3; ctx.fillRect(x, wy, TILE, 3);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      const wy2 = y + 16 + Math.sin(t * 3 + c * 2.1 + 2) * 3; ctx.fillRect(x, wy2, TILE, 2);
    }
  }
}

/* ---- movers / fallers ---- */
function drawPlatforms(){
  for (const e of G.ents){
    if (e.t === 'mover'){
      ctx.fillStyle = '#6e4626'; rr(e.x, e.y, e.w, e.h, 6); ctx.fill();
      ctx.fillStyle = '#a5764a'; rr(e.x + 3, e.y + 3, e.w - 6, 6, 4); ctx.fill();
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(e.x + 10, e.y); ctx.lineTo(e.x + 10, e.y - 200);
      ctx.moveTo(e.x + e.w - 10, e.y); ctx.lineTo(e.x + e.w - 10, e.y - 200); ctx.stroke();
    }
    if (e.t === 'faller' && e.respawn <= 0){
      const sh = e.timer > 0 ? Math.sin(e.timer * 40) * 2 : 0;
      ctx.fillStyle = '#9a6a3e'; rr(e.x + sh, e.y, e.w, e.h, 4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(e.x + sh + 4, e.y + e.h - 4, e.w - 8, 3);
    }
  }
}

/* ---- fireballs: a flame that licks downward, so a shot fired from the
   hero's hand height still visibly reaches low, ground-crawling enemies
   (matches the downward hit reach in updateFireballs) ---- */
const FIRE_TAIL = 30; // how far the flame tongue hangs below the core (px)
function drawFireballs(){
  for (const f of G.fireballs){
    const flick = Math.sin(f.t * 26) * 2.4;
    ctx.save(); ctx.translate(f.x, f.y);
    /* soft glow, biased downward to cover the full flame body */
    const gl = ctx.createRadialGradient(0, FIRE_TAIL * .35, 2, 0, FIRE_TAIL * .35, f.r + FIRE_TAIL * .7);
    gl.addColorStop(0, 'rgba(255,205,100,.55)'); gl.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = gl; ctx.beginPath();
    ctx.ellipse(0, FIRE_TAIL * .35, f.r + 10, f.r + FIRE_TAIL * .7, 0, 0, 7); ctx.fill();
    /* flame tongue: rounded head at the core, tapering to a point below */
    const grd = ctx.createLinearGradient(0, -f.r, 0, f.r + FIRE_TAIL);
    grd.addColorStop(0, '#fff3c0'); grd.addColorStop(.45, '#ffb03c'); grd.addColorStop(1, 'rgba(255,80,20,.10)');
    ctx.fillStyle = grd; ctx.beginPath();
    ctx.moveTo(0, -f.r - 2);
    ctx.quadraticCurveTo(f.r + 3 + flick, f.r * .3, 0, f.r + FIRE_TAIL);
    ctx.quadraticCurveTo(-f.r - 3 - flick, f.r * .3, 0, -f.r - 2);
    ctx.fill();
    /* bright core */
    ctx.fillStyle = '#fff3c0'; ctx.beginPath(); ctx.arc(0, 0, f.r * .55, 0, 7); ctx.fill();
    ctx.restore();
  }
}

/* ---- thrown knives: small spinning blades (thrower enemy → player) ---- */
function drawKnives(){
  for (const k of G.knives){
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.t * 16);
    ctx.fillStyle = '#dfe4ea';
    ctx.beginPath(); ctx.moveTo(-k.r, 0); ctx.lineTo(k.r, -2.6); ctx.lineTo(k.r, 2.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.arc(-k.r + 2, 0, 2, 0, 7); ctx.fill();
    ctx.restore();
  }
}

/* ---- screen-space vignette + low-HP pulse (drawn after world) ---- */
function drawVignette(){
  if (!vignette){
    vignette = ctx.createRadialGradient(VW / 2, VH / 2, VH * .48, VW / 2, VH / 2, VH * .95);
    vignette.addColorStop(0, 'rgba(20,8,2,0)'); vignette.addColorStop(1, 'rgba(20,8,2,.38)');
  }
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, VW, VH);
  if (G.state === 'play' && !P.dead && P.hp === 1){
    const a = .10 + Math.sin(G.time * 5) * .06;
    const hg = ctx.createRadialGradient(VW / 2, VH / 2, VH * .4, VW / 2, VH / 2, VH * .9);
    hg.addColorStop(0, 'rgba(180,20,20,0)'); hg.addColorStop(1, 'rgba(180,20,20,' + a + ')');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, VW, VH);
  }
  if (G.fade > 0){
    ctx.fillStyle = 'rgba(8,4,2,' + (G.fade * .85) + ')'; ctx.fillRect(0, 0, VW, VH);
  }
}
