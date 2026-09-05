# WMVxTOPNG — Deep Project Findings / Working Context

Date: 2026-09-05
Repository: ehsramezani-creator/WMVxTOPNG
Primary working branch reviewed: feature/wmvx-character-texturing
Current reviewed HEAD: 961d94a964511919017fe907ee24b023037ed4c1

> This file replaces the previous temporary GryphonPet-only context. It is the consolidated working reference for the next WMVxTOPNG development session.

---

## 1. Project objective

WMVxTOPNG is a Node.js/ESM project intended to load World of Warcraft 3.3.5a (WotLK) legacy M2 models, resolve their external SKIN profiles and textures, assemble renderable geometry/materials, and render PNG images. The project is explicitly based on understanding WMVx-compatible behavior rather than inventing a new interpretation of the model format.

The currently validated pipeline is:

M2 + SKIN + BLP + optional DBC
↓
M2LegacyLoader
↓
M2SkinResolver / SkinLegacyLoader
↓
MaterialResolver
↓
CharacterTextureResolver / CreatureTextureResolver
↓
ModelAssembler
↓
SoftwareRenderer
↓
PNGEncoder

For Creature models, DBC resolution is:

M2 model path
↓
CreatureModelData.dbc
↓
modelData.id
↓
CreatureDisplayInfo.dbc
↓
displayInfo.id
↓
WMVx numeric Skins ID
↓
texture variations / overrides

Important terminology: WMVx “Skins” is a numeric software concept/field. A `.skin` file is a binary model-profile file. They must never be treated as the same thing. Numeric Skins can apply to model types beyond Creature.

---

## 2. Repository structure and historical record

The repository contains the conversation-history directory with the exact intentional spelling:

ConversitionHistory/
  WMVxTOPNG 01.md
  WMVxTOPNG 02.md
  WMVxTOPNG 03.md
  WMVxTOPNG 04.md
  WMVxTOPNG 05.md
  WMVxTOPNG 06.md
  WMVxTOPNG 07.md
  WMVxTOPNG 08.md
  temp.md

The eight historical conversation files are present on feature/wmvx-character-texturing. They are important evidence and should be treated as historical project documentation, not as disposable notes.

The old temp.md contained a GryphonPet-only temporary context. It has now been replaced by this consolidated project report.

---

## 3. M2LegacyLoader findings

File: src/loaders/M2LegacyLoader.js

The loader targets WotLK 3.3.5a legacy M2 and expects magic MD20 and version 264 or newer according to its current validation.

Important verified header offsets used by the implementation:

0x3c  nVertices
0x40  ofsVertices
0x44  nViews
0x50  nTextures
0x54  ofsTextures
0x70  nRenderFlags
0x74  ofsRenderFlags
0x80  nTextureLookups
0x84  ofsTextureLookups

The implementation reads vertices as 48-byte records containing:
- position: 3 float32
- boneWeights: 4 bytes
- boneIndices: 4 bytes
- normal: 3 float32
- texCoord: 2 float32
- texCoord2: 2 float32

Texture records are 16 bytes and are interpreted as:
- type
- flags
- name length
- name offset

Render flags are 4 bytes:
- flags: uint16
- blendingMode: uint16

Texture lookups are uint16 values.

The loader performs explicit range validation before reading arrays. This is important because malformed offsets/counts should fail deterministically rather than corrupting downstream geometry/material resolution.

The model object records nViews as skinProfileCount and delegates external profile selection to M2SkinResolver.

Known limitation/attention point: the current loader deliberately implements only the portions of the legacy M2 needed by the present renderer. It does not yet constitute a complete M2 animation/bone/particle/camera/light parser. This is acceptable for the current static PNG objective, but must remain explicit when expanding model coverage.

---

## 4. SKIN format findings

File: src/loaders/SkinLegacyLoader.js

The SKIN loader validates the SKIN magic and reads the 0x30-byte header:

indicesCount / indicesOffset
trianglesCount / trianglesOffset
propertiesCount / propertiesOffset
submeshesCount / submeshesOffset
batchesCount / batchesOffset
bonesCount

Indices and triangles are uint16 arrays. Triangle count must be divisible by three.

Submeshes are 48-byte records containing IDs, vertex/triangle ranges, bone information, center/sort-center positions and sort radius.

Batches are 24-byte records containing:
- flags
- priorityPlane
- shader
- skinSectionIndex
- geosetIndex
- colorIndex
- materialIndex
- materialLayer
- textureCount
- textureComboIndex
- textureCoordIndex
- textureWeightIndex
- textureTransformIndex

A critical verified semantic detail is:

submesh.vertexStart/vertexCount address the parent M2 vertex array, not the SKIN index array.
submesh.triangleStart/triangleCount address the SKIN triangle array.

The loader validates each submesh triangle range.

Known limitation/attention point: properties and bonesCount are parsed at header level but the current renderer does not yet consume the complete properties/bone structures. Static rendering currently relies on the geometry/index/material data needed by the tested models.

---

## 5. SKIN profile resolution

File: src/loaders/M2SkinResolver.js

The resolver uses the actual M2 basename and directory. For an M2 such as Shark.M2 and profileCount = 1, candidate naming is Shark00.skin. For multiple views/profiles it generates:

Base00.skin
Base01.skin
Base02.skin
...

The preferred profile index is attempted first; remaining candidates follow.

This is a key confirmed rule: `.skin` names are based on the actual M2 basename. Do not invent a generic or Creature-only naming scheme.

If no candidate exists, the resolver throws SKIN_NOT_FOUND and exposes candidate paths.

---

## 6. Material resolution findings

File: src/loaders/MaterialResolver.js

For every SKIN batch, textureComboIndex is resolved through the M2 textureLookups array. The resulting texture index selects an M2 texture record.

materialIndex is resolved against M2 renderFlags. The material exposes:
- textureLookupIndex
- textureIndex
- texture
- renderFlagsIndex
- renderFlags
- blendMode
- materialLayer
- textureCount
- textureCoordIndex
- textureWeightIndex
- textureTransformIndex

This establishes the important chain:

SKIN batch.textureComboIndex
→ M2 textureLookups
→ M2 texture index
→ M2 texture record

and:

SKIN batch.materialIndex
→ M2 renderFlags
→ blending mode / flags

The current implementation intentionally keeps the resolution deterministic and does not attempt to infer missing indices.

---

## 7. Model assembly findings

File: src/loaders/ModelAssembler.js

The assembler converts SKIN triangle references into direct M2 vertex indices:

SKIN triangle entry
→ SKIN indices array
→ M2 vertex index

It validates both bounds.

Submeshes preserve their triangle ranges and expose firstIndex/indexCount. Batches are connected to their corresponding submesh through skinSectionIndex.

This is the correct geometry bridge for the current static renderer.

---

## 8. Creature texture / numeric Skins findings

File: src/loaders/CreatureTextureResolver.js

The Creature resolver is based on the actual WMVx relationship between CreatureModelData and CreatureDisplayInfo.

Model matching is normalized for slashes, case and extension and supports suffix/path matching. The model-data record is found first. Its numeric ID is then used to find CreatureDisplayInfo records.

Creature texture slots use base texture type 11:
slot 0 → textureType 11
slot 1 → textureType 12
slot 2 → textureType 13

Texture groups are deduplicated according to the same identity concept as WMVx: texture[0], texture[1], and texture[2] are compared lexicographically; group ID is not part of the identity.

Texture files are resolved by direct normalized name, extension-normalized name, nearby model directory, and finally basename fallback.

This resolver also exposes missing texture names instead of silently inventing replacements.

Important: although the class is named CreatureTextureResolver, the numeric WMVx Skins concept itself must not be generalized as “Creature-only”. The current implementation is specifically a Creature DBC resolver; the project-level Skins concept is broader.

---

## 9. Character texture findings

The render tool also invokes CharacterTextureResolver and CharSections.dbc for character models. Character body/hair/facial-hair texture handling is distinct from CreatureDisplayInfo handling.

Current render path treats:
- texture type 1 as character body/composite
- texture type 6 as direct hair
- texture type 7 as direct facial hair

This separation is important. Character texture composition must not be mixed with Creature numeric skin resolution.

---

## 10. Texture path and BLP findings

File: src/tools/render-model.js plus BLPDecoder usage

The renderer collects the model-root file tree into a normalized map. Backslashes are converted to slashes and keys are lowercased.

decodeTexture supports both repository-relative texture names and absolute filesystem paths. This was important for Creature texture overrides.

BLP images are decoded before rendering and cached by normalized key.

The renderer tracks the largest decoded texture and uses it to determine output resolution.

Verified historical result: FishingBox produced a 2048 × 2048 PNG, and the PNG is RGBA.

---

## 11. SoftwareRenderer findings

File: src/render/SoftwareRenderer.js

Current default background is transparent:
[0, 0, 0, 0]

The renderer is a CPU/software triangle rasterizer. It performs camera projection, barycentric triangle rasterization, depth testing, texture sampling and simplified blend-mode handling.

It samples texture coordinates using the vertex UVs and wraps UV values into the 0..1 range.

Current blend handling includes modes 1 through 7 plus the default opaque/direct path. Render flags are also used for no-Z-write behavior.

The renderer is intentionally lightweight and is not a full WoW GPU-equivalent shader implementation.

This distinction matters: visually correct output on the established regression set proves the current path is good enough for those models, but does not prove exact WoW shader equivalence for every M2 feature.

---

## 12. Render tool findings

File: src/tools/render-model.js

The tool:
1. validates command arguments
2. optionally enables orbit mode
3. collects model files
4. loads M2
5. resolves SKIN
6. assembles geometry
7. resolves materials
8. discovers Creature DBC files
9. resolves Creature texture overrides
10. resolves Character textures
11. decodes/caches textures
12. computes render resolution
13. renders one view or a complete orbit
14. writes RGBA PNG
15. prints structured JSON diagnostics

The current minimum render resolution is 2048 pixels on the largest source-texture dimension. Therefore small source textures are upscaled for rendering, while larger source textures are preserved at their maximum dimension.

Orbit mode reads config/camera-orbit.json and historically uses 31 views:
- elevation 0: 12 views
- elevation -30: 8 views
- elevation -45: 6 views
- elevation -60: 4 views
- elevation -90: 1 view

Do not casually change this orbit configuration because it is part of the established regression baseline.

---

## 13. Critical historical rendering fix

A decisive historical finding was that Creature texture overrides must be matched by WMVx texture TYPE, not merely by array position/index.

The current render path therefore builds:

textureType → Creature override

and applies the override to the M2 material whose texture.type matches.

This fixed the previously observed gray/untextured GryphonPet rendering and was also applied to orbit rendering.

Absolute override paths are supported by decodeTexture, which was necessary for the corrected Creature path.

This is a known-good architectural decision and should not be replaced with an index-only mapping.

---

## 14. Known-good regression suite

The established regression models are:

01 Boxtest
02 FishingBox
03 Dam / outland_bone_dam
04 AllianceRider
05 GryphonPet
06 FelGolem
07 SHARK / Shark + HammerHead

Historically validated:

01 Boxtest       1/1 successful
02 FishingBox    1/1 successful
03 Dam           1/1 successful
04 AllianceRider 1/1 successful
05 GryphonPet    1/1 successful
06 FelGolem      1/1 successful
07 SHARK         2/2 successful

Normal and orbit rendering were confirmed for the first six regression models. Orbit baseline is 31 views.

The development rule established by the project history is: when a regression occurs, inspect the last known-good Git/test result first. Do not modify the loader or renderer through guess-and-check when a known-good implementation/history already exists.

---

## 15. Confirmed numeric WMVx Skins results

01 Boxtest
Resolved: false
Skin count: 0

02 FishingBox
Resolved: false
Skin count: 0

03 Dam
Resolved: false
Skin count: 0

04 AllianceRider
Resolved: true
Skin count: 1
Skin IDs: 17202

05 GryphonPet
Resolved: true
Skin count: 1
Skin IDs: 30412

06 FelGolem
Resolved: true
Skin count: 1
Skin IDs: 22733

07-A Shark
Resolved: true
Skin count: 3
Skin IDs: 1557, 12193, 12200

07-B HammerHead
Resolved: true
Skin count: 3
Skin IDs: 2851, 12196, 12198

These are numeric WMVx Skins results, not `.skin` filenames.

---

## 16. GryphonPet evidence chain

Directory:
ModelsTree/Creature/GryphonPet

Assets:
GryphonPet.blp
GryphonPet.M2
GryphonPet00.skin
GryphonPet01.skin
GryphonPet2.blp
GryphonPet3.blp

Verified model data:
CreatureModelData.dbc record → ID 3212
ModelName → Creature\\GryphonPet\\GryphonPet.mdx

Then:
CreatureDisplayInfo.dbc
→ modelId 3212
→ displayInfo ID 30412

Texture variations:
slot 0 → GryphonPet
slot 1 → GryphonPet3
slot 2 → GryphonPet2

Known-good render metadata:
version 264
vertices 1120
triangles 1366
skin GryphonPet00.skin
textures 4
Normal render PASS
Camera orbit PASS
31 orbit views

This is a strong reference for future Creature work.

---

## 17. Shark / HammerHead Test 07 evidence

Directory:
ModelsTree/Creature/SHARK

Exact assets:
HammerHead.M2        117472 bytes
HammerHead00.skin      7040 bytes
Shark.M2              116832 bytes
Shark00.skin            6736 bytes
SHARKSKINBLUE.BLP      88580 bytes
SharkSkinBrown.blp     88580 bytes
SharkSkinPurple.blp    88580 bytes

Numeric WMVx Skins:
Shark → 1557, 12193, 12200
HammerHead → 2851, 12196, 12198

The next rendering session should start with these two models using the existing code exactly as-is:
1. normal Shark render
2. orbit Shark
3. normal HammerHead render
4. orbit HammerHead

No code changes should be made before observing the actual result.

---

## 18. Other known assets / test evidence

World shark-model test assets are also present under:
ModelsTree/World/AZEROTH/BOOTYBAY/PASSIVEDOODAD/SharkModels/

SahauginReflect.blp
SharkModel01.m2
SharkModel0100.skin
SharkSkin.blp

These should be considered a separate World/Doodad model case from Creature/SHARK and should not be conflated with the Creature numeric Skins test.

The repository also contains Character/BloodElf/Female/result.txt and mapping artifacts such as AllianceRider-mapping.json and AllianceRider-mapping-summary.json, which are historical analysis artifacts and should be preserved as evidence.

CreatureDisplayInfoExtra.dbc was inspected locally and had:
size 1,825,335 bytes
magic WDBC
records 15,475
fields 21
recordSize 84
stringSize 525,415

This file is evidence for extended Creature display information but is not itself equivalent to CreatureDisplayInfo.dbc.

---

## 19. Git checkpoints / important history

Known relevant commits include:

591e977 — Add WMVx-compatible creature skin ID resolution
4edcaa8 — Checkpoint: stable rendering orbit and creature skins
0df76ed — Cleanup repository and document stable rendering checkpoint
151bc16 — Establish stable rendering and camera orbit baseline
e3fb283 — historical decisive evidence for correct Creature texture override mapping by textureType
d14bd53 — healthy M2/SKIN/texture/material/character/renderer wiring
f057749 — Add conversation history
82cd55e492a170f165c1f3a2e8b712cab1b6ef0 — Add temporary GryphonPet conversation context
07612d4 — Fix creature texture overrides in orbit rendering
961d94a — Remove temporary xyz test image

Current branch HEAD reviewed: 961d94a964511919017fe907ee24b023037ed4c1.

The current clean checkpoint should be treated as the baseline until a concrete regression is observed.

---

## 20. What is proven vs. what is not proven

PROVEN / repeatedly evidenced:
- WotLK 3.3.5a legacy M2 version 264 parsing for the tested models.
- External SKIN loading for tested profiles.
- M2 basename-based SKIN naming.
- SKIN triangle/index → M2 vertex assembly.
- Material texture lookup and render-flag resolution for tested models.
- BLP decoding for tested textures.
- Creature DBC model → displayInfo → numeric WMVx Skins resolution.
- Creature texture override matching by textureType.
- Character texture path for the established character tests.
- Transparent RGBA PNG output.
- Resolution scaling to a minimum 2048-pixel largest dimension.
- 31-view orbit rendering for the established regression set.

NOT YET PROVEN universally:
- Complete M2 header/animation/bone parsing.
- Complete WoW shader/material semantics for every blend/shader combination.
- Complete use of SKIN properties and bone data.
- Full character geoset/animation/camera/light feature parity.
- Every possible WoW model category and every possible numeric WMVx Skins source.
- Exact pixel parity with WoW/WMVx for all models.
- Robust support for every M2 version newer than the target legacy format.

These distinctions are important to prevent false confidence.

---

## 21. Main architectural risks identified

1. Static renderer scope is narrower than the full M2 format.
2. Simplified blending may fail on uncommon materials.
3. UV transforms/secondary UV channels are parsed but not fully represented in rasterization.
4. Bone animation/deformation is not part of the current static assembly path.
5. Creature resolution is intentionally Creature-specific even though the WMVx numeric Skins concept is broader.
6. Texture basename fallback can become ambiguous if multiple identical basenames exist; current search order must therefore be preserved and tested.
7. Current output resolution is derived from decoded textures rather than a fixed final export size; this is deliberate and already validated for FishingBox.
8. Regression behavior must be investigated through Git/history and known-good test cases before code changes.

---

## 22. Development protocol established from project history

When a model fails:

1. Preserve the failing output/log.
2. Identify exact model, SKIN, BLP and DBC inputs.
3. Compare with the nearest known-good regression model.
4. Inspect Git history for the corresponding feature/fix.
5. Reproduce the known-good commit/path where possible.
6. Determine whether failure is M2 parsing, SKIN indexing, material lookup, texture path, DBC resolution, rasterization, blend mode, camera or PNG encoding.
7. Only then modify code.
8. Re-run the full relevant regression set.

Avoid speculative changes such as changing offsets, texture indices, camera axes, or shader behavior without evidence.

---

## 23. Immediate next work

Start with Test 07 rendering:

Shark.M2
HammerHead.M2

Use the exact existing assets and existing renderer. First normal rendering, then 31-view orbit. Record:
- selected SKIN
- vertex count
- triangle count
- M2 texture records
- resolved numeric WMVx Skins IDs
- actual BLP files selected
- source texture resolution
- output resolution
- missing textures
- normal/orbit visual result

Only after this evidence exists should the implementation be changed.

---

## 24. Final project conclusion

The project has moved beyond basic file parsing. The current stable architecture correctly connects legacy M2 geometry, external SKIN profiles, material lookup, BLP textures, Creature/Character texture resolution, software rasterization and PNG export for a meaningful regression suite.

The most important implementation lessons are:

- Trust verified WMVx-compatible structure and historical working commits.
- Keep numeric WMVx Skins separate from `.skin` files.
- Resolve SKIN files from the actual M2 basename.
- Resolve material texture indices through textureComboIndex → textureLookups → M2 textures.
- Resolve Creature numeric Skins through CreatureModelData → CreatureDisplayInfo.
- Apply Creature texture overrides by textureType, not texture-array index.
- Preserve transparent RGBA output and established resolution behavior.
- Treat the six established render tests plus Test 07 Shark/HammerHead as regression evidence.
- Do not guess when Git already contains a known-good example.
