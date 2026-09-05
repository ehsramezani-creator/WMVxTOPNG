# WMVxTOPNG — Stable Rendering & Creature Skin Checkpoint

Date: 2026-09-05

## Purpose

This checkpoint records the first stable state of the WMVxTOPNG
M2/SKIN → model assembly → rendering → camera orbit pipeline,
including WMVx-compatible Creature Skin ID resolution.

The goal of this document is to preserve the technical reasoning and
test results so future development can continue without relying on
temporary files, memory, or guess-and-check changes.

---

## Git Checkpoint History

### fa99d7e
Add model path testing and creature DBC loaders.

Established the model-path based testing and the Creature DBC
infrastructure required for resolving Creature model information.

### 591e977
Add WMVx-compatible creature skin ID resolution.

Added the Skin ID resolution layer and Creature provider.

The logical architecture is:

M2 Model
  ↓
SkinIdResolver
  ↓
CreatureSkinIdProvider
  ↓
CreatureModelData.dbc
  ↓
CreatureDisplayInfo.dbc
  ↓
Texture Groups
  ↓
WMVx Skin IDs

Important distinction:

A WMVx Skin ID is a logical texture/display group ID.
It is NOT the same thing as a WotLK `.skin` auxiliary file such as
00.skin, 01.skin, etc.

### 4edcaa8
Checkpoint: stable rendering orbit and creature skins.

This commit was intentionally retained as an archival checkpoint.
It contains the stable project state plus temporary/debug artifacts
that were later removed from normal Git tracking.

Do not rewrite this history unless there is a specific reason to do so.

---

## Stable Test Set

The following models were used for the stable validation run.

### Test 01 — Boxtest

Model:
World/ArtTest/Boxtest/xyz.m2

Result:
- M2 loading: PASS
- Normal render: PASS
- Camera orbit: PASS
- Orbit views: 31
- Creature Skin IDs: not applicable

Reason:
Boxtest is a World model, not a Creature model.

### Test 02 — FishingBox

Model:
World/AZEROTH/BOOTYBAY/PASSIVEDOODAD/FishingBox/FishingBox.m2

Result:
- M2 loading: PASS
- Normal render: PASS
- Camera orbit: PASS
- Orbit views: 31
- Creature Skin IDs: not applicable

Reason:
FishingBox is a World model, not a Creature model.

The rendered PNG resolution was also verified against the BLP
maximum resolution. FishingBox produced a 2048 × 2048 PNG.

### Test 03 — Dam

Model:
World/OUTLAND/PASSIVEDOODADS/Dam/outland_bone_dam.m2

Result:
- M2 loading: PASS
- Normal render: PASS
- Camera orbit: PASS
- Orbit views: 31
- Creature Skin IDs: not applicable

Reason:
Dam is a World model, not a Creature model.

### Test 04 — AllianceRider

Model:
Creature/ALLIANCERIDER/AllianceRider.m2

Result:
- M2 loading: PASS
- Normal render: PASS
- Camera orbit: PASS
- Orbit views: 31
- Creature Skin ID: 17202

### Test 05 — GryphonPet

Model:
Creature/GryphonPet/GryphonPet.m2

Result:
- M2 loading: PASS
- Normal render: PASS
- Camera orbit: PASS
- Orbit views: 31
- Creature Skin ID: 30412

### Test 06 — FelGolem

Model:
Creature/FelGolem/FelGolem.m2

Result:
- M2 loading: PASS
- Normal render: PASS
- Camera orbit: PASS
- Orbit views: 31
- Creature Skin ID: 22733

Important:
CreatureDisplayInfo entries 22733 and 23240 contained identical
texture triplets. WMVx-compatible TextureGroup deduplication keeps
the first logical group ID, therefore 22733 is exposed.

### Test 07 — SHARK

Two Creature models were tested.

#### Shark

Model:
Creature/SHARK/Shark.m2

Result:
- M2 loading: PASS
- Normal render: PASS
- Camera orbit: PASS
- Orbit views: 31
- Creature Skin IDs: 1557, 12193, 12200

#### HammerHead

Model:
Creature/SHARK/HammerHead.m2

Result:
- M2 loading: PASS
- Normal render: PASS
- Camera orbit: PASS
- Orbit views: 31
- Creature Skin IDs: 2851, 12196, 12198

---

## Stable Test Summary

Total tested model instances: 8

M2 loading:
8/8 PASS

Normal rendering:
8/8 PASS

Camera orbit:
8/8 PASS

Orbit views:
31 views per model

Creature Skin ID resolution:
5 Creature model instances resolved successfully.

World models without Creature Skin IDs:
3

The absence of a Skin ID for Boxtest, FishingBox, and Dam is not a
failure. The current provider intentionally handles Creature models.

---

## Rendering Baseline

The renderer supports transparent PNG output.

The renderer also uses the BLP maximum texture resolution when
determining the PNG output resolution.

Verified example:

FishingBox:
2048 × 2048
PNG color type: RGBA

Camera orbit baseline:
31 views per model.

The current orbit pattern contains:
- 12 horizontal views
- 8 views at elevation -30°
- 6 views at elevation -45°
- 4 views at elevation -60°
- 1 view at elevation -90°

Total:
31 views.

---

## WMVx Compatibility Notes

Creature texture groups are based on CreatureDisplayInfo IDs.

WMVx's TextureGroup identity is determined by the texture triplet,
not simply by the numeric DisplayInfo ID.

The effective comparison uses texture slots 0, 1, and 2.

Therefore duplicate texture triplets must be deduplicated while
preserving the first encountered DisplayInfo ID.

This behavior was verified against the WMVx reference implementation.

---

## Temporary Files and Git Policy

The checkpoint commit 4edcaa8 accidentally included local working
artifacts because `git add -A` was used before the repository cleanup.

Those artifacts include:
- TempTest/
- output/
- _snapshots/
- ExcelRanker/
- backup files
- temporary source copies
- trace/debug scripts
- local test reports

These files are useful for local investigation but are not part of
the clean project source.

They are therefore kept on the local filesystem but excluded from
future Git commits.

The `.gitignore` was extended on 2026-09-05 to cover these categories.

No local test or snapshot files are intentionally deleted as part of
this cleanup.

---

## Important Rule for Future Checkpoints

Do not use:

    git add -A

for a project checkpoint unless all untracked files have first been
reviewed.

Preferred workflow:

1. Check repository status.
2. Review untracked files.
3. Review the diff.
4. Stage only intended project files.
5. Run tests.
6. Commit with a descriptive message.
7. Push.
8. Record the checkpoint in this document when the state is considered
   stable.

---

## Current Stable Scope

At this checkpoint the following areas are considered stable:

- M2 legacy loading
- WotLK `.skin` loading infrastructure
- Model assembly
- Basic material resolution
- Software rendering
- Transparent PNG output
- BLP-driven output resolution
- Camera orbit
- Creature DBC loading
- Creature texture group resolution
- WMVx-compatible Creature Skin ID resolution
- Creature texture-group deduplication

Not yet considered complete:

- Character Skin ID provider
- Item Skin ID provider
- Weapon Skin ID provider
- Mount Skin ID provider
- Full character texture composition
- Complete alpha/material compatibility
- Batch PNG extraction
- Final performance optimization

---

## Next Development Principle

Future work should continue from this checkpoint using known-good
implementations and existing tests whenever possible.

When a regression occurs:

1. Compare against the last known-good implementation.
2. Inspect Git history.
3. Reproduce with an already passing model.
4. Change one logical component at a time.
5. Re-run the stable test set.
6. Only then extend the system to the next model category.
