/**
 * FFmpeg.wasm Web Worker
 * 在独立线程中执行音频格式转换
 * 懒加载 FFmpeg.wasm，首次使用时初始化
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loaded = false;

interface LoadMessage {
  type: 'load';
}

interface ConvertMessage {
  type: 'convert';
  uid: number;
  audioBuffer: ArrayBuffer;
  inputName: string;
  outputName: string;
  command: string[];
}

interface ProgressMessage {
  type: 'progress';
  uid: number;
  progress: number;
}

interface DoneMessage {
  type: 'done';
  uid: number;
  result: {
    buffer: ArrayBuffer;
    ext: string;
  };
}

interface ErrorMessage {
  type: 'error';
  uid: number;
  error: string;
}

interface LogMessage {
  type: 'log';
  message: string;
}

async function loadFFmpeg(): Promise<void> {
  if (loaded && ffmpeg) return;

  ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }: { message: string }) => {
    self.postMessage({ type: 'log', message } as LogMessage);
  });

  ffmpeg.on('progress', ({ progress: _progress }: { progress: number }) => {
    // 进度通过 convert 事件回传
  });

  const coreURL = await toBlobURL(
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js',
    'text/javascript',
  );
  const wasmURL = await toBlobURL(
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm',
    'application/wasm',
  );

  await ffmpeg.load({ coreURL, wasmURL });
  loaded = true;
}

self.onmessage = async ({ data }: MessageEvent<LoadMessage | ConvertMessage>) => {
  if (data.type === 'load') {
    try {
      await loadFFmpeg();
      self.postMessage({ type: 'log', message: 'FFmpeg.wasm loaded successfully' });
    } catch (error) {
      self.postMessage({
        type: 'error',
        uid: 0,
        error: `Failed to load FFmpeg: ${error instanceof Error ? error.message : String(error)}`,
      } as ErrorMessage);
    }
    return;
  }

  if (data.type === 'convert') {
    const { uid, audioBuffer, inputName, outputName, command } = data;

    try {
      if (!ffmpeg || !loaded) {
        await loadFFmpeg();
      }

      if (!ffmpeg) {
        throw new Error('FFmpeg not initialized');
      }

      // 写入输入文件
      await ffmpeg.writeFile(inputName, new Uint8Array(audioBuffer));

      // 监听进度
      const progressHandler = ({ progress: p }: { progress: number }) => {
        self.postMessage({
          type: 'progress',
          uid,
          progress: Math.min(p, 0.99), // 保留 0.01 给读取步骤
        } as ProgressMessage);
      };
      ffmpeg.on('progress', progressHandler);

      // 执行转换命令
      await ffmpeg.exec(command);

      // 移除进度监听
      ffmpeg.off('progress', progressHandler);

      // 读取输出文件
      const data = await ffmpeg.readFile(outputName);
      const buffer = (data as Uint8Array).buffer;

      // 清理虚拟文件系统
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      // 发送结果
      self.postMessage({
        type: 'done',
        uid,
        result: {
          buffer,
          ext: outputName.split('.').pop() || 'mp3',
        },
      } as DoneMessage);
    } catch (error) {
      self.postMessage({
        type: 'error',
        uid,
        error: `Conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      } as ErrorMessage);
    }
  }
};
