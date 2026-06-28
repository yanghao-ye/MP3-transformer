import type { DecryptResult, FileInfo } from './entity';
import { SplitFilename, AudioMimeType } from './utils';

// --- 解密函数导入 ---
import { Decrypt as NcmDecrypt } from './ncm';
import { Decrypt as QmcDecrypt } from './qmc';
import { Decrypt as KwmDecrypt } from './kwm';
import { Decrypt as KgmDecrypt } from './kgm';
import { Decrypt as Mg3dDecrypt } from './mg3d';
import { Decrypt as SodaDecrypt, isSodaFormat } from './soda';

// --- 支持的加密格式扩展名 ---
const ENCRYPTED_EXTENSIONS = new Set([
  // NCM (网易云)
  'ncm', 'uc',
  // QMC 系列 (QQ音乐)
  'qmc0', 'qmc2', 'qmc3', 'qmc4', 'qmc6', 'qmc8',
  'qmcflac', 'qmcogg', 'tkm',
  'bkcmp3', 'bkcm4a', 'bkcflac', 'bkcwav', 'bkcape', 'bkcogg', 'bkcwma',
  'mggl', 'mflac', 'mflac0', 'mgg', 'mgg0', 'mgg1', 'mmp4',
  '666c6163', '6d7033', '6f6767', '6d3461', '776176',
  'cache',
  // TM (QQ iOS)
  'tm0', 'tm2', 'tm3', 'tm6',
  // KWM (酷我音乐)
  'kwm',
  // KGM (酷狗音乐)
  'kgm',
  // MG3D (咪咕音乐)
  'mg3d',
  // Soda (汽水音乐)
  'soda', 'mdl',
]);

// --- 普通音频格式 ---
const PLAIN_EXTENSIONS = new Set([
  'mp3', 'flac', 'wav', 'm4a', 'ogg', 'wma', 'aac', 'opus',
]);

export type FormatType = 'encrypted' | 'plain' | 'unknown';

/**
 * 检测文件格式类型
 */
export function detectFormat(file: File): FormatType {
  const ext = SplitFilename(file.name).ext;
  if (ENCRYPTED_EXTENSIONS.has(ext)) return 'encrypted';
  if (PLAIN_EXTENSIONS.has(ext)) return 'plain';

  // 检查是否为汽水音乐格式（通过扩展名 .mdl）
  if (ext === 'mdl') return 'encrypted';

  return 'unknown';
}

/**
 * 获取支持的所有扩展名
 */
export function getSupportedExtensions(): string[] {
  return [...ENCRYPTED_EXTENSIONS, ...PLAIN_EXTENSIONS];
}

/**
 * 检查文件是否为支持的格式
 */
export function isSupported(file: File): boolean {
  return detectFormat(file) !== 'unknown';
}

/**
 * 通过文件头嗅探是否为汽水音乐格式
 * 用于处理未知扩展名但实际是汽水音乐的情况
 */
export async function sniffSodaFormat(file: File): Promise<boolean> {
  // 读取文件前 1MB 进行检测
  const chunk = file.slice(0, 1024 * 1024);
  const buffer = await chunk.arrayBuffer();
  const data = new Uint8Array(buffer);
  return isSodaFormat(data);
}

/**
 * 解密入口函数
 * 对于加密格式，调用对应的解密器；对于普通格式，直接返回
 */
export async function Decrypt(file: FileInfo, _config?: Record<string, unknown>): Promise<DecryptResult> {
  const raw = SplitFilename(file.name);

  // 普通格式直接返回
  if (PLAIN_EXTENSIONS.has(raw.ext)) {
    const blob = file.raw;
    const mime = AudioMimeType[raw.ext] || 'application/octet-stream';
    return {
      title: raw.name,
      ext: raw.ext,
      mime,
      file: URL.createObjectURL(blob),
      blob,
    };
  }

  // 加密格式路由
  let rt_data: DecryptResult;

  switch (raw.ext) {
    // === NCM (网易云) ===
    case 'ncm':
      rt_data = await NcmDecrypt(file.raw, raw.name, raw.ext);
      break;

    // === QMC 系列 (QQ音乐) ===
    case 'qmc0': case 'qmc2': case 'qmc3': case 'qmc4':
    case 'qmc6': case 'qmc8': case 'qmcflac': case 'qmcogg':
    case 'tkm': case 'mggl': case 'mflac': case 'mflac0':
    case 'mgg': case 'mgg0': case 'mgg1': case 'mmp4':
    case 'bkcmp3': case 'bkcm4a': case 'bkcflac': case 'bkcwav':
    case 'bkcape': case 'bkcogg': case 'bkcwma':
    case '666c6163': case '6d7033': case '6f6767': case '6d3461': case '776176':
    case 'cache':
      rt_data = await QmcDecrypt(file.raw, raw.name, raw.ext);
      break;

    // === TM (QQ iOS) ===
    case 'tm0': case 'tm3':
      // TM 格式本质是 raw mp3
      rt_data = await RawDecryptFallback(file.raw, raw.name, 'mp3');
      break;
    case 'tm2': case 'tm6':
      // TM M4A 格式
      rt_data = await RawDecryptFallback(file.raw, raw.name, 'm4a');
      break;

    // === NCM Cache ===
    case 'uc':
      rt_data = await NcmDecrypt(file.raw, raw.name, 'ncm');
      break;

    // === KWM (酷我音乐) ===
    case 'kwm':
      rt_data = await KwmDecrypt(file.raw, raw.name, raw.ext);
      break;

    // === KGM (酷狗音乐) ===
    case 'kgm':
      rt_data = await KgmDecrypt(file.raw, raw.name, raw.ext);
      break;

    // === MG3D (咪咕音乐) ===
    case 'mg3d':
      rt_data = await Mg3dDecrypt(file.raw, raw.name, raw.ext);
      break;

    // === Soda (汽水音乐) ===
    case 'soda':
    case 'mdl':
      // 汽水音乐需要 playAuth 参数
      const playAuth = _config?.playAuth as string | undefined;
      if (!playAuth) {
        throw new Error('汽水音乐解密需要 playAuth 参数');
      }
      rt_data = await SodaDecrypt(file.raw, playAuth);
      break;

    default:
      throw new Error(`不支持的文件格式: ${raw.ext}`);
  }

  if (!rt_data.rawExt) rt_data.rawExt = raw.ext;
  if (!rt_data.rawFilename) rt_data.rawFilename = raw.name;
  return rt_data;
}

/**
 * Raw 格式兜底解密（TM 等格式直接返回原始数据）
 */
async function RawDecryptFallback(file: File, name: string, ext: string): Promise<DecryptResult> {
  const blob = file;
  const mime = AudioMimeType[ext] || 'application/octet-stream';
  return {
    title: name,
    ext,
    mime,
    file: URL.createObjectURL(blob),
    blob,
  };
}
