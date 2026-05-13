import React from 'react'
import { AIModelErrorPromptProps } from './type'
import ChatCard from '../../ChatCard'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import ModalInfo from '../../ModelInfo'
import { useCreation, useMemoizedFn } from 'ahooks'
import { PreWrapper } from '../../ToolInvokerCard'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlinePencilaltIcon } from '@/assets/icon/outline'

export const AIModelErrorPrompt: React.FC<AIModelErrorPromptProps> = React.memo((props) => {
  const { item } = props
  //  const { t } = useI18nNamespaces(['aiAgent'])
  //   const { nodeLabel } = useAINodeLabel(item.data.i18n)
  const modalInfo = useCreation(() => {
    return {
      title: item.AIModelName,
      time: item.Timestamp,
      icon: item.AIService,
    }
  }, [item])
  const onEdit = useMemoizedFn((e) => {
    e.stopPropagation()
    // todo 编辑事件
  })
  return (
    <ChatCard
      titleText="模型错误"
      titleExtra={modalInfo && <ModalInfo {...modalInfo} />}
      titleMore={<YakitButton type="text2" size="small" icon={<OutlinePencilaltIcon />} onClick={onEdit} />}
    >
      <PreWrapper code={'错误原因'} />
    </ChatCard>
  )
})
