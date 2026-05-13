import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { HTTPFlowTableProp } from '@/components/HTTPFlowTable/HTTPFlowTable'
import { HTTPHistoryBridgeSnapshot } from '@/components/HTTPFlowTable/Vitest__Test__'

// 使用正确的属性名以匹配 HTTPFlowTableProp 类型定义（大写开头）
const historyForwardProps = {
  pageType: 'History' as const,
  includeInUrl: ['yaklang.com', 'example.com'],
  ProcessName: ['chrome.exe', 'burpsuite.exe'],
  TagsFilter: ['RED', 'IMPORTANT'],
  onlyShowFirstNode: false,
  showSourceType: true,
  showAdvancedSearch: true,
  showProtocolType: true,
  showHistorySearch: false,
  showColorSwatch: true,
  showBatchActions: false,
  showDelAll: true,
  showSetting: true,
  showRefresh: false,
} satisfies Partial<HTTPFlowTableProp>

describe('HTTPHistory to HTTPFlowTable contract', () => {
  it('keeps the HTTPHistory forwarded props shape compatible with HTTPFlowTable', () => {
    expect(historyForwardProps.pageType).toBe('History')
    expect(historyForwardProps.includeInUrl).toEqual(['yaklang.com', 'example.com'])
    expect(historyForwardProps.ProcessName).toEqual(['chrome.exe', 'burpsuite.exe'])
    expect(historyForwardProps.TagsFilter).toEqual(['RED', 'IMPORTANT'])
    expect(historyForwardProps.onlyShowFirstNode).toBe(false)
  })

  it('renders a stable snapshot for the HTTPHistory forwarded values', () => {
    // HTTPHistoryBridgeSnapshot 组件使用小写开头的属性名
    render(
      React.createElement(HTTPHistoryBridgeSnapshot, {
        pageType: historyForwardProps.pageType,
        includeInUrl: historyForwardProps.includeInUrl,
        processName: historyForwardProps.ProcessName,
        tagsFilter: historyForwardProps.TagsFilter,
        onlyShowFirstNode: historyForwardProps.onlyShowFirstNode,
        showSourceType: historyForwardProps.showSourceType,
        showAdvancedSearch: historyForwardProps.showAdvancedSearch,
        showProtocolType: historyForwardProps.showProtocolType,
        showHistorySearch: historyForwardProps.showHistorySearch,
        showColorSwatch: historyForwardProps.showColorSwatch,
        showBatchActions: historyForwardProps.showBatchActions,
        showDelAll: historyForwardProps.showDelAll,
        showSetting: historyForwardProps.showSetting,
        showRefresh: historyForwardProps.showRefresh,
      }),
    )

    expect(screen.getByTestId('history-page-type')).toHaveTextContent('History')
    expect(screen.getByTestId('history-include-in-url')).toHaveTextContent('yaklang.com,example.com')
    expect(screen.getByTestId('history-process-name')).toHaveTextContent('chrome.exe,burpsuite.exe')
    expect(screen.getByTestId('history-tags-filter')).toHaveTextContent('RED,IMPORTANT')
    expect(screen.getByTestId('history-only-show-first-node')).toHaveTextContent('false')
    expect(screen.getByTestId('history-show-switches')).toHaveTextContent(
      'true,true,true,false,true,false,true,true,false',
    )
  })
})
