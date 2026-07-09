export const yakitSoftMode = ['classic', 'securityExpert', 'scan'] as const
export type YakitSoftMode = (typeof yakitSoftMode)[number]

export type Lange = 'zh' | 'zh-TW' | 'en'

export const SUPPORTED_LANGS: Lange[] = ['zh', 'zh-TW', 'en']

export const normalizeLang = (lang?: string): Lange => {
  return SUPPORTED_LANGS.includes(lang as Lange) ? (lang as Lange) : 'zh'
}

interface SoftwareBasicsI18n {
  workspace: string
  draggerHelp: string
  selectWorkspace: string
  workspacePlaceholder: string
  sizeLabel: string
  calculating: string
  openDir: string
  themeTitle: string
  themeLight: string
  themeDark: string
  modeTitle: string
  langTitle: string
  langZh: string
  langZhTW: string
  langEn: string
  confirm: string
  autoStart: string
  exit: string
  switchTitle: string
  switchNewDir: string
  switchExistDir: string
  ok: string
  cancel: string
}

const MODE_I18N: Record<Lange, Record<YakitSoftMode, { label: string; desc: string }>> = {
  zh: {
    classic: {
      label: '经典模式',
      desc: '该模式就是之前的菜单首页布局',
    },
    securityExpert: {
      label: '安全专家模式',
      desc: '将菜单栏和固定页面调整为渗透常用功能，整体更简洁明了',
    },
    scan: {
      label: '扫描模式',
      desc: '将菜单栏和首页重点放在扫描性功能上，方便快捷',
    },
  },
  'zh-TW': {
    classic: {
      label: '經典模式',
      desc: '該模式就是之前的選單首頁布局',
    },
    securityExpert: {
      label: '安全專家模式',
      desc: '將選單列和固定頁面調整為滲透常用功能，整體更簡潔明了',
    },
    scan: {
      label: '掃描模式',
      desc: '將選單列和首頁重點放在掃描性功能上，方便快捷',
    },
  },
  en: {
    classic: {
      label: 'Classic Mode',
      desc: 'Uses the previous menu and home page layout',
    },
    securityExpert: {
      label: 'Security Expert Mode',
      desc: 'Focuses the menu and pinned pages on common penetration workflows',
    },
    scan: {
      label: 'Scan Mode',
      desc: 'Focuses the menu and home page on scanning features',
    },
  },
}

export const I18N_TEXTS: Record<Lange, SoftwareBasicsI18n> = {
  zh: {
    workspace: '工作空间',
    draggerHelp: '可将文件夹拖入框内或点击',
    selectWorkspace: '选择工作空间',
    workspacePlaceholder: '输入或选择工作空间路径',
    sizeLabel: '占用空间',
    calculating: '计算中...',
    openDir: '打开目录',
    themeTitle: '请选择您的主题',
    themeLight: '亮色',
    themeDark: '暗色',
    modeTitle: '模式设置',
    langTitle: '语言设置',
    langZh: 'Chinese（Simplified）简体中文',
    langZhTW: 'Chinese（Traditional）繁体中文',
    langEn: 'English',
    confirm: '确定并启动',
    autoStart: '下次自动启动',
    exit: '退出',
    switchTitle: '切换工作空间',
    switchNewDir: '目标目录不存在，将自动创建新目录。确定要切换到新工作空间吗？',
    switchExistDir: '确定要切换到该工作空间吗？切换后将重新启动应用。',
    ok: '确定',
    cancel: '取消',
  },
  'zh-TW': {
    workspace: '工作空間',
    draggerHelp: '可將資料夾拖入框內或點擊',
    selectWorkspace: '選擇工作空間',
    workspacePlaceholder: '輸入或選擇工作空間路徑',
    sizeLabel: '占用空間',
    calculating: '計算中...',
    openDir: '打開目錄',
    themeTitle: '請選擇您的主題',
    themeLight: '亮色',
    themeDark: '暗色',
    modeTitle: '模式設定',
    langTitle: '語言設定',
    langZh: 'Chinese（Simplified）简体中文',
    langZhTW: 'Chinese（Traditional）繁體中文',
    langEn: 'English',
    confirm: '確定並啟動',
    autoStart: '下次自動啟動',
    exit: '退出',
    switchTitle: '切換工作空間',
    switchNewDir: '目標目錄不存在，將自動建立新目錄。確定要切換到新工作空間嗎？',
    switchExistDir: '確定要切換到該工作空間嗎？切換後將重新啟動應用。',
    ok: '確定',
    cancel: '取消',
  },
  en: {
    workspace: 'Workspace',
    draggerHelp: 'Drag a folder here or click',
    selectWorkspace: 'Select Workspace',
    workspacePlaceholder: 'Enter or select a workspace path',
    sizeLabel: 'Size',
    calculating: 'Calculating...',
    openDir: 'Open Folder',
    themeTitle: 'Choose Your Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    modeTitle: 'Mode Settings',
    langTitle: 'Language',
    langZh: 'Chinese (Simplified)',
    langZhTW: 'Chinese (Traditional)',
    langEn: 'English',
    confirm: 'Confirm & Start',
    autoStart: 'Auto-start next time',
    exit: 'Exit',
    switchTitle: 'Switch Workspace',
    switchNewDir: 'The target folder does not exist and will be created automatically. Switch to the new workspace?',
    switchExistDir: 'Switch to this workspace? The app will restart after switching.',
    ok: 'OK',
    cancel: 'Cancel',
  },
}

export const getSoftwareBasicsTexts = (lang: Lange): SoftwareBasicsI18n => {
  return I18N_TEXTS[lang] || I18N_TEXTS.zh
}

export const getModeConfig = (lang: Lange): Record<YakitSoftMode, { label: string; desc: string }> => {
  return MODE_I18N[lang] || MODE_I18N.zh
}
