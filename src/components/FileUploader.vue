<script setup lang="ts">
import { ref } from 'vue';
import { useQueueStore } from '@/stores/queue';
import { getSupportedExtensions } from '@/decrypt/index';

const queueStore = useQueueStore();
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const supportedExtensions = getSupportedExtensions();
const acceptString = supportedExtensions.map(e => `.${e}`).join(',');

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    queueStore.addFiles(files);
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    queueStore.addFiles(input.files);
    input.value = '';
  }
}

function openFilePicker() {
  fileInput.value?.click();
}
</script>

<template>
  <div
    class="upload-zone"
    :class="{ 'is-dragging': isDragging }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="openFilePicker"
  >
    <input
      ref="fileInput"
      type="file"
      multiple
      :accept="acceptString"
      class="hidden"
      @change="handleFileSelect"
    />

    <div class="upload-icon">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    </div>

    <h3>拖拽文件到这里</h3>
    <p>或点击选择文件</p>
  </div>
</template>

<style scoped>
.upload-zone {
  width: 100%;
  padding: 80px 48px;
  text-align: center;
  border-radius: 28px;
  background: var(--bg);
  box-shadow: inset 8px 8px 16px var(--shadow-dark), inset -8px -8px 16px var(--shadow-light);
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 48px;
}

.upload-zone:hover,
.upload-zone.is-dragging {
  box-shadow: inset 6px 6px 12px var(--shadow-dark), inset -6px -6px 12px var(--shadow-light);
}

.upload-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 28px;
  border-radius: 50%;
  background: var(--bg);
  box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-icon svg {
  width: 32px;
  height: 32px;
  stroke: var(--accent);
}

.upload-zone h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.upload-zone p {
  font-size: 14px;
  color: var(--text-secondary);
}

.hidden {
  display: none;
}
</style>
