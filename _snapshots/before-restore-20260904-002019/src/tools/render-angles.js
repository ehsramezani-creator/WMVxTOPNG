import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

function usage() {
  console.error(
    'Usage: node src/tools/render-angles.js <M2> [outputDir] [angleCount] [modelsRoot] [dbRoot]'
  );
  process.exit(2);
}

const [
  m2Path,
  outputDir = 'renders',
  angleCountArg = '24',
  modelsRoot,
  dbRoot,
] = process.argv.slice(2);

if (!m2Path) usage();

const angleCount = Number(angleCountArg);
if (!Number.isInteger(angleCount) || angleCount < 1) {
  throw new Error(`Invalid angle count: ${angleCountArg}`);
}

const scriptPath = path.resolve(path.dirname(process.argv[1]), 'render-model.js');
const modelPath = path.resolve(m2Path);
const resolvedOutputDir = path.resolve(outputDir);
const modelName = path.basename(modelPath, path.extname(modelPath));

await fs.mkdir(resolvedOutputDir, { recursive: true });

function renderAngle(angle, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [scriptPath, modelPath, outputPath];

    if (modelsRoot !== undefined) args.push(path.resolve(modelsRoot));
    if (dbRoot !== undefined) args.push(path.resolve(dbRoot));
    if (modelsRoot !== undefined || dbRoot !== undefined) args.push(String(angle));

    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data;
    });

    child.stderr.on('data', data => {
      stderr += data;
    });

    child.on('error', reject);

    child.on('close', code => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            `Rendering angle ${angle} failed with exit code ${code}\n${stderr || stdout}`
          )
        );
      }
    });
  });
}

const results = [];

for (let i = 0; i < angleCount; i++) {
  const angle = (360 * i) / angleCount;
  const angleLabel = String(Math.round(angle) % 360).padStart(3, '0');
  const outputPath = path.join(
    resolvedOutputDir,
    `${modelName}-${angleLabel}.png`
  );

  console.log(`[${i + 1}/${angleCount}] Rendering ${angleLabel}° -> ${outputPath}`);

  const json = await renderAngle(angle, outputPath);

  try {
    results.push(JSON.parse(json));
  } catch {
    results.push({ angle, output: outputPath });
  }
}

console.log(
  JSON.stringify(
    {
      model: modelName,
      angleCount,
      stepDegrees: 360 / angleCount,
      outputDir: resolvedOutputDir,
      outputs: results.map(result => result.output),
    },
    null,
    2
  )
);
