<template>
  <div class="wizard-page">
    <div class="wizard-container">
      <el-button class="back-btn" text @click="goBack">
        <el-icon><ArrowLeft /></el-icon> 返回首页
      </el-button>

      <h1 class="wizard-title">新建小说项目</h1>

      <el-steps :active="currentStep" align-center class="wizard-steps">
        <el-step title="基本设定" />
        <el-step title="结构规划" />
        <el-step title="AI 生成" />
      </el-steps>

      <div class="step-content">
        <!-- Step 1: Genre & Concept -->
        <div v-show="currentStep === 0" class="step-panel">
          <h2>选择题材与核心卖点</h2>

          <el-form label-position="top">
            <el-form-item label="项目名称">
              <el-input v-model="form.projectName" placeholder="输入项目名称" />
            </el-form-item>

            <el-form-item label="小说题材">
              <el-radio-group v-model="form.genre" class="genre-group">
                <el-radio-button v-for="g in genres" :key="g.value" :value="g.value">
                  {{ g.label }}
                </el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="核心卖点 / 概念">
              <el-input
                v-model="form.concept"
                type="textarea"
                :rows="5"
                placeholder="描述你的小说核心概念、主要卖点、独特设定...&#10;&#10;例如：主角穿越到修仙世界，拥有一个可以复制他人功法的金手指，在各大宗门之间周旋，最终成为一代大帝。"
              />
            </el-form-item>
          </el-form>
        </div>

        <!-- Step 2: Structure -->
        <div v-show="currentStep === 1" class="step-panel">
          <h2>结构规划</h2>

          <el-form label-position="top">
            <el-form-item label="保存位置">
              <div class="dir-select">
                <el-input v-model="form.parentDir" readonly placeholder="选择项目保存目录" />
                <el-button @click="selectDir">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item label="规划卷数">
              <el-input-number v-model="form.volumes" :min="1" :max="30" />
              <span class="volume-hint">（每卷约 30-70 章，每章约 3000-5000 字）</span>
            </el-form-item>

            <el-form-item label="各大阶段描述（可选）">
              <el-input
                v-model="form.stageDesc"
                type="textarea"
                :rows="4"
                placeholder="描述各卷/阶段的大致主题和走向（可选，AI 会参考此信息生成更符合预期的大纲）"
              />
            </el-form-item>
          </el-form>
        </div>

        <!-- Step 3: AI Generation -->
        <div v-show="currentStep === 2" class="step-panel">
          <h2>AI 正在生成项目框架</h2>

          <div class="generation-status">
            <el-icon v-if="generating" class="is-loading"><Loading /></el-icon>
            <span>{{ statusText }}</span>
          </div>

          <div class="generated-content" ref="contentRef">
            <div v-html="renderedContent" class="markdown-body"></div>
          </div>
        </div>
      </div>

      <div class="step-actions">
        <el-button v-if="currentStep > 0 && currentStep < 2" @click="currentStep--">上一步</el-button>
        <el-button v-if="currentStep === 0" type="primary" @click="nextStep" :disabled="!canNext0">
          下一步
        </el-button>
        <el-button v-if="currentStep === 1" type="primary" @click="startGeneration" :disabled="!canNext1">
          开始生成
        </el-button>
        <el-button v-if="currentStep === 2 && !generating" type="primary" @click="openProject">
          打开项目
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project.js'
import { useAiStore } from '../stores/ai.js'
import { ArrowLeft, Loading } from '@element-plus/icons-vue'
import { marked } from 'marked'

const GENRES = [
  { value: 'xuanhuan', label: '玄幻' },
  { value: 'xianxia', label: '仙侠' },
  { value: 'wuxia', label: '武侠' },
  { value: 'dushi', label: '都市' },
  { value: 'lishi', label: '历史' },
  { value: 'junshi', label: '军事' },
  { value: 'kehuan', label: '科幻' },
  { value: 'youxi', label: '游戏' },
  { value: 'kongbu', label: '恐怖' },
  { value: 'yanqing', label: '言情' },
  { value: 'qihuan', label: '奇幻' },
  { value: 'tongren', label: '同人' },
]

const router = useRouter()
const projectStore = useProjectStore()
const aiStore = useAiStore()

const currentStep = ref(0)
const generating = ref(false)
const statusText = ref('')
const generatedContent = ref('')
const contentRef = ref(null)

const form = ref({
  projectName: '',
  genre: '',
  concept: '',
  parentDir: '',
  volumes: 3,
  stageDesc: ''
})

const genres = GENRES

const canNext0 = computed(() =>
  form.value.projectName && form.value.genre && form.value.concept
)

const canNext1 = computed(() =>
  form.value.parentDir && form.value.volumes > 0
)

const renderedContent = computed(() => {
  if (!generatedContent.value) return ''
  return marked(generatedContent.value)
})

let cleanupChunk = null
let cleanupEnd = null
let cleanupError = null

onMounted(() => {
  cleanupChunk = window.electronAPI.onStreamChunk((chunk) => {
    generatedContent.value += chunk
    nextTick(() => {
      if (contentRef.value) {
        contentRef.value.scrollTop = contentRef.value.scrollHeight
      }
    })
  })

  cleanupEnd = window.electronAPI.onStreamEnd(() => {
    generating.value = false
    statusText.value = '生成完成！'
  })

  cleanupError = window.electronAPI.onStreamError((error) => {
    generating.value = false
    statusText.value = `生成失败: ${error}`
  })
})

onUnmounted(() => {
  cleanupChunk?.()
  cleanupEnd?.()
  cleanupError?.()
})

function goBack() {
  router.push('/')
}

function nextStep() {
  currentStep.value++
}

async function selectDir() {
  const dir = await window.electronAPI.selectDir()
  if (dir) {
    form.value.parentDir = dir
  }
}

async function startGeneration() {
  currentStep.value = 2
  generating.value = true
  generatedContent.value = ''
  statusText.value = 'AI 正在构思小说框架...'

  try {
    // First create the project structure
    const project = await window.electronAPI.createProject({
      parentDir: form.value.parentDir,
      projectName: form.value.projectName,
      volumes: form.value.volumes,
      genre: form.value.genre
    })

    projectStore.setProject(project.path, project.name, project.genre)

    // Then generate the structure content with AI
    const genreLabel = genres.find(g => g.value === form.value.genre)?.label || form.value.genre
    const concept = form.value.stageDesc
      ? `${form.value.concept}\n\n各阶段描述：${form.value.stageDesc}`
      : form.value.concept

    await window.electronAPI.generateStructure({
      genre: genreLabel,
      concept,
      volumes: form.value.volumes
    })

    // After generation, parse and save content to project files
    await saveGeneratedContent(project.path)
  } catch (error) {
    generating.value = false
    statusText.value = `错误: ${error.message}`
  }
}

async function saveGeneratedContent(projectPath) {
  const content = generatedContent.value
  if (!content) return

  // Parse sections from generated content
  const sections = {
    world: extractSection(content, '世界观设定'),
    characters: extractSection(content, '人物档案'),
    outline: extractSection(content, '总大纲'),
    timeline: extractSection(content, '时间线')
  }

  // Save to meta files
  if (sections.world) {
    await window.electronAPI.writeFile(
      `${projectPath}/meta/world.md`,
      `# 世界观设定\n\n${sections.world}`
    )
  }
  if (sections.characters) {
    await window.electronAPI.writeFile(
      `${projectPath}/meta/characters.md`,
      `# 人物档案\n\n${sections.characters}`
    )
  }
  if (sections.outline) {
    await window.electronAPI.writeFile(
      `${projectPath}/meta/outline.md`,
      `# 总大纲\n\n${sections.outline}`
    )
  }
  if (sections.timeline) {
    await window.electronAPI.writeFile(
      `${projectPath}/meta/timeline.md`,
      `# 时间线\n\n${sections.timeline}`
    )
  }

  // Save volume outlines
  const volOutlines = extractVolumeOutlines(content, form.value.volumes)
  for (let i = 0; i < volOutlines.length; i++) {
    const volDir = `vol${String(i + 1).padStart(2, '0')}`
    await window.electronAPI.writeFile(
      `${projectPath}/volumes/${volDir}/outline.md`,
      `# 第${i + 1}卷 大纲\n\n${volOutlines[i]}`
    )
  }
}

function extractSection(content, sectionName) {
  const regex = new RegExp(`##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`)
  const match = content.match(regex)
  return match ? match[1].trim() : ''
}

function extractVolumeOutlines(content, volumeCount) {
  const outlines = []
  for (let i = 1; i <= volumeCount; i++) {
    const regex = new RegExp(`###?\\s*第${i}卷[\\s\\S]*?(?=###?\\s*第${i + 1}卷|$)`)
    const match = content.match(regex)
    outlines.push(match ? match[0].trim() : `第${i}卷大纲待补充`)
  }
  return outlines
}

function openProject() {
  router.push('/editor')
}
</script>

<style scoped>
.wizard-page {
  height: 100vh;
  display: flex;
  justify-content: center;
  padding: 30px;
  overflow-y: auto;
}

.wizard-container {
  width: 100%;
  max-width: 800px;
}

.back-btn {
  margin-bottom: 20px;
  color: var(--text-secondary);
}

.wizard-title {
  font-size: 28px;
  margin-bottom: 30px;
  text-align: center;
}

.wizard-steps {
  margin-bottom: 40px;
}

.step-content {
  min-height: 400px;
}

.step-panel h2 {
  font-size: 20px;
  margin-bottom: 24px;
}

.genre-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dir-select {
  display: flex;
  gap: 8px;
  width: 100%;
}

.dir-select .el-input {
  flex: 1;
}

.volume-hint {
  margin-left: 12px;
  color: var(--text-secondary);
  font-size: 13px;
}

.generation-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--accent);
}

.generated-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  max-height: 500px;
  overflow-y: auto;
  line-height: 1.8;
}

.markdown-body h2 {
  color: var(--accent);
  margin-top: 24px;
  margin-bottom: 12px;
}

.markdown-body h3 {
  color: var(--text-primary);
  margin-top: 16px;
  margin-bottom: 8px;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
  padding-bottom: 30px;
}
</style>
