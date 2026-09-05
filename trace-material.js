import { M2LegacyLoader } from "./src/loaders/M2LegacyLoader.js";
import { MaterialResolver } from "./src/loaders/MaterialResolver.js";

const file = ".\\ModelsTree\\Creature\\ALLIANCERIDER\\AllianceRider.m2";

const m2 = await new M2LegacyLoader().load(file);
const result = new MaterialResolver().resolve(m2, m2.skin);

console.log("\n===== AllianceRider M2 =====");
console.log("M2:", m2.filePath);
console.log("name:", m2.name);

console.log("\n===== M2 Textures =====");
console.log(JSON.stringify(m2.textures, null, 2));

console.log("\n===== Texture Lookups =====");
console.log(Array.from(m2.textureLookups));

console.log("\n===== SKIN Batches =====");
console.log(JSON.stringify(m2.skin.batches, null, 2));

console.log("\n===== Resolved Materials =====");
console.log(JSON.stringify(result.materials, null, 2));
