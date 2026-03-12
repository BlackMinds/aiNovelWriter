<template>
  <div class="ai-panel">
    <div class="panel-header">
      <span class="panel-title">AI 助手</span>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <el-button
        size="small"
        @click="handleAction('generate')"
        :disabled="aiStore.isStreaming || !isChapter"
      >
        生成本章
      </el-button>
      <el-button
        size="small"
        @click="handleAction('continue')"
        :disabled="aiStore.isStreaming || !isChapter"
      >
        续写
      </el-button>
      <!-- <el-button
        size="small"
        @click="handleAction('summarize')"
        :disabled="aiStore.isStreaming || !isChapter"
      >
        生成摘要
      </el-button> -->
    </div>

    <!-- Custom prompt -->
    <div class="prompt-section">
      <el-input
        v-model="customPrompt"
        type="textarea"
        :rows="3"
        placeholder="输入自定义指令...&#10;例如：帮我修改第三段对话，让语气更紧张"
        resize="none"
      />
      <el-button
        type="primary"
        size="small"
        class="send-btn"
        @click="sendCustomPrompt"
        :disabled="aiStore.isStreaming || !customPrompt"
      >
        发送
      </el-button>
    </div>

    <!-- AI Output -->
    <div class="output-section" ref="outputRef">
      <div v-if="aiStore.isStreaming" class="streaming-indicator">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>AI 正在生成...</span>
      </div>

      <div v-if="aiStore.streamContent" class="ai-output">
        <div v-html="renderedOutput" class="markdown-body"></div>
      </div>

      <div v-if="!aiStore.isStreaming && !aiStore.streamContent" class="empty-state">
        <p>点击上方按钮或输入自定义指令</p>
        <p>AI 将根据上下文信息辅助写作</p>
      </div>
    </div>

    <!-- Insert button -->
    <div v-if="aiStore.streamContent && !aiStore.isStreaming" class="action-bar">
      <el-button type="primary" size="small" @click="insertContent">
        插入到编辑器
      </el-button>
      <el-button size="small" @click="copyContent">
        复制
      </el-button>
      <el-button size="small" @click="aiStore.clearStream()">
        清除
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useAiStore } from '../stores/ai.js'
import { marked } from 'marked'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  projectPath: { type: String, default: '' },
  currentFile: { type: String, default: '' },
  currentContent: { type: String, default: '' }
})

const emit = defineEmits(['insert'])

const aiStore = useAiStore()
const customPrompt = ref('')
const outputRef = ref(null)
let cleanupBackgroundDone = null

onMounted(() => {
  cleanupBackgroundDone = window.electronAPI.onBackgroundDone((msg) => {
    ElMessage({ message: msg, type: 'success', duration: 3000 })
  })
})

onUnmounted(() => {
  cleanupBackgroundDone?.()
})

const isChapter = computed(() => {
  if (!props.currentFile) return false
  const name = props.currentFile.replace(/\\/g, '/').split('/').pop()
  return name.startsWith('ch') && name.endsWith('.md')
})

const renderedOutput = computed(() => {
  return marked(aiStore.streamContent || '')
})

watch(() => aiStore.streamContent, () => {
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
  })
})

async function handleAction(action) {
  aiStore.startStream()

  try {
    switch (action) {
      case 'generate':
        await window.electronAPI.generateChapter({
          projectPath: props.projectPath,
          filePath: props.currentFile,
          instruction: '请根据大纲撰写本章内容。'
        })
        break
      case 'continue':
        await window.electronAPI.continueWriting({
          projectPath: props.projectPath,
          filePath: props.currentFile
        })
        break
      case 'summarize':
        await window.electronAPI.summarize({
          projectPath: props.projectPath,
          filePath: props.currentFile
        })
        break
    }
  } catch (e) {
    aiStore.setError(e.message)
  }
}

async function sendCustomPrompt() {
  if (!customPrompt.value || aiStore.isStreaming) return

  aiStore.startStream()

  try {
    await window.electronAPI.customPrompt({
      systemPrompt: '你是一位专业的中文网络小说作家助手。请根据用户的指令和当前上下文信息来辅助写作。',
      userMessage: customPrompt.value,
      context: props.currentContent
    })
    customPrompt.value = ''
  } catch (e) {
    aiStore.setError(e.message)
  }
}

async function onModelChange(model) {
  await aiStore.changeModel(model)
}

function insertContent() {
  emit('insert', aiStore.streamContent)
  aiStore.clearStream()
}

async function copyContent() {
  try {
    await navigator.clipboard.writeText(aiStore.streamContent)
  } catch {
    // Fallback: create a textarea for copy
    const ta = document.createElement('textarea')
    ta.value = aiStore.streamContent
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}
</script>

<style scoped>
.ai-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-tertiary);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title::before {
  content: '✨';
  font-size: 16px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.quick-actions .el-button {
  flex: 1;
  min-width: 80px;
}

.prompt-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.send-btn {
  margin-top: 10px;
  width: 100%;
  border-radius: var(--radius-sm);
}

.output-section {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-primary);
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--accent);
  margin-bottom: 16px;
  font-size: 14px;
  padding: 12px;
  background: var(--accent-light);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--accent);
}

.ai-output {
  font-size: 14px;
  line-height: 1.8;
  padding: 12px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.empty-state {
  text-align: center;
  color: var(--text-secondary);
  padding: 60px 20px;
  font-size: 14px;
}

.empty-state p {
  margin-bottom: 12px;
  line-height: 1.6;
}

.action-bar {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.markdown-body {
  word-break: break-word;
  color: var(--text-primary);
}

.markdown-body :deep(p) {
  margin-bottom: 12px;
}
</style>
