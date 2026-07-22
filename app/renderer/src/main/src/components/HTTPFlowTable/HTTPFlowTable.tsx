import React, { Ref, useEffect, useMemo, useRef, useState, useContext } from 'react'
import { Divider, Tooltip, Badge } from 'antd'
import { YakQueryHTTPFlowRequest } from '../../utils/yakQueryHTTPFlow'
import { YakScript } from '../../pages/invoker/schema'
import { HTTPFlowDetailProp } from '../HTTPFlowDetail'
import { yakitNotify, yakitFailed } from '../../utils/notification'
import style from './HTTPFlowTable.module.scss'
import { formatTimestamp } from '../../utils/timeUtil'
import { buildHTTPFlowSuffixOptions, formatHTTPFlowPathSuffix } from './HTTPFlowPathSuffix'
import {
  useCreation,
  useDebounceEffect,
  useDebounceFn,
  useMemoizedFn,
  useUpdateEffect,
  useThrottleEffect,
} from 'ahooks'
import ReactResizeDetector from 'react-resize-detector'
import { generateYakCodeByRequest, RequestToYakCodeTemplate } from '../../pages/invoker/fromPacketToYakCode'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { TableVirtualResize } from '../TableVirtualResize/TableVirtualResize'
import { ColorSwatchIcon, ChevronDownIcon, CloudDownloadIcon } from '@/assets/newIcon'
import classNames from 'classnames'
import { ColumnsTypeProps, FiltersItemProps, SortProps } from '../TableVirtualResize/TableVirtualResizeType'
import { minWinSendToChildWin, openExternalWebsite, openPacketNewWindow } from '@/utils/openWebsite'
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
import { HTTPHistorySourcePageType } from '../HTTPHistory'
import { useHttpFlowStore } from '@/store/httpFlow'
import { OutlineCogIcon, OutlineFilterIcon, OutlineRefreshIcon } from '@/assets/icon/outline'
import { SolidStarIcon } from '@/assets/icon/solid'
import useVirtualTableHook from '@/hook/useVirtualTableHook/useVirtualTableHook'
import { ParamsTProps } from '@/hook/useVirtualTableHook/useVirtualTableHookType'
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
import { usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'
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
import { JSONParseLog } from '@/utils/tool'
import {
  defFilterConfig,
  FilterConfig,
  HTTPFlowTableFormConfiguration,
  HTTPFlowTableFormConsts,
} from './HTTPFlowTableFormConfiguration/HTTPFlowTableFormConfiguration'
import {
  buildHTTPFlowTableAdvancedQuery,
  buildLegacyHTTPFlowTableFilterConfig,
  getFullRange,
  hasActiveHTTPFlowTableFilterConfig,
  safeParseHTTPFlowTableCache,
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
} from './HTTPFlowTable.constants'
import {
  buildHTTPFlowQueryTags,
  getClassNameData,
  getHTTPFlowReqAndResToString,
  getRunTimeIdObj,
  filterHTTPFlowsByFavoriteAndTags,
} from './HTTPFlowTable.utils'
import { PLUGIN_PREFIX } from '../yakitUI/YakitEditor/YakitEditor'

//导出给其他组件用
export * from './HTTPFlowTable.constants'
export * from './HTTPFlowTable.columns'
export * from './HTTPFlowTable.actions'
export * from './HTTPFlowTable.availableColors'
export * from './HTTPFlowTable.utils'
export * from './components'

const { ipcRenderer } = window.require('electron')

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
  const { t, i18n } = useI18nNamespaces(['yakitUi', 'yakitRoute', 'history'])
  const comBuiltinTagList = useCampare(builtinTagList)

  // 导出字段映射配置
  const arrList = useMemo(() => getHTTPFlowExportFields(t), [t])
  const { currentPageTabRouteKey } = usePageInfo(
    (s) => ({
      currentPageTabRouteKey: s.currentPageTabRouteKey,
    }),
    shallow,
  )

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
  const [tagSearchVal, setTagSearchVal] = useState<string>('')

  const isOneceLoading = useRef<boolean>(true)

  const [suffixList, setSuffixList] = useState<FiltersItemProps[]>([])
  const comSuffixList = useCampare(suffixList)
  const [selected, setSelected, getSelected] = useGetSetState<HTTPFlow>()

  const { compareState, setCompareState, setCompareLeft, setCompareRight } = useHttpFlowStore()

  // 屏蔽数据
  const [shieldData, setShieldData, getShieldData] = useGetSetState<ShieldData>({
    data: [],
  })
  const [showShieldTooManyHint, setShowShieldTooManyHint] = useState(false)
  const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0
  const [_, setBodyLengthUnit, getBodyLengthUnit] = useGetSetState<'B' | 'K' | 'M'>('B')
  const [currentIndex, setCurrentIndex] = useState<number>()
  const [scrollToIndex, setScrollToIndex] = useState<number | string>()
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [selectedRows, setSelectedRows] = useState<HTTPFlow[]>([])
  const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
  const [afterBodyLength, setAfterBodyLength, getAfterBodyLength] = useGetSetState<number>()
  const [beforeBodyLength, setBeforeBodyLength, getBeforeBodyLength] = useGetSetState<number>()
  const [isReset, setIsReset] = useState<boolean>(false)
  const [watchRefresh, setWatchRefresh] = useState<boolean>(false)

  const [checkBodyLength, setCheckBodyLength] = useState<boolean>(false) // 查询BodyLength大于0

  const [batchVisible, setBatchVisible] = useState<boolean>(false)

  const [exportDataKey, setExportDataKey] = useState<string[]>([])

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

  // 整表重新加载时清空选中（hook 在换筛选、刷新时会调 onFirst）
  const onFirst = useMemoizedFn(() => {
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
  const getAddDataByGrpcRef = useRef<(query: YakQueryHTTPFlowRequest) => void>(() => {})
  const offsetDataRef = useRef<HTTPFlow[]>([])
  const updateDataRef = useRef<() => void>(() => {})
  const slidingClippedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (extraTimerRef.current) {
        clearInterval(extraTimerRef.current)
      }
    }
  }, [])

  // hook 用 Pagination.AfterId，后端 QueryHTTPFlows 要顶层 AfterId，这里做一层转换
  const apiQueryHTTPFlows = useMemoizedFn(async (hookParams: ParamsTProps & { Filter: YakQueryHTTPFlowRequest }) => {
    const { Pagination, Filter } = hookParams
    const { AfterId, BeforeId, FixedLimit, ...paginationFields } = Pagination
    // 仅 update（无游标）时更新 total
    const isUpdateRequest = !AfterId && !BeforeId
    const query: YakQueryHTTPFlowRequest = {
      ...Filter,
      Pagination: { ...paginationFields },
      ...(AfterId ? { AfterId } : {}),
      ...(BeforeId ? { BeforeId } : {}),
    }
    if (Array.isArray(query.Methods)) {
      query.Methods = query.Methods.join(',')
    }
    if ('bodyLength' in query) {
      delete query.bodyLength
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
    const rsp = (await ipcRenderer.invoke('QueryHTTPFlows', query)) as YakQueryHTTPFlowResponse
    if (isUpdateRequest) {
      setTotal(rsp.Total)
      if (extraTimerRef.current) {
        clearInterval(extraTimerRef.current)
      }
      extraTimerRef.current = setInterval(() => getAddDataByGrpcRef.current(query), 1000)
    }
    return rsp
  })

  const isTopLoadRequest = useMemoizedFn((hookParams: ParamsTProps & { Filter: YakQueryHTTPFlowRequest }) => {
    const { AfterId, BeforeId, Limit } = hookParams.Pagination
    return !!AfterId && !BeforeId && Limit !== OFFSET_STEP
  })

  // history 页面时，判断倒序情况，并且未加载的数据（减去 offsetData 缓存）超过 200 条时整表刷新 数据裁剪后按照增量来加载
  const grpcQueryHTTPFlows = useMemoizedFn(async (hookParams: ParamsTProps & { Filter: YakQueryHTTPFlowRequest }) => {
    const { Pagination } = hookParams
    const { AfterId, BeforeId, Order, OrderBy, ...paginationFields } = Pagination
    if (
      !slidingClippedRef.current &&
      !backgroundRefresh &&
      pageType !== 'MITM' &&
      isTopLoadRequest(hookParams) &&
      Order !== 'asc'
    ) {
      try {
        const rsp = await apiQueryHTTPFlows({
          ...hookParams,
          Pagination: {
            Page: 1,
            Limit: 300,
            Order: 'desc',
            OrderBy: OrderBy || 'id',
            AfterId,
          },
        })
        if (Number(rsp.Total) - offsetDataRef.current.length > 200) {
          updateDataRef.current()
          return { Data: [], Total: 0, Pagination: paginationFields }
        }
      } catch (error) {}
    }
    return apiQueryHTTPFlows(hookParams)
  })

  //只有history需要裁剪
  const maxDataLength = useMemo(() => {
    return pageType === 'History' ? HTTP_FLOW_TABLE_MAX_DATA_LENGTH : 0
  }, [pageType])

  // 表格数据交给 useVirtualTableHook：负责上下滚动加载、中间位置拉新数据（offsetData 红点）
  const [
    tableParams,
    data,
    ,
    pagination,
    loading,
    offsetData,
    { startT, setTLoad: setLoading, patchTData, noResetRefreshT: updateData, setP, refreshT },
  ] = useVirtualTableHook<ParamsTProps & { Filter: YakQueryHTTPFlowRequest }, HTTPFlow, 'Data', 'Id'>({
    tableBoxRef: useRef(null), // props.inViewport 判断可见性，不必再挂一个 ref
    tableRef,
    boxHeightRef,
    grpcFun: grpcQueryHTTPFlows,
    onFirst,
    initResDataFun,
    inViewport: inViewport || isBackgroundRefresh,
    maxDataLength,
    slidingClippedRef,
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

  // 定时刷新 total，不参与上下滚动加载
  const getAddDataByGrpc = useMemoizedFn((query: YakQueryHTTPFlowRequest) => {
    const clientHeight = tableRef.current?.containerRef?.clientHeight
    if (clientHeight === 0) return
    const copyQuery = structuredClone(query)
    copyQuery.Pagination = {
      Page: 1,
      Limit: pagination.Limit,
      Order: 'desc',
      OrderBy: 'Id',
    }
    ipcRenderer
      .invoke('QueryHTTPFlows', copyQuery)
      .then((rsp: YakQueryHTTPFlowResponse) => {
        const resData = rsp?.Data || []
        if (resData.length) {
          setTotal(rsp.Total)
        }
      })
      .catch(() => {
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

  // 兼容原来 setData 写法（收藏、改标签等会原地改表格行） 拷贝避免大量二进制字段
  const setData = useMemoizedFn((value: React.SetStateAction<HTTPFlow[]>) => {
    patchTData((prev) => (typeof value === 'function' ? value(prev) : value))
  })
  updateDataRef.current = updateData

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
        data.some((item, index) => {
          if (item.Id + '' === obj.id) {
            scrollToIndex = index
          }
          return item.Id + '' === obj.id
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
          let cacheDataList = JSONParseLog(data, { page: 'HTTPFlowTable', fun: 'getShieldList' })?.data || []
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
      setP({
        Filter: {
          ...getParams(),
          ...filter,
          Tags: buildHTTPFlowQueryTags(tagsFilter, onlyFavorite),
          bodyLength: !!(afterBodyLength || beforeBodyLength || checkBodyLength), // 用来判断响应长度的icon颜色是否显示蓝色
        },
        Pagination: {
          ...tableParams.Pagination,
          Order: sort.order,
          OrderBy: sort.orderBy === 'DurationMs' ? 'duration' : sort.orderBy || 'id',
        },
      })
    },
    { wait: 500 },
  ).run

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

  const onRefreshQueryHTTPFlowsFun = useMemoizedFn((data) => {
    try {
      const updateData = JSONParseLog(data, { page: 'HTTPFlowTable', fun: 'onRefreshQueryHTTPFlowsFun' })
      if (typeof updateData !== 'string') {
        if (updateData.action === 'update') {
          setUpdateCacheData((prev) => prev.concat(updateData))
        }
      }
    } catch (error) {}
    setWatchRefresh((prev) => !prev)
    startT()
  })
  useEffect(() => {
    emiter.on('onRefreshQueryHTTPFlows', onRefreshQueryHTTPFlowsFun)
    return () => {
      emiter.off('onRefreshQueryHTTPFlows', onRefreshQueryHTTPFlowsFun)
    }
  }, [])

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
  // 保留数组中非重复数据
  const filterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))
  // 数组去重
  const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

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

  const cleanLogTableData = useMemoizedFn((version) => {
    if (version !== mitmVersion) return
    setOnlyShowFirstNode && setOnlyShowFirstNode(true)
    setData([])
    setParams((prev) => ({
      ...prev,
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

  const onSelectAll = (newSelectedRowKeys: string[], selected: HTTPFlow[], checked: boolean) => {
    setIsAllSelect(checked)
    setSelectedRowKeys(newSelectedRowKeys)
    setSelectedRows(selected)
  }
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
      minWinSendToChildWin({
        type: 'openPacketNewWindow',
        data: getPacketNewWindow(rowDate),
      })
    } else {
      setSelected(undefined)
      setOnlyShowFirstNode && setOnlyShowFirstNode(!onlyShowFirstNode)
    }
  })

  // 如果YakitResizeBox只展示第一个节点，则要清除Selected
  useEffect(() => {
    onlyShowFirstNode && setCurrentIndex(undefined)
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
        let m = showYakitDrawer({
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
    i18n.language,
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
  const onRemoveHttpHistory = useMemoizedFn((query) => {
    setLoading(true)
    if (isAllSelect) {
      onRemoveHttpHistoryAll(true, query)
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

  //删除 重置请求 ID
  const onRemoveHttpHistoryAllAndResetId = useMemoizedFn(() => {
    setLoading(true)
    ipcRenderer
      .invoke('DeleteHTTPFlows', { DeleteAll: true })
      .then(() => {
        setOnlyShowFirstNode && setOnlyShowFirstNode(true)
        onResetRefresh()
      })
      .catch((e: any) => {
        yakitNotify('error', `${t('HTTPFlowTable.historyDeleteFailed')}${e}`)
      })
      .finally(() => {
        onUpdateOtherPage()
        setTimeout(() => setLoading(false), 500)
      })
  })
  // 不重置请求 ID
  const onRemoveHttpHistoryAll = useMemoizedFn((isAddQuery?: boolean, query?: any) => {
    let newParams = {
      Filter: {},
      DeleteAll: false,
    }
    if (isAddQuery) {
      newParams = {
        Filter: {
          ...params,
          ...(query?.Filter || {}),
        },
        DeleteAll: false,
      }
    }
    setLoading(true)
    ipcRenderer
      .invoke('DeleteHTTPFlows', newParams)
      .then((i: HTTPFlow) => {
        setOnlyShowFirstNode && setOnlyShowFirstNode(true)
        onResetRefresh()
      })
      .catch((e: any) => {
        yakitNotify('error', `${t('HTTPFlowTable.historyDeleteFailed')}${e}`)
      })
      .finally(() => {
        onUpdateOtherPage()
        setTimeout(() => setLoading(false), 300)
      })
    yakitNotify('info', t('HTTPFlowTable.deletingPleaseRefresh'))
    setCompareLeft({ content: '', language: 'http' })
    setCompareRight({ content: '', language: 'http' })
    setCompareState(0)
    setTimeout(() => {
      if (props.onSelected) props.onSelected(undefined)
    }, 400)
  })

  const onBatch = useMemoizedFn((f: Function, number: number, all?: boolean) => {
    const length = selectedRows.length
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
      const element = selectedRows[i]
      f(element)
      if (i === length - 1) {
        setSelectedRowKeys([])
        setSelectedRows([])
      }
    }
  })

  const formatJson = (filterVal, jsonData) => {
    return jsonData.map((v, index) =>
      filterVal.map((j) => {
        if (['Request', 'Response'].includes(j)) {
          return new Buffer(v[j]).toString('utf8')
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
  }

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
  const initExcelData = (resolve, newExportData: HTTPFlow[], rsp, arrList) => {
    let exportData: any = []
    const header: string[] = []
    const filterVal: string[] = []
    exportDataKey.map((item) => {
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
  }
  const getExcelData = useMemoizedFn((pagination, list: HTTPFlow[]) => {
    return new Promise((resolve) => {
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

      let exportParams: any = {}
      const FieldName = arrList.filter((item) => exportDataKey.includes(item.dataKey)).map((item) => item.key)

      const Ids: number[] = list.map((item) => parseInt(item.Id + ''))
      // 最大请求条数
      let pageSize = getPageSize
      // 需要多少次请求
      let count = Math.ceil((isAllSelect ? total : Ids.length) / pageSize)
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
          let rsp: YakQueryHTTPFlowResponse = {
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
  const onExcelExport = (list) => {
    percentContainerRef.current = currentPageTabRouteKey
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
            getContainer={
              document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
            }
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
      getContainer: document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined,
    })
  }

  /**
   * @description 导出为HAR
   */
  const [exportToken, setExportToken] = useState<string>('')
  const [percentVisible, setPercentVisible] = useState<boolean>(false)
  const percentContainerRef = useRef<string>(currentPageTabRouteKey)
  const onHarExport = (ids: number[]) => {
    percentContainerRef.current = currentPageTabRouteKey
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
            getContainer={
              document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
            }
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
      getContainer: document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined,
    })
  }

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
            const FieldName = arrList.filter((item) => exportDataKey.includes(item.dataKey)).map((item) => item.key)
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
                percentContainerRef.current = currentPageTabRouteKey
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
        let newData: HTTPFlow[] = []
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
    let Url = v?.Url
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
    i18n,
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
      let selectTypeList = props.params?.SourceType.split(',') || ['']
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

  const realData = useMemo(() => {
    if (updateCacheData.length) {
      let findFlag = false
      const dataMap = new Map(data.map((item) => [+item.Id, item]))
      updateCacheData.forEach((target, index) => {
        if (dataMap.has(target.id)) {
          const targetObject = dataMap.get(target.id)
          if (targetObject) {
            targetObject.Tags = target.tags
            updateCacheData.splice(index, 1)
            setUpdateCacheData(updateCacheData)
            findFlag = true
          }
        }
      })
      if (findFlag) {
        const newData = getClassNameData(data)
        setData(newData)
        return newData
      }
      return data
    } else {
      return data
    }
  }, [updateCacheData, data])

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
    [onlyFavorite, i18n.language],
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
    [viewAttachId, i18n.language],
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
                  ],
                  onClick: ({ key }) => {
                    switch (key) {
                      case 'resetId':
                        onRemoveHttpHistoryAllAndResetId()
                        break
                      case 'noResetId':
                        onRemoveHttpHistoryAll()
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
    i18n.language,
    total,
    updateData,
  ])

  return (
    <div ref={ref as Ref<any>} tabIndex={-1} className={style['http-history-flow-table-wrapper']}>
      <ReactResizeDetector
        onResize={(width, height) => {
          if (!width || !height) {
            return
          }
          if (onlyShowFirstNode) {
            // 窗口由小变大时 重新拉取数据
            if (boxHeightRef.current && boxHeightRef.current < height) {
              boxHeightRef.current = height
              updateData()
            } else {
              boxHeightRef.current = height
            }
          }
        }}
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
          rowSelection={{
            isAll: isAllSelect,
            type: 'checkbox',
            selectedRowKeys,
            onSelectAll: onSelectAll,
            onChangeCheckboxSingle: onSelectChange,
          }}
          loading={loading}
          enableDrag={true}
          enableDragSelection={dragSelectEnabled}
          columns={columns}
          onRowContextMenu={onRowContextMenu}
          pagination={{
            page: pagination.Page,
            limit: pagination.Limit,
            total,
            onChange: (page, limit) => {},
          }}
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
        saveOk={(config) => {
          setFilterConfig(config)
          setRemoteValue(RemoteHistoryGV.HTTPFlowTableFormConfiguration, JSON.stringify(config))
        }}
      ></HTTPFlowTableFormConfiguration>
      <EditTagsModal
        visible={editTagsVisible}
        editTagsInfo={editTagsRef.current}
        onCancel={() => setEditTagsVisible(false)}
        onOk={editTagsSuccess}
      ></EditTagsModal>
      {percentVisible && (
        <ImportExportProgress
          getContainer={document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined}
          visible={percentVisible}
          title={t('ImportExportProgress.exportHARData')}
          token={exportToken}
          apiKey="ExportHTTPFlowStream"
          onClose={(finish) => {
            setPercentVisible(false)
            if (finish) {
              yakitNotify('success', t('YakitNotification.exportSuccess'))
            }
          }}
        />
      )}
      {advancedSetVisible && (
        <AdvancedSet
          dragSelectEnabled={dragSelectEnabled}
          binaryDisplayEnabled={binaryDisplayEnabled}
          columnsAllStr={JSON.stringify(configColumnRef.current.filter((item) => !specialCustoms(item.dataKey)))}
          onCancel={() => {
            setAdvancedSetVisible(false)
          }}
          onSave={(setting) => {
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
            const unshowKeys = configColumnsAll.filter((item) => !item.isShow).map((item) => item.dataKey)
            const newExcludeColumnsKey = [...noColumnsKey, ...unshowKeys]
            const newColOrder = configColumnsAll.map((i) => i.dataKey)
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
          }}
          defalutColumnsOrder={defalutColumnsOrderRef.current}
        ></AdvancedSet>
      )}
      <YakitHint
        visible={showShieldTooManyHint}
        title={t('HTTPFlowTable.shieldTooManyOnlyLatestTitle')}
        content={t('HTTPFlowTable.shieldTooManyOnlyLatest')}
        cancelButtonProps={{ style: { display: 'none' } }}
        okButtonText={t('YakitButton.ok')}
        onOk={() => setShowShieldTooManyHint(false)}
      />
    </div>
  )
})
