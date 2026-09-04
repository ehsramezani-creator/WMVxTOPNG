import fs from 'node:fs/promises';
import path from 'node:path';
import { M2LegacyLoader } from '../loaders/M2LegacyLoader.js';
import { CreatureTextureResolver } from '../loaders/CreatureTextureResolver.js';

function usage() {
  console.error('Usage: node src/tools/inspect-creature-skins.js <M2> <ModelsRoot>');
  process.exit(2);
}

function normalize(p) {
  return String(p ?? '').replaceAll('\\', '/').replace(/^\/+/, '').toLowerCase();
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

async function findDb(root, name) {
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

const [m2Arg, rootArg] = process.argv.slice(2);
if (!m2Arg || !rootArg) usage();

const m2Path = path.resolve(m2Arg);
const root = path.resolve(rootArg);
const files = await collectFiles(root);

const displayInfoPath = await findDb(root, 'CreatureDisplayInfo.dbc');
const modelDataPath = await findDb(root, 'CreatureModelData.dbc');

const model = await new M2LegacyLoader().load(m2Path);

const resolver = new CreatureTextureResolver({ files });

const result = await resolver.inspect(model, {
  displayInfoPath,
  modelDataPath,
});

console.log(JSON.stringify(result, null, 2));
