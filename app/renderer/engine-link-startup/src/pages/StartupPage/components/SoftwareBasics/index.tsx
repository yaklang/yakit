import React, { useEffect, useMemo, useRef, useState } from 'react'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import lightTheme from '@/assets/light-theme.png'
import darkTheme from '@/assets/dark-theme.png'
import { SolidCheckCircleIcon } from '@/assets/solid'
import { Theme } from '@/hooks/useTheme'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitDragger } from '@/components/yakitUI/YakitForm/YakitForm'
import { Tooltip } from 'antd'
import { yakitApp, yakitShell } from '@/utils/electronBridge'
import { useCountDown, useMemoizedFn } from 'ahooks'
import { OutlineExitIcon } from '@/assets/outline'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { getLocalI18nGV, isCommunityYakit } from '@/utils/envfile'
import { LocalGVS } from '@/enums/yakitGV'
import { getLocalValue, setLocalValue } from '@/utils/kv'
import classNames from 'classnames'
import styles from './SoftwareBasics.module.scss'

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

const AUTO_START_COUNTDOWN_SECONDS = 3

const yakitSoftMode = ['classic', 'securityExpert', 'scan'] as const
export type YakitSoftMode = (typeof yakitSoftMode)[number]
const YAKIT_MODE_CONFIG: Record<
  YakitSoftMode,
  {
    label: string
    desc: string
  }
> = {
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
}

export type Lange = 'zh' | 'zn' | 'zh-TW'

export interface SoftwareBasicsProps {
  softTheme: Theme
  setSoftTheme: (theme: Theme, save: boolean) => void
  onConfirm: () => void
}

export const SoftwareBasics: React.FC<SoftwareBasicsProps> = React.memo((props) => {
  const { softTheme, setSoftTheme, onConfirm } = props

  const [loading, setLoading] = useState<boolean>(true)
  const [currentPath, setCurrentPath] = useState<string>('')
  const [originalHome, setOriginalHome] = useState<string>('')
  const [workspaceHistory, setWorkspaceHistory] = useState<string[]>([])
  const [sizeMap, setSizeMap] = useState<Record<string, number>>({})
  const [calculating, setCalculating] = useState<boolean>(false)
  const [softMode, setSoftMode] = useState<YakitSoftMode>('classic')
  const [softLang, setSoftLang] = useState<Lange>('zh')
  const [autoStart, setAutoStart] = useState<boolean>(false)
  const [autoStartTargetDate, setAutoStartTargetDate] = useState<number>()
  const autoStartTriggeredRef = useRef<boolean>(false)

  const doConfirm = useMemoizedFn(async () => {
    if (!currentPath) return
    try {
      const newHistory = [currentPath, ...workspaceHistory.filter((p) => p !== currentPath)].slice(0, 10)
      await yakitApp.setYakitHomeConfig('workspaceHistory', newHistory)
      await yakitApp.setYakitHomeConfig('autoStart', autoStart)
      setSoftTheme(softTheme, true)
      if (isCommunityYakit()) {
        setLocalValue(LocalGVS.YakitCEMode, softMode)
      }
      setLocalValue(getLocalI18nGV(), softLang)

      if (currentPath !== originalHome) {
        await yakitApp.setYakitHomeConfig('YAKIT_HOME', currentPath)
        yakitApp.relaunchApp()
      } else {
        onConfirm()
      }
    } catch (error) {}
  })

  const [countdownMs] = useCountDown({
    targetDate: autoStartTargetDate,
    onEnd: () => {
      if (!autoStartTriggeredRef.current) {
        autoStartTriggeredRef.current = true
        doConfirm()
      }
    },
  })
  const countdown = useMemo(() => {
    return countdownMs > 0 ? Math.ceil(countdownMs / 1000) : 0
  }, [countdownMs])
  const cancelCountdown = useMemoizedFn(() => {
    setAutoStartTargetDate(undefined)
  })
  const startCountdown = useMemoizedFn(() => {
    autoStartTriggeredRef.current = false
    setAutoStartTargetDate(Date.now() + AUTO_START_COUNTDOWN_SECONDS * 1000)
  })

  const loadConfig = useMemoizedFn(async () => {
    try {
      const config = await yakitApp.getYakitHomeConfig()

      const home = config.currentHome || ''
      setCurrentPath(home)
      setOriginalHome(home)
      setAutoStart(config.autoStart || false)
      setWorkspaceHistory(config.workspaceHistory || [])
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

  useEffect(() => {
    loadConfig()

    if (isCommunityYakit()) {
      getLocalValue(LocalGVS.YakitCEMode).then((res) => {
        const mode = res || 'classic'
        setSoftMode(mode as YakitSoftMode)
      })
    }

    getLocalValue(getLocalI18nGV()).then((res) => {
      const lang = res || 'zh'
      setSoftLang(lang as Lange)
    })

    return () => {
      cancelCountdown()
    }
  }, [])

  // 用户任何交互都取消自动启动倒计时
  const handleUserInteraction = useMemoizedFn(() => {
    if (autoStartTargetDate) {
      cancelCountdown()
    }
  })

  const fetchSizes = useMemoizedFn(async (paths: string[]) => {
    const validPaths = paths.filter(Boolean)
    if (validPaths.length === 0) return
    setCalculating(true)
    const map: Record<string, number> = {}
    for (const p of validPaths) {
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

  const handleOpenDir = useMemoizedFn((dirPath: string) => {
    handleUserInteraction()
    yakitShell.openSpecifiedFile(dirPath)
  })

  const handlePathChange = useMemoizedFn((nextValue: string) => {
    handleUserInteraction()
    setCurrentPath(nextValue)
  })

  const handleThemeChange = useMemoizedFn((theme: Theme) => {
    handleUserInteraction()
    setSoftTheme(theme, false)
  })

  const handleModeChange = useMemoizedFn((mode: YakitSoftMode) => {
    handleUserInteraction()
    setSoftMode(mode)
  })

  const handleLangChange = useMemoizedFn((lang: Lange) => {
    handleUserInteraction()
    setSoftLang(lang)
  })

  const handleAutoStartChange = useMemoizedFn((checked: boolean) => {
    handleUserInteraction()
    setAutoStart(checked)
  })

  const handleConfirm = useMemoizedFn(async () => {
    if (!currentPath) return
    handleUserInteraction()

    if (currentPath === originalHome) {
      doConfirm()
      return
    }

    const isNewDir = sizeMap[currentPath] === undefined
    const message = isNewDir
      ? '目标目录不存在，将自动创建新目录。确定要切换到新工作空间吗？'
      : '确定要切换到该工作空间吗？切换后将重新启动应用。'

    showYakitModal({
      type: 'white',
      title: '切换工作空间',
      content: <div style={{ padding: 15 }}>{message}</div>,
      onOkText: '确定',
      onCancelText: '取消',
      onOk: () => {
        doConfirm()
      },
    })
  })

  const handleExit = useMemoizedFn(() => {
    handleUserInteraction()
    yakitApp.closeWindow()
  })

  const history = useMemo(() => {
    return workspaceHistory.map((item) => ({
      label: (
        <div className={styles['history-label-wrapper']}>
          <div className={styles['history-label']} title={item}>
            {item}
          </div>
          <div className={styles['history-size']}>{sizeMap[item] !== undefined ? formatSize(sizeMap[item]) : ''}</div>
        </div>
      ),
      value: item,
    }))
  }, [workspaceHistory, sizeMap])

  if (loading) return null

  return (
    <div className={styles['softwareBasics']} onClick={handleUserInteraction}>
      <div className={styles['softwareBasics-item']}>
        <div className={styles['softwareBasics-item-title']}>
          工作空间&nbsp;&nbsp;
          {originalHome && (
            <span className={styles['originalHome']} onClick={() => handleOpenDir(originalHome)}>
              <Tooltip title={originalHome}>{originalHome}</Tooltip>
            </span>
          )}
        </div>
        <div className={styles['softwareBasics-item-cont']}>
          <YakitDragger
            value={currentPath}
            isShowPathNumber={false}
            selectType="folder"
            renderType="autoComplete"
            multiple={false}
            help="可将文件夹拖入框内或点击"
            uploadFolderText="选择工作空间"
            autoCompleteProps={{ placeholder: '输入或选择工作空间路径', options: history, allowClear: true }}
            onChange={handlePathChange}
          />
          {currentPath && sizeMap[currentPath] !== undefined && (
            <div className={styles['softwareBasics-mode-desc']}>
              占用空间：{calculating ? '计算中...' : formatSize(sizeMap[currentPath])}{' '}
              <YakitButton type="text" onClick={() => handleOpenDir(currentPath)}>
                打开目录
              </YakitButton>
            </div>
          )}
        </div>
      </div>
      <div className={styles['softwareBasics-item']}>
        <div className={styles['softwareBasics-item-title']}>请选择您的主题</div>
        <div className={styles['softwareBasics-item-cont']}>
          <div className={styles['softwareBasics-flex']}>
            <div
              className={classNames(styles['softwareBasics-theme-item'], {
                [styles['softwareBasics-theme-item-active']]: softTheme === 'light',
              })}
              onClick={() => handleThemeChange('light')}
            >
              <img src={lightTheme} height={60} />
              <div className={styles['softwareBasics-flex']}>
                <div className={styles['softwareBasics-theme-text']}>亮色</div>
                {softTheme === 'light' && <SolidCheckCircleIcon className={styles['CheckCircleIcon']} />}
              </div>
            </div>
            <div
              className={classNames(styles['softwareBasics-theme-item'], {
                [styles['softwareBasics-theme-item-active']]: softTheme === 'dark',
              })}
              onClick={() => handleThemeChange('dark')}
            >
              <img src={darkTheme} height={60} />
              <div className={styles['softwareBasics-flex']}>
                <div className={styles['softwareBasics-theme-text']}>暗色</div>
                {softTheme === 'dark' && <SolidCheckCircleIcon className={styles['CheckCircleIcon']} />}
              </div>
            </div>
          </div>
        </div>
      </div>
      {isCommunityYakit() && (
        <div className={styles['softwareBasics-item']}>
          <div className={styles['softwareBasics-item-title']}>模式设置</div>
          <div className={styles['softwareBasics-item-cont']}>
            <div className={styles['softwareBasics-flex']}>
              {yakitSoftMode.map((mode) => (
                <div
                  key={mode}
                  className={classNames(
                    styles['softwareBasics-mode-item'],
                    softMode === mode && styles['softwareBasics-mode-item-active'],
                  )}
                  onClick={() => handleModeChange(mode)}
                >
                  {YAKIT_MODE_CONFIG[mode].label}
                </div>
              ))}
            </div>
            <div className={styles['softwareBasics-mode-desc']}>{YAKIT_MODE_CONFIG[softMode].desc}</div>
          </div>
        </div>
      )}
      <div className={styles['softwareBasics-item']}>
        <div className={styles['softwareBasics-item-title']}>语言设置</div>
        <div className={styles['softwareBasics-item-cont']}>
          <YakitSelect
            value={softLang}
            options={[
              {
                label: 'Chinese（Simplified）简体中文',
                value: 'zh',
              },
              {
                label: 'Chinese（Traditional）繁体中文',
                value: 'zh-TW',
              },
              {
                label: 'English',
                value: 'en',
              },
            ]}
            onChange={handleLangChange}
          ></YakitSelect>
        </div>
      </div>
      <div className={styles['footer-btn']}>
        <YakitButton disabled={!currentPath} onClick={handleConfirm}>
          确定并启动 {countdown > 0 ? <>（{countdown}）</> : ''}
        </YakitButton>
        <YakitCheckbox
          checked={autoStart}
          onChange={(e) => {
            handleAutoStartChange(e.target.checked)
          }}
        >
          下次自动启动
        </YakitCheckbox>
      </div>
      <div className={styles['footer-wrapper']}>
        <span className={styles['exit-btn']} onClick={handleExit}>
          <OutlineExitIcon className={styles['exit-icon']} />
          退出
        </span>
      </div>
    </div>
  )
})
