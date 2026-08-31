function validIndex(value) {
  return Number.isInteger(value) && value >= 0 && value !== 0xffff;
}

export class MaterialResolver {
  resolve(model, skin = model?.skin) {
    if (!model) throw new TypeError('Model is required');
    if (!skin) throw new Error('SKIN data is required');

    const batches = Array.isArray(skin.batches) ? skin.batches : [];
    const textures = Array.isArray(model.textures) ? model.textures : [];
    const textureLookups = model.textureLookups ?? [];
    const renderFlags = Array.isArray(model.renderFlags) ? model.renderFlags : [];

    const materials = batches.map((batch, index) => {
      const lookupIndex = validIndex(batch.textureComboIndex) ? batch.textureComboIndex : -1;
      const lookupValue = lookupIndex >= 0 ? textureLookups[lookupIndex] : -1;
      const textureIndex = validIndex(lookupValue) ? lookupValue : -1;

      const renderFlagsIndex = validIndex(batch.materialIndex) ? batch.materialIndex : -1;
      const flags = renderFlagsIndex >= 0 ? renderFlags[renderFlagsIndex] ?? null : null;

      return {
        index,
        textureLookupIndex: lookupIndex,
        textureIndex,
        texture: textures[textureIndex] ?? null,
        renderFlagsIndex,
        renderFlags: flags,
        blendMode: flags?.blendingMode ?? 0,
        materialLayer: batch.materialLayer ?? 0,
        textureCount: batch.textureCount ?? 0,
        textureCoordIndex: batch.textureCoordIndex ?? 0,
        textureWeightIndex: batch.textureWeightIndex ?? 0,
        textureTransformIndex: batch.textureTransformIndex ?? 0,
      };
    });

    return {
      materials,
      batches: batches.map((batch, i) => ({
        ...batch,
        index: i,
        materialIndexResolved: i,
      })),
    };
  }
}

export default MaterialResolver;
