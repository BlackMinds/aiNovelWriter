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
  padding: 2px 12px;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  height: 24px;
  font-size: 12px;
  flex-shrink: 0;
}

.status-left, .status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
}

.file-name {
  color: var(--text-primary);
}

.file-name.dirty {
  color: var(--warning);
}

.ai-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
}

.ai-dot.active {
  background: var(--success);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
