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
        <el-button text :disabled="!projectStore.currentContent" @click="handlePolish">
          <el-icon><Edit /></el-icon> 优化文笔
        </el-button>
        <el-button text :disabled="!projectStore.currentContent" @click="detectAi">
          <el-icon><View /></el-icon> AI 检测
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button text @click="handleSyncCheck">
          <el-icon><Refresh /></el-icon> 同步检查
        </el-button>
        <el-button text @click="handleExport">
          <el-icon><Download /></el-icon> 导出TXT
        </el-button>
        <el-button text @click="handleExportEpub">
          <el-icon><Reading /></el-icon> 导出EPUB
        </el-button>
        <el-button text @click="togglePreview">
          <el-icon><View /></el-icon> {{ showPreview ? '编辑' : '预览' }}
        </el-button>
        <el-button text @click="toggleRightPanel">
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
          @add-chapter="handleAddChapter"
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
      <template v-if="showRightPanel">
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
  HomeFilled, DocumentChecked, MagicStick, EditPen, Edit,
  Document, View, ChatDotRound, Download, Refresh, Reading
} from '@element-plus/icons-vue'

const router = useRouter()
const projectStore = useProjectStore()
const aiStore = useAiStore()

const showPreview = ref(false)
const showRightPanel = ref(true)
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

async function handleExport() {
  const { ElMessage } = await import('element-plus')
  try {
    const filePath = await window.electronAPI.exportTxt(projectStore.projectPath)
    if (filePath) {
      ElMessage({ message: `已导出到 ${filePath}`, type: 'success', duration: 4000 })
    }
  } catch (e) {
    ElMessage({ message: `导出失败: ${e.message}`, type: 'error' })
  }
}

async function handleExportEpub() {
  const { ElMessage } = await import('element-plus')
  try {
    const filePath = await window.electronAPI.exportEpub(projectStore.projectPath)
    if (filePath) {
      ElMessage({ message: `EPUB 已导出到 ${filePath}`, type: 'success', duration: 4000 })
    }
  } catch (e) {
    ElMessage({ message: `导出 EPUB 失败: ${e.message}`, type: 'error' })
  }
}

async function handleAddChapter(volNode) {
  try {
    await window.electronAPI.addChapter(volNode.path)
    await refreshTree()
  } catch (e) {
    console.error('新建章节失败:', e)
  }
}

function togglePreview() {
  showPreview.value = !showPreview.value
}

function toggleRightPanel() {
  showRightPanel.value = !showRightPanel.value
}

async function detectAi() {
  if (!projectStore.currentContent) return

  const { ElMessageBox, ElLoading } = await import('element-plus')
  const loading = ElLoading.service({ text: 'AI 检测中...' })

  try {
    const result = await window.electronAPI.detectAiContent(projectStore.currentContent)
    loading.close()

    const parts = result.aiLikeParts.map((p, i) =>
      `<div style="margin: 8px 0; padding: 8px; background: #2a2a3e; border-radius: 4px;">
        <div style="color: #e94560; font-weight: bold;">片段 ${i + 1}:</div>
        <div style="margin: 4px 0;">${p.text.slice(0, 100)}...</div>
        <div style="color: #999; font-size: 12px;">原因: ${p.reason}</div>
      </div>`
    ).join('')

    const suggestions = result.suggestions.map(s => `<li>${s}</li>`).join('')

    ElMessageBox.alert(
      `<div style="max-height: 400px; overflow-y: auto;">
        <div style="font-size: 16px; margin-bottom: 12px;">
          <span style="color: #e94560; font-weight: bold;">AI 程度: ${result.score}%</span>
        </div>
        <div style="margin-bottom: 12px; color: #ccc;">${result.analysis}</div>
        ${result.aiLikeParts.length > 0 ? `<div style="margin: 12px 0;"><strong>疑似 AI 片段:</strong>${parts}</div>` : ''}
        ${result.suggestions.length > 0 ? `<div style="margin: 12px 0;"><strong>改进建议:</strong><ul style="margin: 8px 0; padding-left: 20px;">${suggestions}</ul></div>` : ''}
      </div>`,
      'AI 内容检测结果',
      { dangerouslyUseHTMLString: true, confirmButtonText: '知道了' }
    )
  } catch (e) {
    loading.close()
    const { ElMessage } = await import('element-plus')
    ElMessage.error(`检测失败: ${e.message}`)
  }
}

async function handlePolish() {
  const { ElMessageBox, ElMessage } = await import('element-plus')

  try {
    const { value: text } = await ElMessageBox.prompt('请输入要优化的文本', '优化文笔', {
      confirmButtonText: '开始优化',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '粘贴要优化的文本...'
    })

    if (!text) return

    aiStore.startStream()
    await window.electronAPI.polishText(text)
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(`润色失败: ${e.message}`)
    }
  }
}

async function handleSyncCheck() {
  const { ElLoading, ElMessage } = await import('element-plus')
  let loading = null
  let cleanupProgress = null

  try {
    loading = ElLoading.service({ text: '检查同步中... 0/0' })

    cleanupProgress = window.electronAPI.onSyncProgress((data) => {
      if (loading) {
        loading.setText(`检查同步中... ${data.current}/${data.total}`)
      }
    })

    const result = await window.electronAPI.syncCheck(projectStore.projectPath)

    if (cleanupProgress) cleanupProgress()
    if (loading) loading.close()

    if (result.errors.length > 0) {
      ElMessage.warning(`检查完成：${result.checked} 个章节，同步 ${result.synced} 个，${result.errors.length} 个失败`)
    } else if (result.synced > 0) {
      ElMessage.success(`检查完成：${result.checked} 个章节，同步 ${result.synced} 个`)
    } else {
      ElMessage.info(`检查完成：${result.checked} 个章节，全部已同步`)
    }
  } catch (e) {
    if (cleanupProgress) cleanupProgress()
    if (loading) loading.close()
    ElMessage.error(`同步检查失败: ${e.message}`)
  }
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
  background: var(--bg-primary);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  height: 52px;
  flex-shrink: 0;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-sm);
}

.toolbar-left, .toolbar-center, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar .el-button {
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.toolbar .el-button:hover {
  background: var(--accent-light);
  color: var(--accent-hover);
}

.project-name {
  font-size: 15px;
  font-weight: 600;
  margin-left: 12px;
  color: var(--text-primary);
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
  box-shadow: var(--shadow-sm);
}

.center-panel {
  flex: 1;
  overflow: hidden;
  min-width: 300px;
  background: var(--bg-primary);
}

.right-panel {
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
  box-shadow: var(--shadow-sm);
}

.resize-handle {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  flex-shrink: 0;
  transition: all 0.2s ease;
  position: relative;
}

.resize-handle:hover {
  background: var(--accent);
}

.resize-handle::after {
  content: '';
  position: absolute;
  top: 0;
  left: -2px;
  right: -2px;
  bottom: 0;
}

.preview-pane {
  padding: 32px;
  overflow-y: auto;
  height: 100%;
  line-height: 1.8;
  background: var(--bg-primary);
}

.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  margin-top: 24px;
  margin-bottom: 12px;
  color: var(--text-primary);
  font-weight: 600;
}

.markdown-body p {
  margin-bottom: 16px;
  text-indent: 2em;
  color: var(--text-primary);
}
</style>
