import fs from 'node:fs/promises';
import path from 'node:path';
import { SkinLegacyLoader } from './SkinLegacyLoader.js';

const MD20 = 'MD20';
const WOTLK_N_VIEWS_OFFSET = 0x44;

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
    if (buffer.length < 0x48) throw new Error(`M2 too small: ${source}`);
    if (buffer.toString('ascii', 0, 4) !== MD20) throw new Error(`Invalid M2 magic: ${source}`);

    const version = buffer.readUInt32LE(4);
    if (version < 264) throw new Error(`Unsupported legacy M2 version ${version}; this loader targets WotLK 3.3.5a (264).`);

    const nameLength = buffer.readUInt32LE(0x08);
    const nameOffset = buffer.readUInt32LE(0x0c);
    const nViews = buffer.readUInt32LE(WOTLK_N_VIEWS_OFFSET);

    let name = '';
    if (nameLength && nameOffset + nameLength <= buffer.length) {
      name = buffer.toString('utf8', nameOffset, nameOffset + nameLength).replace(/\0+$/, '');
    }

    return {
      source,
      magic: MD20,
      version,
      name,
      nViews,
      skinProfileCount: nViews,
      skinNames: [],
      skin: null
    };
  }

  async getSkin(model, options = {}) {
    if (!model.nViews) return null;
    if (options.skinPath) return this.skinLoader.load(options.skinPath);

    const modelPath = model.filePath ?? model.source;
    const baseDir = options.baseDir ?? path.dirname(modelPath);
    const modelName = path.basename(modelPath, path.extname(modelPath));
    const candidates = [];

    for (let i = 0; i < model.nViews; i++) {
      const suffix = String(i).padStart(2, '0');
      candidates.push(path.join(baseDir, `${modelName}${suffix}.skin`));
    }

    for (const candidate of candidates) {
      try {
        const skin = await this.skinLoader.load(candidate);
        skin.profileIndex = candidates.indexOf(candidate);
        model.skinNames.push(candidate);
        return skin;
      } catch (error) {
        if (error?.code === 'ENOENT') continue;
        throw error;
      }
    }

    const error = new Error(`No external SKIN found for ${modelName}. Tried: ${candidates.join(', ')}`);
    error.code = 'SKIN_NOT_FOUND';
    error.candidates = candidates;
    throw error;
  }
}

export default M2LegacyLoader;
