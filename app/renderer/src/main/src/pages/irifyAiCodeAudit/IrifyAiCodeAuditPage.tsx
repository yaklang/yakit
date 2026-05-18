import React, { useEffect } from 'react'
import { useMemoizedFn } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import { AuditCodePageInfoProps } from '@/store/pageInfo'
import { irifyAiCodeAuditPageAiStore } from '@/pages/ai-agent/store/ChatDataStore'
import { IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT } from '@/constants/irifyFocusMode'
import { isIRify } from '@/utils/envfile'
import { IrifyAiCodeAuditSidePanelLayout } from './IrifyAiCodeAuditSidePanelLayout'
import { IrifyAiCodeAuditWorkbench } from './IrifyAiCodeAuditWorkbench'
import { IrifyAiCodeAuditReActChatProvider } from './IrifyAiCodeAuditReActChatProvider'
import { YakRunner } from '@/pages/yakRunner/YakRunner'
import styles from './IrifyAiCodeAuditPage.module.scss'

const IRIFY_COMPILE_AUDIT_CHAT_SEED = '开始代码审计'

/** 从路由参数 / onAuditCodePageInfo 打开工程目录并预填侧栏输入（不自动发送） */
const IrifyAiCodeAuditEntryBootstrap: React.FC<{ auditCodePageInfo?: AuditCodePageInfoProps }> = ({
  auditCodePageInfo,
}) => {
  const applyEntry = useMemoizedFn((info?: AuditCodePageInfoProps) => {
    const root = info?.Location?.trim()
    if (!root) return
    emiter.emit('onIrifyAiCodeAuditOpenFileTree', root)
    window.setTimeout(() => {
      emiter.emit('onIrifyAiCodeAuditSeedChatDraft', IRIFY_COMPILE_AUDIT_CHAT_SEED)
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

export interface IrifyAiCodeAuditPageProps {
  auditCodePageInfo?: AuditCodePageInfoProps
}

/** Irify「AI 代码审计」：主区为工作区；右侧为 Irify 专用 ReAct 侧栏。 */
export const IrifyAiCodeAuditPage: React.FC<IrifyAiCodeAuditPageProps> = ({ auditCodePageInfo }) => {
  if (!isIRify()) {
    return <YakRunner />
  }
  return (
    <IrifyAiCodeAuditReActChatProvider
      cacheDataStore={irifyAiCodeAuditPageAiStore}
      focusModeLoop={IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT}
    >
      <IrifyAiCodeAuditEntryBootstrap auditCodePageInfo={auditCodePageInfo} />
      <IrifyAiCodeAuditSidePanelLayout placement="right" rootClassName={styles.pageRoot}>
        <IrifyAiCodeAuditWorkbench />
      </IrifyAiCodeAuditSidePanelLayout>
    </IrifyAiCodeAuditReActChatProvider>
  )
}
