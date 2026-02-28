<template>
  <div class="markdown-editor" ref="editorContainer"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'

const props = defineProps({
  content: { type: String, default: '' }
})

const emit = defineEmits(['update'])

const editorContainer = ref(null)
let editorView = null
let isExternalUpdate = false

function createEditor() {
  if (!editorContainer.value) return

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && !isExternalUpdate) {
      emit('update', update.state.doc.toString())
    }
  })

  const state = EditorState.create({
    doc: props.content || '',
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      drawSelection(),
      history(),
      markdown(),
      oneDark,
      syntaxHighlighting(defaultHighlightStyle),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      updateListener,
      EditorView.lineWrapping,
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '15px'
        },
        '.cm-scroller': {
          fontFamily: "'Cascadia Code', 'Microsoft YaHei', monospace",
          lineHeight: '1.8',
          padding: '12px 0'
        },
        '.cm-content': {
          padding: '0 24px'
        },
        '.cm-gutters': {
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          color: 'var(--text-secondary)'
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(233, 69, 96, 0.05)'
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'rgba(233, 69, 96, 0.1)'
        }
      })
    ]
  })

  editorView = new EditorView({
    state,
    parent: editorContainer.value
  })
}

onMounted(() => {
  createEditor()
})

onUnmounted(() => {
  if (editorView) {
    editorView.destroy()
  }
})

watch(() => props.content, (newContent) => {
  if (!editorView) return

  const currentContent = editorView.state.doc.toString()
  if (currentContent !== newContent) {
    isExternalUpdate = true
    editorView.dispatch({
      changes: {
        from: 0,
        to: currentContent.length,
        insert: newContent || ''
      }
    })
    isExternalUpdate = false
  }
})
</script>

<style scoped>
.markdown-editor {
  height: 100%;
  overflow: hidden;
}

:deep(.cm-editor) {
  height: 100%;
}

:deep(.cm-scroller) {
  overflow: auto;
}
</style>
