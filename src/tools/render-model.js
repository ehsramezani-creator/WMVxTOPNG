import fs from 'node:fs/promises';
import path from 'node:path';
import { M2LegacyLoader } from '../loaders/M2LegacyLoader.js';
import { ModelAssembler } from '../loaders/ModelAssembler.js';
import { MaterialResolver } from '../loaders/MaterialResolver.js';
import { BLPDecoder } from '../loaders/BLPDecoder.js';
import { SoftwareRenderer } from '../render/SoftwareRenderer.js';
import { encodeRGBA } from '../render/PNGEncoder.js';

function usage() {
  console.error('Usage: node src/tools/render-model.js <M2> [output.png] [modelsRoot]');
  process.exit(2);
}

function normalize(p) {
  return p.replaceAll('\\', '/').replace(/^\/+/, '').toLowerCase();
}

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

const [m2Path, outputPath = 'model.png', modelsRoot = path.dirname(process.argv[1])] = process.argv.slice(2);
if (!m2Path) usage();

const loader = new M2LegacyLoader();
const m2 = await loader.load(path.resolve(m2Path));
if (!m2.skin) throw new Error(`No SKIN profile found for ${m2Path}`);

const model = new ModelAssembler().assemble(m2, m2.skin);
const materials = new MaterialResolver().resolve(m2, m2.skin);

let textureStats = { referenced: 0, found: 0, decoded: 0, missing: [] };
if (modelsRoot) {
  const files = await collectFiles(path.resolve(modelsRoot));
  for (const material of materials.materials) {
    if (!material.texture?.name) continue;
    textureStats.referenced++;
    let key = normalize(material.texture.name);
    if (!key.endsWith('.blp')) key += '.blp';
    const texturePath = files.get(key) ?? files.get(normalize(material.texture.name));
    if (!texturePath) {
      textureStats.missing.push(material.texture.name);
      continue;
    }
    textureStats.found++;
    new BLPDecoder().decode(await fs.readFile(texturePath));
    textureStats.decoded++;
  }
}

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
  textureStats,
  output: path.resolve(outputPath),
}, null, 2));
