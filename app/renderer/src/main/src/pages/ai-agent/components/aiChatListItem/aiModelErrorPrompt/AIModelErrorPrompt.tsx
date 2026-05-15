import React from 'react'
import { AIModelErrorPromptProps } from './type'
import ChatCard from '../../ChatCard'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import ModalInfo from '../../ModelInfo'
import { useCreation, useMemoizedFn } from 'ahooks'
import { PreWrapper } from '../../ToolInvokerCard'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlinePencilaltIcon } from '@/assets/icon/outline'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import { onEditAIModel } from '@/pages/ai-agent/aiModelList/AIModelList'
import { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { getFileNameByModelType, getModelLabelByModelType } from '@/pages/ai-agent/aiModelList/aiModelForm/AIModelForm'
import styles from './AIModelErrorPrompt.module.scss'
import { Tooltip } from 'antd'
export const AIModelErrorPrompt: React.FC<AIModelErrorPromptProps> = React.memo((props) => {
  const { item } = props

  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [aiGlobalConfigData, event] = useAIGlobalConfig()
  const aiGlobalConfig = useCreation(() => aiGlobalConfigData.aiGlobalConfig, [aiGlobalConfigData.aiGlobalConfig])
  const data: AIAgentGrpcApi.AIApiRequestFailedPayload = useCreation(() => {
    return (
      item?.data || {
        error_code: '-',
        model_tier: '',
        provider_name: '',
        model_name: '',
        cause: '',
        liteforge_action: '',
      }
    )
  }, [item?.data])
  const modalInfo = useCreation(() => {
    return {
      title: data.model_name,
      time: item.Timestamp,
      icon: data.provider_name,
    }
  }, [item.Timestamp, data])
  const onEdit = useMemoizedFn((e) => {
    e.stopPropagation()
    const fileName = getFileNameByModelType(data.model_tier)
    if (!fileName) return
    // todo 编辑事件,index为0是因为当前使用的ai模型是单选的且选中项一定是在第一个
    onEditAIModel({
      aiGlobalConfig,
      index: 0,
      fileName,
      mountContainer: undefined,
      t,
      onSuccess: () => {
        event.onRefresh()
      },
    })
  })
  return (
    <ChatCard
      titleText="模型错误"
      titleExtra={modalInfo && <ModalInfo {...modalInfo} />}
      titleMore={
        <Tooltip title="点此编辑当前模型">
          <YakitButton type="text2" size="small" icon={<OutlinePencilaltIcon />} onClick={onEdit} />
        </Tooltip>
      }
    >
      <div className={styles['model-error-content']}>
        <div className={styles['model-error-item']}>
          {getModelLabelByModelType(data.model_tier)}使用错误,请点击右上角编辑进行处理
        </div>
        <PreWrapper code={data.cause} />
      </div>
    </ChatCard>
  )
})
