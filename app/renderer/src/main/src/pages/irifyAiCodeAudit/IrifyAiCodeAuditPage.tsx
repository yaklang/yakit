import React, { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { shallow } from 'zustand/shallow'
import emiter from '@/utils/eventBus/eventBus'
import { AuditCodePageInfoProps, usePageInfo } from '@/store/pageInfo'
import { irifyAiCodeAuditPageAiStore } from '@/pages/ai-agent/store/ChatDataStore'
import { IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT } from '@/constants/irifyFocusMode'
import { isIRify } from '@/utils/envfile'
import { HistoryAIReActChatProvider, useHistoryAIReActChat } from '@/components/historyAIReActChat'
import { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import { YakRunner } from '@/pages/yakRunner/YakRunner'
import { IrifyAiCodeAuditSidePanelLayout } from './IrifyAiCodeAuditSidePanelLayout'
import { IrifyAiCodeAuditWorkbench } from './IrifyAiCodeAuditWorkbench'
import { appendCodeAuditTargetAttachmentToEvent } from './codeAuditAttachment'
import {
  IrifyWorkbenchAiAttachProvider,
  IrifyWorkbenchAiAttachRef,
  useIrifyWorkbenchAiAttachRef,
} from './IrifyWorkbenchAiAttachContext'
import { IRIFY_CODE_AUDIT_DEFAULT_CHAT_SEED, queueIrifySeedDraft } from './irifyAiCodeAuditSeedDraft'
import styles from './IrifyAiCodeAuditPage.module.scss'

/** 从路由参数 / onAuditCodePageInfo 打开工程目录并预填侧栏输入（不自动发送） */
const IrifyAiCodeAuditEntryBootstrap: React.FC<{ auditCodePageInfo?: AuditCodePageInfoProps }> = ({
  auditCodePageInfo,
}) => {
  const applyEntry = useMemoizedFn((info?: AuditCodePageInfoProps) => {
    const root = info?.Location?.trim()
    if (!root) return
    emiter.emit('onIrifyAiCodeAuditOpenFileTree', root)
    window.setTimeout(() => {
      emiter.emit('onIrifyAiCodeAuditSeedChatDraft', IRIFY_CODE_AUDIT_DEFAULT_CHAT_SEED)
    }, 0)
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

/**
 * 监听 `onIrifyAiCodeAuditSeedChatDraft` 事件，暂存草稿并在输入框就绪时写入（不触发发送）。
 * 实际 flush 时机由 `IrifyAiCodeAuditSeedDraftFlush` 在 AI 聊天挂载后触发。
 */
const IrifyAiCodeAuditSeedDraftListener: React.FC = () => {
  const { historyAIReActChatBridge } = useHistoryAIReActChat()
  // `setChatInputValue` 来自 `useMemoizedFn`，引用稳定；不能直接依赖 bridge 整体对象，
  // 否则 activeID 变化时（如发送后新建会话）会 re-run 把「开始请求」重新写回输入框。
  const { setChatInputValue } = historyAIReActChatBridge

  // 仅在 Listener 首次挂载时预填一次默认草稿，后续由用户主导
  useEffect(() => {
    queueIrifySeedDraft(IRIFY_CODE_AUDIT_DEFAULT_CHAT_SEED, setChatInputValue)
  }, [setChatInputValue])

  useEffect(() => {
    const onSeed = (text: string) => {
      queueIrifySeedDraft(text, setChatInputValue)
    }
    emiter.on('onIrifyAiCodeAuditSeedChatDraft', onSeed)
    return () => {
      emiter.off('onIrifyAiCodeAuditSeedChatDraft', onSeed)
    }
  }, [setChatInputValue])
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
  const currentRouteKey = usePageInfo((state) => state.getCurrentPageTabRouteKey(), shallow)
  const attachRef = useIrifyWorkbenchAiAttachRef()

  const transformInputEvent = useMemoizedFn((event: AIInputEvent) => {
    return appendCodeAuditTargetAttachmentToEvent(event, attachRef?.current?.projectRootAbsPath)
  })

  return (
    <HistoryAIReActChatProvider
      cacheDataStore={irifyAiCodeAuditPageAiStore}
      focusModeLoop={IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT}
      defaultTimelineSessionID={currentRouteKey}
      transformInputEvent={transformInputEvent}
    >
      <IrifyAiCodeAuditEntryBootstrap auditCodePageInfo={auditCodePageInfo} />
      <IrifyAiCodeAuditSeedDraftListener />
      <IrifyAiCodeAuditSidePanelLayout placement="right" rootClassName={styles.pageRoot}>
        <IrifyAiCodeAuditWorkbench />
      </IrifyAiCodeAuditSidePanelLayout>
    </HistoryAIReActChatProvider>
  )
}

/**
 * Irify 形态下的页面壳：
 * - 在通用 AI Provider 之外提供 `IrifyWorkbenchAiAttachContext`，由 yakRunner 工作台子树写入 `attachRef`
 * - 让 hooks 顺序稳定：`isIRify()` 的早返回判定在外层完成，所有 hooks 都收敛到 `IrifyAiCodeAuditPageInner`
 */
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
  if (!isIRify()) {
    return <YakRunner />
  }
  return <IrifyAiCodeAuditPageShell auditCodePageInfo={auditCodePageInfo} />
}
