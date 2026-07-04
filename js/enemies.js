"use strict";
/* =========================================================
   enemies.js — patrol AI with edge/wall turning, bandit
   vision + telegraphed lunge (alert "!" then windup, then
   charge), stomp/fireball reactions, and moving/falling
   platforms.
   ========================================================= */

function edgeAhead(e){
  const fx = e.vx > 0 ? e.x + e.w + 4 : e.x - 4;
  const c = Math.floor(fx / TILE), r = Math.floor((e.y + e.h + 6) / TILE);
  return !solid(tileAt(c, r)) && tileAt(c, r) !== '=';
}

function updateEnemies(dt){
  for (let i = G.ents.length - 1; i >= 0; i--){
    const e = G.ents[i];
    if (e.dead > 0){
      e.dead += dt; e.y += 160 * dt;
      if (e.dead > 0.9) G.ents.splice(i, 1);
      continue;
    }

    if (GROUND_ENEMY_TYPES.has(e.t)){
      e.anim += dt;
      e.hurt = Math.max(0, e.hurt - dt);
      e.alert = Math.max(0, (e.alert || 0) - dt);
      e.hitWall = false;

      /* bandit/elite vision: spot the player, flash "!", wind up, then lunge */
      if (e.t === 'bandit' || e.t === 'elite'){
        const dx = P.x - e.x, dy = Math.abs(P.y - e.y);
        const facing = Math.sign(e.vx) || -1;
        if (e.lunge > 0) e.lunge -= dt;
        else if (e.windup > 0){
          e.windup -= dt;
          if (e.windup <= 0){ e.lunge = 1.1; }
        }
        else if (!P.dead && dy < 60 && Math.abs(dx) < 230 && Math.sign(dx) === facing){
          e.windup = .28; e.alert = .8; SFX.hit();
        }
        /* player sneaking close behind: turn around */
        else if (!P.dead && dy < 50 && Math.abs(dx) < 90 && Math.sign(dx) !== facing){
          e.vx = -e.vx;
        }
      }

      /* thrower: same vision envelope as bandit, but a ranged knife toss
         (telegraphed by throwWindup) instead of a melee lunge */
      if (e.t === 'thrower'){
        const dx = P.x - e.x, dy = Math.abs(P.y - e.y);
        const facing = Math.sign(e.vx) || -1;
        e.cool = Math.max(0, (e.cool || 0) - dt);
        if (e.throwWindup > 0){
          e.throwWindup -= dt;
          if (e.throwWindup <= 0){
            G.knives.push({ x:e.x + e.w / 2 + facing * 14, y:e.y + 20, vx:facing * 380, vy:0, t:0, r:9 });
            SFX.fire(); e.cool = 1.5;
          }
        } else if (e.cool <= 0 && !P.dead && dy < 60 && Math.abs(dx) < 260 && Math.sign(dx) === facing){
          e.throwWindup = .32; e.alert = .8; SFX.hit();
        }
      }

      /* scorpions pause now and then — less metronomic patrols */
      if (e.t === 'scorp'){
        if (e.pause > 0){ e.pause -= dt; }
        else if (Math.random() < dt * .25){ e.pause = .8 + Math.random(); }
      }

      const winding = ((e.t === 'bandit' || e.t === 'elite') && e.windup > 0) ||
                      (e.t === 'thrower' && e.throwWindup > 0);
      const paused = (e.t === 'scorp' && e.pause > 0) || winding;
      const lunging = (e.t === 'bandit' || e.t === 'elite') && e.lunge > 0;
      const spd = paused ? 0 : lunging ? (e.t === 'elite' ? 210 : 170) : Math.abs(e.vx);
      const dir = Math.sign(e.vx) || -1;
      e.x += dir * spd * dt; e.vx = dir * Math.abs(e.vx);
      collideX(e);
      e.vy = (e.vy || 0) + 2200 * dt; e.y += e.vy * dt; collideY(e, false);
      if (e.hitWall || (e.onG && spd > 0 && edgeAhead(e))){ e.vx = -e.vx; e.lunge = 0; e.windup = 0; }

      /* contact with player */
      if (!P.dead && aabb(e, P)){
        if (P.vy > 160 && P.y + P.h < e.y + e.h * .6){ // stomp
          P.vy = -520; P.jumps = 1; G.hitstop = Math.max(G.hitstop, .05); SFX.stomp();
          puff(e.x + e.w / 2, e.y, 10, '#c9a15a', 130, .5);
          /* the elite guard shrugs off a stomp into a normal hit instead of an instant kill */
          if (e.t === 'elite'){ e.hp--; e.hurt = .2; } else e.hp = 0;
          if (e.hp <= 0 && !e.dead){
            e.dead = .01; const pts = enemyPoints(e.t); G.score += pts;
            ring(e.x + e.w / 2, e.y + e.h / 2, '#ffe9b0', 34);
            popText(e.x + e.w / 2, e.y - 8, '+' + pts);
          }
        } else hurtPlayer(1, Math.sign(P.x - e.x));
      }
    }

    if (e.t === 'mover'){
      const old = e.x;
      e.x += e.dir * e.spd * dt;
      if (e.x > e.ox + e.range || e.x < e.ox - e.range) e.dir *= -1;
      e.dx = e.x - old;
    }

    if (e.t === 'faller'){
      if (e.respawn > 0){
        e.respawn -= dt;
        if (e.respawn <= 0){ e.x = e.ox; e.y = e.oy; e.vy = 0; e.timer = -1; }
        continue;
      }
      if (e.timer > 0){ e.timer -= dt; if (e.timer <= 0) e.vy = 10; }
      if (e.vy > 0){
        e.vy += 1400 * dt; e.y += e.vy * dt;
        if (e.y > G.H * TILE + 80) e.respawn = 2.5;
      }
    }
  }
}
