import fs from 'node:fs/promises';
import zlib from 'node:zlib';

function rgb565(v) {
  return [((v >> 11) & 31) * 255 / 31, ((v >> 5) & 63) * 255 / 63, (v & 31) * 255 / 31];
}

function decode565Block(data, offset, alphaMode) {
  const c0 = data.readUInt16LE(offset);
  const c1 = data.readUInt16LE(offset + 2);
  const a = rgb565(c0), b = rgb565(c1);
  const colors = [
    [...a, 255], [...b, 255],
    [0, 0, 0, 255], [0, 0, 0, 255],
  ];
  if (c0 > c1 || alphaMode === 'dxt5') {
    for (let k = 0; k < 3; k++) colors[2][k] = (2 * a[k] + b[k]) / 3;
    for (let k = 0; k < 3; k++) colors[3][k] = (a[k] + 2 * b[k]) / 3;
  } else {
    for (let k = 0; k < 3; k++) colors[2][k] = (a[k] + b[k]) / 2;
    colors[3] = [0, 0, 0, 0];
  }
  const bits = data.readUInt32LE(offset + 4);
  return { colors, bits };
}

function decodeDxt1(data, width, height, alpha) {
  const out = Buffer.alloc(width * height * 4);
  const bw = Math.ceil(width / 4), bh = Math.ceil(height / 4);
  let p = 0;
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    const { colors, bits } = decode565Block(data, p, 'dxt1'); p += 8;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const i = ((by * 4 + y) * width + bx * 4 + x);
      if (i >= width * height) continue;
      const c = colors[(bits >> (2 * (y * 4 + x))) & 3];
      out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = alpha && c[3] === 0 ? 0 : 255;
    }
  }
  return out;
}

function decodeDxt3(data, width, height) {
  const out = Buffer.alloc(width * height * 4), bw = Math.ceil(width / 4), bh = Math.ceil(height / 4);
  let p = 0;
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    const alpha = data.subarray(p, p + 8); const { colors, bits } = decode565Block(data, p + 8, 'dxt3'); p += 16;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const i = ((by * 4 + y) * width + bx * 4 + x); if (i >= width * height) continue;
      const n = y * 4 + x, c = colors[(bits >> (2 * n)) & 3];
      out[i*4]=c[0]; out[i*4+1]=c[1]; out[i*4+2]=c[2]; out[i*4+3]=((alpha[n >> 1] >> ((n & 1)*4)) & 15) * 17;
    }
  }
  return out;
}

function decodeDxt5(data, width, height) {
  const out = Buffer.alloc(width * height * 4), bw = Math.ceil(width / 4), bh = Math.ceil(height / 4);
  let p = 0;
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    const a0=data[p], a1=data[p+1], alphaBits=data.subarray(p+2,p+8); const alpha=[];
    alpha[0]=a0; alpha[1]=a1;
    if (a0>a1) for(let i=1;i<7;i++) alpha[i+1]=((7-i)*a0+i*a1)/7;
    else { for(let i=1;i<5;i++) alpha[i+1]=((5-i)*a0+i*a1)/5; alpha[6]=0; alpha[7]=255; }
    let ab=0n; for(let i=0;i<6;i++) ab |= BigInt(alphaBits[i]) << BigInt(8*i);
    const { colors, bits }=decode565Block(data,p+8,'dxt5'); p+=16;
    for(let y=0;y<4;y++) for(let x=0;x<4;x++) { const i=((by*4+y)*width+bx*4+x); if(i>=width*height) continue; const n=y*4+x,c=colors[(bits>>(2*n))&3],ai=Number((ab>>BigInt(3*n))&7n); out[i*4]=c[0];out[i*4+1]=c[1];out[i*4+2]=c[2];out[i*4+3]=alpha[ai]; }
  }
  return out;
}

function decodePalette(data, width, height, alphaDepth) {
  const palette = data.subarray(148, 148 + 1024), mip = data.subarray(1172), out = Buffer.alloc(width * height * 4);
  for (let i=0;i<width*height;i++) { const idx=mip[i], po=idx*4; out[i*4]=palette[po+2];out[i*4+1]=palette[po+1];out[i*4+2]=palette[po];out[i*4+3]=alphaDepth===0?255:(alphaDepth===8?mip[width*height+i]:255); }
  return out;
}

export class BlpLegacyLoader {
  parse(buffer) {
    if (!Buffer.isBuffer(buffer)) buffer=Buffer.from(buffer);
    if (buffer.toString('ascii',0,4)!=='BLP2') throw new Error('Only BLP2 is supported');
    const compression=buffer[8], alphaDepth=buffer[10], width=buffer.readUInt32LE(12), height=buffer.readUInt32LE(16);
    const offsets=Array.from({length:16},(_,i)=>buffer.readUInt32LE(20+i*4));
    const sizes=Array.from({length:16},(_,i)=>buffer.readUInt32LE(84+i*4));
    const level=buffer.subarray(offsets[0],offsets[0]+sizes[0]);
    let pixels;
    if(compression===2) pixels=alphaDepth>=8?decodeDxt5(level,width,height):alphaDepth>=4?decodeDxt3(level,width,height):decodeDxt1(level,width,height,alphaDepth===1);
    else if(compression===3) pixels=decodePalette(buffer,width,height,alphaDepth);
    else throw new Error(`Unsupported BLP2 compression ${compression}`);
    return {width,height,compression,alphaDepth,mipmapCount:16,pixels};
  }
  async load(filePath){ return this.parse(await fs.readFile(filePath)); }
}

function chunk(type,data){ const t=Buffer.from(type), body=Buffer.concat([t,data]); let crc=0xffffffff; for(const b of body){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);} crc=(crc^0xffffffff)>>>0; const out=Buffer.alloc(12+data.length); out.writeUInt32BE(data.length,0); t.copy(out,4); data.copy(out,8); out.writeUInt32BE(crc,8+data.length); return out; }
export function rgbaToPng(width,height,pixels){ const raw=Buffer.alloc((width*4+1)*height); for(let y=0;y<height;y++){raw[y*(width*4+1)]=0;pixels.copy(raw,y*(width*4+1)+1,y*width*4,(y+1)*width*4);} const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6; return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]); }

export default BlpLegacyLoader;
