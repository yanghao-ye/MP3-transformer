<script setup lang="ts">
import { ref } from 'vue';
import FileUploader from './components/FileUploader.vue';
import ConvertQueue from './components/ConvertQueue.vue';

const showHelp = ref(false);

function openHelp() {
  showHelp.value = true;
}

function closeHelp() {
  showHelp.value = false;
}

function openFeedback() {
  window.open('https://github.com/yanghao-ye/mp3-transformer/issues', '_blank');
}
</script>

<template>
  <div class="app-container">
    <!-- Header -->
    <header class="app-header">
      <div class="logo">MP3 <span>Transformer</span></div>
      <nav>
        <a href="javascript:void(0)" class="nav-link" @click="openHelp">帮助</a>
        <a href="javascript:void(0)" class="nav-link" @click="openFeedback">反馈</a>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Left Panel -->
      <div class="left-panel">
        <div class="hero">
          <h1>将加密音乐<br>还原为纯净音质</h1>
          <p>支持网易云、QQ音乐、酷狗、酷我、咪咕、汽水音乐等主流平台<br>浏览器端完成解密转换，文件不离开你的设备</p>
        </div>
        <FileUploader />
      </div>

      <!-- Right Panel -->
      <div class="right-panel">
        <ConvertQueue />
      </div>
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-links">
        <a href="https://github.com/yanghao-ye/mp3-transformer" target="_blank">GitHub 仓库</a>
        <span class="star-note">（如果彦祖亦菲赏个star那就万分感谢）</span>
        <span class="divider">·</span>
        <span class="dev-note">随便做的，感谢使用，欢迎反馈</span>
      </div>
      <p class="copyright">浏览器端解密转换 · 文件不上传服务器 · 隐私安全</p>
    </footer>

    <!-- Help Modal -->
    <div v-if="showHelp" class="modal-overlay" @click.self="closeHelp">
      <div class="modal">
        <div class="modal-header">
          <h2>使用帮助</h2>
          <button class="modal-close" @click="closeHelp">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-content">
          <h3>支持的格式</h3>
          <div class="format-list">
            <div class="format-group">
              <span class="format-label">网易云音乐</span>
              <span class="format-ext">NCM、UC</span>
            </div>
            <div class="format-group">
              <span class="format-label">QQ音乐</span>
              <span class="format-ext">QMC0、QMC2、QMC3、MFLAC、MGG</span>
            </div>
            <div class="format-group">
              <span class="format-label">酷狗音乐</span>
              <span class="format-ext">KGM、VPR</span>
            </div>
            <div class="format-group">
              <span class="format-label">酷我音乐</span>
              <span class="format-ext">KWM</span>
            </div>
            <div class="format-group">
              <span class="format-label">咪咕音乐</span>
              <span class="format-ext">MG3D</span>
            </div>
            <div class="format-group">
              <span class="format-label">汽水音乐</span>
              <span class="format-ext">SODA、MDL</span>
            </div>
          </div>

          <h3>使用方法</h3>
          <ol class="steps">
            <li>点击上传区域或拖拽文件到页面</li>
            <li>确认文件列表，选择输出格式</li>
            <li>点击「开始转换」</li>
            <li>转换完成后可预览或下载</li>
          </ol>

          <h3>注意事项</h3>
          <ul class="notes">
            <li>所有文件仅在浏览器本地处理，不会上传到任何服务器</li>
            <li>支持批量上传和转换</li>
            <li>转换后的文件可直接播放和下载</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap');

:root {
  --bg: #E8EDF2;
  --text: #2D3748;
  --text-secondary: #718096;
  --accent: #5C6AC4;
  --accent-light: #EEF0FF;
  --shadow-light: #FFFFFF;
  --shadow-dark: #C8D0E0;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'DM Sans', -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
  padding: 48px 64px;
}

/* Header */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 48px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  padding: 12px 24px;
  border-radius: 14px;
  background: var(--bg);
  box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
}

.logo span {
  color: var(--accent);
}

nav {
  display: flex;
  gap: 12px;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  padding: 12px 20px;
  border-radius: 12px;
  background: var(--bg);
  box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
  transition: all 0.3s;
}

.nav-link:hover {
  color: var(--accent);
}

/* Main Content */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: start;
}

.left-panel {
  padding-top: 32px;
}

.hero h1 {
  font-family: 'Crimson Pro', serif;
  font-size: 48px;
  font-weight: 500;
  line-height: 1.2;
  margin-bottom: 24px;
  letter-spacing: -0.02em;
}

.hero p {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Footer */
.app-footer {
  margin-top: 64px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  padding: 20px 24px;
  border-radius: 14px;
  background: var(--bg);
  box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
}

.footer-links {
  margin-bottom: 8px;
}

.footer-links a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.footer-links a:hover {
  opacity: 0.8;
}

.star-note {
  font-size: 12px;
  color: var(--text);
  font-style: normal;
  font-weight: 400;
}

.footer-links .divider {
  margin: 0 12px;
  color: var(--shadow-dark);
}

.dev-note {
  font-size: 13px;
  color: var(--text-secondary);
}

.copyright {
  font-size: 12px;
  opacity: 0.7;
}

/* Responsive */
@media (max-width: 900px) {
  .app-container {
    padding: 24px;
  }

  .main-content {
    grid-template-columns: 1fr;
    gap: 48px;
  }

  .hero h1 {
    font-size: 36px;
  }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  background: var(--bg);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--shadow-dark);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.05);
}

.modal-close svg {
  width: 18px;
  height: 18px;
}

.modal-content {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(80vh - 70px);
}

.modal-content h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--accent);
}

.modal-content h3:not(:first-child) {
  margin-top: 24px;
}

.format-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
}

.format-label {
  font-size: 13px;
  font-weight: 500;
}

.format-ext {
  font-size: 12px;
  color: var(--text-secondary);
}

.steps,
.notes {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-secondary);
}

.notes {
  list-style: none;
  padding-left: 0;
}

.notes li::before {
  content: '•';
  margin-right: 8px;
  color: var(--accent);
}
</style>
