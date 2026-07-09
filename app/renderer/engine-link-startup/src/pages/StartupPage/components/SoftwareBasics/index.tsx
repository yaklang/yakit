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
import { useCountDown, useInViewport, useMemoizedFn } from 'ahooks'
import { OutlineExitIcon } from '@/assets/outline'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { getLocalI18nGV, isCommunityYakit } from '@/utils/envfile'
import { LocalGVS } from '@/enums/yakitGV'
import { getLocalValue, setLocalValue } from '@/utils/kv'
import { getModeConfig, getSoftwareBasicsTexts, Lange, normalizeLang, YakitSoftMode, yakitSoftMode } from './i18n'
import classNames from 'classnames'
import styles from './SoftwareBasics.module.scss'
export { yakitSoftMode } from './i18n'

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

const AUTO_START_COUNTDOWN_SECONDS = 3

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
  const pendingAutoStartRef = useRef<boolean>(false)
  const pendingFetchPathsRef = useRef<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(containerRef)

  const t = useMemo(() => getSoftwareBasicsTexts(softLang), [softLang])
  const modeConfig = useMemo(() => getModeConfig(softLang), [softLang])

  const doConfirm = useMemoizedFn(async () => {
    if (!currentPath) return
    try {
      const newHistory = [currentPath, ...workspaceHistory.filter((p) => p !== currentPath)].slice(0, 10)
      await yakitApp.setYakitHomeConfig('workspaceHistory', newHistory)
      await yakitApp.setYakitHomeConfig('autoStart', autoStart)

      setSoftTheme(softTheme, true)

      if (isCommunityYakit()) {
        await yakitApp.setYakitHomeConfig('mode', JSON.stringify({ key: LocalGVS.YakitCEMode, value: softMode }))
        setLocalValue(LocalGVS.YakitCEMode, softMode)
      }

      await yakitApp.setYakitHomeConfig('lange', JSON.stringify({ key: getLocalI18nGV(), value: softLang }))
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

      const allPaths = [...new Set([home, ...(config.workspaceHistory || [])].filter(Boolean))]
      pendingFetchPathsRef.current = allPaths
      pendingAutoStartRef.current = !!(config.autoStart && home)
      setLoading(false)
    } catch (e) {
      pendingAutoStartRef.current = false
      pendingFetchPathsRef.current = []
      setLoading(false)
    }
  })

  // 配置就绪且组件进入视口后再启动倒计时
  useEffect(() => {
    if (loading) return
    if (!inViewport) return
    if (!pendingAutoStartRef.current || !currentPath) return

    pendingAutoStartRef.current = false
    startCountdown()
  }, [loading, inViewport, currentPath])

  // 目录大小计算放到界面展示之后，避免阻塞首帧渲染
  useEffect(() => {
    if (loading) return
    const paths = pendingFetchPathsRef.current
    if (paths.length === 0) return
    pendingFetchPathsRef.current = []
    fetchSizes(paths)
  }, [loading])

  useEffect(() => {
    loadConfig()

    if (isCommunityYakit()) {
      getLocalValue(LocalGVS.YakitCEMode).then((res) => {
        const mode = res || 'classic'
        setSoftMode(mode as YakitSoftMode)
      })
    }

    getLocalValue(getLocalI18nGV()).then((res) => {
      setSoftLang(normalizeLang(res))
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
    yakitShell.openSpecifiedFile(dirPath)
  })

  const handlePathChange = useMemoizedFn((nextValue: string) => {
    handleUserInteraction()
    setCurrentPath(nextValue)
  })

  const handleThemeChange = useMemoizedFn((theme: Theme) => {
    setSoftTheme(theme, false)
  })

  const handleModeChange = useMemoizedFn((mode: YakitSoftMode) => {
    setSoftMode(mode)
  })

  const handleLangChange = useMemoizedFn((lang: Lange) => {
    setSoftLang(lang)
  })

  const handleAutoStartChange = useMemoizedFn((checked: boolean) => {
    setAutoStart(checked)
  })

  const handleConfirm = useMemoizedFn(async () => {
    if (!currentPath) return

    if (currentPath === originalHome) {
      doConfirm()
      return
    }

    const isNewDir = sizeMap[currentPath] === undefined
    const message = isNewDir ? t.switchNewDir : t.switchExistDir

    showYakitModal({
      type: 'white',
      title: t.switchTitle,
      content: <div style={{ padding: 15 }}>{message}</div>,
      onOkText: t.ok,
      onCancelText: t.cancel,
      onOk: () => {
        doConfirm()
      },
    })
  })

  const handleExit = useMemoizedFn(() => {
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

  return (
    <div
      ref={containerRef}
      className={styles['softwareBasics']}
      onClick={handleUserInteraction}
      style={{ gap: softLang === 'en' ? 8 : 14 }}
    >
      <div className={styles['softwareBasics-item']}>
        <div className={styles['softwareBasics-item-title']}>
          {t.workspace}&nbsp;&nbsp;
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
            help={t.draggerHelp}
            uploadFolderText={t.selectWorkspace}
            autoCompleteProps={{ placeholder: t.workspacePlaceholder, options: history, allowClear: true }}
            onChange={handlePathChange}
          />
          {currentPath && sizeMap[currentPath] !== undefined && (
            <div className={styles['softwareBasics-mode-desc']}>
              {t.sizeLabel}：{calculating ? t.calculating : formatSize(sizeMap[currentPath])}{' '}
              <YakitButton type="text" onClick={() => handleOpenDir(currentPath)}>
                {t.openDir}
              </YakitButton>
            </div>
          )}
        </div>
      </div>
      <div className={styles['softwareBasics-item']}>
        <div className={styles['softwareBasics-item-title']}>{t.themeTitle}</div>
        <div className={styles['softwareBasics-item-cont']}>
          <div className={styles['softwareBasics-flex']}>
            <div
              className={classNames(styles['softwareBasics-theme-item'], {
                [styles['softwareBasics-theme-item-active']]: softTheme === 'light',
              })}
              onClick={() => handleThemeChange('light')}
            >
              <img src={lightTheme} height={50} />
              <div className={styles['softwareBasics-flex']}>
                <div className={styles['softwareBasics-theme-text']}>{t.themeLight}</div>
                {softTheme === 'light' && <SolidCheckCircleIcon className={styles['CheckCircleIcon']} />}
              </div>
            </div>
            <div
              className={classNames(styles['softwareBasics-theme-item'], {
                [styles['softwareBasics-theme-item-active']]: softTheme === 'dark',
              })}
              onClick={() => handleThemeChange('dark')}
            >
              <img src={darkTheme} height={50} />
              <div className={styles['softwareBasics-flex']}>
                <div className={styles['softwareBasics-theme-text']}>{t.themeDark}</div>
                {softTheme === 'dark' && <SolidCheckCircleIcon className={styles['CheckCircleIcon']} />}
              </div>
            </div>
          </div>
        </div>
      </div>
      {isCommunityYakit() && (
        <div className={styles['softwareBasics-item']}>
          <div className={styles['softwareBasics-item-title']}>{t.modeTitle}</div>
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
                  {modeConfig[mode].label}
                </div>
              ))}
            </div>
            <div className={styles['softwareBasics-mode-desc']}>{modeConfig[softMode].desc}</div>
          </div>
        </div>
      )}
      <div className={styles['softwareBasics-item']}>
        <div className={styles['softwareBasics-item-title']}>{t.langTitle}</div>
        <div className={styles['softwareBasics-item-cont']}>
          <YakitSelect
            value={softLang}
            options={[
              {
                label: t.langZh,
                value: 'zh',
              },
              {
                label: t.langZhTW,
                value: 'zh-TW',
              },
              {
                label: t.langEn,
                value: 'en',
              },
            ]}
            onChange={handleLangChange}
          ></YakitSelect>
        </div>
      </div>
      <div className={styles['footer-btn']}>
        <YakitButton disabled={!currentPath} onClick={handleConfirm}>
          {t.confirm} {countdown > 0 ? <>（{countdown}）</> : ''}
        </YakitButton>
        <YakitCheckbox
          checked={autoStart}
          onChange={(e) => {
            handleAutoStartChange(e.target.checked)
          }}
        >
          {t.autoStart}
        </YakitCheckbox>
      </div>
      <div className={styles['footer-wrapper']}>
        <span className={styles['exit-btn']} onClick={handleExit}>
          <OutlineExitIcon className={styles['exit-icon']} />
          {t.exit}
        </span>
      </div>
    </div>
  )
})
