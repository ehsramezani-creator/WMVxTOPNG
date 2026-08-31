export class MaterialResolver {
  resolve(model, skin = model?.skin) {
    if (!model) throw new TypeError('Model is required');
    if (!skin) throw new Error('SKIN data is required');

    const batches = Array.isArray(skin.batches) ? skin.batches : [];
    const textures = Array.isArray(model.textures) ? model.textures : [];
    const textureLookups = model.textureLookups ?? [];
    const renderFlags = Array.isArray(model.renderFlags) ? model.renderFlags : [];

    const materials = batches.map((batch, index) => {
      const lookupIndex = batch.textureComboIndex ?? -1;
      const textureIndex = lookupIndex >= 0 ? (textureLookups[lookupIndex] ?? -1) : -1;
      const renderFlagsIndex = batch.materialLayer ?? -1;
      return {
        index,
        textureLookupIndex: lookupIndex,
        textureIndex,
        texture: textures[textureIndex] ?? null,
        renderFlagsIndex,
        renderFlags: renderFlags[renderFlagsIndex] ?? null,
        blendMode: renderFlags[renderFlagsIndex]?.blendingMode ?? null,
      };
    });

    return {
      materials,
      batches: batches.map((batch, i) => ({ ...batch, materialIndex: i })),
    };
  }
}

export default MaterialResolver;
