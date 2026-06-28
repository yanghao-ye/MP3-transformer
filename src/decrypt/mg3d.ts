/**
 * MG3D (咪咕音乐) 解密模块
 *
 * 加密方式：XOR + 固定密钥
 * 支持格式：.mg3d
 * 输出格式：MP3 / FLAC / OGG
 */

import type { DecryptResult } from './entity';
import { AudioMimeType, GetArrayBuffer, SplitFilename, SniffAudioExt } from './utils';

// MG3D 文件头魔术字节
const MG3D_MAGIC = new Uint8Array([0x4D, 0x47, 0x33, 0x44]); // "MG3D"

// 固定 XOR 密钥（从咪咕客户端逆向得出）
const MG3D_KEY: number[] = [
  0x67, 0x51, 0x32, 0x77, 0x48, 0x32, 0x73, 0x51,
  0x65, 0x53, 0x68, 0x56, 0x34, 0x71, 0x42, 0x6B,
  0x6D, 0x2D, 0x43, 0x36, 0x6E, 0x6F, 0x6A, 0x42,
  0x52, 0x68, 0x65, 0x71, 0x69, 0x63, 0x33, 0x50,
];

/**
 * 检查文件是否为 MG3D 格式
 */
function isMg3dFile(data: Uint8Array): boolean {
  if (data.length < 4) return false;
  return data[0] === MG3D_MAGIC[0] &&
    data[1] === MG3D_MAGIC[1] &&
    data[2] === MG3D_MAGIC[2] &&
    data[3] === MG3D_MAGIC[3];
}

/**
 * 从文件头提取密钥种子
 */
function extractSeed(data: Uint8Array): number {
  // MG3D 文件头结构：4 字节魔术 + 4 字节种子
  if (data.length < 8) return 0;
  return data[4]! | (data[5]! << 8) | (data[6]! << 16) | (data[7]! << 24);
}

/**
 * 查找音频数据起始位置
 */
function findAudioStart(data: Uint8Array): number {
  // 查找 OGG 魔术字节 "OggS"
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === 0x4F && data[i + 1] === 0x67 && data[i + 2] === 0x67 && data[i + 3] === 0x53) {
      return i;
    }
  }

  // 查找 FLAC 魔术字节 "fLaC"
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === 0x66 && data[i + 1] === 0x4C && data[i + 2] === 0x61 && data[i + 3] === 0x43) {
      return i;
    }
  }

  // 查找 MP3 帧同步字节
  for (let i = 0; i < data.length - 4; i++) {
    if (data[i] === 0xFF && (data[i + 1]! & 0xE0) === 0xE0) {
      return i;
    }
  }

  // 默认跳过前 1024 字节
  return 1024;
}

/**
 * MG3D 解密主函数
 */
export async function Decrypt(
  file: Blob,
  raw_filename: string,
  raw_ext: string,
): Promise<DecryptResult> {
  const raw = await GetArrayBuffer(file);
  const data = new Uint8Array(raw);

  // 验证文件格式
  if (!isMg3dFile(data)) {
    throw new Error('无效的 MG3D 文件格式');
  }

  // 提取密钥种子
  const seed = extractSeed(data);

  // 查找音频数据起始位置
  const audioStart = findAudioStart(data);

  // 提取音频数据
  const audioData = data.slice(audioStart);

  // XOR 解密
  const decrypted = new Uint8Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    const keyIndex = ((i + seed) & 0xFFFFFFFF) % MG3D_KEY.length;
    decrypted[i] = audioData[i]! ^ MG3D_KEY[keyIndex]!;
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
