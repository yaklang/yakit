import React from 'react'
import { AIChatListItemProps } from './type'
import { useCreation, useMemoizedFn } from 'ahooks'
import { AIReActChatReview } from '../aiReActChatReview/AIReActChatReview'
import { AIReviewResult } from '../aiReviewResult/AIReviewResult'
import { AITriageChatContent } from '../aiTriageChat/AITriageChat'
import ToolInvokerCard from '../ToolInvokerCard'
import styles from './AIChatListItem.module.scss'
import DividerCard from '../DividerCard'
import { AIToolDecision } from '../aiToolDecision/AIToolDecision'
import { AIChatQSData, AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import AiFailPlanCard from '../aiFailPlanCard/AiFailPlanCard'
import { AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import StreamingChatContent from './StreamingChatContent/StreamingChatContent'
import StaticChatContent from './StaticChatContent/StaticChatContent'
import useAIAgentStore from '../../useContext/useStore'
import { AIManualIntervention } from '../aiManualIntervention/AIManualIntervention'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AIModelErrorPrompt } from './aiModelErrorPrompt/AIModelErrorPrompt'
import { AIHttpFlowFuzzStatusCard } from '../aiHttpFlowFuzzStatusCard/AIHttpFlowFuzzStatusCard'
import { AIReportFinishCard } from '../aiReportFinishCard/AIReportFinishCard'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'

const chatContentExtraProps = {
  contentClassName: styles['content-wrapper'],
  chatClassName: styles['question-wrapper'],
}

export const AIChatListItem: React.FC<AIChatListItemProps> = React.memo((props) => {
  const { item, type, hasNext, itemIndex, session: sessionProp } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const store = useCurrentStore()
  const execFileRecord = useStore(store, (state) => state.execFileRecord)

  const { activeChat } = useAIAgentStore()
  const session = sessionProp || activeChat?.SessionID
  const aiStreamNodeProps = useCreation(() => {
    switch (type) {
      case 're-act':
        return {
          aiMarkdownProps: {
            className: styles['ai-mark-down-wrapper'],
          },
        }

      default:
        return {}
    }
  }, [type])

  const isStream = useCreation(() => {
    return (
      item.type === AIChatQSDataTypeEnum.STREAM ||
      item.type === AIChatQSDataTypeEnum.STREAM_GROUP ||
      item.type === AIChatQSDataTypeEnum.TASK_NODE_GROUP ||
      item.type === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP
    )
  }, [item.type])

  const ChatItemRenderer = useMemoizedFn((itemData: AIChatQSData) => {
    const { type, Timestamp, data, extraValue } = itemData
    switch (type) {
      case AIChatQSDataTypeEnum.QUESTION:
        return (
          <AITriageChatContent
            isAnswer={false}
            content={data?.qs}
            extraValue={extraValue}
            {...chatContentExtraProps}
            // contentClassName={classNames({
            //   [styles['file-content-wrapper']]: isExtraShow(extraValue),
            // })}
          />
        )
      // case AIChatQSDataTypeEnum.STREAM:
      //     return <AIStreamNode {...aiStreamNodeProps} stream={item} />
      case AIChatQSDataTypeEnum.RESULT:
        return <AITriageChatContent isAnswer={true} content={data} {...chatContentExtraProps} />
      case AIChatQSDataTypeEnum.THOUGHT:
        return (
          <AITriageChatContent
            isAnswer={true}
            content={`${t('AIChatListItem.thinking')}${data}`}
            {...chatContentExtraProps}
          />
        )
      case AIChatQSDataTypeEnum.TOOL_RESULT:
        const fileList = execFileRecord.get(data.callToolId)
        return (
          !!data.type && (
            <ToolInvokerCard
              titleText={t('AIChatListItem.toolCall')}
              fileList={fileList}
              modalInfo={{
                time: Timestamp,
                title: itemData.AIModelName,
                icon: itemData.AIService,
              }}
              operationInfo={{
                callToolId: data.callToolId,
                aiFilePath: data.tool.dirPath,
              }}
              data={data}
              chatType={item.chatType}
              token={item.token}
            />
          )
        )
      case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
      case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
      case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
        if (!!itemData.data.selected) {
          if (
            type === AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE ||
            type === AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE
          )
            return null
          return <AIReviewResult info={itemData} timestamp={Timestamp} />
        } else {
          return (
            <AIReActChatReview
              chatType="casual"
              info={itemData}
              isEmbedded={true}
              expand={true}
              className={styles['review-wrapper']}
            />
          )
        }
      case AIChatQSDataTypeEnum.USER_MANUAL_INTERVENTION:
        return <AIManualIntervention info={itemData} timestamp={Timestamp} />
      /** 该UI已无效，可以删除 */
      // case AIChatQSDataTypeEnum.TASK_INDEX_NODE:
      //   const dividerCardProps = {
      //     status: data?.status as AITaskStatus,
      //     desc: data?.goal,
      //     name: data?.taskName,
      //     success: 0,
      //     error: 0,
      //   }
      //   return <DividerCard {...dividerCardProps} />

      case AIChatQSDataTypeEnum.TOOL_CALL_DECISION:
        return <AIToolDecision item={itemData} />

      case AIChatQSDataTypeEnum.HTTP_FLOW_FUZZ_STATUS:
        return <AIHttpFlowFuzzStatusCard item={itemData} />

      case AIChatQSDataTypeEnum.REPORT_FINISH:
        return <AIReportFinishCard item={itemData} />

      case AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION:
        return (
          <DividerCard
            status={AITaskStatus.cancel}
            name={t('AIChatListItem.taskEnd')}
            desc={t('AIChatListItem.taskEndDesc')}
            success={0}
            error={0}
          />
        )
      case AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION:
      case AIChatQSDataTypeEnum.FAIL_REACT:
        return <AiFailPlanCard item={data} />
      case AIChatQSDataTypeEnum.AI_API_REQUEST_FAILED:
        return <AIModelErrorPrompt item={itemData} />
      default:
        return <></>
    }
  })

  const renderContent = useMemoizedFn(() => {
    if (session === undefined) return null
    if (isStream)
      return (
        <StreamingChatContent
          {...item}
          itemIndex={itemIndex}
          session={session}
          hasNext={hasNext}
          streamClassName={aiStreamNodeProps}
        />
      )
    return <StaticChatContent {...item} session={session} render={(contentItem) => ChatItemRenderer(contentItem)} />
  })
  return <React.Fragment key={item.token}>{renderContent()}</React.Fragment>
})
