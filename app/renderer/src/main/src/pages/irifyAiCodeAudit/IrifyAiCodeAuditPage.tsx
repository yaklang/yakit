import React from 'react'
import { irifyAiCodeAuditPageAiStore } from '@/pages/ai-agent/store/ChatDataStore'
import { IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT } from '@/constants/irifyFocusMode'
import { isIRify } from '@/utils/envfile'
import { IrifyAiCodeAuditSidePanelLayout } from './IrifyAiCodeAuditSidePanelLayout'
import { IrifyAiCodeAuditWorkbench } from './IrifyAiCodeAuditWorkbench'
import { IrifyAiCodeAuditReActChatProvider } from './IrifyAiCodeAuditReActChatProvider'
import { YakRunner } from '@/pages/yakRunner/YakRunner'
import styles from './IrifyAiCodeAuditPage.module.scss'

/** Irify「AI 代码审计」：主区为工作区；右侧为 Irify 专用 ReAct 侧栏。 */
export const IrifyAiCodeAuditPage: React.FC = () => {
  if (!isIRify()) {
    return <YakRunner />
  }
  return (
    <IrifyAiCodeAuditReActChatProvider
      cacheDataStore={irifyAiCodeAuditPageAiStore}
      focusModeLoop={IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT}
    >
      <IrifyAiCodeAuditSidePanelLayout placement="right" rootClassName={styles.pageRoot}>
        <IrifyAiCodeAuditWorkbench />
      </IrifyAiCodeAuditSidePanelLayout>
    </IrifyAiCodeAuditReActChatProvider>
  )
}
