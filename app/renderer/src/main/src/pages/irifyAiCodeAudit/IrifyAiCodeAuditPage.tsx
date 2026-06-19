import React, { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import { AuditCodePageInfoProps } from '@/store/pageInfo'
import { irifyAiCodeAuditPageAiStore } from '@/pages/ai-agent/store/ChatDataStore'
import { IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT } from '@/constants/focusMode'
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

/** 从路由参数 / onAuditCodePageInfo 打开工程目录 */
const IrifyAiCodeAuditEntryBootstrap: React.FC<{ auditCodePageInfo?: AuditCodePageInfoProps }> = ({
  auditCodePageInfo,
}) => {
  const applyEntry = useMemoizedFn((info?: AuditCodePageInfoProps) => {
    const root = info?.Location?.trim()
    if (!root) return
    emiter.emit('onAiCodeAuditOpenFileTree', root)
  })

  useEffect(() => {
    applyEntry(auditCodePageInfo)
  }, [auditCodePageInfo?.Location, applyEntry])

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
 */
const IrifyAiCodeAuditPageInner: React.FC<IrifyAiCodeAuditPageProps> = ({ auditCodePageInfo }) => {
  const attachRef = useIrifyWorkbenchAiAttachRef()

  const transformInputEvent = useMemoizedFn((event: AIInputEvent) => {
    return appendCodeAuditTargetAttachmentToEvent(event, attachRef?.current?.projectRootAbsPath)
  })

  return (
    <HistoryAIReActChatProvider
      cacheDataStore={irifyAiCodeAuditPageAiStore}
      focusModeLoop={IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT}
      transformInputEvent={transformInputEvent}
    >
      <IrifyAiCodeAuditEntryBootstrap auditCodePageInfo={auditCodePageInfo} />
      <IrifyAiCodeAuditSidePanelLayout placement="right" rootClassName={styles.pageRoot}>
        {/* 此处替换为独立的类似yakrunner工作区 */}
        <YakRunnerIrifyAiCodeAudit />
      </IrifyAiCodeAuditSidePanelLayout>
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
