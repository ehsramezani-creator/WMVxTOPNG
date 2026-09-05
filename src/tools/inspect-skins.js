import fs from 'node:fs/promises';
import path from 'node:path';
import { M2LegacyLoader } from '../loaders/M2LegacyLoader.js';
import { SkinIdResolver } from '../loaders/SkinIdResolver.js';

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

async function findFile(root, name) {
  const target = String(name).toLowerCase();

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

  const files = await collectFiles(root);
  for (const [key, filePath] of files) {
    if (path.basename(key).toLowerCase() === target) return filePath;
  }

  return null;
}

async function resolveM2Input(inputPath) {
  const resolved = path.resolve(inputPath);
  const stat = await fs.stat(resolved).catch(() => null);

  if (!stat) throw new Error(`Input path does not exist: ${inputPath}`);
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
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.m2') {
        candidates.push(full);
      }
    }
  }

  await walk(resolved);
  candidates.sort((a, b) => a.localeCompare(b));

  if (candidates.length === 0) throw new Error(`No M2 file found inside folder: ${inputPath}`);
  if (candidates.length > 1) {
    throw new Error(
      `Multiple M2 files found inside folder: ${inputPath}\n${candidates.map(p => `  - ${path.relative(resolved, p)}`).join('\n')}\nPlease provide the exact M2 file path.`
    );
  }

  return candidates[0];
}

const input = process.argv[2];
const dbRoot = path.resolve(process.argv[3] ?? path.dirname(input ?? '.'));

if (!input) {
  console.error('Usage: node src/tools/inspect-skins.js <M2-or-folder> [dbRoot]');
  process.exit(2);
}

const m2Path = await resolveM2Input(input);
const modelsRoot = path.resolve(path.dirname(process.argv[1]), '..', '..', 'ModelsTree');
const files = await collectFiles(modelsRoot);
const m2 = await new M2LegacyLoader().load(m2Path);

const creatureDisplayInfoPath = await findFile(dbRoot, 'CreatureDisplayInfo.dbc');
const creatureModelDataPath = await findFile(dbRoot, 'CreatureModelData.dbc');

const resolver = SkinIdResolver.createDefault({ files });
const result = await resolver.resolve(m2, {
  creatureDisplayInfoPath,
  creatureModelDataPath,
});

console.log(JSON.stringify({
  model: m2.name,
  m2Path,
  resolved: result.resolved,
  skinIds: result.skinIds,
  providers: result.providers,
}, null, 2));
