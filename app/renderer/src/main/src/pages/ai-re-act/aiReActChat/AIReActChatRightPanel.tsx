import React from 'react'
import { useCreation } from 'ahooks'
import { useStore } from 'zustand'
import { useCurrentStore } from '../hooks/useCurrentDataBySession'
import useCurrentTaskExecution from '../hooks/useCurrentTaskData/useCurrentTaskExecution'
import { AIRightPanel } from '../aiRightPanel/AIRightPanel'
import type { AIRightPanelProps, AIRightPanelRiskCounts } from '../aiRightPanel/type'

/** 自由对话读取任务快照，为右侧面板提供执行数据、流量与漏洞统计。 */
export const AIReActChatRightPanel: React.FC<Pick<AIRightPanelProps, 'layoutRef' | 'small'>> = React.memo((props) => {
  const store = useCurrentStore()
  const questionID = useStore(store, (state) => state.currentChatStatus.questionID)
  const executionData = useCurrentTaskExecution(questionID)
  const levelCount = executionData?.risk_level_count
  const riskCounts = useCreation<AIRightPanelRiskCounts | undefined>(() => {
    if (!levelCount) return undefined
    return {
      serious: levelCount.critical,
      high: levelCount.high,
      medium: levelCount.warning,
      low: levelCount.low,
      info: levelCount.info + levelCount.other,
    }
  }, [levelCount])
  const riskTotal = levelCount?.total ?? Object.values(riskCounts ?? {}).reduce((total, count) => total + count, 0)

  return (
    <AIRightPanel
      {...props}
      trafficTotal={executionData?.http_flow_count}
      riskTotal={riskTotal}
      riskCounts={riskCounts}
      executionData={executionData}
    />
  )
})
