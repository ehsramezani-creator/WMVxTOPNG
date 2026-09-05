import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(
  'C:\\Users\\ehsra\\Documents\\GitHub\\WMVxTOPNG'
);

const OUTPUT_ROOT = path.join(ROOT, 'TempTest');
const RENDER_MODEL = path.join(ROOT, 'src', 'tools', 'render-model.js');
const MODELS_ROOT = path.join(ROOT, 'ModelsTree');

const TESTS = [
  {
    id: '01',
    name: 'Boxtest',
    directory: path.join(
      MODELS_ROOT,
      'World',
      'ArtTest',
      'Boxtest'
    ),
  },
  {
    id: '02',
    name: 'FishingBox',
    directory: path.join(
      MODELS_ROOT,
      'World',
      'AZEROTH',
      'BOOTYBAY',
      'PASSIVEDOODAD',
      'FishingBox'
    ),
  },
  {
    id: '03',
    name: 'Dam',
    directory: path.join(
      MODELS_ROOT,
      'World',
      'OUTLAND',
      'PASSIVEDOODADS',
      'Dam'
    ),
  },
  {
    id: '04',
    name: 'AllianceRider',
    directory: path.join(
      MODELS_ROOT,
      'Creature',
      'ALLIANCERIDER'
    ),
  },
  {
    id: '05',
    name: 'GryphonPet',
    directory: path.join(
      MODELS_ROOT,
      'Creature',
      'GryphonPet'
    ),
  },
  {
    id: '06',
    name: 'FelGolem',
    directory: path.join(
      MODELS_ROOT,
      'Creature',
      'FelGolem'
    ),
  },
  {
    id: '07',
    name: 'SHARK',
    directory: path.join(
      MODELS_ROOT,
      'Creature',
      'SHARK'
    ),
  },
];

function safeName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_');
}

async function findM2Files(directory) {
  const result = [];

  async function walk(currentDirectory) {
    const entries = await fs.readdir(currentDirectory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (
        entry.isFile() &&
        entry.name.toLowerCase().endsWith('.m2')
      ) {
        result.push(fullPath);
      }
    }
  }

  await walk(directory);

  result.sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  );

  return result;
}

function runRenderer(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [RENDER_MODEL, ...args],
      {
        cwd: ROOT,
        stdio: 'inherit',
      }
    );

    child.on('error', reject);

    child.on('close', code => {
      resolve(code);
    });
  });
}

async function renderModel(m2Path, outputDirectory) {
  const baseName = path.basename(
    m2Path,
    path.extname(m2Path)
  );

  const normalOutput = path.join(
    outputDirectory,
    `${safeName(baseName)}.png`
  );

  const orbitDirectory = path.join(
    outputDirectory,
    'orbit'
  );

  await fs.mkdir(orbitDirectory, {
    recursive: true,
  });

  console.log('');
  console.log('========================================');
  console.log(`M2: ${m2Path}`);
  console.log(`Normal: ${normalOutput}`);
  console.log(`Orbit: ${orbitDirectory}`);
  console.log('========================================');

  /*
   * Normal render
   */
  console.log('');
  console.log('[NORMAL RENDER]');

  let code = await runRenderer([
    m2Path,
    normalOutput,
    MODELS_ROOT,
    MODELS_ROOT,
    '0',
    'x',
    '0',
  ]);

  if (code !== 0) {
    throw new Error(
      `Normal render failed with exit code ${code}`
    );
  }

  /*
   * Camera Orbit render
   *
   * render-model.js determines the orbit output
   * from the output filename/directory.
   */
  console.log('');
  console.log('[CAMERA ORBIT]');

  const orbitOutput = path.join(
    orbitDirectory,
    `${safeName(baseName)}.png`
  );

  code = await runRenderer([
    m2Path,
    orbitOutput,
    MODELS_ROOT,
    MODELS_ROOT,
    '0',
    'x',
    '0',
    '--camera-orbit',
  ]);

  if (code !== 0) {
    throw new Error(
      `Camera orbit render failed with exit code ${code}`
    );
  }

  console.log('');
  console.log(`SUCCESS: ${baseName}`);
}

async function runTest(test, testIndex) {
  console.log('');
  console.log('');
  console.log('########################################');
  console.log(`# TEST ${test.id} - ${test.name}`);
  console.log('########################################');
  console.log(`Directory: ${test.directory}`);

  try {
    await fs.access(test.directory);
  } catch {
    console.error(
      `DIRECTORY NOT FOUND: ${test.directory}`
    );
    return {
      test,
      success: false,
      models: 0,
    };
  }

  const m2Files = await findM2Files(test.directory);

  if (m2Files.length === 0) {
    console.log('No .m2 files found.');
    return {
      test,
      success: true,
      models: 0,
    };
  }

  console.log(`Found ${m2Files.length} .m2 file(s).`);

  const testRoot = path.join(
    OUTPUT_ROOT,
    `${test.id}-${safeName(test.name)}`
  );

  await fs.mkdir(testRoot, {
    recursive: true,
  });

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < m2Files.length; i++) {
    const m2Path = m2Files[i];

    const baseName = path.basename(
      m2Path,
      path.extname(m2Path)
    );

    /*
     * One directory per M2
     */
    const modelDirectory = path.join(
      testRoot,
      safeName(baseName)
    );

    await fs.mkdir(modelDirectory, {
      recursive: true,
    });

    console.log('');
    console.log(
      `[TEST ${test.id}] MODEL ${i + 1}/${m2Files.length}`
    );

    try {
      await renderModel(
        m2Path,
        modelDirectory
      );

      successCount++;
    } catch (error) {
      failedCount++;

      console.error('');
      console.error(
        `FAILED: ${m2Path}`
      );
      console.error(
        error instanceof Error
          ? error.message
          : error
      );
    }
  }

  console.log('');
  console.log('----------------------------------------');
  console.log(`TEST ${test.id} COMPLETE`);
  console.log(`Models : ${m2Files.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed : ${failedCount}`);
  console.log(`Output : ${testRoot}`);
  console.log('----------------------------------------');

  return {
    test,
    success: failedCount === 0,
    models: m2Files.length,
    successCount,
    failedCount,
  };
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('WMVxTOPNG - 07 MODEL TEST');
  console.log('========================================');
  console.log(`Root   : ${ROOT}`);
  console.log(`Output : ${OUTPUT_ROOT}`);
  console.log('========================================');

  await fs.mkdir(OUTPUT_ROOT, {
    recursive: true,
  });

  const results = [];

  for (let i = 0; i < TESTS.length; i++) {
    const result = await runTest(
      TESTS[i],
      i + 1
    );

    results.push(result);
  }

  console.log('');
  console.log('');
  console.log('========================================');
  console.log('FINAL TEST SUMMARY');
  console.log('========================================');

  for (const result of results) {
    if (result.models === 0) {
      console.log(
        `${result.test.id} ${result.test.name}: NO M2`
      );
      continue;
    }

    console.log(
      `${result.test.id} ${result.test.name}: ` +
      `${result.successCount}/${result.models} successful, ` +
      `${result.failedCount} failed`
    );
  }

  console.log('');
  console.log(`Output: ${OUTPUT_ROOT}`);
  console.log('========================================');
}

main().catch(error => {
  console.error('');
  console.error('FATAL ERROR');
  console.error(
    error instanceof Error
      ? error.stack
      : error
  );
  process.exit(1);
});