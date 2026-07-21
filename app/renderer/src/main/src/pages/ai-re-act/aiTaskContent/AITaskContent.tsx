import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { AITaskContentProps } from './type'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import { AIAgentTriggerEventInfo, AITabsEnumType } from '@/pages/ai-agent/aiAgentType'
import { YakitTabsProps } from '@/components/yakitSideTab/YakitSideTabType'
import styles from './AITaskContent.module.scss'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useInViewport, useMemoizedFn } from 'ahooks'
import { OutlineXIcon } from '@/assets/icon/outline'
import emiter from '@/utils/eventBus/eventBus'
import { AITaskExecutionDetails } from '@/pages/ai-agent/chatTemplate/aiTaskExecutionDetails/AITaskExecutionDetails'
import { AIReActTaskChatContent } from '../aiReActTaskChat/AIReActTaskChat'
import { AIReActTaskChatReviewBar } from '../aiReActTaskChat/AIReActTaskChatReviewBar'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'
import { useEnsureTaskPlanLocate } from './hooks/useEnsureTaskPlanLocate'

interface TabsItemProps extends YakitTabsProps {
  taskId: string
  goal?: string
}

const TASK_CONTENT_KEY = 'taskContent'

export const AITaskContent: React.FC<AITaskContentProps> = React.memo((props) => {
  const { tabBarExtraContent, onTabsChange } = props
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi', 'yakitRoute'])

  const {
    chatIPCData: { taskChat },
  } = useChatIPCStore()
  const [tabs, setTabs, getTabs] = useGetSetState<TabsItemProps[]>([])
  const [activeKey, setActiveKey] = useState<string>(TASK_CONTENT_KEY)
  const [scrollToBottom, setScrollToBottom] = useState(false)
  /** 任务规划关闭后用 display:none 保留，不销毁 */
  const [taskPlanMounted, setTaskPlanMounted] = useState(false)

  const isSetTaskTabRef = useRef<boolean>(false)

  const divRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(divRef)

  const onScrollToBottom = useMemoizedFn(() => {
    setScrollToBottom((v) => !v)
  })

  useEffect(() => {
    onTabsChange?.(tabs.length)
  }, [tabs.length])

  useEffect(() => {
    if (inViewport) {
      emiter.on('actionAITaskContentTab', onActionAITaskContentTab)
      return () => {
        emiter.off('actionAITaskContentTab', onActionAITaskContentTab)
      }
    }
  }, [inViewport])

  const ensurePlanTab = useMemoizedFn(() => {
    const inTabs = getTabs().some((item) => item.value === TASK_CONTENT_KEY)
    if (inTabs) return
    setTabs((prv) => {
      if (prv.some((item) => item.value === TASK_CONTENT_KEY)) return prv
      return [
        {
          label: '深度规划',
          value: TASK_CONTENT_KEY,
          taskId: TASK_CONTENT_KEY,
        },
        ...prv,
      ]
    })
    setTaskPlanMounted(true)
    isSetTaskTabRef.current = true
  })

  useEnsureTaskPlanLocate({
    taskContentKey: TASK_CONTENT_KEY,
    activeKey,
    taskPlanMounted,
    tabsLength: tabs.length,
    hasPlanContent: !!taskChat.elements.length,
    getTabs,
    ensurePlanTab,
    setActiveKey,
  })

  useEffect(() => {
    if (!isSetTaskTabRef.current && taskChat.elements.length) {
      setTabs((prv) => [
        {
          label: '深度规划',
          value: TASK_CONTENT_KEY,
          taskId: TASK_CONTENT_KEY,
        },
        ...prv,
      ])
      setTaskPlanMounted(true)
      isSetTaskTabRef.current = true
      // 当前 active 无效时（如关掉详情后）自动选中任务规划
      const tabsNow = getTabs()
      setActiveKey((prev) => (tabsNow.some((item) => item.value === prev) ? prev : TASK_CONTENT_KEY))
    } else if (!taskChat.elements.length) {
      setTabs((prv) => prv.filter((item) => item.value !== TASK_CONTENT_KEY))
      setTaskPlanMounted(false)
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
    const currentTabs = getTabs()
    const index = currentTabs.findIndex((item) => item.value === key)
    if (key === activeKey && index !== -1) {
      const nextTab = currentTabs[index - 1] || currentTabs[index + 1]
      setActiveKey(nextTab?.value || '')
    }
    const nextTabs = currentTabs.filter((item) => item.value !== key)
    setTabs(() => nextTabs)
    // 任务规划：仅从 tab 栏移除，组件保留；其它 tab 关闭即销毁（不再渲染）
    if (key === TASK_CONTENT_KEY && nextTabs.length === 0) {
      // tab 栏空了会卸掉 SideTab，无法再靠 display:none 保留
      setTaskPlanMounted(false)
    }
  })

  const tabBarRender = useMemoizedFn((tab: YakitTabsProps, node: ReactNode[]) => {
    const [label] = node
    const finalLabel = label ?? (typeof tab.label === 'function' ? tab.label() : tab.label)

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

  const activeTaskItem = tabs.find((item) => item.value === activeKey && item.value !== TASK_CONTENT_KEY)

  return (
    <div className={styles['chat-content-wrapper']} ref={divRef}>
      {!!tabs.length && (
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
          <div className={styles['tab-content']}>
            {/* 任务规划：关闭后仍挂载，用 display:none 隐藏 */}
            {taskPlanMounted && (
              <div
                className={styles['tab-pane']}
                style={{ display: activeKey === TASK_CONTENT_KEY ? undefined : 'none' }}
              >
                <AIReActTaskChatContent scrollToBottom={scrollToBottom} onScrollToBottom={onScrollToBottom} />
              </div>
            )}
            {/* 其它 tab：只渲染当前激活的，关掉即销毁 */}
            {activeTaskItem && (
              <div className={styles['tab-pane']}>
                <AITaskExecutionDetails
                  key={activeTaskItem.taskId}
                  taskId={activeTaskItem.taskId || activeTaskItem.value || ''}
                  taskGoal={activeTaskItem.goal}
                  taskName={activeTaskItem.label as string}
                />
              </div>
            )}
          </div>
        </YakitSideTab>
      )}

      <AIReActTaskChatReviewBar setScrollToBottom={setScrollToBottom} />
    </div>
  )
})
