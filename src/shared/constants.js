// IPC Channel Names
export const IPC = {
  // File operations
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_GET_TREE: 'file:getTree',
  FILE_CREATE: 'file:create',
  FILE_DELETE: 'file:delete',
  FILE_RENAME: 'file:rename',
  FILE_CREATE_DIR: 'file:createDir',

  // Project operations
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_GET_RECENT: 'project:getRecent',
  PROJECT_IMPORT: 'project:import',
  PROJECT_SELECT_DIR: 'project:selectDir',

  // AI operations
  AI_GENERATE_STRUCTURE: 'ai:generateStructure',
  AI_GENERATE_CHAPTER: 'ai:generateChapter',
  AI_CONTINUE_WRITING: 'ai:continueWriting',
  AI_SUMMARIZE: 'ai:summarize',
  AI_CUSTOM_PROMPT: 'ai:customPrompt',
  AI_SET_KEY: 'ai:setKey',
  AI_GET_KEY: 'ai:getKey',

  // AI streaming
  AI_STREAM_CHUNK: 'ai:stream-chunk',
  AI_STREAM_END: 'ai:stream-end',
  AI_STREAM_ERROR: 'ai:stream-error',

  // Dialog
  DIALOG_SELECT_DIR: 'dialog:selectDir',
}

// Novel genres
export const GENRES = [
  { value: 'xuanhuan', label: '玄幻' },
  { value: 'xianxia', label: '仙侠' },
  { value: 'wuxia', label: '武侠' },
  { value: 'dushi', label: '都市' },
  { value: 'lishi', label: '历史' },
  { value: 'junshi', label: '军事' },
  { value: 'kehuan', label: '科幻' },
  { value: 'youxi', label: '游戏' },
  { value: 'kongbu', label: '恐怖' },
  { value: 'yanqing', label: '言情' },
  { value: 'qihuan', label: '奇幻' },
  { value: 'tongren', label: '同人' },
]

// Default context token limits
export const CONTEXT_LIMITS = {
  SYSTEM_PROMPT: 2000,
  WORLD_SETTING: 5000,
  CHARACTERS: 5000,
  TOTAL_OUTLINE: 3000,
  VOLUME_OUTLINE: 3000,
  VOLUME_SUMMARY: 2000,
  PREV_CHAPTER_SUMMARIES: 5000,
  RECENT_CHAPTERS: 30000,
  CURRENT_CHAPTER: 10000,
  USER_INSTRUCTION: 1000,
}
