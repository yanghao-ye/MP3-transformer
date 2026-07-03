# MP3 Transformer

> 将加密音乐还原为纯净音质

[![Deploy to GitHub Pages](https://github.com/yanghao-ye/MP3-transformer/actions/workflows/deploy.yml/badge.svg)](https://github.com/yanghao-ye/MP3-transformer/actions/workflows/deploy.yml)

## 功能特性

- **多格式支持**：网易云（NCM/UC）、QQ音乐（QMC/MFLAC/MGG）、酷狗（KGM/VPR）、酷我（KWM）、咪咕（MG3D）
- **批量转换**：支持多文件同时上传，队列式处理
- **一键打包**：将所有转换完成的音频打包成 ZIP 下载
- **本地处理**：所有操作在浏览器端完成，文件不上传服务器
- **高质量输出**：支持输出为 MP3、FLAC、WAV、OGG 格式
- **实时进度**：显示解密和转换进度

## 在线使用

访问 [https://yanghao-ye.github.io/MP3-transformer/](https://yanghao-ye.github.io/MP3-transformer/)

## 使用方法

1. 点击上传区域或拖拽文件到页面
2. 确认文件列表，选择输出格式
3. 点击「开始转换」
4. 转换完成后可预览、单个下载或打包下载

## 支持的格式

| 平台 | 加密格式 |
|------|----------|
| 网易云音乐 | NCM、UC |
| QQ音乐 | QMC0、QMC2、QMC3、MFLAC、MGG |
| 酷狗音乐 | KGM、VPR |
| 酷我音乐 | KWM |
| 咪咕音乐 | MG3D |

## 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **状态管理**：Pinia
- **音频处理**：FFmpeg.wasm（WebAssembly）
- **解密算法**：基于 [unlock-music](https://github.com/unlock-music/cli) 的纯 JS 实现

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 注意事项

- 所有文件仅在浏览器本地处理，不会上传到任何服务器
- 首次使用需要加载 FFmpeg.wasm（约 30MB），请耐心等待
- 建议使用现代浏览器（Chrome、Firefox、Edge）

## 许可证

MIT License
