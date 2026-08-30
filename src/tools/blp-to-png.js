import fs from 'node:fs/promises';
import path from 'node:path';
import { BlpLegacyLoader, rgbaToPng } from '../loaders/BlpLegacyLoader.js';

const input=process.argv[2], output=process.argv[3] ?? `${input}.png`;
if(!input){console.error('Usage: node src/tools/blp-to-png.js <input.blp> [output.png]');process.exit(2);}
const image=await new BlpLegacyLoader().load(input);
await fs.mkdir(path.dirname(path.resolve(output)),{recursive:true});
await fs.writeFile(output,rgbaToPng(image.width,image.height,image.pixels));
console.log(JSON.stringify({input,output,width:image.width,height:image.height,compression:image.compression,alphaDepth:image.alphaDepth},null,2));
