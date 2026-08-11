import React, { type ReactNode, useEffect, useRef, useState } from 'react'
import type { AITaskContentProps } from './type'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import type { AIAgentTriggerEventInfo, AITabsEnumType } from '@/pages/ai-agent/aiAgentType'
import type { YakitTabsProps } from '@/components/yakitSideTab/YakitSideTabType'
import styles from './AITaskContent.module.scss'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useInViewport, useMemoizedFn } from 'ahooks'
import { OutlineXIcon } from '@/assets/icon/outline'
import emiter from '@/utils/eventBus/eventBus'
import { AITaskExecutionDetails } from '@/pages/ai-agent/chatTemplate/aiTaskExecutionDetails/AITaskExecutionDetails'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'

import { useCurrentStore } from '../hooks/useCurrentDataBySession'

interface TabsItemProps extends YakitTabsProps {
  taskId: string
  goal?: string
}

export const AITaskContent: React.FC<AITaskContentProps> = React.memo((props) => {
  const { tabBarExtraContent, onTabsChange } = props
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent', 'yakitUi', 'yakitRoute'])

  const store = useCurrentStore()

  const [tabs, setTabs, getTabs] = useGetSetState<TabsItemProps[]>([])
  const [activeKey, setActiveKey] = useState<string>('')

  const divRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(divRef)

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

  const activeTaskItem = tabs.find((item) => item.value === activeKey)

  return (
    <div className={styles['chat-content-wrapper']} ref={divRef}>
      {!!tabs.length && (
        <YakitSideTab
          key={i18nRefresh}
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
            {/* 任务执行详情 tab：只渲染当前激活的，关掉即销毁 */}
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
    </div>
  )
})
