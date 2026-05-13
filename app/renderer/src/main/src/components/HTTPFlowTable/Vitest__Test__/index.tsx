/**
 * 仅作 HTTPFlowTable 相关逻辑的 Vitest 夹具；不增加仓库级脚本。
 * 仓库根目录运行本目录全部用例：yarn test:vitest app/renderer/src/main/src/components/HTTPFlowTable/Vitest__Test__ --run
 */
import React, { FC } from 'react'
export const onConvertBodySizeByUnit = (length: number, unit: 'B' | 'K' | 'M') => {
  switch (unit) {
    case 'K':
      return Number(length) * 1024
    case 'M':
      return Number(length) * 1024 * 1024
    default:
      return Number(length)
  }
}

export const getHTTPFlowReqAndResToString = <T extends object & { Request?: Uint8Array; Response?: Uint8Array }>(
  flow: T,
) => {
  return {
    ...flow,
    RequestString: flow?.Request?.length ? String.fromCharCode(...flow.Request) : '',
    ResponseString: flow?.Response?.length ? String.fromCharCode(...flow.Response) : '',
  } as T & {
    RequestString: string
    ResponseString: string
  }
}

export const filterData = <T extends object, K extends keyof T>(filterArr: T[], key: K) => {
  const valueSet = new Set<T[K]>()
  return filterArr.filter((item) => {
    const current = item[key]
    if (valueSet.has(current)) {
      return false
    }
    valueSet.add(current)
    return true
  })
}

interface VitestTestProps {
  bodyLength?: number
  unit?: 'B' | 'K' | 'M'
}

interface HTTPHistoryBridgeSnapshotProps {
  pageType: string
  includeInUrl?: string[]
  processName?: string[]
  tagsFilter?: string[]
  onlyShowFirstNode?: boolean
  showSourceType?: boolean
  showAdvancedSearch?: boolean
  showProtocolType?: boolean
  showHistorySearch?: boolean
  showColorSwatch?: boolean
  showBatchActions?: boolean
  showDelAll?: boolean
  showSetting?: boolean
  showRefresh?: boolean
}

export const HTTPHistoryBridgeSnapshot: FC<HTTPHistoryBridgeSnapshotProps> = ({
  pageType,
  includeInUrl = [],
  processName = [],
  tagsFilter = [],
  onlyShowFirstNode = true,
  showSourceType = true,
  showAdvancedSearch = true,
  showProtocolType = true,
  showHistorySearch = true,
  showColorSwatch = true,
  showBatchActions = true,
  showDelAll = true,
  showSetting = true,
  showRefresh = true,
}) => {
  return (
    <div data-testid="history-bridge-snapshot">
      <div data-testid="history-page-type">{pageType}</div>
      <div data-testid="history-include-in-url">{includeInUrl.join(',')}</div>
      <div data-testid="history-process-name">{processName.join(',')}</div>
      <div data-testid="history-tags-filter">{tagsFilter.join(',')}</div>
      <div data-testid="history-only-show-first-node">{String(onlyShowFirstNode)}</div>
      <div data-testid="history-show-switches">
        {[
          showSourceType,
          showAdvancedSearch,
          showProtocolType,
          showHistorySearch,
          showColorSwatch,
          showBatchActions,
          showDelAll,
          showSetting,
          showRefresh,
        ].join(',')}
      </div>
    </div>
  )
}

const Vitest__Test__: FC<VitestTestProps> = ({ bodyLength = 2, unit = 'K' }) => {
  const flow = getHTTPFlowReqAndResToString({
    Request: new Uint8Array([65, 66]),
    Response: new Uint8Array([67]),
  })
  const deduplicated = filterData(
    [
      { Id: 1, Path: '/a' },
      { Id: 1, Path: '/b' },
      { Id: 2, Path: '/c' },
    ],
    'Id',
  )

  return (
    <div>
      <div data-testid="httpflow-vitest-page">http flow table vitest test page</div>
      <div data-testid="request-string">{flow.RequestString}</div>
      <div data-testid="response-string">{flow.ResponseString}</div>
      <div data-testid="converted-size">{onConvertBodySizeByUnit(bodyLength, unit)}</div>
      <div data-testid="dedup-size">{deduplicated.length}</div>
    </div>
  )
}

export { Vitest__Test__ }
