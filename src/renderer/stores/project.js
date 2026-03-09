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
    // Remove Markdown syntax but keep content
    let clean = text
      .replace(/^#{1,6}\s+/gm, '')  // 标题符号
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // 加粗
      .replace(/\*([^*]+)\*/g, '$1')  // 斜体
      .replace(/__([^_]+)__/g, '$1')  // 加粗
      .replace(/_([^_]+)_/g, '$1')  // 斜体
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // 链接保留文本
      .replace(/`([^`]+)`/g, '$1')  // 行内代码保留内容
      .replace(/```[\s\S]*?```/g, '')  // 代码块删除
      .replace(/^[-*+]\s+/gm, '')  // 列表符号
      .replace(/^\d+\.\s+/gm, '')  // 有序列表符号
      .replace(/^\s*>\s+/gm, '')  // 引用符号
    // Count Chinese characters only
    const chinese = (clean.match(/[\u4e00-\u9fff]/g) || []).length
    return chinese
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
