import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const inputPath = path.resolve(process.argv[2] ?? '');
const outputRoot = path.resolve(process.argv[3] ?? './output-path-test');

if (!process.argv[2]) {
  console.error('Usage: node src/tools/render-path.js <file-or-directory> [output-directory] [--camera-orbit]');
  process.exit(2);
}

const orbitMode = process.argv.includes('--camera-orbit');

async function collectM2Files(input) {
  const stat = await fs.stat(input);

  if (stat.isFile()) {
    if (!input.toLowerCase().endsWith('.m2')) {
      throw new Error(`Input file is not an .m2 file: ${input}`);
    }
    return [input];
  }

  if (!stat.isDirectory()) {
    throw new Error(`Input is neither a file nor a directory: ${input}`);
  }

  const result = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let foundHere = 0;

    for (const entry of entries) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.m2')) {
        result.push(full);
        foundHere++;
      }
    }

    if (foundHere === 0) {
      console.log(`No .m2 files found: ${dir}`);
    }
  }

  await walk(input);
  return result;
}

function safeName(name) {
  return name.replace(/[<>:"/\\\\|?*]/g, '_');
}

function renderOne(m2Path, index, total) {
  return new Promise((resolve, reject) => {
    const relative = path.relative(inputPath, m2Path);
    const relativeDir = path.dirname(relative);
    const baseName = path.basename(m2Path, path.extname(m2Path));

    const outputDir =
      inputPath === m2Path
        ? outputRoot
        : path.join(outputRoot, relativeDir === '.' ? '' : relativeDir);

    const outputFile = path.join(
      outputDir,
      `${safeName(baseName)}.png`
    );

    console.log(`\n[${index}/${total}]`);
    console.log(`M2     : ${m2Path}`);
    console.log(`Output : ${outputFile}`);

    const args = [
      path.resolve('src/tools/render-model.js'),
      m2Path,
      outputFile,
      path.resolve('ModelsTree'),
      path.resolve('ModelsTree'),
      '0',
      'x',
      '0'
    ];

    if (orbitMode) {
      args.push('--camera-orbit');
    }

    const child = spawn(process.execPath, args, {
      stdio: 'inherit'
    });

    child.on('error', reject);

    child.on('close', code => {
      if (code === 0) {
        console.log(`DONE: ${baseName}`);
        resolve();
      } else {
        reject(new Error(`Render failed for ${m2Path} (exit code ${code})`));
      }
    });
  });
}

const m2Files = await collectM2Files(inputPath);

if (m2Files.length === 0) {
  console.log(`No .m2 files found under: ${inputPath}`);
  process.exit(0);
}

console.log(`\nFound ${m2Files.length} .m2 file(s).`);

await fs.mkdir(outputRoot, { recursive: true });

for (let i = 0; i < m2Files.length; i++) {
  await renderOne(m2Files[i], i + 1, m2Files.length);
}

console.log(`\nCompleted: ${m2Files.length}/${m2Files.length}`);
console.log(`Output directory: ${outputRoot}`);
