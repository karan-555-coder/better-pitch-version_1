// Minimal PNG decode/encode (8-bit RGB/RGBA, non-interlaced - what Chrome
// screenshots produce) using only zlib, so compare.js needs no image library.
const zlib = require('zlib');

function decode(input) {
  const buf = Buffer.from(input.buffer, input.byteOffset, input.byteLength); // puppeteer returns a Uint8Array
  let pos = 8, width, height, channels;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error('unsupported PNG (bit depth / interlace)');
      channels = { 2: 3, 6: 4 }[data[9]];
      if (!channels) throw new Error('unsupported PNG color type ' + data[9]);
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels, px = Buffer.alloc(width * height * 4), prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0, b = prev[x], c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      px[o] = cur[x * channels]; px[o + 1] = cur[x * channels + 1]; px[o + 2] = cur[x * channels + 2]; px[o + 3] = channels === 4 ? cur[x * channels + 3] : 255;
    }
    cur.copy(prev);
  }
  return { width, height, data: px };
}

const CRC = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
function chunk(type, data) {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
  let c = 0xffffffff; for (const b of Buffer.concat([head.subarray(4), data])) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  const tail = Buffer.alloc(4); tail.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
  return Buffer.concat([head, data, tail]);
}

function encode({ width, height, data }) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = { decode, encode };
