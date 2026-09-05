#!/usr/bin/env node
import { M2LegacyLoader } from '../loaders/M2LegacyLoader.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node src/tools/inspect-m2.js <model.m2>');
  process.exit(2);
}

try {
  const loader = new M2LegacyLoader();
  const model = await loader.load(file);
  console.log(JSON.stringify({
    file: model.filePath,
    name: model.name,
    version: model.version,
    skinProfiles: model.nViews,
    skin: model.skin ? {
      file: model.skin.source,
      profileIndex: model.skin.profileIndex,
      indices: model.skin.indices.length,
      triangles: model.skin.triangles.length,
      submeshes: model.skin.submeshes.length,
      batches: model.skin.batches.length
    } : null
  }, null, 2));
} catch (error) {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
}
