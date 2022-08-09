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
    defCol?: number
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
        isGridLayout,
        defCol = 1
    } = props
    const [vlistHeigth, setVListHeight] = useState(600)
    const [col, setCol] = useState<number>(defCol)
    const containerRef = useRef<any>(null)
    const wrapperRef = useRef<any>(null)
    const originalList = useCreation(() => {
        const listByLength: number[] = []
        data.forEach((ele, index) => {
            if (index % col === 0) {
                listByLength.push(index)
            }
        })
        return listByLength
    }, [data.length, col])
    useEffect(() => {
        console.log("defItemHeight", defItemHeight)
    }, [originalList.length])
    const [list, scrollTo] = useVirtualList(originalList, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: defItemHeight
        // overscan: 1 * col
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
    }, [numberRoll, col])
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
    useDebounceEffect(
        () => {
            if (isGridLayout) {
                onComputeItemHeight()
            } else {
                setCol(defCol)
            }
        },
        [isGridLayout, width],
        {wait: 200, leading: true}
    )
    const onComputeItemHeight = useMemoizedFn(() => {
        if (!width) return
        if (width <= 800) {
            setCol(defCol)
        } else if (width > 800 && width < 1024) {
            setCol(defCol * 2)
        } else if (width >= 1024 && width < 1440) {
            setCol(defCol * 3)
        } else if (width >= 1440 && width < 1920) {
            setCol(defCol * 4)
        } else if (width >= 1920) {
            setCol(defCol * 5)
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
                console.log(Math.floor(contentScrollTop / defItemHeight) + 1)
                console.log("clientHeight", wrapperRef.current.clientHeight)

                if (scrollBottom <= 500) {
                    loadMoreData() // 获取数据的方法
                }
            }
        },
        {wait: 200, leading: false}
    )
    const renderContent = useMemoizedFn((i) => {
        switch (col) {
            case 2:
                return renderItem2(i)
            case 3:
                return renderItem3(i)
            case 4:
                return renderItem4(i)
            case 5:
                return renderItem5(i)
            default:
                return renderDef(i)
        }
    })
    const renderItem2 = (i) =>
        data[i.data] && (
            <div className='display-flex' key={data[i.data][rowKey || "Id"]}>
                <div className={`width-50 ${classNameRow}`}>{renderRow(data[i.data], i.data)}</div>
                {data[i.data + 1] && (
                    <div className={`width-50 ${classNameRow}`}>{renderRow(data[i.data + 1], i.data + 1)}</div>
                )}
            </div>
        )
    const renderItem3 = (i) =>
        data[i.data] && (
            <div className='display-flex' style={{position: "relative"}} key={data[i.data][rowKey || "Id"]}>
                <div style={{position: "absolute", zIndex: 9, color: "red"}}>{i.index}</div>
                <div className={`width-33 ${classNameRow}`}>{renderRow(data[i.data], i.data)}</div>
                {data[i.data + 1] && (
                    <div className={`width-33 ${classNameRow}`}>{renderRow(data[i.data + 1], i.data + 1)}</div>
                )}
                {data[i.data + 2] && (
                    <div className={`width-33 ${classNameRow}`}>{renderRow(data[i.data + 2], i.data + 2)}</div>
                )}
            </div>
        )
    const renderItem4 = (i) =>
        data[i.data] && (
            <div className='display-flex' key={data[i.data][rowKey || "Id"]}>
                <div className={`width-25 ${classNameRow}`}>{renderRow(data[i.data], i.data)}</div>
                {data[i.data + 1] && (
                    <div className={`width-25 ${classNameRow}`}>{renderRow(data[i.data + 1], i.data + 1)}</div>
                )}
                {data[i.data + 2] && (
                    <div className={`width-25 ${classNameRow}`}>{renderRow(data[i.data + 2], i.data + 2)}</div>
                )}
                {data[i.data + 3] && (
                    <div className={`width-25 ${classNameRow}`}>{renderRow(data[i.data + 3], i.data + 3)}</div>
                )}
            </div>
        )
    const renderItem5 = (i) =>
        data[i.data] && (
            <div className='display-flex' key={data[i.data][rowKey || "Id"]}>
                <div className={`width-25 ${classNameRow}`}>{renderRow(data[i.data], i.data)}</div>
                {data[i.data + 1] && (
                    <div className={`width-25 ${classNameRow}`}>{renderRow(data[i.data + 1], i.data + 1)}</div>
                )}
                {data[i.data + 2] && (
                    <div className={`width-25 ${classNameRow}`}>{renderRow(data[i.data + 2], i.data + 2)}</div>
                )}
                {data[i.data + 3] && (
                    <div className={`width-25 ${classNameRow}`}>{renderRow(data[i.data + 3], i.data + 3)}</div>
                )}
                {data[i.data + 4] && (
                    <div className={`width-25 ${classNameRow}`}>{renderRow(data[i.data + 4], i.data + 4)}</div>
                )}
            </div>
        )
    const renderDef = (i) =>
        data[i.data] && (
            <div key={data[i.data][rowKey || "Id"]} className={classNameRow}>
                {renderRow(data[i.data], i.data)}
            </div>
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
            {/* container */}
            <div
                className={` ${classNameList}`}
                style={{height: vlistHeigth}}
                ref={containerRef}
                onScroll={() => onScrollCapture.run()}
            >
                <div ref={wrapperRef}>
                    {list.map((i) => {
                        return renderContent(i)
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
