import React, { useEffect, useMemo, useState } from 'react'
import { Steps } from 'antd'
import { useCreation, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useHistoryAIReActChat } from '@/components/historyAIReActChat'
import { IrifyAiCodeAuditStyle, resolveIrifyFocusModeLoop } from '@/constants/focusMode'
import { SystemInfo } from '@/constants/hardware'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { warn } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import i18n from '@/i18n/i18n'
import { getIrifyAiCodeAuditHistory } from './utils'
import { OpenFolderDragger } from './RunnerFileTree/RunnerFileTree'
import { YakRunnerHistoryProps } from './YakRunnerIrifyAiCodeAuditType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { IRIFY_CODE_AUDIT_DEFAULT_CHAT_SEED } from './irifyAiCodeAuditConstants'
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
  /** 关闭蒙版（完成或取消） */
  onClose: () => void
  /** 审计已开始后调用：发送预设消息并锁定风格切换 */
  onStart: (style: IrifyAiCodeAuditStyle) => void
  /**
   * 发送前同步设置工程根路径附件。
   * 工作区打开文件树是异步的，而自动发送「开始审计」是同步触发，
   * 因此由蒙版在发送前把用户选择的目录直接写入 attachRef，
   * 保证 AIInputEvent.AttachedResourceInfo 携带 code_audit_target_path。
   */
  onEnsureProjectRoot: (absPath: string) => void
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
  const { visible, defaultAuditStyle, auditStyle, onAuditStyleChange, onClose, onStart, onEnsureProjectRoot } = props
  const { t } = useI18nNamespaces(['irifyAiCodeAudit'])
  const { historyAIReActChatBridge } = useHistoryAIReActChat()

  const [current, setCurrent] = useState<number>(0)
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [historyList, setHistoryList] = useState<YakRunnerHistoryProps[]>([])

  // 每次打开蒙版都重置到第一步并刷新历史目录
  useEffect(() => {
    if (visible) {
      setCurrent(0)
      setSelectedPath('')
      getIrifyAiCodeAuditHistory()
        .then((list) => setHistoryList(list.filter((h) => !h.isFile)))
        .catch(() => {})
    }
  }, [visible])

  // 入口风格变化时同步预选（仅在第一步展示前同步，避免覆盖用户在第二步的选择）
  useEffect(() => {
    if (visible) {
      onAuditStyleChange(defaultAuditStyle)
    }
    // 仅依赖 defaultAuditStyle 与 visible，不依赖 onAuditStyleChange（受控回调稳定）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAuditStyle, visible])

  const openFolder = useMemoizedFn(() => {
    if (SystemInfo.mode === 'remote') {
      let absolutePath = ''
      const m = showYakitModal({
        title: tYak('RunnerFileTree.enterFolderPath'),
        width: 400,
        type: 'white',
        closable: false,
        centered: true,
        content: <OpenFolderDragger setAbsolutePath={(v) => (absolutePath = v)} />,
        onCancel: () => {
          m.destroy()
        },
        onOk: async () => {
          if (absolutePath.length === 0) {
            warn(tYak('RunnerFileTree.enterFolderPath'))
            return
          }
          setSelectedPath(absolutePath)
          m.destroy()
        },
      })
    } else {
      handleOpenFileSystemDialog({ title: tYak('RunnerFileTree.selectFolder'), properties: ['openDirectory'] }).then(
        (data) => {
          if (data.filePaths.length) {
            const absolutePath: string = data.filePaths[0].replace(/\\/g, '\\')
            setSelectedPath(absolutePath)
          }
        },
      )
    }
  })

  const pickHistory = useMemoizedFn((item: YakRunnerHistoryProps) => {
    setSelectedPath(item.path)
  })

  const canGoNext = useCreation(() => {
    if (current === 0) return !!selectedPath.trim()
    if (current === 1) return !!auditStyle
    return false
  }, [current, selectedPath, auditStyle])

  const handleNext = useMemoizedFn(() => {
    if (current === 0 && !selectedPath.trim()) {
      warn(t('onboarding.selectDirectoryFirst'))
      return
    }
    setCurrent((c) => Math.min(c + 1, 2))
  })

  const handlePrev = useMemoizedFn(() => {
    setCurrent((c) => Math.max(c - 1, 0))
  })

  const handleStart = useMemoizedFn(() => {
    if (!selectedPath.trim()) {
      warn(t('onboarding.selectDirectoryFirst'))
      return
    }
    const absPath = selectedPath.trim()
    // 1. 打开左侧文件树并写入历史（工作区监听 onAiCodeAuditOpenFileTree）
    emiter.emit('onAiCodeAuditOpenFileTree', absPath)
    // 2. 工作区异步加载文件树，发送前先同步写入工程根路径，确保附件携带 code_audit_target_path
    onEnsureProjectRoot(absPath)
    // 3. 发送预设消息「开始审计」，并指定与风格对应的 focus mode loop
    const focusMode = resolveIrifyFocusModeLoop(auditStyle)
    historyAIReActChatBridge.handleStart({ qs: IRIFY_CODE_AUDIT_DEFAULT_CHAT_SEED, focusMode })
    // 4. 通知父组件：已开始，锁定风格切换
    onStart(auditStyle)
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
    <div className={styles['onboarding-mask']} role="dialog" aria-modal="true">
      <div className={styles['onboarding-card']}>
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
              <YakitButton type="primary" onClick={openFolder} className={styles['open-folder-btn']}>
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
              <div className={styles['history-section']}>
                <div className={styles['history-title']}>{t('recentlyOpened')}</div>
                <div className={styles['history-list']}>
                  {historyList.length === 0 ? (
                    <div className={styles['history-empty']}>{t('onboarding.historyEmpty')}</div>
                  ) : (
                    historyList.map((item) => (
                      <div
                        key={item.path}
                        className={classNames(styles['history-item'], {
                          [styles['history-item-active']]: item.path === selectedPath,
                        })}
                        onClick={() => pickHistory(item)}
                      >
                        <div className={styles['history-item-name']}>{item.name}</div>
                        <div className={classNames(styles['history-item-path'], 'yakit-single-line-ellipsis')}>
                          {item.path}
                        </div>
                      </div>
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
                    {auditStyle === 'skill' ? t('onboarding.styleSkillTitle') : t('onboarding.styleCodeTitle')}
                  </span>
                </div>
                <div className={styles['start-summary-row']}>
                  <span className={styles['start-summary-label']}>{t('onboarding.summaryMessage')}</span>
                  <span className={styles['start-summary-value']}>{`“${IRIFY_CODE_AUDIT_DEFAULT_CHAT_SEED}”`}</span>
                </div>
              </div>
              <div className={styles['start-hint']}>{t('onboarding.startHint')}</div>
            </div>
          )}
        </div>

        <div className={styles['onboarding-footer']}>
          <YakitButton type="text2" onClick={onClose}>
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
              <YakitButton type="primary" onClick={handleStart} disabled={!selectedPath.trim()}>
                {t('onboarding.start')}
              </YakitButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
