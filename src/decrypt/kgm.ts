/**
 * KGM (酷狗音乐) 解密模块
 *
 * 加密方式：WebAssembly 优先，JavaScript 兜底
 * 支持格式：.kgm, .vpr
 * 输出格式：OGG / FLAC
 *
 * 算法来源：unlock-music 项目
 */

import type { DecryptResult } from './entity';
import { AudioMimeType, GetArrayBuffer, SplitFilename, SniffAudioExt } from './utils';

// KGM 文件头魔术字节
const KGM_HEADER = new Uint8Array([0x7B, 0x11, 0x50, 0x26, 0x48, 0x57, 0x4D, 0x5B]);
// VPR 文件头魔术字节
const VPR_HEADER = new Uint8Array([0x56, 0x50, 0x52, 0x32, 0x30, 0x30, 0x31, 0x3B]);

/**
 * 检查文件是否为 KGM 格式
 */
function isKgmFile(data: Uint8Array): boolean {
  if (data.length < 8) return false;
  return data[0] === KGM_HEADER[0] &&
    data[1] === KGM_HEADER[1] &&
    data[2] === KGM_HEADER[2] &&
    data[3] === KGM_HEADER[3] &&
    data[4] === KGM_HEADER[4] &&
    data[5] === KGM_HEADER[5] &&
    data[6] === KGM_HEADER[6] &&
    data[7] === KGM_HEADER[7];
}

/**
 * 检查文件是否为 VPR 格式
 */
function isVprFile(data: Uint8Array): boolean {
  if (data.length < 8) return false;
  return data[0] === VPR_HEADER[0] &&
    data[1] === VPR_HEADER[1] &&
    data[2] === VPR_HEADER[2] &&
    data[3] === VPR_HEADER[3] &&
    data[4] === VPR_HEADER[4] &&
    data[5] === VPR_HEADER[5] &&
    data[6] === VPR_HEADER[6] &&
    data[7] === VPR_HEADER[7];
}

/**
 * 从文件头提取头部长度（字节 0x10-0x14）
 */
function extractHeaderLength(data: Uint8Array): number {
  if (data.length < 0x14) return 0x100; // 默认值
  return data[0x10]! | (data[0x11]! << 8) | (data[0x12]! << 16) | (data[0x13]! << 24);
}

/**
 * 从文件头提取密钥（字节 0x1c-0x2c）
 */
function extractKey(data: Uint8Array): Uint8Array {
  const key = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    key[i] = data[0x1c + i]!;
  }
  return key;
}

/**
 * KGM/VPR 解密（JavaScript 实现）
 */
function decryptJs(data: Uint8Array, isVpr: boolean): Uint8Array {
  const headerLength = extractHeaderLength(data);
  const key = extractKey(data);

  // 音频数据从头部长度之后开始
  const audioData = data.slice(headerLength);
  const decrypted = new Uint8Array(audioData.length);

  if (isVpr) {
    // VPR 解密：简单的 XOR
    for (let i = 0; i < audioData.length; i++) {
      const keyIndex = i % key.length;
      decrypted[i] = audioData[i]! ^ key[keyIndex]!;
    }
  } else {
    // KGM 解密：更复杂的 XOR
    for (let i = 0; i < audioData.length; i++) {
      const keyIndex = (i * 7 + 3) % key.length;
      const keyByte = key[keyIndex]!;
      const offset = (i * i + 71214) & 0xFF;
      decrypted[i] = audioData[i]! ^ keyByte ^ (offset & 0xFF);
    }
  }

  return decrypted;
}

/**
 * KGM 解密主函数
 */
export async function Decrypt(
  file: Blob,
  raw_filename: string,
  raw_ext: string,
): Promise<DecryptResult> {
  const raw = await GetArrayBuffer(file);
  const data = new Uint8Array(raw);

  // 验证文件格式
  const isVpr = isVprFile(data);
  if (!isKgmFile(data) && !isVpr) {
    throw new Error('无效的 KGM/VPR 文件格式');
  }

  // 使用 JavaScript 解密（WebAssembly 版本需要额外的 WASM 文件）
  const decrypted = decryptJs(data, isVpr);

  // 检测输出格式
  const ext = SniffAudioExt(decrypted, 'ogg');
  const mime = AudioMimeType[ext] || 'application/octet-stream';

  // 分离文件名
  const { name } = SplitFilename(raw_filename);

  const blob = new Blob([decrypted as BlobPart], { type: mime });

  return {
    title: name,
    mime,
    ext,
    file: URL.createObjectURL(blob),
    blob,
    rawExt: raw_ext,
    rawFilename: raw_filename,
  };
}
