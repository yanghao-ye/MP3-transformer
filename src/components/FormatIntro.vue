<script setup lang="ts">
const platforms = [
  {
    name: '网易云音乐',
    icon: '🎵',
    formats: ['NCM', 'UC'],
    color: 'bg-red-50 border-red-200 text-red-800',
  },
  {
    name: 'QQ音乐',
    icon: '🎶',
    formats: ['QMC0', 'QMC2', 'QMC3', 'MFLAC', 'MGG'],
    color: 'bg-green-50 border-green-200 text-green-800',
  },
  {
    name: '酷狗音乐',
    icon: '🎸',
    formats: ['KGM', 'VPR'],
    color: 'bg-blue-50 border-blue-200 text-blue-800',
  },
  {
    name: '酷我音乐',
    icon: '🎤',
    formats: ['KWM'],
    color: 'bg-orange-50 border-orange-200 text-orange-800',
  },
  {
    name: '咪咕音乐',
    icon: '📻',
    formats: ['MG3D'],
    color: 'bg-purple-50 border-purple-200 text-purple-800',
  },
  {
    name: '汽水音乐',
    icon: '🥤',
    formats: ['SODA', 'MDL'],
    color: 'bg-cyan-50 border-cyan-200 text-cyan-800',
  },
];
</script>

<template>
  <div class="bg-white rounded-xl p-6 shadow-sm">
    <h2 class="text-lg font-semibold text-gray-800 mb-4">支持的音乐平台</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div
        v-for="platform in platforms"
        :key="platform.name"
        class="border rounded-lg p-3"
        :class="platform.color"
      >
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xl">{{ platform.icon }}</span>
          <span class="font-medium">{{ platform.name }}</span>
        </div>
        <div class="text-xs opacity-75">
          {{ platform.formats.join('、') }}
        </div>
      </div>
    </div>
    <p class="text-xs text-gray-500 mt-4">
      将加密音乐文件拖拽到下方，即可解密并转换为 MP3/FLAC/WAV 格式
    </p>
  </div>
</template>
