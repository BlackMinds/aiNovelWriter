import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAiStore = defineStore('ai', () => {
  const isStreaming = ref(false)
  const streamContent = ref('')
  const statusMessage = ref('')
  const apiKeySet = ref(false)
  const selectedModel = ref('gemini-2.5-flash')

  function startStream() {
    isStreaming.value = true
    streamContent.value = ''
    statusMessage.value = 'AI 正在生成...'
  }

  function appendChunk(chunk) {
    streamContent.value += chunk
  }

  function endStream() {
    isStreaming.value = false
    statusMessage.value = 'AI 生成完成'
  }

  function setError(error) {
    isStreaming.value = false
    statusMessage.value = `错误: ${error}`
  }

  function clearStream() {
    streamContent.value = ''
    statusMessage.value = ''
  }

  async function changeModel(model) {
    await window.electronAPI.setModel(model)
    selectedModel.value = model
  }

  return {
    isStreaming, streamContent, statusMessage, apiKeySet, selectedModel,
    startStream, appendChunk, endStream, setError, clearStream, changeModel
  }
})
