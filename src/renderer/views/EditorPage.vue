<template>
  <div class="editor-page">
    <!-- Top toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button text @click="goHome">
          <el-icon><HomeFilled /></el-icon>
        </el-button>
        <span class="project-name">{{ projectStore.projectName }}</span>
      </div>
      <div class="toolbar-center">
        <el-button text :disabled="!projectStore.currentFile" @click="saveFile">
          <el-icon><DocumentChecked /></el-icon> 保存
        </el-button>
        <el-button text :disabled="!isChapterFile" @click="generateChapter">
          <el-icon><MagicStick /></el-icon> AI 写作
        </el-button>
        <el-button text :disabled="!isChapterFile" @click="continueWriting">
          <el-icon><EditPen /></el-icon> 续写
        </el-button>
        <el-button text :disabled="!isChapterFile" @click="summarizeChapter">
          <el-icon><Document /></el-icon> 生成摘要
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button text @click="togglePreview">
          <el-icon><View /></el-icon> {{ showPreview ? '编辑' : '预览' }}
        </el-button>
        <el-button text @click="toggleAiPanel">
          <el-icon><ChatDotRound /></el-icon> AI 面板
        </el-button>
      </div>
    </div>

    <!-- Main content -->
    <div class="main-content">
      <!-- Left: File tree -->
      <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
        <FileTree
          :tree="projectStore.fileTree"
          :current-file="projectStore.currentFile"
          :project-path="projectStore.projectPath"
          @select="handleFileSelect"
          @refresh="refreshTree"
          @create-file="handleCreateFile"
          @create-dir="handleCreateDir"
          @delete="handleDelete"
          @rename="handleRename"
        />
      </div>

      <div class="resize-handle" @mousedown="startResize('left', $event)"></div>

      <!-- Center: Editor / Preview -->
      <div class="center-panel">
        <div v-if="showPreview" class="preview-pane">
          <div v-html="previewHtml" class="markdown-body"></div>
        </div>
        <MarkdownEditor
          v-else
          :content="projectStore.currentContent"
          @update="handleContentUpdate"
        />
      </div>

      <!-- Right: AI Panel (collapsible) -->
      <template v-if="showAiPanel">
        <div class="resize-handle" @mousedown="startResize('right', $event)"></div>
        <div class="right-panel" :style="{ width: rightPanelWidth + 'px' }">
          <AiPanel
            :project-path="projectStore.projectPath"
            :current-file="projectStore.currentFile"
            :current-content="projectStore.currentContent"
            @insert="handleAiInsert"
          />
        </div>
      </template>
    </div>

    <!-- Status bar -->
    <StatusBar
      :file-name="currentFileName"
      :word-count="projectStore.wordCount"
      :is-dirty="projectStore.isDirty"
      :ai-status="aiStore.statusMessage"
      :is-chapter="isChapterFile"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project.js'
import { useAiStore } from '../stores/ai.js'
import { marked } from 'marked'
import FileTree from '../components/FileTree.vue'
import MarkdownEditor from '../components/MarkdownEditor.vue'
import AiPanel from '../components/AiPanel.vue'
import StatusBar from '../components/StatusBar.vue'
import {
  HomeFilled, DocumentChecked, MagicStick, EditPen,
  Document, View, ChatDotRound
} from '@element-plus/icons-vue'

const router = useRouter()
const projectStore = useProjectStore()
const aiStore = useAiStore()

const showPreview = ref(false)
const showAiPanel = ref(true)
const leftPanelWidth = ref(220)
const rightPanelWidth = ref(320)

const currentFileName = computed(() => {
  if (!projectStore.currentFile) return '未选择文件'
  const parts = projectStore.currentFile.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1]
})

const isChapterFile = computed(() => {
  return currentFileName.value.startsWith('ch') && currentFileName.value.endsWith('.md')
})

const previewHtml = computed(() => {
  return marked(projectStore.currentContent || '')
})

let autoSaveTimer = null
let cleanupChunk = null
let cleanupEnd = null
let cleanupError = null

onMounted(async () => {
  if (!projectStore.projectPath) {
    router.push('/')
    return
  }

  await refreshTree()

  // Set up auto-save
  autoSaveTimer = setInterval(() => {
    if (projectStore.isDirty && projectStore.currentFile) {
      saveFile()
    }
  }, 30000) // Auto-save every 30 seconds

  // AI streaming listeners
  cleanupChunk = window.electronAPI.onStreamChunk((chunk) => {
    aiStore.appendChunk(chunk)
  })

  cleanupEnd = window.electronAPI.onStreamEnd(() => {
    aiStore.endStream()
  })

  cleanupError = window.electronAPI.onStreamError((error) => {
    aiStore.setError(error)
  })

  // Keyboard shortcuts
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (autoSaveTimer) clearInterval(autoSaveTimer)
  cleanupChunk?.()
  cleanupEnd?.()
  cleanupError?.()
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    saveFile()
  }
}

async function refreshTree() {
  try {
    const tree = await window.electronAPI.getFileTree(projectStore.projectPath)
    projectStore.setFileTree(tree)
  } catch (e) {
    console.error('Failed to refresh tree:', e)
  }
}

async function handleFileSelect(node) {
  if (node.isDir) return

  // Save current file first if dirty
  if (projectStore.isDirty && projectStore.currentFile) {
    await saveFile()
  }

  try {
    const content = await window.electronAPI.readFile(node.path)
    projectStore.setCurrentFile(node.path, content)
  } catch (e) {
    console.error('Failed to read file:', e)
  }
}

function handleContentUpdate(content) {
  projectStore.updateContent(content)
}

async function saveFile() {
  if (!projectStore.currentFile || !projectStore.isDirty) return

  try {
    await window.electronAPI.writeFile(projectStore.currentFile, projectStore.currentContent)
    projectStore.markSaved()
  } catch (e) {
    console.error('Failed to save file:', e)
  }
}

async function generateChapter() {
  if (!isChapterFile.value || aiStore.isStreaming) return

  aiStore.startStream()
  try {
    await window.electronAPI.generateChapter({
      projectPath: projectStore.projectPath,
      filePath: projectStore.currentFile,
      instruction: '请根据大纲撰写本章内容。'
    })
  } catch (e) {
    aiStore.setError(e.message)
  }
}

async function continueWriting() {
  if (!isChapterFile.value || aiStore.isStreaming) return

  aiStore.startStream()
  try {
    await window.electronAPI.continueWriting({
      projectPath: projectStore.projectPath,
      filePath: projectStore.currentFile
    })
  } catch (e) {
    aiStore.setError(e.message)
  }
}

async function summarizeChapter() {
  if (!isChapterFile.value || aiStore.isStreaming) return

  // Save first
  await saveFile()

  aiStore.startStream()
  try {
    await window.electronAPI.summarize({
      projectPath: projectStore.projectPath,
      filePath: projectStore.currentFile
    })
  } catch (e) {
    aiStore.setError(e.message)
  }
}

function handleAiInsert(content) {
  const updated = projectStore.currentContent + '\n\n' + content
  projectStore.updateContent(updated)
}

async function handleCreateFile(parentPath) {
  const { ElMessageBox } = await import('element-plus')
  try {
    const { value } = await ElMessageBox.prompt('输入文件名（如 ch005.md）', '新建文件', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    if (value) {
      const filePath = `${parentPath}/${value}`
      await window.electronAPI.createFile(filePath, `# ${value.replace('.md', '')}\n\n`)
      await refreshTree()
    }
  } catch { /* cancelled */ }
}

async function handleCreateDir(parentPath) {
  const { ElMessageBox } = await import('element-plus')
  try {
    const { value } = await ElMessageBox.prompt('输入目录名', '新建目录', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    if (value) {
      await window.electronAPI.createDir(`${parentPath}/${value}`)
      await refreshTree()
    }
  } catch { /* cancelled */ }
}

async function handleDelete(node) {
  const { ElMessageBox } = await import('element-plus')
  try {
    await ElMessageBox.confirm(`确定删除 ${node.label}？`, '确认删除', {
      type: 'warning'
    })
    await window.electronAPI.deleteFile(node.path)
    if (projectStore.currentFile === node.path) {
      projectStore.setCurrentFile('', '')
    }
    await refreshTree()
  } catch { /* cancelled */ }
}

async function handleRename(node) {
  const { ElMessageBox } = await import('element-plus')
  try {
    const { value } = await ElMessageBox.prompt('输入新名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: node.label
    })
    if (value && value !== node.label) {
      const dir = node.path.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
      const newPath = `${dir}/${value}`
      await window.electronAPI.renameFile(node.path, newPath)
      if (projectStore.currentFile === node.path) {
        projectStore.setCurrentFile(newPath, projectStore.currentContent)
      }
      await refreshTree()
    }
  } catch { /* cancelled */ }
}

function togglePreview() {
  showPreview.value = !showPreview.value
}

function toggleAiPanel() {
  showAiPanel.value = !showAiPanel.value
}

function goHome() {
  if (projectStore.isDirty) {
    saveFile()
  }
  projectStore.clearProject()
  router.push('/')
}

// Resize handling
let resizing = null
function startResize(panel, e) {
  resizing = { panel, startX: e.clientX }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

function onResize(e) {
  if (!resizing) return
  const dx = e.clientX - resizing.startX
  if (resizing.panel === 'left') {
    leftPanelWidth.value = Math.max(150, Math.min(400, leftPanelWidth.value + dx))
  } else {
    rightPanelWidth.value = Math.max(200, Math.min(500, rightPanelWidth.value - dx))
  }
  resizing.startX = e.clientX
}

function stopResize() {
  resizing = null
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

// Watch for AI stream content to insert into editor
watch(() => aiStore.isStreaming, (streaming) => {
  if (!streaming && aiStore.streamContent && isChapterFile.value) {
    // When streaming ends, offer to insert content
  }
})
</script>

<style scoped>
.editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  height: 42px;
  flex-shrink: 0;
}

.toolbar-left, .toolbar-center, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  margin-left: 8px;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.left-panel {
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.center-panel {
  flex: 1;
  overflow: hidden;
  min-width: 300px;
}

.right-panel {
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
}

.resize-handle {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  flex-shrink: 0;
  transition: background 0.2s;
}

.resize-handle:hover {
  background: var(--accent);
}

.preview-pane {
  padding: 24px;
  overflow-y: auto;
  height: 100%;
  line-height: 1.8;
}

.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  margin-top: 20px;
  margin-bottom: 10px;
}

.markdown-body p {
  margin-bottom: 12px;
  text-indent: 2em;
}
</style>
