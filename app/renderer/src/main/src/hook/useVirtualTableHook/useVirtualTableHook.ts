import {useEffect, useRef, useState} from "react"
import {
    ParamsTProps,
    useVirtualTableHookParams,
    DataResponseProps,
    VirtualPaging,
    DataTProps,
    FilterProps
} from "./useVirtualTableHookType"
import {useDebounceEffect, useGetState, useInViewport, useMemoizedFn} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {serverPushStatus} from "@/utils/duplex/duplex"
import {SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {yakitNotify} from "@/utils/notification"
import {genDefaultPagination} from "@/pages/invoker/schema"

const OFFSET_LIMIT = 30
const OFFSET_STEP = 100

const defSort: SortProps = {
    order: "desc",
    orderBy: "id"
}

// 倒序时需要额外处理传给后端顺序
export const verifyOrder = (pagination: VirtualPaging, AfterId?: number) => {
    // 是否将返回结果倒序
    let isReverse = false
    if (pagination.Order && ["desc", "none"].includes(pagination.Order) && AfterId) {
        pagination.Order = "asc"
        isReverse = true
    }
    return {pagination, isReverse}
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
export default function useVirtualTableHook<T extends ParamsTProps, DataT extends DataTProps>(
    props: useVirtualTableHookParams<T, DataT>
) {
    const {
        tableBoxRef,
        tableRef,
        boxHeightRef,
        grpcFun,
        defaultParams = {Pagination: genDefaultPagination(20), Filter: {}},
        onFirst,
        initResDataFun
    } = props

    const [params, setParams] = useState<ParamsTProps>(defaultParams)
    // 表格展示的完整数据
    const [data, setData] = useState<DataT[]>([])
    const [pagination, setPagination] = useState<VirtualPaging>({
        Limit: OFFSET_LIMIT,
        Order: "desc",
        OrderBy: "created_at",
        Page: 1
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
    const [isLoop, setIsLoop] = useState<boolean>(!serverPushStatus)
    // 表格排序
    const sortRef = useRef<SortProps>(defSort)
    const [loading, setLoading] = useState(false)
    const [offsetData, setOffsetData, getOffsetData] = useGetState<DataT[]>([])
    // 设置是否自动刷新
    const idRef = useRef<NodeJS.Timeout>()
    // 表格是否可见
    const [inViewport] = useInViewport(tableBoxRef)

    // 方法请求
    const getDataByGrpc = useMemoizedFn((query, type: "top" | "bottom" | "update" | "offset") => {
        if (isGrpcRef.current) return
        isGrpcRef.current = true
        const finalParams: ParamsTProps = {
            ...query
        }

        // 真正需要传给后端的查询数据
        const realQuery: ParamsTProps = cloneDeep(query)
        // 倒序时需要额外处理传给后端顺序
        const verifyResult = verifyOrder(realQuery.Pagination, realQuery.Pagination.AfterId)
        finalParams.Pagination = verifyResult.pagination
        // console.log("finalParams---", finalParams)

        grpcFun(finalParams)
            .then((rsp: DataResponseProps<DataT>) => {
                // console.log("rsp---", rsp)

                let newData: DataT[] = verifyResult.isReverse ? rsp.Data.reverse() : rsp.Data
                if (initResDataFun) {
                    newData = initResDataFun(newData)
                }

                if (type === "top") {
                    if (newData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                        return
                    }
                    if (["desc", "none"].includes(query.Pagination.Order)) {
                        setData([...newData, ...data])
                        maxIdRef.current = newData[0].Id
                    } else {
                        // 升序
                        if (rsp.Pagination.Limit - data.length >= 0) {
                            setData([...data, ...newData])
                            maxIdRef.current = newData[newData.length - 1].Id
                        }
                    }
                } else if (type === "bottom") {
                    if (newData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                        return
                    }
                    const arr = [...data, ...newData]
                    setData(arr)
                    if (["desc", "none"].includes(query.Pagination.Order)) {
                        minIdRef.current = newData[newData.length - 1].Id
                    } else {
                        // 升序
                        maxIdRef.current = newData[newData.length - 1].Id
                    }
                } else if (type === "offset") {
                    if (newData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                        return
                    }
                    if (["desc", "none"].includes(query.Pagination.Order)) {
                        const newOffsetData = newData.concat(getOffsetData())
                        maxIdRef.current = newOffsetData[0].Id
                        setOffsetData(newOffsetData)
                    }
                } else {
                    if (newData.length <= 0) {
                        // 没有数据
                        serverPushStatus && setIsLoop(false)
                    }
                    setIsRefresh(!isRefresh)
                    setPagination(rsp.Pagination)
                    setData([...newData])
                    if (["desc", "none"].includes(query.Pagination.Order)) {
                        maxIdRef.current = newData.length > 0 ? newData[0].Id : 0
                        minIdRef.current = newData.length > 0 ? newData[newData.length - 1].Id : 0
                    } else {
                        maxIdRef.current = newData.length > 0 ? newData[newData.length - 1].Id : 0
                        minIdRef.current = newData.length > 0 ? newData[0].Id : 0
                    }
                }
                setTotal(rsp.Total)
            })
            .catch((e: any) => {
                if (idRef.current) {
                    clearInterval(idRef.current)
                }
                yakitNotify("error", `query code scan failed: ${e}`)
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                    isGrpcRef.current = false
                }, 100)
            )
    })

    // 偏移量更新顶部数据
    const updateTopData = useMemoizedFn(() => {
        // 倒序的时候有储存的偏移量 则直接使用
        if (getOffsetData().length && ["desc", "none"].includes(sortRef.current.order)) {
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
            Page: 1,
            Limit: pagination.Limit,
            Order: sortRef.current.order,
            OrderBy: sortRef.current.orderBy || "id"
        }

        const query: ParamsTProps = {
            ...params,
            Pagination: {...paginationProps, AfterId: maxIdRef.current},
            Filter: {...params.Filter}
        }
        getDataByGrpc(query, "top")
    })

    // 偏移量更新底部数据
    const updateBottomData = useMemoizedFn(() => {
        // 如无偏移 则直接请求数据
        if (minIdRef.current === 0) {
            updateData()
            return
        }
        const paginationProps = {
            Page: 1,
            Limit: pagination.Limit,
            Order: sortRef.current.order,
            OrderBy: sortRef.current.orderBy || "id"
        }

        const query: ParamsTProps = {
            ...params,
            Pagination: {
                ...paginationProps,
                BeforeId: ["desc", "none"].includes(paginationProps.Order) ? minIdRef.current : undefined,
                AfterId: ["desc", "none"].includes(paginationProps.Order) ? undefined : maxIdRef.current
            },
            Filter: {
                ...params.Filter
            }
        }
        getDataByGrpc(query, "bottom")
    })

    // 根据页面大小动态计算需要获取的最新数据条数(初始请求)
    const updateData = useMemoizedFn(() => {
        if (boxHeightRef.current) {
            onFirst && onFirst()
            setOffsetData([])
            setLoading(true)
            maxIdRef.current = 0
            minIdRef.current = 0
            const limitCount: number = Math.ceil(boxHeightRef.current / 28)
            const paginationProps = {
                Page: 1,
                Limit: limitCount,
                Order: sortRef.current.order,
                OrderBy: sortRef.current.orderBy || "id"
            }
            const query = {
                ...params,
                Pagination: {...paginationProps}
            }
            getDataByGrpc(query, "update")
        } else {
            setIsLoop(true)
        }
    })

    // 滚轮处于中间时 监听是否有数据更新
    const updateOffsetData = useMemoizedFn(() => {
        const paginationProps = {
            Page: 1,
            Limit: OFFSET_STEP,
            Order: "desc",
            OrderBy: "id"
        }
        const query = {
            ...params,
            Filter: {...params.Filter},
            Pagination: {...paginationProps, AfterId: maxIdRef.current}
        }
        getDataByGrpc(query, "offset")
    })

    const scrollUpdate = useMemoizedFn(() => {
        if (isGrpcRef.current) return
        const scrollTop = tableRef.current?.containerRef?.scrollTop
        const clientHeight = tableRef.current?.containerRef?.clientHeight
        const scrollHeight = tableRef.current?.containerRef?.scrollHeight
        // let scrollBottom: number|undefined = undefined
        let scrollBottomPercent: number | undefined = undefined
        if (typeof scrollTop === "number" && typeof clientHeight === "number" && typeof scrollHeight === "number") {
            // scrollBottom = parseInt((scrollHeight - scrollTop - clientHeight).toFixed())
            scrollBottomPercent = Number(((scrollTop + clientHeight) / scrollHeight).toFixed(2))
        }

        // 滚动条接近触顶
        if (scrollTop < 10) {
            updateTopData()
            setOffsetData([])
        }
        // 滚动条接近触底
        else if (typeof scrollBottomPercent === "number" && scrollBottomPercent > 0.9) {
            updateBottomData()
            setOffsetData([])
        }
        // 滚动条在中间 增量
        else {
            if (data.length === 0) {
                updateData()
            } else {
                // 倒序的时候才需要掉接口拿偏移数据
                if (["desc", "none"].includes(sortRef.current.order)) {
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
                setIsLoop(true)
            }
            sTop = scrollTop
            cHeight = clientHeight
            sHeight = scrollHeight
        }, 1000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        if (inViewport) {
            scrollUpdate()
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
            leading: true
        }
    )

    /** @name 重置查询条件刷新表格 */
    const refreshT = useMemoizedFn((newFilter?: FilterProps, newPagination?: VirtualPaging) => {
        sortRef.current = defSort
        setParams({
            Filter: {
                ...defaultParams.Filter,
                ...newFilter
            },
            Pagination: {
                ...defaultParams.Pagination,
                ...newPagination
            }
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
        setIsLoop(true)
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
            Pagination: {
                ...params.Pagination,
                ...newParams.Pagination
            },
            Filter: {
                ...params.Filter,
                ...newParams.Filter
            }
        }
        if (data.Pagination.Order) {
            sortRef.current.order = data.Pagination.Order as "none" | "asc" | "desc"
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
        {startT, refreshT, noResetRefreshT, setTLoad, setTData, setP}
    ] as const
}
