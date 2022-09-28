import React, {ReactNode, Suspense, useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useDebounceFn, useMemoizedFn, useMouse, useSize, useVirtualList} from "ahooks"
import classNames from "classnames"
import {ColumnsTypeProps, TableVirtualResizeProps} from "./TableVirtualResizeType"
import ReactResizeDetector from "react-resize-detector"
import style from "./TableVirtualResize.module.scss"
import {Button, Checkbox, Radio, RadioChangeEvent, Spin} from "antd"
import {randomString} from "@/utils/randomUtil"
import {findDOMNode} from "react-dom"
import {warn} from "@/utils/notification"

export const TableVirtualResize = <T extends any>(props: TableVirtualResizeProps<T>) => {
    const defColWidth = useCreation(() => {
        return 120
    }, [])
    const {data, renderRow, rowSelection, renderKey, enableDrag} = props
    const [width, setWidth] = useState<number>(0) //表格所在div宽度
    const [height, setHeight] = useState<number>(0) //表格所在div高度
    const [columns, setColumns] = useState<ColumnsTypeProps[]>(props.columns) // 表头
    const [lineLeft, setLineLeft] = useState<number>(0) // 拖拽线 left
    const [colWidth, setColWidth] = useState<number>(props.colWidth || defColWidth) // 表头默认宽度
    const [tableWidth, setTableWidth] = useState<number>(0) // 表格所在div宽度  真实宽度
    const [lineIndex, setLineIndex] = useState<number>(-1) // 拖拽的columns index
    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    const columnsRef = useRef(null)
    const tableRef = useRef<any>(null)
    const columnsMinWidthList = useRef<number[]>([]) // 默认表头最小宽度
    const lineStartX = useRef<number>(0) // 拖拽线开始位置
    const lineEndX = useRef<number>(0) // 拖拽线结束位置
    const tableMouse = useMouse(tableRef.current) // 鼠标坐标
    const [list] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: (index: number, data: T) => {
            return 28
        },
        overscan: 5
    })
    useEffect(() => {
        // 可以拖拽的最小宽度
        if (columnsMinWidthList.current.length > 0) return
        const dom = document.querySelectorAll(".virtual-col-title")
        if (!dom) return
        const minWidths: number[] = []
        dom.forEach((item) => {
            minWidths.push(item.clientWidth + 21) // 21:padding+border
        })
        columnsMinWidthList.current = minWidths
    }, [columnsRef.current])
    useEffect(() => {
        if (!width || columns.length <= 0) return
        const w = Math.ceil(width / columns.length)
        setColWidth(w)
        recalculatedTableWidth(w)
    }, [width])
    // 推拽后重新计算表格宽度
    const recalculatedTableWidth = useMemoizedFn((w) => {
        if (!colWidth || columns.length <= 0) return
        const tWidth = columns
            .map((ele) => {
                if (ele.width || ele.minWidth) {
                    return ele.width || ele.minWidth
                } else {
                    return w
                }
            })
            .reduce((p, c) => p + c)
        if (tWidth < width) {
            columns[columns.length - 1].width =
                (columns[columns.length - 1].width || columns[columns.length - 1].minWidth || w) + width - tWidth
            setTableWidth(width)
        } else {
            setTableWidth(tWidth)
        }
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
        if (!tableMouse) return
        if (lineIndex < 0) return
        if (!lineLeft) return
        const left = e.clientX - tableMouse.elementPosX
        const moveLeftX = lineStartX.current - e.clientX
        const changeWidth = (columns[lineIndex].width || colWidth) - moveLeftX
        if (changeWidth < (columns[lineIndex].minWidth || columnsMinWidthList.current[lineIndex])) {
            // 拖拽值最小宽度不在移动拖拽线
            return
        }
        setLineLeft(left)
    })
    const onMouseDown = useMemoizedFn((e, index: number) => {
        if (!tableMouse) return
        const left = e.clientX - tableMouse.elementPosX
        lineStartX.current = e.clientX
        setLineLeft(left)
        setLineIndex(index)
    })

    const onMouseUp = useMemoizedFn((e) => {
        lineEndX.current = e.clientX
        if (!columns[lineIndex]) return
        if (lineStartX.current > lineEndX.current) {
            // 向左移动
            const moveLeftX = lineStartX.current - lineEndX.current
            const changeWidth = (columns[lineIndex].width || colWidth) - moveLeftX
            if (changeWidth < (columns[lineIndex].minWidth || columnsMinWidthList.current[lineIndex])) {
                columns[lineIndex].width = columns[lineIndex].minWidth || columnsMinWidthList.current[lineIndex]
            } else {
                columns[lineIndex].width = changeWidth
            }
        } else {
            // 向右移动
            const moveRightX = lineEndX.current - lineStartX.current
            columns[lineIndex].width = (columns[lineIndex].width || colWidth) + moveRightX
        }
        recalculatedTableWidth(colWidth)
        setLineIndex(-1)
    })
    return (
        <>
            <div className={classNames(style["virtual-table"])} ref={tableRef} onMouseMove={(e) => onMouseMoveLine(e)}>
                <ReactResizeDetector
                    onResize={(width, height) => {
                        if (!width || !height) {
                            return
                        }
                        setWidth(width)
                        setHeight(height)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                {(width === 0 && <Spin spinning={true} tip='加载中...'></Spin>) || (
                    <>
                        {lineIndex > -1 && (
                            <div
                                className={classNames(style["drag-line"])}
                                style={{height, left: lineLeft}}
                                onMouseUp={(e) => onMouseUp(e)}
                            />
                        )}
                        <div
                            ref={containerRef}
                            id='containerRef'
                            className={classNames(style["virtual-table-list-container"], {
                                [style["virtual-table-container-none-select"]]: lineIndex > -1
                            })}
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
                                            [style["virtual-table-row-right"]]: columnsItem.align === "right"
                                        })}
                                        style={{
                                            width: columnsItem.width || colWidth,
                                            minWidth: columnsItem.minWidth || columnsMinWidthList.current[cIndex]
                                        }}
                                    >
                                        {/* 这个不要用 module ，用来拖拽最小宽度*/}
                                        <div className='virtual-col-title'>
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
                                        {cIndex < columns.length - 1 && (
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
                                        className={classNames(style["virtual-table-list-item"])}
                                        style={{
                                            width: columnsItem.width || colWidth,
                                            minWidth: columnsItem.minWidth || columnsMinWidthList.current[index]
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
