#!/usr/bin/env node
import { M2LegacyLoader } from '../loaders/M2LegacyLoader.js';
import { MaterialResolver } from '../loaders/MaterialResolver.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node src/tools/inspect-render.js <model.m2>');
  process.exit(2);
}

try {
  const model = await new M2LegacyLoader().load(file);
  const resolved = new MaterialResolver().resolve(model, model.skin);
  const positions = model.vertices.map(v => v.position);
  const uv = model.vertices.map(v => v.texCoord);
  const bbox = [0, 1, 2].map(k => ({
    min: Math.min(...positions.map(p => p[k])),
    max: Math.max(...positions.map(p => p[k])),
  }));

  console.log(JSON.stringify({
    model: { name: model.name, version: model.version },
    geometry: {
      vertices: model.vertices.length,
      skinIndices: model.skin.indices.length,
      skinTriangles: model.skin.triangles.length,
      submeshes: model.skin.submeshes.length,
      batches: model.skin.batches.length,
      bbox,
    },
    textures: model.textures.map(t => ({
      index: t.index,
      type: t.type,
      flags: t.flags,
      name: t.name,
    })),
    renderFlags: model.renderFlags.map(r => ({
      index: r.index,
      flags: r.flags,
      blendingMode: r.blendingMode,
    })),
    textureLookups: Array.from(model.textureLookups),
    uv: {
      minU: Math.min(...uv.map(x => x[0])),
      maxU: Math.max(...uv.map(x => x[0])),
      minV: Math.min(...uv.map(x => x[1])),
      maxV: Math.max(...uv.map(x => x[1])),
    },
    batches: resolved.materials.map((m, i) => ({
      index: i,
      skinSectionIndex: model.skin.batches[i]?.skinSectionIndex,
      firstIndex: model.skin.batches[i]?.firstIndex,
      indexCount: model.skin.batches[i]?.indexCount,
      textureLookupIndex: m.textureLookupIndex,
      textureIndex: m.textureIndex,
      textureName: m.texture?.name ?? null,
      textureType: m.texture?.type ?? null,
      renderFlagsIndex: m.renderFlagsIndex,
      renderFlags: m.renderFlags?.flags ?? null,
      blendMode: m.blendMode,
      materialLayer: m.materialLayer,
      textureCount: m.textureCount,
      textureCoordIndex: m.textureCoordIndex,
      textureWeightIndex: m.textureWeightIndex,
      textureTransformIndex: m.textureTransformIndex,
    })),
  }, null, 2));
} catch (error) {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
}
