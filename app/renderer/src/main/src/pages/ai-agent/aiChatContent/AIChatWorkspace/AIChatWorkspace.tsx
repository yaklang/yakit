import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import {
  PluginExecuteHttpFlow,
  VulnerabilitiesRisksTable,
} from '@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { AITaskExecutionDetails } from '../../chatTemplate/aiTaskExecutionDetails/AITaskExecutionDetails'
import FilePreview from '../../components/aiFileSystemList/FilePreview/FilePreview'
import OperationLog from '../../components/aiFileSystemList/OperationLog/OperationLog'
import { AITabs, AITabsEnum } from '../../defaultConstant'
import type { AITabsEnumType, AIAgentTriggerEventInfo } from '../../aiAgentType'
import useAIAgentStore from '../../useContext/useStore'
import { useChatSessionPaneStore } from '../../ChatSessionPane/useChatSessionPaneStore'
import type { AIAgentTabPayload } from '../type'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import emiter from '@/utils/eventBus/eventBus'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  OutlineBugIcon,
  OutlineFlowIcon,
  OutlineListTodoIcon,
  OutlineNewspaperIcon,
  OutlineXIcon,
} from '@/assets/icon/outline'
import { FileDefault, FileSuffix, KeyToIcon } from '@/pages/yakRunner/FileTree/icon'
import styles from './AIChatWorkspace.module.scss'

interface AIChatWorkspaceProps {
  filePreviewData?: FileNodeProps
  setFilePreviewData: (data?: FileNodeProps) => void
  onTabsChange?: (count: number) => void
}

interface WorkspaceTab {
  key: string
  type: AITabsEnumType
  label: string
  file?: FileNodeProps
  taskId?: string
  taskGoal?: string
  runtimeId?: string
}

const TabIcons: Record<AITabsEnumType, React.ReactNode> = {
  [AITabsEnum.File_Preview]: null,
  [AITabsEnum.Task_Detail]: <OutlineListTodoIcon />,
  [AITabsEnum.HTTP]: <OutlineFlowIcon />,
  [AITabsEnum.Risk]: <OutlineBugIcon />,
  [AITabsEnum.Operation_Log]: <OutlineNewspaperIcon />,
}

const getFileIconByName = (name: string) => {
  const suffix = name.includes('.') ? name.split('.').pop() || '' : ''
  return suffix ? FileSuffix[suffix] || FileDefault : FileDefault
}

const getFileTabIcon = (file?: FileNodeProps) => {
  const iconKey = file?.icon && KeyToIcon[file.icon] ? file.icon : FileDefault
  return <img src={KeyToIcon[iconKey].iconPath} alt="" />
}

export const AIChatWorkspace: React.FC<AIChatWorkspaceProps> = React.memo((props) => {
  const { filePreviewData, setFilePreviewData, onTabsChange } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi', 'yakitRoute'])

  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const execFileRecord = useStore(store, (state) => state.execFileRecord)
  const httpTabShow = useStore(store, (state) => state.httpTabShow)
  const httpTabUpdate = useStore(store, (state) => state.httpTabUpdate)
  const riskTabShow = useStore(store, (state) => state.riskTabShow)
  const riskTabUpdate = useStore(store, (state) => state.riskTabUpdate)

  const { activeChat } = useAIAgentStore()
  const chatSessionVisible = useChatSessionPaneStore((state) => state.visible)
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
      key: AITabsEnum.File_Preview,
      type: AITabsEnum.File_Preview,
      label: file.name || file.path,
      file,
    })
  })

  useEffect(() => {
    if (filePreviewData) openFilePreview(filePreviewData)
  }, [filePreviewData])

  /** 流量、风险各自首次有数据时自动打开对应 tab，互不影响 */
  const autoOpenedHttpRef = useRef(false)
  const autoOpenedRiskRef = useRef(false)
  useEffect(() => {
    autoOpenedHttpRef.current = false
    autoOpenedRiskRef.current = false
    setTabs([])
    setActiveTabKey('')
    setFilePreviewData(undefined)
  }, [activeChat?.SessionID])
  useEffect(() => {
    if (httpTabShow && !autoOpenedHttpRef.current) {
      autoOpenedHttpRef.current = true
      openTab({ key: AITabsEnum.HTTP, type: AITabsEnum.HTTP, label: getDefaultLabel(AITabsEnum.HTTP) })
    }
    if (riskTabShow && !autoOpenedRiskRef.current) {
      autoOpenedRiskRef.current = true
      openTab({ key: AITabsEnum.Risk, type: AITabsEnum.Risk, label: getDefaultLabel(AITabsEnum.Risk) })
    }
  }, [httpTabShow, riskTabShow])

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
    if (key === AITabsEnum.HTTP && !httpTabShow && relatedRuntimeIDs.length === 0) return
    if (key === AITabsEnum.Risk && !riskTabShow && relatedRuntimeIDs.length === 0) return

    openTab({
      key,
      type: key,
      label: getDefaultLabel(key),
      runtimeId: value,
    })
  })

  const onOpenTaskDetail = useMemoizedFn((data: string) => {
    try {
      const info: AIAgentTriggerEventInfo = JSON.parse(data)
      const { type, params } = info
      if (!params) return
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
    } catch {}
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

  /** 关闭 runtimeId 筛选标签，恢复为会话聚合视图（旧 AIChatContent 行为） */
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
  }, [activeTab?.runtimeId])

  const onCloseTab = useMemoizedFn((event: React.MouseEvent, key: string) => {
    event.stopPropagation()
    const index = tabs.findIndex((item) => item.key === key)
    const nextTabs = tabs.filter((item) => item.key !== key)
    setTabs(nextTabs)
    if (activeTabKey === key) {
      const next = nextTabs[index] || nextTabs[index - 1]
      setActiveTabKey(next?.key || '')
    }
  })

  const tabContent = useMemo(() => {
    if (!activeTab) return null

    const runTimeIds = [
      ...new Set(activeTab.runtimeId ? [activeTab.runtimeId] : rawData.httpRunTimeIDs.concat(relatedRuntimeIDs)),
    ]
    const riskRunTimeIds = [
      ...new Set(activeTab.runtimeId ? [activeTab.runtimeId] : rawData.riskRunTimeIDs.concat(relatedRuntimeIDs)),
    ]
    switch (activeTab.type) {
      case AITabsEnum.File_Preview:
        return activeTab.file ? <FilePreview data={activeTab.file} /> : <YakitEmpty style={{ paddingTop: 48 }} />
      case AITabsEnum.Task_Detail:
        return activeTab.taskId ? (
          <AITaskExecutionDetails taskId={activeTab.taskId} taskName={activeTab.label} taskGoal={activeTab.taskGoal} />
        ) : (
          <YakitEmpty style={{ paddingTop: 48 }} />
        )
      case AITabsEnum.Risk:
        return riskRunTimeIds.length ? (
          <VulnerabilitiesRisksTable filterTagDom={filterTagDom} runTimeIDs={riskRunTimeIds} />
        ) : (
          <YakitEmpty style={{ paddingTop: 48 }} />
        )
      case AITabsEnum.HTTP:
        return runTimeIds.length ? (
          <PluginExecuteHttpFlow
            filterTagDom={filterTagDom}
            runtimeId={runTimeIds.join(',')}
            showAdvancedSearch
            showSetting
          />
        ) : (
          <YakitEmpty style={{ paddingTop: 48 }} />
        )
      case AITabsEnum.Operation_Log:
        return <OperationLog loading={false} list={operationLogList} />
      default:
        return null
    }
  }, [
    activeTab,
    httpTabUpdate,
    riskTabUpdate,
    relatedRuntimeIDs,
    filterTagDom,
    operationLogList,
    rawData.httpRunTimeIDs,
    rawData.riskRunTimeIDs,
  ])

  return (
    <div className={styles['workspace']}>
      <div
        className={classNames(styles['workspace-tab-bar'], {
          [styles['workspace-tab-bar-session-hidden']]: !chatSessionVisible && tabs.length > 0,
        })}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTabKey
          return (
            <Tooltip key={tab.key} title={tab.label} placement="top">
              <div
                className={classNames(styles['workspace-tab'], {
                  [styles['workspace-tab-active']]: isActive,
                })}
                onClick={() => setActiveTabKey(tab.key)}
              >
                <div className={styles['workspace-tab-main']}>
                  <span className={styles['workspace-tab-icon']}>
                    {tab.type === AITabsEnum.File_Preview ? getFileTabIcon(tab.file) : TabIcons[tab.type]}
                  </span>
                  <span className={classNames(styles['workspace-tab-label'], 'content-ellipsis')}>{tab.label}</span>
                </div>
                <span
                  className={classNames(styles['workspace-tab-close'], {
                    [styles['workspace-tab-close-show']]: isActive,
                  })}
                  onClick={(event) => onCloseTab(event, tab.key)}
                >
                  <OutlineXIcon />
                </span>
              </div>
            </Tooltip>
          )
        })}
      </div>
      <div className={styles['workspace-body']}>
        <div
          className={classNames(styles['workspace-pane'], {
            [styles['workspace-pane-gutter']]:
              activeTab?.type === AITabsEnum.HTTP || activeTab?.type === AITabsEnum.Risk,
          })}
        >
          {tabContent}
        </div>
      </div>
    </div>
  )
})
