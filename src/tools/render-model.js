import fs from 'node:fs/promises';
import path from 'node:path';
import { M2LegacyLoader } from '../loaders/M2LegacyLoader.js';
import { ModelAssembler } from '../loaders/ModelAssembler.js';
import { MaterialResolver } from '../loaders/MaterialResolver.js';
import { CharacterTextureResolver } from '../loaders/CharacterTextureResolver.js';
import { BLPDecoder } from '../loaders/BLPDecoder.js';
import { SoftwareRenderer } from '../render/SoftwareRenderer.js';
import { encodeRGBA } from '../render/PNGEncoder.js';

function usage() {
  console.error(
    'Usage: node src/tools/render-model.js <M2> [output.png] [modelsRoot] [dbRoot]'
  );
  process.exit(2);
}

function normalize(p) {
  return String(p ?? '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .toLowerCase();
}

async function collectFiles(root) {
  const out = new Map();

  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(full);
      } else {
        out.set(normalize(path.relative(root, full)), full);
      }
    }
  }

  await walk(root);
  return out;
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

    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }

  return null;
}

const [
  m2Path,
  outputPath = 'model.png',
  modelsRoot = path.dirname(process.argv[1]),
  dbRoot = modelsRoot,
] = process.argv.slice(2);

if (!m2Path) usage();

const root = path.resolve(modelsRoot);
const files = await collectFiles(root);
const decoder = new BLPDecoder();

const m2 = await new M2LegacyLoader().load(path.resolve(m2Path));

if (!m2.skin) {
  throw new Error(`No SKIN profile found for ${m2Path}`);
}

const model = new ModelAssembler().assemble(m2, m2.skin);
const resolvedMaterials = new MaterialResolver().resolve(m2, m2.skin);

const dbPath = await findDb(path.resolve(dbRoot));

const characterTexture =
  await new CharacterTextureResolver({ decoder, files }).resolve(m2, {
    dbPath,
  });

/*
 * Texture decode cache.
 *
 * The dimensions of every decoded BLP are tracked so that the renderer
 * can determine the best output resolution for the model.
 */
const imageCache = new Map();

let maxTextureWidth = 0;
let maxTextureHeight = 0;
let maxTextureName = null;

async function decodeTexture(name) {
  if (!name) return null;

  const key = normalize(name);
  const pathKey = key.endsWith('.blp') ? key : `${key}.blp`;

  if (imageCache.has(key)) {
    return imageCache.get(key);
  }

  const texturePath = files.get(key) ?? files.get(pathKey);

  if (!texturePath) {
    return null;
  }

  const image = decoder.decode(await fs.readFile(texturePath));

  imageCache.set(key, image);

  /*
   * Find the highest-resolution decoded BLP.
   *
   * Area is used as the primary comparison.
   * The largest dimension is used as a tie breaker.
   */
  const currentArea = maxTextureWidth * maxTextureHeight;
  const imageArea = image.width * image.height;

  if (
    imageArea > currentArea ||
    (imageArea === currentArea &&
      Math.max(image.width, image.height) >
        Math.max(maxTextureWidth, maxTextureHeight))
  ) {
    maxTextureWidth = image.width;
    maxTextureHeight = image.height;
    maxTextureName = name;
  }

  return image;
}

const materialImages = [];

const textureStats = {
  referenced: 0,
  found: 0,
  decoded: 0,
  characterResolved: false,
  bodyBatches: 0,
  hairBatches: 0,
  facialHairBatches: 0,
  missing: [],
};

/*
 * Decode textures used by CharacterTextureResolver.
 */
for (const textureName of characterTexture.textureNames ?? []) {
  await decodeTexture(textureName);
}

/*
 * Resolve ordinary M2 materials.
 */
for (const material of resolvedMaterials.materials) {
  const texture = material.texture;
  let image = null;

  if (texture?.name) {
    textureStats.referenced++;

    image = await decodeTexture(texture.name);

    if (image) {
      textureStats.found++;
      textureStats.decoded++;
    } else {
      textureStats.missing.push(texture.name);
    }
  }

  /*
   * Character BODY texture.
   */
  if (
    characterTexture.enabled &&
    texture?.type === 1 &&
    characterTexture.composite
  ) {
    image = characterTexture.composite;
    textureStats.characterResolved = true;
    textureStats.bodyBatches++;
  }

  /*
   * Character hair texture.
   */
  else if (
    characterTexture.enabled &&
    texture?.type === 6 &&
    characterTexture.direct?.hair?.length
  ) {
    image =
      (await decodeTexture(characterTexture.direct.hair[0])) ?? image;

    textureStats.hairBatches++;
  }

  /*
   * Character facial hair texture.
   */
  else if (
    characterTexture.enabled &&
    texture?.type === 7 &&
    characterTexture.direct?.facialHair?.length
  ) {
    image =
      (await decodeTexture(
        characterTexture.direct.facialHair[0]
      )) ?? image;

    textureStats.facialHairBatches++;
  }

  materialImages[material.index] = image;
}

model.materials = resolvedMaterials.materials.map((material, i) => ({
  ...material,
  image: materialImages[i] ?? null,
}));

/*
 * Keep geometry range/submesh information produced by ModelAssembler.
 *
 * MaterialResolver only resolves material fields. Replacing model.batches
 * with its output would discard firstIndex/indexCount and cause every
 * material to draw the entire model.
 */
model.batches = model.batches.map((batch, i) => ({
  ...batch,
  ...(resolvedMaterials.batches[i] ?? {}),
  firstIndex: batch.firstIndex,
  indexCount: batch.indexCount,
  submesh: batch.submesh,
}));

/*
 * Output resolution policy.
 *
 * The output must be at least 2048 pixels on its largest dimension.
 *
 * Examples:
 *
 * 128x128   BLP -> 2048x2048 PNG
 * 512x512   BLP -> 2048x2048 PNG
 * 1024x512  BLP -> 2048x1024 PNG
 * 2048x2048 BLP -> 2048x2048 PNG
 * 4096x4096 BLP -> 4096x4096 PNG
 *
 * The original aspect ratio is preserved.
 */
const MIN_RENDER_RESOLUTION = 2048;

const sourceWidth = maxTextureWidth || 512;
const sourceHeight = maxTextureHeight || 512;

const scale = Math.max(
  1,
  MIN_RENDER_RESOLUTION /
    Math.max(sourceWidth, sourceHeight)
);

const renderWidth = Math.ceil(sourceWidth * scale);
const renderHeight = Math.ceil(sourceHeight * scale);

const image = new SoftwareRenderer({
  width: renderWidth,
  height: renderHeight,
}).render(model);

await fs.mkdir(path.dirname(path.resolve(outputPath)), {
  recursive: true,
});

await fs.writeFile(
  path.resolve(outputPath),
  encodeRGBA(image.width, image.height, image.pixels)
);

console.log(
  JSON.stringify(
    {
      model: m2.name,
      version: m2.version,
      vertices: model.vertices.length,
      triangles: model.indices.length / 3,
      skin: path.basename(m2.skin.filePath ?? ''),
      textures: m2.textures.length,
      dbPath,

      characterTexture: characterTexture.enabled
        ? {
            identity: characterTexture.identity,
            layers: characterTexture.layers?.length ?? 0,
            missingBase: characterTexture.missingBase ?? null,
            missing: characterTexture.missing ?? [],
          }
        : characterTexture,

      textureStats,

      maxTexture: maxTextureName
        ? {
            name: maxTextureName,
            width: maxTextureWidth,
            height: maxTextureHeight,
          }
        : null,

      sourceTextureResolution: {
        width: sourceWidth,
        height: sourceHeight,
      },

      outputResolution: {
        width: renderWidth,
        height: renderHeight,
      },

      output: path.resolve(outputPath),
    },
    null,
    2
  )
);
