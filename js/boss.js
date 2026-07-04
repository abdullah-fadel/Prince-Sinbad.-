"use strict";
/* =========================================================
   boss.js — bandit-chief fight: walk / telegraphed slam
   (shockwaves) / blade throw (phase 2), plus the player's
   fireballs and their hit resolution.
   ========================================================= */

function updateBoss(dt){
  const b = G.boss; if (!b) return;
  if (b.dead > 0){
    b.dead += dt;
    /* only the final chief's death triggers the princess-rescue sequence —
       a mid-roster boss (kind 'warlord') just unblocks the level's normal door */
    if (b.kind === 'chief' && b.dead > 1.6 && !G.princess.freed){
      G.princess.freed = true; P.winWalk = true; SFX.win();
    }
    return;
  }
  if (b.kind === 'warlord') return updateWarlordBoss(dt, b);

  b.anim += dt; b.hurt = Math.max(0, b.hurt - dt);
  b.barHp += (b.hp - b.barHp) * Math.min(1, dt * 3); // trailing HP bar
  if (G.cine > 0) return;

  b.face = Math.sign(P.x - b.x) || b.face;
  const p2 = b.hp <= b.maxHp / 2;
  if (p2) b.phase = 2;

  /* telegraph before the slam so it can be dodged on reaction */
  if (b.windup > 0){
    b.windup -= dt;
    if (b.windup <= 0){ b.vy = -560; SFX.boss(); }
  } else {
    b.actT -= dt;
    if (b.actT <= 0){
      const roll = Math.random();
      if (roll < .45) b.act = 'walk';
      else if (roll < .75) b.act = 'slam';
      else b.act = p2 ? 'throw' : 'walk';
      b.actT = b.act === 'walk' ? 1.6 : (b.act === 'slam' ? 1.1 : 0.9);
      if (b.act === 'slam'){ b.windup = .35; puff(b.x + b.w / 2, b.y + 20, 6, '#ffb03c', 100, .4); }
      if (b.act === 'throw'){
        b.blades.push({ x:b.x + b.w / 2, y:b.y + 40, vx:b.face * (p2 ? 360 : 280), vy:-120, t:0, r:14 });
        SFX.fire();
      }
    }
  }
  if (b.act === 'walk' && b.windup <= 0){ b.x += b.face * (p2 ? 120 : 80) * dt; }

  /* slam physics */
  b.vy = (b.vy || 0) + 2200 * dt; b.y += b.vy * dt;
  const gy = 9 * TILE - b.h; // arena floor is row 9
  if (b.y >= gy){
    if (b.vy > 500 && b.act === 'slam'){
      G.shake = .5; G.hitstop = Math.max(G.hitstop, .07); SFX.boss();
      ring(b.x + b.w / 2, gy + b.h, '#ffb03c', 90);
      for (const s of [-1, 1])
        b.blades.push({ x:b.x + b.w / 2, y:gy + b.h - 14, vx:s * 300, vy:0, t:0, r:12, ground:true });
      if (P.onG && Math.abs(P.x - b.x) < 260) hurtPlayer(1, Math.sign(P.x - b.x));
    }
    b.y = gy; b.vy = 0; b.onG = true;
  }
  b.x = Math.max(TILE, Math.min(b.x, G.W * TILE - b.w - TILE));

  /* body contact */
  if (!P.dead && aabb(b, P)) hurtPlayer(1, Math.sign(P.x - b.x));

  updateBossBlades(dt, b);
}

/* thrown blades + slam/dash shockwaves — shared by every boss kind so a
   new attack pattern can reuse the identical projectile/hit-resolution
   mechanics just by pushing different values into b.blades[]. */
function updateBossBlades(dt, b){
  for (let i = b.blades.length - 1; i >= 0; i--){
    const bl = b.blades[i]; bl.t += dt;
    if (!bl.ground) bl.vy += 900 * dt;
    bl.x += bl.vx * dt; bl.y += bl.vy * dt;
    if (bl.ground && Math.random() < .4) puff(bl.x, bl.y, 1, '#f6b03c', 60, .25);
    if (!P.dead && P.inv <= 0 &&
        Math.abs(bl.x - (P.x + P.w / 2)) < bl.r + P.w / 2 - 6 &&
        Math.abs(bl.y - (P.y + P.h / 2)) < bl.r + P.h / 2 - 8){
      hurtPlayer(1, Math.sign(P.x - bl.x)); b.blades.splice(i, 1); continue;
    }
    if (bl.t > 2.4 || bl.y > G.H * TILE) b.blades.splice(i, 1);
  }
}

/* ---------------- mid-roster boss: the Warlord ----------------
   A charge/dash attack (telegraphed windup → fast horizontal burst →
   brief recovery) instead of the chief's vertical slam + thrown
   blades — in phase 2 it also flings a low ground-hazard wave through
   the same shared blade array. Reuses the chief's arena-floor
   convention (row 9) since both boss levels share that layout. */
function updateWarlordBoss(dt, b){
  b.anim += dt; b.hurt = Math.max(0, b.hurt - dt);
  b.barHp += (b.hp - b.barHp) * Math.min(1, dt * 3);
  if (G.cine > 0) return;

  const p2 = b.hp <= b.maxHp / 2;
  if (p2) b.phase = 2;

  if (b.dashT > 0){
    b.dashT -= dt;
    if (b.dashT <= 0.9 && b.dashT > 0.15) b.x += b.face * (p2 ? 620 : 480) * dt; // the dash burst
  } else {
    b.face = Math.sign(P.x - b.x) || b.face;
    b.dashCool -= dt;
    if (b.dashCool <= 0){
      b.dashT = 1.35; b.dashCool = p2 ? 1.6 : 2.2;
      puff(b.x + b.w / 2, b.y + b.h - 10, 8, '#c9a15a', 110, .4); SFX.boss();
      if (p2) for (const s of [-1, 1]) b.blades.push({ x:b.x + b.w / 2, y:9 * TILE - 14, vx:s * 260, vy:0, t:0, r:12, ground:true });
    } else b.x += b.face * 40 * dt; // slow pursuit between dashes
  }

  b.vy = (b.vy || 0) + 2200 * dt; b.y += b.vy * dt;
  const gy = 9 * TILE - b.h;
  if (b.y >= gy){ b.y = gy; b.vy = 0; b.onG = true; }
  b.x = Math.max(TILE, Math.min(b.x, G.W * TILE - b.w - TILE));

  if (!P.dead && aabb(b, P)) hurtPlayer(1, Math.sign(P.x - b.x));

  updateBossBlades(dt, b);
}

/* ---------------- shared damage helpers ----------------
   Used by both the fireball (ranged) and the sword (melee),
   so a hit looks and scores the same however it lands. */
function hitEnemy(e, dmg, srcx){
  if (e.dead) return;
  e.hp -= dmg; e.hurt = .2;
  e.x += (Math.sign(e.x - srcx) || 1) * 8;          // knockback away from the attacker
  if (e.hp <= 0){
    e.dead = .01;
    const pts = enemyPoints(e.t);
    G.score += pts; SFX.stomp();
    ring(e.x + e.w / 2, e.y + e.h / 2, '#ff9a2e', 36);
    popText(e.x + e.w / 2, e.y - 8, '+' + pts);
  } else SFX.hit();
  puff(e.x + e.w / 2, e.y + e.h / 2, 10, '#ff9a2e', 160, .4);
}
function hitBoss(dmg){
  const b = G.boss; if (!b || b.dead) return;
  b.hp -= dmg; b.hurt = .25; G.hitstop = Math.max(G.hitstop, .05);
  SFX.hit(); puff(b.x + b.w / 2, b.y + b.h / 2, 14, '#ff9a2e', 180, .5); ring(b.x + b.w / 2, b.y + b.h / 2, '#ffd75e', 30);
  if (b.hp <= 0){
    b.dead = .01; G.score += 2000; G.shake = .7;
    puff(b.x + b.w / 2, b.y + b.h / 2, 40, '#ffd75e', 260, 1);
    ring(b.x + b.w / 2, b.y + b.h / 2, '#ffd75e', 130);
    popText(b.x + b.w / 2, b.y - 10, '+2000');
    if (b.kind === 'warlord'){
      P.bombs++; writeSave();
      popText(b.x + b.w / 2, b.y - 34, t('boss.bombReward'), '#ffb03c');
    }
  }
}

/* ---------------- fireballs ---------------- */
function updateFireballs(dt){
  for (let i = G.fireballs.length - 1; i >= 0; i--){
    const f = G.fireballs[i]; f.t += dt;
    f.x += f.vx * dt;
    f.y += Math.sin(f.t * 18) * 14 * dt; // slight serpentine wave
    puff(f.x, f.y, 1, Math.random() < .5 ? '#ff9a2e' : '#ffd75e', 40, .28);
    const c = Math.floor(f.x / TILE), r = Math.floor(f.y / TILE);
    let dead = f.t > 1.6 || solid(tileAt(c, r));

    for (const e of G.ents){
      if (GROUND_ENEMY_TYPES.has(e.t) && !e.dead &&
          Math.abs(f.x - (e.x + e.w / 2)) < e.w / 2 + f.r &&
          Math.abs(f.y - (e.y + e.h / 2)) < e.h / 2 + f.r){
        hitEnemy(e, 1, f.x); dead = true;
        puff(f.x, f.y, 10, '#ff9a2e', 160, .4); break;
      }
    }
    const b = G.boss;
    if (b && !b.dead && !dead &&
        Math.abs(f.x - (b.x + b.w / 2)) < b.w / 2 + f.r &&
        Math.abs(f.y - (b.y + b.h / 2)) < b.h / 2 + f.r){
      hitBoss(1); dead = true;
    }
    if (dead){
      if (f.t <= 1.6){ puff(f.x, f.y, 8, '#ff9a2e', 140, .35); ring(f.x, f.y, '#ffb03c', 22); }
      G.fireballs.splice(i, 1);
    }
  }
}

/* ---------------- thrown knives (thrower enemy → player) ----------------
   Mirrors updateFireballs' structure, but travels enemy-to-player and
   hurts the player on contact instead of damaging enemies. */
function updateKnives(dt){
  for (let i = G.knives.length - 1; i >= 0; i--){
    const k = G.knives[i]; k.t += dt;
    k.x += k.vx * dt; k.y += k.vy * dt;
    puff(k.x, k.y, 1, '#cfd3d8', 30, .22);
    const c = Math.floor(k.x / TILE), r = Math.floor(k.y / TILE);
    let dead = k.t > 1.8 || solid(tileAt(c, r));
    if (!dead && !P.dead && P.inv <= 0 &&
        Math.abs(k.x - (P.x + P.w / 2)) < k.r + P.w / 2 - 6 &&
        Math.abs(k.y - (P.y + P.h / 2)) < k.r + P.h / 2 - 8){
      hurtPlayer(1, Math.sign(P.x - k.x)); dead = true;
    }
    if (dead){
      puff(k.x, k.y, 6, '#cfd3d8', 100, .3);
      G.knives.splice(i, 1);
    }
  }
}
