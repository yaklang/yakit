import { useEffect, useRef, useState } from 'react'
import {
  ParamsTProps,
  useVirtualTableHookParams,
  DataResponseProps,
  VirtualPaging,
  DataTProps,
  FilterProps,
} from './useHttpVirtualTableHookType'
import { useDebounceEffect, useGetState, useInViewport, useMemoizedFn } from 'ahooks'
import cloneDeep from 'lodash/cloneDeep'
import { SortProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import { yakitNotify } from '@/utils/notification'
import { API } from '@/services/swagger/resposeType'

const OFFSET_LIMIT = 30
const OFFSET_STEP = 100

const defSort: SortProps = {
  order: 'desc',
  orderBy: 'id',
}

// 倒序时需要额外处理传给后端顺序
export const verifyOrder = (pagination: VirtualPaging) => {
  // 是否将返回结果倒序
  let isReverse = false
  if (pagination.order && ['desc', 'none'].includes(pagination.order) && pagination.after_id) {
    pagination.order = 'asc'
    isReverse = true
  }
  return { pagination, isReverse }
}

export const genDefaultPagination = (limit?: number, page?: number) => {
  return {
    limit: limit || 10,
    page: page || 1,
    order_by: 'id',
    order: 'desc',
  } as API.Pagination
}

/** @name 关于虚拟表格偏移量的上下加载与动态更新 */
export default function useHttpVirtualTableHook<
  T extends ParamsTProps,
  DataT extends DataTProps<IdKey>,
  DataKey extends string,
  IdKey extends string,
>(props: useVirtualTableHookParams<T, DataT, DataKey>) {
  const {
    tableBoxRef,
    tableRef,
    boxHeightRef,
    grpcFun,
    defaultParams = { ...genDefaultPagination(20) },
    onFirst,
    initResDataFun,
    responseKey = { data: 'data', id: 'id' },
  } = props

  const [params, setParams] = useState<ParamsTProps>(defaultParams)
  // 表格展示的完整数据
  const [data, setData] = useState<DataT[]>([])
  const [pagination, setPagination] = useState<VirtualPaging>({
    limit: OFFSET_LIMIT,
    order: 'desc',
    order_by: 'id',
    page: 1,
  })
  const [isRefresh, setIsRefresh] = useState<boolean>(false)
  // 最新一条数据ID
  const maxIdRef = useRef<number>(0)
  // 最后一条数据ID
  const minIdRef = useRef<number>(0)
  // 接口是否正在请求
  const isGrpcRef = useRef<boolean>(false)
  const [total, setTotal] = useState<number>(0)
  // 是否循环接口
  const [isLoop, setIsLoop] = useState<boolean>(false)
  // 表格排序
  const sortRef = useRef<SortProps>(defSort)
  const [loading, setLoading] = useState(false)
  const [offsetData, setOffsetData, getOffsetData] = useGetState<DataT[]>([])
  // 设置是否自动刷新
  const idRef = useRef<NodeJS.Timeout>()
  // stopT 后避免被内部逻辑(滚动/布局)再次开启轮询
  const loopPausedRef = useRef<boolean>(false)
  // 表格是否可见
  const [inViewport] = useInViewport(tableBoxRef)
  // 是否允许更改endLoop
  const isAllowSetEndLoopRef = useRef<boolean>(false)

  // 方法请求
  const getDataByGrpc = useMemoizedFn((query: ParamsTProps<{}>, type: 'top' | 'bottom' | 'update' | 'offset') => {
    if (isGrpcRef.current) return
    isGrpcRef.current = true
    let finalParams: ParamsTProps = {
      ...query,
    }

    // 真正需要传给后端的查询数据
    const realQuery: ParamsTProps = cloneDeep(query)
    // 倒序时需要额外处理传给后端顺序
    const verifyResult = verifyOrder(realQuery)
    finalParams = { ...finalParams, ...verifyResult.pagination }
    grpcFun(finalParams)
      .then((rsp: DataResponseProps<DataT, DataKey>) => {
        console.log('rsp', rsp)

        let newData: DataT[] = verifyResult.isReverse
          ? (rsp[responseKey.data] || []).reverse()
          : rsp[responseKey.data] || []
        if (initResDataFun) {
          newData = initResDataFun(newData)
        }

        if (type === 'top') {
          if (newData.length <= 0) {
            // 没有数据
            setIsLoop(false)
            return
          }
          if (['desc', 'none'].includes(query.order)) {
            setData([...newData, ...data])
            maxIdRef.current = newData[0][responseKey.id]
          } else {
            // 升序
            if (rsp.pagemeta.limit - data.length >= 0) {
              setData([...data, ...newData])
              maxIdRef.current = newData[newData.length - 1][responseKey.id]
            }
          }
        } else if (type === 'bottom') {
          if (newData.length <= 0) {
            // 没有数据
            setIsLoop(false)
            return
          }
          const arr = [...data, ...newData]
          setData(arr)
          if (['desc', 'none'].includes(query.order)) {
            minIdRef.current = newData[newData.length - 1][responseKey.id]
          } else {
            // 升序
            maxIdRef.current = newData[newData.length - 1][responseKey.id]
          }
        } else if (type === 'offset') {
          if (newData.length <= 0) {
            // 没有数据
            setIsLoop(false)
            return
          }
          if (['desc', 'none'].includes(query.order)) {
            const newOffsetData = newData.concat(getOffsetData())
            maxIdRef.current = newOffsetData[0][responseKey.id]
            setOffsetData(newOffsetData)
          }
        } else {
          if (newData.length <= 0) {
            // 没有数据
            setIsLoop(false)
          }
          if (typeof finalParams.endLoop === 'boolean' && isAllowSetEndLoopRef.current) {
            finalParams.endLoop ? startT() : stopT()
            isAllowSetEndLoopRef.current = false
          }
          setIsRefresh(!isRefresh)
          setPagination((old) => ({ ...old, ...{ limit: rsp.pagemeta.limit, page: rsp.pagemeta.page } }))
          setData([...newData])
          if (['desc', 'none'].includes(query.order)) {
            maxIdRef.current = newData.length > 0 ? newData[0][responseKey.id] : 0
            minIdRef.current = newData.length > 0 ? newData[newData.length - 1][responseKey.id] : 0
          } else {
            maxIdRef.current = newData.length > 0 ? newData[newData.length - 1][responseKey.id] : 0
            minIdRef.current = newData.length > 0 ? newData[0][responseKey.id] : 0
          }
        }
        setTotal(rsp.pagemeta.total)
      })
      .catch((e: any) => {
        if (idRef.current) {
          clearInterval(idRef.current)
        }
        yakitNotify('error', `query code scan failed: ${e}`)
      })
      .finally(() =>
        setTimeout(() => {
          setLoading(false)
          isGrpcRef.current = false
        }, 100),
      )
  })

  // 偏移量更新顶部数据
  const updateTopData = useMemoizedFn(() => {
    // 倒序的时候有储存的偏移量 则直接使用
    if (getOffsetData().length && ['desc', 'none'].includes(sortRef.current.order)) {
      setData([...getOffsetData(), ...data])
      setOffsetData([])
      return
    }
    // 如无偏移 则直接请求数据
    if (maxIdRef.current === 0) {
      updateData()
      return
    }
    const paginationProps = {
      page: 1,
      limit: pagination.limit,
      Order: sortRef.current.order,
      OrderBy: sortRef.current.orderBy || 'id',
    }

    const query: ParamsTProps = {
      ...params,
      ...paginationProps,
      after_id: maxIdRef.current,
    }
    getDataByGrpc(query, 'top')
  })

  // 偏移量更新底部数据
  const updateBottomData = useMemoizedFn(() => {
    // 如无偏移 则直接请求数据
    if (minIdRef.current === 0) {
      updateData()
      return
    }
    const paginationProps = {
      page: 1,
      limit: pagination.limit,
      Order: sortRef.current.order,
      OrderBy: sortRef.current.orderBy || 'id',
    }

    const query: ParamsTProps = {
      ...params,
      ...{
        ...paginationProps,
        before_id: ['desc', 'none'].includes(paginationProps.Order) ? minIdRef.current : undefined,
        after_id: ['desc', 'none'].includes(paginationProps.Order) ? undefined : maxIdRef.current,
      },
    }
    getDataByGrpc(query, 'bottom')
  })

  // 根据页面大小动态计算需要获取的最新数据条数(初始请求)
  const updateData = useMemoizedFn(() => {
    if (boxHeightRef.current) {
      onFirst && onFirst()
      setOffsetData([])
      setLoading(true)
      maxIdRef.current = 0
      minIdRef.current = 0
      const limitCount: number = params?.FixedLimit || Math.ceil(boxHeightRef.current / 28)
      const paginationProps = {
        page: 1,
        limit: limitCount,
        Order: sortRef.current.order,
        OrderBy: sortRef.current.orderBy || 'id',
      }
      const query = {
        ...params,
        ...paginationProps,
      }
      getDataByGrpc(query, 'update')
    } else {
      if (!loopPausedRef.current) setIsLoop(true)
    }
  })

  // 滚轮处于中间时 监听是否有数据更新
  const updateOffsetData = useMemoizedFn(() => {
    const paginationProps = {
      page: 1,
      limit: OFFSET_STEP,
      Order: 'desc',
      OrderBy: 'id',
    }
    const query = {
      ...params,
      ...paginationProps,
      after_id: maxIdRef.current,
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
    let scrollBottomPercent: number | undefined = undefined
    if (typeof scrollTop === 'number' && typeof clientHeight === 'number' && typeof scrollHeight === 'number') {
      // scrollBottom = parseInt((scrollHeight - scrollTop - clientHeight).toFixed())
      scrollBottomPercent = Number(((scrollTop + clientHeight) / scrollHeight).toFixed(2))
    }

    // 滚动条接近触顶
    if (scrollTop < 10) {
      updateTopData()
      setOffsetData([])
    }
    // 滚动条接近触底
    else if (typeof scrollBottomPercent === 'number' && scrollBottomPercent > 0.9) {
      updateBottomData()
      setOffsetData([])
    }
    // 滚动条在中间 增量
    else {
      if (data.length === 0) {
        updateData()
      } else {
        // 倒序的时候才需要掉接口拿偏移数据
        if (['desc', 'none'].includes(sortRef.current.order)) {
          updateOffsetData()
        }
      }
    }
  })

  // 滚动条监听
  useEffect(() => {
    let sTop, cHeight, sHeight
    let id = setInterval(() => {
      const scrollTop = tableRef.current?.containerRef?.scrollTop
      const clientHeight = tableRef.current?.containerRef?.clientHeight
      const scrollHeight = tableRef.current?.containerRef?.scrollHeight
      if (sTop !== scrollTop || cHeight !== clientHeight || sHeight !== scrollHeight) {
        if (!loopPausedRef.current) setIsLoop(true)
      }
      sTop = scrollTop
      cHeight = clientHeight
      sHeight = scrollHeight
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (inViewport) {
      // scrollUpdate()
      if (isLoop) {
        if (idRef.current) {
          clearInterval(idRef.current)
        }
        idRef.current = setInterval(scrollUpdate, 1000)
      }
    }
    return () => clearInterval(idRef.current)
  }, [inViewport, isLoop, scrollUpdate])

  useDebounceEffect(
    () => {
      isGrpcRef.current = false
      updateData()
    },
    [params],
    {
      wait: 200,
      leading: true,
    },
  )

  /** @name 重置查询条件刷新表格 */
  const refreshT = useMemoizedFn((newFilter?: FilterProps, newPagination?: VirtualPaging) => {
    sortRef.current = defSort
    setParams({
      ...defaultParams,
      ...newFilter,
      ...newPagination,
    })
    setTimeout(() => {
      isGrpcRef.current = false
      updateData()
    }, 100)
  })

  /** @name 仅刷新新表格 */
  const noResetRefreshT = useMemoizedFn(() => {
    isGrpcRef.current = false
    updateData()
  })

  /** @name 启动表格循环(用于后端通知前端更新时触发) */
  const startT = useMemoizedFn(() => {
    loopPausedRef.current = false
    setIsLoop(true)
  })
  /** @name 关闭表格循环 */
  const stopT = useMemoizedFn(() => {
    loopPausedRef.current = true
    setIsLoop(false)
    if (idRef.current) clearInterval(idRef.current)
  })

  /** @name 设置表格loading状态 */
  const setTLoad = useMemoizedFn((is: boolean) => {
    setLoading(is)
  })

  /** @name 设置表格数据 */
  const setTData = useMemoizedFn((newData: DataT[]) => {
    const cloneData = cloneDeep(newData)
    setData(cloneData)
  })

  /** @name 设置params */
  const setP = useMemoizedFn((newParams: ParamsTProps) => {
    const data: ParamsTProps = {
      ...params,
      ...newParams,
    }
    if (data.order) {
      sortRef.current.order = data.order as 'none' | 'asc' | 'desc'
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
    { startT, stopT, refreshT, noResetRefreshT, setTLoad, setTData, setP },
  ] as const
}
