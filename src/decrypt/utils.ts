/**
 * 解密工具函数
 * 简化版：移除 metadata 写入相关函数，只保留解密所需的核心工具
 */

export const split_regex = /[ ]?[,;/_、][ ]?/;

export const FLAC_HEADER = [0x66, 0x4c, 0x61, 0x43];
export const MP3_HEADER = [0x49, 0x44, 0x33];
export const OGG_HEADER = [0x4f, 0x67, 0x67, 0x53];
export const M4A_HEADER = [0x66, 0x74, 0x79, 0x70];
export const WMA_HEADER = [
  0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11,
  0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c,
];
export const WAV_HEADER = [0x52, 0x49, 0x46, 0x46];
export const AAC_HEADER = [0xff, 0xf1];
export const DFF_HEADER = [0x46, 0x52, 0x4d, 0x38];

export const AudioMimeType: { [key: string]: string } = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wma: 'audio/x-ms-wma',
  wav: 'audio/x-wav',
  dff: 'audio/x-dff',
};

export function BytesHasPrefix(data: Uint8Array, prefix: number[]): boolean {
  if (prefix.length > data.length) return false;
  return prefix.every((val, idx) => val === data[idx]);
}

export function BytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

export function SniffAudioExt(data: Uint8Array, fallback_ext: string = 'mp3'): string {
  if (BytesHasPrefix(data, MP3_HEADER)) return 'mp3';
  if (BytesHasPrefix(data, FLAC_HEADER)) return 'flac';
  if (BytesHasPrefix(data, OGG_HEADER)) return 'ogg';
  if (data.length >= 4 + M4A_HEADER.length && BytesHasPrefix(data.slice(4), M4A_HEADER)) return 'm4a';
  if (BytesHasPrefix(data, WAV_HEADER)) return 'wav';
  if (BytesHasPrefix(data, WMA_HEADER)) return 'wma';
  if (BytesHasPrefix(data, AAC_HEADER)) return 'aac';
  if (BytesHasPrefix(data, DFF_HEADER)) return 'dff';
  return fallback_ext;
}

export function GetArrayBuffer(obj: Blob): Promise<ArrayBuffer> {
  if (obj.arrayBuffer) return obj.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rs = e.target?.result;
      if (!rs) {
        reject('read file failed');
      } else {
        resolve(rs as ArrayBuffer);
      }
    };
    reader.readAsArrayBuffer(obj);
  });
}

export function SplitFilename(n: string): { name: string; ext: string } {
  const pos = n.lastIndexOf('.');
  return {
    ext: n.substring(pos + 1).toLowerCase(),
    name: n.substring(0, pos),
  };
}
