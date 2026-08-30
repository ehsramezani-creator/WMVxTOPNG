import { extractWithMPQExtractor } from '../mpq/MPQExtractor.js';

const [, , executable, archive, pattern, destination = './fixtures'] = process.argv;

if (!executable || !archive || !pattern) {
  console.error('Usage: node src/tools/extract-mpq.js <MPQExtractor.exe> <archive.MPQ> <pattern> [destination]');
  process.exit(2);
}

try {
  const result = await extractWithMPQExtractor(executable, archive, pattern, destination);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
