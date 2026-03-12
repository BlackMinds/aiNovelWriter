<template>
  <div class="status-bar">
    <div class="status-left">
      <span class="status-item file-name" :class="{ dirty: isDirty }">
        {{ fileName }}{{ isDirty ? ' *' : '' }}
      </span>
      <span class="status-item" v-if="isChapter">
        <el-icon><Document /></el-icon>
        章节文件
      </span>
    </div>
    <div class="status-right">
      <span class="status-item" v-if="aiStatus">
        <span class="ai-dot" :class="{ active: aiStatus.includes('生成') }"></span>
        {{ aiStatus }}
      </span>
      <span class="status-item">
        {{ formatWordCount(wordCount) }} 字
      </span>
    </div>
  </div>
</template>

<script setup>
import { Document } from '@element-plus/icons-vue'

defineProps({
  fileName: { type: String, default: '' },
  wordCount: { type: Number, default: 0 },
  isDirty: { type: Boolean, default: false },
  aiStatus: { type: String, default: '' },
  isChapter: { type: Boolean, default: false }
})

function formatWordCount(count) {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  }
  return count
}
</script>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  height: 28px;
  font-size: 13px;
  flex-shrink: 0;
  backdrop-filter: blur(10px);
}

.status-left, .status-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-weight: 500;
}

.file-name {
  color: var(--text-primary);
}

.file-name.dirty {
  color: var(--accent);
}

.ai-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
}

.ai-dot.active {
  background: var(--success);
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 8px var(--success);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}
</style>
