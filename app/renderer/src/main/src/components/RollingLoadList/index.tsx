import React, {useEffect, useState, useRef, ReactNode, useMemo} from "react"
import ReactResizeDetector from "react-resize-detector"
import {
    useCreation,
    useDebounceEffect,
    useGetState,
    useMemoizedFn,
    useSize,
    useThrottleFn,
    useVirtualList
} from "ahooks"
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
    defItemHeight: number
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
        numberRoll,
        isGridLayout
    } = props
    const [vlistHeigth, setVListHeight] = useState(600)
    // const [itemHeight, setItemHeight] = useState<number>(defItemHeight)
    // const itemHeightRef = useRef<number>(defItemHeight)
    // const overScanRef = useRef<number>(10)
    const colRef = useRef<number>(1)
    const containerRef = useRef<any>(null)
    const wrapperRef = useRef<any>(null)
    // const originalList = useCreation(() => Array.from(Array(data.length/colRef.current).keys()), [data.length]);
    // useEffect(() => {
    //     console.log('data',data);

    //    console.log('originalList',originalList);
    // }, [originalList.length])
    const [list, scrollTo] = useVirtualList(data || [], {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        // itemHeight: itemHeightRef.current,
        overscan: 1 * colRef.current,
        itemHeight: defItemHeight / colRef.current
    })
    useDebounceEffect(
        () => {
            if (!containerRef || !wrapperRef) return
            // wrapperRef 中的数据没有铺满 containerRef,那么就要请求更多的数据
            const containerHeight = containerRef.current?.clientHeight
            const wrapperHeight = wrapperRef.current?.clientHeight
            if (wrapperHeight <= containerHeight) {
                loadMoreData()
            }
        },
        [wrapperRef.current?.clientHeight],
        {wait: 200}
    )
    useEffect(() => {
        scrollTo(0)
    }, [isRef])
    const isFirstNumberRoll = useRef(true) // 初次不执行
    useEffect(() => {
        onRollNumber()
    }, [numberRoll, colRef.current])
    const onRollNumber = useMemoizedFn(() => {
        if (isFirstNumberRoll.current) {
            isFirstNumberRoll.current = false
        } else {
            if (!numberRoll) return
            // 初次不执行
            scrollTo(numberRoll)
        }
    })
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    useEffect(() => {
        if (isGridLayout) {
            onComputeItemHeight()
        } else {
            colRef.current = 1
        }
    }, [isGridLayout, width])
    const onComputeItemHeight = useMemoizedFn(() => {
        if (!width) return
        const col = 1
        if (width <= 800) {
            colRef.current = col
        } else if (width > 800 && width < 1024) {
            colRef.current = col * 2
        } else if (width >= 1024 && width < 1440) {
            colRef.current = col * 3
        } else if (width >= 1440 && width < 1920) {
            colRef.current = col * 4
        } else if (width >= 1920) {
            colRef.current = col * 5
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
                // console.log(
                //     "contentScrollTop",
                //     // defItemHeight / colRef.current,
                //     Math.floor(contentScrollTop / defItemHeight) + 1
                // )
                if (scrollBottom <= 500) {
                    loadMoreData() // 获取数据的方法
                }
            }
        },
        {wait: 200, leading: false}
    )

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
                onScroll={() => onScrollCapture.run()}
            >
                <div ref={wrapperRef} className={`${isGridLayout ? "list-grid" : ""} `}>
                    {list.map((i) => {
                        return (
                            <div key={i.data[rowKey || "Id"]} className={classNameRow}>
                                {renderRow(i.data, i.index)}
                            </div>
                        )

                        // if (!isGridLayout || colRef.current === 1) {
                        //     return (
                        //         <div key={i.data[rowKey || "Id"]} className={classNameRow}>
                        //             {renderRow(i.data, i.index)}
                        //         </div>
                        //     )
                        // }

                        // if (colRef.current === 2) {
                        //     return (
                        //         i.index / 2 === 0 && (
                        //             <div style={{display: "flex"}}>
                        //                 <div
                        //                     key={i.data[rowKey || "Id"]}
                        //                     className={classNameRow}
                        //                 >
                        //                     {renderRow(data[i.index], i.index)}
                        //                 </div>
                        //                 <div
                        //                     key={i.data[rowKey || "Id"]}
                        //                     className={classNameRow}
                        //                 >
                        //                     {renderRow(data[i.index + 1], i.index + 1)}
                        //                 </div>
                        //             </div>
                        //         )
                        //     )
                        // }
                        // if (colRef.current === 3) {
                        //     return (
                        //         i.index / 3 === 0 && (
                        //             <div style={{display: "flex"}}>
                        //                 <div
                        //                     key={i.data[rowKey || "Id"]}
                        //                     className={classNameRow}
                        //                 >
                        //                     {renderRow(data[i.index], i.index)}
                        //                 </div>
                        //                 {data[i.index + 1] && (
                        //                     <div
                        //                         key={i.data[rowKey || "Id"]}
                        //                         className={classNameRow}
                        //                     >
                        //                         {renderRow(data[i.index + 1], i.index + 1)}
                        //                     </div>
                        //                 )}
                        //                 {data[i.index + 2] && (
                        //                     <div
                        //                         key={i.data[rowKey || "Id"]}
                        //                         className={classNameRow}
                        //                     >
                        //                         {renderRow(data[i.index + 2], i.index + 2)}
                        //                     </div>
                        //                 )}
                        //             </div>
                        //         )
                        //     )
                        // }
                    })}
                    {loading && hasMore && (
                        <div className='grid-block text-center'>
                            <LoadingOutlined />
                        </div>
                    )}
                    {!loading && !hasMore && (page || 0) > 0 && (
                        <div className='grid-block text-center'>暂无更多数据</div>
                    )}
                </div>
            </div>
        </>
    )
}
