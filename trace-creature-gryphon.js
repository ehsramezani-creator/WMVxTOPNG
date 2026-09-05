import path from "node:path";
import { M2LegacyLoader } from "./src/loaders/M2LegacyLoader.js";
import { CreatureTextureResolver } from "./src/loaders/CreatureTextureResolver.js";
import { CreatureDisplayInfoDBC } from "./src/loaders/CreatureDisplayInfoDBC.js";
import { CreatureModelDataDBC } from "./src/loaders/CreatureModelDataDBC.js";

const root = path.resolve(".\\ModelsTree");

const files = new Map();

async function collect(dir) {
  const fs = await import("node:fs/promises");

  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);

    if (e.isDirectory()) {
      await collect(full);
    } else {
      files.set(
        path.relative(root, full).replaceAll("\\", "/").toLowerCase(),
        full
      );
    }
  }
}

await collect(root);

const m2Path = path.resolve(
  ".\\ModelsTree\\Creature\\GryphonPet\\GryphonPet.M2"
);

const displayInfoPath = path.resolve(
  ".\\ModelsTree\\dbc\\CreatureDisplayInfo.dbc"
);

const modelDataPath = path.resolve(
  ".\\ModelsTree\\dbc\\CreatureModelData.dbc"
);

const displayInfoDBC =
  await CreatureDisplayInfoDBC.load(displayInfoPath);

const modelDataDBC =
  await CreatureModelDataDBC.load(modelDataPath);

const m2 = await new M2LegacyLoader().load(m2Path);

const resolver = new CreatureTextureResolver({
  files,
  displayInfoDBC,
  modelDataDBC
});

console.log("===== resolver fields =====");
console.log({
  displayInfoDBC: resolver.displayInfoDBC?.constructor?.name,
  modelDataDBC: resolver.modelDataDBC?.constructor?.name,
  displayRecords: resolver.displayInfoDBC?.records?.length,
  modelRecords: resolver.modelDataDBC?.records?.length
});

console.log("\n===== RESOLVE =====");

const result = await resolver.resolve(m2);

console.log(JSON.stringify(result, null, 2));

console.log("\n===== OVERRIDES =====");

console.log(JSON.stringify(
  resolver.resolveTextureOverrides(m2, result),
  null,
  2
));
