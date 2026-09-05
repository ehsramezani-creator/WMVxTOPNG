const fs = require('fs');
const path = require('path');

const file = path.join('src', 'tools', 'render-model.js');
let s = fs.readFileSync(file, 'utf8');

if (s.includes('async function resolveM2Input')) {
  throw new Error('resolveM2Input already exists; file was not changed.');
}

const oldUsage =
  "console.error('Usage: node src/tools/render-model.js <M2> [output.png] [modelsRoot] [dbRoot] [yawDegrees] [cameraAxis]');";

const newUsage =
  "console.error('Usage: node src/tools/render-model.js <M2-or-folder> [output.png] [modelsRoot] [dbRoot] [yawDegrees] [cameraAxis]');";

if (!s.includes(oldUsage)) {
  throw new Error('Usage line not found; file was not changed.');
}

s = s.replace(oldUsage, newUsage);

const marker =
  "const args = process.argv.slice(2);";

const helper = `async function resolveM2Input(inputPath) {
  const resolved = path.resolve(inputPath);
  const stat = await fs.promises.stat(resolved).catch(() => null);

  if (!stat) {
    throw new Error(\`Input path does not exist: \${inputPath}\`);
  }

  if (stat.isFile()) {
    if (path.extname(resolved).toLowerCase() !== '.m2') {
      throw new Error(\`Input file is not an M2 file: \${inputPath}\`);
    }

    return resolved;
  }

  if (!stat.isDirectory()) {
    throw new Error(\`Input path is neither a file nor a directory: \${inputPath}\`);
  }

  const candidates = [];

  async function walk(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

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
    throw new Error(\`No M2 file found inside folder: \${inputPath}\`);
  }

  if (candidates.length > 1) {
    const list = candidates
      .map(candidate => \`  - \${path.relative(resolved, candidate)}\`)
      .join('\\\\n');

    throw new Error(
      \`Multiple M2 files found inside folder: \${inputPath}\\\\n\${list}\\\\nPlease provide the exact M2 file path.\`
    );
  }

  return candidates[0];
}

`;

if (!s.includes(marker)) {
  throw new Error('Argument marker not found; file was not changed.');
}

s = s.replace(marker, helper + marker);

const oldArgs =
  "const [m2Path, outputPath = 'model.png', modelsRoot = path.dirname(process.argv[1]), dbRoot = modelsRoot, yawArg = '0', cameraAxis = 'x', elevationArg = '0'] = filteredArgs;";

const newArgs =
  "const [m2Input, outputPath = 'model.png', modelsRoot = path.dirname(process.argv[1]), dbRoot = modelsRoot, yawArg = '0', cameraAxis = 'x', elevationArg = '0'] = filteredArgs;";

if (!s.includes(oldArgs)) {
  throw new Error('Argument destructuring line not found; file was not changed.');
}

s = s.replace(oldArgs, newArgs);

const oldCheck = "if (!m2Path) usage();";
const newCheck = "if (!m2Input) usage();";

if (!s.includes(oldCheck)) {
  throw new Error('Input validation line not found; file was not changed.');
}

s = s.replace(oldCheck, newCheck);

const oldLoad =
  "const m2 = await new M2LegacyLoader().load(path.resolve(m2Path));";

const newLoad =
  "const m2Path = await resolveM2Input(m2Input);\\nconst m2 = await new M2LegacyLoader().load(m2Path);";

if (!s.includes(oldLoad)) {
  throw new Error('M2 loading line not found; file was not changed.');
}

s = s.replace(oldLoad, newLoad);

fs.writeFileSync(file, s, 'utf8');

console.log('render-model.js updated successfully.');
