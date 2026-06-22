import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { AITaskContentProps } from './type'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import { AIAgentTriggerEventInfo, AITabsEnumType } from '@/pages/ai-agent/aiAgentType'
import { YakitSideTabProps, YakitTabsProps } from '@/components/yakitSideTab/YakitSideTabType'
import styles from './AITaskContent.module.scss'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import { OutlineXIcon } from '@/assets/icon/outline'
import emiter from '@/utils/eventBus/eventBus'
import classNames from 'classnames'
import { AITaskExecutionDetails } from '@/pages/ai-agent/chatTemplate/aiTaskExecutionDetails/AITaskExecutionDetails'
import { AIReActTaskChatContent } from '../aiReActTaskChat/AIReActTaskChat'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'

export const AITaskContent: React.FC<AITaskContentProps> = React.memo((props) => {
  const { tabBarExtraContent, emptyNode } = props
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi', 'yakitRoute'])

  const { taskChat } = useChatIPCStore().chatIPCData
  const [tabs, setTabs, getTabs] = useGetSetState<YakitSideTabProps['yakitTabs']>([])
  const [activeKey, setActiveKey] = useState<string>('taskContent')

  const isSetTaskTabRef = useRef<boolean>(false)
  const taskGoalRef = useRef<Map<string, string>>(new Map())
  const divRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(divRef)

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
      const { key, label, goal } = params
      switch (type) {
        case 'add':
          taskGoalRef.current.set(key, goal)
          setTabs((v) => {
            const index = v.findIndex((item) => item.value === params.key)
            if (index !== -1) {
              return v
            }
            return [...v, { label: label, value: key }]
          })
          setActiveKey(params.key)
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
        <div className={styles['tab-bar-item-label']} title={`${finalLabel}`}>
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
        return <AIReActTaskChatContent />

      default:
        const taskItem = tabs.find((item) => item.value === activeKey)
        const goal = taskGoalRef.current.get(activeKey)
        return <AITaskExecutionDetails taskId={activeKey} taskGoal={goal} taskName={taskItem?.label as string} />
    }
  }, [activeKey, tabs])
  return (
    <div className={styles['chat-content-wrapper']}>
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
    </div>
  )
})
