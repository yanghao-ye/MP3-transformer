/**
 * 音频转换服务
 * 串联格式识别 → 解密（如需）→ FFmpeg 转换
 * 所有耗时操作在 Web Worker 中执行
 */
import { detectFormat, isSupported } from '@/decrypt/index';

export interface ConvertResult {
  title: string;
  artist?: string;
  album?: string;
  ext: string;
  mime: string;
  blob: Blob;
  url: string;
}

export type ConvertStatus = 'pending' | 'decrypting' | 'converting' | 'done' | 'error';

export interface ConvertProgress {
  status: ConvertStatus;
  progress: number;
  message?: string;
}

type ProgressCallback = (progress: ConvertProgress) => void;

// Worker 单例
let decryptWorker: Worker | null = null;
let ffmpegWorker: Worker | null = null;
let ffmpegLoaded = false;

// 等待队列（FFmpeg 加载期间的转换请求）
let ffmpegLoadPromise: Promise<void> | null = null;

/**
 * 获取或创建解密 Worker
 */
function getDecryptWorker(): Worker {
  if (!decryptWorker) {
    decryptWorker = new Worker(
      new URL('@/workers/decrypt.worker.ts', import.meta.url),
      { type: 'module' },
    );
  }
  return decryptWorker;
}

/**
 * 获取或创建 FFmpeg Worker
 */
function getFFmpegWorker(): Worker {
  if (!ffmpegWorker) {
    ffmpegWorker = new Worker(
      new URL('@/workers/ffmpeg.worker.ts', import.meta.url),
      { type: 'module' },
    );
  }
  return ffmpegWorker;
}

/**
 * 确保 FFmpeg.wasm 已加载
 */
async function ensureFFmpegLoaded(): Promise<void> {
  if (ffmpegLoaded) return;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = new Promise<void>((resolve, reject) => {
    const worker = getFFmpegWorker();

    const timeout = setTimeout(() => {
      reject(new Error('FFmpeg load timeout'));
    }, 120000); // 2 分钟超时

    worker.onmessage = ({ data }) => {
      if (data.type === 'log' && data.message?.includes('loaded successfully')) {
        clearTimeout(timeout);
        ffmpegLoaded = true;
        resolve();
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timeout);
      reject(error);
    };

    worker.postMessage({ type: 'load' });
  });

  return ffmpegLoadPromise;
}

/**
 * 在 Worker 中执行解密
 */
function decryptInWorker(file: File, uid: number, onProgress: ProgressCallback): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = getDecryptWorker();

    const handler = ({ data }: MessageEvent) => {
      if (data.uid !== uid) return;

      if (data.type === 'progress') {
        onProgress({
          status: 'decrypting',
          progress: data.progress * 0.5, // 解密占总进度 50%
        });
      }

      if (data.type === 'done') {
        worker.removeEventListener('message', handler);
        // 将 Blob 转为 ArrayBuffer
        data.result.blob.arrayBuffer().then(resolve).catch(reject);
      }

      if (data.type === 'error') {
        worker.removeEventListener('message', handler);
        reject(new Error(data.error));
      }
    };

    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'decrypt', file, uid });
  });
}

/**
 * 在 Worker 中执行 FFmpeg 转换
 */
function convertInWorker(
  audioBuffer: ArrayBuffer,
  inputName: string,
  outputName: string,
  command: string[],
  uid: number,
  onProgress: ProgressCallback,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = getFFmpegWorker();

    const handler = ({ data }: MessageEvent) => {
      if (data.uid !== uid) return;

      if (data.type === 'progress') {
        onProgress({
          status: 'converting',
          progress: 0.5 + data.progress * 0.5, // 转换占总进度 50%
        });
      }

      if (data.type === 'done') {
        worker.removeEventListener('message', handler);
        resolve(data.result.buffer);
      }

      if (data.type === 'error') {
        worker.removeEventListener('message', handler);
        reject(new Error(data.error));
      }
    };

    worker.addEventListener('message', handler);
    worker.postMessage({
      type: 'convert',
      uid,
      audioBuffer,
      inputName,
      outputName,
      command,
    });
  });
}

/**
 * 转换音频文件
 * @param file 原始文件
 * @param uid 唯一标识
 * @param targetFormat 目标格式（默认 mp3）
 * @param onProgress 进度回调
 */
export async function convertAudio(
  file: File,
  uid: number,
  targetFormat: string = 'mp3',
  onProgress: ProgressCallback = () => {},
): Promise<ConvertResult> {
  // 检查文件是否支持
  if (!isSupported(file)) {
    throw new Error(`不支持的文件格式: ${file.name}`);
  }

  const format = detectFormat(file);
  let audioBuffer: ArrayBuffer;
  let currentExt: string;

  // Step 1: 解密（如果是加密格式）
  if (format === 'encrypted') {
    onProgress({ status: 'decrypting', progress: 0 });
    audioBuffer = await decryptInWorker(file, uid, onProgress);
    // 解密后的扩展名需要从文件头嗅探
    const header = new Uint8Array(audioBuffer.slice(0, 16));
    currentExt = sniffExt(header);
  } else {
    onProgress({ status: 'decrypting', progress: 0.5 });
    audioBuffer = await file.arrayBuffer();
    currentExt = file.name.split('.').pop()?.toLowerCase() || 'mp3';
  }

  // Step 2: 如果已经是目标格式，直接返回
  if (currentExt === targetFormat) {
    const mime = getMimeType(targetFormat);
    const blob = new Blob([audioBuffer], { type: mime });
    onProgress({ status: 'done', progress: 1 });
    return {
      title: file.name.replace(/\.[^.]+$/, ''),
      ext: targetFormat,
      mime,
      blob,
      url: URL.createObjectURL(blob),
    };
  }

  // Step 3: FFmpeg 转换
  onProgress({ status: 'converting', progress: 0.5 });
  await ensureFFmpegLoaded();

  const inputName = `input.${currentExt}`;
  const outputName = `output.${targetFormat}`;
  const command = ['-i', inputName, '-codec:a', 'libmp3lame', '-q:a', '2', outputName];

  const resultBuffer = await convertInWorker(
    audioBuffer,
    inputName,
    outputName,
    command,
    uid,
    onProgress,
  );

  const mime = getMimeType(targetFormat);
  const blob = new Blob([resultBuffer], { type: mime });

  onProgress({ status: 'done', progress: 1 });

  return {
    title: file.name.replace(/\.[^.]+$/, ''),
    ext: targetFormat,
    mime,
    blob,
    url: URL.createObjectURL(blob),
  };
}

/**
 * 根据文件头嗅探扩展名
 */
function sniffExt(header: Uint8Array): string {
  // MP3: ID3
  if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) return 'mp3';
  // FLAC: fLaC
  if (header[0] === 0x66 && header[1] === 0x4c && header[2] === 0x61 && header[3] === 0x43) return 'flac';
  // OGG: OggS
  if (header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) return 'ogg';
  // M4A: ftyp (at offset 4)
  if (header.length >= 8 && header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) return 'm4a';
  // WAV: RIFF
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) return 'wav';
  return 'mp3';
}

/**
 * 获取 MIME 类型
 */
function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    flac: 'audio/flac',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
  };
  return map[ext] || 'audio/mpeg';
}

/**
 * 清理资源
 */
export function cleanup(): void {
  if (decryptWorker) {
    decryptWorker.terminate();
    decryptWorker = null;
  }
  if (ffmpegWorker) {
    ffmpegWorker.terminate();
    ffmpegWorker = null;
    ffmpegLoaded = false;
  }
}
