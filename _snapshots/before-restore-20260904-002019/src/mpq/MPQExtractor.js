import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export function extractWithMPQExtractor(executable, archive, pattern, destination) {
  return new Promise((resolve, reject) => {
    mkdir(destination, { recursive: true }).then(() => {
      const args = ['-e', pattern, '-f', '-o', destination, archive];
      const child = spawn(executable, args, { windowsHide: true });
      let stdout = '', stderr = '';
      child.stdout.on('data', d => { stdout += d; });
      child.stderr.on('data', d => { stderr += d; });
      child.on('error', reject);
      child.on('close', code => code === 0
        ? resolve({ stdout, stderr, destination })
        : reject(new Error(`MPQExtractor exited with ${code}\n${stdout}\n${stderr}`)));
    }).catch(reject);
  });
}

export function mpqExtractorCommand(executable, archive, pattern, destination) {
  return [executable, '-e', pattern, '-f', '-o', destination, archive];
}

export function defaultExtractionDirectory(root, modelName) {
  return path.join(root, 'fixtures', modelName);
}
