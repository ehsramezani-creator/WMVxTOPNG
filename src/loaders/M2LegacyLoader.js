import fs from 'node:fs/promises';
import path from 'node:path';
import { SkinLegacyLoader } from './SkinLegacyLoader.js';

const MD20 = 'MD20';

export class M2LegacyLoader {
  constructor(options = {}) {
    this.skinLoader = options.skinLoader ?? new SkinLegacyLoader();
  }

  async load(filePath, options = {}) {
    const data = await fs.readFile(filePath);
    const model = this.parse(data, filePath);
    model.filePath = filePath;
    if (options.loadSkin !== false) model.skin = await this.getSkin(model, options);
    return model;
  }

  parse(buffer, source = '<buffer>') {
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
    if (buffer.length < 0x54) throw new Error(`M2 too small: ${source}`);
    if (buffer.toString('ascii', 0, 4) !== MD20) throw new Error(`Invalid M2 magic: ${source}`);

    const version = buffer.readUInt32LE(4);
    // WotLK 3.3.5a uses the post-264 layout. In that layout nViews is the
    // scalar immediately after the vertices M2Array.
    const nViewsOffset = version >= 264 ? 0x9c : 0x9c;
    const nViews = buffer.readUInt32LE(nViewsOffset);
    const nameLength = buffer.readUInt32LE(0x08);
    const nameOffset = buffer.readUInt32LE(0x0c);
    let name = '';
    if (nameLength && nameOffset + nameLength <= buffer.length) {
      name = buffer.toString('utf8', nameOffset, nameOffset + nameLength).replace(/\0+$/, '');
    }

    return {
      source, magic: MD20, version, name,
      nViews,
      skinProfileCount: nViews,
      skinNames: [],
      skin: null
    };
  }

  async getSkin(model, options = {}) {
    if (!model.nViews) return null;
    const baseDir = options.baseDir ?? path.dirname(model.filePath ?? model.source);
    const explicit = options.skinPath;
    if (explicit) return this.skinLoader.load(explicit);

    const modelName = path.basename(model.filePath ?? model.source, path.extname(model.filePath ?? model.source));
    const candidates = [];
    for (let i = 0; i < model.nViews; i++) {
      const suffix = String(i).padStart(2, '0');
      candidates.push(path.join(baseDir, `${modelName}${suffix}.skin`));
    }

    for (const candidate of candidates) {
      try {
        return await this.skinLoader.load(candidate);
      } catch (error) {
        if (error?.code === 'ENOENT') continue;
        throw error;
      }
    }

    const error = new Error(`No external SKIN found for ${modelName}. Tried ${candidates.length} profile(s).`);
    error.candidates = candidates;
    throw error;
  }
}

export default M2LegacyLoader;
