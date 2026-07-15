# hero_fire — fireball cast frames (from the "Swing Arms" clip)

The game plays 2D sprite frames, not 3D. To use the model's **"Swing Arms"**
animation (arm raised to chest) for the fireball cast, export it from Prisma3D
as a PNG frame sequence and drop the files here. The game loads them
automatically — until then it falls back to a hand-drawn raised arm
(`heroFireReady()` in `js/actors.js`).

## Export specs (must match the existing run/jump frames)
- **Files:** `fire_0.png` … `fire_7.png` (8 frames — change `HERO_FIRE_FRAMES`
  in `js/actors.js` if you export a different count).
- **Format:** transparent PNG (alpha), one frame per file.
- **Camera / scale / orientation:** identical to `img/hero_run/run_*.png`
  (hero facing **right**, same distance and framing, ~780 px tall,
  bottom-aligned). The game flips it for the left-facing direction and scales
  every hero frame to 118 px tall, so consistent framing across clips is what
  keeps the cast blending with run/jump/roll.
- **Coverage:** sample the "Swing Arms" clip across the raise→extend motion
  (start = arm down/mid, end = arm up at chest, fist forward).

## Enabling
After dropping the PNGs here, set `HERO_FIRE_ENABLED = true` in
`js/actors.js` (it's off by default so the game never requests missing
files). The fireball cast will then render the real model frames, and the
flame will still burst off the fist.
