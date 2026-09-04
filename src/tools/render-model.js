import fs from 'node:fs/promises';
import path from 'node:path';
import { M2LegacyLoader } from '../loaders/M2LegacyLoader.js';
import { ModelAssembler } from '../loaders/ModelAssembler.js';
import { MaterialResolver } from '../loaders/MaterialResolver.js';
import { CharacterTextureResolver } from '../loaders/CharacterTextureResolver.js';
import { CreatureTextureResolver } from '../loaders/CreatureTextureResolver.js';
import { BLPDecoder } from '../loaders/BLPDecoder.js';
import { SoftwareRenderer } from '../render/SoftwareRenderer.js';
import { encodeRGBA } from '../render/PNGEncoder.js';
import { CameraOrbit } from './CameraOrbit.js';

function usage() {
  console.error('Usage: node src/tools/render-model.js <M2-or-folder> [output.png] [modelsRoot] [dbRoot] [yawDegrees] [cameraAxis]');
  process.exit(2);
}
function normalize(p) { return String(p ?? '').replaceAll('\\', '/').replace(/^\/+/, '').toLowerCase(); }
async function collectFiles(root) {
  const out = new Map();
  async function walk(dir) { for (const entry of await fs.readdir(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) await walk(full); else out.set(normalize(path.relative(root, full)), full); } }
  await walk(root); return out;
}
async function findDb(root) {
  if (!root) return null;
  for (const parts of [['DBFilesClient', 'CharSections.dbc'], ['dbfilesclient', 'CharSections.dbc'], ['dbc', 'CharSections.dbc'], ['CharSections.dbc']]) { const candidate = path.join(root, ...parts); try { await fs.access(candidate); return candidate; } catch {} }
  return null;
}
async function resolveM2Input(inputPath) {
  const resolved = path.resolve(inputPath);
  const stat = await fs.stat(resolved).catch(() => null);

  if (!stat) {
    throw new Error(`Input path does not exist: ${inputPath}`);
  }

  if (stat.isFile()) {
    if (path.extname(resolved).toLowerCase() !== '.m2') {
      throw new Error(`Input file is not an M2 file: ${inputPath}`);
    }

    return resolved;
  }

  if (!stat.isDirectory()) {
    throw new Error(`Input path is neither a file nor a directory: ${inputPath}`);
  }

  const candidates = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (
        entry.isFile() &&
        path.extname(entry.name).toLowerCase() === '.m2'
      ) {
        candidates.push(fullPath);
      }
    }
  }

  await walk(resolved);

  candidates.sort((a, b) => a.localeCompare(b));

  if (candidates.length === 0) {
    throw new Error(`No M2 file found inside folder: ${inputPath}`);
  }

  if (candidates.length > 1) {
    const list = candidates
      .map(candidate => `  - ${path.relative(resolved, candidate)}`)
      .join('\\n');

    throw new Error(
      `Multiple M2 files found inside folder: ${inputPath}\\n${list}\\nPlease provide the exact M2 file path.`
    );
  }

  return candidates[0];
}

const args = process.argv.slice(2);
const orbitMode = args.includes('--camera-orbit');
const filteredArgs = args.filter(arg => arg !== '--camera-orbit');
const [m2Input, outputPath = 'model.png', modelsRoot = path.dirname(process.argv[1]), dbRoot = modelsRoot, yawArg = '0', cameraAxis = 'x', elevationArg = '0'] = filteredArgs;
if (!m2Input) usage();
const yawDegrees = Number(yawArg);
if (!Number.isFinite(yawDegrees)) throw new Error(`Invalid yaw angle: ${yawArg}`);
const elevationDegrees = Number(elevationArg);
if (!Number.isFinite(elevationDegrees) || elevationDegrees < -90 || elevationDegrees > 90) throw new Error(`Invalid elevation angle: ${elevationArg}. Use -90 to 90.`);
if (!['x', 'y', 'z'].includes(String(cameraAxis).toLowerCase())) throw new Error(`Invalid camera axis: ${cameraAxis}. Use x, y, or z.`);
const root = path.resolve(modelsRoot), files = await collectFiles(root), decoder = new BLPDecoder();
const cameraOrbit = orbitMode ? await CameraOrbit.load(path.resolve('./config/camera-orbit.json')) : null;
const m2Path = await resolveM2Input(m2Input);
const m2 = await new M2LegacyLoader().load(m2Path);
if (!m2.skin) throw new Error(`No SKIN profile found for ${m2Path}`);
const model = new ModelAssembler().assemble(m2, m2.skin);
const resolvedMaterials = new MaterialResolver().resolve(m2, m2.skin);
const dbPath = await findDb(path.resolve(dbRoot));
async function findCreatureDb(root, name) {
  for (const parts of [
    ['DBFilesClient', name],
    ['dbfilesclient', name],
    ['dbc', name],
    [name],
  ]) {
    const candidate = path.join(root, ...parts);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  return null;
}

const creatureDisplayInfoPath = await findCreatureDb(
  path.resolve(dbRoot),
  'CreatureDisplayInfo.dbc'
);

const creatureModelDataPath = await findCreatureDb(
  path.resolve(dbRoot),
  'CreatureModelData.dbc'
);

const creatureTextureResolver = new CreatureTextureResolver({ files });

const creatureTexture = await creatureTextureResolver.resolve(m2, {
  displayInfoPath: creatureDisplayInfoPath,
  modelDataPath: creatureModelDataPath,
});

const creatureOverrides =
  creatureTextureResolver.resolveTextureOverrides(m2, creatureTexture);
const characterTexture = await new CharacterTextureResolver({ decoder, files }).resolve(m2, { dbPath });
const imageCache = new Map();
let maxTextureWidth = 0, maxTextureHeight = 0, maxTextureName = null;
async function decodeTexture(name) {
  if (!name) return null;
  const key = normalize(name), pathKey = key.endsWith('.blp') ? key : `${key}.blp`;
  if (imageCache.has(key)) return imageCache.get(key);
  const texturePath = files.get(key) ?? files.get(pathKey);
  if (!texturePath) return null;
  const image = decoder.decode(await fs.readFile(texturePath));
  imageCache.set(key, image);
  const currentArea = maxTextureWidth * maxTextureHeight, imageArea = image.width * image.height;
  if (imageArea > currentArea || (imageArea === currentArea && Math.max(image.width, image.height) > Math.max(maxTextureWidth, maxTextureHeight))) { maxTextureWidth = image.width; maxTextureHeight = image.height; maxTextureName = name; }
  return image;
}
const materialImages = [];

const creatureOverrideByTextureType = new Map(
  creatureOverrides.map(override => [
    override.textureType,
    override,
  ])
);
const textureStats = { referenced: 0, found: 0, decoded: 0, characterResolved: false, bodyBatches: 0, hairBatches: 0, facialHairBatches: 0, missing: [] };
for (const textureName of characterTexture.textureNames ?? []) await decodeTexture(textureName);
for (const material of resolvedMaterials.materials) {
  const texture = material.texture; let image = null;
  const creatureOverride =
    creatureOverrideByTextureType.get(texture?.type) ?? null;
  if (texture?.name) { textureStats.referenced++; image = await decodeTexture(texture.name); if (image) { textureStats.found++; textureStats.decoded++; } else textureStats.missing.push(texture.name); }

  if (creatureTexture.enabled && creatureOverride?.filePath) {
    image = await decodeTexture(creatureOverride.filePath) ?? image;
  }
  if (characterTexture.enabled && texture?.type === 1 && characterTexture.composite) { image = characterTexture.composite; textureStats.characterResolved = true; textureStats.bodyBatches++; }
  else if (characterTexture.enabled && texture?.type === 6 && characterTexture.direct?.hair?.length) { image = (await decodeTexture(characterTexture.direct.hair[0])) ?? image; textureStats.hairBatches++; }
  else if (characterTexture.enabled && texture?.type === 7 && characterTexture.direct?.facialHair?.length) { image = (await decodeTexture(characterTexture.direct.facialHair[0])) ?? image; textureStats.facialHairBatches++; }
  materialImages[material.index] = image;
}
model.materials = resolvedMaterials.materials.map((material, i) => ({ ...material, image: materialImages[i] ?? null }));
model.batches = model.batches.map((batch, i) => ({ ...batch, ...(resolvedMaterials.batches[i] ?? {}), firstIndex: batch.firstIndex, indexCount: batch.indexCount, submesh: batch.submesh }));
const MIN_RENDER_RESOLUTION = 2048;
const sourceWidth = maxTextureWidth || 512, sourceHeight = maxTextureHeight || 512;
const scale = Math.max(1, MIN_RENDER_RESOLUTION / Math.max(sourceWidth, sourceHeight));
const renderWidth = Math.ceil(sourceWidth * scale), renderHeight = Math.ceil(sourceHeight * scale);

const outputAbsolute = path.resolve(outputPath);
await fs.mkdir(path.dirname(outputAbsolute), { recursive: true });

async function renderView(yaw, elevation, outputFile) {
  const image = new SoftwareRenderer({
    width: renderWidth,
    height: renderHeight,
    cameraYaw: yaw,
    cameraAxis,
    cameraElevation: elevation
  }).render(model);

  await fs.writeFile(
    outputFile,
    encodeRGBA(image.width, image.height, image.pixels)
  );

  return image;
}

if (orbitMode) {
  const outputDirectory = path.dirname(outputAbsolute);
  const outputExtension = path.extname(outputAbsolute) || '.png';
  const outputStem = path.basename(outputAbsolute, outputExtension);

  const outputs = [];

  for (let i = 0; i < cameraOrbit.views.length; i++) {
    const view = cameraOrbit.views[i];

    const elevationName = String(Math.round(view.elevation))
      .replace('-', 'm')
      .padStart(3, '0');

    const outputFile = path.join(
      outputDirectory,
      `${outputStem}-${String(i + 1).padStart(2, '0')}-yaw${String(Math.round(view.yaw)).padStart(3, '0')}-elev${elevationName}${outputExtension}`
    );

    await renderView(view.yaw, view.elevation, outputFile);

    outputs.push({
      index: i + 1,
      yaw: view.yaw,
      elevation: view.elevation,
      output: outputFile
    });

    console.log(JSON.stringify({
      index: i + 1,
      total: cameraOrbit.length,
      yaw: view.yaw,
      elevation: view.elevation,
      output: outputFile
    }));
  }

  console.log(JSON.stringify({
    model: m2.name,
    version: m2.version,
    vertices: model.vertices.length,
    triangles: model.indices.length / 3,
    skin: path.basename(m2.skin.filePath ?? ''),
    textures: m2.textures.length,
    dbPath,
    orbitMode: true,
    views: outputs.length,
    cameraAxis: String(cameraAxis).toLowerCase(),
    outputDirectory,
    outputResolution: {
      width: renderWidth,
      height: renderHeight
    }
  }, null, 2));
} else {
  const image = await renderView(
    yawDegrees,
    elevationDegrees,
    outputAbsolute
  );

  console.log(JSON.stringify({
    model: m2.name,
    version: m2.version,
    vertices: model.vertices.length,
    triangles: model.indices.length / 3,
    skin: path.basename(m2.skin.filePath ?? ''),
    textures: m2.textures.length,
    dbPath,
    cameraYaw: yawDegrees,
    cameraElevation: elevationDegrees,
    cameraAxis: String(cameraAxis).toLowerCase(),
    characterTexture: characterTexture.enabled
      ? {
          identity: characterTexture.identity,
          layers: characterTexture.layers?.length ?? 0,
          missingBase: characterTexture.missingBase ?? null,
          missing: characterTexture.missing ?? []
        }
      : characterTexture,
    textureStats,
    maxTexture: maxTextureName
      ? {
          name: maxTextureName,
          width: maxTextureWidth,
          height: maxTextureHeight
        }
      : null,
    sourceTextureResolution: {
      width: sourceWidth,
      height: sourceHeight
    },
    outputResolution: {
      width: renderWidth,
      height: renderHeight
    },
    output: outputAbsolute
  }, null, 2));
}
