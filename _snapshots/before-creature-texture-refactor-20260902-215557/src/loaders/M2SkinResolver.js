import fs from 'node:fs/promises';
import path from 'node:path';

/** Resolve external WotLK M2 skin profiles using the actual M2 basename. */
export class M2SkinResolver {
  constructor(skinLoader) {
    this.skinLoader = skinLoader;
  }

  candidatePaths(m2Path, profileCount) {
    const dir = path.dirname(m2Path);
    const base = path.basename(m2Path, path.extname(m2Path));
    return Array.from({ length: profileCount }, (_, i) =>
      path.join(dir, `${base}${String(i).padStart(2, '0')}.skin`)
    );
  }

  async resolve(m2Path, profileCount, preferredIndex = 0) {
    if (!profileCount) return null;
    const candidates = this.candidatePaths(m2Path, profileCount);
    const order = [preferredIndex, ...candidates.map((_, i) => i).filter(i => i !== preferredIndex)];
    for (const index of order) {
      const filePath = candidates[index];
      try {
        await fs.access(filePath);
        const skin = await this.skinLoader.load(filePath);
        return { index, filePath, skin, candidates };
      } catch (error) {
        if (error?.code === 'ENOENT') continue;
        throw error;
      }
    }
    const error = new Error(`No SKIN profile found for ${m2Path}`);
    error.code = 'SKIN_NOT_FOUND';
    error.candidates = candidates;
    throw error;
  }
}

export default M2SkinResolver;
