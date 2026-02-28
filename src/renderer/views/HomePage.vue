<template>
  <div class="home-page">
    <div class="hero-section">
      <h1 class="title">AI Novel Writer</h1>
      <p class="subtitle">AI 驱动的长篇小说写作工具</p>

      <div class="action-buttons">
        <el-button type="primary" size="large" @click="handleNewProject">
          <el-icon><Plus /></el-icon>
          新建项目
        </el-button>
        <el-button size="large" @click="handleImportProject">
          <el-icon><FolderOpened /></el-icon>
          导入项目
        </el-button>
      </div>

      <div class="api-key-section">
        <el-input
          v-model="apiKeyInput"
          :type="showKey ? 'text' : 'password'"
          placeholder="输入 Claude API Key"
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
        <span v-if="aiStore.apiKeySet" class="key-status">API Key 已设置</span>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project.js'
import { useAiStore } from '../stores/ai.js'
import ProjectCard from '../components/ProjectCard.vue'
import { Plus, FolderOpened, Key, View, Hide } from '@element-plus/icons-vue'

const router = useRouter()
const projectStore = useProjectStore()
const aiStore = useAiStore()

const apiKeyInput = ref('')
const showKey = ref(false)

onMounted(async () => {
  try {
    const projects = await window.electronAPI.getRecentProjects()
    projectStore.setRecentProjects(projects)
  } catch (e) {
    console.error('Failed to load recent projects:', e)
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
  padding: 60px 40px 40px;
  overflow-y: auto;
}

.hero-section {
  text-align: center;
  margin-bottom: 60px;
}

.title {
  font-size: 48px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 12px;
}

.subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 40px;
}

.action-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 30px;
}

.action-buttons .el-button {
  padding: 12px 32px;
  font-size: 16px;
}

.api-key-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.api-key-input {
  width: 400px;
}

.key-status {
  color: var(--success);
  font-size: 12px;
}

.recent-section {
  width: 100%;
  max-width: 900px;
}

.section-title {
  font-size: 20px;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
</style>
