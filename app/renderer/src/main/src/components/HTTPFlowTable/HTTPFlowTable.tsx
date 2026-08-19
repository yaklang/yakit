import React, { type Ref, useEffect, useLayoutEffect, useMemo, useRef, useState, useContext } from 'react'
import { Divider, Tooltip, Badge } from 'antd'
import type { YakDeleteHTTPFlowRequest, YakQueryHTTPFlowRequest } from '../../utils/yakQueryHTTPFlow'
import type { YakScript } from '../../pages/invoker/schema'
import type { HTTPFlowDetailProp } from '../HTTPFlowDetail'
import { yakitNotify, yakitFailed } from '../../utils/notification'
import style from './HTTPFlowTable.module.scss'
import { formatTimestamp } from '../../utils/timeUtil'
import { buildHTTPFlowSuffixOptions, formatHTTPFlowPathSuffix } from './HTTPFlowPathSuffix'
import {
  useCreation,
  useDebounceEffect,
  useDebounceFn,
  useMemoizedFn,
  useThrottleFn,
  useUpdateEffect,
  useThrottleEffect,
} from 'ahooks'
import ReactResizeDetector from 'react-resize-detector'
import { generateYakCodeByRequest, RequestToYakCodeTemplate } from '../../pages/invoker/fromPacketToYakCode'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { TableVirtualResize } from '../TableVirtualResize/TableVirtualResize'
import { ColorSwatchIcon, ChevronDownIcon, CloudDownloadIcon } from '@/assets/newIcon'
import classNames from 'classnames'
import type { ColumnsTypeProps, FiltersItemProps, SortProps } from '../TableVirtualResize/TableVirtualResizeType'
import { minWinSendToChildWin, openExternalWebsite, openPacketNewWindow } from '@/utils/openWebsite'
import { childWindowHash } from '@/pages/layout/mainOperatorContent/MainOperatorContent'
import { YakitSelect } from '../yakitUI/YakitSelect/YakitSelect'
import { YakitCheckableTag } from '../yakitUI/YakitTag/YakitCheckableTag'
import { YakitMenu } from '../yakitUI/YakitMenu/YakitMenu'
import { YakitDropdownMenu } from '../yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '../yakitUI/YakitPopover/YakitPopover'
import { showYakitModal } from '../yakitUI/YakitModal/YakitModalConfirm'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { ShareModal } from '@/pages/fuzzer/components/ShareImportExportData'
import { useSize } from 'ahooks'
import { YakitTag } from '../yakitUI/YakitTag/YakitTag'
import { CheckedSvgIcon } from '../layout/icons'
import { ExportSelect } from '../DataExport/DataExport'
import emiter from '@/utils/eventBus/eventBus'
import { MITMConsts } from '@/pages/mitm/MITMConsts'
import type { HTTPHistorySourcePageType } from '../HTTPHistory'
import { useHttpFlowStore } from '@/store/httpFlow'
import { OutlineCogIcon, OutlineFilterIcon, OutlineRefreshIcon } from '@/assets/icon/outline'
import { SolidStarIcon } from '@/assets/icon/solid'
import useVirtualTableHook from '@/hook/useVirtualTableHook/useVirtualTableHook'
import type { ParamsTProps, VirtualTableRefreshReason } from '@/hook/useVirtualTableHook/useVirtualTableHookType'
import { useCampare } from '@/hook/useCompare/useCompare'
import { queryYakScriptList } from '@/pages/yakitStore/network'
import { IconSolidAIIcon, IconSolidAIWhiteIcon } from '@/assets/icon/colors'
import { YakitRoute } from '@/enums/yakitRoute'
import { PluginSwitchToTag } from '@/pages/pluginEditor/defaultconstants'
import cloneDeep from 'lodash/cloneDeep'
import { setClipboardText } from '@/utils/clipboard'
import { RemoteHistoryGV } from '@/enums/history'
import { binaryDisplayEnabledStore, useBinaryDisplayEnabled } from '@/store/binaryDisplayEnabled'
import { v4 as uuidv4 } from 'uuid'
import { randomString } from '@/utils/randomUtil'
import { handleSaveFileSystemDialog } from '@/utils/fileSystemDialog'
import {
  getMainOperatorPageBodyContainer,
  getMainOperatorPageBodyContainerOrBody,
} from '@/utils/getMainOperatorPageBodyContainer'
import { getHTTPFlowExportFields } from './HTTPFlowExportFields'
import { showYakitDrawer } from '../yakitUI/YakitDrawer/YakitDrawer'
import MITMContext from '@/pages/mitm/Context/MITMContext'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { isEqual } from 'lodash'
import {
  buildHTTPFlowTableColumnArr,
  getHTTPFlowDefaultColumnsOrder,
  isHTTPFlowSpecialCustomColumn,
  mergeHTTPFlowColumnsOrder,
  noColumnsKey,
  resolveHTTPFlowTableColumns,
} from './HTTPFlowTable.columns'
import { useHTTPFlowTableShortcutKeys } from './useHTTPFlowTableShortcutKeys'
import { useHTTPFlowTableContextMenu } from './useHTTPFlowTableContextMenu'
import { onSendToTab, toggleHTTPFlowFavorite } from './HTTPFlowTable.actions'
import { NowProjectDescription } from '@/pages/globalVariable'
import { useStore } from '@/store'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { PublicHTTPHistoryIcon } from '@/routes/publicIcon'
import { debugToPrintLogs } from '@/utils/logCollection'
import { areMITMDebugHooksEnabled } from '@/utils/mitmDebugHooks'
import { serverPushStatus } from '@/utils/duplex/duplex'
import { JSONParseLog } from '@/utils/tool'
import { yakitHTTPFlow, yakitStream } from '@/services/electronBridge'
import {
  defFilterConfig,
  type FilterConfig,
  HTTPFlowTableFormConfiguration,
  HTTPFlowTableFormConsts,
} from './HTTPFlowTableFormConfiguration/HTTPFlowTableFormConfiguration'
import {
  buildHTTPFlowProjectKey,
  buildHTTPFlowTableAdvancedQuery,
  buildLegacyHTTPFlowTableFilterConfig,
  getFullRange,
  hasActiveHTTPFlowTableFilterConfig,
  isHTTPFlowTableActive,
  normalizeHTTPFlowTotal,
  parseIncludeIds,
  parseMITMLogResetSignal,
  safeParseHTTPFlowTableCache,
  selectHTTPFlowTableResizeAction,
  shouldClearMITMResetBoundary,
  shouldUseHTTPFlowMetadataOnlyQuery,
  splitHTTPFlowTableShieldData,
} from './HTTPFlowTable.utils'
import {
  AdvancedSet,
  ColorSearch,
  EditTagsModal,
  HistorySearch,
  HTTPFlowShield,
  ImportExportProgress,
  onExpandHTTPFlow,
} from './components'
import {
  HTTP_FLOW_TABLE_SHIELD_DATA,
  OFFSET_LIMIT,
  HTTP_FLOW_TABLE_MAX_DATA_LENGTH,
  MITM_FLOW_TABLE_OVERSCAN,
  OFFSET_STEP,
  defSort,
  type codecHistoryPluginProps,
  type HTTPFlow,
  type HTTPFlowTableProp,
  type ShieldData,
  type UpdateCacheData,
  type YakQueryHTTPFlowResponse,
  type HTTPFlowsFieldGroupResponse,
  type ExportHTTPFlowStreamRequest,
  type ColumnAllInfoItem,
  type EditTagsInfo,
  type HTTPFlowsToOnlineBatchRequest,
  type HTTPFlowsToOnlineBatchResponse,
  SourceType,
  SHIELD_MAX_LIMIT,
  HTTP_FLOW_FAVORITE_TAG,
} from './HTTPFlowTable.constants'
import {
  buildHTTPFlowQueryTags,
  getClassNameData,
  getHTTPFlowReqAndResToString,
  getRunTimeIdObj,
  filterHTTPFlowsByFavoriteAndTags,
  findHTTPFlowSelectionIndex,
  patchHTTPFlowTags,
} from './HTTPFlowTable.utils'
import { PLUGIN_PREFIX } from '../yakitUI/YakitEditor/YakitEditor'
import {
  createMITMLiveAdaptiveBatchState,
  drainMITMLiveBacklog,
  MITM_LIVE_CATCH_UP_PAYLOAD_BUDGET_BYTES,
  selectMITMLiveInitialPageSize,
  shouldSkipMITMLiveExactTotal,
  updateMITMLiveAdaptiveBatchState,
} from './HTTPFlowTable.live'
import {
  createHTTPFlowLiveDirectBatcher,
  createHTTPFlowLiveDirectRecoveryGate,
  createHTTPFlowLiveRefreshScheduler,
  createHTTPFlowLiveStreamController,
  handleHTTPFlowLiveModeTransition,
  httpFlowLiveSummaryToHTTPFlow,
  shouldPreferHTTPFlowLiveRefresh,
} from './HTTPFlowTable.stream'
import {
  mitmFlowObservability,
  type HTTPFlowCommittedSignal,
  type MITMLiveCycleToken,
  type MITMLiveTriggerSource,
} from './HTTPFlowTable.observability'
import { unstable_batchedUpdates } from 'react-dom'

//导出给其他组件用
export * from './HTTPFlowTable.constants'
export * from './HTTPFlowTable.columns'
export * from './HTTPFlowTable.actions'
export * from './HTTPFlowTable.availableColors'
export * from './HTTPFlowTable.utils'
export * from './components'

const { ipcRenderer } = window.require('electron')

const HTTP_FLOW_TOTAL_RECONCILE_INTERVAL = 10_000
const HTTP_FLOW_FIELD_GROUP_REFRESH_INTERVAL = 10_000
let activeMITMFlowTableInstances = 0
class StaleHTTPFlowTableQueryError extends Error {
  constructor() {
    super('HTTP flow table query was superseded')
    this.name = 'StaleHTTPFlowTableQueryError'
  }
}
// 性能优化：分页空回调提取为模块级常量，避免内联箭头每次渲染创建新引用
const noopPaginationChange = () => {}

// 性能优化：纯函数提升为模块级，避免组件每次渲染重新创建
// 保留数组中非重复数据
const filterNonUnique = (arr: (string | number)[]) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))
// 数组去重
const filterItem = (arr: (string | number)[]) => arr.filter((item, index) => arr.indexOf(item) === index)

export const HTTPFlowTable = React.memo<HTTPFlowTableProp>((props) => {
  const {
    noTableTitle = false,
    showSourceType = true,
    showAdvancedSearch = true,
    showProtocolType = true,
    showHistorySearch = true,
    showColorSwatch = true,
    showBatchActions = true,
    showDelAll = true,
    showSetting = true,
    showRefresh = true,
    onlyShowFirstNode,
    setOnlyShowFirstNode,
    inViewport = true,
    refresh,
    importRefresh,
    pageType,
    historyId,
    titleHeight = 38,
    containerClassName = '',
    runTimeId,
    downstreamProxyStr = '',
    filterTagDom,
    onSetTableTotal,
    onSetTableSelectNum,
    onSetHasNewData,
    onSetSelectedHttpFlowIds,
    onRegisterTableSelectApi,
    showHistoryAnalysisBtn = false,
    onHistoryAnalysisClick,
    defaultExcludeColumnsKey,
    builtinTagList = [],
  } = props
  const { t, i18nRefresh } = useI18nNamespaces(['yakitUi', 'yakitRoute', 'history'])

  useEffect(() => {
    if (pageType !== 'MITM') return

    // The MITM route is a singleNode page. Keep the observability singleton
    // honest if that product invariant changes inside one renderer process.
    activeMITMFlowTableInstances += 1
    if (activeMITMFlowTableInstances > 1 && areMITMDebugHooksEnabled()) {
      console.warn(`[MITM] ${activeMITMFlowTableInstances} HTTP flow tables share one observability instance`)
    }
    return () => {
      activeMITMFlowTableInstances = Math.max(0, activeMITMFlowTableInstances - 1)
    }
  }, [pageType])

  const comBuiltinTagList = useCampare(builtinTagList)

  // 导出字段映射配置
  const arrList = useMemo(() => getHTTPFlowExportFields(t), [t])

  const mitmContent = useContext(MITMContext)

  const mitmVersion = useCreation(() => {
    return mitmContent.mitmStore.version
  }, [mitmContent.mitmStore.version])
  const viewAttachIdFirstRef = useRef<boolean>(false)
  const [viewAttachId, setViewAttachId] = useState<number>(0)
  const [color, setColor] = useState<string[]>([])
  const [onlyFavorite, setOnlyFavorite] = useState(false)
  const [isShowColor, setIsShowColor] = useState<boolean>(false)
  const mitmAggregateFilterRows = props.mitmAggregateFilterRows || []
  const campareMitmAggregateFilterRows = useCampare(mitmAggregateFilterRows)
  const [tagsFilter, setTagsFilter] = useState<string[]>([])

  const isOneceLoading = useRef<boolean>(true)

  const [suffixList, setSuffixList] = useState<FiltersItemProps[]>([])
  const comSuffixList = useCampare(suffixList)
  const [selected, setSelected, getSelected] = useGetSetState<HTTPFlow>()
  const selectionReconcilePendingRef = useRef(false)

  const { setCompareLeft, setCompareRight } = useHttpFlowStore()

  // 屏蔽数据
  const [shieldData, setShieldData, getShieldData] = useGetSetState<ShieldData>({
    data: [],
  })
  const [showShieldTooManyHint, setShowShieldTooManyHint] = useState(false)
  const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0
  // 性能优化：bodyLengthUnit 值从未在 JSX/memo 依赖中读取，仅通过 getter 在回调中使用，改为 ref 避免不必要重渲染
  const bodyLengthUnitRef = useRef<'B' | 'K' | 'M'>('B')
  const getBodyLengthUnit = useMemoizedFn(() => bodyLengthUnitRef.current)
  const setBodyLengthUnit = useMemoizedFn((v: React.SetStateAction<'B' | 'K' | 'M'>) => {
    bodyLengthUnitRef.current = typeof v === 'function' ? (v as any)(bodyLengthUnitRef.current) : v
  })
  const [currentIndex, setCurrentIndex] = useState<number>()
  const [scrollToIndex, setScrollToIndex] = useState<number | string>()
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [selectedRows, setSelectedRows] = useState<HTTPFlow[]>([])
  const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
  // 性能优化：afterBodyLength/beforeBodyLength 值未在 JSX/memo 依赖中读取，仅通过 getter 和在 useDebounceFn 回调中使用，改为 ref
  const afterBodyLengthRef = useRef<number | undefined>(undefined)
  const getAfterBodyLength = useMemoizedFn(() => afterBodyLengthRef.current)
  const setAfterBodyLength = useMemoizedFn((v: React.SetStateAction<number | undefined>) => {
    afterBodyLengthRef.current = typeof v === 'function' ? (v as any)(afterBodyLengthRef.current) : v
  })
  const beforeBodyLengthRef = useRef<number | undefined>(undefined)
  const getBeforeBodyLength = useMemoizedFn(() => beforeBodyLengthRef.current)
  const setBeforeBodyLength = useMemoizedFn((v: React.SetStateAction<number | undefined>) => {
    beforeBodyLengthRef.current = typeof v === 'function' ? (v as any)(beforeBodyLengthRef.current) : v
  })
  const [isReset, setIsReset] = useState<boolean>(false)
  const [watchRefresh, setWatchRefresh] = useState<boolean>(false)

  const [checkBodyLength, setCheckBodyLength] = useState<boolean>(false) // 查询BodyLength大于0
  const [, setIdSort, getIdSort] = useGetSetState<'asc' | 'desc' | false>(false)
  const [, setIncludeIdSearch, getIncludeIdSearch] = useGetSetState('')

  const [batchVisible, setBatchVisible] = useState<boolean>(false)

  // 性能优化：exportDataKey 值仅在 useMemoizedFn 回调中读取，从未在 JSX/memo 依赖中，改为 ref
  const exportDataKeyRef = useRef<string[]>([])
  const setExportDataKey = useMemoizedFn((v: string[]) => {
    exportDataKeyRef.current = v
  })

  const [drawerFormVisible, setDrawerFormVisible] = useState<boolean>(false)

  const tableRef = useRef<any>(null)

  const boxHeightRef = useRef<number>()

  const ref = useRef(null)

  const refreshTabsContRef = useRef<boolean>(false)

  const fromMITM = useMemo(() => props.pageType === 'MITM', [props.pageType])

  const size = useSize(ref)

  /** ---------- 后台刷新 Start ---------- */
  const [backgroundRefresh, setBackgroundRefresh] = useState<boolean>(false)
  const [dragSelectEnabled, setDragSelectEnabled] = useState<boolean>(true)
  const binaryDisplayEnabled = useBinaryDisplayEnabled()
  const isBackgroundRefresh = useMemo(() => {
    return backgroundRefresh && pageType !== 'MITM'
  }, [backgroundRefresh, pageType])
  const isTableActive = isHTTPFlowTableActive(inViewport, backgroundRefresh, pageType)

  // 整表重新加载时清空选中；缓存页重新可见时保留当前包，待响应后按 ID/Hash 校验。
  const onFirst = useMemoizedFn((reason: VirtualTableRefreshReason) => {
    if (reason === 'visibility') {
      selectionReconcilePendingRef.current = true
      setUpdateCacheData([])
      return
    }
    selectionReconcilePendingRef.current = false
    setSelectedRowKeys([])
    setSelectedRows([])
    if (!viewAttachIdFirstRef.current) {
      setScrollToIndex(0)
      setCurrentIndex(undefined)
      setOnlyShowFirstNode && setOnlyShowFirstNode(true)
    }
    setUpdateCacheData([])
    setIsRefresh((v) => !v)
  })

  // 接口返回后：去掉前端收藏/标签过滤 + 行颜色
  const initResDataFun = useMemoizedFn((arr: HTTPFlow[]) =>
    getClassNameData(filterHTTPFlowsByFavoriteAndTags(arr, tagsFilter, onlyFavorite)),
  )

  const [total, setTotal] = useState(0)
  const extraTimerRef = useRef<ReturnType<typeof setInterval>>()
  const getAddDataByGrpcRef = useRef<(query: YakQueryHTTPFlowRequest, queryEpoch?: number) => void>(() => {})
  const tableQueryEpochRef = useRef(0)
  const latestPersistedIdRef = useRef(0)
  const latestPersistedProjectKeyRef = useRef('')
  const mitmResetAfterIdRef = useRef(0)
  const mitmResetProjectKeyRef = useRef('')
  const previousInViewportRef = useRef(inViewport)
  const offsetDataRef = useRef<HTTPFlow[]>([])
  const updateDataRef = useRef<() => void>(() => {})
  const requestMITMLiveRefreshRef = useRef<(source: MITMLiveTriggerSource, serverSentAtUnixMs?: number) => void>(
    () => {},
  )
  const flushHTTPFlowLiveRefreshRef = useRef<() => void>(() => {})
  const flushHTTPFlowLiveDirectRef = useRef<(events: HTTPFlowLiveEvent[]) => void>(() => {})
  const latestVisibleDataHighWaterRef = useRef(0)
  const httpFlowLiveDirectRecoveryGate = useCreation(
    () =>
      createHTTPFlowLiveDirectRecoveryGate({
        onChange: (snapshot) =>
          mitmFlowObservability.recordHTTPFlowLiveDirectRecovery(snapshot.required, snapshot.fallbackHighWaterId),
      }),
    [],
  )
  const httpFlowLiveDirectBatcher = useCreation(
    () =>
      createHTTPFlowLiveDirectBatcher({
        onFlush: (events) => unstable_batchedUpdates(() => flushHTTPFlowLiveDirectRef.current(events)),
      }),
    [],
  )
  const httpFlowLiveRefreshScheduler = useCreation(
    () =>
      createHTTPFlowLiveRefreshScheduler({
        onFlush: () => flushHTTPFlowLiveRefreshRef.current(),
      }),
    [],
  )
  const httpFlowLiveStreamController = useCreation(
    () =>
      createHTTPFlowLiveStreamController({
        transport: {
          start: (request, token) => yakitHTTPFlow.subscribe(request, token),
          cancel: (token) => yakitHTTPFlow.cancelSubscribe(token),
          onData: (token, callback) => yakitStream.onData(token, callback),
          onError: (token, callback) => yakitStream.onError(token, callback),
          onEnd: (token, callback) => yakitStream.onEnd(token, callback),
        },
        createToken: () => randomString(40),
        getMode: () => mitmFlowObservability.getHTTPFlowLiveStreamMode(),
        observer: mitmFlowObservability,
        onCommitted: (event, mode) => {
          if (mode !== 'canary') return
          httpFlowLiveDirectBatcher.enqueue(event)
        },
        onGap: () => {
          httpFlowLiveDirectRecoveryGate.requireRecovery()
          httpFlowLiveDirectBatcher.cancel()
          httpFlowLiveRefreshScheduler.cancel()
          requestMITMLiveRefreshRef.current('continuation')
        },
        onUnavailable: () => {
          httpFlowLiveDirectRecoveryGate.requireRecovery()
          httpFlowLiveDirectBatcher.cancel()
          httpFlowLiveRefreshScheduler.cancel()
          requestMITMLiveRefreshRef.current('continuation')
        },
        onReset: () => {
          httpFlowLiveDirectRecoveryGate.reset()
          httpFlowLiveDirectBatcher.cancel()
          httpFlowLiveRefreshScheduler.cancel()
        },
      }),
    [],
  )

  useEffect(
    () =>
      mitmFlowObservability.onHTTPFlowLiveStreamModeChange((mode, previousMode) => {
        if (pageType !== 'MITM') return
        const pendingRows = handleHTTPFlowLiveModeTransition(
          previousMode,
          mode,
          httpFlowLiveStreamController.snapshot().lastSeenId,
          {
            pendingCount: httpFlowLiveDirectBatcher.pendingCount,
            cancelPending: httpFlowLiveDirectBatcher.cancel,
            cancelRefresh: httpFlowLiveRefreshScheduler.cancel,
            requireRecovery: httpFlowLiveDirectRecoveryGate.requireRecovery,
            requestRefresh: () => requestMITMLiveRefreshRef.current('continuation'),
          },
        )
        if (pendingRows > 0) mitmFlowObservability.recordHTTPFlowLiveDirectFallback(pendingRows)
      }),
    [
      httpFlowLiveDirectBatcher,
      httpFlowLiveDirectRecoveryGate,
      httpFlowLiveRefreshScheduler,
      httpFlowLiveStreamController,
      pageType,
    ],
  )
  const mitmLiveAdaptiveBatchRef = useRef(createMITMLiveAdaptiveBatchState())
  const slidingClippedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (extraTimerRef.current) {
        clearInterval(extraTimerRef.current)
      }
      httpFlowLiveDirectBatcher.cancel()
      httpFlowLiveDirectRecoveryGate.reset()
      httpFlowLiveRefreshScheduler.cancel()
      httpFlowLiveStreamController.stop()
    }
  }, [
    httpFlowLiveDirectBatcher,
    httpFlowLiveDirectRecoveryGate,
    httpFlowLiveRefreshScheduler,
    httpFlowLiveStreamController,
  ])

  // hook 用 Pagination.AfterId，后端 QueryHTTPFlows 要顶层 AfterId，这里做一层转换
  const apiQueryHTTPFlows = useMemoizedFn(
    async (
      hookParams: ParamsTProps & { Filter: YakQueryHTTPFlowRequest },
      liveCycleToken?: MITMLiveCycleToken,
      queryEpoch = tableQueryEpochRef.current,
    ) => {
      const { Pagination, Filter } = hookParams
      const { AfterId, BeforeId, FixedLimit, ...paginationFields } = Pagination
      // 仅 update（无游标）时更新 total
      const isUpdateRequest = !AfterId && !BeforeId
      const metadataOnlyBackgroundQuery = shouldUseHTTPFlowMetadataOnlyQuery(inViewport, backgroundRefresh, pageType)
      const query: YakQueryHTTPFlowRequest = {
        ...Filter,
        Pagination: { ...paginationFields },
        ...(AfterId ? { AfterId } : {}),
        ...(BeforeId ? { BeforeId } : {}),
        IncludeSystemTiming: pageType === 'MITM' && mitmFlowObservability.isBackendSystemTimingEnabled(),
        ExcludeResponseRaw: pageType === 'MITM' || metadataOnlyBackgroundQuery,
        ExcludeRequestRaw: pageType === 'MITM' || metadataOnlyBackgroundQuery,
        SkipTotal:
          pageType === 'MITM' &&
          mitmFlowObservability.isSkipLiveExactTotalEnabled() &&
          shouldSkipMITMLiveExactTotal(AfterId, BeforeId),
      }
      if (Array.isArray(query.Methods)) {
        query.Methods = query.Methods.join(',')
      }
      if ('bodyLength' in query) {
        delete query.bodyLength
      }
      if ('idFilter' in query) {
        delete query.idFilter
      }
      //插件执行中流量数据必有runTimeId
      if (pageType === 'Plugin' && !runTimeId) {
        if (isUpdateRequest) {
          setTotal(0)
        }
        return { Data: [], Total: 0, Pagination: paginationFields }
      }
      if (pageType === 'MITM' && query.AfterUpdatedAt === undefined && query.BeforeUpdatedAt === undefined) {
        const time = await getRemoteValue(MITMConsts.MITMStartTimeStamp)
        if (time) {
          query.AfterUpdatedAt = parseInt(time, 10)
        }
      }
      const timingToken =
        pageType === 'MITM'
          ? mitmFlowObservability.beginQuery({
              liveCycleId: liveCycleToken?.id,
              cursorBefore: Number(AfterId) || 0,
              requestedRows: Number(paginationFields.Limit) || 0,
            })
          : undefined
      let rsp: YakQueryHTTPFlowResponse
      try {
        rsp = (await ipcRenderer.invoke('QueryHTTPFlows', query)) as YakQueryHTTPFlowResponse
        if (queryEpoch !== tableQueryEpochRef.current) throw new StaleHTTPFlowTableQueryError()
        rsp.Total = normalizeHTTPFlowTotal(rsp.Total)
        if (pageType === 'MITM' && inViewport) {
          const projectKey = buildHTTPFlowProjectKey(
            rsp.SystemTiming?.DatabaseIdentity,
            rsp.SystemTiming?.ProjectGeneration,
          )
          if (projectKey && projectKey !== latestPersistedProjectKeyRef.current) {
            const projectChanged = latestPersistedProjectKeyRef.current !== ''
            latestPersistedProjectKeyRef.current = projectKey
            latestPersistedIdRef.current = 0
            if (
              projectChanged &&
              shouldClearMITMResetBoundary(mitmResetAfterIdRef.current, mitmResetProjectKeyRef.current, projectKey)
            ) {
              // A reset high-water belongs to one project database only. If
              // the database table is recreated, its generation changes even
              // though its path stays the same. Remove the old ID boundary and
              // repeat the bootstrap so lower IDs cannot stay hidden.
              mitmResetAfterIdRef.current = 0
              mitmResetProjectKeyRef.current = ''
              setParams((current) => ({ ...current, AfterId: undefined }))
              throw new StaleHTTPFlowTableQueryError()
            }
          }
          const latestResponseId = (rsp.Data || []).reduce((latest, flow) => Math.max(latest, Number(flow.Id) || 0), 0)
          latestPersistedIdRef.current = Math.max(
            latestPersistedIdRef.current,
            Number(rsp.SystemTiming?.LatestPersistedId) || 0,
            latestResponseId,
          )
          httpFlowLiveStreamController.observeQuery(rsp, Filter)
        }
        if (timingToken) mitmFlowObservability.completeQuery(timingToken, rsp)
      } catch (error) {
        if (timingToken) mitmFlowObservability.failQuery(timingToken)
        throw error
      }
      if (isUpdateRequest) {
        setTotal(rsp.Total)
        if (extraTimerRef.current) {
          clearInterval(extraTimerRef.current)
          extraTimerRef.current = undefined
        }
        if (isTableActive) {
          extraTimerRef.current = setInterval(
            () => getAddDataByGrpcRef.current(query, queryEpoch),
            HTTP_FLOW_TOTAL_RECONCILE_INTERVAL,
          )
        }
      }
      return rsp
    },
  )

  const isTopLoadRequest = useMemoizedFn((hookParams: ParamsTProps & { Filter: YakQueryHTTPFlowRequest }) => {
    const { AfterId, BeforeId, Limit } = hookParams.Pagination
    return !!AfterId && !BeforeId && Limit !== OFFSET_STEP
  })

  // history 页面时，判断倒序情况，并且未加载的数据（减去 offsetData 缓存）超过 200 条时整表刷新 数据裁剪后按照增量来加载
  const grpcQueryHTTPFlows = useMemoizedFn(async (hookParams: ParamsTProps & { Filter: YakQueryHTTPFlowRequest }) => {
    const queryEpoch = tableQueryEpochRef.current
    const { Pagination } = hookParams
    const { AfterId, BeforeId, Order, OrderBy, ...paginationFields } = Pagination
    if (pageType === 'MITM' && !AfterId && !BeforeId) {
      mitmLiveAdaptiveBatchRef.current = createMITMLiveAdaptiveBatchState()
    }
    if (pageType === 'MITM' && isTopLoadRequest(hookParams)) {
      const viewportRows = Math.max(1, Number(Pagination.Limit) || OFFSET_LIMIT)
      const catchUpMode = mitmLiveAdaptiveBatchRef.current.catchingUp
      const initialPageSize = selectMITMLiveInitialPageSize(viewportRows, mitmLiveAdaptiveBatchRef.current)
      const liveCycleToken = mitmFlowObservability.beginLiveCycle(Number(AfterId), initialPageSize)
      try {
        const result = await drainMITMLiveBacklog<HTTPFlow, YakQueryHTTPFlowResponse>(
          Number(AfterId),
          {
            initialPageSize,
            ...(catchUpMode
              ? {
                  payloadBudgetBytes: MITM_LIVE_CATCH_UP_PAYLOAD_BUDGET_BYTES,
                  targetPagePayloadBytes: MITM_LIVE_CATCH_UP_PAYLOAD_BUDGET_BYTES,
                }
              : {}),
          },
          (cursor, limit) =>
            apiQueryHTTPFlows(
              {
                ...hookParams,
                Pagination: {
                  ...Pagination,
                  Page: 1,
                  Limit: limit,
                  AfterId: cursor,
                },
              },
              liveCycleToken,
              queryEpoch,
            ),
        )
        const { data: mergedData, lastResponse } = result
        mitmLiveAdaptiveBatchRef.current = updateMITMLiveAdaptiveBatchState(mitmLiveAdaptiveBatchRef.current, {
          rows: mergedData.length,
          payloadBytes: result.payloadBytes,
          hasMore: result.hasMore,
        })

        if (!lastResponse) {
          const response = await apiQueryHTTPFlows(hookParams, liveCycleToken, queryEpoch)
          mitmFlowObservability.completeLiveCycle(liveCycleToken, response.Data || [], {
            hasMore: false,
            stopReason: 'exhausted',
          })
          return response
        }
        mitmFlowObservability.completeLiveCycle(liveCycleToken, mergedData, {
          hasMore: result.hasMore,
          stopReason: result.stopReason,
          payloadBytes: result.payloadBytes,
        })
        const streamLastSeenId = httpFlowLiveStreamController.snapshot().lastSeenId
        const recoveryCandidate = httpFlowLiveDirectRecoveryGate.observeQuery(
          result.cursorAfter,
          streamLastSeenId,
          !result.hasMore,
        )
        if (recoveryCandidate && mergedData.length === 0) {
          httpFlowLiveDirectRecoveryGate.commitVisible(latestVisibleDataHighWaterRef.current, streamLastSeenId)
        }
        if (result.shouldContinueImmediately) requestMITMLiveRefreshRef.current('continuation')
        return { ...lastResponse, Data: mergedData }
      } catch (error) {
        mitmFlowObservability.failLiveCycle(liveCycleToken)
        throw error
      }
    }
    if (
      !slidingClippedRef.current &&
      !backgroundRefresh &&
      pageType !== 'MITM' &&
      isTopLoadRequest(hookParams) &&
      Order !== 'asc'
    ) {
      try {
        const rsp = await apiQueryHTTPFlows(
          {
            ...hookParams,
            Pagination: {
              Page: 1,
              Limit: 300,
              Order: 'desc',
              OrderBy: OrderBy || 'id',
              AfterId,
            },
          },
          undefined,
          queryEpoch,
        )
        if (Number(rsp.Total) - offsetDataRef.current.length > 200) {
          updateDataRef.current()
          return { Data: [], Total: 0, Pagination: { ...paginationFields, Order, OrderBy } }
        }
      } catch (error) {}
    }
    return apiQueryHTTPFlows(hookParams, undefined, queryEpoch)
  })

  // 实时 MITM 同样只保留一个内存窗口，完整数据仍在数据库中并可按滚动继续加载。
  const maxDataLength = useMemo(() => {
    return pageType === 'History' || pageType === 'MITM' ? HTTP_FLOW_TABLE_MAX_DATA_LENGTH : 0
  }, [pageType])

  // 表格数据交给 useVirtualTableHook：负责上下滚动加载、中间位置拉新数据（offsetData 红点）
  const [
    tableParams,
    data,
    ,
    pagination,
    loading,
    offsetData,
    {
      startT,
      notifyT,
      notifyPushUpdate,
      reconcileViewportT,
      setTLoad: setLoading,
      resetTData,
      patchTData,
      pushTData,
      noResetRefreshT,
      restoreViewportT,
      setP,
      refreshT,
    },
  ] = useVirtualTableHook<ParamsTProps & { Filter: YakQueryHTTPFlowRequest }, HTTPFlow, 'Data', 'Id'>({
    tableBoxRef: useRef(null), // props.inViewport 判断可见性，不必再挂一个 ref
    tableRef,
    boxHeightRef,
    grpcFun: grpcQueryHTTPFlows,
    onFirst,
    initResDataFun,
    inViewport: isTableActive,
    maxDataLength,
    slidingClippedRef,
    preferServerPush: pageType === 'MITM',
    getAdditionalServerPushActive: () => pageType === 'MITM' && httpFlowLiveStreamController.snapshot().active,
    defaultParams: {
      Filter: {
        SourceType: props.params?.SourceType || 'mitm',
        ...getRunTimeIdObj(runTimeId),
        FromPlugin: '',
        Full: false,
        Tags: [],
      },
      Pagination: {
        Page: 1,
        Limit: OFFSET_LIMIT,
        Order: 'desc',
        OrderBy: 'created_at',
      },
    },
  })
  const updateData = useMemoizedFn((reason: VirtualTableRefreshReason = 'manual') => {
    tableQueryEpochRef.current += 1
    noResetRefreshT(reason)
  })

  useEffect(() => {
    if (!isTableActive) {
      if (extraTimerRef.current) {
        clearInterval(extraTimerRef.current)
        extraTimerRef.current = undefined
      }
    }
  }, [isTableActive])

  useEffect(() => {
    const becameVisible = inViewport && !previousInViewportRef.current
    previousInViewportRef.current = inViewport
    // Background queries intentionally omit packet bodies. Hydrate the visible
    // viewport once on return without discarding its scroll window.
    if (becameVisible && isBackgroundRefresh) {
      restoreViewportT()
    }
  }, [inViewport, isBackgroundRefresh, restoreViewportT])

  // useLayoutEffect runs after React has committed the rows and before paint,
  // which is the closest low-overhead marker for "visible in the table".
  useLayoutEffect(() => {
    if (pageType !== 'MITM') return
    mitmFlowObservability.markVisible(data)
    latestVisibleDataHighWaterRef.current = data.reduce((highWaterId, flow) => Math.max(highWaterId, flow.Id), 0)
    const streamLastSeenId = httpFlowLiveStreamController.snapshot().lastSeenId
    const recovered = httpFlowLiveDirectRecoveryGate.commitVisible(
      latestVisibleDataHighWaterRef.current,
      streamLastSeenId,
    )
    if (
      !recovered &&
      httpFlowLiveDirectRecoveryGate.snapshot().required &&
      (tableRef.current?.containerRef?.scrollTop ?? Number.POSITIVE_INFINITY) < 10
    ) {
      httpFlowLiveRefreshScheduler.request()
    }
  }, [
    data,
    httpFlowLiveDirectRecoveryGate,
    httpFlowLiveRefreshScheduler,
    httpFlowLiveStreamController,
    pageType,
    tableRef,
  ])

  useEffect(() => {
    if (pageType !== 'MITM' || !inViewport) {
      httpFlowLiveDirectBatcher.cancel()
      httpFlowLiveDirectRecoveryGate.reset()
      httpFlowLiveRefreshScheduler.cancel()
      httpFlowLiveStreamController.stop()
    }
  }, [
    httpFlowLiveDirectBatcher,
    httpFlowLiveDirectRecoveryGate,
    httpFlowLiveRefreshScheduler,
    httpFlowLiveStreamController,
    inViewport,
    pageType,
  ])

  // Total 只用精确查询定期校准；实时流可能重放或去重，不按批次累加。
  const getAddDataByGrpc = useMemoizedFn((query: YakQueryHTTPFlowRequest, queryEpoch = tableQueryEpochRef.current) => {
    if (queryEpoch !== tableQueryEpochRef.current) return
    if (!isTableActive) return
    const clientHeight = tableRef.current?.containerRef?.clientHeight
    if (clientHeight === 0) return
    // 性能优化：仅需覆盖 Pagination，无需深拷贝整个 query 对象
    const copyQuery: YakQueryHTTPFlowRequest = {
      ...query,
      IncludeSystemTiming: false,
      Pagination: {
        Page: 1,
        Limit: 1,
        Order: 'desc',
        OrderBy: 'Id',
      },
    }
    ipcRenderer
      .invoke('QueryHTTPFlows', copyQuery)
      .then((rsp: YakQueryHTTPFlowResponse) => {
        if (queryEpoch !== tableQueryEpochRef.current) return
        setTotal(normalizeHTTPFlowTotal(rsp.Total))
      })
      .catch(() => {
        if (queryEpoch !== tableQueryEpochRef.current) return
        if (extraTimerRef.current) {
          clearInterval(extraTimerRef.current)
        }
      })
  })
  getAddDataByGrpcRef.current = getAddDataByGrpc

  type ParamsUpdater = YakQueryHTTPFlowRequest | ((prev: YakQueryHTTPFlowRequest) => YakQueryHTTPFlowRequest)
  const paramsRef = useRef<YakQueryHTTPFlowRequest>({} as YakQueryHTTPFlowRequest)
  paramsRef.current = tableParams.Filter
  const params = tableParams.Filter
  const setParams = useMemoizedFn(
    (next: ParamsUpdater | Pick<ParamsTProps, 'Pagination'> | Pick<ParamsTProps, 'Filter'>) => {
      tableQueryEpochRef.current += 1
      if (typeof next === 'function') {
        setP({ Filter: next(paramsRef.current) } as ParamsTProps & { Filter: YakQueryHTTPFlowRequest })
        return
      }
      if ('Pagination' in next) {
        setP(next as ParamsTProps)
        return
      }
      setP({ Filter: next as YakQueryHTTPFlowRequest } as ParamsTProps)
    },
  )
  const getParams = useMemoizedFn(() => paramsRef.current)

  useUpdateEffect(() => {
    setParams((prev) => ({
      ...prev,
      MitmExtractAggregateFilterRows: mitmAggregateFilterRows,
    }))
  }, [campareMitmAggregateFilterRows])
  useEffect(() => {
    setParams((pre) => ({
      ...pre,
      ...getRunTimeIdObj(runTimeId),
    }))
  }, [runTimeId])

  // 兼容收藏、改标签等 setData 写法，使用浅更新避免复制大量二进制字段。
  const setData = useMemoizedFn((value: React.SetStateAction<HTTPFlow[]>) => {
    patchTData((prev) => (typeof value === 'function' ? value(prev) : value))
  })
  updateDataRef.current = updateData
  requestMITMLiveRefreshRef.current = (source, serverSentAtUnixMs) => {
    mitmFlowObservability.recordLiveTrigger(source, serverSentAtUnixMs)
    notifyT()
  }
  flushHTTPFlowLiveRefreshRef.current = () => {
    if (pageType === 'MITM' && inViewport && mitmFlowObservability.getHTTPFlowLiveStreamMode() === 'canary') {
      notifyT()
    }
  }
  flushHTTPFlowLiveDirectRef.current = (events) => {
    if (mitmFlowObservability.getHTTPFlowLiveStreamMode() !== 'canary') {
      const droppedRows = events.length + httpFlowLiveDirectBatcher.pendingCount()
      httpFlowLiveDirectBatcher.cancel()
      httpFlowLiveRefreshScheduler.cancel()
      httpFlowLiveDirectRecoveryGate.requireRecovery(httpFlowLiveStreamController.snapshot().lastSeenId)
      mitmFlowObservability.recordHTTPFlowLiveDirectFallback(droppedRows)
      requestMITMLiveRefreshRef.current('continuation')
      return
    }
    const rows = events
      .map((event) => httpFlowLiveSummaryToHTTPFlow(event.Flow))
      .filter((flow): flow is HTTPFlow => !!flow)
      .filter((flow) => flow.Id > mitmResetAfterIdRef.current)
      .sort((left, right) => right.Id - left.Id)
    if (!rows.length) return
    const inserted =
      !httpFlowLiveDirectRecoveryGate.snapshot().required &&
      rows.length > 0 &&
      pageType === 'MITM' &&
      inViewport &&
      httpFlowLiveStreamController.snapshot().active &&
      pushTData(rows)
    if (inserted !== false) {
      mitmFlowObservability.recordHTTPFlowLiveDirectBatch(inserted, events)
      return
    }

    httpFlowLiveDirectRecoveryGate.markFallback(events)
    mitmFlowObservability.recordHTTPFlowLiveDirectFallback(events.length)
    const serverSentAtUnixMs = Math.min(
      ...events
        .map((event) => Number(event.ServerAtUnixMs))
        .filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0),
    )
    mitmFlowObservability.recordLiveTrigger(
      'httpflow-live-stream',
      Number.isFinite(serverSentAtUnixMs) ? serverSentAtUnixMs : undefined,
    )
    httpFlowLiveRefreshScheduler.request()
  }

  useEffect(() => {
    if (!viewAttachIdFirstRef.current || !data.length) return
    const timer = setTimeout(() => {
      viewAttachIdFirstRef.current = false
      emiter.emit('onScrollToByClick', JSON.stringify({ historyId, id: viewAttachId + '' }))
    }, 500)
    return () => clearTimeout(timer)
  }, [data, historyId, viewAttachId])

  useEffect(() => {
    offsetDataRef.current = offsetData
  }, [offsetData])

  useUpdateEffect(() => {
    updateData()
  }, [refresh])

  const onScrollToByClickEvent = useMemoizedFn((v) => {
    try {
      const obj: { historyId: string; id: string } = JSONParseLog(v, {
        page: 'HTTPFlowTable',
        fun: 'onScrollToByClickEvent',
      })
      if (historyId === obj.historyId) {
        let scrollToIndex: number | undefined = undefined
        const id = Number(obj.id)
        data.some((item, index) => {
          if (item.Id == id) {
            scrollToIndex = index
          }
          return item.Id == id
        })
        if (scrollToIndex !== undefined) {
          // 加随机值触发更新渲染执行表格跳转方法
          setScrollToIndex(scrollToIndex + '_' + Math.random())
        }
      }
    } catch (error) {}
  })
  useEffect(() => {
    emiter.on('onScrollToByClick', onScrollToByClickEvent)
    return () => {
      emiter.off('onScrollToByClick', onScrollToByClickEvent)
    }
  }, [])

  const updateAdvancedSearch = useMemo(() => {
    return ['History', 'MITM'].includes(pageType || '') || showAdvancedSearch
  }, [pageType, showAdvancedSearch])
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(cloneDeep(defFilterConfig))
  const loadLegacyFilterConfig = useMemoizedFn(async () => {
    let config = filterConfig
    try {
      const res = await getRemoteValue(RemoteHistoryGV.HTTPFlowTableFormConfiguration)
      if (!res) {
        // 迁移旧数据
        const [
          filterModeRes,
          hostNameRes,
          urlPathRes,
          fileSuffixRes,
          searchContentTypeRes,
          excludeKeywordsRes,
          statusCodeRes,
        ] = await Promise.allSettled([
          getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFilterMode),
          getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableHostName),
          getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableUrlPath),
          getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFileSuffix),
          getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableContentType),
          getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableExcludeKeywords),
          getRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableStatusCode),
        ])
        const filterMode = filterModeRes.status === 'fulfilled' ? filterModeRes.value || 'shield' : 'shield'
        const hostName = hostNameRes.status === 'fulfilled' ? hostNameRes.value : []
        const urlPath = urlPathRes.status === 'fulfilled' ? urlPathRes.value : []
        const fileSuffix = fileSuffixRes.status === 'fulfilled' ? fileSuffixRes.value : []
        const searchContentType = searchContentTypeRes.status === 'fulfilled' ? searchContentTypeRes.value : ''
        const excludeKeywords = excludeKeywordsRes.status === 'fulfilled' ? excludeKeywordsRes.value : []
        const statusCode = statusCodeRes.status === 'fulfilled' ? statusCodeRes.value : ''

        config = buildLegacyHTTPFlowTableFilterConfig(config, {
          filterMode,
          hostName,
          urlPath,
          fileSuffix,
          searchContentType,
          excludeKeywords,
          statusCode,
        })
      } else {
        config = safeParseHTTPFlowTableCache<FilterConfig>(res) || config
      }
    } catch (error) {}
    setRemoteValue(RemoteHistoryGV.HTTPFlowTableFormConfiguration, JSON.stringify(config))
    return cloneDeep(config)
  })
  // 获取默认高级筛选项
  useEffect(() => {
    if (updateAdvancedSearch) {
      const fetchConfig = async () => {
        try {
          const config = await loadLegacyFilterConfig()
          setFilterConfig(config)
        } catch (error) {}
      }
      fetchConfig()
    }
  }, [loadLegacyFilterConfig, updateAdvancedSearch])

  const comFilterConfig = useCampare(filterConfig)
  useDebounceEffect(
    useMemoizedFn(() => {
      if (updateAdvancedSearch) {
        const { shieldHosts } = splitHTTPFlowTableShieldData(getShieldData().data)
        let newParams = { ...getParams() }
        newParams = {
          ...newParams,
          ...buildHTTPFlowTableAdvancedQuery(filterConfig, shieldHosts),
        }
        refreshTabsContRef.current = true
        setParams(newParams)
        emiter.emit('onGetAdvancedSearchDataEvent', JSON.stringify(filterConfig))
      }
    }),
    [updateAdvancedSearch, comFilterConfig],
    { wait: 500 },
  )
  const isFilter: boolean = useMemo(() => hasActiveHTTPFlowTableFilterConfig(filterConfig), [filterConfig])
  const onGetOtherPageAdvancedSearchData = useMemoizedFn((str: string) => {
    try {
      const value = JSONParseLog(str, { page: 'HTTPFlowTable', fun: 'onGetOtherPageAdvancedSearchData' })
      setFilterConfig(value)
    } catch (error) {}
  })
  useEffect(() => {
    if (updateAdvancedSearch) {
      emiter.on('onGetOtherPageAdvancedSearchDataEvent', onGetOtherPageAdvancedSearchData)
    }
    return () => {
      if (updateAdvancedSearch) {
        emiter.off('onGetOtherPageAdvancedSearchDataEvent', onGetOtherPageAdvancedSearchData)
      }
    }
  }, [onGetOtherPageAdvancedSearchData, updateAdvancedSearch])
  const handleShieldDataUpdate = useMemoizedFn(() => {
    setRemoteValue(HTTP_FLOW_TABLE_SHIELD_DATA, JSON.stringify(shieldData))
    const lastPickData = shieldData.data.slice(-SHIELD_MAX_LIMIT)
    const { shieldIds, shieldHosts } = splitHTTPFlowTableShieldData(lastPickData)

    setParams((prev) => {
      // 高级筛选 屏蔽hostName
      const excludedHosts = [...shieldHosts, ...filterConfig.shield.hostName]
      return {
        ...prev,
        ExcludeId: shieldIds,
        ExcludeInUrl: [...new Set(excludedHosts)],
      }
    })
  })
  useEffect(() => {
    if (pageType === 'MITM') {
      emiter.emit('onGetMITMShieldDataEvent', JSON.stringify({ shieldData, version: mitmVersion }))
    }
    // 判断是否第一次加载页面
    if (isOneceLoading.current) {
      getShieldList()
    } else {
      handleShieldDataUpdate()
    }
  }, [handleShieldDataUpdate, mitmVersion, pageType, shieldData])
  useEffect(() => {
    getShieldList()
  }, [inViewport])
  useEffect(() => {
    if (inViewport) {
      searchCodecSingleHistoryPlugin()
      searchCodecMultipleHistoryPlugin()
    }
  }, [inViewport])

  const onRefreshPluginCodecMenu = useMemoizedFn(() => {
    if (inViewport) {
      searchCodecSingleHistoryPlugin()
      searchCodecMultipleHistoryPlugin()
    }
  })

  useEffect(() => {
    emiter.on('onRefPluginCodecMenu', onRefreshPluginCodecMenu)
    return () => {
      emiter.off('onRefPluginCodecMenu', onRefreshPluginCodecMenu)
    }
  }, [])

  const getShieldList = useMemoizedFn(() => {
    getRemoteValue(HTTP_FLOW_TABLE_SHIELD_DATA)
      .then((data) => {
        if (!data) return
        try {
          const cacheDataList = JSONParseLog(data, { page: 'HTTPFlowTable', fun: 'getShieldList' })?.data || []
          const current = getShieldData()?.data || []
          if (isEqual(current, cacheDataList)) return
          if (cacheDataList.length > SHIELD_MAX_LIMIT && isOneceLoading.current) {
            setShowShieldTooManyHint(true)
          }
          setShieldData({
            data: cacheDataList,
          })
        } catch (e) {
          updateData()
          yakitNotify('error', `${t('HTTPFlowTable.loadBlockedParamsFailed')}${e}`)
        }
      })
      .finally(() => {
        isOneceLoading.current = false
      })
  })
  useDebounceEffect(
    () => {
      if (!inViewport) return
      ipcRenderer
        .invoke('HTTPFlowsFieldGroup', { RefreshRequest: true, IsAll: true })
        .then((rsp: HTTPFlowsFieldGroupResponse) => {
          setSuffixList(buildHTTPFlowSuffixOptions(rsp.Suffixes || []))
        })
        .catch(() => {})
    },
    [inViewport, refresh, watchRefresh],
    { wait: 500 },
  )

  const onTableChange = useDebounceFn(
    (page: number, limit: number, sort: SortProps, filter: any) => {
      if (sort.order === 'none') {
        sort.order = 'desc'
      }
      if (filter['UpdatedAt']) {
        const time = filter['UpdatedAt']
        filter.AfterUpdatedAt = time[0]
        filter.BeforeUpdatedAt = time[1]
      } else {
        filter.AfterUpdatedAt = undefined
        filter.BeforeUpdatedAt = undefined
      }
      if (filter['ContentType']) {
        filter['SearchContentType'] = filter['ContentType'].join(',')
      }
      const searchIds = parseIncludeIds(getIncludeIdSearch())
      setParams({
        Filter: {
          ...getParams(),
          ...filter,
          Tags: buildHTTPFlowQueryTags(tagsFilter, onlyFavorite),
          bodyLength: !!(afterBodyLengthRef.current || beforeBodyLengthRef.current || checkBodyLength), // 用来判断响应长度的icon颜色是否显示高亮
          idFilter: !!(getIdSort() || getIncludeIdSearch()), // 用来判断id的icon颜色是否显示高亮
          IncludeId: searchIds.length ? searchIds : viewAttachId ? getParams().IncludeId : [],
        },
        Pagination: {
          ...tableParams.Pagination,
          Order: getIdSort() || sort.order,
          OrderBy: 'id',
        },
      })
    },
    { wait: 500 },
  ).run

  const onIdSort = useMemoizedFn((sort: 'asc' | 'desc') => {
    const newSort = getIdSort() === sort ? false : sort
    setIdSort(newSort)
    setParams({
      Filter: {
        ...getParams(),
        idFilter: !!(newSort || getIncludeIdSearch()),
      },
      Pagination: {
        ...tableParams.Pagination,
        Order: newSort || defSort.order,
        OrderBy: defSort.orderBy,
      },
    })
  })

  const onIncludeIdSearchSure = useMemoizedFn(() => {
    const rawInput = getIncludeIdSearch()
    const ids = parseIncludeIds(rawInput)
    const next = ids.length > 0 ? ids : undefined
    const prevIds = getParams().IncludeId
    // 判断新值和旧值是否“完全相同”（内容相等），同时处理两者都为 undefined/空数组的情况，视为相同，否则，必须两者都存在（非空）、长度相同、且每个元素按索引相等
    const same =
      (!next || next.length === 0) && (!prevIds || prevIds.length === 0)
        ? true
        : !!next && !!prevIds && next.length === prevIds.length && next.every((id, i) => id === prevIds[i])
    // 如果新旧值相同，并且 viewAttachId 为假值（0 或 undefined），则不执行更新，直接返回
    if (same && !viewAttachId) return
    // 如果 viewAttachId 存在，则将其重置为 0（清除查看附近数据包状态）
    if (viewAttachId) setViewAttachId(0)
    setParams((prev) => ({
      ...prev,
      IncludeId: next,
      idFilter: !!(getIdSort() || next?.length),
    }))
  })

  const campareProcessName = useCampare(props.ProcessName)
  useUpdateEffect(() => {
    if (pageType === 'History') {
      setParams((prev) => ({
        ...prev,
        ProcessName: props.ProcessName || [],
      }))
      setScrollToIndex(0)
      setCurrentIndex(undefined)
      setSelected(undefined)
      setSelectedRowKeys([])
      setSelectedRows([])
      setIsAllSelect(false)
    }
  }, [campareProcessName, pageType])

  const campareTagsFilter = useCampare(props.TagsFilter)
  useUpdateEffect(() => {
    if (pageType === 'History') {
      const nextTags = props.TagsFilter || []
      setTagsFilter(nextTags)
      setParams((prev) => ({
        ...prev,
        Tags: buildHTTPFlowQueryTags(nextTags, onlyFavorite),
      }))
      setScrollToIndex(0)
      setCurrentIndex(undefined)
      setSelected(undefined)
      setSelectedRowKeys([])
      setSelectedRows([])
      setIsAllSelect(false)
    }
  }, [campareTagsFilter, onlyFavorite, pageType])

  /**
   * 网站树部分
   */
  const campareIncludeInUrl = useCampare(props.includeInUrl)
  useDebounceEffect(
    () => {
      if (['History', 'Plugin'].includes(pageType || '')) {
        const url = props.includeInUrl
        const includeInUrlArr = url ? url : []
        setParams((prev) => ({
          ...prev,
          IncludeInUrl: [...new Set(includeInUrlArr)],
        }))
      }
    },
    [campareIncludeInUrl, pageType],
    {
      wait: 300,
    },
  )
  useUpdateEffect(() => {
    if (params.SearchURL === '') {
      refreshTabsContRef.current = true
    }
  }, [params.SearchURL])

  const [queryParams, setQueryParams] = useState<string>('')
  useDebounceEffect(
    () => {
      if (queryParams !== '' && inViewport) {
        let refreshFlag = false
        if (refreshTabsContRef.current) {
          refreshTabsContRef.current = false
          refreshFlag = true
        }
        props.onQueryParams?.(queryParams, refreshFlag)
      }
    },
    [queryParams, inViewport],
    { wait: 500 },
  )
  useUpdateEffect(() => {
    const copyQuery = cloneDeep(tableParams.Filter)
    delete copyQuery.Pagination
    delete copyQuery.AfterId
    delete copyQuery.BeforeId
    if (Array.isArray(copyQuery.Methods)) {
      copyQuery.Methods = copyQuery.Methods.join(',')
    }
    setQueryParams(JSON.stringify(copyQuery))
  }, [tableParams.Filter])

  useEffect(() => {
    props.onSelected && props.onSelected(selected)
  }, [selected])

  const [updateCacheData, setUpdateCacheData] = useState<UpdateCacheData[]>([])
  const pendingTagUpdatesRef = useRef<UpdateCacheData[]>([])
  const pendingPushServerSentAtUnixMsRef = useRef<number>()
  const pushFlushTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const MITM_PUSH_DEBOUNCE_MS = 300
  const HTTP_FLOW_PUSH_DEBOUNCE_MS = 500

  useEffect(() => {
    if (isTableActive) return
    if (pushFlushTimerRef.current) {
      clearTimeout(pushFlushTimerRef.current)
      pushFlushTimerRef.current = undefined
    }
    pendingTagUpdatesRef.current = []
    pendingPushServerSentAtUnixMsRef.current = undefined
  }, [isTableActive])

  const flushPushRefresh = useMemoizedFn(() => {
    pushFlushTimerRef.current = undefined
    const pendingTagUpdates = pendingTagUpdatesRef.current
    pendingTagUpdatesRef.current = []
    if (pendingTagUpdates.length) {
      setUpdateCacheData((prev) => prev.concat(pendingTagUpdates))
    }
    const serverSentAtUnixMs = pendingPushServerSentAtUnixMsRef.current
    pendingPushServerSentAtUnixMsRef.current = undefined
    if (pageType === 'MITM') {
      if (
        shouldPreferHTTPFlowLiveRefresh(
          pageType,
          inViewport,
          mitmFlowObservability.getHTTPFlowLiveStreamMode(),
          httpFlowLiveStreamController.snapshot(),
        )
      ) {
        return
      }
      requestMITMLiveRefreshRef.current('duplex', serverSentAtUnixMs)
      return
    }
    if (serverPushStatus) {
      notifyPushUpdate()
      return
    }
    startT()
  })

  const schedulePushRefresh = useMemoizedFn(() => {
    if (pushFlushTimerRef.current) {
      clearTimeout(pushFlushTimerRef.current)
    }
    pushFlushTimerRef.current = setTimeout(
      flushPushRefresh,
      fromMITM ? MITM_PUSH_DEBOUNCE_MS : HTTP_FLOW_PUSH_DEBOUNCE_MS,
    )
  })

  const refreshFieldGroups = useThrottleFn(() => setWatchRefresh((prev) => !prev), {
    wait: HTTP_FLOW_FIELD_GROUP_REFRESH_INTERVAL,
    leading: true,
    trailing: true,
  }).run

  const onRefreshQueryHTTPFlowsFun = useMemoizedFn((data) => {
    if (!isTableActive) {
      return
    }
    try {
      const parsedData = JSONParseLog(data, { page: 'HTTPFlowTable', fun: 'onRefreshQueryHTTPFlowsFun' })
      const isEnvelope =
        parsedData &&
        typeof parsedData === 'object' &&
        parsedData.__yakitHTTPFlowRefreshEnvelope === 1 &&
        'payload' in parsedData
      const updateData = isEnvelope ? parsedData.payload : parsedData
      const envelopeTimestamp = Number(isEnvelope ? parsedData.serverSentAtUnixMs : undefined)
      if (Number.isFinite(envelopeTimestamp) && envelopeTimestamp > 0) {
        const previousTimestamp = pendingPushServerSentAtUnixMsRef.current
        pendingPushServerSentAtUnixMsRef.current = previousTimestamp
          ? Math.min(previousTimestamp, envelopeTimestamp)
          : envelopeTimestamp
      }
      if (typeof updateData !== 'string' && updateData.action === 'update') {
        pendingTagUpdatesRef.current.push(updateData)
      }
    } catch (error) {}
    if (inViewport) refreshFieldGroups()
    schedulePushRefresh()
  })
  const onMITMFlowCommitted = useMemoizedFn((data) => {
    if (pageType !== 'MITM' || !inViewport) return
    try {
      const signal = JSONParseLog(data, {
        page: 'HTTPFlowTable',
        fun: 'onMITMFlowCommitted',
      }) as HTTPFlowCommittedSignal
      const serverSentAtUnixMs = Number(signal.serverSentAtUnixMs)
      requestMITMLiveRefreshRef.current(
        'flow-committed',
        Number.isFinite(serverSentAtUnixMs) && serverSentAtUnixMs > 0 ? serverSentAtUnixMs : undefined,
      )
    } catch (error) {}
  })
  useEffect(() => {
    emiter.on('onRefreshQueryHTTPFlows', onRefreshQueryHTTPFlowsFun)
    emiter.on('onMITMFlowCommitted', onMITMFlowCommitted)
    return () => {
      emiter.off('onRefreshQueryHTTPFlows', onRefreshQueryHTTPFlowsFun)
      emiter.off('onMITMFlowCommitted', onMITMFlowCommitted)
      if (pushFlushTimerRef.current) {
        clearTimeout(pushFlushTimerRef.current)
        pushFlushTimerRef.current = undefined
      }
      pendingTagUpdatesRef.current = []
      pendingPushServerSentAtUnixMsRef.current = undefined
    }
  }, [onMITMFlowCommitted, onRefreshQueryHTTPFlowsFun])

  useEffect(() => {
    // 获取缓存的后台刷新状态
    getRemoteValue(RemoteHistoryGV.BackgroundRefresh)
      .then((value) => {
        setBackgroundRefresh(!!value)
      })
      .catch(() => {})
    getRemoteValue(RemoteHistoryGV.DragSelectEnabled)
      .then((value) => {
        setDragSelectEnabled(value !== 'false')
      })
      .catch(() => {})
  }, [inViewport])

  // 取消屏蔽筛选
  const cancleFilter = useMemoizedFn((value) => {
    const newArr = filterNonUnique([...shieldData.data, value])
    const newObj = { ...shieldData, data: newArr }
    setShieldData(newObj)
  })
  // 取消所有屏蔽筛选
  const cancleAllFilter = useMemoizedFn((version) => {
    if (version !== mitmVersion) return
    const newObj = { ...shieldData, data: [] }
    setShieldData(newObj)
  })

  const cancleMitmFilter = useMemoizedFn((str: string) => {
    try {
      const data = JSONParseLog(str, { page: 'HTTPFlowTable', fun: 'cancleMitmFilter' })
      const { version, value } = data
      if (version !== mitmVersion) return
      cancleFilter(value)
    } catch (error) {}
  })

  const cleanLogTableData = useMemoizedFn((value: string) => {
    const signal = parseMITMLogResetSignal(value)
    if (signal.version !== mitmVersion) return
    const resetAfterId = Math.max(
      latestPersistedIdRef.current,
      httpFlowLiveStreamController.snapshot().lastSeenId,
      data.reduce((latest, flow) => Math.max(latest, Number(flow.Id) || 0), 0),
    )
    tableQueryEpochRef.current += 1
    mitmResetAfterIdRef.current = resetAfterId
    mitmResetProjectKeyRef.current = latestPersistedProjectKeyRef.current
    latestVisibleDataHighWaterRef.current = 0
    httpFlowLiveDirectBatcher.cancel()
    httpFlowLiveDirectRecoveryGate.reset()
    httpFlowLiveRefreshScheduler.cancel()
    if (extraTimerRef.current) {
      clearInterval(extraTimerRef.current)
      extraTimerRef.current = undefined
    }
    if (pushFlushTimerRef.current) {
      clearTimeout(pushFlushTimerRef.current)
      pushFlushTimerRef.current = undefined
    }
    pendingTagUpdatesRef.current = []
    pendingPushServerSentAtUnixMsRef.current = undefined
    setUpdateCacheData([])
    setOnlyShowFirstNode && setOnlyShowFirstNode(true)
    resetTData()
    setScrollToIndex(`0_reset_${Date.now()}`)
    setIsRefresh((current) => !current)
    setTotal(0)
    setCurrentIndex(undefined)
    setSelected(undefined)
    setSelectedRowKeys([])
    setSelectedRows([])
    setIsAllSelect(false)
    setParams((prev) => ({
      ...prev,
      AfterId: resetAfterId || undefined,
      AfterUpdatedAt: undefined,
      BeforeUpdatedAt: undefined,
    }))
  })

  const onColorSure = useDebounceFn(
    useMemoizedFn(() => {
      if (isShowColor) {
        setIsShowColor(false)
      }
      setParams((prev) => ({
        ...prev,
        Color: color,
      }))
    }),
    { wait: 300 },
  ).run

  const onToggleOnlyFavorite = useMemoizedFn(() => {
    const nextOnlyFavorite = !onlyFavorite
    setOnlyFavorite(nextOnlyFavorite)
    setParams((prev) => ({
      ...prev,
      Tags: buildHTTPFlowQueryTags(tagsFilter, nextOnlyFavorite),
    }))
    setScrollToIndex(0)
    setCurrentIndex(undefined)
    setSelected(undefined)
    setSelectedRowKeys([])
    setSelectedRows([])
    setIsAllSelect(false)
  })

  useEffect(() => {
    if (!selectedRowKeys.length) {
      setIsAllSelect(false)
    }
  }, [selectedRowKeys])

  useEffect(() => {
    setIsAllSelect(false)
  }, [data])

  const onSelectAll = useMemoizedFn((newSelectedRowKeys: string[], selected: HTTPFlow[], checked: boolean) => {
    setIsAllSelect(checked)
    setSelectedRowKeys(newSelectedRowKeys)
    setSelectedRows(selected)
  })
  const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows: HTTPFlow) => {
    if (c) {
      setSelectedRowKeys([...selectedRowKeys, keys])
      setSelectedRows([...selectedRows, rows])
    } else {
      setIsAllSelect(false)
      const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== keys)
      const newSelectedRows = selectedRows.filter((ele) => ele.Id !== rows.Id)
      setSelectedRowKeys(newSelectedRowKeys)
      setSelectedRows(newSelectedRows)
    }
  })
  const resetSelected = useMemoizedFn(() => {
    setIsAllSelect(false)
    setSelectedRowKeys([])
    setSelectedRows([])
  })
  const deselectHttpFlowId = useMemoizedFn((id: string) => {
    setIsAllSelect(false)
    setSelectedRowKeys((prev) => prev.filter((ele) => ele !== id))
    setSelectedRows((prev) => prev.filter((ele) => String(ele.Id) !== id))
  })
  useEffect(() => {
    if (!onRegisterTableSelectApi) return
    onRegisterTableSelectApi({
      reset: resetSelected,
      deselectId: deselectHttpFlowId,
    })
    return () => {
      onRegisterTableSelectApi({
        reset: () => {},
        deselectId: () => {},
      })
    }
  }, [onRegisterTableSelectApi, resetSelected, deselectHttpFlowId])
  const compareSelectedRowKeys = useCampare(selectedRowKeys)
  useDebounceEffect(() => {
    onSetSelectedHttpFlowIds?.(isAllSelect ? [] : selectedRowKeys)
  }, [isAllSelect, compareSelectedRowKeys])
  const onRowClick = useMemoizedFn((rowDate?: HTTPFlow) => {
    if (rowDate) {
      setSelected(rowDate)
      setOnlyShowFirstNode && setOnlyShowFirstNode(false)
      // 仅在子窗口存在时才同步选中行数据（含 4.9MB 解码）到子窗口；无子窗口时跳过，避免单击行的无谓大内容构造
      if (childWindowHash) {
        minWinSendToChildWin({
          type: 'openPacketNewWindow',
          data: getPacketNewWindow(rowDate),
        })
      }
    } else {
      setSelected(undefined)
      setOnlyShowFirstNode && setOnlyShowFirstNode(!onlyShowFirstNode)
    }
  })

  // 只展示表格时清空 selected，selected 的 effect 会 onSelected(undefined)
  useEffect(() => {
    if (onlyShowFirstNode) {
      setCurrentIndex(undefined)
      setSelected(undefined)
    }
  }, [onlyShowFirstNode])

  const onSetCurrentRow = useDebounceFn(
    (rowDate: HTTPFlow | undefined) => {
      onRowClick(rowDate ? getHTTPFlowReqAndResToString(rowDate) : undefined)
    },
    { wait: 200, leading: true },
  ).run

  const onCheckThan0 = useDebounceFn(
    (check: boolean) => {
      setCheckBodyLength(check)
      setParams((prev) => {
        if (!getAfterBodyLength()) {
          prev.AfterBodyLength = check ? 1 : undefined
        }
        return {
          ...prev,
        }
      })
    },
    { wait: 200 },
  ).run

  // #region 表格自定义相关（excludeCustomColumnsKey这个变量暂时勿动，没有做其他列兼容）
  const specialCustoms = useMemoizedFn((key: string) => isHTTPFlowSpecialCustomColumn(key))
  // 排除展示的列（包含noColumnsKey）
  const [excludeColumnsKey, setExcludeColumnsKey] = useState<string[]>(() => {
    if (defaultExcludeColumnsKey && defaultExcludeColumnsKey.length > 0) {
      // 预设排除：把 noColumnsKey 一并合入，保证不可能出现的列也被剔除
      return Array.from(new Set([...defaultExcludeColumnsKey, ...noColumnsKey]))
    }
    return noColumnsKey
  })
  // 默认所有列展示顺序
  const defalutColumnsOrderRef = useRef<string[]>(getHTTPFlowDefaultColumnsOrder())
  // 所有列展示顺序（不包含excludeCustomColumnsKey）
  const [columnsOrder, setColumnsOrder] = useState<string[]>([])
  useEffect(() => {
    // 预设排除列模式下，不读取远程缓存，避免被全局列设置覆盖
    if (defaultExcludeColumnsKey && defaultExcludeColumnsKey.length > 0) return
    if (inViewport) {
      debugToPrintLogs({
        page: 'HTTPFlowTable',
        fun: 'get excludeColumnsKey and columnsOrder',
        status: 'INFO',
        content: 'start getting',
      })
      Promise.allSettled([
        getRemoteValue(RemoteHistoryGV.HistroyExcludeColumnsKey),
        getRemoteValue(RemoteHistoryGV.HistroyColumnsOrder),
      ])
        .then((res) => {
          let refreshTabelKey = false
          if (res[0].status === 'fulfilled') {
            const arr = res[0].value.split(',')
            const excludeKeys = [...arr, ...noColumnsKey].filter((key) => key)
            // 确保顺序缓存里面的key一定在默认所有列中存在
            const realArr = excludeKeys.filter((key: string) => defalutColumnsOrderRef.current.includes(key))
            if (!isEqual(realArr, excludeColumnsKey)) {
              refreshTabelKey = true
              setExcludeColumnsKey(realArr)
            }
            setRemoteValue(RemoteHistoryGV.HistroyExcludeColumnsKey, realArr.filter((key) => !specialCustoms(key)) + '')
          }
          if (res[1].status === 'fulfilled') {
            try {
              const arr = JSONParseLog(res[1].value, { page: 'HTTPFlowTable', fun: 'HTTPFlowTableColumnsOrder' }) || []
              const realArr = mergeHTTPFlowColumnsOrder(arr, defalutColumnsOrderRef.current)
              setRemoteValue(RemoteHistoryGV.HistroyColumnsOrder, JSON.stringify(realArr))
              if (!isEqual(realArr, columnsOrder)) {
                refreshTabelKey = true
                setColumnsOrder(realArr)
              }
            } catch (error) {}
          }

          if (refreshTabelKey) {
            setTableKeyNumber(uuidv4())
          }
        })
        .catch((error) => {
          debugToPrintLogs({
            page: 'HTTPFlowTable',
            fun: 'get excludeColumnsKey and columnsOrder',
            content: error,
          })
        })
    }
  }, [inViewport])
  // 表格可配置列
  const configColumnRef = useRef<ColumnAllInfoItem[]>([])
  // 表格的key值
  const [tableKeyNumber, setTableKeyNumber] = useState<string>(uuidv4())
  // 序号是否固定
  const [idFixed, setIdFixed] = useState<boolean>(true)

  const columnActionHandlers = useMemo(
    () => ({
      onToggleFavorite: (e: React.MouseEvent, rowData: HTTPFlow, favorite: boolean) => {
        e.stopPropagation()
        toggleHTTPFlowFavorite(rowData, favorite, setData, onlyFavorite)
      },
      onOpenInBrowser: (e: React.MouseEvent, rowData: HTTPFlow) => {
        e.stopPropagation()
        ipcRenderer
          .invoke('GetHTTPFlowById', { Id: rowData?.Id })
          .then((i: HTTPFlow) => {
            i.Url && openExternalWebsite(i.Url)
          })
          .catch((e: any) => {
            yakitNotify('error', `Query HTTPFlow failed: ${e}`)
          })
      },
      onExpand: (e: React.MouseEvent, rowData: HTTPFlow) => {
        e.stopPropagation()
        const m = showYakitDrawer({
          width: '80%',
          content: onExpandHTTPFlow(rowData, () => m.destroy(), downstreamProxyStr, t, pageType),
          bodyStyle: { paddingTop: 5 },
        })
      },
    }),
    [downstreamProxyStr, onlyFavorite, pageType, t],
  )

  const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
    debugToPrintLogs({
      page: 'HTTPFlowTable',
      fun: 'columns',
      status: 'INFO',
      content: 'start creating',
    })

    const columnArr = buildHTTPFlowTableColumnArr({
      t: t as (...args: any[]) => any,
      idFixed,
      suffixList,
      checkBodyLength,
      onCheckThan0,
      getAfterBodyLength,
      setAfterBodyLength,
      getBeforeBodyLength,
      setBeforeBodyLength,
      getBodyLengthUnit,
      setBodyLengthUnit,
      setParams,
      getIncludeIdSearch,
      setIncludeIdSearch,
      getIdSort,
      onIdSort,
      onIncludeIdSearchSure,
      actionHandlers: columnActionHandlers,
      comBuiltinTagList,
    })
    const { columns: realColumns, configColumns } = resolveHTTPFlowTableColumns({
      columnArr,
      columnsOrder,
      excludeColumnsKey,
      setIdFixed,
    })
    configColumnRef.current = configColumns
    return realColumns
  }, [
    checkBodyLength,
    downstreamProxyStr,
    pageType,
    onlyFavorite,
    columnsOrder,
    excludeColumnsKey,
    idFixed,
    i18nRefresh,
    comSuffixList,
    comBuiltinTagList,
    columnActionHandlers,
  ])
  // #endregion

  // 高级配置
  const [advancedSetVisible, setAdvancedSetVisible] = useState<boolean>(false)
  const isAdvancedSet = useMemo(() => {
    const realDefalutColumnsOrder = defalutColumnsOrderRef.current.filter((key) => !specialCustoms(key))
    const orderFlag1 =
      columnsOrder.length === 0 ? false : JSON.stringify(realDefalutColumnsOrder) !== JSON.stringify(columnsOrder)
    const orderFlag2 = !!excludeColumnsKey.filter((key) => !specialCustoms(key)).length
    return orderFlag1 || orderFlag2 || isBackgroundRefresh
  }, [isBackgroundRefresh, excludeColumnsKey, columnsOrder])

  //删除
  const onRemoveHttpHistory = useMemoizedFn((query: YakDeleteHTTPFlowRequest) => {
    setLoading(true)
    if (isAllSelect) {
      onRemoveHttpHistoryAll({ isAddQuery: true, query })
      return
    }
    ipcRenderer
      .invoke('DeleteHTTPFlows', {
        ...query,
      })
      .then(() => {
        yakitNotify('info', t('YakitNotification.deleted'))
        refreshTabsContRef.current = true
        updateData()
      })
      .finally(() => {
        setTimeout(() => setLoading(false), 100)
      })
  })

  const onDeleteToUpdateEvent = useMemoizedFn((v: string) => {
    try {
      const { sourcePage }: { sourcePage?: HTTPHistorySourcePageType } = JSONParseLog(v, {
        page: 'HTTPFlowTable',
        fun: 'onDeleteToUpdateEvent',
      })
      if (sourcePage && pageType && sourcePage !== pageType) {
        if (!isTableActive) {
          return
        }
        updateData()
      }
    } catch (error) {}
  })

  useEffect(() => {
    emiter.on('onDeleteToUpdate', onDeleteToUpdateEvent)
    return () => {
      emiter.off('onDeleteToUpdate', onDeleteToUpdateEvent)
    }
  }, [])

  // 删除成功时 通知所有使用该组件的控件更新
  const onUpdateOtherPage = useMemoizedFn(() => {
    // 说明： 此处emit并非是通知当前组件 而是通知复用此组件的其余组件 根据pageType区分
    emiter.emit('onDeleteToUpdate', JSON.stringify({ sourcePage: pageType }))
    emiter.emit('onDeleteToUpdateHTTPHistoryFilter')
  })

  // 删除全部 / 按筛选删除
  const onRemoveHttpHistoryAll = useMemoizedFn(
    (opts?: { isAddQuery?: boolean; query?: YakDeleteHTTPFlowRequest; resetId?: boolean; mergeParams?: boolean }) => {
      const { isAddQuery, query, resetId, mergeParams = true } = opts || {}
      const deleteAll = !!resetId
      let newParams: YakDeleteHTTPFlowRequest = {
        Filter: {},
        DeleteAll: deleteAll,
      }
      if (isAddQuery && !deleteAll) {
        const filter = mergeParams ? { ...params, ...(query?.Filter || {}) } : query?.Filter
        newParams = {
          ...query,
          Filter: filter || {},
          DeleteAll: deleteAll,
        }
      }
      setLoading(true)
      ipcRenderer
        .invoke('DeleteHTTPFlows', newParams)
        .then(() => {
          setOnlyShowFirstNode?.(true)
          onResetRefresh()
          onUpdateOtherPage()
        })
        .catch((e: any) => {
          yakitNotify('error', `${t('HTTPFlowTable.historyDeleteFailed')}${e}`)
        })
        .finally(() => {
          setTimeout(() => setLoading(false), deleteAll ? 500 : 300)
        })
    },
  )

  const onBatch = useMemoizedFn((f: Function, number: number, all?: boolean, rows?: HTTPFlow[]) => {
    const batchRows = rows || selectedRows
    const length = batchRows.length
    if (length <= 0) {
      yakitNotify('warning', t('HTTPFlowTable.pleaseSelectData'))
      return
    }
    if (isAllSelect && !all) {
      yakitNotify('warning', t('HTTPFlowTable.batchOperationNoSelectAll'))
      return
    }
    if (number < length) {
      yakitNotify('warning', t('HTTPFlowTable.maxSendData', { number }))
      return
    }
    for (let i = 0; i < length; i++) {
      const element = batchRows[i]
      f(element)
      if (i === length - 1) {
        setSelectedRowKeys([])
        setSelectedRows([])
      }
    }
  })

  // 性能优化：提取为 useMemoizedFn，避免每次渲染重新创建闭包
  const formatJson = useMemoizedFn((filterVal, jsonData) => {
    return jsonData.map((v, index) =>
      filterVal.map((j) => {
        if (['Request', 'Response'].includes(j)) {
          return Buffer.from(v[j]).toString('utf8')
        }
        if (j === 'UpdatedAt') {
          return formatTimestamp(v[j])
        }
        if (j === 'PathSuffix') {
          return formatHTTPFlowPathSuffix(v['Path'], v['PathSuffix'])
        }
        return v[j]
      }),
    )
  })

  const getPageSize = useMemo(() => {
    if (total > 5000) {
      return 500
    } else if (total < 1000) {
      return 100
    } else {
      return Math.round(total / 1000) * 100
    }
  }, [total])

  /**
   * @description 导出为Excel
   */
  const initExcelData = useMemoizedFn((resolve, newExportData: HTTPFlow[], rsp, arrList) => {
    let exportData: any = []
    const header: string[] = []
    const filterVal: string[] = []
    exportDataKeyRef.current.map((item) => {
      const title = arrList.filter((i) => i.dataKey === item)[0]?.title || item
      header.push(title)
      if (item === 'request') {
        filterVal.push('Request')
      } else if (item === 'response') {
        filterVal.push('Response')
      } else if (item === 'Id') {
        filterVal.push('Id')
      } else {
        const itemData = configColumnRef.current.filter((itemIn) => itemIn.dataKey === item)[0]
        filterVal.push(itemData.dataKey)
      }
    })
    exportData = formatJson(filterVal, newExportData)
    resolve({
      header,
      exportData,
      response: rsp,
    })
  })
  const getExcelData = useMemoizedFn((pagination, list: HTTPFlow[]) => {
    return new Promise(async (resolve) => {
      debugToPrintLogs({
        page: 'HTTPFlowTable',
        fun: 'getExcelData',
        status: 'INFO',
        content: 'start getting excel data',
      })
      const query: any = {
        ...params,
        Pagination: { ...pagination },
        // OffsetId:
        //     pagination.Page === 1
        //         ? undefined
        //         : data[l - 1] && data[l - 1].Id && (Math.ceil(data[l - 1].Id) as number),
        OffsetId: undefined,
      }
      // 与展示查询 apiQueryHTTPFlows 保持一致：MITM 场景补充本次会话起始时间作为下界，
      // 否则导出会把数据库中全部历史流量一起导出
      if (pageType === 'MITM' && query.AfterUpdatedAt === undefined && query.BeforeUpdatedAt === undefined) {
        const time = await getRemoteValue(MITMConsts.MITMStartTimeStamp)
        if (time) {
          query.AfterUpdatedAt = parseInt(time, 10)
        }
      }

      let exportParams: any = {}
      const FieldName = arrList
        .filter((item) => exportDataKeyRef.current.includes(item.dataKey))
        .map((item) => item.key)

      const Ids: number[] = list.map((item) => parseInt(item.Id + ''))
      // 最大请求条数
      const pageSize = getPageSize
      // 需要多少次请求
      const count = Math.ceil((isAllSelect ? total : Ids.length) / pageSize)
      const resultArray: number[] = []
      for (let i = 1; i <= count; i++) {
        resultArray.push(i)
      }
      const promiseList = resultArray.map((item) => {
        query.Pagination.Limit = pageSize
        query.Pagination.Page = item
        exportParams = { ExportWhere: query, FieldName }
        if (!isAllSelect) {
          exportParams.Ids = Ids
        }
        return new Promise((resolve, reject) => {
          ipcRenderer
            .invoke('ExportHTTPFlows', exportParams)
            .then((rsp: YakQueryHTTPFlowResponse) => {
              resolve(rsp)
            })
            .catch((e) => {
              reject(e)
            })
            .finally(() => {})
        })
      })
      Promise.allSettled(promiseList)
        .then((results) => {
          const rsp: YakQueryHTTPFlowResponse = {
            Data: [],
            Pagination: { ...pagination, Page: 1, OrderBy: 'id', Order: '' },
            Total: parseInt(total + ''),
          }
          let message: string = ''
          results.forEach((item) => {
            if (item.status === 'fulfilled') {
              const value = item.value as YakQueryHTTPFlowResponse
              rsp.Data = [...rsp.Data, ...value.Data]
            } else {
              message = item.reason?.message
            }
          })
          if (message.length > 0) {
            yakitNotify('warning', `${t('HTTPFlowTable.partialExportMissing')}${message}`)
          }
          initExcelData(resolve, rsp.Data, rsp, arrList)
        })
        .catch((error) => {
          debugToPrintLogs({
            page: 'HTTPFlowTable',
            fun: 'getExcelData',
            content: error,
          })
        })
    })
  })
  const onExcelExport = useMemoizedFn((list) => {
    const m = showYakitModal({
      title: (modalT) => modalT('HTTPFlowTable.exportFields'),
      content: (modalT) => {
        const exportValue = [
          ...configColumnRef.current.map((item) => ({ title: item.title, key: item.dataKey })),
          { title: modalT('HTTPFlowTable.requestPacket'), key: 'request' },
          { title: modalT('HTTPFlowTable.responsePacket'), key: 'response' },
        ]

        return (
          <ExportSelect
            exportValue={exportValue}
            initCheckValue={exportValue}
            setExportTitle={(v: string[]) => {
              setExportDataKey(['Id', ...v])
            }}
            exportKey={'MITM-HISTORY-EXPORT-KEYS'}
            fileName={'History'}
            getData={(pagination) => getExcelData(pagination, list)}
            onClose={() => m.destroy()}
            getContainer={getMainOperatorPageBodyContainerOrBody()}
          />
        )
      },
      onCancel: () => {
        m.destroy()
        setSelectedRowKeys([])
        setSelectedRows([])
      },
      width: 650,
      footer: null,
      maskClosable: false,
      getContainer: getMainOperatorPageBodyContainerOrBody(),
    })
  })

  /**
   * @description 导出为HAR
   */
  const [exportToken, setExportToken] = useState<string>('')
  const [percentVisible, setPercentVisible] = useState<boolean>(false)
  const exportPageContainerRef = useRef<HTMLElement>()
  const onHarExport = useMemoizedFn((ids: number[]) => {
    const m = showYakitModal({
      title: (modalT) => modalT('HTTPFlowTable.exportFields'),
      content: (modalT) => {
        const harFieldOptions = [
          ...configColumnRef.current.map((item) => ({ title: item.title, key: item.dataKey })),
          { title: modalT('HTTPFlowTable.requestPacket'), key: 'request' },
          { title: modalT('HTTPFlowTable.responsePacket'), key: 'response' },
        ]

        return (
          <ExportSelect
            exportValue={harFieldOptions}
            initCheckValue={harFieldOptions}
            setExportTitle={(v: string[]) => {
              setExportDataKey(['Id', ...v])
            }}
            exportKey={'MITM-HISTORY-EXPORT-KEYS'}
            getData={() => Promise.resolve()} //getData这里没用到 传空promise为了解决报错
            onClose={() => m.destroy()}
            getContainer={getMainOperatorPageBodyContainerOrBody()}
            onHarExport={() => handleClickHarExport(ids)}
          />
        )
      },
      onCancel: () => {
        m.destroy()
        setSelectedRowKeys([])
        setSelectedRows([])
      },
      width: 650,
      footer: null,
      maskClosable: false,
      getContainer: getMainOperatorPageBodyContainerOrBody(),
    })
  })

  const handleClickHarExport = useMemoizedFn((ids: number[]) => {
    handleSaveFileSystemDialog({
      title: t('HTTPFlowTable.saveFile'),
      defaultPath: `History-${Date.now()}`,
      filters: [
        { name: 'HAR Files', extensions: ['har'] }, // 只允许保存 .har 文件
      ],
    })
      .then((file) => {
        if (!file.canceled) {
          const filePath = file?.filePath?.toString()
          if (filePath) {
            const FieldName = arrList
              .filter((item) => exportDataKeyRef.current.includes(item.dataKey))
              .map((item) => item.key)
            const exportParams: ExportHTTPFlowStreamRequest = {
              Filter: {
                IncludeId: ids,
                ...params,
              },
              ExportType: 'har',
              TargetPath: filePath,
              FieldName,
            }

            const token = randomString(40)
            setExportToken(token)
            ipcRenderer
              .invoke('ExportHTTPFlowStream', exportParams, token)
              .then(() => {
                exportPageContainerRef.current = getMainOperatorPageBodyContainer()
                setPercentVisible(true)
              })
              .catch((error) => {
                yakitNotify('error', `[ExportHTTPFlowStream] error: ${error}`)
              })
          }
        }
      })
      .catch((error) => {
        debugToPrintLogs({
          page: 'HTTPFlowTable',
          fun: 'handleClickHarExport',
          content: error,
        })
      })
  })

  const getPacketNewWindow = useMemoizedFn((r) => {
    return {
      showParentPacketCom: {
        components: 'HTTPFlowDetailMini',
        props: {
          noHeader: true,
          id: r?.Id || 0,
          sendToWebFuzzer: true,
          selectedFlow: getHTTPFlowReqAndResToString(r),
          downstreamProxyStr: downstreamProxyStr,
          pageType: pageType,
          showEditTag: false,
          showJumpTree: false,
          showFlod: !['Plugin'].includes(pageType || ''),
        } satisfies HTTPFlowDetailProp,
      },
    }
  })
  const onHTTPFlowTableRowDoubleClick = useMemoizedFn((r) => {
    openPacketNewWindow(getPacketNewWindow(r))
  })

  // 插件扩展(单选)
  const [codecSingleHistoryPlugin, setCodecSingleHistoryPlugin] = useState<codecHistoryPluginProps[]>([])
  const searchCodecSingleHistoryPlugin = useMemoizedFn((): any => {
    queryYakScriptList(
      'codec',
      (i: YakScript[], total) => {
        if (!total || total === 0) {
          return
        }
        setCodecSingleHistoryPlugin(
          i.map((script) => {
            const isAiPlugin: boolean = script.Tags.includes('AI工具')
            return {
              key: script.ScriptName,
              label: script.ScriptName,
              params: script.Params,
              isAiPlugin,
            }
          }),
        )
      },
      undefined,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      [PluginSwitchToTag.PluginCodecSingleHistorySwitch],
    )
  })

  // 插件扩展(多选)
  const [codecMultipleHistoryPlugin, setCodecMultipleHistoryPlugin] = useState<codecHistoryPluginProps[]>([])
  const searchCodecMultipleHistoryPlugin = useMemoizedFn((): any => {
    queryYakScriptList(
      'codec',
      (i: YakScript[], total) => {
        if (!total || total === 0) {
          return
        }
        setCodecMultipleHistoryPlugin(
          i.map((script) => {
            const isAiPlugin: boolean = script.Tags.includes('AI工具')
            return {
              key: script.ScriptName,
              label: script.ScriptName,
              params: script.Params,
              isAiPlugin,
            }
          }),
        )
      },
      undefined,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      [PluginSwitchToTag.PluginCodecMultipleHistorySwitch],
    )
  })

  const addIconLabel = useMemoizedFn((data: codecHistoryPluginProps[]) => {
    return data.map((item) => {
      const baseItem = {
        ...item,
        key: `${PLUGIN_PREFIX}${item.key}`,
        label: (
          <>
            {item.isAiPlugin && (
              <>
                <IconSolidAIIcon className={'ai-plugin-menu-icon-default'} />
                <IconSolidAIWhiteIcon className={'ai-plugin-menu-icon-hover'} />
              </>
            )}
            {item.key}
          </>
        ),
      }

      // 如果有参数，添加子菜单
      if (item?.params && item.params.length > 0) {
        return {
          ...baseItem,
          children: [
            {
              key: `execCodecPlugin_${item.key}`,
              label: t('YakitEditor.executePlugin'),
            },
            {
              key: `updateCodecParams_${item.key}`,
              label: t('YakitEditor.modifyParameters'),
            },
          ],
        }
      }

      return baseItem
    })
  })
  const getCodecHistoryPlugin = useMemoizedFn(() => {
    if (selectedRowKeys.length > 1) {
      return codecMultipleHistoryPlugin.length > 0
        ? addIconLabel(codecMultipleHistoryPlugin)
        : [
            {
              key: 'Get*plug-in',
              label: (
                <>
                  <CloudDownloadIcon style={{ marginRight: 4 }} />
                  {t('HTTPFlowTable.getPlugin')}
                </>
              ),
            },
          ]
    } else {
      return codecSingleHistoryPlugin.length > 0
        ? addIconLabel(codecSingleHistoryPlugin)
        : [
            {
              key: 'Get*plug-in',
              label: (
                <>
                  <CloudDownloadIcon style={{ marginRight: 4 }} />
                  {t('HTTPFlowTable.getPlugin')}
                </>
              ),
            },
          ]
    }
  })

  const [editTagsVisible, setEditTagsVisible] = useState<boolean>(false)
  const editTagsRef = useRef<EditTagsInfo>()
  const onEditTags = useMemoizedFn((flow: HTTPFlow) => {
    editTagsRef.current = { Id: flow.Id, Hash: flow.Hash, Tags: flow.Tags?.split('|').filter((tag) => tag) || [] }
    setEditTagsVisible(true)
  })
  const editTagsSuccess = useMemoizedFn((params: EditTagsInfo) => {
    ipcRenderer
      .invoke('SetTagForHTTPFlow', params)
      .then(() => {
        yakitNotify('success', t('HTTPFlowTable.editTagSuccess'))
        const newData: HTTPFlow[] = []
        const l = data.length
        for (let index = 0; index < l; index++) {
          const item = { ...data[index] }
          if (item.Hash === params.Hash) {
            item.Tags = params.Tags.join('|')
          }
          newData.push(item)
        }
        setData(newData)
      })
      .catch((e) => {
        yakitFailed(e + '')
      })
  })
  const onEditTagEvent = useMemoizedFn((infos) => {
    try {
      const info = JSONParseLog(infos, { page: 'HTTPFlowTable', fun: 'onEditTagEvent' }) || {}
      const tagItem = data.find((item) => item.Id == info.id)
      if (tagItem && info.historyId === historyId) {
        onEditTags(tagItem)
      }
    } catch (error) {}
  })
  useEffect(() => {
    emiter.on('onEditTag', onEditTagEvent)
    return () => {
      emiter.off('onEditTag', onEditTagEvent)
    }
  }, [])

  const { userInfo } = useStore()
  const codecMultipleHistoryPluginCom = useCampare(codecMultipleHistoryPlugin)
  const codecSingleHistoryPluginCom = useCampare(codecSingleHistoryPlugin)
  const selectedRowKeysCom = useCampare(selectedRowKeys)
  const getUrlWithoutQuery = useMemoizedFn((url?: string) => {
    if (!url) return ''

    try {
      const u = new URL(url)
      u.search = ''
      u.hash = ''
      return u.toString()
    } catch {
      return url.split('?')[0].split('#')[0]
    }
  })
  /**
   * @description 数据包 PoC 模版
   */
  const onPocMould = useMemoizedFn((v: HTTPFlow) => {
    const flow = v
    if (!flow) return
    generateYakCodeByRequest(
      flow.IsHTTPS,
      flow.Request,
      (code) => {
        setClipboardText(code)
      },
      RequestToYakCodeTemplate.Ordinary,
    )
  })
  /**
   * @description 批量检测 PoC 模版
   */
  const onBatchPocMould = useMemoizedFn((v: HTTPFlow) => {
    const flow = v as HTTPFlow
    if (!flow) return
    generateYakCodeByRequest(
      flow.IsHTTPS,
      flow.Request,
      (code) => {
        setClipboardText(code)
      },
      RequestToYakCodeTemplate.Batch,
    )
  })
  const appendShieldItem = useMemoizedFn((item: string | number) => {
    const { data = [] } = shieldData || {}
    if (data.includes(item)) return
    if (data.length >= SHIELD_MAX_LIMIT) {
      yakitNotify('warning', t('HTTPFlowTable.shieldLimitReached'))
      return
    }
    const newArr = filterItem([...data, item])
    setShieldData({ ...shieldData, data: newArr })
  })
  /**
   * @description 屏蔽该记录
   */
  const onShieldRecord = useMemoizedFn((v: HTTPFlow) => {
    if (!(v && v.Id)) return
    const id = Math.ceil(v.Id)
    appendShieldItem(id)
  })
  /**
   * @description 屏蔽URL
   */
  const onShieldURL = useMemoizedFn((v: HTTPFlow) => {
    const Url = v?.Url
    // 根据URL拿到ID数组
    appendShieldItem(Url)
  })
  /**
   * @description 屏蔽域名
   */
  const onShieldDomain = useMemoizedFn((v: HTTPFlow) => {
    const host = v?.HostPort?.split(':')[0] || ''
    // 根据host拿到对应ID数组
    appendShieldItem(host)
  })

  useHTTPFlowTableShortcutKeys({
    inViewport,
    getSelected,
    downstreamProxyStr,
    fromMITM,
    t,
    getUrlWithoutQuery,
    onSendToTab,
    onShieldRecord,
    onShieldURL,
    onShieldDomain,
    onRemoveHttpHistory,
  })

  /**@description 重置查询条件并刷新 */
  const resetParams = useMemo(() => {
    const obj: YakQueryHTTPFlowRequest = {
      // 这里是外界传进来的条件重置时需要保留
      SourceType: props.params?.SourceType || 'mitm',
      ...getRunTimeIdObj(runTimeId),
      Full: false,
      // MITM “清空视图”使用持久高水位隔离本次会话之前的数据。
      AfterId: params.AfterId,
      // 屏蔽条件和高级筛选里面的参数需要保留
      ExcludeId: params.ExcludeId,
      ExcludeInUrl: params.ExcludeInUrl,
      // 高级筛选里面的参数，没有放开高级筛选按钮的一开始就不会获取下面的值，传进去也没有关系
      SearchContentType: params.SearchContentType,
      ExcludeContentType: params.ExcludeContentType,
      HostnameFilter: params.HostnameFilter,
      IncludePath: params.IncludePath,
      ExcludePath: params.ExcludePath,
      IncludeSuffix: params.IncludeSuffix,
      ExcludeSuffix: params.ExcludeSuffix,
      ExcludeKeywords: params.ExcludeKeywords,
      ExcludeStatusCode: params.ExcludeStatusCode,
    }
    return obj
  }, [props.params, pageType, runTimeId, params])
  const resetAllFun = useMemoizedFn((filter: YakQueryHTTPFlowRequest, attachId: number = 0) => {
    tableQueryEpochRef.current += 1
    refreshT(filter, {
      ...tableParams.Pagination,
      Order: defSort.order,
      OrderBy: defSort.orderBy,
    })
    setIsReset(!isReset)
    setWatchRefresh((prev) => !prev)
    setColor([])
    setOnlyFavorite(false)
    setViewAttachId(attachId)
    setCheckBodyLength(false)
    setBeforeBodyLength(undefined)
    setAfterBodyLength(undefined)
    setBodyLengthUnit('B')
    setSearchVal('')
    setIdSort(false)
    setIncludeIdSearch('')
    refreshTabsContRef.current = true
  })
  const onResetRefresh = useMemoizedFn(() => {
    resetAllFun({ ...resetParams })
  })
  /**@description 导入重置查询条件并刷新 */
  const onImportResetRefresh = useMemoizedFn(() => {
    resetAllFun({ ...resetParams, SourceType: '' })
  })
  useUpdateEffect(() => {
    onImportResetRefresh()
  }, [importRefresh])

  /**查看附近数据包 */
  const onViewAttachmentDataRefresh = useMemoizedFn((id: number) => {
    viewAttachIdFirstRef.current = true
    resetAllFun({ ...resetParams, SourceType: props.params?.SourceType || '', IncludeId: getFullRange(+id) }, +id)
  })

  /**
   * @description 分享数据包
   * @param ids 分享数据得ids
   */
  const onShareData = useMemoizedFn((ids: string[], number: number) => {
    if (isAllSelect) {
      yakitNotify('warning', t('HTTPFlowTable.batchOperationNoSelectAll'))
      return
    }
    if (ids.length === 0) {
      yakitNotify('warning', t('HTTPFlowTable.pleaseSelectData'))
      return
    }
    if (ids.length > number) {
      yakitNotify('warning', t('HTTPFlowTable.maxOperateData', { number }))
      return
    }
    const m = showYakitModal({
      title: (modalT) => modalT('HTTPFlowTable.shareData'),
      content: <ShareModal module={YakitRoute.DB_HTTPHistory} shareContent={JSON.stringify(ids)} />,
      onCancel: () => {
        m.destroy()
        setSelectedRowKeys([])
        setSelectedRows([])
      },
      footer: null,
    })
  })

  const isUploadingRef = useRef<boolean>(false)
  /**
   * @description 上传数据（仅在企业版中生效）
   * @param ids 上传数据的ids
   */

  const onUploadData = useMemoizedFn((ids: string[]) => {
    if (isUploadingRef.current) {
      yakitNotify('warning', t('HTTPFlowTable.uploadingDataCannotClickAgain'))
      return
    }
    if (ids.length === 0) {
      yakitNotify('warning', t('HTTPFlowTable.pleaseSelectData'))
      return
    }
    if (!NowProjectDescription) {
      yakitNotify('warning', t('HTTPFlowTable.missingParameter'))
      return
    }
    const { ProjectName, Description, ExternalModule, ExternalProjectCode } = NowProjectDescription
    const newIds = ids.map((id) => parseInt(id + ''))
    const query: HTTPFlowsToOnlineBatchRequest = {
      ToOnlineWhere: {
        Token: userInfo.token,
        ProjectName,
        ProjectDescription: Description,
        ExternalModule,
        ExternalProjectCode,
      },
      UploadHTTPFlowsWhere: { ...params, IncludeId: isAllSelect ? [] : newIds },
    }
    isUploadingRef.current = true
    yakitNotify('info', t('HTTPFlowTable.dataUploading'))
    ipcRenderer
      .invoke('HTTPFlowsToOnlineBatch', query)
      .then((rsp: HTTPFlowsToOnlineBatchResponse) => {
        yakitNotify(
          'success',
          t('HTTPFlowTable.uploadResult', { SuccessCount: rsp.SuccessCount, FailedCount: rsp.FailedCount }),
        )
      })
      .catch((e: any) => {
        yakitNotify('error', `query HTTP Flow failed: ${e}`)
      })
      .finally(() => (isUploadingRef.current = false))
  })

  const [searchVal, setSearchVal] = useState<string>('')
  const handleSearch = useMemoizedFn((searchValue, searchType) => {
    setParams((prev) => ({ ...prev, Keyword: searchValue, KeywordType: searchType }))
  })

  const { getBatchContextMenu, onMultipleClick, onRowContextMenu } = useHTTPFlowTableContextMenu({
    t,
    i18nRefresh,
    userInfo,
    data,
    setData,
    onlyFavorite,
    selected,
    selectedRowKeys,
    selectedRows,
    isAllSelect,
    total,
    downstreamProxyStr,
    fromMITM,
    setSelected,
    setSelectedRowKeys,
    setSelectedRows,
    setBatchVisible,
    setCompareLeft,
    setCompareRight,
    getUrlWithoutQuery,
    getCodecHistoryPlugin,
    codecMultipleHistoryPluginCom,
    codecSingleHistoryPluginCom,
    selectedRowKeysCom,
    onRemoveHttpHistory,
    onShareData,
    onUploadData,
    onEditTags,
    onHTTPFlowTableRowDoubleClick,
    onExcelExport,
    onHarExport,
    onPocMould,
    onBatchPocMould,
    onShieldRecord,
    onShieldURL,
    onShieldDomain,
    onBatch,
    onViewAttachmentDataRefresh,
  })

  useEffect(() => {
    if (props.params?.SourceType !== undefined) {
      const selectTypeList = props.params?.SourceType.split(',') || ['']
      setParams((prev) => ({ ...prev, SourceType: selectTypeList.join(',') }))
    }
  }, [props.params?.SourceType])

  /**订阅的时候已经判断 pageType === "MITM" */
  const onHasParamsJumpHistory = useMemoizedFn((data) => {
    try {
      const value = JSONParseLog(data, { page: 'HTTPFlowTable', fun: 'onHasParamsJumpHistory' })
      const { version = '', mitmHasParamsNames = '' } = value
      if (version !== mitmVersion) return
      const mitmHasParamsNamesArr = mitmHasParamsNames.split(',').filter((item) => item)
      let selectTypeList = (getParams().SourceType?.split(',') || []).filter((item) => item)
      if (mitmHasParamsNamesArr.length) {
        selectTypeList = ['mitm', 'scan']
      } else {
        selectTypeList = selectTypeList.filter((item) => item !== 'scan')
        if (!selectTypeList.length) {
          selectTypeList = ['mitm']
        }
      }

      setParams((prev) => {
        const sourceType = selectTypeList.join(',')
        emiter.emit(
          'onHistorySourceTypeToMitm',
          JSON.stringify({
            sourceType: sourceType,
            version,
          }),
        )
        return {
          ...prev,
          SourceType: sourceType,
          FromPlugin: mitmHasParamsNames,
        }
      })
    } catch (error) {
      debugToPrintLogs({
        page: 'HTTPFlowTable',
        fun: 'onHasParamsJumpHistory',
        content: error,
      })
    }
  })

  const onMitmClearFromPlugin = useMemoizedFn((version) => {
    if (version !== mitmVersion) return
    setParams((prev) => ({
      ...prev,
      FromPlugin: '',
    }))
  })

  const onMitmSearchInputVal = useMemoizedFn((searchJson: string) => {
    try {
      const value = JSONParseLog(searchJson, { page: 'HTTPFlowTable', fun: 'onMitmSearchInputVal' }) || {}
      const { version, ...searchObj } = value
      if (version !== mitmVersion) return
      setParams((prev) => ({
        ...prev,
        ...searchObj,
      }))
    } catch (error) {}
  })

  const onMitmCurProcess = useMemoizedFn((data: string) => {
    try {
      const value = JSONParseLog(data, { page: 'HTTPFlowTable', fun: 'onMitmCurProcess' }) || {}
      const { curProcess, version } = value
      if (version !== mitmVersion) return
      setParams((prev) => ({
        ...prev,
        ProcessName: curProcess,
      }))
    } catch (error) {}
  })

  const onMitmNoResetRefresh = useMemoizedFn((version: string) => {
    if (version !== mitmVersion) return
    setWatchRefresh((prev) => !prev)
    updateData()
  })

  const onMitmResetRefresh = useMemoizedFn((version: string) => {
    if (version !== mitmVersion) return
    onResetRefresh()
  })

  // mitm页面发送事件跳转过来
  useEffect(() => {
    if (pageType === 'MITM') {
      emiter.on('onHasParamsJumpHistory', onHasParamsJumpHistory)
      emiter.on('onMitmClearFromPlugin', onMitmClearFromPlugin)
      emiter.on('onMitmSearchInputVal', onMitmSearchInputVal)
      emiter.on('onMitmCurProcess', onMitmCurProcess)
      emiter.on('cancleMitmFilterEvent', cancleMitmFilter)
      emiter.on('cancleMitmAllFilterEvent', cancleAllFilter)
      emiter.on('cleanMitmLogEvent', cleanLogTableData)
      emiter.on('onMitmNoResetRefreshEvent', onMitmNoResetRefresh)
      emiter.on('onMitmResetRefreshEvent', onMitmResetRefresh)
    }
    return () => {
      if (pageType === 'MITM') {
        emiter.off('onHasParamsJumpHistory', onHasParamsJumpHistory)
        emiter.off('onMitmClearFromPlugin', onMitmClearFromPlugin)
        emiter.off('onMitmSearchInputVal', onMitmSearchInputVal)
        emiter.off('onMitmCurProcess', onMitmCurProcess)
        emiter.off('cancleMitmFilterEvent', cancleMitmFilter)
        emiter.off('cancleMitmAllFilterEvent', cancleAllFilter)
        emiter.off('cleanMitmLogEvent', cleanLogTableData)
        emiter.off('onMitmNoResetRefreshEvent', onMitmNoResetRefresh)
        emiter.off('onMitmResetRefreshEvent', onMitmResetRefresh)
      }
    }
  }, [pageType])

  useEffect(() => {
    onSetHasNewData && onSetHasNewData(offsetData.length > 0)
  }, [offsetData])

  useEffect(() => {
    onSetTableTotal && onSetTableTotal(total)
    onSetTableSelectNum && onSetTableSelectNum(isAllSelect ? total : selectedRowKeys?.length)
  }, [total, isAllSelect, selectedRowKeys])

  useEffect(() => {
    if (!updateCacheData.length || !data.length) return
    const visibleIds = new Set(data.map((item) => Number(item.Id)))
    const applicableUpdates = updateCacheData.filter((item) => visibleIds.has(Number(item.id)))
    if (!applicableUpdates.length) return

    const appliedIds = new Set(applicableUpdates.map((item) => Number(item.id)))
    patchTData((current) =>
      patchHTTPFlowTags(
        current,
        applicableUpdates.map((item) => ({ Id: item.id, Tags: item.tags })),
      ),
    )
    setUpdateCacheData((current) => current.filter((item) => !appliedIds.has(Number(item.id))))
  }, [data, patchTData, updateCacheData])

  const realData = data

  useLayoutEffect(() => {
    if (!selectionReconcilePendingRef.current) return
    selectionReconcilePendingRef.current = false
    const current = getSelected()
    if (!current) return

    const currentIndex = findHTTPFlowSelectionIndex(realData, current)
    if (currentIndex >= 0) {
      setCurrentIndex(currentIndex)
      return
    }

    setCurrentIndex(undefined)
    setSelected(undefined)
    setOnlyShowFirstNode?.(true)
  }, [getSelected, realData, setOnlyShowFirstNode, setSelected])

  useThrottleEffect(() => {
    // 当realData长度大于1000时，打印日志
    if (realData.length > 1000) {
      debugToPrintLogs({
        page: 'HTTPFlowTable',
        fun: 'realData useThrottleEffect',
        title: 'HTTP Flow Table Data Length',
        status: 'INFO',
        content: `${realData.length}`,
      })
    }
  }, [realData.length])

  const onlyFavoriteTag = useMemo(
    () =>
      onlyFavorite && (
        <YakitTag closable onClose={() => onToggleOnlyFavorite()}>
          {t('HTTPFlowTable.onlyFavorites')}
        </YakitTag>
      ),
    [onlyFavorite, i18nRefresh],
  )

  const viewAttachTag = useMemo(
    () =>
      !!viewAttachId && (
        <Tooltip title={`${t('HTTPFlowTable.viewAttachTip', { Id: viewAttachId })}`}>
          <YakitTag
            closable
            onClose={() => {
              setViewAttachId(0)
              setParams((prev) => ({ ...prev, IncludeId: [] }))
            }}
          >
            {t('HTTPFlowTable.RowContextMenu.viewAttach')}
          </YakitTag>
        </Tooltip>
      ),
    [viewAttachId, i18nRefresh],
  )

  const renderTitle = useMemo(() => {
    if (noTableTitle) return
    return (
      <div className={style['http-history-table-title']} style={{ ...props.httpHistoryTableTitleStyle }}>
        <div className={classNames(style['http-history-table-title-space-between'], style['http-history-table-row'])}>
          {showSourceType && (
            <div className={classNames(style['http-history-table-flex'])}>
              {SourceType.map((tag) => (
                <YakitCheckableTag
                  key={tag.value}
                  checked={!!params.SourceType?.split(',').includes(tag.value)}
                  onChange={(checked) => {
                    if (checked) {
                      setParams((prev) => {
                        const selectTypeList = [...(params.SourceType?.split(',') || []), tag.value]
                        return {
                          ...prev,
                          SourceType: selectTypeList.join(','),
                        }
                      })
                    } else {
                      setParams((prev) => {
                        const selectTypeList = (params.SourceType?.split(',') || []).filter((ele) => ele !== tag.value)
                        return {
                          ...prev,
                          SourceType: selectTypeList.join(','),
                        }
                      })
                    }
                  }}
                >
                  {tag.text(t)}
                </YakitCheckableTag>
              ))}
            </div>
          )}
          <div
            className={classNames(style['http-history-table-flex'], style['http-history-table-title-left-cluster'])}
            style={{ gap: 8 }}
          >
            {shieldData?.data.length > 0 && (
              <HTTPFlowShield shieldData={shieldData} cancleFilter={cancleFilter} cancleAllFilter={cancleAllFilter} />
            )}
            <div className={style['http-history-table-total']}>
              <div className={style['http-history-table-total-item']}>
                <span className={style['http-history-table-total-item-text']}>Total</span>
                <span className={style['http-history-table-total-item-number']}>{total}</span>
              </div>
              <Divider type="vertical" />
              <div className={style['http-history-table-total-item']}>
                <span className={style['http-history-table-total-item-text']}>Selected</span>
                <span className={style['http-history-table-total-item-number']}>
                  {isAllSelect ? total : selectedRowKeys?.length}
                </span>
              </div>
            </div>
            <div className={style['http-history-table-filter-tag-wrap']}>
              {filterTagDom}
              {onlyFavoriteTag}
              {viewAttachTag}
            </div>
          </div>
          <div className={style['http-history-table-right']}>
            {showAdvancedSearch && (
              <>
                {size?.width && size?.width > 920 ? (
                  <YakitButton
                    type="text"
                    onClick={() => {
                      setDrawerFormVisible(true)
                    }}
                    style={{ padding: 0 }}
                  >
                    {t('YakitButton.advancedFilter')}
                  </YakitButton>
                ) : (
                  <Tooltip title={t('YakitButton.advancedFilter')} placement="top">
                    <YakitButton
                      type="text2"
                      icon={<OutlineFilterIcon />}
                      onClick={() => {
                        setDrawerFormVisible(true)
                      }}
                    />
                  </Tooltip>
                )}
                {isFilter && (
                  <YakitTag color={'success'} style={{ margin: 0 }}>
                    {t('HTTPFlowTable.configured')}
                    <CheckedSvgIcon />
                  </YakitTag>
                )}
                <Divider type="vertical" style={{ margin: 0, top: 1 }} />
              </>
            )}
            {showProtocolType && (
              <div className={classNames(style['http-history-table-right-item'])}>
                {size?.width && size?.width > 960 && (
                  <div className={style['http-history-table-right-label']}>{t('HTTPFlowTable.protocolType')}</div>
                )}
                <YakitSelect
                  size="small"
                  value={params.IsWebsocket || ''}
                  wrapperStyle={{ width: 100 }}
                  onSelect={(val) => {
                    setParams((prev) => ({
                      ...prev,
                      IsWebsocket: val,
                    }))
                  }}
                >
                  <YakitSelect.Option value="">{t('HTTPFlowTable.all')}</YakitSelect.Option>
                  <YakitSelect.Option value="http/https">http/https</YakitSelect.Option>
                  <YakitSelect.Option value="websocket">websocket</YakitSelect.Option>
                </YakitSelect>
              </div>
            )}
            {showHistorySearch && (
              <HistorySearch
                searchVal={searchVal}
                setSearchVal={setSearchVal}
                showPopoverSearch={size?.width ? size?.width <= 1200 : true}
                handleSearch={handleSearch}
                addonBeforeOption={[
                  {
                    label: t('HistorySearch.keyword'),
                    value: 'all',
                  },
                  {
                    label: t('HistorySearch.request'),
                    value: 'request',
                  },
                  {
                    label: t('HistorySearch.response'),
                    value: 'response',
                  },
                ]}
              />
            )}
            <Tooltip title={t('HTTPFlowTable.favorites')} placement="top">
              <YakitButton
                type={onlyFavorite ? 'outline1' : 'outline2'}
                icon={<SolidStarIcon />}
                onClick={(e) => {
                  e.currentTarget.blur()
                  onToggleOnlyFavorite()
                }}
              />
            </Tooltip>
            {showColorSwatch && (
              <div className={style['http-history-table-color-swatch']}>
                <YakitPopover
                  overlayClassName={style['http-history-table-color-popover']}
                  content={
                    <ColorSearch
                      color={color}
                      setColor={setColor}
                      onReset={() => setColor([])}
                      onSure={() => onColorSure()}
                      setIsShowColor={setIsShowColor}
                    />
                  }
                  trigger="click"
                  placement="bottomLeft"
                  visible={isShowColor}
                  onVisibleChange={(visible) => {
                    if (!visible) setIsShowColor(false)
                  }}
                >
                  <YakitButton
                    type="outline2"
                    isHover={isShowColor || !!color.length}
                    style={{ padding: 4 }}
                    onClick={() => setIsShowColor(true)}
                  >
                    <ColorSwatchIcon />
                  </YakitButton>
                </YakitPopover>
              </div>
            )}
            {showBatchActions && (
              <>
                {(selectedRowKeys.length === 0 && (
                  <YakitButton type="outline2" disabled={selectedRowKeys.length === 0}>
                    {t('YakitButton.batchOperation')}
                    <ChevronDownIcon style={{ color: '#85899E' }} />
                  </YakitButton>
                )) || (
                  <YakitPopover
                    overlayClassName={style['http-history-table-drop-down-popover']}
                    content={
                      <YakitMenu
                        width={150}
                        selectedKeys={[]}
                        data={getBatchContextMenu()}
                        onClick={({ key, keyPath }) => {
                          onMultipleClick(key, keyPath)
                        }}
                        parentTitleClick
                      />
                    }
                    trigger="click"
                    placement="bottomLeft"
                    onVisibleChange={setBatchVisible}
                    visible={batchVisible}
                  >
                    <YakitButton type="outline2" disabled={selectedRowKeys.length === 0}>
                      {t('YakitButton.batchOperation')}
                      <ChevronDownIcon />
                    </YakitButton>
                  </YakitPopover>
                )}
              </>
            )}
            {showHistoryAnalysisBtn && (
              <Tooltip title={t('YakitRoute.trafficAnalysis')} placement="top">
                <YakitButton
                  type="outline2"
                  icon={<PublicHTTPHistoryIcon />}
                  onClick={() => {
                    if (onHistoryAnalysisClick) {
                      onHistoryAnalysisClick()
                      return
                    }
                    emiter.emit(
                      'openPage',
                      JSON.stringify({
                        route: YakitRoute.DB_HTTPHistoryAnalysis,
                        params: {},
                      }),
                    )
                  }}
                />
              </Tooltip>
            )}
            {showDelAll && (
              <YakitDropdownMenu
                menu={{
                  data: [
                    {
                      key: 'resetId',
                      label: t('HTTPFlowTable.resetRequestID'),
                    },
                    {
                      key: 'noResetId',
                      label: t('HTTPFlowTable.doNotResetRequestID'),
                    },
                    {
                      key: 'onlyFavorite',
                      label: t('HTTPFlowTable.keepOnlyFavorites'),
                    },
                  ],
                  onClick: ({ key }) => {
                    switch (key) {
                      case 'resetId':
                        onRemoveHttpHistoryAll({ resetId: true })
                        break
                      case 'noResetId':
                        onRemoveHttpHistoryAll()
                        break
                      case 'onlyFavorite':
                        onRemoveHttpHistoryAll({
                          isAddQuery: true,
                          mergeParams: false,
                          query: { Filter: { ExcludeTags: [HTTP_FLOW_FAVORITE_TAG] } },
                        })
                        break
                      default:
                        break
                    }
                  },
                }}
                dropdown={{
                  trigger: ['click'],
                  placement: 'bottom',
                }}
              >
                <YakitButton type="outline1" colors="danger">
                  {t('YakitButton.clear')}
                </YakitButton>
              </YakitDropdownMenu>
            )}
            {showSetting && (
              <YakitButton
                icon={<OutlineCogIcon />}
                type={isAdvancedSet ? 'text' : 'text2'}
                onClick={() => {
                  setAdvancedSetVisible(true)
                }}
              >
                {isAdvancedSet && t('HTTPFlowTable.configured')}
              </YakitButton>
            )}
            {showRefresh && (
              <YakitDropdownMenu
                menu={{
                  data: [
                    {
                      key: 'noResetRefresh',
                      label: t('YakitButton.refreshOnly'),
                    },
                    {
                      key: 'resetRefresh',
                      label: t('YakitButton.resetQueryAndRefresh'),
                    },
                  ],
                  onClick: ({ key }) => {
                    switch (key) {
                      case 'noResetRefresh':
                        setWatchRefresh((prev) => !prev)
                        updateData()
                        break
                      case 'resetRefresh':
                        onResetRefresh()
                        break
                      default:
                        break
                    }
                  },
                }}
                dropdown={{
                  trigger: ['hover'],
                  placement: 'bottom',
                }}
              >
                <Badge dot={offsetData.length > 0} offset={[-5, 4]} className={style['http-history-table-badge']}>
                  <YakitButton type="text2" icon={<OutlineRefreshIcon />} onClick={(e) => e.stopPropagation()} />
                </Badge>
              </YakitDropdownMenu>
            )}
          </div>
        </div>
      </div>
    )
  }, [
    noTableTitle,
    batchVisible,
    color,
    filterTagDom,
    getBatchContextMenu,
    isAdvancedSet,
    isAllSelect,
    isFilter,
    isShowColor,
    offsetData.length,
    onColorSure,
    onHistoryAnalysisClick,
    onMultipleClick,
    onlyFavorite,
    onlyFavoriteTag,
    viewAttachTag,
    params.IsWebsocket,
    params.SourceType,
    props.httpHistoryTableTitleStyle,
    searchVal,
    selectedRowKeys.length,
    shieldData,
    showAdvancedSearch,
    showBatchActions,
    showColorSwatch,
    showDelAll,
    showHistoryAnalysisBtn,
    showHistorySearch,
    showProtocolType,
    showRefresh,
    showSetting,
    showSourceType,
    size?.width,
    i18nRefresh,
    total,
    updateData,
  ])

  // 性能优化：提取 rowSelection 为 useMemo，避免内联对象每次渲染创建新引用破坏 TableVirtualResize 的 React.memo
  const tableRowSelection = useMemo(
    () => ({
      isAll: isAllSelect,
      type: 'checkbox' as const,
      selectedRowKeys,
      onSelectAll,
      onChangeCheckboxSingle: onSelectChange,
    }),
    [isAllSelect, selectedRowKeys, onSelectAll, onSelectChange],
  )

  // 性能优化：提取 pagination prop 为 useMemo，避免内联对象 + 内联空 onChange 每次渲染创建新引用
  const tablePagination = useMemo(
    () => ({
      page: pagination.Page,
      limit: pagination.Limit,
      total,
      onChange: noopPaginationChange,
    }),
    [pagination.Page, pagination.Limit, total],
  )

  // 性能优化：以下内联箭头提取为 useMemoizedFn，避免每次渲染创建新引用
  const onResizeDetector = useMemoizedFn((width?: number, height?: number) => {
    if (!width || !height) {
      return
    }
    const previousHeight = boxHeightRef.current
    boxHeightRef.current = height
    // A freshly mounted History table can run its params effect before the
    // ResizeDetector has produced a usable height. Shared duplex push then
    // stops compatibility polling, so existing rows have no later event that
    // can wake the empty table. The first valid layout is therefore an
    // explicit bootstrap boundary.
    const action = selectHTTPFlowTableResizeAction(previousHeight, height, onlyShowFirstNode, isTableActive)
    if (action === 'bootstrap') updateData()
    if (action === 'reconcile') reconcileViewportT()
  })

  const onFormConfigSaveOk = useMemoizedFn((config: any) => {
    setFilterConfig(config)
    setRemoteValue(RemoteHistoryGV.HTTPFlowTableFormConfiguration, JSON.stringify(config))
  })

  const onEditTagsCancel = useMemoizedFn(() => setEditTagsVisible(false))

  const onPercentClose = useMemoizedFn((finish: boolean) => {
    setPercentVisible(false)
    if (finish) {
      yakitNotify('success', t('YakitNotification.exportSuccess'))
    }
  })

  const onAdvancedSetCancel = useMemoizedFn(() => {
    setAdvancedSetVisible(false)
  })

  const onAdvancedSetSave = useMemoizedFn((setting: any) => {
    setAdvancedSetVisible(false)
    const {
      backgroundRefresh: newBackgroundRefresh,
      dragSelectEnabled: newDragSelectEnabled,
      binaryDisplayEnabled: newBinaryDisplayEnabled,
      configColumnsAll,
    } = setting
    // 后台刷新
    if (newBackgroundRefresh !== backgroundRefresh) setBackgroundRefresh(newBackgroundRefresh)
    // 框选配置
    if (newDragSelectEnabled !== dragSelectEnabled) {
      setDragSelectEnabled(newDragSelectEnabled)
      setRemoteValue(RemoteHistoryGV.DragSelectEnabled, newDragSelectEnabled ? 'true' : 'false')
    }
    // 二进制展示配置
    if (newBinaryDisplayEnabled !== binaryDisplayEnabled) {
      binaryDisplayEnabledStore.setEnabled(newBinaryDisplayEnabled)
    }
    // 自定义列
    const unshowKeys = configColumnsAll.filter((item: any) => !item.isShow).map((item: any) => item.dataKey)
    const newExcludeColumnsKey = [...noColumnsKey, ...unshowKeys]
    const newColOrder = configColumnsAll.map((i: any) => i.dataKey)
    if (
      JSON.stringify(excludeColumnsKey) !== JSON.stringify(newExcludeColumnsKey) ||
      JSON.stringify(newColOrder) !== JSON.stringify(columnsOrder)
    ) {
      setRemoteValue(RemoteHistoryGV.HistroyExcludeColumnsKey, unshowKeys + '')
      setRemoteValue(RemoteHistoryGV.HistroyColumnsOrder, JSON.stringify(newColOrder))
      setExcludeColumnsKey(newExcludeColumnsKey)
      setColumnsOrder(newColOrder)
      // 表格列宽度需要重新计算
      setTableKeyNumber(uuidv4())
    }
  })

  const onShieldHintOk = useMemoizedFn(() => setShowShieldTooManyHint(false))

  return (
    <div ref={ref as Ref<any>} tabIndex={-1} className={style['http-history-flow-table-wrapper']}>
      <ReactResizeDetector
        onResize={onResizeDetector}
        handleWidth={true}
        handleHeight={true}
        refreshMode={'debounce'}
        refreshRate={50}
      />
      <div className={classNames(style['table-virtual-resize'])}>
        <TableVirtualResize<HTTPFlow>
          key={tableKeyNumber}
          ref={tableRef}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          scrollToIndex={scrollToIndex}
          query={params}
          titleHeight={titleHeight}
          isShowTitle={!noTableTitle}
          renderTitle={renderTitle}
          isReset={isReset}
          isRefresh={isRefresh}
          renderKey="Id"
          data={realData}
          overscan={pageType === 'MITM' ? MITM_FLOW_TABLE_OVERSCAN : undefined}
          rowSelection={tableRowSelection}
          loading={loading}
          enableDrag={true}
          enableDragSelection={dragSelectEnabled}
          columns={columns}
          onRowContextMenu={onRowContextMenu}
          pagination={tablePagination}
          onChange={onTableChange}
          onSetCurrentRow={onSetCurrentRow}
          useUpAndDown={true}
          containerClassName={containerClassName}
          onRowDoubleClick={onHTTPFlowTableRowDoubleClick}
          disableDeselect={true}
        />
      </div>
      <HTTPFlowTableFormConfiguration
        visible={drawerFormVisible}
        setVisible={setDrawerFormVisible}
        filterConfig={filterConfig}
        saveOk={onFormConfigSaveOk}
      ></HTTPFlowTableFormConfiguration>
      <EditTagsModal
        visible={editTagsVisible}
        editTagsInfo={editTagsRef.current}
        onCancel={onEditTagsCancel}
        onOk={editTagsSuccess}
      ></EditTagsModal>
      {percentVisible && (
        <ImportExportProgress
          getContainer={exportPageContainerRef.current}
          visible={percentVisible}
          title={t('ImportExportProgress.exportHARData')}
          token={exportToken}
          apiKey="ExportHTTPFlowStream"
          onClose={onPercentClose}
        />
      )}
      {advancedSetVisible && (
        <AdvancedSet
          dragSelectEnabled={dragSelectEnabled}
          binaryDisplayEnabled={binaryDisplayEnabled}
          columnsAllStr={JSON.stringify(configColumnRef.current.filter((item) => !specialCustoms(item.dataKey)))}
          onCancel={onAdvancedSetCancel}
          onSave={onAdvancedSetSave}
          defalutColumnsOrder={defalutColumnsOrderRef.current}
        ></AdvancedSet>
      )}
      <YakitHint
        visible={showShieldTooManyHint}
        title={t('HTTPFlowTable.shieldTooManyOnlyLatestTitle')}
        content={t('HTTPFlowTable.shieldTooManyOnlyLatest')}
        cancelButtonProps={{ style: { display: 'none' } }}
        okButtonText={t('YakitButton.ok')}
        onOk={onShieldHintOk}
      />
    </div>
  )
})
