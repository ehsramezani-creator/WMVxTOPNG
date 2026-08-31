import { CharSectionsDBC } from './CharSectionsDBC.js';

const BASE = Object.freeze({ SKIN: 0, FACE: 1, FACIAL_HAIR: 2, HAIR: 3, UNDERWEAR: 4 });
const RACE_IDS = Object.freeze({ human: 1, orc: 2, dwarf: 3, nightelf: 4, undead: 5, forsaken: 5, tauren: 6, gnome: 7, troll: 8, goblin: 9, bloodelf: 10, draenei: 11 });
const GENDER_IDS = Object.freeze({ male: 0, female: 1 });
const REGIONS = Object.freeze({
  FACE_UPPER: [0, 320, 256, 64], FACE_LOWER: [0, 384, 256, 128],
  TORSO_UPPER: [256, 0, 256, 128], LEG_UPPER: [256, 192, 256, 128]
});

function normalize(p) { return p.replaceAll('\\', '/').replace(/^\/+/, '').toLowerCase(); }
function raceGenderFromModel(modelPath) {
  const parts = normalize(modelPath).split('/');
  const i = parts.indexOf('character');
  if (i < 0) return null;
  const raceId = RACE_IDS[parts[i + 1] ?? ''];
  const sexId = GENDER_IDS[parts[i + 2] ?? ''];
  return raceId && sexId != null ? { raceId, sexId, raceName: parts[i + 1], genderName: parts[i + 2] } : null;
}
function resolveFile(files, name) {
  if (!name) return null;
  let key = normalize(name);
  if (!key.endsWith('.blp')) key += '.blp';
  return files.get(key) ?? files.get(normalize(name)) ?? null;
}
function findRecord(dbc, query) { return dbc.find(query) ?? dbc.matching(query)[0] ?? null; }
function idx(w, x, y) { return (y * w + x) * 4; }

function compositeLayer(src, dst, dstWidth, dx, dy, dw, dh) {
  if (!src?.pixels?.length) return;
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const sx = Math.min(src.width - 1, Math.floor(x * src.width / dw));
    const sy = Math.min(src.height - 1, Math.floor(y * src.height / dh));
    const si = idx(src.width, sx, sy), di = idx(dstWidth, dx + x, dy + y);
    const sa = src.pixels[si + 3] / 255;
    if (sa <= 0) continue;
    const da = dst[di + 3] / 255, oa = sa + da * (1 - sa);
    dst[di] = Math.round((src.pixels[si] * sa + dst[di] * da * (1 - sa)) / oa);
    dst[di + 1] = Math.round((src.pixels[si + 1] * sa + dst[di + 1] * da * (1 - sa)) / oa);
    dst[di + 2] = Math.round((src.pixels[si + 2] * sa + dst[di + 2] * da * (1 - sa)) / oa);
    dst[di + 3] = Math.round(oa * 255);
  }
}

export class CharacterTextureResolver {
  constructor({ decoder, files, dbc = null } = {}) { this.decoder = decoder; this.files = files; this.dbc = dbc; }
  async loadDBC(dbPath) { if (this.dbc) return this.dbc; if (!dbPath) return null; this.dbc = await CharSectionsDBC.load(dbPath); return this.dbc; }
  detect(model) { return raceGenderFromModel(model?.filePath ?? model?.source ?? ''); }

  async resolve(model, options = {}) {
    const identity = this.detect(model);
    if (!identity) return { enabled: false, reason: 'not-a-character' };
    const dbc = await this.loadDBC(options.dbPath);
    if (!dbc) return { enabled: false, reason: 'CharSections.dbc-not-provided', identity };

    const skin = options.skin ?? 0, face = options.face ?? 0;
    const hairColor = options.hairColor ?? 0, hairStyle = options.hairStyle ?? 0;
    const facialColor = options.facialColor ?? 0;
    const pick = (baseSection, variationIndex, colorIndex = 0) => findRecord(dbc, { raceId: identity.raceId, sexId: identity.sexId, baseSection, variationIndex, colorIndex });
    const records = {
      skin: pick(BASE.SKIN, skin), face: pick(BASE.FACE, skin, face),
      hair: pick(BASE.HAIR, hairColor, hairStyle), facialHair: pick(BASE.FACIAL_HAIR, hairColor, facialColor),
      underwear: pick(BASE.UNDERWEAR, skin)
    };

    const textureNames = [...new Set(Object.values(records).flatMap(r => r?.textures ?? []).filter(Boolean))];
    const decoded = new Map();
    const decode = async name => {
      if (!name) return null;
      if (decoded.has(name)) return decoded.get(name);
      const file = resolveFile(this.files, name);
      if (!file) return null;
      const { readFile } = await import('node:fs/promises');
      const image = this.decoder.decode(await readFile(file)); decoded.set(name, image); return image;
    };

    const baseName = records.skin?.textures?.[0] ?? '';
    const base = await decode(baseName);
    if (!base) return { enabled: true, identity, records, textureNames, composite: null, missingBase: baseName };

    const width = 512, height = 512, pixels = new Uint8Array(width * height * 4);
    compositeLayer(base, pixels, width, 0, 0, width, height);
    const layers = [];
    const add = async (record, textureIndex, regionName, layerIndex) => {
      const name = record?.textures?.[textureIndex] ?? '', region = REGIONS[regionName];
      if (!name || !region) return;
      const image = await decode(name); if (!image) return;
      compositeLayer(image, pixels, width, ...region); layers.push({ name, region: regionName, layerIndex });
    };
    if (records.face) { await add(records.face, 0, 'FACE_LOWER', 1); await add(records.face, 1, 'FACE_UPPER', 1); }
    if (options.showUnderwear !== false && records.underwear) { await add(records.underwear, 0, 'LEG_UPPER', 1); await add(records.underwear, 1, 'TORSO_UPPER', 1); }
    if (options.showFacialHair !== false && records.facialHair) await add(records.facialHair, 0, 'FACE_LOWER', 2);

    return { enabled: true, identity, records, textureNames, composite: { width, height, channels: 4, pixels }, layers,
      direct: { hair: records.hair?.textures?.filter(Boolean) ?? [], facialHair: records.facialHair?.textures?.filter(Boolean) ?? [] } };
  }
}

export { BASE as CharacterTextureBaseSections, REGIONS as LegacyCharacterRegions, raceGenderFromModel };
export default CharacterTextureResolver;
