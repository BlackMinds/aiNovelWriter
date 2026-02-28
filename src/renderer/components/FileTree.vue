<template>
  <div class="file-tree">
    <div class="tree-header">
      <span class="tree-title">项目文件</span>
      <div class="tree-actions">
        <el-button text size="small" @click="$emit('refresh')">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <el-tree
      ref="treeRef"
      :data="tree"
      :props="treeProps"
      node-key="path"
      :highlight-current="true"
      :expand-on-click-node="true"
      :default-expand-all="true"
      @node-click="handleNodeClick"
      @node-contextmenu="handleContextMenu"
    >
      <template #default="{ node, data }">
        <span class="tree-node">
          <el-icon class="node-icon" v-if="data.isDir"><Folder /></el-icon>
          <el-icon class="node-icon" v-else><Document /></el-icon>
          <span class="node-label">{{ data.label }}</span>
        </span>
      </template>
    </el-tree>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="menu-item" @click="handleMenuAction('createFile')">
        <el-icon><DocumentAdd /></el-icon> 新建文件
      </div>
      <div class="menu-item" @click="handleMenuAction('createDir')">
        <el-icon><FolderAdd /></el-icon> 新建目录
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="handleMenuAction('rename')">
        <el-icon><Edit /></el-icon> 重命名
      </div>
      <div class="menu-item danger" @click="handleMenuAction('delete')">
        <el-icon><Delete /></el-icon> 删除
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Refresh, Folder, Document, DocumentAdd, FolderAdd, Edit, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  tree: { type: Array, default: () => [] },
  currentFile: { type: String, default: '' },
  projectPath: { type: String, default: '' }
})

const emit = defineEmits(['select', 'refresh', 'create-file', 'create-dir', 'delete', 'rename'])

const treeRef = ref(null)
const treeProps = {
  children: 'children',
  label: 'label',
  isLeaf: 'isLeaf'
}

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  node: null
})

function handleNodeClick(data) {
  if (!data.isDir) {
    emit('select', data)
  }
}

function handleContextMenu(event, data) {
  event.preventDefault()
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    node: data
  }
}

function handleMenuAction(action) {
  const node = contextMenu.value.node
  contextMenu.value.visible = false

  if (!node) return

  const parentPath = node.isDir ? node.path : node.path.replace(/\\/g, '/').split('/').slice(0, -1).join('/')

  switch (action) {
    case 'createFile':
      emit('create-file', parentPath)
      break
    case 'createDir':
      emit('create-dir', parentPath)
      break
    case 'rename':
      emit('rename', node)
      break
    case 'delete':
      emit('delete', node)
      break
  }
}

function hideContextMenu() {
  contextMenu.value.visible = false
}

onMounted(() => {
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
})
</script>

<style scoped>
.file-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
}

.tree-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.el-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  --el-tree-node-content-height: 28px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.node-icon {
  font-size: 14px;
  color: var(--text-secondary);
}

.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Context Menu */
.context-menu {
  position: fixed;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px;
  min-width: 160px;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-primary);
}

.menu-item:hover {
  background: rgba(233, 69, 96, 0.1);
}

.menu-item.danger {
  color: var(--accent);
}

.menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}
</style>
