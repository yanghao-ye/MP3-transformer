/**
 * 转换队列 Store
 * 管理文件队列、状态、进度、逐个转换
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { convertAudio, type ConvertResult, type ConvertStatus } from '@/services/converter';

export interface QueueItem {
  id: number;
  file: File;
  name: string;
  size: number;
  status: ConvertStatus;
  progress: number;
  result?: ConvertResult;
  error?: string;
}

let nextId = 1;

export const useQueueStore = defineStore('queue', () => {
  // --- State ---
  const items = ref<QueueItem[]>([]);
  const isProcessing = ref(false);
  const targetFormat = ref<string>('mp3');

  // --- Getters ---
  const pendingItems = computed(() => items.value.filter(i => i.status === 'pending'));
  const processingItem = computed(() => items.value.find(i => i.status === 'decrypting' || i.status === 'converting'));
  const completedItems = computed(() => items.value.filter(i => i.status === 'done'));
  const errorItems = computed(() => items.value.filter(i => i.status === 'error'));
  const hasItems = computed(() => items.value.length > 0);
  const canAddMore = computed(() => !isProcessing.value);

  // --- Actions ---

  /**
   * 添加文件到队列（不自动开始处理）
   */
  function addFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      items.value.push({
        id: nextId++,
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0,
      });
    }
  }

  /**
   * 开始处理队列
   */
  function startProcessing() {
    processQueue();
  }

  /**
   * 移除队列项
   */
  function removeItem(id: number) {
    const item = items.value.find(i => i.id === id);
    if (item?.result?.url) {
      URL.revokeObjectURL(item.result.url);
    }
    items.value = items.value.filter(i => i.id !== id);
  }

  /**
   * 重试失败的项
   */
  function retryItem(id: number) {
    const item = items.value.find(i => i.id === id);
    if (item) {
      item.status = 'pending';
      item.progress = 0;
      item.error = undefined;
      processQueue();
    }
  }

  /**
   * 清除已完成的项
   */
  function clearCompleted() {
    for (const item of completedItems.value) {
      if (item.result?.url) {
        URL.revokeObjectURL(item.result.url);
      }
    }
    items.value = items.value.filter(i => i.status !== 'done');
  }

  /**
   * 清空队列
   */
  function clearAll() {
    for (const item of items.value) {
      if (item.result?.url) {
        URL.revokeObjectURL(item.result.url);
      }
    }
    items.value = [];
  }

  /**
   * 设置目标格式
   */
  function setTargetFormat(format: string) {
    targetFormat.value = format;
  }

  /**
   * 处理队列（逐个转换）
   */
  async function processQueue() {
    if (isProcessing.value) return;

    const nextItem = items.value.find(i => i.status === 'pending');
    if (!nextItem) {
      isProcessing.value = false;
      return;
    }

    isProcessing.value = true;

    try {
      nextItem.status = 'decrypting';

      const result = await convertAudio(
        nextItem.file,
        nextItem.id,
        targetFormat.value,
        (progress) => {
          nextItem.status = progress.status;
          nextItem.progress = progress.progress;
        },
      );

      nextItem.status = 'done';
      nextItem.progress = 1;
      nextItem.result = result;
    } catch (error) {
      nextItem.status = 'error';
      nextItem.error = error instanceof Error ? error.message : String(error);
    } finally {
      isProcessing.value = false;
      // 继续处理下一个
      processQueue();
    }
  }

  return {
    // State
    items,
    isProcessing,
    targetFormat,
    // Getters
    pendingItems,
    processingItem,
    completedItems,
    errorItems,
    hasItems,
    canAddMore,
    // Actions
    addFiles,
    startProcessing,
    removeItem,
    retryItem,
    clearCompleted,
    clearAll,
    setTargetFormat,
  };
});
