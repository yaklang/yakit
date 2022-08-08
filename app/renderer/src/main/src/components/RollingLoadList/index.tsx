import React, {useEffect, useState, useRef, ReactNode} from "react"
import ReactResizeDetector from "react-resize-detector"
import {useCreation, useMemoizedFn, useSize, useThrottleFn, useVirtualList} from "ahooks"
import {LoadingOutlined} from "@ant-design/icons"
import "./index.scss"

interface RollingLoadListProps<T> {
    rowKey?: string
    data: T[]
    loadMoreData: () => void
    renderRow: (r: T, i: number) => ReactNode
    page: number
    hasMore: boolean
    loading: boolean
    scrollToNumber?: number
    isRef?: boolean
    classNameRow?: string
    classNameList?: string
    defItemHeight?: number
    overscan?: number
    numberRoll?: number
    isGridLayout?: boolean
}

export const RollingLoadList = <T extends any>(props: RollingLoadListProps<T>) => {
    const {
        data,
        loadMoreData,
        renderRow,
        page,
        hasMore,
        rowKey,
        loading,
        isRef,
        classNameRow,
        classNameList,
        defItemHeight,
        overscan,
        numberRoll,
        isGridLayout
    } = props
    const [vlistHeigth, setVListHeight] = useState(600)
    const [itemHeight, setItemHeight] = useState<number>(defItemHeight || 113)
    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    const [list, scrollTo] = useVirtualList(data || [], {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: itemHeight,
        overscan: overscan || 10
    })
    useEffect(() => {
        scrollTo(0)
    }, [isRef])
    const isFirstImplement = useRef(true) // 初次不执行
    useEffect(() => {
        if (isFirstImplement.current) {
            isFirstImplement.current = false
        } else {
            if (!numberRoll) return
            // 初次不执行
            scrollTo(numberRoll)
        }
    }, [numberRoll])
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    useEffect(() => {
        if (isGridLayout) {
            onComputeItemHeight()
        } else {
            setItemHeight(itemHeight)
        }
    }, [isGridLayout, width])

    const onComputeItemHeight = useMemoizedFn(() => {
        if (!width) return
        const height = defItemHeight || 113
        if (width <= 800) {
            setItemHeight(height)
        } else if (width > 800 && width < 1024) {
            setItemHeight(height / 2)
        } else if (width >= 1024 && width < 1440) {
            setItemHeight(height / 3)
        } else if (width >= 1440 && width < 1920) {
            setItemHeight(height / 4)
        } else if (width >= 1920) {
            setItemHeight(height / 5)
        }
    })

    const onScrollCapture = useThrottleFn(
        () => {
            if (wrapperRef && containerRef && !loading && hasMore) {
                const dom = containerRef.current || {
                    scrollTop: 0,
                    clientHeight: 0,
                    scrollHeight: 0
                }
                const contentScrollTop = dom.scrollTop //滚动条距离顶部
                const clientHeight = dom.clientHeight //可视区域
                const scrollHeight = dom.scrollHeight //滚动条内容的总高度
                const scrollBottom = scrollHeight - contentScrollTop - clientHeight
                if (scrollBottom <= 500) {
                    loadMoreData() // 获取数据的方法
                }
            }
        },
        {wait: 200, leading: false}
    ).run
    return (
        <>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!height) {
                        return
                    }
                    setVListHeight(height)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <div
                className={`container ${classNameList}`}
                style={{height: vlistHeigth}}
                ref={containerRef}
                onScroll={(e) => onScrollCapture(e)}
            >
                <div ref={wrapperRef} className={`${isGridLayout ? "list-grid" : ""} `}>
                    {list.map((i) => (
                        <div key={i.data[rowKey || "Id"]} className={classNameRow}>
                            {renderRow(i.data, i.index)}
                        </div>
                    ))}
                    <>
                        {loading && hasMore && (
                            <div className='grid-block text-center'>
                                <LoadingOutlined />
                            </div>
                        )}
                        {!loading && !hasMore && (page || 0) > 0 && (
                            <div className='grid-block text-center'>暂无更多数据</div>
                        )}
                    </>
                </div>
            </div>
        </>
    )
}
