<template>
  <div class="home-page">
    <!-- Animated background -->
    <div class="bg-gradient"></div>
    <div class="bg-grid"></div>

    <el-button class="theme-toggle" circle @click="settingsStore.toggleTheme()">
      <el-icon><Sunny v-if="settingsStore.theme === 'dark'" /><Moon v-else /></el-icon>
    </el-button>

    <div class="hero-section">
      <div class="hero-badge">✨ AI 驱动创作</div>
      <h1 class="title">
        <span class="title-line">开启你的</span>
        <span class="title-highlight">小说创作之旅</span>
      </h1>
      <p class="subtitle">智能辅助，无限灵感，让每个故事都精彩绝伦</p>

      <div class="action-cards">
        <div class="action-card" @click="handleNewProject">
          <div class="card-icon">📝</div>
          <h3>新建项目</h3>
          <p>从零开始创作你的小说世界</p>
        </div>
        <div class="action-card" @click="handleImportProject">
          <div class="card-icon">📂</div>
          <h3>导入项目</h3>
          <p>继续你未完成的故事</p>
        </div>
      </div>

      <div class="ai-config-section">
        <div class="config-header">
          <div class="config-icon">🤖</div>
          <h3>AI 配置</h3>
        </div>

        <div class="config-grid">
          <div class="config-item">
            <label>选择模型</label>
            <el-select
              v-model="selectedModel"
              placeholder="选择 AI 模型"
              class="model-select"
              @change="saveModel"
            >
              <el-option-group label="Google Gemini">
                <el-option label="Gemini 2.5 Pro" value="gemini-2.5-pro" />
                <el-option label="Gemini 2.5 Flash" value="gemini-2.5-flash" />
                <el-option label="Gemini 3.1 Pro Preview" value="gemini-3.1-pro-preview" />
                <el-option label="Gemini 3 Flash Preview" value="gemini-3-flash-preview" />
              </el-option-group>
              <el-option-group label="智谱 GLM">
                <el-option label="GLM-5" value="glm-5" />
                <el-option label="GLM-5 Plus" value="glm-5-plus" />
                <el-option label="GLM-5 Flash" value="glm-5-flash" />
                <el-option label="GLM-5 Air" value="glm-5-air" />
              </el-option-group>
            </el-select>
          </div>

          <div class="config-item">
            <label>API Key</label>
            <el-input
              v-model="apiKeyInput"
              :type="showKey ? 'text' : 'password'"
              :placeholder="apiKeyPlaceholder"
              class="api-key-input"
              @change="saveApiKey"
            >
              <template #prefix>
                <el-icon><Key /></el-icon>
              </template>
              <template #suffix>
                <el-icon style="cursor: pointer" @click="showKey = !showKey">
                  <View v-if="!showKey" />
                  <Hide v-else />
                </el-icon>
              </template>
            </el-input>
            <span v-if="aiStore.apiKeySet" class="key-status">✓ 已配置</span>
          </div>
        </div>

        <div class="editor-settings">
          <label>编辑器设置</label>
          <div class="settings-row">
            <el-select v-model="settingsStore.editorFontSize" size="small">
              <el-option label="12px" :value="12" />
              <el-option label="14px" :value="14" />
              <el-option label="16px" :value="16" />
              <el-option label="18px" :value="18" />
              <el-option label="20px" :value="20" />
            </el-select>
            <el-select v-model="settingsStore.editorFontFamily" size="small">
              <el-option label="等宽字体" value="monospace" />
              <el-option label="微软雅黑" value="'Microsoft YaHei', sans-serif" />
              <el-option label="宋体" value="SimSun, serif" />
              <el-option label="黑体" value="SimHei, sans-serif" />
            </el-select>
          </div>
        </div>
      </div>
    </div>

    <div class="recent-section" v-if="projectStore.recentProjects.length > 0">
      <h2 class="section-title">最近项目</h2>
      <div class="project-grid">
        <ProjectCard
          v-for="project in projectStore.recentProjects"
          :key="project.path"
          :project="project"
          @open="handleOpenProject"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project.js'
import { useAiStore } from '../stores/ai.js'
import { useSettingsStore } from '../stores/settings.js'
import ProjectCard from '../components/ProjectCard.vue'
import { Plus, FolderOpened, Key, View, Hide, Sunny, Moon } from '@element-plus/icons-vue'

const router = useRouter()
const projectStore = useProjectStore()
const aiStore = useAiStore()
const settingsStore = useSettingsStore()

const apiKeyInput = ref('')
const showKey = ref(false)
const selectedModel = ref('gemini-2.5-flash')

const apiKeyPlaceholder = computed(() => {
  return selectedModel.value.startsWith('glm')
    ? '输入智谱 GLM API Key'
    : '输入 Google Gemini API Key'
})

onMounted(async () => {
  try {
    const projects = await window.electronAPI.getRecentProjects()
    projectStore.setRecentProjects(projects)
  } catch (e) {
    console.error('Failed to load recent projects:', e)
  }

  try {
    const model = await window.electronAPI.getModel()
    if (model) {
      selectedModel.value = model
      aiStore.selectedModel = model
    }
  } catch (e) {
    console.error('Failed to load model:', e)
  }

  try {
    const key = await window.electronAPI.getApiKey()
    if (key) {
      apiKeyInput.value = key
      aiStore.apiKeySet = true
    }
  } catch (e) {
    console.error('Failed to load API key:', e)
  }
})

async function saveApiKey() {
  if (apiKeyInput.value) {
    await window.electronAPI.setApiKey(apiKeyInput.value)
    aiStore.apiKeySet = true
  }
}

async function saveModel() {
  await window.electronAPI.setModel(selectedModel.value)
  aiStore.selectedModel = selectedModel.value
  apiKeyInput.value = ''
  aiStore.apiKeySet = false
  try {
    const key = await window.electronAPI.getApiKey()
    if (key) {
      apiKeyInput.value = key
      aiStore.apiKeySet = true
    }
  } catch (e) {
    console.error('Failed to load API key:', e)
  }
}

function handleNewProject() {
  router.push('/wizard')
}

async function handleImportProject() {
  try {
    const result = await window.electronAPI.importProject()
    if (result) {
      projectStore.setProject(result.path, result.name, result.genre)
      router.push('/editor')
    }
  } catch (e) {
    console.error('Failed to import project:', e)
  }
}

async function handleOpenProject(project) {
  try {
    const result = await window.electronAPI.openProject(project.path)
    if (result) {
      projectStore.setProject(result.path, result.name, result.genre)
      router.push('/editor')
    }
  } catch (e) {
    console.error('Failed to open project:', e)
  }
}
</script>

<style scoped>
.home-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  overflow-y: auto;
  position: relative;
}

.bg-gradient {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
              var(--bg-primary);
  z-index: 0;
}

.bg-grid {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  z-index: 0;
}

.theme-toggle {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 100;
  background: rgba(30, 30, 50, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
}

.hero-section {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 900px;
  width: 100%;
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-badge {
  display: inline-block;
  padding: 8px 20px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 50px;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
}

.title {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.title-line {
  font-size: 32px;
  font-weight: 300;
  color: var(--text-secondary);
  letter-spacing: 2px;
}

.title-highlight {
  font-size: 64px;
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -2px;
  line-height: 1.1;
}

.subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 48px;
  font-weight: 300;
  line-height: 1.6;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 48px;
}

.action-card {
  padding: 32px 24px;
  background: rgba(30, 30, 50, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.action-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.action-card:hover {
  transform: translateY(-8px);
  border-color: var(--accent);
  box-shadow: 0 12px 40px rgba(99, 102, 241, 0.2);
}

.action-card:hover::before {
  opacity: 1;
}

.card-icon {
  font-size: 48px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.action-card h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
}

.action-card p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  position: relative;
  z-index: 1;
}

.ai-config-section {
  width: 100%;
  padding: 32px;
  background: rgba(30, 30, 50, 0.4);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  margin-bottom: 48px;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.config-icon {
  font-size: 32px;
}

.config-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.config-grid {
  display: grid;
  gap: 20px;
  margin-bottom: 20px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.model-select, .api-key-input {
  width: 100%;
}

.key-status {
  color: var(--success);
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.editor-settings {
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.editor-settings label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 12px;
}

.settings-row {
  display: flex;
  gap: 12px;
}

.recent-section {
  width: 100%;
  max-width: 1100px;
  position: relative;
  z-index: 1;
  animation: fadeIn 1s ease-out 0.3s both;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.section-title {
  font-size: 28px;
  margin-bottom: 28px;
  color: var(--text-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title::before {
  content: '📚';
  font-size: 32px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}
</style>
