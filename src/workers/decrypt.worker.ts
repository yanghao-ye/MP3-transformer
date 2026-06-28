/**
 * 解密 Web Worker
 * 在独立线程中执行音频文件解密，避免阻塞主线程
 */
import { Decrypt, detectFormat } from '../decrypt/index';
import type { FileInfo } from '../decrypt/entity';

interface DecryptMessage {
  type: 'decrypt';
  file: File;
  uid: number;
}

interface ProgressMessage {
  type: 'progress';
  uid: number;
  progress: number;
  status: string;
}

interface DoneMessage {
  type: 'done';
  uid: number;
  result: {
    title: string;
    artist?: string;
    album?: string;
    ext: string;
    mime: string;
    blob: Blob;
  };
}

interface ErrorMessage {
  type: 'error';
  uid: number;
  error: string;
}

self.onmessage = async ({ data }: MessageEvent<DecryptMessage>) => {
  const { file, uid } = data;

  try {
    // 检测格式
    const format = detectFormat(file);
    if (format === 'unknown') {
      self.postMessage({
        type: 'error',
        uid,
        error: `不支持的文件格式: ${file.name}`,
      } as ErrorMessage);
      return;
    }

    // 发送进度：开始解密
    self.postMessage({
      type: 'progress',
      uid,
      progress: 0,
      status: 'decrypting',
    } as ProgressMessage);

    // 构造 FileInfo
    const fileInfo: FileInfo = {
      status: 'decrypting',
      name: file.name,
      size: file.size,
      percentage: 0,
      uid,
      raw: file,
    };

    // 执行解密
    const result = await Decrypt(fileInfo);

    // 发送进度：完成
    self.postMessage({
      type: 'progress',
      uid,
      progress: 1,
      status: 'done',
    } as ProgressMessage);

    // 发送结果（Blob 通过 transferable 传递）
    self.postMessage({
      type: 'done',
      uid,
      result: {
        title: result.title,
        artist: result.artist,
        album: result.album,
        ext: result.ext,
        mime: result.mime,
        blob: result.blob,
      },
    } as DoneMessage);
  } catch (error) {
    self.postMessage({
      type: 'error',
      uid,
      error: error instanceof Error ? error.message : String(error),
    } as ErrorMessage);
  }
};
