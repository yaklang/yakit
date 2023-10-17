import {memo, useEffect, useRef} from "react"
import {VirtualTableProps} from "./VirtualTableType"
import {useGetState, useMemoizedFn, useThrottleFn, useVirtualList} from "ahooks"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

import "../demoStyle.scss"

/** @name 自动加载的虚拟表格 */
export const DemoVirtualTable: <T>(props: VirtualTableProps<T>) => any = memo((p) => {
    const {isHideHeader = false, isTopLoadMore, isStop, triggerClear, wait = 1000, rowKey, loadMore, columns} = p

    const [loading, setLoading, getLoading] = useGetState<boolean>(false)
    const [data, setData, getData] = useGetState<any[]>([])

    const containerRef = useRef<HTMLDivElement>(null)
    const fetchListHeight = useMemoizedFn(() => {
        const {scrollTop, clientHeight, scrollHeight} = containerRef.current || {
            scrollTop: 0,
            clientHeight: 0,
            scrollHeight: 0
        }
        return {scrollTop, clientHeight, scrollHeight}
    })
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [list] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 40,
        overscan: 10
    })

    // 滚动条置底|置顶
    const onScrollY = useMemoizedFn((isBottom: boolean) => {
        if (isBottom) {
            if (containerRef && containerRef.current) {
                const {scrollHeight} = fetchListHeight()
                containerRef.current.scrollTop = scrollHeight
            }
        } else {
            if (containerRef && containerRef.current) {
                containerRef.current.scrollTop = 0
            }
        }
    })
    const fetchList = useMemoizedFn(() => {
        if (getLoading()) return

        setLoading(true)
        setTimeout(() => {
            onScrollY(!isTopLoadMore)
        }, 50)
        const info = !!isTopLoadMore ? data[0] : data[data.length - 1]
        loadMore(info)
            .then((res) => {
                const list = !!isTopLoadMore ? res.data.concat(getData()) : getData().concat(res.data)
                setData([...list])
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    if (!isBreakRef.current) onScrollY(!isTopLoadMore)
                    setLoading(false)
                }, 300)
            })
    })

    // 是否中断自动请求
    const isBreakRef = useRef<boolean>(false)

    const timeRef = useRef<any>(null)
    // 清除计时器
    const clearTime = useMemoizedFn(() => {
        if (timeRef.current) {
            clearInterval(timeRef.current)
            timeRef.current = null
        }
    })

    useEffect(() => {
        if (isStop) {
            clearTime()
            return
        }

        fetchList()

        clearTime()
        timeRef.current = setInterval(fetchList, wait)
    }, [isStop])

    // 清空数据
    useEffect(() => {
        setData([])
    }, [triggerClear])

    // 设置|取消定时器
    const setTime = useMemoizedFn((isSet: boolean) => {
        if (isSet) {
            if(isStop)return
            
            isBreakRef.current = false
            if (!!timeRef.current) return
            timeRef.current = setInterval(fetchList, wait)
        } else {
            clearTime()
            isBreakRef.current = true
        }
    })
    const onScrollCapture = useThrottleFn(
        () => {
            if (containerRef && containerRef.current) {
                const {scrollTop, clientHeight, scrollHeight} = fetchListHeight()

                if (!!isTopLoadMore) {
                    setTime(!(scrollTop > 40))
                } else {
                    const scrollBottom = scrollHeight - scrollTop - clientHeight
                    setTime(!(scrollBottom > 40))
                }
            }
        },
        {wait: 100, leading: false}
    )

    return (
        <div className='demo-virtual-table-wrapper'>
            {!isHideHeader && (
                <div className='list-header'>
                    {columns.map((item) => {
                        const {key, headerTitle, width} = item
                        return (
                            <div
                                key={key}
                                style={width ? {width: width} : {flex: 1}}
                                className='header-opt-wrapper yakit-single-line-ellipsis'
                            >
                                {headerTitle || key}
                            </div>
                        )
                    })}
                </div>
            )}

            <div className='list-body'>
                <div ref={containerRef} className='list-container' onScroll={() => onScrollCapture.run()}>
                    <div ref={wrapperRef}>
                        {!loading && data.length === 0 && <div className={"no-more-wrapper"}>暂无数据</div>}
                        {isTopLoadMore && loading && (
                            <div className='loading-wrapper'>
                                <YakitSpin className='loading-style' />
                            </div>
                        )}
                        {list.map((el) => {
                            const {data, index} = el
                            return (
                                <div key={data[rowKey] || index} className='row-wrapper'>
                                    {columns.map((item, i) => {
                                        const {key, colRender, width} = item
                                        return (
                                            <div
                                                key={`${data[rowKey]}-${i}`}
                                                style={width ? {width: width} : {flex: 1}}
                                                className='col-wrapper'
                                            >
                                                <div className='content-body yakit-single-line-ellipsis'>
                                                    {!!colRender ? colRender(data) : data[key]}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                        {!isTopLoadMore && loading && (
                            <div className='loading-wrapper'>
                                <YakitSpin className='loading-style' />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
})
