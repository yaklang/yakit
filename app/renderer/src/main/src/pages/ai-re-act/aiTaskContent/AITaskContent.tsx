import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { AITaskContentProps } from './type'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import { AIAgentTriggerEventInfo, AITabsEnumType } from '@/pages/ai-agent/aiAgentType'
import { YakitTabsProps } from '@/components/yakitSideTab/YakitSideTabType'
import styles from './AITaskContent.module.scss'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import { OutlineXIcon } from '@/assets/icon/outline'
import emiter from '@/utils/eventBus/eventBus'
import classNames from 'classnames'
import { AITaskExecutionDetails } from '@/pages/ai-agent/chatTemplate/aiTaskExecutionDetails/AITaskExecutionDetails'
import { AIReActTaskChatContent } from '../aiReActTaskChat/AIReActTaskChat'
import { AIReActTaskChatReviewBar } from '../aiReActTaskChat/AIReActTaskChatReviewBar'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { useStore } from 'zustand'
import { useCurrentStore } from '../hooks/useCurrentDataBySession'

interface TabsItemProps extends YakitTabsProps {
  taskId: string
  goal?: string
}

export const AITaskContent: React.FC<AITaskContentProps> = React.memo((props) => {
  const { tabBarExtraContent, emptyNode } = props
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi', 'yakitRoute'])

  const store = useCurrentStore()
  const taskChat = useStore(store, (state) => state.taskChat)

  const [tabs, setTabs, getTabs] = useGetSetState<TabsItemProps[]>([])
  const [activeKey, setActiveKey] = useState<string>('taskContent')
  const [scrollToBottom, setScrollToBottom] = useState(false)

  const isSetTaskTabRef = useRef<boolean>(false)

  const divRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(divRef)

  const onScrollToBottom = useMemoizedFn(() => {
    setScrollToBottom((v) => !v)
  })

  useEffect(() => {
    if (inViewport) {
      emiter.on('actionAITaskContentTab', onActionAITaskContentTab)
      return () => {
        emiter.off('actionAITaskContentTab', onActionAITaskContentTab)
      }
    }
  }, [inViewport])
  useEffect(() => {
    if (!isSetTaskTabRef.current && taskChat.elements.length) {
      setTabs((prv) => [
        {
          label: '深度规划',
          value: 'taskContent',
          taskId: 'taskContent',
        },
        ...prv,
      ])
      isSetTaskTabRef.current = true
    } else if (!taskChat.elements.length) {
      setTabs((prv) => prv.filter((item) => item.value !== 'taskContent'))
      isSetTaskTabRef.current = false
    }
  }, [taskChat.elements.length])
  const onActionAITaskContentTab = useMemoizedFn((data: string) => {
    try {
      const info: AIAgentTriggerEventInfo = JSON.parse(data)
      const { type, params } = info
      if (!params) return
      const { key, label, goal, taskId } = params
      switch (type) {
        case 'add':
          setTabs((v) => {
            const index = v.findIndex((item) => item.value === params.key)
            if (index !== -1) {
              return v.map((item, i) =>
                i === index
                  ? {
                      ...item,
                      label: label ?? item.label,
                      goal: goal ?? item.goal,
                      taskId: taskId ?? item.taskId,
                    }
                  : item,
              )
            }
            return [...v, { label: label ?? key, value: key, taskId: taskId ?? '', goal }]
          })
          setActiveKey(params.key)
          break
        case 'update':
          if (!label && !taskId) return
          setTabs((v) => {
            const index = v.findIndex((item) => item.value === key)
            if (index === -1) return v
            return v.map((item) =>
              item.value === key
                ? {
                    ...item,
                    label: label ?? item.label,
                    goal: goal ?? item.goal,
                    taskId: taskId ?? item.taskId,
                  }
                : item,
            )
          })
          setActiveKey(key)
          break
        default:
          break
      }
    } catch (error) {}
  })

  const onActiveKey = useMemoizedFn((key: AITabsEnumType) => {
    setActiveKey(key)
  })

  const onClose = useMemoizedFn((key: string) => {
    if (key === activeKey) {
      const index = getTabs().findIndex((item) => item.value === key)
      if (index !== -1) setActiveKey(getTabs()[index - 1]?.value || 'taskContent')
    }
    setTabs((v) => v.filter((item) => item.value !== key))
  })
  const tabBarRender = useMemoizedFn((tab: YakitTabsProps, node: ReactNode[]) => {
    const [label] = node
    const finalLabel = label ?? (typeof tab.label === 'function' ? tab.label() : tab.label)
    if (tab.value === 'taskContent') {
      return <>{finalLabel}</>
    }

    return (
      <div className={styles['tab-bar-item']}>
        <div className={styles['tab-bar-item-label']} title={typeof finalLabel === 'string' ? `${finalLabel}` : ''}>
          {finalLabel}
        </div>
        <OutlineXIcon
          onClick={(e) => {
            e.stopPropagation()
            onClose(tab.value)
          }}
          className={styles['x-icon']}
        />
      </div>
    )
  })
  const tabContent = useCreation(() => {
    switch (activeKey) {
      case 'taskContent':
        return <AIReActTaskChatContent scrollToBottom={scrollToBottom} onScrollToBottom={onScrollToBottom} />

      default:
        const taskItem = tabs.find((item) => item.value === activeKey)
        return (
          <AITaskExecutionDetails
            key={taskItem?.taskId}
            taskId={taskItem?.taskId || taskItem?.value || ''}
            taskGoal={taskItem?.goal}
            taskName={taskItem?.label as string}
          />
        )
    }
  }, [activeKey, onScrollToBottom, scrollToBottom, tabs])

  return (
    <div className={styles['chat-content-wrapper']} ref={divRef}>
      {!!taskChat?.elements?.length || !!tabs.length ? (
        <YakitSideTab
          key={i18n.language}
          type="horizontal"
          yakitTabs={tabs}
          activeKey={activeKey}
          onActiveKey={(key) => onActiveKey(key as AITabsEnumType)}
          onTabPaneRender={(ele, node) => tabBarRender(ele, node)}
          className={styles['ai-task-tab-wrap']}
          btnItemClassName={styles['ai-task-tab-item']}
          t={t}
          tabBarExtraContent={tabBarExtraContent}
        >
          {activeKey && <div className={classNames(styles['tab-content'])}>{tabContent}</div>}
        </YakitSideTab>
      ) : (
        emptyNode
      )}

      <AIReActTaskChatReviewBar setScrollToBottom={setScrollToBottom} />
    </div>
  )
})
