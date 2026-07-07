import type { ChatFailPlanAndExecution, ChatFailReact } from '@/pages/ai-re-act/hooks/aiRender'
import { memo, type FC } from 'react'
import ChatCard from '../ChatCard'
import styles from './AiFailPlanCard.module.scss'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import { PreWrapper } from '../ToolInvokerCard'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { OutlineChevronsDownUpIcon, OutlineChevronsUpDownIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Tooltip } from 'antd'
import useCreation from 'ahooks/lib/useCreation'
import useToggle from 'ahooks/lib/useToggle'

const AiFailPlanCard: FC<{ itemData: ChatFailReact | ChatFailPlanAndExecution; renderNum: number }> = ({
  itemData,
  renderNum,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [expand, { toggle }] = useToggle(false)
  const { nodeLabel } = useAINodeLabel(itemData.data.NodeIdVerbose)

  const content = useCreation(() => {
    return itemData.data.content
  }, [renderNum])
  return (
    <ChatCard
      className={styles['ai-fail-plan-wrapper']}
      titleText={nodeLabel}
      titleMore={
        <Tooltip title={expand ? t('AiFailPlanCard.collapse') : t('AiFailPlanCard.expand')}>
          <YakitButton
            size="small"
            type="text"
            icon={expand ? <OutlineChevronsDownUpIcon /> : <OutlineChevronsUpDownIcon />}
            onClick={toggle}
            className={styles['expand-btn']}
          />
        </Tooltip>
      }
    >
      {expand && content && <PreWrapper code={content} autoScrollBottom className={styles['pre-max-height']} />}
    </ChatCard>
  )
}
export default memo(AiFailPlanCard)
