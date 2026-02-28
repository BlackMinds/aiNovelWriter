import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAiStore = defineStore('ai', () => {
  const isStreaming = ref(false)
  const streamContent = ref('')
  const statusMessage = ref('')
  const apiKeySet = ref(false)

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

  return {
    isStreaming, streamContent, statusMessage, apiKeySet,
    startStream, appendChunk, endStream, setError, clearStream
  }
})
