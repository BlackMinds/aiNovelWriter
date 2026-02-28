import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProjectStore = defineStore('project', () => {
  const projectPath = ref('')
  const projectName = ref('')
  const genre = ref('')
  const currentFile = ref('')
  const currentContent = ref('')
  const fileTree = ref([])
  const recentProjects = ref([])
  const isDirty = ref(false)
  const wordCount = ref(0)
  const totalWordCount = ref(0)

  const isProjectOpen = computed(() => !!projectPath.value)

  function setProject(path, name, g) {
    projectPath.value = path
    projectName.value = name
    genre.value = g || ''
  }

  function setCurrentFile(path, content) {
    currentFile.value = path
    currentContent.value = content
    isDirty.value = false
    wordCount.value = countWords(content)
  }

  function updateContent(content) {
    currentContent.value = content
    isDirty.value = true
    wordCount.value = countWords(content)
  }

  function setFileTree(tree) {
    fileTree.value = tree
  }

  function setRecentProjects(projects) {
    recentProjects.value = projects
  }

  function markSaved() {
    isDirty.value = false
  }

  function countWords(text) {
    if (!text) return 0
    // Count Chinese characters + English words
    const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const english = (text.match(/[a-zA-Z]+/g) || []).length
    return chinese + english
  }

  function clearProject() {
    projectPath.value = ''
    projectName.value = ''
    genre.value = ''
    currentFile.value = ''
    currentContent.value = ''
    fileTree.value = []
    isDirty.value = false
    wordCount.value = 0
  }

  return {
    projectPath, projectName, genre, currentFile, currentContent,
    fileTree, recentProjects, isDirty, wordCount, totalWordCount,
    isProjectOpen,
    setProject, setCurrentFile, updateContent, setFileTree,
    setRecentProjects, markSaved, clearProject, countWords
  }
})
