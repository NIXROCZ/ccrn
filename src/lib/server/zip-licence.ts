type RangeBody = { body: ReadableStream<Uint8Array> | null };
type R2Like = { size: number; body: ReadableStream<Uint8Array> | null };
type R2BucketLike = { get(key: string, options?: { range?: { offset: number; length: number } }): Promise<R2Like | RangeBody | null> };

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
const textEncoder = new TextEncoder();

function u16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function put16(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function put32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function bytesFrom(body: ReadableStream<Uint8Array> | null): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    chunks.push(next.value);
    total += next.value.byteLength;
  }
  const result = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { result.set(chunk, offset); offset += chunk.byteLength; });
  return result;
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  chunks.forEach((chunk) => { result.set(chunk, offset); offset += chunk.length; });
  return result;
}

async function range(bucket: R2BucketLike, key: string, offset: number, length: number): Promise<Uint8Array> {
  const object = await bucket.get(key, { range: { offset, length } });
  return bytesFrom(object?.body ?? null);
}

function streamBytes(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } });
}

export async function appendLicence(bucket: R2BucketLike, key: string, licence: string): Promise<{ body: ReadableStream<Uint8Array>; size: number; zip64: boolean }> {
  const object = await bucket.get(key);
  if (!object?.body || !('size' in object)) throw new Error('Kit archive not found');
  const tailLength = Math.min(object.size, 65557);
  const tail = await range(bucket, key, object.size - tailLength, tailLength);
  let eocdOffset = -1;
  for (let index = tail.length - 22; index >= 0; index--) {
    if (u32(tail, index) === EOCD) { eocdOffset = index; break; }
  }
  if (eocdOffset < 0) throw new Error('Invalid ZIP archive');
  const eocd = tail.slice(eocdOffset, eocdOffset + 22);
  const count = u16(eocd, 10);
  const centralSize = u32(eocd, 12);
  const centralOffset = u32(eocd, 16);
  const zip64 = count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff || u32(tail, eocdOffset - 20) === 0x06064b50;
  if (zip64) return { body: object.body, size: object.size, zip64: true };
  const central = await range(bucket, key, centralOffset, centralSize);
  const licenceBytes = textEncoder.encode(licence);
  const licenceName = textEncoder.encode('LICENCE.txt');
  const local = new Uint8Array(30 + licenceName.length);
  put32(local, 0, LOCAL); put16(local, 4, 20); put16(local, 8, 0); put16(local, 10, 0);
  put32(local, 14, crc32(licenceBytes)); put32(local, 18, licenceBytes.length); put32(local, 22, licenceBytes.length);
  put16(local, 26, licenceName.length); put16(local, 28, 0); local.set(licenceName, 30);
  const centralEntry = new Uint8Array(46 + licenceName.length);
  put32(centralEntry, 0, CENTRAL); put16(centralEntry, 4, 20); put16(centralEntry, 6, 20); put16(centralEntry, 8, 0); put16(centralEntry, 10, 0);
  put32(centralEntry, 16, crc32(licenceBytes)); put32(centralEntry, 20, licenceBytes.length); put32(centralEntry, 24, licenceBytes.length);
  put16(centralEntry, 28, licenceName.length); put16(centralEntry, 30, 0); put16(centralEntry, 32, 0); put16(centralEntry, 34, 0); put16(centralEntry, 36, 0); put32(centralEntry, 38, 0); put32(centralEntry, 42, centralOffset); centralEntry.set(licenceName, 46);
  const newEocd = eocd.slice();
  put16(newEocd, 8, count + 1); put16(newEocd, 10, count + 1); put32(newEocd, 12, centralSize + centralEntry.length); put32(newEocd, 16, centralOffset + local.length + licenceBytes.length);
  const prefix = await range(bucket, key, 0, centralOffset);
  const output = concat(prefix, local, licenceBytes, central, centralEntry, newEocd);
  return { body: streamBytes(output), size: output.length, zip64: false };
}
