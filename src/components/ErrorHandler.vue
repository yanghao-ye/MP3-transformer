<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface ErrorToast {
  id: number;
  message: string;
  type: 'error' | 'warning' | 'info';
}

const toasts = ref<ErrorToast[]>([]);
let nextId = 0;

function addToast(message: string, type: ErrorToast['type'] = 'error') {
  const id = nextId++;
  toasts.value.push({ id, message, type });
  // 5秒后自动消失
  setTimeout(() => removeToast(id), 5000);
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id);
}

// 暴露给外部使用
defineExpose({ addToast });

// 全局错误处理
function handleError(event: ErrorEvent) {
  console.error('Global error:', event.error);
  addToast(event.message || '发生未知错误');
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  console.error('Unhandled rejection:', event.reason);
  const message = event.reason?.message || '操作失败，请重试';
  addToast(message);
}

onMounted(() => {
  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
});

onUnmounted(() => {
  window.removeEventListener('error', handleError);
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
});
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
        @click="removeToast(toast.id)"
      >
        <span class="toast-icon">
          <template v-if="toast.type === 'error'">⚠️</template>
          <template v-else-if="toast.type === 'warning'">⚡</template>
          <template v-else>ℹ️</template>
        </span>
        <span class="toast-message">{{ toast.message }}</span>
        <span class="toast-close">×</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--bg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s ease;
}

.toast:hover {
  transform: translateX(-4px);
}

.toast-error {
  border-left: 4px solid #e53e3e;
}

.toast-warning {
  border-left: 4px solid #dd6b20;
}

.toast-info {
  border-left: 4px solid #3182ce;
}

.toast-icon {
  font-size: 18px;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
}

.toast-close {
  font-size: 20px;
  color: var(--text-secondary);
  opacity: 0.6;
}

.toast-close:hover {
  opacity: 1;
}

/* 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}
</style>
