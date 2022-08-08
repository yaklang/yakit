import React, {useEffect, useState, useRef, ReactNode, useMemo} from "react"
import ReactResizeDetector from "react-resize-detector"
import {useDebounceEffect, useMemoizedFn, useSize, useThrottleFn, useVirtualList} from "ahooks"
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
    defOverscan?: number
}

const classNameWidth = {
    2: "width-50",
    3: "width-33",
    4: "width-25",
    5: "width-20"
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
        defOverscan,
        numberRoll,
        isGridLayout,
        defCol
    } = props
    const [vlistHeigth, setVListHeight] = useState(600)
    const [col, setCol] = useState<number>()
    const containerRef = useRef<any>(null)
    const wrapperRef = useRef<any>(null)
    let indexMapRef = useRef<Map<string, number>>(new Map<string, number>())
    let preLength = useRef<number>(0)
    let preData = useRef<any>([])
    let originalList = useMemo(() => {
        if (!col) return []
        const listByLength: any[] = []
        const length = data.length
        const remainder = preLength.current % col
        if (remainder !== 0) {
            preLength.current = preLength.current - remainder
            const removeList = preData.current.pop()
            removeList.forEach((element) => {
                indexMapRef.current?.delete(`${element[rowKey || "Id"]}`)
            })
        }
        for (let index = preLength.current; index < length; index += col) {
            if (index % col === 0) {
                const arr: any = []
                for (let j = 0; j < col; j++) {
                    if (data[index + j]) {
                        const item = data[index + j]
                        indexMapRef.current?.set(`${item[rowKey || "Id"]}`, index + j)
                        arr.push(item)
                    }
                }
                listByLength.push(arr)
            }
        }
        preLength.current = length
        preData.current = preData.current.concat(listByLength)
        return preData.current
    }, [data.length, col])

    const [list, scrollTo] = useVirtualList(originalList, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: defItemHeight,
        overscan: defOverscan || 5
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
        resetPre()
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
            console.log("numberRoll", numberRoll)

            // 初次不执行
            scrollTo(numberRoll)
        }
    })
    const resetPre = useMemoizedFn(() => {
        preLength.current = 0
        preData.current = []
    })
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    useDebounceEffect(
        () => {
            resetPre()
            if (isGridLayout) {
                onComputeItemHeight()
            } else {
                setCol(defCol || 1)
            }
        },
        [isGridLayout, width],
        {wait: 200, leading: true}
    )
    const onComputeItemHeight = useMemoizedFn(() => {
        if (!width) return
        const computeCol = defCol || 1
        if (width <= 1024) {
            setCol(computeCol * 2)
        } else if (width >= 1024 && width < 1440) {
            setCol(computeCol * 3)
        } else if (width >= 1440 && width < 1920) {
            setCol(computeCol * 4)
        } else if (width >= 1920) {
            setCol(computeCol * 5)
        }
    })

    const onScrollCapture = useThrottleFn(
        () => {
            console.log(111)
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
    )
    // console.log('indexMapRef.current',indexMapRef.current);

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
                <div ref={wrapperRef}>
                    {((isGridLayout && col && col > 1) || (!isGridLayout && col === 1)) &&
                        list.map((i, index) => {
                            const itemArr = i.data as any
                            return (
                                <div
                                    className={`${isGridLayout && col && col > 1 && "display-flex"}`}
                                    key={itemArr.map((ele) => ele[rowKey || "Id"]).join("-")}
                                >
                                    {itemArr.map((ele, number) => (
                                        <div
                                            className={`${col && classNameWidth[col]} ${classNameRow}`}
                                            key={ele[rowKey || "Id"]}
                                        >
                                            {renderRow(ele, indexMapRef.current?.get(`${ele[rowKey || "Id"]}`) || 0)}
                                        </div>
                                    ))}
                                </div>
                            )
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
