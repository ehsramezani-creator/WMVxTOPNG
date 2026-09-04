import path from 'node:path';
import { CreatureDisplayInfoDBC } from './CreatureDisplayInfoDBC.js';
import { CreatureModelDataDBC } from './CreatureModelDataDBC.js';

const CREATURE_TEXTURE_BASE_TYPE = 11;

function normalize(p) {
  return String(p ?? '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .toLowerCase();
}

function removeExtension(p) {
  return String(p ?? '').replace(/\.[^./\\]+$/, '');
}

function modelPathMatches(a, b) {
  const left = normalize(removeExtension(a));
  const right = normalize(removeExtension(b));

  if (left === right) return true;

  return left.endsWith(`/${right}`) || right.endsWith(`/${left}`);
}

function resolveTextureName(files, name, modelPath = '') {
  if (!name) return null;

  const textureName = String(name).replaceAll('\\', '/');
  const baseName = textureName.replace(/\.[^./]+$/, '');
  const fileName = `${baseName}.blp`;

  const targetName = path.basename(fileName).toLowerCase();

  const modelDir = normalize(
    path.dirname(
      path.relative(
        process.cwd(),
        path.dirname(modelPath)
      )
    )
  );

  const preferred = `${modelDir}/${targetName}`;

  const direct = files?.get(normalize(textureName));
  if (direct) return direct;

  const withExtension = files?.get(normalize(fileName));
  if (withExtension) return withExtension;

  const nearby = files?.get(preferred);
  if (nearby) return nearby;

  if (files) {
    for (const [key, filePath] of files) {
      if (path.basename(key).toLowerCase() === targetName) {
        return filePath;
      }
    }
  }

  return null;
}

export class CreatureTextureResolver {
  constructor({
    files,
    displayInfoDBC = null,
    modelDataDBC = null,
  } = {}) {
    this.files = files;
    this.displayInfoDBC = displayInfoDBC;
    this.modelDataDBC = modelDataDBC;
  }

  async loadDBCs({ displayInfoPath, modelDataPath } = {}) {
    if (!this.displayInfoDBC && displayInfoPath) {
      this.displayInfoDBC =
        await CreatureDisplayInfoDBC.load(displayInfoPath);
    }

    if (!this.modelDataDBC && modelDataPath) {
      this.modelDataDBC =
        await CreatureModelDataDBC.load(modelDataPath);
    }

    return {
      displayInfoDBC: this.displayInfoDBC,
      modelDataDBC: this.modelDataDBC,
    };
  }

  async inspect(model, options = {}) {
    const modelPath = model?.filePath ?? model?.source ?? '';

    if (!modelPath) {
      return {
        isCreatureModel: false,
        hasSkins: false,
        reason: 'model-path-not-provided',
      };
    }

    await this.loadDBCs({
      displayInfoPath: options.displayInfoPath,
      modelDataPath: options.modelDataPath,
    });

    if (!this.modelDataDBC) {
      return {
        isCreatureModel: false,
        hasSkins: false,
        reason: 'CreatureModelData.dbc-not-available',
        modelPath,
      };
    }

    if (!this.displayInfoDBC) {
      return {
        isCreatureModel: false,
        hasSkins: false,
        reason: 'CreatureDisplayInfo.dbc-not-available',
        modelPath,
      };
    }

    const modelData = this.modelDataDBC.records.find(record =>
      modelPathMatches(record.modelName, modelPath)
    );

    if (!modelData) {
      return {
        isCreatureModel: false,
        hasSkins: false,
        reason: 'creature-model-data-not-found',
        modelPath,
      };
    }

    const displayInfos =
      this.displayInfoDBC.findByModelId(modelData.id);

    const groups = displayInfos.map(displayInfo => {
      const textures = Array.isArray(displayInfo.textures)
        ? displayInfo.textures
        : [];

      const slots = textures
        .map((name, slot) => {
          if (!name) return null;

          return {
            slot,
            textureType: CREATURE_TEXTURE_BASE_TYPE + slot,
            name,
            filePath: resolveTextureName(
              this.files,
              name,
              modelPath
            ),
          };
        })
        .filter(Boolean);

      return {
        id: displayInfo.id,
        modelId: displayInfo.modelId,
        extendedDisplayInfoId:
          displayInfo.extendedDisplayInfoId,
        textureVariations: textures,
        slots,
        hasSkins: slots.length > 0,
      };
    });

    return {
      isCreatureModel: true,
      hasSkins: groups.some(group => group.hasSkins),
      modelPath,
      modelData: {
        id: modelData.id,
        modelName: modelData.modelName,
        flags: modelData.flags,
        sizeClass: modelData.sizeClass,
        modelScale: modelData.modelScale,
      },
      displayInfos: groups,
    };
  }

  resolveTextureOverrides(model, resolution) {
    if (!model || !resolution?.enabled) return [];

    const textureFiles = Array.isArray(resolution.textureFiles)
      ? resolution.textureFiles
      : [];

    return textureFiles
      .map((entry, slot) => {
        if (!entry?.filePath || slot > 2) return null;

        return {
          slot,
          textureType: CREATURE_TEXTURE_BASE_TYPE + slot,
          name: entry.name,
          filePath: entry.filePath,
        };
      })
      .filter(Boolean);
  }

  async resolve(model, options = {}) {
    const modelPath = model?.filePath ?? model?.source ?? '';

    if (!modelPath) {
      return {
        enabled: false,
        reason: 'model-path-not-provided',
      };
    }

    await this.loadDBCs({
      displayInfoPath: options.displayInfoPath,
      modelDataPath: options.modelDataPath,
    });

    if (!this.displayInfoDBC) {
      return {
        enabled: false,
        reason: 'CreatureDisplayInfo.dbc-not-provided',
      };
    }

    if (!this.modelDataDBC) {
      return {
        enabled: false,
        reason: 'CreatureModelData.dbc-not-provided',
      };
    }

    const modelData = this.modelDataDBC.records.find(record =>
      modelPathMatches(record.modelName, modelPath)
    );

    if (!modelData) {
      return {
        enabled: false,
        reason: 'creature-model-data-not-found',
        modelPath,
      };
    }

    const displayInfos =
      this.displayInfoDBC.findByModelId(modelData.id);

    if (!displayInfos.length) {
      return {
        enabled: false,
        reason: 'creature-display-info-not-found',
        modelPath,
        modelData,
      };
    }

    const groups = displayInfos.map(displayInfo => ({
      id: displayInfo.id,
      modelId: displayInfo.modelId,
      extendedDisplayInfoId:
        displayInfo.extendedDisplayInfoId,
      textures: displayInfo.textures.filter(Boolean),
      textureFiles: displayInfo.textures
        .filter(Boolean)
        .map(name => ({
          name,
          filePath: resolveTextureName(this.files, name, modelPath),
        })),
    }));

    const preferredDisplayId =
      options.displayId != null
        ? Number(options.displayId)
        : null;

    const selected =
      preferredDisplayId != null
        ? groups.find(group => group.id === preferredDisplayId) ?? null
        : groups[0] ?? null;

    if (!selected) {
      return {
        enabled: false,
        reason: 'requested-display-info-not-found',
        modelPath,
        modelData,
        groups,
      };
    }

    const missing = selected.textureFiles
      .filter(texture => !texture.filePath)
      .map(texture => texture.name);

    return {
      enabled: true,
      modelPath,
      modelData: {
        id: modelData.id,
        flags: modelData.flags,
        modelName: modelData.modelName,
        sizeClass: modelData.sizeClass,
        modelScale: modelData.modelScale,
      },
      displayInfo: {
        id: selected.id,
        modelId: selected.modelId,
        extendedDisplayInfoId: selected.extendedDisplayInfoId,
        textures: selected.textures,
      },
      groups,
      textureNames: selected.textures,
      textureFiles: selected.textureFiles,
      missing,
    };
  }
}

export default CreatureTextureResolver;
