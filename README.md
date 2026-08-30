# WMVxTOPNG

WoW 3.3.5a M2/SKIN model loading and PNG rendering pipeline.

## Project Goal

Build a focused pipeline that can load World of Warcraft 3.3.5a M2 models and their external SKIN files, resolve textures/materials, render the model, and eventually extract PNG images in batch.

## Roadmap

1. Extract one real M2 + SKIN pair
2. Verify binary structures against warcraft-rs
3. Determine 00.skin / 01.skin / ... naming and resolution
4. Audit the existing M2LegacyLoader
5. Implement SkinLegacyLoader.js
6. Add SKIN resolution to M2LegacyLoader.getSkin()
7. Convert SKIN data to the Renderer model format
8. Render brokenfemale.m2
9. Test multiple Creatures
10. Test Character / Item / Weapon / Mount
11. Fix texture / material / alpha handling
12. Produce PNG output
13. Batch PNG extraction
14. Optimize

## Reference Repositories

- warcraft-rs — binary format reference
- wow.export — practical M2/SKIN/rendering reference
- WMVx — existing loader/renderer architecture reference
- WMVx-MPQ-FBX-Exporter — separate native M2/SKIN investigation and extraction project

## Principle

External repositories are references. The implementation in this repository should remain focused and independent, copying only the concepts and code that are actually required.
