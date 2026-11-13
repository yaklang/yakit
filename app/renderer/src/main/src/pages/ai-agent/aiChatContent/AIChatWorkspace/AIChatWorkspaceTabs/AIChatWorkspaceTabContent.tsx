import React, { useEffect, useMemo, useRef } from 'react'
import { getRunTimeIdObj, normalizeHTTPFlowTotal } from '@/components/HTTPFlowTable/HTTPFlowTable.utils'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  PluginExecuteHttpFlow,
  VulnerabilitiesRisksTable,
} from '@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult'
import { AITaskExecutionDetails } from '../../../chatTemplate/aiTaskExecutionDetails/AITaskExecutionDetails'
import FilePreview from '../../../components/aiFileSystemList/FilePreview/FilePreview'
import OperationLog from '../../../components/aiFileSystemList/OperationLog/OperationLog'
import { AITabsEnum } from '../../../defaultConstant'
import { grpcQueryHTTPFlows } from '../../../grpc'
import type { StreamResult } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import type { HttpFlowSelectionApi } from '@/components/useHttpFlowSelection'
import type { AIRiskSelection } from '@/pages/risks/YakitRiskTable/YakitRiskTableType'
import type { AIChatWorkspaceTab } from './AIChatWorkspaceTabs'
import styles from '../AIChatWorkspace.module.scss'

export interface HttpFlowSelectionProps {
  selectionScope?: object
  selectedHttpFlowIds?: string[]
  onSetSelectedHttpFlowIds?: (ids: string[]) => void
  onRegisterTableSelectApi?: (api?: HttpFlowSelectionApi) => void
}

export type RiskSelectionProps = Pick<AIRiskSelection, 'ids' | 'onChange'>

// 页签卸载后只注销表格，勾选仍由当前输入框的作用域持有。
const WorkspaceHttpFlow: React.FC<
  Omit<React.ComponentProps<typeof PluginExecuteHttpFlow>, keyof HttpFlowSelectionProps> & HttpFlowSelectionProps
> = ({ selectionScope, onSetSelectedHttpFlowIds, onRegisterTableSelectApi, aiFlowSelection, ...props }) => {
  const instance = useMemo(() => ({ active: true }), [selectionScope])
  const current = useRef(instance)
  current.current = instance
  useEffect(() => {
    instance.active = true
    return () => {
      instance.active = false
      onRegisterTableSelectApi?.(undefined)
    }
  }, [instance, onRegisterTableSelectApi, onSetSelectedHttpFlowIds])
  const onChange = (ids: string[]) => {
    if (instance.active && current.current === instance) onSetSelectedHttpFlowIds?.(ids)
  }
  return (
    <PluginExecuteHttpFlow
      {...props}
      aiFlowSelection={aiFlowSelection && { ...aiFlowSelection, onChange }}
      onSetSelectedHttpFlowIds={aiFlowSelection ? undefined : onChange}
      onRegisterTableSelectApi={(api) => {
        if (instance.active && current.current === instance) onRegisterTableSelectApi?.(api)
      }}
    />
  )
}

const WorkspaceHttpFlowSegments: React.FC<{
  showAll: boolean
  runtimeId: string
  selectedOnly: boolean
  total?: number
  selectedCount: number
  onChange: (selectedOnly: boolean) => void
}> = ({ showAll, runtimeId, selectedOnly, total, selectedCount, onChange }) => {
  const [fallback, setFallback] = React.useState<{ runtimeId: string; total: number }>()

  useEffect(() => {
    if (!selectedOnly || total !== undefined || (!showAll && !runtimeId)) return
    let active = true
    setFallback(undefined)
    grpcQueryHTTPFlows({ ...getRunTimeIdObj(runtimeId), Pagination: { Page: 1, Limit: 1 } })
      .then((result) => {
        if (active) setFallback({ runtimeId, total: normalizeHTTPFlowTotal(result.Total) })
      })
      .catch(() => {
        // 接口封装提示查询失败，总数继续保持未知，切换筛选后可重新查询。
      })
    return () => {
      active = false
    }
  }, [runtimeId, selectedOnly, showAll, total])

  const baseCount =
    !showAll && !runtimeId ? 0 : (total ?? (fallback?.runtimeId === runtimeId ? fallback.total : undefined))
  return (
    <WorkspaceSelectionSegments
      showAll={showAll}
      selectedOnly={selectedOnly}
      total={baseCount}
      selectedCount={selectedCount}
      onChange={onChange}
    />
  )
}

const WorkspaceSelectionSegments: React.FC<{
  showAll: boolean
  selectedOnly: boolean
  total?: number
  selectedCount: number
  onChange: (selectedOnly: boolean) => void
}> = ({ showAll, selectedOnly, total, selectedCount, onChange }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const baseLabel = t(showAll ? 'AIChatWorkspace.allItems' : 'AIChatWorkspace.sessionItems')
  return (
    <YakitSegmented
      className={styles['material-selection-segmented']}
      value={selectedOnly ? 'selected' : 'base'}
      onChange={(value) => onChange(value === 'selected')}
      options={[
        {
          value: 'base',
          label: (
            <>
              {baseLabel} {total !== undefined && <span className={styles['material-selection-count']}>{total}</span>}
            </>
          ),
        },
        {
          value: 'selected',
          label: (
            <>
              {t('AIChatWorkspace.selectedItems')}{' '}
              <span className={styles['material-selection-count']}>{selectedCount}</span>
            </>
          ),
        },
      ]}
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
  showSelectedHttpFlows: boolean
  onShowSelectedHttpFlowsChange: (selectedOnly: boolean) => void
  riskSelection?: RiskSelectionProps
  showSelectedRisks: boolean
  onShowSelectedRisksChange: (selectedOnly: boolean) => void
  operationLogList: StreamResult.Log[]
  sessionID?: string
}

/** 工作区激活页签内容区：文件预览 / 任务详情 / 漏洞 / HTTP 流量 / 操作日志 */
export const AIChatWorkspaceTabContent: React.FC<AIChatWorkspaceTabContentProps> = React.memo((props) => {
  const {
    activeTab,
    showAll,
    runTimeIds,
    riskRunTimeIds,
    filterTagDom,
    selectionProps,
    showSelectedHttpFlows,
    onShowSelectedHttpFlowsChange,
    riskSelection,
    showSelectedRisks,
    onShowSelectedRisksChange,
    operationLogList,
    sessionID,
  } = props

  if (!activeTab) return null

  switch (activeTab.type) {
    case AITabsEnum.File_Preview:
      return activeTab.file ? (
        <FilePreview data={activeTab.file} highlights={activeTab.fileHighlights} />
      ) : (
        <YakitEmpty style={{ paddingTop: 48 }} />
      )
    case AITabsEnum.Task_Detail:
      return activeTab.taskId ? (
        <AITaskExecutionDetails taskId={activeTab.taskId} taskName={activeTab.label} taskGoal={activeTab.taskGoal} />
      ) : (
        <YakitEmpty style={{ paddingTop: 48 }} />
      )
    case AITabsEnum.Risk: {
      if (!showAll && !riskRunTimeIds.length && !riskSelection) return <YakitEmpty style={{ paddingTop: 48 }} />
      return (
        <VulnerabilitiesRisksTable
          runTimeIDs={showAll ? [] : riskRunTimeIds}
          filterTagDom={showAll || (riskSelection && showSelectedRisks) ? undefined : filterTagDom}
          aiRiskSelection={
            riskSelection && {
              ...riskSelection,
              selectedOnly: showSelectedRisks,
              emptyBase: !showAll && !riskRunTimeIds.length,
              renderCount: (total) => (
                <WorkspaceSelectionSegments
                  showAll={showAll}
                  selectedOnly={showSelectedRisks}
                  total={total ?? 0}
                  selectedCount={riskSelection.ids.length}
                  onChange={onShowSelectedRisksChange}
                />
              ),
            }
          }
        />
      )
    }
    case AITabsEnum.HTTP: {
      const runtimeId = showAll ? '' : runTimeIds.join(',')
      const { selectedHttpFlowIds, ...tableSelectionProps } = selectionProps
      const { onSetSelectedHttpFlowIds } = tableSelectionProps
      const aiFlowSelection = selectedHttpFlowIds &&
        onSetSelectedHttpFlowIds && {
          ids: selectedHttpFlowIds,
          selectedOnly: showSelectedHttpFlows,
          onChange: onSetSelectedHttpFlowIds,
          renderCount: (total: number | undefined) => (
            <WorkspaceHttpFlowSegments
              showAll={showAll}
              runtimeId={runtimeId}
              selectedOnly={showSelectedHttpFlows}
              total={total}
              selectedCount={selectedHttpFlowIds.length}
              onChange={onShowSelectedHttpFlowsChange}
            />
          ),
        }
      return showAll || runtimeId || aiFlowSelection ? (
        <WorkspaceHttpFlow
          key={showAll ? 'welcome' : `${sessionID}:${activeTab.runtimeId || ''}`}
          {...tableSelectionProps}
          aiFlowSelection={aiFlowSelection}
          pageType={showAll ? 'History' : 'Plugin'}
          filterTagDom={showAll || showSelectedHttpFlows ? undefined : filterTagDom}
          runtimeId={runtimeId}
          sourceType=""
          showAdvancedSearch
          showSetting
        />
      ) : (
        <YakitEmpty style={{ paddingTop: 48 }} />
      )
    }
    case AITabsEnum.Operation_Log:
      return <OperationLog loading={false} list={operationLogList} />
    default:
      return null
  }
})
