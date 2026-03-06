import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref(localStorage.getItem('theme') || 'dark')
  const editorFontSize = ref(parseInt(localStorage.getItem('editorFontSize')) || 16)
  const editorFontFamily = ref(localStorage.getItem('editorFontFamily') || 'monospace')

  watch(theme, (val) => {
    localStorage.setItem('theme', val)
    applyTheme(val)
  })

  watch(editorFontSize, (val) => {
    localStorage.setItem('editorFontSize', val)
  })

  watch(editorFontFamily, (val) => {
    localStorage.setItem('editorFontFamily', val)
  })

  function applyTheme(themeName) {
    const root = document.documentElement
    if (themeName === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff')
      root.style.setProperty('--bg-secondary', '#f5f5f5')
      root.style.setProperty('--text-primary', '#1a1a1a')
      root.style.setProperty('--text-secondary', '#666666')
      root.style.setProperty('--border-color', '#e0e0e0')
      root.style.setProperty('--accent', '#e94560')
      root.style.setProperty('--success', '#52c41a')
    } else {
      root.style.setProperty('--bg-primary', '#1a1a2e')
      root.style.setProperty('--bg-secondary', '#16213e')
      root.style.setProperty('--text-primary', '#e4e4e4')
      root.style.setProperty('--text-secondary', '#a0a0a0')
      root.style.setProperty('--border-color', '#2a2a3e')
      root.style.setProperty('--accent', '#e94560')
      root.style.setProperty('--success', '#52c41a')
    }
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  applyTheme(theme.value)

  return {
    theme,
    editorFontSize,
    editorFontFamily,
    toggleTheme,
    applyTheme
  }
})
