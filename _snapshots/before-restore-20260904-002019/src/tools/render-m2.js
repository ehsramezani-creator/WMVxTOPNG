import fs from 'node:fs/promises';
import { M2LegacyLoader } from '../loaders/M2LegacyLoader.js';
import { ModelAssembler } from '../loaders/ModelAssembler.js';
import { SoftwareRenderer } from '../render/SoftwareRenderer.js';
import { encodeRGBA } from '../render/PNGEncoder.js';

const [m2Path, outputPath = 'model.png', widthArg = '512', heightArg = widthArg] = process.argv.slice(2);
if (!m2Path) throw new Error('Usage: node src/tools/render-m2.js <model.m2> [output.png] [width] [height]');

const loader = new M2LegacyLoader();
const model = await loader.load(m2Path);
const assembled = new ModelAssembler().assemble(model);
const renderer = new SoftwareRenderer({ width: Number(widthArg), height: Number(heightArg) });
const image = renderer.render(assembled);
await fs.writeFile(outputPath, encodeRGBA(image.width, image.height, image.pixels));
console.log(JSON.stringify({ model: model.name, vertices: model.vertices.length, triangles: assembled.indices.length / 3, output: outputPath, width: image.width, height: image.height }, null, 2));
