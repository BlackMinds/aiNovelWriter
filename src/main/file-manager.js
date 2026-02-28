const fs = require('fs')
const path = require('path')

class FileManager {
  readFile(filePath) {
    return fs.readFileSync(filePath, 'utf-8')
  }

  writeFile(filePath, content) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  createFile(filePath, content = '') {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  deleteFile(filePath) {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true })
      } else {
        fs.unlinkSync(filePath)
      }
    }
  }

  renameFile(oldPath, newPath) {
    fs.renameSync(oldPath, newPath)
  }

  createDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  }

  getFileTree(rootPath) {
    if (!fs.existsSync(rootPath)) return []
    return this._buildTree(rootPath, rootPath)
  }

  _buildTree(dirPath, rootPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const nodes = []

    // Sort: directories first, then files, alphabetically
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })

    for (const entry of sorted) {
      // Skip hidden files and context directory
      if (entry.name.startsWith('.')) continue

      const fullPath = path.join(dirPath, entry.name)
      const relativePath = path.relative(rootPath, fullPath)

      if (entry.isDirectory()) {
        nodes.push({
          label: entry.name,
          path: fullPath,
          relativePath,
          isDir: true,
          children: this._buildTree(fullPath, rootPath)
        })
      } else if (entry.name.endsWith('.md')) {
        nodes.push({
          label: entry.name,
          path: fullPath,
          relativePath,
          isDir: false,
          isLeaf: true
        })
      }
    }

    return nodes
  }

  createProjectStructure(projectPath, projectName, volumes = 3) {
    // Create directories
    this.createDir(path.join(projectPath, 'meta'))
    this.createDir(path.join(projectPath, 'context'))

    for (let i = 1; i <= volumes; i++) {
      const volDir = path.join(projectPath, 'volumes', `vol${String(i).padStart(2, '0')}`)
      this.createDir(volDir)
    }

    // Create default meta files
    this.createFile(
      path.join(projectPath, 'meta', 'world.md'),
      `# 世界观设定\n\n## 世界背景\n\n（在此描述小说的世界背景设定）\n\n## 力量体系\n\n（在此描述力量/修炼/魔法体系）\n\n## 地理环境\n\n（在此描述主要地点和地理环境）\n\n## 社会结构\n\n（在此描述社会组织、势力分布）\n`
    )

    this.createFile(
      path.join(projectPath, 'meta', 'characters.md'),
      `# 人物档案\n\n## 主角\n\n- **姓名**：\n- **年龄**：\n- **性格**：\n- **背景**：\n- **目标**：\n\n## 重要配角\n\n### 配角1\n\n- **姓名**：\n- **与主角关系**：\n- **性格**：\n\n## 反派\n\n### 反派1\n\n- **姓名**：\n- **目标**：\n- **能力**：\n`
    )

    this.createFile(
      path.join(projectPath, 'meta', 'outline.md'),
      `# 总大纲\n\n## 核心冲突\n\n（在此描述小说的核心矛盾和冲突）\n\n## 故事线\n\n### 主线\n\n（在此描述主线剧情走向）\n\n### 副线\n\n（在此描述重要副线）\n\n## 各卷概要\n\n### 第一卷\n\n**主题**：\n**概要**：\n\n### 第二卷\n\n**主题**：\n**概要**：\n`
    )

    this.createFile(
      path.join(projectPath, 'meta', 'timeline.md'),
      `# 时间线\n\n## 前史\n\n| 时间 | 事件 |\n|------|------|\n| | |\n\n## 正文时间线\n\n### 第一卷\n\n| 章节 | 时间 | 事件 |\n|------|------|------|\n| | | |\n`
    )

    this.createFile(
      path.join(projectPath, 'context', 'current.md'),
      `# 当前写作上下文\n\n## 当前进度\n\n- 当前卷：第一卷\n- 当前章：第1章\n\n## 近期要点\n\n（AI 自动维护的写作上下文信息）\n`
    )

    // Create volume files
    for (let i = 1; i <= volumes; i++) {
      const volDir = path.join(projectPath, 'volumes', `vol${String(i).padStart(2, '0')}`)
      this.createFile(
        path.join(volDir, 'summary.md'),
        `# 第${i}卷 摘要\n\n（写作过程中由 AI 自动生成和更新）\n`
      )
      this.createFile(
        path.join(volDir, 'outline.md'),
        `# 第${i}卷 大纲\n\n## 本卷主题\n\n\n## 章节规划\n\n### 第1章\n**标题**：\n**概要**：\n`
      )
      this.createFile(
        path.join(volDir, 'ch001.md'),
        `# 第${i}卷 第1章\n\n`
      )
    }

    // Create project config
    const config = {
      name: projectName,
      createdAt: Date.now(),
      lastOpened: Date.now(),
      volumes,
      genre: ''
    }
    this.writeFile(
      path.join(projectPath, 'project.json'),
      JSON.stringify(config, null, 2)
    )

    return config
  }

  getProjectWordCount(projectPath) {
    let total = 0
    const volumesDir = path.join(projectPath, 'volumes')
    if (!fs.existsSync(volumesDir)) return 0

    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(fullPath)
        } else if (entry.name.startsWith('ch') && entry.name.endsWith('.md')) {
          const content = fs.readFileSync(fullPath, 'utf-8')
          const chinese = (content.match(/[\u4e00-\u9fff]/g) || []).length
          const english = (content.match(/[a-zA-Z]+/g) || []).length
          total += chinese + english
        }
      }
    }
    walk(volumesDir)
    return total
  }
}

module.exports = new FileManager()
