import React, { useEffect, useMemo, useRef } from 'react'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import {
  PluginExecuteHttpFlow,
  VulnerabilitiesRisksTable,
} from '@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult'
import { AITaskExecutionDetails } from '../../../chatTemplate/aiTaskExecutionDetails/AITaskExecutionDetails'
import FilePreview from '../../../components/aiFileSystemList/FilePreview/FilePreview'
import OperationLog from '../../../components/aiFileSystemList/OperationLog/OperationLog'
import { AITabsEnum } from '../../../defaultConstant'
import type { StreamResult } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import type { HttpFlowSelectionApi } from '@/components/useHttpFlowSelection'
import type { AIChatWorkspaceTab } from './AIChatWorkspaceTabs'

export interface HttpFlowSelectionProps {
  selectionScope?: object
  onSetSelectedHttpFlowIds?: (ids: string[]) => void
  onRegisterTableSelectApi?: (api?: HttpFlowSelectionApi) => void
}

// 每次表格卸载或输入目标切换后，旧的防抖通知及 API 注册立即失效。
const WorkspaceHttpFlow: React.FC<
  Omit<React.ComponentProps<typeof PluginExecuteHttpFlow>, keyof HttpFlowSelectionProps> & HttpFlowSelectionProps
> = ({ selectionScope, onSetSelectedHttpFlowIds, onRegisterTableSelectApi, ...props }) => {
  const instance = useMemo(() => ({ active: true }), [selectionScope])
  const current = useRef(instance)
  current.current = instance
  useEffect(() => {
    instance.active = true
    return () => {
      instance.active = false
      onRegisterTableSelectApi?.(undefined)
      onSetSelectedHttpFlowIds?.([])
    }
  }, [instance, onRegisterTableSelectApi, onSetSelectedHttpFlowIds])
  return (
    <PluginExecuteHttpFlow
      {...props}
      onSetSelectedHttpFlowIds={(ids) => {
        if (instance.active && current.current === instance) onSetSelectedHttpFlowIds?.(ids)
      }}
      onRegisterTableSelectApi={(api) => {
        if (instance.active && current.current === instance) onRegisterTableSelectApi?.(api)
      }}
    />
  )
}

export interface AIChatWorkspaceTabContentProps {
  activeTab?: AIChatWorkspaceTab
  showAll: boolean
  runTimeIds: string[]
  riskRunTimeIds: string[]
  filterTagDom: React.ReactNode
  selectionProps: HttpFlowSelectionProps
  operationLogList: StreamResult.Log[]
  sessionID?: string
}

/** 工作区激活页签内容区：文件预览 / 任务详情 / 漏洞 / HTTP 流量 / 操作日志 */
export const AIChatWorkspaceTabContent: React.FC<AIChatWorkspaceTabContentProps> = React.memo((props) => {
  const { activeTab, showAll, runTimeIds, riskRunTimeIds, filterTagDom, selectionProps, operationLogList, sessionID } =
    props

  if (!activeTab) return null

  switch (activeTab.type) {
    case AITabsEnum.File_Preview:
      return activeTab.file ? <FilePreview data={activeTab.file} /> : <YakitEmpty style={{ paddingTop: 48 }} />
    case AITabsEnum.Task_Detail:
      return activeTab.taskId ? (
        <AITaskExecutionDetails taskId={activeTab.taskId} taskName={activeTab.label} taskGoal={activeTab.taskGoal} />
      ) : (
        <YakitEmpty style={{ paddingTop: 48 }} />
      )
    case AITabsEnum.Risk: {
      if (showAll) return <VulnerabilitiesRisksTable runTimeIDs={[]} />
      return riskRunTimeIds.length ? (
        <VulnerabilitiesRisksTable filterTagDom={filterTagDom} runTimeIDs={riskRunTimeIds} />
      ) : (
        <YakitEmpty style={{ paddingTop: 48 }} />
      )
    }
    case AITabsEnum.HTTP:
      if (showAll)
        return (
          <WorkspaceHttpFlow
            key="welcome"
            {...selectionProps}
            pageType="History"
            runtimeId=""
            sourceType=""
            showAdvancedSearch
            showSetting
          />
        )
      return runTimeIds.length ? (
        <WorkspaceHttpFlow
          key={`${sessionID}:${activeTab.runtimeId || ''}`}
          {...selectionProps}
          pageType="Plugin"
          filterTagDom={filterTagDom}
          runtimeId={runTimeIds.join(',')}
          sourceType=""
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
})
