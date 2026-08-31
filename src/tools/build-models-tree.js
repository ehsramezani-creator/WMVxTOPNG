import path from 'node:path';
import { buildModelsTree } from '../mpq/ModelsTreeBuilder.js';

const [, , dataRoot, executable, destination = './ModelsTree'] = process.argv;

if (!dataRoot || !executable) {
  console.error('Usage: node src/tools/build-models-tree.js <WoW-root-or-Data> <MPQExtractor.exe> [destination]');
  process.exit(2);
}

const resolvedDataRoot = path.basename(dataRoot).toLowerCase() === 'data'
  ? dataRoot
  : path.join(dataRoot, 'Data');

try {
  const result = await buildModelsTree({
    dataRoot: resolvedDataRoot,
    executable,
    destination,
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
