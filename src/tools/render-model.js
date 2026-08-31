import fs from 'node:fs/promises';
import path from 'node:path';
import { M2LegacyLoader } from '../loaders/M2LegacyLoader.js';
import { ModelAssembler } from '../loaders/ModelAssembler.js';
import { MaterialResolver } from '../loaders/MaterialResolver.js';
import { CharacterTextureResolver } from '../loaders/CharacterTextureResolver.js';
import { BLPDecoder } from '../loaders/BLPDecoder.js';
import { SoftwareRenderer } from '../render/SoftwareRenderer.js';
import { encodeRGBA } from '../render/PNGEncoder.js';

function usage() { console.error('Usage: node src/tools/render-model.js <M2> [output.png] [modelsRoot] [dbRoot]'); process.exit(2); }
function normalize(p) { return String(p ?? '').replaceAll('\\', '/').replace(/^\/+/, '').toLowerCase(); }
async function collectFiles(root) {
  const out = new Map();
  async function walk(dir) { for (const entry of await fs.readdir(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) await walk(full); else out.set(normalize(path.relative(root, full)), full); } }
  await walk(root); return out;
}
async function findDb(root) {
  if (!root) return null;
  const names = [
    ['DBFilesClient', 'CharSections.dbc'],
    ['dbfilesclient', 'CharSections.dbc'],
    ['dbc', 'CharSections.dbc'],
    ['CharSections.dbc'],
  ];
  for (const parts of names) {
    const candidate = path.join(root, ...parts);
    try { await fs.access(candidate); return candidate; } catch {}
  }
  return null;
}

const [m2Path, outputPath = 'model.png', modelsRoot = path.dirname(process.argv[1]), dbRoot = modelsRoot] = process.argv.slice(2);
if (!m2Path) usage();
const root = path.resolve(modelsRoot), files = await collectFiles(root), decoder = new BLPDecoder();
const m2 = await new M2LegacyLoader().load(path.resolve(m2Path));
if (!m2.skin) throw new Error(`No SKIN profile found for ${m2Path}`);
const model = new ModelAssembler().assemble(m2, m2.skin);
const resolvedMaterials = new MaterialResolver().resolve(m2, m2.skin);
const dbPath = await findDb(path.resolve(dbRoot));
const characterTexture = await new CharacterTextureResolver({ decoder, files }).resolve(m2, { dbPath });

const imageCache = new Map();
async function decodeTexture(name) {
  if (!name) return null;
  const key = normalize(name), pathKey = key.endsWith('.blp') ? key : `${key}.blp`;
  if (imageCache.has(key)) return imageCache.get(key);
  const texturePath = files.get(key) ?? files.get(pathKey);
  if (!texturePath) return null;
  const image = decoder.decode(await fs.readFile(texturePath)); imageCache.set(key, image); return image;
}

const materialImages = [];
const textureStats = { referenced: 0, found: 0, decoded: 0, characterResolved: false, bodyBatches: 0, hairBatches: 0, facialHairBatches: 0, missing: [] };
for (const material of resolvedMaterials.materials) {
  const texture = material.texture;
  let image = null;
  if (texture?.name) {
    textureStats.referenced++;
    image = await decodeTexture(texture.name);
    if (image) { textureStats.found++; textureStats.decoded++; }
    else textureStats.missing.push(texture.name);
  }
  if (characterTexture.enabled && texture?.type === 1 && characterTexture.composite) {
    image = characterTexture.composite;
    textureStats.characterResolved = true;
    textureStats.bodyBatches++;
  } else if (characterTexture.enabled && texture?.type === 6 && characterTexture.direct?.hair?.length) {
    image = await decodeTexture(characterTexture.direct.hair[0]) ?? image;
    textureStats.hairBatches++;
  } else if (characterTexture.enabled && texture?.type === 7 && characterTexture.direct?.facialHair?.length) {
    image = await decodeTexture(characterTexture.direct.facialHair[0]) ?? image;
    textureStats.facialHairBatches++;
  }
  materialImages[material.index] = image;
}
model.materials = resolvedMaterials.materials.map((material, i) => ({ ...material, image: materialImages[i] ?? null }));
model.batches = resolvedMaterials.batches;
const image = new SoftwareRenderer({ width: 512, height: 512 }).render(model);
await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
await fs.writeFile(path.resolve(outputPath), encodeRGBA(image.width, image.height, image.pixels));
console.log(JSON.stringify({
  model: m2.name,
  version: m2.version,
  vertices: model.vertices.length,
  triangles: model.indices.length / 3,
  skin: path.basename(m2.skin.filePath ?? ''),
  textures: m2.textures.length,
  dbPath,
  characterTexture: characterTexture.enabled ? {
    identity: characterTexture.identity,
    layers: characterTexture.layers?.length ?? 0,
    missingBase: characterTexture.missingBase ?? null,
    missing: characterTexture.missing ?? [],
  } : characterTexture,
  textureStats,
  output: path.resolve(outputPath)
}, null, 2));
