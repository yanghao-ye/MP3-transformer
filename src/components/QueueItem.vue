<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import type { QueueItem } from '@/stores/queue';
import { useQueueStore } from '@/stores/queue';

const props = defineProps<{
  item: QueueItem;
}>();

const queueStore = useQueueStore();
const audioPlayer = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const isDragging = ref(false);
const progressRef = ref<HTMLDivElement | null>(null);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const progress = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

function downloadResult() {
  if (!props.item.result) return;
  const a = document.createElement('a');
  a.href = props.item.result.url;
  a.download = `${props.item.result.title}.${props.item.result.ext}`;
  a.click();
}

function initAudio() {
  if (audioPlayer.value) return;

  audioPlayer.value = new Audio(props.item.result?.url);
  audioPlayer.value.addEventListener('ended', () => {
    isPlaying.value = false;
    currentTime.value = 0;
  });
  audioPlayer.value.addEventListener('timeupdate', () => {
    if (!isDragging.value) {
      currentTime.value = audioPlayer.value?.currentTime || 0;
    }
  });
  audioPlayer.value.addEventListener('loadedmetadata', () => {
    duration.value = audioPlayer.value?.duration || 0;
  });
}

function togglePreview() {
  if (!props.item.result?.url) return;

  initAudio();

  if (isPlaying.value) {
    audioPlayer.value?.pause();
    isPlaying.value = false;
  } else {
    audioPlayer.value?.play();
    isPlaying.value = true;
  }
}

function seekTo(e: MouseEvent) {
  if (!progressRef.value || !audioPlayer.value) return;

  const rect = progressRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percentage = Math.max(0, Math.min(1, x / rect.width));
  const newTime = percentage * duration.value;

  audioPlayer.value.currentTime = newTime;
  currentTime.value = newTime;
}

function startDrag(e: MouseEvent) {
  isDragging.value = true;
  seekTo(e);

  const onMove = (ev: MouseEvent) => {
    seekTo(ev);
  };

  const onUp = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function getStatusText(): string {
  switch (props.item.status) {
    case 'pending': return '等待中';
    case 'decrypting': return '解密中';
    case 'converting': return '转换中';
    case 'done': return '已完成';
    case 'error': return '失败';
    default: return '';
  }
}

function getStatusClass(): string {
  switch (props.item.status) {
    case 'pending': return 'status-pending';
    case 'decrypting':
    case 'converting': return 'status-processing';
    case 'done': return 'status-done';
    case 'error': return 'status-error';
    default: return '';
  }
}

function getFormatLabel(): string {
  const ext = props.item.name.split('.').pop()?.toUpperCase() || '';
  return ext;
}

onUnmounted(() => {
  audioPlayer.value?.pause();
  audioPlayer.value = null;
});
</script>

<template>
  <div class="queue-item">
    <div class="file-icon">{{ getFormatLabel() }}</div>
    <div class="file-info">
      <div class="file-name">{{ item.name }}</div>
      <div class="file-meta">{{ formatSize(item.size) }}</div>

      <!-- Audio Player (shown when playing or paused) -->
      <div v-if="item.status === 'done' && item.result?.url && (isPlaying || currentTime > 0)" class="audio-player">
        <button class="play-btn" @click.stop="togglePreview">
          <svg v-if="isPlaying" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <div class="progress-container">
          <div class="time">{{ formatTime(currentTime) }}</div>
          <div
            ref="progressRef"
            class="progress-bar"
            @mousedown="startDrag"
          >
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${progress}%` }" />
            </div>
            <div class="progress-thumb" :style="{ left: `${progress}%` }" />
          </div>
          <div class="time">{{ formatTime(duration) }}</div>
        </div>
      </div>
    </div>
    <div class="file-actions">
      <!-- Preview Button -->
      <button
        v-if="item.status === 'done' && item.result?.url && currentTime === 0"
        class="action-btn"
        @click="togglePreview"
      >
        预览
      </button>

      <!-- Download Button -->
      <button
        v-if="item.status === 'done'"
        class="action-btn action-btn-primary"
        @click="downloadResult"
      >
        下载
      </button>

      <!-- Retry Button -->
      <button
        v-if="item.status === 'error'"
        class="action-btn"
        @click="queueStore.retryItem(item.id)"
      >
        重试
      </button>

      <!-- Status Badge -->
      <span v-if="item.status !== 'done' && item.status !== 'error'" class="status-badge" :class="getStatusClass()">
        {{ getStatusText() }}
      </span>

      <!-- Delete Button -->
      <button class="delete-btn" @click="queueStore.removeItem(item.id)">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.queue-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 18px;
  background: var(--bg);
  box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
}

.file-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Audio Player */
.audio-player {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--bg);
  box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
}

.play-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.play-btn:hover {
  background: #4A5AB8;
}

.play-btn svg {
  width: 16px;
  height: 16px;
}

.progress-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.time {
  font-size: 11px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  min-width: 32px;
  text-align: center;
}

.progress-bar {
  flex: 1;
  height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.progress-track {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--shadow-dark);
  overflow: visible;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 2px 4px rgba(92, 106, 196, 0.3);
  opacity: 0;
  transition: opacity 0.2s;
}

.progress-bar:hover .progress-thumb {
  opacity: 1;
}

/* File Actions */
.file-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  font-size: 12px;
  font-weight: 600;
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: var(--bg);
  box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  color: var(--text-secondary);
}

.action-btn:hover {
  box-shadow: 1px 1px 3px var(--shadow-dark), -1px -1px 3px var(--shadow-light);
}

.action-btn-primary {
  background: var(--accent);
  color: white;
}

.action-btn-primary:hover {
  background: #4A5AB8;
}

.status-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 8px;
}

.status-pending {
  background: #FFF8E1;
  color: #F59E0B;
}

.status-processing {
  background: var(--accent-light);
  color: var(--accent);
}

.status-done {
  background: #E8F5E9;
  color: #4CAF50;
}

.status-error {
  background: #FFEBEE;
  color: #EF5350;
}

.delete-btn {
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

.delete-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #EF5350;
}

.delete-btn svg {
  width: 16px;
  height: 16px;
}
</style>
