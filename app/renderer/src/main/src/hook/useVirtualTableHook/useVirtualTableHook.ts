import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, useMemo } from 'react'
import type {
  ParamsTProps,
  useVirtualTableHookParams,
  DataResponseProps,
  VirtualPaging,
  DataTProps,
  FilterProps,
  VirtualTableRefreshReason,
} from './useVirtualTableHookType'
import { useDebounceEffect, useGetState, useInViewport, useMemoizedFn } from 'ahooks'
import cloneDeep from 'lodash/cloneDeep'
import { serverPushStatus, subscribeServerPushStatus } from '@/utils/duplex/duplex'
import type { SortProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import { yakitNotify } from '@/utils/notification'
import { genDefaultPagination } from '@/pages/invoker/schema'
import type { VirtualTableViewportSnapshot } from './useVirtualTableScheduler'
import {
  mergeUniqueVirtualTableRows,
  mergeVirtualTableServerPushRows,
  prependAcceptedVirtualTableServerPushRows,
  resolveVirtualTableServerPushActive,
  selectVirtualTableAutomaticRefreshReason,
  selectVirtualTableServerPushRows,
  selectVirtualTableAutoRefreshAction,
  selectVirtualTableViewportFillLimit,
  shouldRestoreVirtualTableViewport,
  shouldLoadVirtualTableBottom,
  shouldLoadVirtualTableAscBottomOnViewportFit,
} from './useVirtualTableScheduler'

const OFFSET_LIMIT = 30
const OFFSET_STEP = 100
const ROW_HEIGHT = 28 // 行高

const defSort: SortProps = {
  order: 'desc',
  orderBy: 'Id',
}

const createDefaultSort = (): SortProps => ({ ...defSort })

// 倒序时需要额外处理传给后端顺序
export const verifyOrder = (pagination: VirtualPaging, AfterId?: number) => {
  // 是否将返回结果倒序
  let isReverse = false
  if (pagination.Order && ['desc', 'none'].includes(pagination.Order) && AfterId) {
    pagination.Order = 'asc'
    isReverse = true
  }
  return { pagination, isReverse }
}

type ScrollPending<T> = { arr: T[]; direction: 'top' | 'bottom'; oldEdgeId: number }

const clipSlidingData = <T>(arr: T[], max: number, keep: 'head' | 'tail') =>
  arr.length > max ? (keep === 'head' ? arr.slice(0, max) : arr.slice(-max)) : arr

const syncSlidingEdgeIds = <T extends Record<string, any>>(
  arr: T[],
  order: string,
  idKey: string,
  maxIdRef: MutableRefObject<number>,
  minIdRef: MutableRefObject<number>,
) => {
  if (!arr.length) {
    maxIdRef.current = 0
    minIdRef.current = 0
    return
  }
  const first = Number(arr[0][idKey])
  const last = Number(arr[arr.length - 1][idKey])
  if (['desc', 'none'].includes(order)) {
    maxIdRef.current = first
    minIdRef.current = last
  } else {
    minIdRef.current = first
    maxIdRef.current = last
  }
}

const buildEdgePagination = (
  edge: 'top' | 'bottom',
  data: Record<string, any>[],
  idKey: string,
  sort: SortProps,
  limit: number,
): VirtualPaging | null => {
  if (!data.length) return null
  const isDesc = ['desc', 'none'].includes(sort.order)
  const edgeId = Number(edge === 'top' ? data[0][idKey] : data[data.length - 1][idKey])
  if (edge === 'top') {
    return {
      Page: 1,
      Limit: limit,
      Order: sort.order,
      OrderBy: sort.orderBy || idKey,
      ...(sort.order === 'asc' ? { BeforeId: edgeId } : { AfterId: edgeId }),
    }
  }
  return {
    Page: 1,
    Limit: limit,
    Order: sort.order,
    OrderBy: sort.orderBy || idKey,
    BeforeId: isDesc ? edgeId : undefined,
    AfterId: isDesc ? undefined : edgeId,
  }
}

// 使用此hook接口需满足此种结构
// request {
//     Pagination {
//       ...
//       int64 BeforeId
//       int64 AfterId
//     }
//     Filter {} //每个请求可能不同
//   }
//   response {
//     Pagination {
//       int64 BeforeId
//       int64 AfterId
//     } // 和request 同样的结构
//     repeated data  {
//         uint64 Id // 里面一定会有id，才能有beforeId和afterID
//     }
//     uint64 Total
//   }

/** @name 关于虚拟表格偏移量的上下加载与动态更新 */
export default function useVirtualTableHook<
  T extends ParamsTProps,
  DataT extends DataTProps<IdKey>,
  // TODO 此处我现阶段设想如果不想传递这两个范型，可能会涉及到类型类，复杂度过高放弃了，等待有缘人
  DataKey extends string,
  IdKey extends string,
>(props: useVirtualTableHookParams<T, DataT, DataKey>) {
  const {
    tableBoxRef,
    tableRef,
    boxHeightRef,
    grpcFun,
    defaultParams = { Pagination: genDefaultPagination(20), Filter: {} },
    onFirst,
    initResDataFun,
    responseKey = { data: 'Data', id: 'Id' },
    inViewport: inViewportProp,
    maxDataLength = 0,
    slidingClippedRef: slidingClippedRefProp,
    preferServerPush = false,
    getAdditionalServerPushActive,
  } = props

  const isSliding = maxDataLength > 0
  const internalSlidingClippedRef = useRef(false)
  const slidingClippedRef = slidingClippedRefProp ?? internalSlidingClippedRef
  const idKey = useMemo(() => responseKey.id, [responseKey])
  const additionalServerPushActiveRef = useRef(getAdditionalServerPushActive)
  additionalServerPushActiveRef.current = getAdditionalServerPushActive
  const isServerPushActive = () =>
    resolveVirtualTableServerPushActive(serverPushStatus, additionalServerPushActiveRef.current)

  const [params, setParams] = useState<ParamsTProps>(defaultParams)
  // 表格展示的完整数据
  const [data, setData] = useState<DataT[]>([])
  const [pagination, setPagination] = useState<VirtualPaging>({
    Limit: OFFSET_LIMIT,
    Order: 'desc',
    OrderBy: 'created_at',
    Page: 1,
  })
  const [isRefresh, setIsRefresh] = useState<boolean>(false)
  // 最新一条数据ID
  const maxIdRef = useRef<number>(0)
  // 最后一条数据ID
  const minIdRef = useRef<number>(0)
  // 接口是否正在请求
  const isGrpcRef = useRef<boolean>(false)
  // Full refresh/reset invalidates older async responses so they cannot write
  // a stale viewport back after the table has already moved to a new query.
  const queryEpochRef = useRef(0)
  // Server push received while a query is running is coalesced into one
  // immediate follow-up instead of being dropped by the single-flight guard.
  const notificationRefreshPendingRef = useRef(false)
  const flushNotificationRefreshRef = useRef<() => void>(() => {})
  const viewportReconcilePendingRef = useRef(false)
  const flushViewportReconcileRef = useRef<() => void>(() => {})
  const [total, setTotal] = useState<number>(0)
  // 是否循环接口
  const [isLoop, setIsLoop] = useState<boolean>(preferServerPush ? false : !isServerPushActive())
  // 表格排序
  const sortRef = useRef<SortProps>(createDefaultSort())
  const [loading, setLoading] = useState(false)
  const [offsetData, setOffsetData, getOffsetData] = useGetState<DataT[]>([])
  // 设置是否自动刷新
  const idRef = useRef<NodeJS.Timeout>()
  // stopT 后避免被内部逻辑(滚动/布局)再次开启轮询
  const loopPausedRef = useRef<boolean>(false)
  const observedServerPushRef = useRef(serverPushStatus)
  // 表格是否可见
  const [internalInViewport] = useInViewport(tableBoxRef)
  const inViewport = inViewportProp ?? internalInViewport
  // 是否允许更改endLoop
  const isAllowSetEndLoopRef = useRef<boolean>(false)
  const previousQueryInViewportRef = useRef<boolean>(inViewport === true)
  const hasQueriedViewportRef = useRef(false)
  const lastAutomaticQueryParamsRef = useRef<ParamsTProps>()

  useEffect(() => {
    if (inViewport) return
    // Hidden cached pages must not commit a late response or keep a pending
    // refresh alive. The params/inViewport effect bootstraps once on return.
    queryEpochRef.current += 1
    isGrpcRef.current = false
    notificationRefreshPendingRef.current = false
    viewportReconcilePendingRef.current = false
    setLoading(false)
    setIsLoop(false)
    previousQueryInViewportRef.current = false
  }, [inViewport])

  useEffect(() => {
    if (!preferServerPush) return
    const syncServerPushStatus = (sharedDuplexActive: boolean) => {
      const active = resolveVirtualTableServerPushActive(sharedDuplexActive, additionalServerPushActiveRef.current)
      if (active) {
        observedServerPushRef.current = true
        setIsLoop(false)
        return
      }
      if (observedServerPushRef.current && !loopPausedRef.current) setIsLoop(true)
    }
    syncServerPushStatus(serverPushStatus)
    return subscribeServerPushStatus(syncServerPushStatus)
  }, [preferServerPush])

  const recoverTopIdRef = useRef(0)
  const pendingScrollRef = useRef<ScrollPending<DataT> | null>(null)

  const markSlidingClip = (len: number) => {
    if (len > maxDataLength) {
      slidingClippedRef.current = true
      setOffsetData([])
    }
  }

  //裁剪数据
  const commitSlidingData = (value: DataT[] | ((current: DataT[]) => DataT[]), order: string) => {
    setData((current) => {
      const arr = typeof value === 'function' ? value(current) : value
      syncSlidingEdgeIds(arr, order, idKey, maxIdRef, minIdRef)
      return arr
    })
  }

  //裁剪后滚动到旧数据的最后一条
  useLayoutEffect(() => {
    if (!isSliding || !slidingClippedRef.current || !pendingScrollRef.current) return
    const pending = pendingScrollRef.current
    pendingScrollRef.current = null
    const el = tableRef.current?.containerRef
    if (!el) return
    const i = pending.arr.findIndex((item) => Number(item[idKey]) === pending.oldEdgeId)
    if (i < 0) return
    if (pending.direction === 'bottom') {
      const rowNumber = (el.clientHeight - ROW_HEIGHT) / ROW_HEIGHT
      const y = 1 - (rowNumber - Math.trunc(rowNumber))
      el.scrollTop = Math.max(0, (i - Math.floor(rowNumber) + y) * ROW_HEIGHT + 7)
    } else {
      el.scrollTop = Math.max(0, i * ROW_HEIGHT)
    }
  }, [isSliding, data, idKey, tableRef])

  // 方法请求
  const getDataByGrpc = useMemoizedFn((query, type: 'top' | 'bottom' | 'update' | 'offset') => {
    if (isGrpcRef.current) return
    isGrpcRef.current = true
    const requestEpoch = queryEpochRef.current
    const finalParams: ParamsTProps = {
      ...query,
    }

    // 真正需要传给后端的查询数据
    const realQuery: ParamsTProps = cloneDeep(query)
    // 倒序时需要额外处理传给后端顺序
    const verifyResult = verifyOrder(realQuery.Pagination, realQuery.Pagination.AfterId)
    if (isSliding && realQuery.Pagination.Order === 'asc' && realQuery.Pagination.BeforeId) {
      realQuery.Pagination.Order = 'desc'
      verifyResult.pagination = realQuery.Pagination
      verifyResult.isReverse = true
    }
    finalParams.Pagination = verifyResult.pagination
    grpcFun(finalParams)
      .then((rsp: DataResponseProps<DataT, DataKey>) => {
        if (requestEpoch !== queryEpochRef.current) return
        let newData: DataT[] = verifyResult.isReverse ? rsp[responseKey.data].reverse() : rsp[responseKey.data]
        if (initResDataFun) {
          newData = initResDataFun(newData)
        }

        if (type === 'top') {
          if (newData.length <= 0) {
            if (isSliding && recoverTopIdRef.current > 0) {
              recoverTopIdRef.current = 0
              return
            }
            // 没有数据
            isServerPushActive() && setIsLoop(false)
            return
          }
          if (isSliding) {
            const order = query.Pagination.Order
            const orderBy = query.Pagination.OrderBy || idKey
            commitSlidingData((current) => {
              const oldFirstId = current[0]?.[idKey]
              const merged = mergeUniqueVirtualTableRows([newData, current], idKey, order, orderBy)
              const clipped = merged.length > maxDataLength
              if (clipped) slidingClippedRef.current = true
              const arr = clipSlidingData(merged, maxDataLength, 'head')
              pendingScrollRef.current =
                clipped && oldFirstId != null ? { arr, direction: 'top', oldEdgeId: Number(oldFirstId) } : null
              if (recoverTopIdRef.current && arr.length) {
                const firstId = Number(arr[0][idKey])
                const done = order === 'asc' ? firstId <= recoverTopIdRef.current : firstId >= recoverTopIdRef.current
                if (done) recoverTopIdRef.current = 0
              }
              return arr
            }, order)
            setTotal(rsp.Total)
            return
          }
          if (['desc', 'none'].includes(query.Pagination.Order)) {
            setData((current) => [...newData, ...current])
            maxIdRef.current = Number(newData[0][responseKey.id])
          } else {
            // 升序
            setData((current) => (rsp.Pagination.Limit - current.length >= 0 ? [...current, ...newData] : current))
            maxIdRef.current = Number(newData[newData.length - 1][responseKey.id])
          }
        } else if (type === 'bottom') {
          if (newData.length <= 0) {
            // 没有数据
            isServerPushActive() && setIsLoop(false)
            return
          }
          if (isSliding) {
            const order = query.Pagination.Order
            const orderBy = query.Pagination.OrderBy || idKey
            commitSlidingData((current) => {
              const prevTopId = current[0]?.[idKey]
              const oldLastId = current[current.length - 1]?.[idKey]
              const merged = mergeUniqueVirtualTableRows([newData, current], idKey, order, orderBy)
              const clipped = merged.length > maxDataLength
              if (clipped) {
                slidingClippedRef.current = true
                if (prevTopId) recoverTopIdRef.current = Math.max(recoverTopIdRef.current, Number(prevTopId))
              }
              const arr = clipSlidingData(merged, maxDataLength, 'tail')
              pendingScrollRef.current =
                clipped && oldLastId != null ? { arr, direction: 'bottom', oldEdgeId: Number(oldLastId) } : null
              return arr
            }, order)
            setTotal(rsp.Total)
            return
          }
          setData((current) => [...current, ...newData])
          if (['desc', 'none'].includes(query.Pagination.Order)) {
            minIdRef.current = newData[newData.length - 1][responseKey.id]
          } else {
            // 升序
            maxIdRef.current = newData[newData.length - 1][responseKey.id]
          }
        } else if (type === 'offset') {
          if (newData.length <= 0) {
            // 没有数据
            isServerPushActive() && setIsLoop(false)
            return
          }
          if (isSliding && slidingClippedRef.current) return
          const newOffsetData = isSliding
            ? mergeUniqueVirtualTableRows(
                [newData, getOffsetData()],
                idKey,
                query.Pagination.Order,
                query.Pagination.OrderBy || idKey,
              )
            : newData.concat(getOffsetData())
          // 倒序：maxId 跟着缓冲最新一条走，下次 offset 从这里续，触顶可直接拼回表格。
          // 升序：maxId 必须停在当前窗口最后一行，触底仍按窗口 AfterId 加载。
          if (['desc', 'none'].includes(sortRef.current.order)) {
            maxIdRef.current = Number(newOffsetData[0][responseKey.id])
          }
          setOffsetData(newOffsetData)
        } else {
          if (newData.length <= 0) {
            // 没有数据
            isServerPushActive() && setIsLoop(false)
          }
          if (typeof finalParams.endLoop === 'boolean' && isAllowSetEndLoopRef.current) {
            finalParams.endLoop ? startT() : stopT()
            isAllowSetEndLoopRef.current = false
          }
          setIsRefresh((current) => !current)
          setPagination(rsp.Pagination)
          if (isSliding) {
            const keep = query.Pagination.Order === 'asc' ? 'tail' : 'head'
            const uniqueData = mergeUniqueVirtualTableRows([newData], idKey, query.Pagination.Order, '')
            markSlidingClip(uniqueData.length)
            commitSlidingData(clipSlidingData(uniqueData, maxDataLength, keep), query.Pagination.Order)
          } else {
            setData([...newData])
            if (['desc', 'none'].includes(query.Pagination.Order)) {
              maxIdRef.current = newData.length > 0 ? newData[0][responseKey.id] : 0
              minIdRef.current = newData.length > 0 ? newData[newData.length - 1][responseKey.id] : 0
            } else {
              maxIdRef.current = newData.length > 0 ? newData[newData.length - 1][responseKey.id] : 0
              minIdRef.current = newData.length > 0 ? newData[0][responseKey.id] : 0
            }
          }
        }
        setTotal(rsp.Total)
      })
      .catch((e: any) => {
        if (requestEpoch !== queryEpochRef.current) return
        if (idRef.current) {
          clearInterval(idRef.current)
        }
        yakitNotify('error', `query code scan failed: ${e}`)
      })
      .finally(() => {
        if (requestEpoch !== queryEpochRef.current) return
        const releaseDelay = notificationRefreshPendingRef.current ? 0 : 100
        setTimeout(() => {
          if (requestEpoch !== queryEpochRef.current) return
          setLoading(false)
          isGrpcRef.current = false
          flushViewportReconcileRef.current()
          flushNotificationRefreshRef.current()
        }, releaseDelay)
      })
  })

  // 偏移量更新顶部数据
  const updateTopData = useMemoizedFn(() => {
    // 倒序的时候有储存的偏移量 则直接使用
    if (getOffsetData().length && ['desc', 'none'].includes(sortRef.current.order)) {
      if (isSliding && slidingClippedRef.current) {
        setOffsetData([])
      } else if (isSliding) {
        const buffered = getOffsetData()
        commitSlidingData((current) => {
          const merged = mergeUniqueVirtualTableRows(
            [buffered, current],
            idKey,
            sortRef.current.order,
            sortRef.current.orderBy || idKey,
          )
          if (merged.length > maxDataLength) slidingClippedRef.current = true
          return clipSlidingData(merged, maxDataLength, 'head')
        }, sortRef.current.order)
        setOffsetData([])
        return
      } else {
        setData([...getOffsetData(), ...data])
        setOffsetData([])
        return
      }
    }
    if (isSliding) {
      const edgePagination = buildEdgePagination('top', data, idKey, sortRef.current, pagination.Limit)
      if (!edgePagination) {
        updateData()
        return
      }
      getDataByGrpc({ ...params, Pagination: edgePagination, Filter: { ...params.Filter } }, 'top')
      return
    }
    // 如无偏移 则直接请求数据
    if (maxIdRef.current === 0) {
      updateData()
      return
    }
    const paginationProps = {
      Page: 1,
      Limit: pagination.Limit,
      Order: sortRef.current.order,
      OrderBy: sortRef.current.orderBy || 'Id',
    }

    const query: ParamsTProps = {
      ...params,
      Pagination: { ...paginationProps, AfterId: maxIdRef.current },
      Filter: { ...params.Filter },
    }
    getDataByGrpc(query, 'top')
  })

  // 偏移量更新底部数据
  const updateBottomData = useMemoizedFn((limit = pagination.Limit) => {
    if (isSliding) {
      const edgePagination = buildEdgePagination('bottom', data, idKey, sortRef.current, limit)
      if (!edgePagination) {
        updateData()
        return
      }
      getDataByGrpc({ ...params, Pagination: edgePagination, Filter: { ...params.Filter } }, 'bottom')
      return
    }
    // 如无偏移 则直接请求数据
    if (minIdRef.current === 0) {
      updateData()
      return
    }
    const paginationProps = {
      Page: 1,
      Limit: limit,
      Order: sortRef.current.order,
      OrderBy: sortRef.current.orderBy || 'Id',
    }

    const query: ParamsTProps = {
      ...params,
      Pagination: {
        ...paginationProps,
        BeforeId: ['desc', 'none'].includes(paginationProps.Order) ? minIdRef.current : undefined,
        AfterId: ['desc', 'none'].includes(paginationProps.Order) ? undefined : maxIdRef.current,
      },
      Filter: {
        ...params.Filter,
      },
    }
    getDataByGrpc(query, 'bottom')
  })

  // 根据页面大小动态计算需要获取的最新数据条数(初始请求)
  const updateData = useMemoizedFn((showLoading = true, reason: VirtualTableRefreshReason = 'manual') => {
    if (!inViewport) return
    if (boxHeightRef.current) {
      onFirst?.(reason)
      setOffsetData([])
      if (showLoading) setLoading(true)
      maxIdRef.current = 0
      minIdRef.current = 0
      if (isSliding) {
        recoverTopIdRef.current = 0
        slidingClippedRef.current = false
      }
      const limitCount: number = params.Pagination?.FixedLimit || Math.ceil(boxHeightRef.current / ROW_HEIGHT)
      const paginationProps = {
        Page: 1,
        Limit: limitCount,
        Order: sortRef.current.order,
        OrderBy: sortRef.current.orderBy || 'Id',
      }
      const query = {
        ...params,
        Pagination: { ...paginationProps },
      }
      getDataByGrpc(query, 'update')
    } else {
      // MITM waits for the push handshake; the viewport sampler enables the
      // one-second fallback if push is still unavailable.
      if (!loopPausedRef.current && !preferServerPush) setIsLoop(true)
    }
  })

  // 滚轮处于中间时 监听是否有数据更新
  const updateOffsetData = useMemoizedFn(() => {
    const paginationProps = {
      Page: 1,
      Limit: OFFSET_STEP,
      Order: 'desc',
      OrderBy: 'Id',
    }
    const query = {
      ...params,
      Filter: { ...params.Filter },
      Pagination: { ...paginationProps, AfterId: maxIdRef.current },
    }
    getDataByGrpc(query, 'offset')
  })

  const scrollUpdate = useMemoizedFn(() => {
    if (loopPausedRef.current) return
    if (isGrpcRef.current) return
    const scrollTop = tableRef.current?.containerRef?.scrollTop
    const clientHeight = tableRef.current?.containerRef?.clientHeight
    const scrollHeight = tableRef.current?.containerRef?.scrollHeight
    // let scrollBottom: number|undefined = undefined
    // Compatibility polling and push-triggered reconciliation are background
    // work. An empty table must not flash its full loading mask every second.
    if (data.length === 0) {
      updateData(false)
      return
    }

    const isDesc = ['desc', 'none'].includes(sortRef.current.order)
    // 升序且内容撑不满：没有滚动条，视为已停在新数据插入边，向底部补数
    if (shouldLoadVirtualTableAscBottomOnViewportFit(sortRef.current.order, scrollTop, clientHeight, scrollHeight)) {
      updateBottomData()
      setOffsetData([])
    }
    // 滚动条接近触顶
    else if (scrollTop < 10) {
      updateTopData()
      // 倒序触顶会消费 offsetData；升序新数据在底部，红点提示应保留
      if (isDesc) setOffsetData([])
    }
    // 滚动条接近触底
    else if (shouldLoadVirtualTableBottom(scrollTop, clientHeight, scrollHeight, isSliding, ROW_HEIGHT)) {
      updateBottomData()
      setOffsetData([])
    }
    // 滚动条在中间
    // 倒序：AfterId=maxId 拉到的新行写入 offsetData，触顶时拼到表头。
    // 升序：同样写入 offsetData 只出红点；触底走 updateBottomData 按窗口最后一行加载后清掉。
    // 滑窗裁剪后窗口不再连续，再拉偏移会对不齐，所以不再请求。
    else if (!isSliding || !slidingClippedRef.current) {
      updateOffsetData()
    }
  })

  /** Restore a cached viewport without replacing its rows with the first page. */
  const restoreViewportT = useMemoizedFn(() => {
    if (!inViewport) return
    if (data.length === 0) {
      updateData(true, 'visibility')
      return
    }
    onFirst?.('visibility')
    scrollUpdate()
  })

  const flushNotificationRefresh = useMemoizedFn(() => {
    if (!notificationRefreshPendingRef.current || loopPausedRef.current || isGrpcRef.current || !inViewport) return
    notificationRefreshPendingRef.current = false
    scrollUpdate()
  })
  flushNotificationRefreshRef.current = flushNotificationRefresh

  /** Fill a viewport that grew while preserving its current rows and anchor. */
  const flushViewportReconcile = useMemoizedFn(() => {
    if (!viewportReconcilePendingRef.current || isGrpcRef.current || !inViewport) return
    viewportReconcilePendingRef.current = false

    if (data.length === 0) {
      updateData(false)
      return
    }

    const fillLimit = selectVirtualTableViewportFillLimit(data.length, total, boxHeightRef.current, ROW_HEIGHT)
    if (fillLimit > 0) updateBottomData(fillLimit)
  })
  flushViewportReconcileRef.current = flushViewportReconcile

  /** Coalesced immediate refresh for invalidation notifications. */
  const notifyT = useMemoizedFn(() => {
    loopPausedRef.current = false
    notificationRefreshPendingRef.current = true
    // Duplex push is the primary scheduler. Keep the interval only for
    // engines that have not negotiated server push, otherwise each push also
    // starts a duplicate one-second poller.
    if (!preferServerPush && !isServerPushActive()) setIsLoop(true)
    flushNotificationRefresh()
  })

  // 滚动条监听
  useEffect(() => {
    let previousSnapshot: VirtualTableViewportSnapshot | undefined
    let id = setInterval(() => {
      const currentServerPushActive = isServerPushActive()
      if (currentServerPushActive) observedServerPushRef.current = true
      const currentSnapshot: VirtualTableViewportSnapshot = {
        scrollTop: tableRef.current?.containerRef?.scrollTop,
        clientHeight: tableRef.current?.containerRef?.clientHeight,
        scrollHeight: tableRef.current?.containerRef?.scrollHeight,
        serverPushActive: currentServerPushActive,
      }
      const action = selectVirtualTableAutoRefreshAction(previousSnapshot, currentSnapshot)
      previousSnapshot = currentSnapshot

      if (action === 'stop-poll' || action === 'refresh-once') {
        setIsLoop(false)
      }
      if (loopPausedRef.current) return
      if (action === 'start-poll') {
        setIsLoop(true)
      } else if (action === 'refresh-once') {
        notificationRefreshPendingRef.current = true
        flushNotificationRefreshRef.current()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (inViewport) {
      flushNotificationRefresh()
      if (isLoop) {
        if (idRef.current) {
          clearInterval(idRef.current)
        }
        idRef.current = setInterval(scrollUpdate, 1000)
      }
    }
    return () => clearInterval(idRef.current)
  }, [flushNotificationRefresh, inViewport, isLoop, scrollUpdate])

  useDebounceEffect(
    () => {
      if (!inViewport) return
      queryEpochRef.current += 1
      isGrpcRef.current = false
      const paramsChanged = lastAutomaticQueryParamsRef.current !== params
      const reason = selectVirtualTableAutomaticRefreshReason(
        hasQueriedViewportRef.current,
        previousQueryInViewportRef.current,
      )
      previousQueryInViewportRef.current = true
      hasQueriedViewportRef.current = true
      lastAutomaticQueryParamsRef.current = params
      if (shouldRestoreVirtualTableViewport(reason, data.length, paramsChanged)) {
        restoreViewportT()
        return
      }
      updateData(true, reason)
    },
    [params, inViewport],
    {
      wait: 200,
      leading: true,
    },
  )

  /** @name 重置查询条件刷新表格 */
  const refreshT = useMemoizedFn((newFilter?: FilterProps, newPagination?: VirtualPaging) => {
    queryEpochRef.current += 1
    isGrpcRef.current = false
    sortRef.current = createDefaultSort()
    setParams({
      Filter: {
        ...defaultParams.Filter,
        ...newFilter,
      },
      Pagination: {
        ...defaultParams.Pagination,
        ...newPagination,
      },
    })
  })

  /** @name 仅刷新新表格 */
  const noResetRefreshT = useMemoizedFn((reason: VirtualTableRefreshReason = 'manual') => {
    queryEpochRef.current += 1
    isGrpcRef.current = false
    updateData(true, reason)
  })

  /** @name 启动表格循环(用于后端通知前端更新时触发) */
  const startT = useMemoizedFn(() => {
    loopPausedRef.current = false
    setIsLoop(true)
  })
  /** @name 关闭表格循环 */
  const stopT = useMemoizedFn(() => {
    loopPausedRef.current = true
    notificationRefreshPendingRef.current = false
    setIsLoop(false)
    if (idRef.current) clearInterval(idRef.current)
  })

  /** @name 服务端推送触发的单次增量刷新（不重启轮询定时器） */
  const notifyPushUpdate = useMemoizedFn(() => {
    if (loopPausedRef.current || isGrpcRef.current || !inViewport) return
    scrollUpdate()
  })

  /**
   * Reconcile a larger viewport without replacing the current data window.
   * Keep the request pending when a filter/delete query is still in flight.
   */
  const reconcileViewportT = useMemoizedFn(() => {
    if (!inViewport) return
    viewportReconcilePendingRef.current = true
    flushViewportReconcile()
  })

  /** @name 设置表格loading状态 */
  const setTLoad = useMemoizedFn((is: boolean) => {
    setLoading(is)
  })

  /**
   * Establish a hard viewport boundary. Older async queries are ignored and
   * every cursor/cache/scroll value is cleared before the next bootstrap.
   */
  const resetTData = useMemoizedFn(() => {
    queryEpochRef.current += 1
    isGrpcRef.current = false
    notificationRefreshPendingRef.current = false
    viewportReconcilePendingRef.current = false
    recoverTopIdRef.current = 0
    pendingScrollRef.current = null
    slidingClippedRef.current = false
    maxIdRef.current = 0
    minIdRef.current = 0
    setOffsetData([])
    setData([])
    setTotal(0)
    setLoading(false)
    setPagination((current) => ({
      ...current,
      Page: 1,
      AfterId: undefined,
      BeforeId: undefined,
    }))
    setIsRefresh((current) => !current)
    const container = tableRef.current?.containerRef
    if (container) container.scrollTop = 0
  })

  /** @name 设置表格数据 */
  const setTData = useMemoizedFn((newData: DataT[]) => {
    const cloneData = cloneDeep(newData)
    setData(cloneData)
  })

  /** @name 浅更新表格数据（避免 cloneDeep 大量二进制字段） */
  const patchTData = useMemoizedFn((value: DataT[] | ((prev: DataT[]) => DataT[])) => {
    setData(value)
  })

  /**
   * Commit body-free newest rows from an ordered server stream. Returning
   * false asks the caller to recover through the normal query path.
   */
  const pushTData = useMemoizedFn((incoming: DataT[]): number | false => {
    if (!incoming.length) return 0
    const scrollTop = tableRef.current?.containerRef?.scrollTop
    const orderBy = String(sortRef.current.orderBy || idKey).toLowerCase()
    if (
      !inViewport ||
      isGrpcRef.current ||
      typeof scrollTop !== 'number' ||
      scrollTop >= 10 ||
      !['desc', 'none'].includes(sortRef.current.order) ||
      !['id', 'created_at'].includes(orderBy)
    ) {
      return false
    }

    const prepared = initResDataFun ? initResDataFun(incoming) : incoming
    const snapshot = data
    const acceptedRows = selectVirtualTableServerPushRows(snapshot, prepared, idKey)
    if (!acceptedRows.length) return 0
    if (getOffsetData().length) setOffsetData([])
    setData((current) => {
      const merged =
        current === snapshot
          ? prependAcceptedVirtualTableServerPushRows(current, acceptedRows, maxDataLength)
          : mergeVirtualTableServerPushRows(current, acceptedRows, idKey, maxDataLength)
      if (merged.clipped) slidingClippedRef.current = true
      syncSlidingEdgeIds(merged.data, sortRef.current.order, idKey, maxIdRef, minIdRef)
      return merged.data
    })
    return acceptedRows.length
  })

  /** @name 设置params */
  const setP = useMemoizedFn((newParams: ParamsTProps) => {
    queryEpochRef.current += 1
    isGrpcRef.current = false
    const data: ParamsTProps = {
      ...newParams,
      Pagination: {
        ...params.Pagination,
        ...newParams.Pagination,
      },
      Filter: {
        ...params.Filter,
        ...newParams.Filter,
      },
    }
    if (data.Pagination.Order) {
      sortRef.current.order = data.Pagination.Order as 'none' | 'asc' | 'desc'
    }
    if (data.Pagination.OrderBy) {
      sortRef.current.orderBy = data.Pagination.OrderBy
    }
    if (typeof newParams.startLoop === 'boolean') {
      newParams.startLoop ? startT() : stopT()
    }
    if (typeof newParams.endLoop === 'boolean') {
      isAllowSetEndLoopRef.current = true
    }
    setParams(data)
  })

  return [
    params,
    data,
    total,
    pagination,
    loading,
    offsetData,
    {
      startT,
      notifyT,
      stopT,
      refreshT,
      noResetRefreshT,
      restoreViewportT,
      notifyPushUpdate,
      reconcileViewportT,
      setTLoad,
      resetTData,
      setTData,
      patchTData,
      pushTData,
      setP,
    },
  ] as const
}
