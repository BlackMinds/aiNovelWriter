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
  transition: all 0.3s ease;
  border-radius: var(--radius-md);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  overflow: hidden;
  position: relative;
}

.project-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent), #a855f7);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent);
  box-shadow: var(--shadow-md);
}

.project-card:hover::before {
  opacity: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.project-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
  color: var(--text-secondary);
  font-size: 14px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-path {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}
</style>
