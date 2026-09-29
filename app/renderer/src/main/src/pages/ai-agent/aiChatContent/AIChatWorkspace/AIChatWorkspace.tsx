import React, { useEffect, useMemo, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import classNames from 'classnames'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { AITabs, AITabsEnum } from '../../defaultConstant'
import type { AITabsEnumType, AIAgentTriggerEventInfo } from '../../aiAgentType'
import useAIAgentStore from '../../useContext/useStore'
import type { AIAgentTabPayload } from '../type'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import emiter from '@/utils/eventBus/eventBus'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { FileDefault, FileSuffix } from '@/pages/yakRunner/FileTree/icon'
import styles from './AIChatWorkspace.module.scss'
import { AIChatWorkspaceTabs, type AIChatWorkspaceTab } from './AIChatWorkspaceTabs/AIChatWorkspaceTabs'
import { AIChatWorkspaceTabContent, type HttpFlowSelectionProps } from './AIChatWorkspaceTabs/AIChatWorkspaceTabContent'

interface AIChatWorkspaceProps extends HttpFlowSelectionProps {
  /** 欢迎页且没有激活会话时，流量和漏洞页签展示全量数据 */
  welcome?: boolean
  filePreviewData?: FileNodeProps
  setFilePreviewData: (data?: FileNodeProps) => void
  onTabsChange?: (count: number) => void
}

type WorkspaceTab = AIChatWorkspaceTab

const getFileIconByName = (name: string) => {
  const suffix = name.includes('.') ? name.split('.').pop() || '' : ''
  return suffix ? FileSuffix[suffix] || FileDefault : FileDefault
}

export const AIChatWorkspace: React.FC<AIChatWorkspaceProps> = React.memo((props) => {
  const { welcome = false, filePreviewData, setFilePreviewData, onTabsChange } = props
  const selectionProps = useMemo(
    () => ({
      selectionScope: props.selectionScope,
      onSetSelectedHttpFlowIds: props.onSetSelectedHttpFlowIds,
      onRegisterTableSelectApi: props.onRegisterTableSelectApi,
    }),
    [props.selectionScope, props.onSetSelectedHttpFlowIds, props.onRegisterTableSelectApi],
  )
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi', 'yakitRoute'])

  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const execFileRecord = useStore(store, (state) => state.execFileRecord)
  const httpTabUpdate = useStore(store, (state) => state.httpTabUpdate)
  const riskTabUpdate = useStore(store, (state) => state.riskTabUpdate)
  // 原始数组会原地追加；按更新计数生成快照，确保 React Compiler 能感知数据变化。
  const httpRunTimeIDs = useCreation(() => [...rawData.httpRunTimeIDs], [rawData.httpRunTimeIDs, httpTabUpdate])
  const riskRunTimeIDs = useCreation(() => [...rawData.riskRunTimeIDs], [rawData.riskRunTimeIDs, riskTabUpdate])

  const { activeChat } = useAIAgentStore()
  const relatedRuntimeIDs = useMemo(() => activeChat?.RelatedRuntimeIDs ?? [], [activeChat?.RelatedRuntimeIDs])

  const [tabs, setTabs] = useState<WorkspaceTab[]>([])
  const [activeTabKey, setActiveTabKey] = useState('')

  useEffect(() => {
    onTabsChange?.(tabs.length)
  }, [tabs.length])

  const getDefaultLabel = useMemoizedFn((type: AITabsEnumType) => {
    const tab = AITabs[type]
    if (!tab) return type
    return t(tab.label) || tab.label
  })

  const openTab = useMemoizedFn((tab: WorkspaceTab) => {
    setTabs((current) => {
      const index = current.findIndex((item) => item.key === tab.key)
      if (index === -1) return [...current, tab]
      return current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...tab } : item))
    })
    setActiveTabKey(tab.key)
  })

  const openFilePreview = useMemoizedFn((file: FileNodeProps) => {
    if (file.isFolder) return
    openTab({
      key: `file:${file.path}`,
      type: AITabsEnum.File_Preview,
      label: file.name || file.path,
      file,
    })
  })

  useEffect(() => {
    if (filePreviewData) openFilePreview(filePreviewData)
  }, [filePreviewData])

  useEffect(() => {
    setTabs([])
    setActiveTabKey('')
    setFilePreviewData(undefined)
  }, [activeChat?.SessionID])

  const onSwitchAIAgentTab = useMemoizedFn((data?: string) => {
    if (!data) return
    let payload: AIAgentTabPayload
    try {
      payload = JSON.parse(data)
    } catch {
      return
    }

    const { key, value } = payload
    if (key === AITabsEnum.File_Preview) {
      if (!value) {
        if (filePreviewData) openFilePreview(filePreviewData)
        return
      }
      const name = value.split(/[\\/]/).pop() || value
      const file: FileNodeProps = {
        parent: null,
        name,
        path: value,
        isFolder: false,
        icon: getFileIconByName(name),
        depth: 0,
        isLeaf: true,
      }
      setFilePreviewData(file)
      return
    }

    if (key === AITabsEnum.Task_Detail) return

    // 手动切换始终打开 tab，无数据时由内容区域展示空状态。
    openTab({
      key,
      type: key,
      label: getDefaultLabel(key),
      runtimeId: value,
    })
  })

  const onOpenTaskDetail = useMemoizedFn((data: string) => {
    let info: AIAgentTriggerEventInfo
    try {
      info = JSON.parse(data)
    } catch {
      return
    }
    if (!info?.params) return
    const { type, params } = info
    const key = params.key as string
    const taskId = (params.taskId || key) as string
    if (!key || !taskId) return
    const tabKey = `task:${key}`

    if (type === 'update') {
      if (!tabs.some((item) => item.key === tabKey)) return
      setTabs((current) =>
        current.map((item) =>
          item.key === tabKey
            ? {
                ...item,
                label: params.label ?? item.label,
                taskId: params.taskId ?? item.taskId,
                taskGoal: params.goal ?? item.taskGoal,
              }
            : item,
        ),
      )
      setActiveTabKey(tabKey)
      return
    }

    if (type === 'add') {
      openTab({
        key: tabKey,
        type: AITabsEnum.Task_Detail,
        label: params.label || key,
        taskId,
        taskGoal: params.goal,
      })
    }
  })

  useEffect(() => {
    emiter.on('switchAIActTab', onSwitchAIAgentTab)
    emiter.on('actionAITaskContentTab', onOpenTaskDetail)
    return () => {
      emiter.off('switchAIActTab', onSwitchAIAgentTab)
      emiter.off('actionAITaskContentTab', onOpenTaskDetail)
    }
  }, [])

  const operationLogList = useCreation(() => {
    return Array.from(execFileRecord.values())
      .flat()
      .sort((a, b) => b.order - a.order)
  }, [execFileRecord])

  const activeTab = tabs.find((item) => item.key === activeTabKey)

  /** 关闭 runtimeId 筛选标签，恢复为会话聚合视图（同 AIChatContent 行为）*/
  const onClearRuntimeFilter = useMemoizedFn(() => {
    if (!activeTabKey) return
    setTabs((current) => current.map((item) => (item.key === activeTabKey ? { ...item, runtimeId: undefined } : item)))
  })

  const filterTagDom = useMemo(() => {
    if (!activeTab?.runtimeId) return null
    const showId = activeTab.runtimeId.slice(0, 20) + '…'
    return (
      <YakitTag color="info" closable onClose={onClearRuntimeFilter}>
        {showId}
      </YakitTag>
    )
  }, [activeTab?.runtimeId, onClearRuntimeFilter])

  const closeTab = useMemoizedFn((key: string) => {
    const index = tabs.findIndex((item) => item.key === key)
    const nextTabs = tabs.filter((item) => item.key !== key)
    setTabs(nextTabs)
    if (activeTabKey === key) {
      const next = nextTabs[index] || nextTabs[index - 1]
      setActiveTabKey(next?.key || '')
    }
  })

  const closeOtherTabs = useMemoizedFn((key: string) => {
    setTabs((current) => current.filter((item) => item.key === key))
    setActiveTabKey(key)
  })

  const closeRightTabs = useMemoizedFn((key: string) => {
    const index = tabs.findIndex((item) => item.key === key)
    if (index === -1) return
    const nextTabs = tabs.slice(0, index + 1)
    setTabs(nextTabs)
    if (!nextTabs.some((item) => item.key === activeTabKey)) {
      setActiveTabKey(key)
    }
  })

  const closeAllTabs = useMemoizedFn(() => {
    setTabs([])
    setActiveTabKey('')
  })

  const showAll = welcome && !activeChat?.SessionID
  const runtimeId = activeTab?.runtimeId
  const runTimeIds = useMemo(
    () => [...new Set(runtimeId ? [runtimeId] : httpRunTimeIDs.concat(relatedRuntimeIDs))],
    [runtimeId, httpRunTimeIDs, relatedRuntimeIDs],
  )
  const riskRunTimeIds = useMemo(
    () => [...new Set(runtimeId ? [runtimeId] : riskRunTimeIDs.concat(relatedRuntimeIDs))],
    [runtimeId, riskRunTimeIDs, relatedRuntimeIDs],
  )

  return (
    <div className={styles['workspace']}>
      <AIChatWorkspaceTabs
        tabs={tabs}
        activeKey={activeTabKey}
        onActiveChange={setActiveTabKey}
        onClose={closeTab}
        onCloseOthers={closeOtherTabs}
        onCloseRight={closeRightTabs}
        onCloseAll={closeAllTabs}
      />
      <div className={styles['workspace-body']}>
        <div
          className={classNames(styles['workspace-pane'], {
            [styles['workspace-pane-gutter']]:
              activeTab?.type === AITabsEnum.HTTP || activeTab?.type === AITabsEnum.Risk,
          })}
        >
          <AIChatWorkspaceTabContent
            activeTab={activeTab}
            showAll={showAll}
            runTimeIds={runTimeIds}
            riskRunTimeIds={riskRunTimeIds}
            filterTagDom={filterTagDom}
            selectionProps={selectionProps}
            operationLogList={operationLogList}
            sessionID={activeChat?.SessionID}
          />
        </div>
      </div>
    </div>
  )
})
