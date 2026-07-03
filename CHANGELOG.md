# Changelog

## 1.0.0 (2026-07-03)

### 功能

- 支持网易云音乐（NCM/UC）格式解密
- 支持 QQ 音乐（QMC/MFLAC/MGG）格式解密
- 支持酷狗音乐（KGM/VPR）格式解密
- 支持酷我音乐（KWM）格式解密
- 支持咪咕音乐（MG3D）格式解密
- 批量文件上传和转换
- 实时转换进度显示
- 一键打包下载所有转换完成的文件
- 支持输出为 MP3、FLAC、WAV、OGG 格式

### 技术

- Vue 3 + TypeScript + Vite
- FFmpeg.wasm 浏览器端音频转换
- Web Worker 多线程处理
- Pinia 状态管理
- 全局错误处理
- 单元测试覆盖
- GitHub Pages 自动部署

### 安全

- 所有文件仅在浏览器本地处理
- 不上传任何数据到服务器
