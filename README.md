# mp3-transformer

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Features

### Batch Download
- **一键打包下载**：将所有转换完成的音频文件打包成ZIP文件下载
- **自动命名**：ZIP文件按日期自动命名（如：`转换完成的音频_2026-06-28.zip`）
- **进度显示**：打包过程中显示"正在打包..."状态
- **压缩优化**：使用DEFLATE压缩算法，压缩级别6，平衡文件大小和速度

### How to Use Batch Download
1. 上传音频文件并完成转换
2. 在转换队列工具栏中点击"打包下载"按钮
3. 等待ZIP文件生成和下载
4. 解压ZIP文件获取所有转换完成的音频

### Supported Formats
- **输入格式**：NCM、QMC系列、KGM、KWM、MG3D、SODA、MDL等加密格式
- **输出格式**：MP3、FLAC、WAV、OGG
