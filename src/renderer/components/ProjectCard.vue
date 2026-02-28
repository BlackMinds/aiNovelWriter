<template>
  <el-card class="project-card" shadow="hover" @click="$emit('open', project)">
    <div class="card-header">
      <h3 class="project-name">{{ project.name }}</h3>
      <el-tag size="small" v-if="project.genre">{{ project.genre }}</el-tag>
    </div>
    <div class="card-meta">
      <span class="meta-item">
        <el-icon><Document /></el-icon>
        {{ formatWordCount(project.wordCount || 0) }} 字
      </span>
      <span class="meta-item">
        <el-icon><Clock /></el-icon>
        {{ formatTime(project.lastOpened) }}
      </span>
    </div>
    <div class="card-path">{{ project.path }}</div>
  </el-card>
</template>

<script setup>
import { Document, Clock } from '@element-plus/icons-vue'

defineProps({
  project: {
    type: Object,
    required: true
  }
})

defineEmits(['open'])

function formatWordCount(count) {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  }
  return count
}

function formatTime(timestamp) {
  if (!timestamp) return '未知'
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 86400000) {
    return '今天'
  } else if (diff < 172800000) {
    return '昨天'
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}
</script>

<style scoped>
.project-card {
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
}

.project-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
}

.card-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-path {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
