import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

function run(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`MPQExtractor exited with ${code}\n${stdout}\n${stderr}`));
    });
  });
}

async function findMpqs(dataRoot) {
  const result = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.mpq')) result.push(full);
    }
  }
  await walk(dataRoot);
  return result.sort((a, b) => a.localeCompare(b));
}

function parseListFile(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith('#'))
    .filter(line => !/^\[[^\]]+\]$/.test(line));
}

function safeRelativePath(filePath) {
  const normalized = filePath.replaceAll('/', '\\').replace(/^\\+/, '');
  if (!normalized || normalized.includes('..\\') || normalized === '..') return null;
  if (/^[A-Za-z]:[\\/]/.test(normalized)) return null;
  return normalized;
}

export async function buildModelsTree({ dataRoot, executable, destination }) {
  const mpqs = await findMpqs(dataRoot);
  if (!mpqs.length) throw new Error(`No MPQ archives found under ${dataRoot}`);

  await mkdir(destination, { recursive: true });
  const tempRoot = path.join(destination, '.mpq-lists');
  await mkdir(tempRoot, { recursive: true });

  const directories = new Set();
  const files = new Set();

  try {
    for (let i = 0; i < mpqs.length; i += 1) {
      const archive = mpqs[i];
      const listPath = path.join(tempRoot, `${String(i).padStart(4, '0')}.txt`);
      const { stdout } = await run(executable, ['-l', listPath, archive]);
      let listText = '';
      try {
        const { readFile } = await import('node:fs/promises');
        listText = await readFile(listPath, 'utf8');
      } catch {
        listText = stdout;
      }

      for (const entry of parseListFile(listText)) {
        const relative = safeRelativePath(entry);
        if (!relative) continue;
        files.add(relative);
        const parts = relative.split('\\');
        for (let j = 1; j < parts.length; j += 1) {
          directories.add(parts.slice(0, j).join('\\'));
        }
      }
    }

    for (const directory of [...directories].sort()) {
      await mkdir(path.join(destination, directory), { recursive: true });
    }

    await writeFile(
      path.join(destination, 'tree-manifest.txt'),
      [...files].sort((a, b) => a.localeCompare(b)).join('\n') + '\n',
      'utf8'
    );

    return { mpqCount: mpqs.length, fileCount: files.size, directoryCount: directories.size, destination };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export { findMpqs, parseListFile, safeRelativePath };
