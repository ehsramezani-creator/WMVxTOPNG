export class MaterialResolver {
  resolve(model, skin = model?.skin) {
    if (!model) throw new TypeError('Model is required');
    if (!skin) throw new Error('SKIN data is required');

    const batches = Array.isArray(skin.batches) ? skin.batches : [];
    const textures = Array.isArray(model.textures) ? model.textures : [];
    const renderFlags = Array.isArray(model.renderFlags) ? model.renderFlags : [];
    const materials = batches.map((batch, index) => {
      const textureIndex = batch.textureIndex ?? batch.textureLookupIndex ?? batch.textureId ?? -1;
      const renderFlagsIndex = batch.renderFlagsIndex ?? batch.renderFlagIndex ?? -1;
      return {
        index,
        textureIndex,
        texture: textures[textureIndex] ?? null,
        renderFlagsIndex,
        renderFlags: renderFlags[renderFlagsIndex] ?? null,
        blendMode: batch.blendMode ?? null,
        alphaTest: batch.alphaTest ?? null,
      };
    });

    return { materials, batches: batches.map((batch, i) => ({ ...batch, materialIndex: i })) };
  }
}

export default MaterialResolver;
