import React from 'react'
import { irifyAiCodeAuditPageAiStore } from '@/pages/ai-agent/store/ChatDataStore'
import { IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT } from '@/constants/irifyFocusMode'
import { isIRify } from '@/utils/envfile'
import { HistoryAIReActChatProvider } from '@/components/historyAIReActChat'
import { IrifyAiCodeAuditSidePanelLayout } from './IrifyAiCodeAuditSidePanelLayout'
import { IrifyAiCodeAuditWorkbench } from './IrifyAiCodeAuditWorkbench'
import { YakRunner } from '@/pages/yakRunner/YakRunner'
import styles from './IrifyAiCodeAuditPage.module.scss'

/**
 * Irify「AI 代码审计」：主区为独立工作区；右侧为与 HTTP 历史同构的 HistoryAIReAct 侧栏。
 */
export const IrifyAiCodeAuditPage: React.FC = () => {
  if (!isIRify()) {
    return <YakRunner />
  }
  return (
    <HistoryAIReActChatProvider
      cacheDataStore={irifyAiCodeAuditPageAiStore}
      focusModeLoop={IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT}
    >
      <IrifyAiCodeAuditSidePanelLayout placement="right" rootClassName={styles.pageRoot}>
        <IrifyAiCodeAuditWorkbench />
      </IrifyAiCodeAuditSidePanelLayout>
    </HistoryAIReActChatProvider>
  )
}
