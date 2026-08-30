# Roadmap

## Phase 1 — Real M2 + SKIN

- Obtain one known-good WoW 3.3.5a M2 model.
- Obtain the exact external SKIN file(s).
- Record archive/path/name/size/version information.

## Phase 2 — Binary Verification

- Inspect M2 and SKIN with warcraft-rs.
- Compare offsets, counts, indices, submeshes, and batches.
- Record findings in project documentation.

## Phase 3 — SKIN Resolution

- Determine how `00.skin`, `01.skin`, etc. map to an M2.
- Document the filename resolver rules.

## Phase 4 — Loader Integration

- Audit current `M2LegacyLoader`.
- Implement `SkinLegacyLoader.js`.
- Integrate SKIN resolution into `M2LegacyLoader.getSkin()`.

## Phase 5 — Renderer Integration

- Convert parsed SKIN data to the Renderer format.
- Render `brokenfemale.m2`.
- Do not proceed to batch extraction until this milestone is reliable.

## Phase 6 — Coverage

- Creature
- Character
- Item
- Weapon
- Mount

## Phase 7 — Appearance

- Texture
- Material
- Alpha / blend modes

## Phase 8 — Output

- PNG renderer
- Batch extraction

## Phase 9 — Optimization

- Caching
- Memory usage
- Parallel processing
- Throughput
