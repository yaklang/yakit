import React from 'react'
import { AIChatListItemProps } from './type'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import AIGroupItem from './aiGroupItem/AIGroupItem'
import AITaskItem from './aiTaskItem/AITaskItem'
import StaticChatContent from './StaticChatContent/StaticChatContent'

export const AIChatListItem: React.FC<AIChatListItemProps> = React.memo((props) => {
  const { item } = props

  const store = useCurrentStore()

  // 防止没数据出错,所以没从item中取kind
  const kind = useStore(store, (state) => {
    if (state.items[item.token]) return 'item'
    if (state.groups[item.token]) return 'group'
    if (state.tasks[item.token]) return 'task'
    return null
  })
  // const execFileRecord = useStore(store, (state) => state.execFileRecord)

  // const { activeChat } = useAIAgentStore()
  // const session = sessionProp || activeChat?.SessionID

  // const isStream = useCreation(() => {
  //   return (
  //     item.type === AIChatQSDataTypeEnum.STREAM ||
  //     item.type === AIChatQSDataTypeEnum.STREAM_GROUP ||
  //     item.type === AIChatQSDataTypeEnum.TASK_NODE_GROUP ||
  //     item.type === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP
  //   )
  // }, [item.type])

  // const ChatItemRenderer = useMemoizedFn((itemData: AIChatQSData) => {
  //   const { type, Timestamp, data, extraValue } = itemData
  //   switch (type) {
  //     case AIChatQSDataTypeEnum.QUESTION:
  //       return (
  //         <AITriageChatContent
  //           isAnswer={false}
  //           content={data?.qs}
  //           extraValue={extraValue}
  //           {...chatContentExtraProps}
  //           // contentClassName={classNames({
  //           //   [styles['file-content-wrapper']]: isExtraShow(extraValue),
  //           // })}
  //         />
  //       )
  //     // case AIChatQSDataTypeEnum.STREAM:
  //     //     return <AIStreamNode {...aiStreamNodeProps} stream={item} />
  //     case AIChatQSDataTypeEnum.RESULT:
  //       return <AITriageChatContent isAnswer={true} content={data} {...chatContentExtraProps} />
  //     case AIChatQSDataTypeEnum.THOUGHT:
  //       return (
  //         <AITriageChatContent
  //           isAnswer={true}
  //           content={`${t('AIChatListItem.thinking')}${data}`}
  //           {...chatContentExtraProps}
  //         />
  //       )
  //     case AIChatQSDataTypeEnum.TOOL_RESULT:
  //       const fileList = execFileRecord.get(data.callToolId)
  //       return (
  //         <ToolInvokerCard
  //           titleText={t('AIChatListItem.toolCall')}
  //           fileList={fileList}
  //           modalInfo={{
  //             time: Timestamp,
  //             title: itemData.AIModelName,
  //             icon: itemData.AIService,
  //           }}
  //           operationInfo={{
  //             callToolId: data.callToolId,
  //             aiFilePath: data.tool.dirPath,
  //           }}
  //           data={data}
  //           chatType={item.chatType}
  //           token={item.token}
  //         />
  //       )
  //     case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
  //     case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
  //     case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
  //     case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
  //     case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
  //       if (!!itemData.data.selected) {
  //         if (
  //           type === AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE ||
  //           type === AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE
  //         )
  //           return null
  //         return <AIReviewResult info={itemData} timestamp={Timestamp} />
  //       } else {
  //         return (
  //           <AIReActChatReview
  //             chatType="casual"
  //             info={itemData}
  //             isEmbedded={true}
  //             expand={true}
  //             className={styles['review-wrapper']}
  //           />
  //         )
  //       }
  //     case AIChatQSDataTypeEnum.USER_MANUAL_INTERVENTION:
  //       return <AIManualIntervention info={itemData} timestamp={Timestamp} />
  //     /** 该UI已无效，可以删除 */
  //     // case AIChatQSDataTypeEnum.TASK_INDEX_NODE:
  //     //   const dividerCardProps = {
  //     //     status: data?.status as AITaskStatus,
  //     //     desc: data?.goal,
  //     //     name: data?.taskName,
  //     //     success: 0,
  //     //     error: 0,
  //     //   }
  //     //   return <DividerCard {...dividerCardProps} />

  //     case AIChatQSDataTypeEnum.TOOL_CALL_DECISION:
  //       return <AIToolDecision item={itemData} />

  //     case AIChatQSDataTypeEnum.HTTP_FLOW_FUZZ_STATUS:
  //       return <AIHttpFlowFuzzStatusCard item={itemData} />

  //     case AIChatQSDataTypeEnum.REPORT_FINISH:
  //       return <AIReportFinishCard item={itemData} />

  //     case AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION:
  //       return (
  //         <DividerCard
  //           status={AITaskStatus.cancel}
  //           name={t('AIChatListItem.taskEnd')}
  //           desc={t('AIChatListItem.taskEndDesc')}
  //           success={0}
  //           error={0}
  //         />
  //       )
  //     case AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION:
  //     case AIChatQSDataTypeEnum.FAIL_REACT:
  //       return <AiFailPlanCard item={data} />
  //     case AIChatQSDataTypeEnum.AI_API_REQUEST_FAILED:
  //       return <AIModelErrorPrompt item={itemData} />
  //     default:
  //       return <></>
  //   }
  // })

  // const renderContent = useMemoizedFn(() => {
  //   if (session === undefined) return null
  //   if (isStream)
  //     return (
  //       <StreamingChatContent
  //         {...item}
  //         itemIndex={itemIndex}
  //         session={session}
  //         hasNext={hasNext}
  //         streamClassName={aiStreamNodeProps}
  //       />
  //     )
  //   return <StaticChatContent token={item.token} render={(contentItem) => ChatItemRenderer(contentItem)} />
  // })
  const renderContent = useMemoizedFn(() => {
    switch (kind) {
      case 'item':
        return <StaticChatContent token={item.token} />
      case 'group':
        return <AIGroupItem token={item.token} />

      case 'task':
        return <AITaskItem item={item} />
      default:
        return null
    }
  })
  return <React.Fragment key={item.token}>{renderContent()}</React.Fragment>
})
