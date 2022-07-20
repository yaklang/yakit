import React, {useEffect, useState, useRef, ReactNode} from "react"
import ReactResizeDetector from "react-resize-detector"
import {useThrottleFn, useVirtualList} from "ahooks"
import {LoadingOutlined} from "@ant-design/icons"
import "./index.scss"

interface RollingLoadListProps<T> {
    key?: string
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
    itemHeight?: number
    overscan?: number
}

// declare function List<T>({...rest}: RollingLoadListProps<T>)

export const RollingLoadList = <T extends any>(props: RollingLoadListProps<T>) => {
    const {
        data,
        loadMoreData,
        renderRow,
        page,
        hasMore,
        key = "Id",
        loading,
        isRef,
        classNameRow,
        classNameList,
        itemHeight = 113,
        overscan = 10
    } = props
    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    const [list, scrollTo] = useVirtualList(data || [], {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight,
        overscan
    })
    useEffect(() => {
        scrollTo(0)
    }, [isRef])
    const [vlistHeigth, setVListHeight] = useState(600)
    const onScrollCapture = useThrottleFn(
        () => {
            if (containerRef && !loading && hasMore) {
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
        {wait: 200}
    ).run()
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
            <div className={classNameList} style={{height: vlistHeigth}} ref={containerRef} onScroll={onScrollCapture}>
                <div ref={wrapperRef}>
                    {list.map((i) => (
                        <div key={i.data[key]} className={classNameRow}>
                            {renderRow(i.data, i.index)}
                        </div>
                    ))}
                    {!loading && hasMore && (
                        <div className='loading-center'>
                            <LoadingOutlined />
                        </div>
                    )}
                    {!hasMore && (page || 0) > 0 && <div className='no-more-text'>暂无更多数据</div>}
                </div>
            </div>
        </>
    )
}
