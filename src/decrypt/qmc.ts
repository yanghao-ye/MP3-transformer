/**
 * QMC (QQ音乐) 解密模块
 * 支持 Static Cipher、Map Cipher、RC4 Cipher
 * 简化版：跳过 WASM 和 metadata 提取
 */
import { QmcMapCipher, QmcRC4Cipher, QmcStaticCipher } from './qmc_cipher';
import type { QmcStreamCipher } from './qmc_cipher';
import { AudioMimeType, GetArrayBuffer, SniffAudioExt } from './utils';
import type { DecryptResult } from './entity';
import { QmcDeriveKey } from './qmc_key';

interface Handler {
  ext: string;
  version: number;
}

export const HandlerMap: { [key: string]: Handler } = {
  mgg: { ext: 'ogg', version: 2 },
  mgg0: { ext: 'ogg', version: 2 },
  mggl: { ext: 'ogg', version: 2 },
  mgg1: { ext: 'ogg', version: 2 },
  mflac: { ext: 'flac', version: 2 },
  mflac0: { ext: 'flac', version: 2 },
  mmp4: { ext: 'mmp4', version: 2 },
  qmcflac: { ext: 'flac', version: 2 },
  qmcogg: { ext: 'ogg', version: 2 },
  qmc0: { ext: 'mp3', version: 2 },
  qmc2: { ext: 'ogg', version: 2 },
  qmc3: { ext: 'mp3', version: 2 },
  qmc4: { ext: 'ogg', version: 2 },
  qmc6: { ext: 'ogg', version: 2 },
  qmc8: { ext: 'ogg', version: 2 },
  bkcmp3: { ext: 'mp3', version: 1 },
  bkcm4a: { ext: 'm4a', version: 1 },
  bkcflac: { ext: 'flac', version: 1 },
  bkcwav: { ext: 'wav', version: 1 },
  bkcape: { ext: 'ape', version: 1 },
  bkcogg: { ext: 'ogg', version: 1 },
  bkcwma: { ext: 'wma', version: 1 },
  tkm: { ext: 'm4a', version: 1 },
  '666c6163': { ext: 'flac', version: 1 },
  '6d7033': { ext: 'mp3', version: 1 },
  '6f6767': { ext: 'ogg', version: 1 },
  '6d3461': { ext: 'm4a', version: 1 },
  '776176': { ext: 'wav', version: 1 },
};

export async function Decrypt(file: Blob, raw_filename: string, raw_ext: string): Promise<DecryptResult> {
  if (!(raw_ext in HandlerMap)) throw new Error(`QMC cannot handle type: ${raw_ext}`);
  const handler = HandlerMap[raw_ext]!;

  const fileBuffer = await GetArrayBuffer(file);

  // 使用纯 JS 解码器
  const d = new QmcDecoder(new Uint8Array(fileBuffer));
  const musicDecoded = d.decrypt();

  const ext = SniffAudioExt(musicDecoded, handler.ext);
  const mime = AudioMimeType[ext] || 'application/octet-stream';
  const blob = new Blob([musicDecoded as BlobPart], { type: mime });

  // 从文件名提取标题
  const title = raw_filename;

  return {
    title,
    ext,
    mime,
    file: URL.createObjectURL(blob),
    blob,
  };
}

export class QmcDecoder {
  private static readonly BYTE_COMMA = ','.charCodeAt(0);
  private readonly file: Uint8Array;
  private readonly size: number;
  private decoded: boolean = false;
  private audioSize?: number;
  private cipher?: QmcStreamCipher;

  public constructor(file: Uint8Array) {
    this.file = file;
    this.size = file.length;
    this.searchKey();
  }

  private _songID?: number;

  public get songID() {
    return this._songID;
  }

  public decrypt(): Uint8Array {
    if (!this.cipher) {
      throw new Error('no cipher found');
    }
    if (!this.audioSize || this.audioSize <= 0) {
      throw new Error('invalid audio size');
    }
    const audioBuf = this.file.subarray(0, this.audioSize);

    if (!this.decoded) {
      this.cipher.decrypt(audioBuf, 0);
      this.decoded = true;
    }

    return audioBuf;
  }

  private searchKey() {
    const last4Byte = this.file.slice(-4);
    const textEnc = new TextDecoder();
    if (textEnc.decode(last4Byte) === 'STag') {
      throw new Error('文件中没有写入密钥，无法解锁，请降级App并重试');
    } else if (textEnc.decode(last4Byte) === 'QTag') {
      const sizeBuf = this.file.slice(-8, -4);
      const sizeView = new DataView(sizeBuf.buffer, sizeBuf.byteOffset);
      const keySize = sizeView.getUint32(0, false);
      this.audioSize = this.size - keySize - 8;

      const rawKey = this.file.subarray(this.audioSize, this.size - 8);
      const keyEnd = rawKey.findIndex((v) => v == QmcDecoder.BYTE_COMMA);
      if (keyEnd < 0) {
        throw new Error('invalid key: search raw key failed');
      }
      this.setCipher(rawKey.subarray(0, keyEnd));

      const idBuf = rawKey.subarray(keyEnd + 1);
      const idEnd = idBuf.findIndex((v) => v == QmcDecoder.BYTE_COMMA);
      if (idEnd < 0) {
        throw new Error('invalid key: search song id failed');
      }
      this._songID = parseInt(textEnc.decode(idBuf.subarray(0, idEnd)), 10);
    } else {
      const sizeView = new DataView(last4Byte.buffer, last4Byte.byteOffset);
      const keySize = sizeView.getUint32(0, true);
      if (keySize < 0x400) {
        this.audioSize = this.size - keySize - 4;
        const rawKey = this.file.subarray(this.audioSize, this.size - 4);
        this.setCipher(rawKey);
      } else {
        this.audioSize = this.size;
        this.cipher = new QmcStaticCipher();
      }
    }
  }

  private setCipher(keyRaw: Uint8Array) {
    const keyDec = QmcDeriveKey(keyRaw);
    if (keyDec.length > 300) {
      this.cipher = new QmcRC4Cipher(keyDec);
    } else {
      this.cipher = new QmcMapCipher(keyDec);
    }
  }
}
