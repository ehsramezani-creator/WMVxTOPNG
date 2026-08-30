import fs from 'node:fs/promises';
import path from 'node:path';
import { SkinLegacyLoader } from './SkinLegacyLoader.js';
import { M2SkinResolver } from './M2SkinResolver.js';

const MD20 = 'MD20';
const WOTLK_N_VIEWS_OFFSET = 0x44;

export class M2LegacyLoader {
  constructor(options = {}) {
    this.skinLoader = options.skinLoader ?? new SkinLegacyLoader();
    this.skinResolver = options.skinResolver ?? new M2SkinResolver(this.skinLoader);
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
    if (nameLength && nameOffset + nameLength <= buffer.length) name = buffer.toString('utf8', nameOffset, nameOffset + nameLength).replace(/\0+$/, '');
    return { source, magic: MD20, version, name, nViews, skinProfileCount: nViews, skinNames: [], skins: [], skin: null };
  }

  async getSkin(model, options = {}) {
    if (!model.nViews) return null;
    if (options.skinPath) {
      const skin = await this.skinLoader.load(options.skinPath);
      skin.profileIndex = options.skinIndex ?? 0;
      skin.filePath = options.skinPath;
      model.skinNames = [options.skinPath];
      model.skins = [skin];
      return skin;
    }
    const modelPath = model.filePath ?? model.source;
    const result = await this.skinResolver.resolve(modelPath, model.nViews, options.skinIndex ?? 0);
    result.skin.profileIndex = result.index;
    result.skin.filePath = result.filePath;
    model.skinNames = result.candidates;
    model.skins = [result.skin];
    model.skinPath = result.filePath;
    return result.skin;
  }
}

export default M2LegacyLoader;
