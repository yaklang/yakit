import type { ChatFailPlanAndExecution, ChatFailReact } from '@/pages/ai-re-act/hooks/aiRender'
import { memo, type FC } from 'react'
import ChatCard from '../ChatCard'
import styles from './AiFailPlanCard.module.scss'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import { PreWrapper } from '../ToolInvokerCard'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCreation } from 'ahooks'

const AiFailPlanCard: FC<{ itemData: ChatFailReact | ChatFailPlanAndExecution; renderNum: number }> = ({
  itemData,
  renderNum,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])

  const { nodeLabel } = useAINodeLabel(itemData.data.NodeIdVerbose)

  const content = useCreation(() => {
    return itemData.data.content
  }, [renderNum])
  return (
    <ChatCard className={styles['ai-fail-plan-wrapper']} titleText={nodeLabel}>
      <div className={styles['ai-fail-plan-card']}>
        <div className={styles['ai-fail-plan-card-title']}>{t('AiFailPlanCard.failureReason')}</div>
        <div className={styles['ai-fail-plan-card-content']}>
          {content && <PreWrapper code={content} autoScrollBottom />}
        </div>
      </div>
    </ChatCard>
  )
}
export default memo(AiFailPlanCard)
