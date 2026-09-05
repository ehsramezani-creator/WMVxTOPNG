import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DB_ROOT = String.raw`.\ModelsTree`;
const INSPECTOR = String.raw`.\src\tools\inspect-skins.js`;

const tests = [
  ['01', 'Boxtest', String.raw`.\ModelsTree\World\ArtTest\Boxtest`],
  ['02', 'FishingBox', String.raw`.\ModelsTree\World\AZEROTH\BOOTYBAY\PASSIVEDOODAD\FishingBox`],
  ['03', 'Dam', String.raw`.\ModelsTree\World\OUTLAND\PASSIVEDOODADS\Dam`],
  ['04', 'AllianceRider', String.raw`.\ModelsTree\Creature\ALLIANCERIDER`],
  ['05', 'GryphonPet', String.raw`.\ModelsTree\Creature\GryphonPet`],
  ['06', 'FelGolem', String.raw`.\ModelsTree\Creature\FelGolem`],
  ['07-A', 'Shark', String.raw`.\ModelsTree\Creature\SHARK\Shark.M2`],
  ['07-B', 'HammerHead', String.raw`.\ModelsTree\Creature\SHARK\HammerHead.M2`],
];

for (const [id, name, modelPath] of tests) {
  console.log(`\n========== TEST ${id} — ${name} ==========`);

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [INSPECTOR, modelPath, DB_ROOT],
      {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    const result = JSON.parse(stdout);

    console.log(`Model       : ${result.model}`);
    console.log(`Resolved    : ${result.resolved}`);
    console.log(`Skin count  : ${result.skinIds?.length ?? 0}`);
    console.log(`Skin IDs    : ${result.skinIds?.join(', ') || '(none)'}`);

  } catch (error) {
    console.log(`ERROR: ${error.stderr || error.message}`);
  }
}
