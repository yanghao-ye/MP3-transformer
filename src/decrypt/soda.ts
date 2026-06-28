/**
 * 汽水音乐（Soda Music / Luna Music）解密模块
 *
 * 加密格式：MP4 容器 + AES-CTR 加密
 * 密钥来源：playAuth 字符串（Base64 编码）
 * 参考项目：github.com/guohuiyuan/music-lib (soda/crypto.go)
 */

import type { DecryptResult } from './entity';
import { GetArrayBuffer, SniffAudioExt } from './utils';

// --- MP4 Box 结构 ---
interface Mp4Box {
  offset: number;
  size: number;
  data: Uint8Array;
}

// --- SENC Sample 结构 ---
interface SencSample {
  iv: Uint8Array;
  subsamples: { clear: number; encrypted: number }[];
}

// --- 常量 ---
const _MAGIC_SODA = new Uint8Array([0x6d, 0x6f, 0x6f, 0x76]); // "moov"

// --- 工具函数 ---

/**
 * 大端 32 位整数读取
 */
function readUint32BE(data: Uint8Array, offset: number): number {
  return (data[offset]! << 24) | (data[offset + 1]! << 16) | (data[offset + 2]! << 8) | data[offset + 3]!;
}

/**
 * 大端 16 位整数读取
 */
function readUint16BE(data: Uint8Array, offset: number): number {
  return (data[offset]! << 8) | data[offset + 1]!;
}

/**
 * Base36 解码
 */
function decodeBase36(c: number): number {
  if (c >= 48 && c <= 57) return c - 48; // '0'-'9'
  if (c >= 97 && c <= 122) return c - 97 + 10; // 'a'-'z'
  return 0xff;
}

/**
 * 位计数（popcount）
 */
function bitcount(n: number): number {
  let u = n >>> 0;
  u = u - ((u >>> 1) & 0x55555555);
  u = (u & 0x33333333) + ((u >>> 2) & 0x33333333);
  return (((u + (u >>> 4)) & 0xf0f0f0f) * 0x1010101) >>> 24;
}

/**
 * 解密 SPADE Inner（密钥提取核心）
 */
function decryptSpadeInner(keyBytes: Uint8Array): Uint8Array {
  const result = new Uint8Array(keyBytes.length);
  // 构造 buff: [0xFA, 0x55] + keyBytes
  const buff = new Uint8Array(2 + keyBytes.length);
  buff[0] = 0xfa;
  buff[1] = 0x55;
  buff.set(keyBytes, 2);

  for (let i = 0; i < result.length; i++) {
    let v = (keyBytes[i]! ^ buff[i]!) - bitcount(i) - 21;
    while (v < 0) v += 255;
    result[i] = v;
  }
  return result;
}

/**
 * 从 playAuth 提取 AES 密钥（hex 字符串）
 */
function extractKey(playAuth: string): string {
  // Base64 解码
  const binaryStr = atob(playAuth);
  const bytesData = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytesData[i] = binaryStr.charCodeAt(i);
  }

  if (bytesData.length < 3) throw new Error('playAuth 数据太短');

  // 计算 padding 长度
  const paddingLen = (bytesData[0]! ^ bytesData[1]! ^ bytesData[2]!) - 48;
  if (bytesData.length < paddingLen + 2) throw new Error('无效的 padding 长度');

  // 提取 inner 输入
  const innerInput = bytesData.slice(1, bytesData.length - paddingLen);
  const tmpBuff = decryptSpadeInner(innerInput);
  if (tmpBuff.length === 0) throw new Error('密钥解密失败');

  // 解析 skip bytes
  const skipBytes = decodeBase36(tmpBuff[0]!);
  const endIndex = 1 + (bytesData.length - paddingLen - 2) - skipBytes;
  if (endIndex > tmpBuff.length || endIndex < 1) throw new Error('索引越界');

  // 提取 hex 密钥
  const keyBytes = tmpBuff.slice(1, endIndex);
  return Array.from(keyBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// --- MP4 Box 解析 ---

/**
 * 查找 MP4 Box
 */
function findBox(data: Uint8Array, boxType: string, start: number, end: number): Mp4Box | null {
  if (end > data.length) end = data.length;
  let pos = start;
  const target = new TextEncoder().encode(boxType);

  while (pos + 8 <= end) {
    const size = readUint32BE(data, pos);
    if (size < 8) break;

    if (data[pos + 4] === target[0] && data[pos + 5] === target[1] && data[pos + 6] === target[2] && data[pos + 7] === target[3]) {
      return { offset: pos, size, data: data.slice(pos + 8, pos + size) };
    }
    pos += size;
  }
  return null;
}

/**
 * 递归查找 MP4 Box（支持嵌套）
 */
function findBoxDeep(data: Uint8Array, boxType: string, start: number, end: number): Mp4Box | null {
  if (end > data.length) end = data.length;
  let pos = start;
  const target = new TextEncoder().encode(boxType);

  while (pos + 8 <= end) {
    let size = readUint32BE(data, pos);
    let headerSize = 8;

    if (size === 1) {
      if (pos + 16 > end) break;
      const size64 = Number(
        (BigInt(data[pos + 8]!) << 56n) |
        (BigInt(data[pos + 9]!) << 48n) |
        (BigInt(data[pos + 10]!) << 40n) |
        (BigInt(data[pos + 11]!) << 32n) |
        (BigInt(data[pos + 12]!) << 24n) |
        (BigInt(data[pos + 13]!) << 16n) |
        (BigInt(data[pos + 14]!) << 8n) |
        BigInt(data[pos + 15]!)
      );
      if (size64 > end - pos) break;
      size = size64;
      headerSize = 16;
    }

    if (size < headerSize || pos + size > end) break;

    const currentType = String.fromCharCode(data[pos + 4]!, data[pos + 5]!, data[pos + 6]!, data[pos + 7]!);
    if (data[pos + 4] === target[0] && data[pos + 5] === target[1] && data[pos + 6] === target[2] && data[pos + 7] === target[3]) {
      return { offset: pos, size, data: data.slice(pos + headerSize, pos + size) };
    }

    // 递归进入容器 Box
    const childStart = getBoxChildStart(currentType, pos, headerSize);
    if (childStart !== null && childStart < pos + size) {
      const found = findBoxDeep(data, boxType, childStart, pos + size);
      if (found) return found;
    }

    pos += size;
  }
  return null;
}

/**
 * 获取 Box 子节点起始位置
 */
function getBoxChildStart(boxType: string, offset: number, headerSize: number): number | null {
  switch (boxType) {
    case 'moov':
    case 'trak':
    case 'mdia':
    case 'minf':
    case 'stbl':
    case 'sinf':
    case 'schi':
      return offset + headerSize;
    case 'stsd':
      return offset + headerSize + 8;
    case 'enca':
    case 'mp4a':
    case 'alac':
    case 'fLaC':
      return offset + headerSize + 28;
    default:
      return null;
  }
}

// --- SENC 解析 ---

/**
 * 解析 stsz Box（Sample Size Box）
 */
function parseStsz(data: Uint8Array): number[] {
  if (data.length < 12) return [];
  const sampleSizeFixed = readUint32BE(data, 4);
  const sampleCount = readUint32BE(data, 8);
  const sizes: number[] = [];

  if (sampleSizeFixed !== 0) {
    for (let i = 0; i < sampleCount; i++) sizes.push(sampleSizeFixed);
  } else {
    for (let i = 0; i < sampleCount; i++) {
      if (12 + i * 4 + 4 <= data.length) {
        sizes.push(readUint32BE(data, 12 + i * 4));
      }
    }
  }
  return sizes;
}

/**
 * 解析 senc Box（Sample Encryption Box）
 */
function parseSenc(data: Uint8Array, ivSize: number): SencSample[] {
  if (data.length < 8) return [];
  if (ivSize !== 8 && ivSize !== 16) ivSize = 8;

  const flags = readUint32BE(data, 0) & 0x00ffffff;
  const sampleCount = readUint32BE(data, 4);
  const samples: SencSample[] = [];
  let ptr = 8;
  const hasSubsamples = (flags & 0x02) !== 0;

  for (let i = 0; i < sampleCount; i++) {
    if (ptr + ivSize > data.length) break;

    const sample: SencSample = {
      iv: data.slice(ptr, ptr + ivSize),
      subsamples: [],
    };
    ptr += ivSize;

    if (hasSubsamples) {
      if (ptr + 2 > data.length) break;
      const subCount = readUint16BE(data, ptr);
      ptr += 2;

      if (ptr + subCount * 6 > data.length) break;

      for (let j = 0; j < subCount; j++) {
        sample.subsamples.push({
          clear: readUint16BE(data, ptr),
          encrypted: readUint32BE(data, ptr + 2),
        });
        ptr += 6;
      }
    }

    samples.push(sample);
  }
  return samples;
}

/**
 * 获取默认 per-sample IV 大小
 */
function getDefaultPerSampleIVSize(data: Uint8Array, start: number, end: number): number {
  const tenc = findBoxDeep(data, 'tenc', start, end);
  if (!tenc || tenc.data.length < 8) return 8;
  const ivSize = tenc.data[7]!;
  return ivSize === 8 || ivSize === 16 ? ivSize : 8;
}

/**
 * 解密单个 SENC Sample（AES-CTR）
 */
async function decryptSencSample(keyBytes: Uint8Array, chunk: Uint8Array, sample: SencSample): Promise<Uint8Array> {
  // 准备 IV（补零到 16 字节）
  const iv = new Uint8Array(16);
  iv.set(sample.iv.slice(0, Math.min(sample.iv.length, 16)));

  // AES-CTR 解密
  const counter = new Uint8Array(16);
  counter.set(iv);

  if (sample.subsamples.length === 0) {
    // 无子样本，整个 chunk 加密
    return aesCtrDecrypt(keyBytes, counter, chunk);
  }

  // 有子样本，按 clear/encrypted 分段处理
  const dst = new Uint8Array(chunk.length);
  let pos = 0;

  for (const sub of sample.subsamples) {
    // 复制 clear 字节
    const clearBytes = Math.min(sub.clear, chunk.length - pos);
    dst.set(chunk.slice(pos, pos + clearBytes), pos);
    pos += clearBytes;
    if (pos >= chunk.length) break;

    // 解密 encrypted 字节
    const encryptedBytes = Math.min(sub.encrypted, chunk.length - pos);
    const decrypted = await aesCtrDecrypt(keyBytes, counter, chunk.slice(pos, pos + encryptedBytes));
    dst.set(decrypted, pos);
    pos += encryptedBytes;
    if (pos >= chunk.length) break;
  }

  // 剩余未处理字节原样复制
  if (pos < chunk.length) {
    dst.set(chunk.slice(pos), pos);
  }

  return dst;
}

/**
 * AES-CTR 解密（使用 Web Crypto API）
 */
async function aesCtrDecrypt(key: Uint8Array, counter: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  // 导入密钥
  const keyBuffer = key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-CTR' }, false, ['decrypt']);

  // 使用 AES-CTR 解密
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CTR', counter: counter.buffer.slice(counter.byteOffset, counter.byteOffset + counter.byteLength) as ArrayBuffer, length: 128 },
    cryptoKey,
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  );

  return new Uint8Array(decrypted);
}

// --- 主解密函数 ---

/**
 * 检测是否为汽水音乐格式
 */
export function isSodaFormat(data: Uint8Array): boolean {
  // 检查是否为 MP4 容器（moov box）
  if (data.length < 8) return false;

  // 查找 moov box
  let pos = 0;
  while (pos + 8 <= data.length) {
    const size = readUint32BE(data, pos);
    if (size < 8) break;
    if (data[pos + 4] === 0x6d && data[pos + 5] === 0x6f && data[pos + 6] === 0x6f && data[pos + 7] === 0x76) {
      // 找到 moov，检查是否有 senc box（加密标志）
      const moov = findBoxDeep(data, 'moov', pos, data.length);
      if (moov) {
        const senc = findBoxDeep(data, 'senc', moov.offset + 8, moov.offset + moov.size);
        if (senc) return true;
        // 也检查 stbl 内部
        const stbl = findBoxDeep(data, 'stbl', moov.offset + 8, moov.offset + moov.size);
        if (stbl) {
          const sencInStbl = findBox(data, 'senc', stbl.offset + 8, stbl.offset + stbl.size);
          if (sencInStbl) return true;
        }
      }
      break;
    }
    pos += size;
  }
  return false;
}

/**
 * 汽水音乐解密主函数
 *
 * @param file 加密的音频文件
 * @param playAuth 播放认证字符串（Base64 编码）
 * @returns 解密后的音频数据
 */
export async function Decrypt(file: File, playAuth: string): Promise<DecryptResult> {
  // 读取文件数据
  const arrayBuffer = await GetArrayBuffer(file);
  const fileData = new Uint8Array(arrayBuffer);

  // 提取 AES 密钥
  const hexKey = extractKey(playAuth);
  const keyBytes = new Uint8Array(hexKey.match(/.{2}/g)!.map((hex) => parseInt(hex, 16)));

  // 查找 MP4 Box
  const moov = findBoxDeep(fileData, 'moov', 0, fileData.length);
  if (!moov) throw new Error('未找到 moov box');

  // 查找 stbl（Sample Table Box）
  let stbl = findBoxDeep(fileData, 'stbl', moov.offset + 8, moov.offset + moov.size);
  if (!stbl) {
    // 尝试更深层查找
    const trak = findBoxDeep(fileData, 'trak', moov.offset + 8, moov.offset + moov.size);
    if (trak) {
      const mdia = findBoxDeep(fileData, 'mdia', trak.offset + 8, trak.offset + trak.size);
      if (mdia) {
        const minf = findBoxDeep(fileData, 'minf', mdia.offset + 8, mdia.offset + mdia.size);
        if (minf) {
          stbl = findBoxDeep(fileData, 'stbl', minf.offset + 8, minf.offset + minf.size);
        }
      }
    }
  }
  if (!stbl) throw new Error('未找到 stbl box');

  // 解析 stsz（Sample Size Box）
  const stsz = findBox(fileData, 'stsz', stbl.offset + 8, stbl.offset + stbl.size);
  if (!stsz) throw new Error('未找到 stsz box');
  const sampleSizes = parseStsz(stsz.data);

  // 查找 senc（Sample Encryption Box）
  let senc = findBoxDeep(fileData, 'senc', moov.offset + 8, moov.offset + moov.size);
  if (!senc) {
    senc = findBox(fileData, 'senc', stbl.offset + 8, stbl.offset + stbl.size);
  }
  if (!senc) throw new Error('未找到 senc box');

  // 获取 IV 大小
  const ivSize = getDefaultPerSampleIVSize(fileData, stbl.offset, stbl.offset + stbl.size);

  // 解析 senc samples
  const sencSamples = parseSenc(senc.data, ivSize);

  // 查找 mdat（Media Data Box）
  const mdat = findBox(fileData, 'mdat', 0, fileData.length);
  if (!mdat) throw new Error('未找到 mdat box');

  // 解密 mdat 数据
  const decryptedMdat: number[] = [];
  let readPtr = mdat.offset + 8;

  for (let i = 0; i < sampleSizes.length; i++) {
    const size = sampleSizes[i]!;
    if (readPtr + size > fileData.length) break;

    const chunk = fileData.slice(readPtr, readPtr + size);

    if (i < sencSamples.length) {
      const decrypted = await decryptSencSample(keyBytes, chunk, sencSamples[i]!);
      for (const b of decrypted) decryptedMdat.push(b);
    } else {
      for (const b of chunk) decryptedMdat.push(b);
    }
    readPtr += size;
  }

  // 组装解密后的文件
  const decryptedData = new Uint8Array(fileData.length);
  decryptedData.set(fileData);
  decryptedData.set(new Uint8Array(decryptedMdat), mdat.offset + 8);

  // 修复 stsd box 中的 enca -> mp4a
  const stsd = findBox(fileData, 'stsd', stbl.offset + 8, stbl.offset + stbl.size);
  if (stsd) {
    const stsdData = decryptedData.slice(stsd.offset, stsd.offset + stsd.size);
    const encaIdx = findSubarray(stsdData, new TextEncoder().encode('enca'));
    if (encaIdx !== -1) {
      // 查找 frma 获取原始格式
      const frmaIdx = findSubarray(stsdData, new TextEncoder().encode('frma'));
      if (frmaIdx >= 4 && frmaIdx + 8 <= stsdData.length) {
        const size = readUint32BE(stsdData, frmaIdx - 4);
        if (size >= 12 && frmaIdx - 4 + size <= stsdData.length) {
          const originalFormat = stsdData.slice(frmaIdx + 4, frmaIdx + 8);
          stsdData.set(originalFormat, encaIdx);
        }
      }
    }
  }

  // 检测实际音频格式
  const ext = SniffAudioExt(decryptedData);
  const mime = `audio/${ext === 'm4a' ? 'mp4' : ext}`;

  return {
    title: file.name.replace(/\.[^.]+$/, ''),
    ext,
    mime,
    file: URL.createObjectURL(new Blob([decryptedData], { type: mime })),
    blob: new Blob([decryptedData], { type: mime }),
  };
}

/**
 * 查找子数组在主数组中的位置
 */
function findSubarray(haystack: Uint8Array, needle: Uint8Array): number {
  if (needle.length === 0) return 0;
  if (needle.length > haystack.length) return -1;

  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}
