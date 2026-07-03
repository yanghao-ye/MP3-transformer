/**
 * NCM (网易云音乐) 解密模块
 * 核心算法：AES-ECB 解密密钥 + RC4 解密音频数据
 * 简化版：跳过 metadata 写入，专注解密
 */
import AES from 'crypto-js/aes';
import PKCS7 from 'crypto-js/pad-pkcs7';
import ModeECB from 'crypto-js/mode-ecb';
import WordArray from 'crypto-js/lib-typedarrays';
import Base64 from 'crypto-js/enc-base64';
import EncUTF8 from 'crypto-js/enc-utf8';
import EncHex from 'crypto-js/enc-hex';
import CryptoJS from 'crypto-js';

import type { DecryptResult } from './entity';
import { AudioMimeType, BytesHasPrefix, GetArrayBuffer, SniffAudioExt } from './utils';

const CORE_KEY = EncHex.parse('687a4852416d736f356b496e62617857');
const META_KEY = EncHex.parse('2331346C6A6B5F215C5D2630553C2728');
const MagicHeader = [0x43, 0x54, 0x45, 0x4e, 0x46, 0x44, 0x41, 0x4d];

interface NcmMusicMeta {
  musicName?: string;
  artist?: Array<string | number>[];
  format?: string;
  album?: string;
  albumPic?: string;
}

interface NcmDjMeta {
  mainMusic: NcmMusicMeta;
}

export async function Decrypt(file: File, raw_filename: string, _: string): Promise<DecryptResult> {
  return new NcmDecryptor(await GetArrayBuffer(file), raw_filename).decrypt();
}

class NcmDecryptor {
  raw: ArrayBuffer;
  view: DataView;
  offset: number = 0;
  filename: string;
  format: string = '';
  mime: string = '';
  audio?: Uint8Array;
  blob?: Blob;
  oriMeta?: NcmMusicMeta;

  constructor(buf: ArrayBuffer, filename: string) {
    const prefix = new Uint8Array(buf, 0, 8);
    if (!BytesHasPrefix(prefix, MagicHeader)) throw Error('此ncm文件已损坏');
    this.offset = 10;
    this.raw = buf;
    this.view = new DataView(buf);
    this.filename = filename;
  }

  private _getKeyData(): Uint8Array {
    const keyLen = this.view.getUint32(this.offset, true);
    this.offset += 4;
    const cipherText = new Uint8Array(this.raw, this.offset, keyLen).map((uint8) => uint8 ^ 0x64);
    this.offset += keyLen;

    const plainText = AES.decrypt(
      // @ts-expect-error - CryptoJS type mismatch with Uint8Array
      { ciphertext: WordArray.create(cipherText) },
      CORE_KEY,
      { mode: ModeECB, padding: PKCS7 },
    );

    const result = new Uint8Array(plainText.sigBytes);
    const words = plainText.words;
    const sigBytes = plainText.sigBytes;
    for (let i = 0; i < sigBytes; i++) {
      result[i] = ((words[i >>> 2] ?? 0) >>> (24 - (i % 4) * 8)) & 0xff;
    }

    return result.slice(17);
  }

  private _getKeyBox(): Uint8Array {
    const keyData = this._getKeyData();
    const box = new Uint8Array(Array(256).keys());
    const keyDataLen = keyData.length;
    let j = 0;

    for (let i = 0; i < 256; i++) {
      j = (box[i]! + j + keyData[i % keyDataLen]!) & 0xff;
      const tempI = box[i];
      const tempJ = box[j];
      box[i] = tempJ!;
      box[j] = tempI!;
    }

    return box.map((_, i, arr) => {
      i = (i + 1) & 0xff;
      const si = arr[i]!;
      const sj = arr[(i + si) & 0xff]!;
      return arr[(si + sj) & 0xff]!;
    });
  }

  private _getMetaData(): NcmMusicMeta {
    const metaDataLen = this.view.getUint32(this.offset, true);
    this.offset += 4;
    if (metaDataLen === 0) return {};

    const cipherText = new Uint8Array(this.raw, this.offset, metaDataLen).map((data) => data ^ 0x63);
    this.offset += metaDataLen;

    WordArray.create();
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: Base64.parse(
        WordArray.create(cipherText.slice(22)).toString(EncUTF8),
      ),
    });
    const plainText = AES.decrypt(
      cipherParams,
      META_KEY,
      { mode: ModeECB, padding: PKCS7 },
    ).toString(EncUTF8);

    const labelIndex = plainText.indexOf(':');
    let result: NcmMusicMeta;
    if (plainText.slice(0, labelIndex) === 'dj') {
      const tmp: NcmDjMeta = JSON.parse(plainText.slice(labelIndex + 1));
      result = tmp.mainMusic;
    } else {
      result = JSON.parse(plainText.slice(labelIndex + 1));
    }
    return result;
  }

  private _getAudio(keyBox: Uint8Array): Uint8Array {
    this.offset += this.view.getUint32(this.offset + 5, true) + 13;
    const audioData = new Uint8Array(this.raw, this.offset);
    const lenAudioData = audioData.length;
    for (let cur = 0; cur < lenAudioData; ++cur) audioData[cur]! ^= keyBox[cur & 0xff]!;
    return audioData;
  }

  async decrypt(): Promise<DecryptResult> {
    const keyBox = this._getKeyBox();
    this.oriMeta = this._getMetaData();
    this.audio = this._getAudio(keyBox);
    this.format = this.oriMeta.format || SniffAudioExt(this.audio);
    this.mime = AudioMimeType[this.format] || 'application/octet-stream';

    // 构建标题
    const title = this.oriMeta.musicName || this.filename;
    let artist = '';
    if (this.oriMeta.artist && Array.isArray(this.oriMeta.artist)) {
      artist = this.oriMeta.artist.map(a => String(a[0] ?? '')).join('; ');
    }

    this.blob = new Blob([this.audio as BlobPart], { type: this.mime });

    return {
      title,
      artist,
      ext: this.format,
      album: this.oriMeta.album,
      file: URL.createObjectURL(this.blob),
      blob: this.blob,
      mime: this.mime,
    };
  }
}
