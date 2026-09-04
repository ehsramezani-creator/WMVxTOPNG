import { CreatureTextureResolver } from './CreatureTextureResolver.js';

/**
 * Resolves the numeric IDs shown by WMVx's "Skins" field.
 *
 * Important: these IDs are NOT M2 .skin profile filenames (00.skin, 01.skin, ...).
 * The resolver is provider-based so non-Creature model types can be added without
 * changing the public API or assuming that every model is a Creature.
 */
export class SkinIdResolver {
  constructor({ files, providers = [] } = {}) {
    this.files = files;
    this.providers = providers;
  }

  static createDefault({ files } = {}) {
    return new SkinIdResolver({
      files,
      providers: [
        new CreatureSkinIdProvider({ files }),
      ],
    });
  }

  async resolve(model, options = {}) {
    const results = [];

    for (const provider of this.providers) {
      const result = await provider.resolve(model, options);
      if (result) results.push(result);
    }

    const supported = results.filter(result => result.supported);
    const skinIds = [...new Set(
      supported.flatMap(result =>
        Array.isArray(result.skinIds) ? result.skinIds : []
      )
    )];

    if (supported.length > 0) {
      return {
        resolved: true,
        skinIds,
        providers: results,
      };
    }

    return {
      resolved: false,
      skinIds: [],
      providers: results,
      reason: results.length
        ? 'no-provider-could-resolve-model'
        : 'no-skin-id-provider-available',
    };
  }
}

class CreatureSkinIdProvider {
  constructor({ files, resolver = null } = {}) {
    this.name = 'creature';
    this.resolver = resolver ?? new CreatureTextureResolver({ files });
  }

  async resolve(model, options = {}) {
    const displayInfoPath = options.creatureDisplayInfoPath ?? options.displayInfoPath;
    const modelDataPath = options.creatureModelDataPath ?? options.modelDataPath;

    const inspection = await this.resolver.inspect(model, {
      displayInfoPath,
      modelDataPath,
    });

    if (!inspection.isCreatureModel) {
      return {
        provider: this.name,
        supported: false,
        reason: inspection.reason,
        skinIds: [],
      };
    }

    return {
      provider: this.name,
      supported: true,
      modelDataId: inspection.modelData?.id ?? null,
      skinIds: inspection.displayInfos.map(displayInfo => displayInfo.id),
      groups: inspection.displayInfos.map(displayInfo => ({
        id: displayInfo.id,
        modelId: displayInfo.modelId,
        hasTextures: displayInfo.hasSkins,
      })),
    };
  }
}

export default SkinIdResolver;
