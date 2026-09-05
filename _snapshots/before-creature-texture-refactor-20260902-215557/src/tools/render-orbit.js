import fs from 'node:fs/promises';
import path from 'node:path';
import { M2LegacyLoader } from '../loaders/M2LegacyLoader.js';
import { ModelAssembler } from '../loaders/ModelAssembler.js';
import { MaterialResolver } from '../loaders/MaterialResolver.js';
import { CharacterTextureResolver } from '../loaders/CharacterTextureResolver.js';
import { BLPDecoder } from '../loaders/BLPDecoder.js';
import { SoftwareRenderer } from '../render/SoftwareRenderer.js';
import { encodeRGBA } from '../render/PNGEncoder.js';
import { buildOrbit, DEFAULT_ORBIT_PATTERN } from '../camera/CameraOrbit.js';

function normalize(p) { return String(p ?? '').replaceAll('\\', '/').replace(/^\/+/, '').toLowerCase(); }
async function collectFiles(root) {
  const out = new Map();
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.set(normalize(path.relative(root, full)), full);
    }
  }
  await walk(root);
  return out;
}
async function findDb(root) {
  for (const parts of [['DBFilesClient', 'CharSections.dbc'], ['dbfilesclient', 'CharSections.dbc'], ['dbc', 'CharSections.dbc'], ['CharSections.dbc']]) {
    const candidate = path.join(root, ...parts);
    try { await fs.access(candidate); return candidate; } catch {}
  }
  return null;
}
async function loadOrbitPattern(configPath) {
  if (!configPath) return DEFAULT_ORBIT_PATTERN;
  const raw = await fs.readFile(path.resolve(configPath), 'utf8');
  const config = JSON.parse(raw);
  return config.views ?? config.pattern ?? config;
}

function buildAutomaticOutputDir(m2Path, modelsRoot) {
  const root = path.resolve(modelsRoot);
  const modelPath = path.resolve(m2Path);
  const relativeModelPath = path.relative(root, modelPath);
  if (!relativeModelPath || relativeModelPath.startsWith('..' + path.sep) || path.isAbsolute(relativeModelPath)) {
    throw new Error(`M2 path must be inside modelsRoot. M2: ${modelPath}, modelsRoot: ${root}`);
  }

  const relativeModelDir = path.dirname(relativeModelPath);
  const outputRoot = path.join(path.dirname(root), 'ModelsTreeOutPut');
  return path.join(outputRoot, relativeModelDir);
}

const args = process.argv.slice(2);
const [m2Path, outputDirArg, modelsRoot = path.dirname(process.argv[1]), dbRoot = modelsRoot, configPath = path.join('config', 'camera-orbit.json')] = args;
if (!m2Path) throw new Error('Usage: node src/tools/render-orbit.js <M2> [outputDir|auto] [modelsRoot] [dbRoot] [config.json]');

const root = path.resolve(modelsRoot);
const files = await collectFiles(root);
const decoder = new BLPDecoder();
const m2 = await new M2LegacyLoader().load(path.resolve(m2Path));
if (!m2.skin) throw new Error(`No SKIN profile found for ${m2Path}`);
const model = new ModelAssembler().assemble(m2, m2.skin);
const resolvedMaterials = new MaterialResolver().resolve(m2, m2.skin);
const dbPath = await findDb(path.resolve(dbRoot));
const characterTexture = await new CharacterTextureResolver({ decoder, files }).resolve(m2, { dbPath });
const imageCache = new Map();
let maxTextureWidth = 0, maxTextureHeight = 0;

async function decodeTexture(name) {
  if (!name) return null;
  const key = normalize(name), pathKey = key.endsWith('.blp') ? key : `${key}.blp`;
  if (imageCache.has(key)) return imageCache.get(key);
  const texturePath = files.get(key) ?? files.get(pathKey);
  if (!texturePath) return null;
  const image = decoder.decode(await fs.readFile(texturePath));
  imageCache.set(key, image);
  if (image.width * image.height > maxTextureWidth * maxTextureHeight) {
    maxTextureWidth = image.width;
    maxTextureHeight = image.height;
  }
  return image;
}

const materialImages = [];
for (const textureName of characterTexture.textureNames ?? []) await decodeTexture(textureName);
for (const material of resolvedMaterials.materials) {
  const texture = material.texture;
  let image = null;
  if (texture?.name) image = await decodeTexture(texture.name);
  if (characterTexture.enabled && texture?.type === 1 && characterTexture.composite) image = characterTexture.composite;
  else if (characterTexture.enabled && texture?.type === 6 && characterTexture.direct?.hair?.length) image = (await decodeTexture(characterTexture.direct.hair[0])) ?? image;
  else if (characterTexture.enabled && texture?.type === 7 && characterTexture.direct?.facialHair?.length) image = (await decodeTexture(characterTexture.direct.facialHair[0])) ?? image;
  materialImages[material.index] = image;
}
model.materials = resolvedMaterials.materials.map((material, i) => ({ ...material, image: materialImages[i] ?? null }));
model.batches = model.batches.map((batch, i) => ({ ...batch, ...(resolvedMaterials.batches[i] ?? {}), firstIndex: batch.firstIndex, indexCount: batch.indexCount, submesh: batch.submesh }));

const MIN_RENDER_RESOLUTION = 2048;
const sourceWidth = maxTextureWidth || 512, sourceHeight = maxTextureHeight || 512;
const scale = Math.max(1, MIN_RENDER_RESOLUTION / Math.max(sourceWidth, sourceHeight));
const renderWidth = Math.ceil(sourceWidth * scale), renderHeight = Math.ceil(sourceHeight * scale);
const automaticOutputPath = !outputDirArg || String(outputDirArg).trim().toLowerCase() === 'auto';
const outputRoot = path.resolve(automaticOutputPath ? buildAutomaticOutputDir(m2Path, modelsRoot) : outputDirArg);
const orbitPattern = await loadOrbitPattern(configPath);
const views = buildOrbit(orbitPattern);
const modelName = path.basename(m2Path, path.extname(m2Path));
await fs.mkdir(outputRoot, { recursive: true });

for (const view of views) {
  const image = new SoftwareRenderer({
    width: renderWidth,
    height: renderHeight,
    cameraAzimuth: view.azimuth,
    cameraElevation: view.elevation
  }).render(model);
  const fileName = `${modelName}-${String(view.elevation).padStart(2, '0')}-${String(view.index).padStart(2, '0')}.png`;
  const outputPath = path.join(outputRoot, fileName);
  await fs.writeFile(outputPath, encodeRGBA(image.width, image.height, image.pixels));
  console.log(`elevation=${view.elevation} azimuth=${view.azimuth} -> ${outputPath}`);
}

console.log(JSON.stringify({
  model: m2.name,
  views: views.length,
  pattern: orbitPattern,
  config: path.resolve(configPath),
  outputResolution: { width: renderWidth, height: renderHeight },
  output: outputRoot,
  automaticOutputPath
}, null, 2));
