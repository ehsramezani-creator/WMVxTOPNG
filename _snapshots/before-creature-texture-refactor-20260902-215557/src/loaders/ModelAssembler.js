export class ModelAssembler {
  assemble(model, skin = model?.skin) {
    if (!model) throw new TypeError('Model is required');
    if (!skin) throw new Error('SKIN data is required');
    if (!Array.isArray(model.vertices)) throw new Error('M2 vertices are required');

    const vertices = model.vertices;
    const indices = skin.indices;
    const triangles = skin.triangles;

    if (!indices || !triangles) throw new Error('SKIN indices and triangles are required');

    const drawIndices = new Uint32Array(triangles.length);
    for (let i = 0; i < triangles.length; i++) {
      const skinIndex = triangles[i];
      if (skinIndex >= indices.length) {
        throw new RangeError(`SKIN triangle index ${skinIndex} exceeds SKIN indices (${indices.length})`);
      }
      const vertexIndex = indices[skinIndex];
      if (vertexIndex >= vertices.length) {
        throw new RangeError(`SKIN vertex index ${vertexIndex} exceeds M2 vertices (${vertices.length})`);
      }
      drawIndices[i] = vertexIndex;
    }

    const submeshes = skin.submeshes.map((section, index) => {
      const start = section.triangleStart;
      const end = start + section.triangleCount;
      if (end > triangles.length) throw new RangeError(`Submesh ${index} triangle range exceeds SKIN triangles`);
      return {
        ...section,
        index,
        firstIndex: start,
        indexCount: section.triangleCount,
      };
    });

    const batches = skin.batches.map((batch, index) => ({
      ...batch,
      index,
      submesh: submeshes[batch.skinSectionIndex] ?? null,
    }));

    return {
      source: model.source,
      version: model.version,
      name: model.name,
      vertices,
      indices: drawIndices,
      submeshes,
      batches,
      skin,
    };
  }
}

export default ModelAssembler;
