import fs from 'node:fs/promises';
import { SkinLegacyLoader } from './SkinLegacyLoader.js';
import { M2SkinResolver } from './M2SkinResolver.js';

const MD20 = 'MD20';
const WOTLK_N_VERTICES_OFFSET = 0x3c;
const WOTLK_OFS_VERTICES_OFFSET = 0x40;
const WOTLK_N_VIEWS_OFFSET = 0x44;
const WOTLK_N_TEXTURES_OFFSET = 0x54;
const WOTLK_OFS_TEXTURES_OFFSET = 0x58;
const WOTLK_N_RENDER_FLAGS_OFFSET = 0x70;
const WOTLK_OFS_RENDER_FLAGS_OFFSET = 0x74;
const WOTLK_N_TEXTURE_LOOKUPS_OFFSET = 0x80;
const WOTLK_OFS_TEXTURE_LOOKUPS_OFFSET = 0x84;
const M2_VERTEX_SIZE = 48;
const M2_TEXTURE_SIZE = 16;
const M2_RENDER_FLAG_SIZE = 4;

function range(buffer, offset, size, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) || offset < 0 || size < 0 || offset + size > buffer.length) {
    throw new RangeError(`${label} exceeds M2 file: offset=0x${offset.toString(16)}, size=${size}, file=${buffer.length}`);
  }
}

function readString(buffer, offset, length) {
  if (!length || offset < 0 || offset + length > buffer.length) return '';
  return buffer.toString('utf8', offset, offset + length).replace(/\0+$/, '');
}

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
    if (buffer.length < 0x88) throw new Error(`M2 too small: ${source}`);
    if (buffer.toString('ascii', 0, 4) !== MD20) throw new Error(`Invalid M2 magic: ${source}`);

    const version = buffer.readUInt32LE(4);
    if (version < 264) throw new Error(`Unsupported legacy M2 version ${version}; this loader targets WotLK 3.3.5a (264).`);

    const nameLength = buffer.readUInt32LE(0x08);
    const nameOffset = buffer.readUInt32LE(0x0c);
    const nVertices = buffer.readUInt32LE(WOTLK_N_VERTICES_OFFSET);
    const ofsVertices = buffer.readUInt32LE(WOTLK_OFS_VERTICES_OFFSET);
    const nViews = buffer.readUInt32LE(WOTLK_N_VIEWS_OFFSET);
    const nTextures = buffer.readUInt32LE(WOTLK_N_TEXTURES_OFFSET);
    const ofsTextures = buffer.readUInt32LE(WOTLK_OFS_TEXTURES_OFFSET);
    const nRenderFlags = buffer.readUInt32LE(WOTLK_N_RENDER_FLAGS_OFFSET);
    const ofsRenderFlags = buffer.readUInt32LE(WOTLK_OFS_RENDER_FLAGS_OFFSET);
    const nTextureLookups = buffer.readUInt32LE(WOTLK_N_TEXTURE_LOOKUPS_OFFSET);
    const ofsTextureLookups = buffer.readUInt32LE(WOTLK_OFS_TEXTURE_LOOKUPS_OFFSET);

    const name = readString(buffer, nameOffset, nameLength);

    range(buffer, ofsVertices, nVertices * M2_VERTEX_SIZE, 'M2 vertices');
    const vertices = new Array(nVertices);
    for (let i = 0; i < nVertices; i++) {
      const o = ofsVertices + i * M2_VERTEX_SIZE;
      vertices[i] = {
        position: [buffer.readFloatLE(o), buffer.readFloatLE(o + 4), buffer.readFloatLE(o + 8)],
        boneWeights: [buffer[o + 12], buffer[o + 13], buffer[o + 14], buffer[o + 15]],
        boneIndices: [buffer[o + 16], buffer[o + 17], buffer[o + 18], buffer[o + 19]],
        normal: [buffer.readFloatLE(o + 20), buffer.readFloatLE(o + 24), buffer.readFloatLE(o + 28)],
        texCoord: [buffer.readFloatLE(o + 32), buffer.readFloatLE(o + 36)],
        texCoord2: [buffer.readFloatLE(o + 40), buffer.readFloatLE(o + 44)],
      };
    }

    range(buffer, ofsTextures, nTextures * M2_TEXTURE_SIZE, 'M2 textures');
    const textures = new Array(nTextures);
    for (let i = 0; i < nTextures; i++) {
      const o = ofsTextures + i * M2_TEXTURE_SIZE;
      const flags = buffer.readUInt32LE(o);
      const type = buffer.readUInt32LE(o + 4);
      const length = buffer.readUInt32LE(o + 8);
      const offset = buffer.readUInt32LE(o + 12);
      range(buffer, offset, length, `M2 texture ${i} name`);
      textures[i] = { index: i, flags, type, name: readString(buffer, offset, length) };
    }

    range(buffer, ofsRenderFlags, nRenderFlags * M2_RENDER_FLAG_SIZE, 'M2 render flags');
    const renderFlags = new Array(nRenderFlags);
    for (let i = 0; i < nRenderFlags; i++) {
      const o = ofsRenderFlags + i * M2_RENDER_FLAG_SIZE;
      renderFlags[i] = { index: i, flags: buffer.readUInt16LE(o), blendingMode: buffer.readUInt16LE(o + 2) };
    }

    range(buffer, ofsTextureLookups, nTextureLookups * 2, 'M2 texture lookups');
    const textureLookups = new Uint16Array(nTextureLookups);
    for (let i = 0; i < nTextureLookups; i++) textureLookups[i] = buffer.readUInt16LE(ofsTextureLookups + i * 2);

    return {
      source, magic: MD20, version, name,
      nVertices, ofsVertices, vertices,
      nViews, skinProfileCount: nViews,
      nTextures, ofsTextures, textures,
      nRenderFlags, ofsRenderFlags, renderFlags,
      nTextureLookups, ofsTextureLookups, textureLookups,
      skinNames: [], skins: [], skin: null,
    };
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
