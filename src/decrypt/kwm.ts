/**
 * KWM (酷我音乐) 解密模块
 *
 * 加密方式：XOR 掩码，密钥从文件头派生
 * 支持格式：.kwm
 * 输出格式：MP3 / FLAC
 *
 * 算法来源：unlock-music 项目
 */

import type { DecryptResult } from './entity';
import { AudioMimeType, GetArrayBuffer, SplitFilename, SniffAudioExt } from './utils';

// KWM 文件头魔术字节
const KWM_MAGIC = new Uint8Array([0x7B, 0x11, 0x50, 0x26]); // "{.P&"
const KWM_MAGIC2 = new Uint8Array([0x7B, 0x18, 0x02, 0x04]); // 备用魔术

// 预定义字符串，用于从密钥创建掩码
const MASK_SEED = 'yeelink';

/**
 * 检查文件是否为 KWM 格式
 */
function isKwmFile(data: Uint8Array): boolean {
  if (data.length < 4) return false;
  // 检查两种可能的魔术字节
  const match1 = data[0] === KWM_MAGIC[0] &&
    data[1] === KWM_MAGIC[1] &&
    data[2] === KWM_MAGIC[2] &&
    data[3] === KWM_MAGIC[3];
  const match2 = data[0] === KWM_MAGIC2[0] &&
    data[1] === KWM_MAGIC2[1] &&
    data[2] === KWM_MAGIC2[2] &&
    data[3] === KWM_MAGIC2[3];
  return match1 || match2;
}

/**
 * 从文件头提取密钥（字节 0x18-0x20）
 */
function extractKey(data: Uint8Array): Uint8Array {
  const key = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    key[i] = data[0x18 + i]!;
  }
  return key;
}

/**
 * 从密钥创建 XOR 掩码
 */
function createMask(key: Uint8Array): Uint8Array {
  const mask = new Uint8Array(256);
  const seedBytes = new TextEncoder().encode(MASK_SEED);

  // 使用密钥和种子生成掩码
  for (let i = 0; i < 256; i++) {
    const keyByte = key[i % key.length]!;
    const seedByte = seedBytes[i % seedBytes.length]!;
    mask[i] = (keyByte ^ seedByte) & 0xFF;
  }

  return mask;
}

/**
 * KWM 解密主函数
 */
export async function Decrypt(
  file: Blob,
  raw_filename: string,
  raw_ext: string,
): Promise<DecryptResult> {
  const raw = await GetArrayBuffer(file);
  const data = new Uint8Array(raw);

  // 验证文件格式
  if (!isKwmFile(data)) {
    throw new Error('无效的 KWM 文件格式');
  }

  // 提取密钥（字节 0x18-0x20）
  const key = extractKey(data);

  // 创建 XOR 掩码
  const mask = createMask(key);

  // 音频数据从偏移量 0x400（1024 字节）开始
  const audioOffset = 0x400;
  const audioData = data.slice(audioOffset);

  // XOR 解密（循环使用掩码）
  const decrypted = new Uint8Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    const maskIndex = i % mask.length;
    decrypted[i] = audioData[i]! ^ mask[maskIndex]!;
  }

  // 检测输出格式
  const ext = SniffAudioExt(decrypted, 'mp3');
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
