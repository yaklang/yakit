import React, {ReactNode, Suspense, useEffect, useMemo, useRef, useState} from "react"
import {
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useDeepCompareEffect,
    useMemoizedFn,
    useMouse,
    useSize,
    useThrottleFn,
    useVirtualList
} from "ahooks"
import classNames from "classnames"
import {ColumnsTypeProps, TableVirtualResizeProps} from "./TableVirtualResizeType"
import ReactResizeDetector from "react-resize-detector"
import style from "./TableVirtualResize.module.scss"
import {Button, Checkbox, Radio, RadioChangeEvent, Spin} from "antd"
import {randomString} from "@/utils/randomUtil"
import {findDOMNode} from "react-dom"
import {warn} from "@/utils/notification"

export const TableVirtualResize = <T extends any>(props: TableVirtualResizeProps<T>) => {
    // const defColWidth = useCreation(() => {
    //     return 120
    // }, [])
    const {data, renderRow, rowSelection, renderKey, enableDrag} = props
    const [width, setWidth] = useState<number>(0) //表格所在div宽度
    const [height, setHeight] = useState<number>(300) //表格所在div高度
    const [columns, setColumns] = useState<ColumnsTypeProps[]>(props.columns) // 表头
    const [lineLeft, setLineLeft] = useState<number>(0) // 拖拽线 left
    const [colWidth, setColWidth] = useState<number>(props.colWidth || 120) // 表头默认宽度
    const [tableWidth, setTableWidth] = useState<number>(0) // 表格所在div宽度  真实宽度
    const [lineIndex, setLineIndex] = useState<number>(-1) // 拖拽的columns index
    const [leftFixedWidth, setLeftFixedWidth] = useState<number>(0) // 固定左侧的宽度
    const [rightFixedWidth, setRightFixedWidth] = useState<number>(0) // 固定右侧的宽度
    const [scrollLeft, setScrollLeft] = useState<number>(0) // 横向滚动条，滚动条距离左边的距离
    const [scrollRight, setScrollRight] = useState<number>(1) // 横向滚动条，滚动条距离左边的距离 
    const [boxShowHeight, setBoxShowHeight] = useState<number>(0) // 阴影高度
    const [showScrollY, setShowScrollY] = useState<boolean>(false) // 拖拽的columns index
    const containerRef = useRef<any>(null)
    const wrapperRef = useRef<any>(null)
    const columnsRef = useRef(null)
    const tableRef = useRef<any>(null)
    const columnsMinWidthList = useRef<number[]>([]) // 默认表头最小宽度
    const lineStartX = useRef<number>(0) // 拖拽线开始位置
    const lineEndX = useRef<number>(0) // 拖拽线结束位置
    const widthScrollY = useRef<number>(0) // 拖拽线结束位置
    const tableToLeft = useRef<number>(0) // 表格距离左边的距离
    const [list] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: (index: number, data: T) => {
            return 29
        },
        overscan: 5
    })

    useDeepCompareEffect(() => {
        // const index = props.columns.findIndex((w) => w.width || w.minWidth)
        // if (index !== -1) {
        //     widthScrollY.current = 10
        // }
        getColumnsMinWidthList()
        getTableWidthAndColWidth(showScrollY ? widthScrollY.current : 0)
        setColumns(props.columns)
    }, [props.columns])
    useDeepCompareEffect(() => {
        getLeftOrRightFixedWidth()
    }, [columns])
    useEffect(() => {
        if (tableRef.current.getBoundingClientRect()) {
            tableToLeft.current = tableRef.current.getBoundingClientRect().left
        }
    }, [tableRef.current])

    useEffect(() => {
        getColumnsMinWidthList()
    }, [columnsRef.current])
    useEffect(() => {
        if (!width) return
        getTableWidthAndColWidth(showScrollY ? widthScrollY.current : 0)
        getLeftOrRightFixedWidth()
    }, [width])
    useDebounceEffect(
        () => {
            if (!width) return
            if (!containerRef || !wrapperRef) return
            // wrapperRef 中的数据没有铺满 containerRef,那么就要请求更多的数据
            const containerHeight = containerRef.current?.clientHeight
            const wrapperHeight = wrapperRef.current?.clientHeight
            // 阴影高度
            setBoxShowHeight(wrapperHeight + 29)
            if (showScrollY) return // 显示滚动条了就不计算了
            if (containerHeight > wrapperHeight + 29) {
                // 不计算滚动条宽度
                getTableWidthAndColWidth(0)
            } else {
                // 计算滚动条
                getTableWidthAndColWidth(widthScrollY.current)
                setShowScrollY(true)
            }
        },
        [wrapperRef.current?.clientHeight, containerRef.current?.clientHeight],
        {wait: 200, leading: true}
    )
    // 计算左右宽度以及固定列
    const getLeftOrRightFixedWidth = useMemoizedFn(() => {
        let leftWidth = 0
        let rightWidth = 0
        const newColumns: ColumnsTypeProps[] = []
        columns.forEach((ele, index) => {
            if (ele.fixed === "left") {
                leftWidth += ele.width || ele.minWidth || colWidth
                if (index > 0) {
                    const leftList = columns
                        .filter((e, i) => i < index && e.fixed === "left")
                        .map((ele) => ele.width || ele.minWidth || colWidth)
                    const left: number = leftList.length > 1 ? leftList.reduce((p, c) => p + c) : leftList[0] || 0
                    ele.left = left
                }
            }
            if (ele.fixed === "right") {
                rightWidth += ele.width || ele.minWidth || colWidth
                if (index > 0) {
                    const rightList = columns
                        .filter((e, i) => i < index && e.fixed === "right")
                        .map((ele) => ele.width || ele.minWidth || colWidth)
                    const right: number = rightList.length > 1 ? rightList.reduce((p, c) => p + c) : rightList[0] || 0
                    ele.right = right
                }
            }
            newColumns.push(ele)
        })
        setColumns(newColumns)
        setLeftFixedWidth(leftWidth)
        setRightFixedWidth(rightWidth)
    })
    // 初始获取每列的拖拽最小宽度
    const getColumnsMinWidthList = useMemoizedFn(() => {
        if (columnsMinWidthList.current.length > 0) return
        // 可以拖拽的最小宽度
        const dom: NodeListOf<Element> = document.querySelectorAll(".virtual-col-title")
        if (!dom) return
        const minWidths: number[] = []
        dom.forEach((item: Element, index) => {
            if (index === 0) {
                minWidths.push(item.clientWidth + 22) // 22:padding+border*2
            } else {
                minWidths.push(item.clientWidth + 21) // 21:padding+border
            }
        })
        columnsMinWidthList.current = minWidths
    })
    // 初始化表格宽度和列宽度
    const getTableWidthAndColWidth = useMemoizedFn((scrollBarWidth: number) => {
        const cLength = props.columns.length
        if (!width || cLength <= 0) return
        let w = width / cLength
        const cw = w - scrollBarWidth / cLength
        setColWidth(cw) // 8滚动条宽度
        recalculatedTableWidth(cw, scrollBarWidth)
    })
    // 推拽后重新计算表格宽度
    const recalculatedTableWidth = useMemoizedFn((w: number, scrollBarWidth: number) => {
        const cLength = columns.length
        if (!colWidth || cLength <= 0) return

        const tWidth: number = columns.map((ele) => ele.width || ele.minWidth || colWidth).reduce((p, c) => p + c)

        if (tWidth < width - scrollBarWidth) {
            columns[cLength - 1].width =
                (columns[cLength - 1].width || columns[cLength - 1].minWidth || w) + width - tWidth
            setTableWidth(width - scrollBarWidth)
        } else {
            setTableWidth(tWidth)
        }
        getLeftOrRightFixedWidth()
    })
    const onChangeRadio = useMemoizedFn((e: RadioChangeEvent) => {})
    const onChangeCheckbox = useMemoizedFn((e: RadioChangeEvent) => {
        if (!rowSelection) return
        if (!rowSelection.onSelectAll) return
        const {checked} = e.target
        if (checked) {
            const keys = data.map((ele, index) => (renderKey ? ele[renderKey] : index))
            rowSelection.onSelectAll(keys, data)
        } else {
            rowSelection.onSelectAll([], [])
        }
    })
    const onChangeCheckboxSingle = useMemoizedFn((e: RadioChangeEvent, key: string) => {
        if (!rowSelection) return
        if (!rowSelection.onChange) return
        const {checked} = e.target
        const rows = data.find((ele, index) => (renderKey ? ele[renderKey] !== key : `${index}` !== key))
        rowSelection.onChange(checked, key, rows)
    })

    const onMouseMoveLine = useMemoizedFn((e) => {
        if (!tableToLeft.current) return
        if (lineIndex < 0) return
        if (!lineLeft) return
        const left = e.clientX - tableToLeft.current
        const moveLeftX = lineStartX.current - e.clientX
        const changeWidth = (columns[lineIndex].width || colWidth) - moveLeftX
        if (changeWidth < (columns[lineIndex].minWidth || columnsMinWidthList.current[lineIndex])) {
            // 拖拽值最小宽度不在移动拖拽线
            return
        }
        setLineLeft(left)
    })
    const onMouseDown = useMemoizedFn((e, index: number) => {
        if (!tableToLeft.current) return
        const left = e.clientX - tableToLeft.current
        lineStartX.current = e.clientX
        setLineLeft(left)
        setLineIndex(index)
    })

    const onMouseUp = useMemoizedFn((e) => {
        lineEndX.current = e.clientX
        if (!columns[lineIndex]) return
        const minWidth = columns[lineIndex].minWidth || columnsMinWidthList.current[lineIndex]
        const width = columns[lineIndex].width || colWidth
        if (lineStartX.current > lineEndX.current) {
            // 向左移动
            const moveLeftX = lineStartX.current - lineEndX.current
            const changeWidth = (minWidth > width ? minWidth : width) - moveLeftX
            if (changeWidth < minWidth) {
                columns[lineIndex].width = minWidth
            } else {
                columns[lineIndex].width = changeWidth
            }
        } else {
            // 向右移动
            const moveRightX = lineEndX.current - lineStartX.current
            if (lineIndex === columns.length - 2) {
                // 最后一条拖拽线,最后一个单元格
                const lastColumnsWidth = columns[columns.length - 1].width || colWidth
                const lastColumnsMinWidth =
                    columns[columns.length - 1].minWidth || columnsMinWidthList.current[columns.length - 1]
                columns[columns.length - 1].width =
                    lastColumnsMinWidth > lastColumnsWidth ? lastColumnsMinWidth : lastColumnsWidth - moveRightX
            }
            columns[lineIndex].width = minWidth > width ? minWidth : width + moveRightX
        }
        recalculatedTableWidth(colWidth, widthScrollY.current)
        setLineIndex(-1)
    })

    const onScrollContainerRef = useThrottleFn(
        (e) => {
            const dom = e?.target
            const scrollRight = dom.scrollWidth - dom.scrollLeft - dom.clientWidth
            setScrollLeft(dom.scrollLeft || 0)
            setScrollRight(scrollRight || 0)
        },
        {wait: 200}
    ).run
    // console.log("columns", columns)

    return (
        <>
            <div className={classNames(style["virtual-table"])} ref={tableRef} onMouseMove={(e) => onMouseMoveLine(e)}>
                <ReactResizeDetector
                    onResize={(w, h) => {
                        if (!w || !h) {
                            return
                        }
                        setWidth(w)
                        setHeight(h)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                {(width === 0 && <Spin spinning={true} tip='加载中...'></Spin>) || (
                    <>
                        {enableDrag && lineIndex > -1 && (
                            <div
                                className={classNames(style["drag-line"])}
                                style={{left: lineLeft}}
                                onMouseUp={(e) => onMouseUp(e)}
                            />
                        )}
                        {scrollLeft > 0 && (
                            <div
                                className={classNames(style["virtual-table-fixed-left"])}
                                style={{width: leftFixedWidth, height: boxShowHeight, maxHeight: height - 9}}
                            ></div>
                        )}
                        {scrollRight > 0 && (
                            <div
                                className={classNames(style["virtual-table-fixed-right"])}
                                style={{width: rightFixedWidth, height: boxShowHeight, maxHeight: height - 9}}
                            ></div>
                        )}
                        <div
                            ref={containerRef}
                            id='containerRef'
                            className={classNames(style["virtual-table-list-container"], {
                                [style["virtual-table-container-none-select"]]: lineIndex > -1,
                                [style["scroll-y"]]: !showScrollY
                            })}
                            // style={{minHeight: height + 2}}
                            style={{minHeight: !showScrollY ? height + 2 : height}}
                            onScroll={onScrollContainerRef}
                        >
                            <div
                                ref={columnsRef}
                                className={classNames(style["virtual-table-col"])}
                                style={{width: tableWidth || width}}
                            >
                                {columns.map((columnsItem, cIndex) => (
                                    <div
                                        key={`${columnsItem.dataKey}-title`}
                                        className={classNames(style["virtual-table-title"], {
                                            [style["virtual-table-row-left"]]: columnsItem.align === "left",
                                            [style["virtual-table-row-center"]]: columnsItem.align === "center",
                                            [style["virtual-table-row-right"]]: columnsItem.align === "right",
                                            [style["virtual-table-title-fixed-left"]]:
                                                columnsItem.fixed === "left" && scrollLeft > 0,
                                            [style["virtual-table-title-fixed-right"]]: columnsItem.fixed === "right"
                                        })}
                                        style={{
                                            width: columnsItem.width || colWidth,
                                            minWidth: columnsItem.minWidth || columnsMinWidthList.current[cIndex],
                                            ...(columnsItem.fixed === "left" &&
                                                scrollLeft > 0 && {
                                                    left: columnsItem.left
                                                })
                                        }}
                                    >
                                        {/* 这个不要用 module ，用来拖拽最小宽度*/}
                                        <div
                                            className={classNames(
                                                "virtual-col-title",
                                                style["virtual-col-title-content"]
                                            )}
                                        >
                                            {cIndex === 0 && rowSelection && (
                                                <span className={style["check"]}>
                                                    {rowSelection.type !== "radio" && (
                                                        <Checkbox
                                                            onChange={onChangeCheckbox}
                                                            checked={
                                                                data.length > 0 &&
                                                                rowSelection?.selectedRowKeys?.length === data.length
                                                            }
                                                        />
                                                    )}
                                                </span>
                                            )}
                                            {columnsItem.title}
                                        </div>
                                        {enableDrag && cIndex < columns.length - 1 && (
                                            <div
                                                className={classNames(style["virtual-table-title-drag"], {
                                                    [style["virtual-table-show-drag-line"]]: lineIndex > 0
                                                })}
                                                style={{height}}
                                                onMouseDown={(e) => onMouseDown(e, cIndex)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div
                                ref={wrapperRef}
                                id='wrapperRef'
                                className={classNames(style["virtual-table-list"])}
                                style={{width: tableWidth || width}}
                            >
                                {columns.map((columnsItem, index) => (
                                    <div
                                        key={`${columnsItem.dataKey}-row`}
                                        className={classNames(style["virtual-table-list-item"], {
                                            [style["virtual-table-row-fixed-left"]]:
                                                columnsItem.fixed === "left" && scrollLeft > 0,
                                            [style["virtual-table-row-fixed-right"]]: columnsItem.fixed === "right"
                                        })}
                                        style={{
                                            width: columnsItem.width || colWidth,
                                            minWidth: columnsItem.minWidth || columnsMinWidthList.current[index],
                                            ...(columnsItem.fixed === "left" &&
                                                scrollLeft > 0 && {
                                                    left: columnsItem.left
                                                }),
                                            ...(columnsItem.fixed === "right" && {
                                                right: columnsItem.right
                                            })
                                        }}
                                    >
                                        {list.map((item, number) => (
                                            <div
                                                className={classNames(style["virtual-table-row"], {
                                                    [style["virtual-table-row-ellipsis"]]:
                                                        columnsItem.ellipsis === false ? false : true,
                                                    [style["virtual-table-row-left"]]: columnsItem.align === "left",
                                                    [style["virtual-table-row-center"]]: columnsItem.align === "center",
                                                    [style["virtual-table-row-right"]]: columnsItem.align === "right"
                                                })}
                                                key={randomString(8)}
                                                title={item.data[columnsItem.dataKey]}
                                            >
                                                <div className={style["virtual-table-row-content"]}>
                                                    {columns.length > 0 &&
                                                        columnsItem.dataKey === columns[0].dataKey &&
                                                        rowSelection && (
                                                            <span className={style["check"]}>
                                                                {rowSelection.type === "radio" ? (
                                                                    <Radio />
                                                                ) : (
                                                                    <Checkbox
                                                                        onChange={(e) =>
                                                                            onChangeCheckboxSingle(
                                                                                e,
                                                                                renderKey ? item.data[renderKey] : index
                                                                            )
                                                                        }
                                                                        checked={
                                                                            rowSelection?.selectedRowKeys?.findIndex(
                                                                                (ele) =>
                                                                                    ele ===
                                                                                    (renderKey
                                                                                        ? item.data[renderKey]
                                                                                        : index)
                                                                            ) !== -1
                                                                        }
                                                                    />
                                                                )}
                                                            </span>
                                                        )}
                                                    {columnsItem.render
                                                        ? columnsItem.render(
                                                              item.data[columnsItem.dataKey],
                                                              item.data,
                                                              number
                                                          )
                                                        : item.data[columnsItem.dataKey] || "-"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}
