import React, { memo, useEffect, useMemo, useState } from 'react'
import { useControllableValue, useCreation, useMemoizedFn, useMount } from 'ahooks'
import type { AIChatLeftSideProps, AIChatToolDrawerContentProps } from '../aiAgentType'
import { OutlineChevronrightIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { grpcQueryAIToolDetails } from '../grpc'
import { type AIChatQSData, AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import { type AIEventQueryRequest, type AIInputEvent, AIInputEventSyncTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { taskAnswerToIconMap } from '../defaultConstant'
import StreamCard from '../components/StreamCard'
import i18n from '@/i18n/i18n'

import classNames from 'classnames'
import styles from './AIAgentChatTemplate.module.scss'
import { PreWrapper } from '../components/ToolInvokerCard'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import TimelineCard from './TimelineCard/TimelineCard'
import AIMemoryList from './aiMemoryList/AIMemoryList'
import { YakitResizeBox, type YakitResizeBoxProps } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { HistoryTaskTree } from './historyTaskTree/HistoryTaskTree'
import { AIReviewParams } from '../components/aiReviewResult/AIReviewResult'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'

export enum AIChatLeft {
  TaskTree = 'task-tree',
  Timeline = 'timeline',
}

/** @name chat-左侧侧边栏 */
export const AIChatLeftSide: React.FC<AIChatLeftSideProps> = memo((props) => {
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])

  const { onSend } = useAIAgentDispatcher()
  const sessionId = useCurrentSessionId()

  const store = useCurrentStore()
  const rawData = useCurrentRawData()

  const currentPlan = useStore(store, (state) => state.currentPlan)
  const execute = useStore(store, (state) => state.execute)
  const memoryListUpdate = useStore(store, (state) => state.memoryListUpdate)

  const [activeTab, setActiveTab] = useState<AIChatLeft>(AIChatLeft.Timeline)
  const [expand, setExpand] = useControllableValue<boolean>(props, {
    defaultValue: true,
    valuePropName: 'expand',
    trigger: 'setExpand',
  })
  // 任务规划和自由对话数据已合并到 chatElements currentPlan.task_tree 判断是否有任务树
  const hasTaskTree = useCreation(() => {
    return (currentPlan?.task_tree?.length ?? 0) > 0
  }, [currentPlan?.task_tree])
  useEffect(() => {
    if (hasTaskTree) {
      setActiveTab(AIChatLeft.TaskTree)
    }
  }, [hasTaskTree])

  const length = useCreation(() => {
    return rawData?.memoryList?.memories?.length || 0
  }, [memoryListUpdate])

  const handleCancelExpand = useMemoizedFn(() => {
    setExpand(false)
  })

  const onSendPlayHistoryList = useMemoizedFn(() => {
    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS,

      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: 'task', params: info })
  })

  const renderDom = useMemoizedFn(() => {
    switch (activeTab) {
      case AIChatLeft.TaskTree:
        return <HistoryTaskTree />
      case AIChatLeft.Timeline:
        return <TimelineCard />
      default:
        break
    }
  })

  const handleTabChange = useMemoizedFn((value: AIChatLeft) => {
    setActiveTab(value)
    if (execute && value === AIChatLeft.TaskTree) {
      onSendPlayHistoryList()
    }
  })

  const button = useMemo(() => {
    const options = [
      { label: t('AIAgentChatTemplate.timeline'), value: AIChatLeft.Timeline },
      { label: t('AIAgentChatTemplate.tasklist'), value: AIChatLeft.TaskTree },
    ]
    return (
      <YakitRadioButtons
        buttonStyle="solid"
        size="middle"
        defaultValue={AIChatLeft.TaskTree}
        options={options}
        value={activeTab}
        onChange={({ target }) => handleTabChange(target.value)}
      />
    )
  }, [activeTab, handleTabChange, i18nRefresh])
  const extraProps = useCreation(() => {
    const p: Omit<YakitResizeBoxProps, 'firstNode' | 'secondNode'> = {}
    if (!length) {
      p.firstRatio = '100%'
      p.secondRatio = '0%'
      p.secondNodeStyle = {
        display: 'none',
        padding: 0,
      }
      p.lineStyle = {
        display: 'none',
        padding: 0,
      }
    }
    return p
  }, [length])
  return (
    <div className={classNames(styles['ai-chat-left-side'], { [styles['ai-chat-left-side-hidden']]: !expand })}>
      <YakitResizeBox
        isVer
        firstNode={
          <div className={styles['list-wrapper']}>
            <div className={styles['side-header']}>
              <YakitButton
                type="outline2"
                className={styles['side-header-btn']}
                icon={<OutlineChevronrightIcon />}
                onClick={handleCancelExpand}
                size="small"
              />
              <div className={styles['header-title']}>{button}</div>
            </div>

            <div className={styles['task-list']}>{renderDom()}</div>
          </div>
        }
        secondNode={
          !!length && (
            <div className={styles['memory-wrapper']}>
              <AIMemoryList />
            </div>
          )
        }
        {...extraProps}
      />
    </div>
  )
})

export const AIChatToolDrawerContent: React.FC<AIChatToolDrawerContentProps> = memo((props) => {
  const { callToolId, aiFilePath } = props
  const [toolList, setToolList] = useState<AIChatQSData[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const store = useCurrentStore()
  const execFileRecord = useStore(store, (state) => state.execFileRecord)

  const getList = useMemoizedFn(() => {
    if (!callToolId) return
    const params: AIEventQueryRequest = {
      ProcessID: callToolId,
    }
    setLoading(true)
    grpcQueryAIToolDetails(params)
      .then(setToolList)
      .finally(() => {
        setTimeout(() => {
          setLoading(false)
        }, 200)
      })
  })

  useMount(getList)

  return (
    <div className={styles['ai-chat-tool-drawer-content']}>
      {loading ? (
        <YakitSpin />
      ) : (
        <>
          {toolList.map((info) => {
            const { id, Timestamp, type, data } = info
            switch (type) {
              case AIChatQSDataTypeEnum.STREAM:
              case AIChatQSDataTypeEnum.TOOL_CALL_RESULT: {
                const { NodeIdVerbose, CallToolID, content, NodeId } = data
                const fileList = execFileRecord.get(CallToolID)
                const language = i18n.language.charAt(0).toUpperCase() + i18n.language.slice(1)
                const nodeLabel = NodeIdVerbose[language] || NodeIdVerbose['Zh']
                return (
                  <StreamCard
                    key={id}
                    titleText={nodeLabel}
                    titleIcon={taskAnswerToIconMap[NodeId]}
                    content={<PreWrapper code={content} />}
                    modalInfo={{
                      time: Timestamp,
                      title: info.AIModelName,
                      icon: info.AIService,
                    }}
                    operationInfo={{ aiFilePath }}
                    fileList={fileList}
                  />
                )
              }
              case AIChatQSDataTypeEnum.TOOL_CALL_PARAM: {
                const { call_tool_id } = data
                const fileList = execFileRecord.get(call_tool_id)
                return (
                  <StreamCard
                    key={id}
                    titleText={'工具参数'}
                    content={<AIReviewParams params={data.params} isPreStyle={true} />}
                    modalInfo={{
                      time: Timestamp,
                      title: info.AIModelName,
                      icon: info.AIService,
                    }}
                    operationInfo={{ aiFilePath }}
                    fileList={fileList}
                  />
                )
              }
              default:
                return <React.Fragment key={id}></React.Fragment>
            }
          })}
        </>
      )}
    </div>
  )
})
