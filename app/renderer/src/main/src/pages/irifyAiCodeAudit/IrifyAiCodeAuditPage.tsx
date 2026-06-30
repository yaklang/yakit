import React, { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import { AuditCodePageInfoProps } from '@/store/pageInfo'
import { irifyAiCodeAuditPageAiStore } from '@/pages/ai-agent/store/ChatDataStore'
import { IrifyAiCodeAuditStyle, resolveIrifyFocusModeLoop } from '@/constants/focusMode'
import { HistoryAIReActChatProvider } from '@/components/historyAIReActChat'
import { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import { IrifyAiCodeAuditSidePanelLayout } from './IrifyAiCodeAuditSidePanelLayout'
import { appendCodeAuditTargetAttachmentToEvent } from './codeAuditAttachment'
import {
  IrifyWorkbenchAiAttachProvider,
  IrifyWorkbenchAiAttachRef,
  useIrifyWorkbenchAiAttachRef,
} from './IrifyWorkbenchAiAttachContext'
import styles from './IrifyAiCodeAuditPage.module.scss'
import { YakRunnerIrifyAiCodeAudit } from './YakRunnerIrifyAiCodeAudit'
import { IrifyAiCodeAuditOnboardingMask } from './IrifyAiCodeAuditOnboardingMask'

/** 从 auditCodePageInfo 解析入口风格 */
const resolveAuditStyle = (info?: AuditCodePageInfoProps): IrifyAiCodeAuditStyle => {
  return info?.auditStyle === 'skill' ? 'skill' : 'code'
}

/** 从路由参数 / onAuditCodePageInfo 打开工程目录 */
const IrifyAiCodeAuditEntryBootstrap: React.FC<{
  auditCodePageInfo?: AuditCodePageInfoProps
  onAuditStyleArrived: (style: IrifyAiCodeAuditStyle, hasLocation: boolean) => void
}> = ({ auditCodePageInfo, onAuditStyleArrived }) => {
  const applyEntry = useMemoizedFn((info?: AuditCodePageInfoProps) => {
    const root = info?.Location?.trim()
    if (root) {
      emiter.emit('onAiCodeAuditOpenFileTree', root)
    }
    // 只要有 auditStyle（来自主页入口），就通知父级展示引导蒙版
    if (info && info.auditStyle !== undefined) {
      onAuditStyleArrived(resolveAuditStyle(info), !!root)
    }
  })

  useEffect(() => {
    applyEntry(auditCodePageInfo)
  }, [auditCodePageInfo?.Location, auditCodePageInfo?.auditStyle, applyEntry])

  useEffect(() => {
    const handler = (raw: string) => {
      try {
        const parsed: AuditCodePageInfoProps = JSON.parse(raw)
        applyEntry(parsed)
      } catch {
        // ignore
      }
    }
    emiter.on('onAuditCodePageInfo', handler)
    return () => {
      emiter.off('onAuditCodePageInfo', handler)
    }
  }, [applyEntry])

  return null
}

export interface IrifyAiCodeAuditPageProps {
  auditCodePageInfo?: AuditCodePageInfoProps
}

/**
 * Irify 形态下的内层渲染：依赖 `IrifyWorkbenchAiAttachContext` 已就绪。
 * 这里读取 `attachRef.current.projectRootAbsPath`，通过 `transformInputEvent` 把工程根路径附件
 * 追加到发往引擎的 `AIInputEvent.AttachedResourceInfo`。
 *
 * 同时管理「AI 代码审计 / AI Skill 安全分析」的入口风格与引导蒙版：
 * - `auditStyle` 决定 `focusModeLoop`（code→code_security_audit；skill→ai_skill_audit）
 * - 从主页入口进入时弹出 antd Steps 引导蒙版，完成后自动发送「开始审计」
 * - 审计开始后锁定风格切换
 */
const IrifyAiCodeAuditPageInner: React.FC<IrifyAiCodeAuditPageProps> = ({ auditCodePageInfo }) => {
  const attachRef = useIrifyWorkbenchAiAttachRef()

  const [entryAuditStyle, setEntryAuditStyle] = useState<IrifyAiCodeAuditStyle>(() =>
    resolveAuditStyle(auditCodePageInfo),
  )
  const [auditStyle, setAuditStyle] = useState<IrifyAiCodeAuditStyle>(() => resolveAuditStyle(auditCodePageInfo))
  const [onboardingVisible, setOnboardingVisible] = useState<boolean>(() => !!auditCodePageInfo?.auditStyle)
  /** 审计是否已开始（已发送过「开始审计」），为 true 后禁止切换风格 */
  const [started, setStarted] = useState<boolean>(false)

  // 入口风格变化时，同步入口风格与当前风格，并展示引导蒙版（用户重新从主页进入则允许再次引导）
  useEffect(() => {
    if (auditCodePageInfo?.auditStyle !== undefined) {
      const style = resolveAuditStyle(auditCodePageInfo)
      setEntryAuditStyle(style)
      setAuditStyle(style)
      setStarted(false)
      setOnboardingVisible(true)
    }
  }, [auditCodePageInfo?.auditStyle])

  const handleAuditStyleArrived = useMemoizedFn((style: IrifyAiCodeAuditStyle, _hasLocation: boolean) => {
    setEntryAuditStyle(style)
    setAuditStyle(style)
    setStarted(false)
    setOnboardingVisible(true)
  })

  const handleAuditStyleChange = useMemoizedFn((style: IrifyAiCodeAuditStyle) => {
    // 开始后不允许切换
    if (started) return
    setAuditStyle(style)
  })

  const handleOnboardingStart = useMemoizedFn((style: IrifyAiCodeAuditStyle) => {
    setAuditStyle(style)
    setStarted(true)
  })

  const handleOnboardingClose = useMemoizedFn(() => {
    setOnboardingVisible(false)
  })

  const handleEnsureProjectRoot = useMemoizedFn((absPath: string) => {
    if (attachRef?.current) {
      attachRef.current.projectRootAbsPath = absPath
    }
  })

  const focusModeLoop = resolveIrifyFocusModeLoop(auditStyle)

  const transformInputEvent = useMemoizedFn((event: AIInputEvent) => {
    return appendCodeAuditTargetAttachmentToEvent(event, attachRef?.current?.projectRootAbsPath)
  })

  return (
    <HistoryAIReActChatProvider
      cacheDataStore={irifyAiCodeAuditPageAiStore}
      focusModeLoop={focusModeLoop}
      transformInputEvent={transformInputEvent}
    >
      <IrifyAiCodeAuditEntryBootstrap
        auditCodePageInfo={auditCodePageInfo}
        onAuditStyleArrived={handleAuditStyleArrived}
      />
      <IrifyAiCodeAuditSidePanelLayout
        placement="right"
        rootClassName={styles.pageRoot}
        auditStyle={auditStyle}
        auditStyleLocked={started}
        onAuditStyleChange={handleAuditStyleChange}
      >
        {/* 此处替换为独立的类似yakrunner工作区 */}
        <YakRunnerIrifyAiCodeAudit />
      </IrifyAiCodeAuditSidePanelLayout>
      <IrifyAiCodeAuditOnboardingMask
        visible={onboardingVisible}
        defaultAuditStyle={entryAuditStyle}
        auditStyle={auditStyle}
        onAuditStyleChange={handleAuditStyleChange}
        onClose={handleOnboardingClose}
        onStart={handleOnboardingStart}
        onEnsureProjectRoot={handleEnsureProjectRoot}
      />
    </HistoryAIReActChatProvider>
  )
}

const IrifyAiCodeAuditPageShell: React.FC<IrifyAiCodeAuditPageProps> = ({ auditCodePageInfo }) => {
  const attachRef = useRef<IrifyWorkbenchAiAttachRef>({})
  return (
    <IrifyWorkbenchAiAttachProvider attachRef={attachRef}>
      <IrifyAiCodeAuditPageInner auditCodePageInfo={auditCodePageInfo} />
    </IrifyWorkbenchAiAttachProvider>
  )
}

/** Irify「AI 代码审计」：主区为工作区；右侧为通用 `HistoryAIReActChatProvider` 渲染的 ReAct 侧栏。 */
export const IrifyAiCodeAuditPage: React.FC<IrifyAiCodeAuditPageProps> = ({ auditCodePageInfo }) => {
  return <IrifyAiCodeAuditPageShell auditCodePageInfo={auditCodePageInfo} />
}
