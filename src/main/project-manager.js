const fs = require('fs')
const path = require('path')
const { app } = require('electron')

class ProjectManager {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'recent-projects.json')
  }

  getRecentProjects() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'))
        // Filter out projects that no longer exist
        return data.filter(p => fs.existsSync(p.path))
      }
    } catch (e) {
      console.error('Failed to read recent projects:', e)
    }
    return []
  }

  addRecentProject(project) {
    const projects = this.getRecentProjects()
    // Remove existing entry if present
    const filtered = projects.filter(p => p.path !== project.path)
    // Add to front
    filtered.unshift({
      name: project.name,
      path: project.path,
      genre: project.genre || '',
      wordCount: project.wordCount || 0,
      lastOpened: Date.now()
    })
    // Keep only the last 10
    const trimmed = filtered.slice(0, 10)
    this._save(trimmed)
    return trimmed
  }

  openProject(projectPath) {
    const configFile = path.join(projectPath, 'project.json')
    if (!fs.existsSync(configFile)) {
      throw new Error('不是有效的小说项目目录：缺少 project.json')
    }

    const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
    config.path = projectPath
    config.lastOpened = Date.now()

    // Update config file
    fs.writeFileSync(configFile, JSON.stringify({ ...config, path: undefined, lastOpened: config.lastOpened }, null, 2))

    // Count words
    const fileManager = require('./file-manager')
    config.wordCount = fileManager.getProjectWordCount(projectPath)

    // Update recent list
    this.addRecentProject(config)

    return config
  }

  importProject(projectPath) {
    // Check if it's a valid novel project
    const configFile = path.join(projectPath, 'project.json')
    if (fs.existsSync(configFile)) {
      return this.openProject(projectPath)
    }

    // Check for expected directory structure
    const hasVolumes = fs.existsSync(path.join(projectPath, 'volumes'))
    const hasMeta = fs.existsSync(path.join(projectPath, 'meta'))

    if (!hasVolumes && !hasMeta) {
      throw new Error('所选目录不是有效的小说项目')
    }

    // Create project.json for imported project
    const name = path.basename(projectPath)
    const config = {
      name,
      createdAt: Date.now(),
      lastOpened: Date.now(),
      genre: '',
      imported: true
    }
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))

    config.path = projectPath
    const fileManager = require('./file-manager')
    config.wordCount = fileManager.getProjectWordCount(projectPath)

    this.addRecentProject(config)
    return config
  }

  _save(projects) {
    const dir = path.dirname(this.configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(this.configPath, JSON.stringify(projects, null, 2))
  }
}

module.exports = new ProjectManager()
