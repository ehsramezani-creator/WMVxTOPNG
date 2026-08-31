import { CharSectionsDBC } from './CharSectionsDBC.js';
import { CharacterTextureBuilder, LEGACY_CHARACTER_REGIONS } from '../render/CharacterTextureBuilder.js';

const BASE = Object.freeze({ SKIN: 0, FACE: 1, FACIAL_HAIR: 2, HAIR: 3, UNDERWEAR: 4 });
const RACE_IDS = Object.freeze({ human: 1, orc: 2, dwarf: 3, nightelf: 4, undead: 5, forsaken: 5, tauren: 6, gnome: 7, troll: 8, goblin: 9, bloodelf: 10, draenei: 11 });
const GENDER_IDS = Object.freeze({ male: 0, female: 1 });

function normalize(p) { return String(p ?? '').replaceAll('\\', '/').replace(/^\/+/, '').toLowerCase(); }

export function raceGenderFromModel(modelPath) {
  const parts = normalize(modelPath).split('/');
  const i = parts.indexOf('character');
  if (i < 0) return null;
  const raceName = parts[i + 1] ?? '';
  const genderName = parts[i + 2] ?? '';
  const raceId = RACE_IDS[raceName];
  const sexId = GENDER_IDS[genderName];
  return raceId && sexId != null ? { raceId, sexId, raceName, genderName } : null;
}

function resolveFile(files, name) {
  if (!name) return null;
  const key = normalize(name);
  return files.get(key) ?? files.get(key.endsWith('.blp') ? key : `${key}.blp`) ?? null;
}

function findRecord(dbc, query) { return dbc.find(query) ?? dbc.matching(query)[0] ?? null; }

export class CharacterTextureResolver {
  constructor({ decoder, files, dbc = null } = {}) { this.decoder = decoder; this.files = files; this.dbc = dbc; }
  async loadDBC(dbPath) { if (this.dbc) return this.dbc; if (!dbPath) return null; this.dbc = await CharSectionsDBC.load(dbPath); return this.dbc; }
  detect(model) { return raceGenderFromModel(model?.filePath ?? model?.source ?? ''); }

  async resolve(model, options = {}) {
    const identity = this.detect(model);
    if (!identity) return { enabled: false, reason: 'not-a-character' };
    const dbc = await this.loadDBC(options.dbPath);
    if (!dbc) return { enabled: false, reason: 'CharSections.dbc-not-provided', identity };

    const skin = options.skin ?? 0;
    const face = options.face ?? 0;
    const hairColor = options.hairColor ?? 0;
    const hairStyle = options.hairStyle ?? 0;
    const facialColor = options.facialColor ?? 0;
    const pick = (baseSection, variationIndex, colorIndex = 0) => findRecord(dbc, { raceId: identity.raceId, sexId: identity.sexId, baseSection, variationIndex, colorIndex });

    // Same lookup semantics as WMVx LegacyCharacterCustomizationProvider.
    const records = {
      skin: pick(BASE.SKIN, skin),
      face: pick(BASE.FACE, skin, face),
      hair: pick(BASE.HAIR, hairColor, hairStyle),
      facialHair: pick(BASE.FACIAL_HAIR, hairColor, facialColor),
      underwear: pick(BASE.UNDERWEAR, skin),
    };

    const textureNames = [...new Set(Object.values(records).flatMap(r => r?.textures ?? []).filter(Boolean))];
    const decoded = new Map();
    const decode = async name => {
      if (!name) return null;
      const key = normalize(name);
      if (decoded.has(key)) return decoded.get(key);
      const file = resolveFile(this.files, name);
      if (!file) return null;
      const { readFile } = await import('node:fs/promises');
      const image = this.decoder.decode(await readFile(file));
      decoded.set(key, image);
      return image;
    };

    const missing = [];
    const load = async name => {
      if (!name) return null;
      const image = await decode(name);
      if (!image) missing.push(name);
      return image;
    };

    const baseName = records.skin?.textures?.[0] ?? '';
    const base = await load(baseName);
    if (!base) return { enabled: true, identity, records, textureNames, composite: null, missingBase: baseName, missing };

    // WMVx builds one component texture and binds it to M2 texture type BODY (1).
    const builder = new CharacterTextureBuilder({ regions: LEGACY_CHARACTER_REGIONS });
    builder.setBaseLayer(base);
    const layers = [];

    const add = async (record, textureIndex, region, layerIndex, blendMode = 'BLIT') => {
      const name = record?.textures?.[textureIndex] ?? '';
      if (!name) return;
      const image = await load(name);
      if (!image) return;
      builder.addLayer(image, region, layerIndex, blendMode);
      layers.push({ name, region, layerIndex, blendMode });
    };

    if (options.showUnderwear !== false && records.underwear) {
      await add(records.underwear, 0, 'LEG_UPPER', 1);
      await add(records.underwear, 1, 'TORSO_UPPER', 1);
    }
    if (records.face) {
      await add(records.face, 0, 'FACE_LOWER', 1);
      await add(records.face, 1, 'FACE_UPPER', 1);
    }
    if (options.showFacialHair !== false && records.facialHair) {
      await add(records.facialHair, 0, 'FACE_LOWER', 2);
      await add(records.facialHair, 1, 'FACE_UPPER', 2);
    }
    if (records.hair) {
      await add(records.hair, 1, 'FACE_LOWER', 3);
      await add(records.hair, 2, 'FACE_UPPER', 3);
    }

    return {
      enabled: true,
      identity,
      records,
      textureNames,
      composite: builder.build(),
      layers,
      missing,
      direct: {
        hair: records.hair?.textures?.filter(Boolean) ?? [],
        facialHair: records.facialHair?.textures?.filter(Boolean) ?? [],
        skinExtra: records.skin?.textures?.slice(1).filter(Boolean) ?? [],
      },
    };
  }
}

export { BASE as CharacterTextureBaseSections, LEGACY_CHARACTER_REGIONS as LegacyCharacterRegions };
export default CharacterTextureResolver;
