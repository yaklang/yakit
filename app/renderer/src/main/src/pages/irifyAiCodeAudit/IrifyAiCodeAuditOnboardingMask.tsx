import React, { useEffect, useMemo, useState } from 'react'
import { Steps } from 'antd'
import { useCreation, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useHistoryAIReActChat } from '@/components/historyAIReActChat'
import { IrifyAiCodeAuditStyle, isIrifyAuditStyleConfirmed, resolveIrifyFocusModeLoop } from './irifyAiCodeAuditStyle'
import { SystemInfo } from '@/constants/hardware'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { warn } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import { emitIrifyAiCodeAuditOpenFileTree, getIrifyAiCodeAuditHistory, setIrifyAiCodeAuditHistory } from './utils'
import { OpenFolderDragger } from './RunnerFileTree/RunnerFileTree'
import { YakRunnerHistoryProps } from './YakRunnerIrifyAiCodeAuditType'
import { IrifyAiCodeAuditHistoryItem } from './IrifyAiCodeAuditHistoryItem'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { resolveIrifyAuditDefaultChatSeed } from './irifyAiCodeAuditConstants'
import styles from './IrifyAiCodeAuditOnboardingMask.module.scss'

const tYak = i18n.getFixedT(null, 'yakRunner')

export interface IrifyAiCodeAuditOnboardingMaskProps {
  visible: boolean
  /** 入口带来的初始风格；引导蒙版用于第 2 步预选 */
  defaultAuditStyle: IrifyAiCodeAuditStyle
  /** 当前已选风格（受控） */
  auditStyle: IrifyAiCodeAuditStyle
  /** 切换风格（仅在未开始时允许调用） */
  onAuditStyleChange: (style: IrifyAiCodeAuditStyle) => void
  /** 打开蒙版时预填的目录（来自工作区「打开目录」或历史记录） */
  defaultSelectedPath?: string
  /** 入口已确定审计风格时跳过「选择风格」步骤（主页卡片 / 历史记录） */
  skipStyleStep?: boolean
  /** 关闭蒙版（完成或取消） */
  onClose: () => void
  /** 审计已开始后调用：发送预设消息并锁定风格切换 */
  onStart: (style: IrifyAiCodeAuditStyle) => void
  /** 仅打开目录：写入输入框但不发送，不锁定风格 */
  onOpenOnly: (style: IrifyAiCodeAuditStyle) => void
  /**
   * 发送前同步设置工程根路径附件。
   * 工作区打开文件树是异步的，而自动发送「开始审计」是同步触发，
   * 因此由蒙版在发送前把用户选择的目录直接写入 attachRef，
   * 保证 AIInputEvent.AttachedResourceInfo 携带 directory_path。
   */
  onEnsureProjectRoot: (absPath: string) => void
}

const getFolderNameFromPath = (path: string) => {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '')
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? path
}

/** 根据已预填的目录 / 风格，计算打开蒙版时应展示的第一步 */
const resolveInitialStep = (path: string, skipStyleStep: boolean) => {
  const hasPath = !!path.trim()
  if (hasPath && skipStyleStep) return 2
  if (hasPath) return 1
  return 0
}

/** 下一步：若风格已确定则跳过风格选择 */
const resolveNextStep = (current: number, skipStyleStep: boolean) => {
  if (current === 0) return skipStyleStep ? 2 : 1
  if (current === 1) return 2
  return 2
}

/** 上一步：确认页始终回到风格选择，便于从历史进入后修改风格 */
const resolvePrevStep = (current: number) => {
  if (current === 2) return 1
  if (current === 1) return 0
  return 0
}

/**
 * Irify「AI 代码审计 / AI Skill 安全分析」引导蒙版。
 *
 * 三步引导：
 * 1. 选择目录（含历史目录）
 * 2. 选择审计风格（code / skill，默认由入口预选）
 * 3. 开始：点击后自动发送预设消息「开始审计」，并按风格设置对应 focus mode loop。
 *
 * 蒙版直接渲染在 HistoryAIReActChatProvider 内，因此可访问 chat bridge 自动发送消息。
 */
export const IrifyAiCodeAuditOnboardingMask: React.FC<IrifyAiCodeAuditOnboardingMaskProps> = (props) => {
  const {
    visible,
    defaultAuditStyle,
    defaultSelectedPath = '',
    skipStyleStep = false,
    auditStyle,
    onAuditStyleChange,
    onClose,
    onStart,
    onOpenOnly,
    onEnsureProjectRoot,
  } = props
  const { t } = useI18nNamespaces(['irifyAiCodeAudit'])
  const { historyAIReActChatBridge } = useHistoryAIReActChat()

  const [current, setCurrent] = useState<number>(0)
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [chatMessage, setChatMessage] = useState<string>('')
  const [historyList, setHistoryList] = useState<YakRunnerHistoryProps[]>([])

  // 每次打开蒙版：按预填信息跳步，并刷新历史目录与预设消息
  useEffect(() => {
    if (visible) {
      const path = defaultSelectedPath.trim()
      setSelectedPath(path)
      setCurrent(resolveInitialStep(path, skipStyleStep))
      setChatMessage(resolveIrifyAuditDefaultChatSeed(auditStyle))
      getIrifyAiCodeAuditHistory()
        .then((list) => setHistoryList(list.filter((h) => !h.isFile)))
        .catch(() => {})
    }
  }, [visible, defaultSelectedPath, skipStyleStep])

  // 切换审计风格时同步预设消息（未确定时不覆盖用户已编辑内容）
  useEffect(() => {
    if (!visible || !isIrifyAuditStyleConfirmed(auditStyle)) return
    setChatMessage(resolveIrifyAuditDefaultChatSeed(auditStyle))
  }, [auditStyle, visible])

  // ESC 关闭蒙版
  useEffect(() => {
    if (!visible) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible, onClose])

  // 入口风格变化时同步预选（仅在第一步展示前同步，避免覆盖用户在第二步的选择）
  useEffect(() => {
    if (visible) {
      onAuditStyleChange(defaultAuditStyle)
    }
    // 仅依赖 defaultAuditStyle 与 visible，不依赖 onAuditStyleChange（受控回调稳定）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAuditStyle, visible])

  const openLocalFolder = useMemoizedFn(() => {
    handleOpenFileSystemDialog({ title: tYak('RunnerFileTree.selectFolder'), properties: ['openDirectory'] }).then(
      (data) => {
        if (data.filePaths.length) {
          const absolutePath: string = data.filePaths[0].replace(/\\/g, '\\')
          setSelectedPath(absolutePath)
        }
      },
    )
  })

  const isRemoteMode = SystemInfo.mode === 'remote'

  const pickHistory = useMemoizedFn((item: YakRunnerHistoryProps) => {
    setSelectedPath(item.path)
    if (item.isFile) return

    const styleFromHistory = item.auditStyle
    if (styleFromHistory === 'code' || styleFromHistory === 'skill') {
      onAuditStyleChange(styleFromHistory)
      setCurrent(2)
      return
    }
    onAuditStyleChange('unset')
    setCurrent(1)
  })

  const canGoNext = useCreation(() => {
    if (current === 0) return !!selectedPath.trim()
    if (current === 1) return isIrifyAuditStyleConfirmed(auditStyle)
    return false
  }, [current, selectedPath, auditStyle])

  const handleNext = useMemoizedFn(() => {
    if (current === 0 && !selectedPath.trim()) {
      warn(t('onboarding.selectDirectoryFirst'))
      return
    }
    setCurrent((step) => resolveNextStep(step, skipStyleStep))
  })

  const handlePrev = useMemoizedFn(() => {
    setCurrent((step) => resolvePrevStep(step))
  })

  const validateStep3 = useMemoizedFn(() => {
    if (!selectedPath.trim()) {
      warn(t('onboarding.selectDirectoryFirst'))
      return false
    }
    if (!isIrifyAuditStyleConfirmed(auditStyle)) {
      warn(t('onboarding.selectStyleFirst'))
      return false
    }
    return true
  })

  const persistDirectoryOpen = useMemoizedFn((absPath: string) => {
    emitIrifyAiCodeAuditOpenFileTree(absPath)
    onEnsureProjectRoot(absPath)
    setIrifyAiCodeAuditHistory({
      isFile: false,
      name: getFolderNameFromPath(absPath),
      path: absPath,
      auditStyle,
    })
  })

  const handleStart = useMemoizedFn(() => {
    if (!validateStep3()) return
    const message = chatMessage.trim()
    if (!message) {
      warn(t('onboarding.messageRequired'))
      return
    }
    const absPath = selectedPath.trim()
    persistDirectoryOpen(absPath)
    historyAIReActChatBridge.handleStart({
      qs: message,
      focusMode: resolveIrifyFocusModeLoop(auditStyle),
    })
    onStart(auditStyle)
    onClose()
  })

  const handleOpenOnly = useMemoizedFn(() => {
    if (!validateStep3()) return
    const absPath = selectedPath.trim()
    persistDirectoryOpen(absPath)
    onOpenOnly(auditStyle)
    setTimeout(() => {
      historyAIReActChatBridge.setValue(chatMessage.trim())
    })
    onClose()
  })

  const stepsItems = useMemo(
    () => [
      { title: t('onboarding.stepSelectDirectory') },
      { title: t('onboarding.stepSelectStyle') },
      { title: t('onboarding.stepStart') },
    ],
    [t],
  )

  if (!visible) return null

  return (
    <div className={styles['onboarding-mask']} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles['onboarding-card']} onClick={(event) => event.stopPropagation()}>
        <div className={styles['onboarding-header']}>
          <div className={styles['onboarding-title']}>{t('onboarding.title')}</div>
          <div className={styles['onboarding-subtitle']}>{t('onboarding.subtitle')}</div>
        </div>
        <Steps current={current} className={styles['onboarding-steps']}>
          {stepsItems.map((item, index) => (
            <Steps.Step key={index} title={item.title} />
          ))}
        </Steps>

        <div className={styles['onboarding-body']}>
          {current === 0 && (
            <div className={styles['step-directory']}>
              <div className={styles['step-section-title']}>{t('onboarding.selectDirectory')}</div>
              {isRemoteMode ? (
                <OpenFolderDragger
                  className={styles['folder-dragger']}
                  value={selectedPath}
                  setAbsolutePath={setSelectedPath}
                />
              ) : (
                <>
                  <YakitButton type="primary" onClick={openLocalFolder} className={styles['open-folder-btn']}>
                    {t('openLocalFolder')}
                  </YakitButton>
                  {selectedPath && (
                    <div className={styles['selected-path']}>
                      <span className={styles['selected-path-label']}>{t('onboarding.currentSelected')}</span>
                      <span className={classNames(styles['selected-path-value'], 'yakit-single-line-ellipsis')}>
                        {selectedPath}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className={styles['history-section']}>
                <div className={styles['history-title']}>{t('recentlyOpened')}</div>
                <div className={styles['history-list']}>
                  {historyList.length === 0 ? (
                    <div className={styles['history-empty']}>{t('onboarding.historyEmpty')}</div>
                  ) : (
                    historyList.map((item) => (
                      <IrifyAiCodeAuditHistoryItem
                        key={`${item.path}-${item.auditStyle ?? 'unset'}`}
                        item={item}
                        active={item.path === selectedPath}
                        onClick={() => pickHistory(item)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {current === 1 && (
            <div className={styles['step-style']}>
              <div className={styles['step-section-title']}>{t('onboarding.selectStyle')}</div>
              <div className={styles['style-options']}>
                <div
                  className={classNames(styles['style-option'], {
                    [styles['style-option-active']]: auditStyle === 'code',
                  })}
                  onClick={() => onAuditStyleChange('code')}
                >
                  <div className={styles['style-option-title']}>{t('onboarding.styleCodeTitle')}</div>
                  <div className={styles['style-option-desc']}>{t('onboarding.styleCodeDesc')}</div>
                </div>
                <div
                  className={classNames(styles['style-option'], {
                    [styles['style-option-active']]: auditStyle === 'skill',
                  })}
                  onClick={() => onAuditStyleChange('skill')}
                >
                  <div className={styles['style-option-title']}>{t('onboarding.styleSkillTitle')}</div>
                  <div className={styles['style-option-desc']}>{t('onboarding.styleSkillDesc')}</div>
                </div>
              </div>
            </div>
          )}

          {current === 2 && (
            <div className={styles['step-start']}>
              <div className={styles['start-summary']}>
                <div className={styles['start-summary-row']}>
                  <span className={styles['start-summary-label']}>{t('onboarding.summaryDirectory')}</span>
                  <span className={classNames(styles['start-summary-value'], 'yakit-single-line-ellipsis')}>
                    {selectedPath || t('onboarding.notSelected')}
                  </span>
                </div>
                <div className={styles['start-summary-row']}>
                  <span className={styles['start-summary-label']}>{t('onboarding.summaryStyle')}</span>
                  <span className={styles['start-summary-value']}>
                    {auditStyle === 'skill'
                      ? t('onboarding.styleSkillTitle')
                      : auditStyle === 'code'
                        ? t('onboarding.styleCodeTitle')
                        : t('styleToggle.unset')}
                  </span>
                </div>
                <div className={styles['start-summary-message']}>
                  <span className={styles['start-summary-label']}>{t('onboarding.summaryMessage')}</span>
                  <YakitInput.TextArea
                    value={chatMessage}
                    onChange={(event) => setChatMessage(event.target.value)}
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    className={styles['start-message-input']}
                  />
                </div>
              </div>
              <div className={styles['start-hint']}>{t('onboarding.startHint')}</div>
            </div>
          )}
        </div>

        <div className={styles['onboarding-footer']}>
          <YakitButton type="outline2" onClick={onClose} className={styles['cancel-btn']}>
            {t('onboarding.cancel')}
          </YakitButton>
          <div className={styles['onboarding-footer-right']}>
            {current > 0 && (
              <YakitButton type="outline2" onClick={handlePrev}>
                {t('onboarding.prev')}
              </YakitButton>
            )}
            {current < 2 ? (
              <YakitButton type="primary" onClick={handleNext} disabled={!canGoNext}>
                {t('onboarding.next')}
              </YakitButton>
            ) : (
              <>
                <YakitButton
                  type="outline2"
                  onClick={handleOpenOnly}
                  disabled={!selectedPath.trim() || !isIrifyAuditStyleConfirmed(auditStyle)}
                >
                  {t('onboarding.openOnly')}
                </YakitButton>
                <YakitButton
                  type="primary"
                  onClick={handleStart}
                  disabled={!selectedPath.trim() || !chatMessage.trim() || !isIrifyAuditStyleConfirmed(auditStyle)}
                >
                  {t('onboarding.start')}
                </YakitButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
