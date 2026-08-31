import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, copyFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

function run(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', reject);
    child.on('close', code => code === 0
      ? resolve({ stdout, stderr })
      : reject(new Error(`MPQExtractor exited with ${code}\n${stdout}\n${stderr}`)));
  });
}

async function findMpqs(dataRoot) {
  const result = [];
  async function walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.mpq')) result.push(full);
    }
  }
  await walk(dataRoot);
  return result.sort((a, b) => a.localeCompare(b));
}

function parseList(text) {
  return text.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
    .filter(x => !x.startsWith('#') && !/^\[[^\]]+\]$/.test(x));
}

function safeRelativePath(value) {
  const p = value.replaceAll('/', '\\').replace(/^\\+/, '');
  if (!p || p === '..' || p.includes('..\\') || /^[A-Za-z]:[\\/]/.test(p)) return null;
  return p;
}

function isAssetForModelTree(p) {
  return /\.(m2|skin|blp)$/i.test(p) || /(^|\\)DBFilesClient\\CharSections\.dbc$/i.test(p);
}

async function readArchiveList(executable, archive, tempFile) {
  await run(executable, ['-l', tempFile, archive]);
  return parseList(await readFile(tempFile, 'utf8'));
}

export async function materializeModelsTree({ dataRoot, executable, destination }) {
  const mpqs = await findMpqs(dataRoot);
  if (!mpqs.length) throw new Error(`No MPQ archives found under ${dataRoot}`);

  await mkdir(destination, { recursive: true });
  const tempRoot = path.join(destination, '.mpq-materializer');
  await mkdir(tempRoot, { recursive: true });

  const assets = new Set();
  let copied = 0;
  try {
    for (let i = 0; i < mpqs.length; i++) {
      const archive = mpqs[i];
      const listFile = path.join(tempRoot, `${String(i).padStart(4, '0')}.txt`);
      for (const raw of await readArchiveList(executable, archive, listFile)) {
        const p = safeRelativePath(raw);
        if (p && isAssetForModelTree(p)) assets.add(p);
      }
    }

    for (const relative of [...assets].sort((a, b) => a.localeCompare(b))) {
      const target = path.join(destination, relative);
      await mkdir(path.dirname(target), { recursive: true });
      let copiedThisFile = false;

      for (const archive of mpqs) {
        const staging = path.join(tempRoot, 'extract', String(copied).padStart(8, '0'));
        await mkdir(staging, { recursive: true });
        try {
          await run(executable, ['-e', relative, '-o', staging, archive]);
          const candidates = [
            path.join(staging, relative),
            path.join(staging, relative.replaceAll('\\', path.sep)),
            path.join(staging, path.basename(relative)),
          ];
          for (const candidate of candidates) {
            try {
              const s = await stat(candidate);
              if (s.isFile()) {
                await copyFile(candidate, target);
                copied++;
                copiedThisFile = true;
                break;
              }
            } catch {}
          }
          if (copiedThisFile) break;
        } finally {
          await rm(staging, { recursive: true, force: true });
        }
      }
    }

    return { mpqCount: mpqs.length, assetCount: assets.size, copiedCount: copied, destination };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
