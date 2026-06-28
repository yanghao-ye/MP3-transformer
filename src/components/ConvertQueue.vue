<script setup lang="ts">
import { ref } from 'vue';
import { useQueueStore } from '@/stores/queue';
import QueueItem from './QueueItem.vue';
import JSZip from 'jszip';

const queueStore = useQueueStore();
const isPackaging = ref(false);

const formatOptions = [
  { value: 'mp3', label: 'MP3' },
  { value: 'flac', label: 'FLAC' },
  { value: 'wav', label: 'WAV' },
  { value: 'ogg', label: 'OGG' },
];

function handleStartConversion() {
  queueStore.startProcessing();
}

async function handleBatchDownload() {
  if (queueStore.completedItems.length === 0) return;

  isPackaging.value = true;

  try {
    const zip = new JSZip();
    const folder = zip.folder('转换完成的音频');

    if (!folder) {
      throw new Error('无法创建ZIP文件夹');
    }

    // 添加所有已完成的文件到ZIP
    for (const item of queueStore.completedItems) {
      if (item.result?.blob) {
        const fileName = `${item.result.title}.${item.result.ext}`;
        folder.file(fileName, item.result.blob);
      }
    }

    // 生成ZIP文件
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // 创建下载链接并触发下载
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `转换完成的音频_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 清理URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('打包下载失败:', error);
    alert('打包下载失败，请重试');
  } finally {
    isPackaging.value = false;
  }
}
</script>

<template>
  <div v-if="queueStore.hasItems" class="queue-container">
    <!-- Toolbar -->
    <div class="toolbar">
      <span class="toolbar-title">转换队列 ({{ queueStore.items.length }} 个文件)</span>
      <div class="toolbar-actions">
        <select
          :value="queueStore.targetFormat"
          class="format-select"
          @change="queueStore.setTargetFormat(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="opt in formatOptions" :key="opt.value" :value="opt.value">
            输出 {{ opt.label }}
          </option>
        </select>
        <button class="btn" @click="queueStore.clearAll">清空</button>
        <button
          v-if="queueStore.completedItems.length > 0 && !isPackaging"
          class="btn btn-secondary"
          @click="handleBatchDownload"
        >
          打包下载 ({{ queueStore.completedItems.length }}个文件)
        </button>
        <button
          v-if="queueStore.completedItems.length > 0 && isPackaging"
          class="btn btn-secondary"
          disabled
        >
          正在打包...
        </button>
        <button
          v-if="queueStore.pendingItems.length > 0 && !queueStore.isProcessing"
          class="btn btn-primary"
          @click="handleStartConversion"
        >
          开始转换
        </button>
      </div>
    </div>

    <!-- Queue List -->
    <div class="queue-list">
      <QueueItem
        v-for="item in queueStore.items"
        :key="item.id"
        :item="item"
      />
    </div>

    <!-- Processing Status -->
    <div v-if="queueStore.isProcessing" class="processing-status">
      <svg class="spinner" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      正在处理中...
    </div>
  </div>
</template>

<style scoped>
.queue-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-radius: 14px;
  background: var(--bg);
  box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
}

.toolbar-title {
  font-size: 14px;
  font-weight: 600;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.format-select {
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  background: var(--bg);
  box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  outline: none;
}

.btn {
  font-size: 13px;
  font-weight: 600;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: var(--bg);
  box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  color: var(--text-secondary);
}

.btn:hover {
  box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
}

.btn-primary {
  background: var(--accent);
  color: white;
  box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
}

.btn-primary:hover {
  background: #4A5AB8;
}

.btn-secondary {
  background: var(--accent-light);
  color: var(--accent);
  box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
}

.btn-secondary:hover {
  background: #D6DBFF;
}

.btn-secondary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.processing-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;
  color: var(--accent);
}

.spinner {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
