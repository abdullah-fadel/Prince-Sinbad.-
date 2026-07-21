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

/* soldier chase tuning (bandit/elite/thrower): how far they'll notice and
   pursue the player, and how wide a floor gap they'll leap rather than
   turn back at — wider chasms still stop them like any other patroller */
const SOLDIER_CHASE_RANGE = 320, SOLDIER_JUMP_GAP_TILES = 3, SOLDIER_JUMP_VY = -600, SOLDIER_JUMP_HSPD = 300;

/* counts empty floor tiles ahead of e (in its facing direction) until solid
   ground resumes, capped just past the jumpable width */
function gapWidth(e){
  const dir = Math.sign(e.vx) || 1;
  const r = Math.floor((e.y + e.h + 6) / TILE);
  let c = Math.floor((dir > 0 ? e.x + e.w : e.x) / TILE) + dir, n = 0;
  while (n <= SOLDIER_JUMP_GAP_TILES){
    const ch = tileAt(c, r);
    if (solid(ch) || ch === '=') return n;
    c += dir; n++;
  }
  return n;
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

      /* bandit/elite vision: spot the player, flash "!", wind up, then lunge —
         and outside melee range, actively turn and close the distance (with
         a small hop over narrow gaps) instead of just patrolling blindly */
      if (e.t === 'bandit' || e.t === 'elite'){
        const dx = P.x - e.x, dy = Math.abs(P.y - e.y);
        const facing = Math.sign(e.vx) || -1;
        const seeking = !P.dead && dy < 100 && Math.abs(dx) < SOLDIER_CHASE_RANGE;
        if (e.lunge > 0){
          e.lunge -= dt;
          if (Math.sign(dx) !== facing) e.lunge = 0; // already sailed past the player — stop the charge, don't overshoot further
        }
        else if (e.windup > 0){
          e.windup -= dt;
          if (e.windup <= 0){ e.lunge = 1.1; }
        }
        else if (seeking && !e.jumpArc && dy < 60 && Math.abs(dx) < 230 && Math.sign(dx) === facing){
          e.windup = .28; e.alert = .8; SFX.hit();
        }
        else if (seeking){
          if (!e.chasing){ e.alert = .5; SFX.hit(); }
          e.chasing = true;
          e.vx = Math.abs(e.vx) * Math.sign(dx);
        }
        else e.chasing = false;
      }

      /* thrower: same vision envelope as bandit, but a ranged knife toss
         (telegraphed by throwWindup) instead of a melee lunge; also chases
         to get back into range once its cooldown or the player's retreat
         breaks line of sight */
      if (e.t === 'thrower'){
        const dx = P.x - e.x, dy = Math.abs(P.y - e.y);
        const facing = Math.sign(e.vx) || -1;
        e.cool = Math.max(0, (e.cool || 0) - dt);
        const seeking = !P.dead && dy < 100 && Math.abs(dx) < SOLDIER_CHASE_RANGE;
        if (e.throwWindup > 0){
          e.throwWindup -= dt;
          if (e.throwWindup <= 0){
            G.knives.push({ x:e.x + e.w / 2 + facing * 14, y:e.y + 20, vx:facing * 380, vy:0, t:0, r:9 });
            SFX.fire(); e.cool = 1.5;
          }
        } else if (seeking && !e.jumpArc && e.cool <= 0 && dy < 60 && Math.abs(dx) < 260 && Math.sign(dx) === facing){
          e.throwWindup = .32; e.alert = .8; SFX.hit();
        } else if (seeking){
          if (!e.chasing){ e.alert = .5; SFX.hit(); }
          e.chasing = true;
          e.vx = Math.abs(e.vx) * Math.sign(dx);
        } else e.chasing = false;
      }

      /* scorpions pause now and then — less metronomic patrols */
      if (e.t === 'scorp'){
        if (e.pause > 0){ e.pause -= dt; }
        else if (Math.random() < dt * .25){ e.pause = .8 + Math.random(); }
      }

      /* mummy: slow, relentless — turns to shamble toward the player when
         she's near and roughly level (edge-turning still stops it at gaps) */
      if (e.t === 'mummy'){
        const dx = P.x - e.x, dy = Math.abs(P.y - e.y);
        if (!P.dead && dy < 80 && Math.abs(dx) > 6 && Math.abs(dx) < 340)
          e.vx = Math.abs(e.vx) * Math.sign(dx);
      }

      /* shieldman: patrols like a bandit but never charges — his threat is
         the raised shield (frontal hits bounce off, see hitEnemy). He turns
         to face the player so flanking takes actual footwork. */
      if (e.t === 'shieldman'){
        e.blockT = Math.max(0, (e.blockT || 0) - dt);
        const dx = P.x - e.x, dy = Math.abs(P.y - e.y);
        if (!P.dead && dy < 60 && Math.abs(dx) > 30 && Math.abs(dx) < 200 &&
            Math.sign(dx) !== (Math.sign(e.vx) || -1)){
          e.vx = -e.vx; e.alert = .5;
        }
      }

      /* snow leopard: crouch telegraph, then a long pouncing leap at the
         player — airborne it clears gaps, so keep moving */
      if (e.t === 'leopard'){
        e.pounceCool = Math.max(0, (e.pounceCool || 0) - dt);
        if (e.pounceT > 0){ e.pounceT -= dt; if (e.onG || e.pounceT <= 0){ e.pounceT = 0; e.pounceCool = 1.6; } }
        if (e.pounceWind > 0){
          e.pounceWind -= dt;
          if (e.pounceWind <= 0 && e.onG){
            e.vy = -430; e.pounceT = .9; SFX.stomp();
            puff(e.x + e.w / 2, e.y + e.h, 8, '#dce4ec', 120, .4);
          }
        } else if (e.onG && e.pounceCool <= 0 && !P.dead){
          const dx = P.x - e.x, dy = P.y - e.y;
          if (Math.abs(dx) < 230 && dy > -70 && dy < 50){
            e.vx = Math.abs(e.vx) * (Math.sign(dx) || 1);
            e.pounceWind = .3; e.alert = .7; SFX.hit();
          }
        }
      }

      const winding = ((e.t === 'bandit' || e.t === 'elite') && e.windup > 0) ||
                      (e.t === 'thrower' && e.throwWindup > 0) ||
                      (e.t === 'leopard' && e.pounceWind > 0);
      const paused = (e.t === 'scorp' && e.pause > 0) || winding;
      const lunging = (e.t === 'bandit' || e.t === 'elite') && e.lunge > 0;
      const chasingSoldier = (e.t === 'bandit' || e.t === 'elite' || e.t === 'thrower') && e.chasing;
      const restingGuard = (e.t === 'bandit' || e.t === 'elite' || e.t === 'thrower') && !chasingSoldier;
      const spd = paused ? 0 : lunging ? (e.t === 'elite' ? 210 : 170) :
                  (e.t === 'leopard' && e.pounceT > 0) ? 265 :
                  /* mid-leap over a gap: a fixed bounding speed carries it clear
                     across, rather than the (much slower) ground chase speed */
                  (chasingSoldier && e.jumpArc) ? SOLDIER_JUMP_HSPD :
                  chasingSoldier ? Math.abs(e.vx) * 1.5 :
                  /* stand guard at its post instead of pacing until it
                     actually notices the player */
                  restingGuard ? 0 : Math.abs(e.vx);
      e.moving = spd > 0;
      const dir = Math.sign(e.vx) || -1;
      e.x += dir * spd * dt; e.vx = dir * Math.abs(e.vx);
      collideX(e);
      e.vy = (e.vy || 0) + 2200 * dt; e.y += e.vy * dt; collideY(e, false);
      if (e.onG) e.jumpArc = false;
      if (e.hitWall || (e.onG && spd > 0 && edgeAhead(e))){
        if (!e.hitWall && chasingSoldier && e.onG && gapWidth(e) <= SOLDIER_JUMP_GAP_TILES){ e.vy = SOLDIER_JUMP_VY; e.jumpArc = true; }
        else { e.vx = -e.vx; e.lunge = 0; e.windup = 0; }
      }

      /* contact with player */
      if (!P.dead && aabb(e, P)){
        if (P.vy > 160 && P.y + P.h < e.y + e.h * .6){ // stomp
          P.vy = -520; P.jumps = 1; G.hitstop = Math.max(G.hitstop, .05); SFX.stomp();
          puff(e.x + e.w / 2, e.y, 10, '#c9a15a', 130, .5);
          /* the elite guard, tanky mummy and shield soldier shrug off a
             stomp into a normal hit instead of an instant kill (the shield
             can't cover a man's head) */
          if (e.t === 'elite' || e.t === 'mummy' || e.t === 'shieldman'){ e.hp--; e.hurt = .2; } else e.hp = 0;
          if (e.hp <= 0 && !e.dead){
            e.dead = .01; const pts = enemyPoints(e.t); G.score += pts;
            ring(e.x + e.w / 2, e.y + e.h / 2, '#ffe9b0', 34);
            popText(e.x + e.w / 2, e.y - 8, '+' + pts);
          }
        } else { hurtPlayer(1, Math.sign(P.x - e.x)); e.lunge = 0; } // stop the charge on contact instead of sailing past
      }
    }

    /* falcon: gravity-free hunter. Hovers a sine-bob patrol lane, and when
       the player passes underneath it folds its wings and dives at where he
       stood, then climbs back to its lane before it can strike again. */
    if (e.t === 'falcon'){
      e.anim += dt;
      e.hurt = Math.max(0, e.hurt - dt);
      e.alert = Math.max(0, (e.alert || 0) - dt);
      e.cool = Math.max(0, (e.cool || 0) - dt);
      if (e.mode === 'dive'){
        e.x += e.dvx * dt; e.y += e.dvy * dt;
        const gc = Math.floor((e.x + e.w / 2) / TILE), gr = Math.floor((e.y + e.h) / TILE);
        if (e.y >= e.ty || solid(tileAt(gc, gr))){ e.mode = 'return'; e.vx = Math.abs(e.vx) * (e.dvx < 0 ? -1 : 1); }
      } else if (e.mode === 'return'){
        e.y -= 150 * dt;
        e.x += Math.sign(e.vx || 1) * 55 * dt;
        if (e.y <= e.oy){ e.y = e.oy; e.mode = 'patrol'; e.cool = 1.8; }
      } else {
        e.x += e.vx * dt;
        if (e.x > e.ox + e.range || e.x < e.ox - e.range) e.vx = -e.vx;
        e.y = e.oy + Math.sin(e.anim * 2.2) * 12;
        const dx = (P.x + P.w / 2) - (e.x + e.w / 2), dy = P.y - (e.y + e.h);
        if (!P.dead && e.cool <= 0 && dy > 30 && dy < 320 && Math.abs(dx) < 150){
          const len = Math.hypot(dx, dy) || 1;
          e.dvx = 330 * dx / len; e.dvy = 330 * dy / len;
          e.ty = P.y + P.h - e.h; e.mode = 'dive'; e.alert = .6; SFX.hit();
        }
      }
      if (!P.dead && aabb(e, P)){
        if (P.vy > 160 && P.y + P.h < e.y + e.h * .7){
          P.vy = -520; P.jumps = 1; G.hitstop = Math.max(G.hitstop, .05); SFX.stomp();
          puff(e.x + e.w / 2, e.y, 10, '#9a8064', 130, .5);
          e.hp = 0;
          if (!e.dead){
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
