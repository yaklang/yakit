import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn, useClickAway } from 'ahooks'
import { Tooltip, Checkbox } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { yakitApp, yakitCache, yakitShell } from '@/utils/electronBridge'
import styles from './WorkspaceSelector.module.scss'

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

const langConfigToI18n: Record<string, string> = {
  'zh-CN': 'zh',
  'en-US': 'en',
}

const I18N_CACHE_KEY = 'I18n_Yakit'

const i18nTexts = {
  'zh-CN': {
    workspace: '工作空间',
    inputPlaceholder: '输入或选择工作空间路径',
    browse: '浏览',
    sizeLabel: '占用空间',
    calculating: '计算中...',
    openDir: '打开目录',
    language: '语言 / Language',
    confirm: '确定并启动',
    autoStartLabel: '下次自动启动',
    switchTitle: '切换工作空间',
    switchNewDir: '目标目录不存在，将自动创建新目录。确定要切换到新工作空间吗？',
    switchExistDir: '确定要切换到该工作空间吗？切换后将重新启动应用。',
    ok: '确定',
    cancel: '取消',
  },
  'en-US': {
    workspace: 'Workspace',
    inputPlaceholder: 'Enter or select workspace path',
    browse: 'Browse',
    sizeLabel: 'Size',
    calculating: 'Calculating...',
    openDir: 'Open',
    language: '语言 / Language',
    confirm: 'Confirm & Start',
    autoStartLabel: 'Auto-start next time',
    switchTitle: 'Switch Workspace',
    switchNewDir: 'Target directory does not exist and will be created. Switch to the new workspace?',
    switchExistDir: 'Switch to this workspace? The app will restart.',
    ok: 'OK',
    cancel: 'Cancel',
  },
}

export interface WorkspaceSelectorProps {
  onConfirm: () => void
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = React.memo((props) => {
  const { onConfirm } = props

  const [currentPath, setCurrentPath] = useState<string>('')
  const [originalHome, setOriginalHome] = useState<string>('')
  const [history, setHistory] = useState<string[]>([])
  const [sizeMap, setSizeMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [calculating, setCalculating] = useState<boolean>(false)
  const [language, setLanguage] = useState<string>('zh-CN')
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)
  const [autoStart, setAutoStart] = useState<boolean>(false)
  const [countdown, setCountdown] = useState<number>(0)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputWrapperRef = useRef<HTMLDivElement>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStartTriggeredRef = useRef<boolean>(false)

  useClickAway(() => {
    setDropdownOpen(false)
  }, [dropdownRef, inputWrapperRef])

  const t = useMemo(() => {
    return i18nTexts[language] || i18nTexts['zh-CN']
  }, [language])

  useEffect(() => {
    loadConfig()
  }, [])

  // 自动启动倒计时逻辑
  const startCountdown = useMemoizedFn(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
    }
    setCountdown(3)
    autoStartTriggeredRef.current = false
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
          }
          // 触发自动启动
          if (!autoStartTriggeredRef.current) {
            autoStartTriggeredRef.current = true
            setTimeout(() => doConfirm(), 0)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  })

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    setCountdown(0)
  }, [])

  // 用户任何交互都取消自动启动倒计时
  const handleUserInteraction = useMemoizedFn(() => {
    if (countdown > 0) {
      cancelCountdown()
    }
  })

  const loadConfig = useMemoizedFn(async () => {
    try {
      const config = await yakitApp.getYakitHomeConfig()
      const home = config.currentHome || ''
      setCurrentPath(home)
      setOriginalHome(home)
      setHistory(config.workspaceHistory || [])
      setLanguage(config.language || 'zh-CN')
      setAutoStart(config.autoStart || false)
      setLoading(false)

      const allPaths = [...new Set([home, ...(config.workspaceHistory || [])].filter(Boolean))]
      if (allPaths.length > 0) {
        fetchSizes(allPaths)
      }

      // 如果开启了自动启动且路径存在，启动倒计时
      if (config.autoStart && home) {
        startCountdown()
      }
    } catch (e) {
      setLoading(false)
    }
  })

  const fetchSizes = useMemoizedFn(async (paths: string[]) => {
    setCalculating(true)
    const map: Record<string, number> = {}
    for (const p of paths) {
      try {
        const size = await yakitApp.getDirSize(p)
        map[p] = size
      } catch (_) {
        map[p] = 0
      }
    }
    setSizeMap((prev) => ({ ...prev, ...map }))
    setCalculating(false)
  })

  const handleBrowse = useMemoizedFn(async () => {
    handleUserInteraction()
    const dir = await yakitApp.selectDirectory()
    if (dir) {
      setCurrentPath(dir)
      setDropdownOpen(false)
      fetchSizes([dir])
    }
  })

  const handleSelectHistory = useMemoizedFn((path: string) => {
    handleUserInteraction()
    setCurrentPath(path)
    setDropdownOpen(false)
  })

  const handleInputFocus = useMemoizedFn(() => {
    handleUserInteraction()
    if (history.length > 0) {
      setDropdownOpen(true)
    }
  })

  const handleInputChange = useMemoizedFn((e: React.ChangeEvent<HTMLInputElement>) => {
    handleUserInteraction()
    setCurrentPath(e.target.value)
  })

  const handleOpenDir = useMemoizedFn((dirPath: string) => {
    handleUserInteraction()
    yakitShell.openSpecifiedFile(dirPath)
  })

  const handleLanguageChange = useMemoizedFn((lang: string) => {
    handleUserInteraction()
    setLanguage(lang)
  })

  const handleAutoStartChange = useMemoizedFn((checked: boolean) => {
    handleUserInteraction()
    setAutoStart(checked)
  })

  const doConfirm = useMemoizedFn(async () => {
    if (!currentPath) return

    const newHistory = [currentPath, ...history.filter((p) => p !== currentPath)].slice(0, 10)
    await yakitApp.setYakitHomeConfig('workspaceHistory', newHistory)
    await yakitApp.setYakitHomeConfig('language', language)
    await yakitApp.setYakitHomeConfig('autoStart', autoStart)

    const i18nLang = langConfigToI18n[language] || 'zh'
    await yakitCache.setLocalCache(I18N_CACHE_KEY, i18nLang)

    if (currentPath !== originalHome) {
      await yakitApp.setYakitHomeConfig('YAKIT_HOME', currentPath)
      yakitApp.relaunchApp()
    } else {
      onConfirm()
    }
  })

  const handleConfirm = useMemoizedFn(async () => {
    if (!currentPath) return
    handleUserInteraction()

    if (currentPath === originalHome) {
      doConfirm()
      return
    }

    const isNewDir = sizeMap[currentPath] === undefined
    const message = isNewDir ? t.switchNewDir : t.switchExistDir

    YakitModalConfirm({
      title: t.switchTitle,
      content: message,
      onOkText: t.ok,
      onCancelText: t.cancel,
      onOk: () => {
        doConfirm()
      },
    })
  })

  // 清理定时器
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
    }
  }, [])

  if (loading) return null

  return (
    <div className={styles.workspaceSelector} onClick={handleUserInteraction}>
      {/* 工作空间区域 */}
      <div className={styles.workspaceSection}>
        <div className={styles.workspaceLabelRow}>
          <span className={styles.workspaceLabel}>{t.workspace}</span>
          {originalHome && (
            <Tooltip title={originalHome}>
              <span className={styles.workspaceCurrentHint} onClick={() => handleOpenDir(originalHome)}>
                {originalHome}
              </span>
            </Tooltip>
          )}
        </div>
        <div className={styles.workspaceInputWrapper} ref={inputWrapperRef}>
          <div className={styles.workspaceInputRow}>
            <input
              className={styles.workspaceInput}
              value={currentPath}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder={t.inputPlaceholder}
            />
            <YakitButton type="outline1" size="small" onClick={handleBrowse}>
              {t.browse}
            </YakitButton>
          </div>

          {dropdownOpen && history.length > 0 && (
            <div className={styles.workspaceDropdown} ref={dropdownRef}>
              {history.map((item) => (
                <div
                  key={item}
                  className={`${styles.workspaceDropdownItem} ${item === currentPath ? styles.workspaceDropdownItemActive : ''}`}
                  onClick={() => handleSelectHistory(item)}
                >
                  <Tooltip title={item} mouseEnterDelay={0.5}>
                    <span className={styles.workspaceDropdownItemPath}>{item}</span>
                  </Tooltip>
                  <span className={styles.workspaceDropdownItemSize}>
                    {sizeMap[item] !== undefined ? formatSize(sizeMap[item]) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {currentPath && sizeMap[currentPath] !== undefined && (
          <div className={styles.workspaceSizeRow}>
            <span className={styles.workspaceSizeInfo}>
              {t.sizeLabel}: {calculating ? t.calculating : formatSize(sizeMap[currentPath])}
            </span>
            <span className={styles.workspaceOpenDir} onClick={() => handleOpenDir(currentPath)}>
              {t.openDir}
            </span>
          </div>
        )}
      </div>

      {/* 语言区域 */}
      <div className={styles.workspaceSection}>
        <div className={styles.workspaceLabel}>{t.language}</div>
        <div className={styles.workspaceLangRow}>
          <div
            className={`${styles.workspaceLangOption} ${language === 'zh-CN' ? styles.workspaceLangOptionActive : ''}`}
            onClick={() => handleLanguageChange('zh-CN')}
          >
            简体中文
          </div>
          <div
            className={`${styles.workspaceLangOption} ${language === 'en-US' ? styles.workspaceLangOptionActive : ''}`}
            onClick={() => handleLanguageChange('en-US')}
          >
            English
          </div>
        </div>
      </div>

      {/* 操作区域 */}
      <div className={styles.workspaceActions}>
        <div className={styles.workspaceActionsRow}>
          <YakitButton type="primary" size="large" onClick={handleConfirm} disabled={!currentPath}>
            {t.confirm}
          </YakitButton>
          <Checkbox checked={autoStart} onChange={(e) => handleAutoStartChange(e.target.checked)}>
            <span className={styles.workspaceAutoStartLabel}>{t.autoStartLabel}</span>
          </Checkbox>
        </div>
        {countdown > 0 && (
          <div className={styles.workspaceCountdownBar}>
            <div className={styles.workspaceCountdownBarInner} style={{ animationDuration: '3s' }} />
          </div>
        )}
      </div>
    </div>
  )
})
