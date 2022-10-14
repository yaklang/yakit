import React, {ReactNode, Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
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
import {
    ColumnsTypeProps,
    FiltersItemProps,
    scrollProps,
    SelectSearchProps,
    ShowFixedShadowProps,
    SortProps,
    TableVirtualResizeProps
} from "./TableVirtualResizeType"
import ReactResizeDetector from "react-resize-detector"
import style from "./TableVirtualResize.module.scss"
import {Button, Checkbox, Divider, Input, Popconfirm, Popover, Radio, RadioChangeEvent, Select, Spin} from "antd"
import {c} from "@/alibaba/ali-react-table-dist/dist/chunks/ali-react-table-pipeline-2201dfe0.esm"
import {LoadingOutlined} from "@ant-design/icons"
import {isEqual} from "@/utils/objUtils"
import "../style.css"
import {FilterIcon, SorterDownIcon, SorterUpIcon, StatusOfflineIcon} from "@/assets/newIcon"
import {RollingLoadList} from "../RollingLoadList/RollingLoadList"

const {Search} = Input
interface tablePosition {
    bottom?: number
    height?: number
    left: number
    right?: number
    top: number
    width?: number
    x?: number
    y?: number
}

interface ChildRef {
    tableRef: any
}

// export const TableVirtualResize = <T extends any>(props: TableVirtualResizeProps<T>) => {
//     return React.forwardRef<ChildRef, TableVirtualResizeProps<T>>((props, ref) => {
//         return <Table<T> {...props} />
//     })
// }

export const TableVirtualResize = React.forwardRef(<T extends any>(props: TableVirtualResizeProps<T>, ref) => {
    const defPagination = useCreation(
        () => ({
            page: 1,
            limit: 20,
            total: 0,
            onChange: () => {}
        }),
        []
    )
    const {
        data,
        rowSelection,
        renderKey,
        enableDrag,
        pagination = defPagination,
        title,
        extra,
        loading,
        scrollToBottom,
        currentRowData,
        isReset
    } = props
    const [currentRow, setCurrentRow] = useState<T>()
    const [width, setWidth] = useState<number>(0) //表格所在div宽度
    const [height, setHeight] = useState<number>(300) //表格所在div高度
    const [columns, setColumns] = useState<ColumnsTypeProps[]>(props.columns) // 表头
    const [lineLeft, setLineLeft] = useState<number>(0) // 拖拽线 left
    const [colWidth, setColWidth] = useState<number>(props.colWidth || 120) // 表头默认宽度
    const [tableWidth, setTableWidth] = useState<number>(0) // 表格所在div宽度  真实宽度
    const [lineIndex, setLineIndex] = useState<number>(-1) // 拖拽的columns index
    const [leftFixedWidth, setLeftFixedWidth] = useState<number>(0) // 固定左侧的宽度
    const [rightFixedWidth, setRightFixedWidth] = useState<number>(0) // 固定右侧的宽度
    const [scroll, setScroll] = useState<scrollProps>({
        scrollLeft: 0,
        scrollBottom: 0,
        scrollRight: 1
    }) // 滚动条距离边的距离
    const [boxShowHeight, setBoxShowHeight] = useState<number>(0) // 阴影高度
    const [showScrollY, setShowScrollY] = useState<boolean>(false) // 拖拽的columns index
    const [sort, setSort] = useState<SortProps>({
        order: "none",
        orderBy: ""
    }) // 拖拽的columns index
    const [isShowFixedShadow, setIsShowFixedShadow] = useState<ShowFixedShadowProps>({
        isShowLeftFixedShadow: false,
        isShowRightFixedShadow: false
    }) // 是否显示固定列的阴影
    const containerRef = useRef<any>(null)
    const wrapperRef = useRef<any>(null)
    const columnsRef = useRef(null)
    const tableRef = useRef<any>(null)
    const columnsMinWidthList = useRef<number[]>([]) // 默认表头最小宽度
    const lineStartX = useRef<number>(0) // 拖拽线开始位置
    const lineEndX = useRef<number>(0) // 拖拽线结束位置
    const tablePosition = useRef<tablePosition>({
        left: 0,
        top: 0
    }) // 表格距离左边的距离
    const [list, scrollTo] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 28,
        overscan: 5
    })

    useImperativeHandle(ref, () => ({
        ...(wrapperRef.current || {}),
        scrollTo
    }))
    // console.log("list", list)

    useEffect(() => {
        if (pagination.page == 1) {
            scrollTo(0)
        }
    }, [pagination])

    useEffect(() => {
        getColumnsMinWidthList()
        getTableWidthAndColWidth(0)
        setColumns([...props.columns])
    }, [props.columns])
    useDeepCompareEffect(() => {
        getLeftOrRightFixedWidth()
    }, [columns])
    useEffect(() => {
        if (tableRef.current.getBoundingClientRect()) {
            tablePosition.current = tableRef.current.getBoundingClientRect()
        }
    }, [tableRef.current])

    useEffect(() => {
        getColumnsMinWidthList()
    }, [columnsRef.current])
    useEffect(() => {
        if (!width) return
        getTableWidthAndColWidth(0)
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
            } else {
                setShowScrollY(true)
            }
            getTableWidthAndColWidth(0)
        },
        [wrapperRef.current?.clientHeight, containerRef.current?.clientHeight],
        {wait: 200, leading: true}
    )
    // 计算左右宽度以及固定列
    const getLeftOrRightFixedWidth = useMemoizedFn(() => {
        let leftWidth = 0
        let rightWidth = 0
        let isShowLeftFixedShadow = false
        let isShowRightFixedShadow = false
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
                isShowLeftFixedShadow = true
            }
            if (ele.fixed === "right") {
                rightWidth += ele.width || ele.minWidth || colWidth
                if (index > 0) {
                    const rightList = columns
                        .filter((e, i) => i > index && e.fixed === "right")
                        .map((ele) => ele.width || ele.minWidth || colWidth)
                    const right: number = rightList.length > 1 ? rightList.reduce((p, c) => p + c) : rightList[0] || 0
                    ele.right = right
                }
                isShowRightFixedShadow = true
            }
            newColumns.push(ele)
        })
        setIsShowFixedShadow({
            isShowLeftFixedShadow,
            isShowRightFixedShadow
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
                minWidths.push(item.clientWidth + 26) // 22:padding+border*2
            } else {
                minWidths.push(item.clientWidth + 25) // 21:padding+border
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
    const recalculatedTableWidth = useMemoizedFn((w: number, scrollBarWidth: number, lastColWidth?: boolean) => {
        const cLength = columns.length
        if (!colWidth || cLength <= 0) return

        const tWidth: number = columns.map((ele) => ele.width || ele.minWidth || colWidth).reduce((p, c) => p + c)

        if (tWidth < width - scrollBarWidth) {
            if (lastColWidth) {
                columns[cLength - 1].width =
                    (columns[cLength - 1].width || columns[cLength - 1].minWidth || w) + width - tWidth
            }
            setTableWidth(width - scrollBarWidth)
        } else {
            setTableWidth(tWidth)
        }
        getLeftOrRightFixedWidth()
    })
    const onChangeRadio = useMemoizedFn((e: RadioChangeEvent) => {})
    const onChangeCheckbox = useMemoizedFn((checked: boolean) => {
        if (!rowSelection) return
        if (!rowSelection.onSelectAll) return
        if (checked) {
            const keys = data.map((ele, index) => (renderKey ? ele[renderKey] : index))
            rowSelection.onSelectAll(keys, data, checked)
        } else {
            rowSelection.onSelectAll([], [], checked)
        }
    })
    const onChangeCheckboxSingle = useMemoizedFn((checked: boolean, key: string, row: T) => {
        if (!rowSelection) return
        if (!rowSelection.onChangeCheckboxSingle) return
        rowSelection.onChangeCheckboxSingle(checked, key, row)
    })

    const onMouseMoveLine = useMemoizedFn((e) => {
        if (!tablePosition.current.left) return
        if (lineIndex < 0) return
        if (!lineLeft) return
        const left = e.clientX - tablePosition.current.left
        const moveLeftX = lineStartX.current - e.clientX
        const changeWidth = (columns[lineIndex].width || colWidth) - moveLeftX
        if (changeWidth < (columns[lineIndex].minWidth || columnsMinWidthList.current[lineIndex])) {
            // 拖拽值最小宽度不在移动拖拽线
            return
        }
        setLineLeft(left)
    })
    const onMouseDown = useMemoizedFn((e, index: number) => {
        if (!tablePosition.current.left) return
        const left = e.clientX - tablePosition.current.left
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
        recalculatedTableWidth(colWidth, 0, true)
        setLineIndex(-1)
    })

    const onScrollContainerRef = useThrottleFn(
        (e) => {
            const dom = e?.target
            const scrollRight = dom.scrollWidth - dom.scrollLeft - dom.clientWidth
            const contentScrollTop = dom.scrollTop // 滚动条距离顶部
            const clientHeight = dom.clientHeight // 可视区域
            const scrollHeight = dom.scrollHeight // 滚动条内容的总高度
            const scrollBottom = scrollHeight - contentScrollTop - clientHeight
            setScroll({
                scrollBottom: scrollBottom,
                scrollLeft: dom.scrollLeft,
                scrollRight: scrollRight
            })
            if (wrapperRef && containerRef && pagination) {
                const hasMore = pagination.total == data.length
                if (scrollBottom <= (scrollToBottom || 300) && !hasMore) {
                    pagination.onChange(Number(pagination.page) + 1, pagination.limit)
                }
            }
        },
        {wait: 200}
    ).run

    useEffect(() => {
        if (currentRowData) {
            setCurrentRow(currentRowData)
        }
    }, [currentRowData])
    const onRowClick = useMemoizedFn((record: T) => {
        if (!currentRowData) {
            setCurrentRow(record)
        }
        if (props.onRowClick) props.onRowClick(record)
    })

    const onRowContextMenu = useMemoizedFn((record: T, e: React.MouseEvent) => {
        if (!currentRowData) {
            setCurrentRow(record)
        }
        onChangeCheckboxSingle(true, record[renderKey], record)
        if (props.onRowContextMenu) props.onRowContextMenu(record, e)
    })
    const [filters, setFilters] = useState<any>({})
    const [opensPopover, setOpensPopover] = useState<any>({})

    useEffect(() => {
        setFilters({})
        setSort({
            order: "none",
            orderBy: ""
        })
        scrollTo(0)
    }, [isReset])
    const onSorter = useMemoizedFn((s: SortProps) => {
        let newOrder: "none" | "asc" | "desc" = s.order
        if (sort.orderBy !== s.orderBy) {
            newOrder = "asc"
        } else if (s.order === "asc") {
            newOrder = "desc"
        } else if (s.order === "desc") {
            newOrder = "none"
        } else {
            newOrder = "asc"
        }
        sort.order = newOrder
        sort.orderBy = newOrder === "none" ? "" : s.orderBy
        setSort({...sort})
        if (props.onChange) props.onChange(pagination.page, pagination.limit, sort, filters)
    })

    const onSelectSearch = useMemoizedFn((valueSearch: string | string[], colKey: string) => {
        const newFilters = {
            ...filters,
            [colKey]: valueSearch
        }
        setFilters({...newFilters})
        if (props.onChange) props.onChange(pagination.page, pagination.limit, sort, newFilters)
    })

    const renderFilterPopover = (
        columnsItem: ColumnsTypeProps,
        filterKey: string,
        filtersType?: "select" | "input"
    ) => {
        switch (filtersType) {
            case "select":
                return renderSelect(columnsItem, filterKey)
            default:
                break
        }
    }

    // 选择搜索
    const renderSelect = (columnsItem: ColumnsTypeProps, filterKey: string) => {
        return (
            <div
                onMouseLeave={(e) => {
                    setOpensPopover({
                        ...opensPopover,
                        [columnsItem.dataKey]: false
                    })
                }}
            >
                <SelectSearch
                    filterProps={columnsItem?.filterProps}
                    originalList={columnsItem?.filterProps?.filters || []}
                    onSelect={(v) => onSelectSearch(v, filterKey)}
                    value={filters[filterKey]}
                />
            </div>
        )
    }

    const renderSort = useMemoizedFn((sorterKey: string) => (
        <div
            className={classNames(style["virtual-table-sorter"], {
                [style["virtual-table-sorter-active"]]:
                    sort.orderBy === sorterKey && (sort.order === "desc" || sort.order === "asc")
            })}
        >
            {sort.order === "desc" ? <SorterDownIcon /> : <SorterUpIcon />}
        </div>
    ))

    return (
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
            <div className={classNames(style["virtual-table-heard"])}>
                <div className={classNames(style["virtual-table-heard-left"])}>
                    {title && typeof title === "string" && (
                        <div className={classNames(style["virtual-table-heard-title"])}>{title}</div>
                    )}
                    {title && React.isValidElement(title) && title}
                    {pagination?.total && (
                        <div className={style["virtual-table-heard-right"]}>
                            <div className={style["virtual-table-heard-right-item"]}>
                                <span className={style["virtual-table-heard-right-text"]}>Total</span>
                                <span className={style["virtual-table-heard-right-number"]}>{pagination?.total}</span>
                            </div>
                            <Divider type='vertical' />
                            <div className={style["virtual-table-heard-right-item"]}>
                                <span className={style["virtual-table-heard-right-text"]}>Selected</span>
                                <span className={style["virtual-table-heard-right-number"]}>
                                    {rowSelection?.selectedRowKeys?.length}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                {extra && React.isValidElement(extra) && (
                    <div className={classNames(style["virtual-table-heard-right"])}>{extra}</div>
                )}
            </div>
            {(width === 0 && <Spin spinning={true} tip='加载中...'></Spin>) || (
                <div
                    className={classNames(style["virtual-table-body"], {
                        [style["virtual-table-border-bottom"]]: !showScrollY,
                        [style["virtual-table-border-left"]]:
                            scroll.scrollLeft > 0 && !isShowFixedShadow.isShowLeftFixedShadow,
                        [style["virtual-table-border-right"]]:
                            scroll.scrollRight > 0 && !isShowFixedShadow.isShowRightFixedShadow
                    })}
                    style={{maxHeight: ((title || extra) && "calc(100% - 42px)") || "100%"}}
                >
                    {enableDrag && lineIndex > -1 && (
                        <div
                            className={classNames(style["drag-line"])}
                            style={{left: lineLeft}}
                            onMouseUp={(e) => onMouseUp(e)}
                        />
                    )}
                    {isShowFixedShadow.isShowLeftFixedShadow && scroll.scrollLeft > 0 && (
                        <div
                            className={classNames(style["virtual-table-fixed-left"])}
                            style={{
                                left: leftFixedWidth - 5,
                                width: 5,
                                height: boxShowHeight,
                                maxHeight: scroll.scrollBottom < 25 ? height - 49 - 28 : height - 49
                            }}
                        ></div>
                    )}
                    {isShowFixedShadow.isShowRightFixedShadow && scroll.scrollRight > 0 && (
                        <div
                            className={classNames(style["virtual-table-fixed-right"])}
                            style={{
                                right: rightFixedWidth + 5,
                                width: 5,
                                height: boxShowHeight,
                                maxHeight: scroll.scrollBottom < 25 ? height - 49 - 28 : height - 49
                            }}
                        ></div>
                    )}
                    <div
                        ref={containerRef}
                        id='containerRef'
                        className={classNames(style["virtual-table-list-container"], {
                            [style["virtual-table-container-none-select"]]: lineIndex > -1,
                            [style["scroll-y"]]: !showScrollY
                        })}
                        // style={{minHeight: height - 38}}
                        onScroll={onScrollContainerRef}
                    >
                        <div
                            ref={columnsRef}
                            className={classNames(style["virtual-table-col"])}
                            style={{width: tableWidth || width}}
                        >
                            {columns.map((columnsItem, cIndex) => {
                                const filterKey = columnsItem?.filterProps?.filterKey || columnsItem.dataKey
                                const sorterKey = columnsItem?.sorterProps?.sorterKey || columnsItem.dataKey
                                return (
                                    <div
                                        key={`${columnsItem.dataKey}-title`}
                                        className={classNames(style["virtual-table-title"], {
                                            [style["virtual-table-row-left"]]: columnsItem.align === "left",
                                            [style["virtual-table-row-center"]]: columnsItem.align === "center",
                                            [style["virtual-table-row-right"]]: columnsItem.align === "right",
                                            [style["virtual-table-title-fixed-left"]]: columnsItem.fixed === "left",
                                            [style["virtual-table-title-fixed-left-border"]]:
                                                columnsItem.fixed === "left" && scroll.scrollLeft > 0,
                                            [style["virtual-table-title-fixed-right"]]: columnsItem.fixed === "right"
                                        })}
                                        style={{
                                            width: columnsItem.width || colWidth,
                                            minWidth: columnsItem.minWidth || columnsMinWidthList.current[cIndex],
                                            ...(columnsItem.fixed === "left" &&
                                                scroll.scrollLeft > 0 && {
                                                    left: columnsItem.left
                                                }),
                                            ...(columnsItem.fixed === "right" && {
                                                right: columnsItem.right
                                            })
                                        }}
                                    >
                                        {/* 这个不要用 module ，用来拖拽最小宽度*/}
                                        <div className='virtual-col-title'>
                                            {cIndex === 0 && rowSelection && (
                                                <span className={style["check"]}>
                                                    {rowSelection.type !== "radio" && (
                                                        <Checkbox
                                                            onChange={(e) => {
                                                                onChangeCheckbox(e.target.checked)
                                                            }}
                                                            checked={
                                                                data.length > 0 &&
                                                                rowSelection?.selectedRowKeys?.length === data.length
                                                            }
                                                        />
                                                    )}
                                                </span>
                                            )}
                                            <span>{columnsItem.title}</span>
                                        </div>
                                        <div className={style["virtual-table-title-icon"]}>
                                            {columnsItem.sorterProps?.sorter && (
                                                <>
                                                    {!sort.orderBy ? (
                                                        <Popconfirm
                                                            title='选择排序后,不会自动刷新最新数据,需自动刷新数据'
                                                            onConfirm={() =>
                                                                onSorter({
                                                                    orderBy: sorterKey,
                                                                    order: sort.order
                                                                })
                                                            }
                                                            okText='Yes'
                                                            cancelText='No'
                                                        >
                                                            {renderSort(sorterKey)}
                                                        </Popconfirm>
                                                    ) : (
                                                        <div
                                                            onClick={() =>
                                                                onSorter({
                                                                    orderBy: sorterKey,
                                                                    order: sort.order
                                                                })
                                                            }
                                                        >
                                                            {renderSort(sorterKey)}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {columnsItem?.filterProps && (
                                                <>
                                                    <Popover
                                                        placement='bottom'
                                                        trigger='click'
                                                        content={renderFilterPopover(
                                                            columnsItem,
                                                            filterKey,
                                                            columnsItem?.filterProps?.filtersType
                                                        )}
                                                        overlayClassName={style["search-popover"]}
                                                        visible={opensPopover[columnsItem.dataKey]}
                                                    >
                                                        <div
                                                            className={classNames(style["virtual-table-filter"], {
                                                                [style["virtual-table-filter-value"]]: columnsItem
                                                                    .filterProps.filterMultiple
                                                                    ? filters[filterKey] &&
                                                                      filters[filterKey].length > 0
                                                                    : filters[filterKey] &&
                                                                      filters[filterKey] !==
                                                                          (columnsItem.filterProps.filtersSelectAll
                                                                              ?.textAll || "all")
                                                            })}
                                                            onClick={() => {
                                                                setOpensPopover({
                                                                    ...opensPopover,
                                                                    [columnsItem.dataKey]:
                                                                        !opensPopover[columnsItem.dataKey]
                                                                })
                                                            }}
                                                        >
                                                            <FilterIcon />
                                                        </div>
                                                    </Popover>
                                                </>
                                            )}
                                        </div>
                                        {enableDrag && cIndex < columns.length - 1 && (
                                            <div
                                                className={classNames(style["virtual-table-title-drag"])}
                                                style={{height}}
                                                onMouseDown={(e) => onMouseDown(e, cIndex)}
                                            />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <div
                            ref={wrapperRef}
                            id='wrapperRef'
                            className={classNames(style["virtual-table-list"])}
                            style={{width: tableWidth || width}}
                        >
                            {list.map((item, number) => {
                                if (Object.prototype.toString.call(item.data) === "[object Object]") {
                                    return (
                                        <div
                                            className={classNames(style["virtual-table-row"], {
                                                [style["virtual-table-active-row"]]:
                                                    currentRow && currentRow[renderKey] === item.data[renderKey]
                                            })}
                                            onClick={(e) => {
                                                // @ts-ignore
                                                if (e.target.nodeName === "INPUT") return
                                                onRowClick(item.data)
                                            }}
                                            onContextMenu={(e) => {
                                                onRowContextMenu(item.data, e)
                                            }}
                                            key={item.data[renderKey] || number}
                                        >
                                            {columns.map((columnsItem, index) => (
                                                <div
                                                    key={`${columnsItem.dataKey}-row`}
                                                    className={classNames(
                                                        style["virtual-table-row-content"],
                                                        item.data["cellClassName"],
                                                        {
                                                            [style["virtual-table-row-ellipsis"]]:
                                                                columnsItem.ellipsis === false ? false : true,
                                                            [style["virtual-table-row-fixed-left"]]:
                                                                columnsItem.fixed === "left" && scroll.scrollLeft > 0,
                                                            [style["virtual-table-row-fixed-right"]]:
                                                                columnsItem.fixed === "right" && scroll.scrollRight > 0,
                                                            [style["virtual-table-row-center"]]:
                                                                columnsItem.align === "center",
                                                            [style["virtual-table-row-right"]]:
                                                                columnsItem.align === "right"
                                                        }
                                                    )}
                                                    style={{
                                                        width: columnsItem.width || colWidth,
                                                        minWidth:
                                                            columnsItem.minWidth || columnsMinWidthList.current[index],
                                                        ...(columnsItem.fixed === "left" &&
                                                            scroll.scrollLeft > 0 && {
                                                                left: columnsItem.left
                                                            }),
                                                        ...(columnsItem.fixed === "right" && {
                                                            right: columnsItem.right
                                                        })
                                                    }}
                                                >
                                                    {index === 0 && rowSelection && (
                                                        <span
                                                            className={classNames(style["check"], style["check-row"])}
                                                        >
                                                            {rowSelection.type !== "radio" && (
                                                                <Checkbox
                                                                    onChange={(e) => {
                                                                        onChangeCheckboxSingle(
                                                                            e.target.checked,
                                                                            renderKey ? item.data[renderKey] : number,
                                                                            item.data
                                                                        )
                                                                    }}
                                                                    checked={
                                                                        rowSelection?.selectedRowKeys?.findIndex(
                                                                            (ele) =>
                                                                                ele ===
                                                                                (renderKey
                                                                                    ? item.data[renderKey]
                                                                                    : number)
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
                                    )
                                }
                                return <></>
                            })}
                        </div>
                    </div>
                    <div
                        className={classNames(style["virtual-table-list-pagination"], {
                            [style["virtual-table-list-pagination-border-left"]]:
                                (scroll.scrollLeft > 0 && !isShowFixedShadow.isShowLeftFixedShadow) || !showScrollY
                        })}
                    >
                        {loading && !(pagination?.total == data.length) && (
                            <div className={classNames(style["pagination-loading"])}>
                                <LoadingOutlined />
                            </div>
                        )}
                        {!loading && pagination?.total == data.length && (pagination?.page || 0) > 0 && (
                            <div
                                className={classNames(style["pagination-text"], {
                                    [style["pagination-text-show"]]: scroll.scrollBottom < 32
                                })}
                            >
                                暂无更多数据
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
})

const SelectSearch: React.FC<SelectSearchProps> = (props) => {
    const {originalList, onSelect, value, filterProps} = props
    const {
        filtersSelectAll,
        filterMultiple,
        filterSearch,
        filterSearchInputProps = {},
        filterMultipleProps = {}
    } = filterProps || {}
    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    const scrollDomRef = useRef<any>(null)
    const [data, setData] = useState<FiltersItemProps[]>(originalList)
    useEffect(() => {
        setData(originalList)
    }, [originalList])
    useEffect(() => {
        // 新版UI组件之前的过度写法
        const selectDom = document.getElementsByClassName("select-small")[0]
        const scrollDom = selectDom?.firstChild?.firstChild
        if (!scrollDom) return
        scrollDomRef.current = scrollDom
    }, [])

    const [list] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 34,
        overscan: 10
    })

    const onSearch = useDebounceFn(
        useMemoizedFn((label: string) => {
            if (label) {
                const newData = originalList.filter((ele) => ele.label.includes(label))
                setData(newData)
            } else {
                setData(originalList)
            }
        }),
        {wait: 200}
    ).run

    const renderSingle = useMemoizedFn(() => {
        return (
            <div className={style["select-search-single"]}>
                {filterSearch && (
                    <div
                        className={classNames(style["select-search-input"], {
                            [style["select-search-input-icon"]]: filterSearchInputProps.isShowIcon === true
                        })}
                    >
                        <Search
                            onSearch={onSearch}
                            onChange={(e) => onSearch(e.target.value)}
                            {...filterSearchInputProps}
                        />
                    </div>
                )}
                {filtersSelectAll?.isAll && (
                    <div
                        className={classNames(style["select-item"], {})}
                        onClick={() =>
                            onSelect(filtersSelectAll.valueAll || "all", {
                                value: filtersSelectAll.valueAll || "all",
                                label: filtersSelectAll.textAll || "all"
                            })
                        }
                    >
                        {filtersSelectAll.textAll || "all"}
                    </div>
                )}
                <div ref={wrapperRef} id='wrapperRef'>
                    {list.map((item) => (
                        <div
                            key={item.data.value}
                            className={classNames(style["select-item"], {
                                [style["select-item-active"]]: value === item.data.value
                            })}
                            onClick={() => onSelect(item.data.value, item.data)}
                        >
                            {item.data.label}
                        </div>
                    ))}
                </div>
            </div>
        )
    })

    const onHandleScroll = useMemoizedFn(() => {
        scrollDomRef.current.scrollLeft = scrollDomRef.current.scrollWidth
    })

    const onChangeSelect = useDebounceFn(
        useMemoizedFn((values: string[], option: FiltersItemProps[]) => {
            onSelect(values, option)
            // 滑动至最右边
            onHandleScroll()
        }),
        {wait: 200}
    ).run
    const onSelectMultiple = useMemoizedFn((selectItem: FiltersItemProps) => {
        console.log("value", value)
        if (value) {
            if (!Array.isArray(value)) return
            const index = value.findIndex((ele) => ele === selectItem.value)
            if (index === -1) {
                onSelect([...value, selectItem.value], selectItem)
            } else {
                value.splice(index, 1)
                onSelect(value, selectItem)
            }
        } else {
            onSelect([selectItem.value], selectItem)
        }
        setTimeout(() => {
            onHandleScroll()
        }, 100)
    })

    const renderMultiple = useMemoizedFn(() => {
        return (
            <div className={style["select-search-multiple"]}>
                <div className={style["select-heard"]}>
                    <Select
                        size='small'
                        mode='tags'
                        style={{width: 150}}
                        onChange={onChangeSelect}
                        allowClear
                        value={Array.isArray(value) ? [...value] : []}
                        {...filterMultipleProps}
                        dropdownStyle={{height: 0, padding: 0}}
                        options={data}
                        className='select-small'
                        onFocus={() => onHandleScroll()}
                    />
                </div>
                <div ref={wrapperRef} id='wrapperRef'>
                    {list.map((item) => {
                        const checked = Array.isArray(value)
                            ? value?.findIndex((ele) => ele === item.data.value) !== -1
                            : false
                        return (
                            <div
                                key={item.data.value}
                                className={classNames(style["select-item"], {
                                    [style["select-item-active"]]: checked
                                })}
                                onClick={() => onSelectMultiple(item.data)}
                            >
                                <Checkbox checked={checked} />
                                <span className={style["select-item-text"]}>{item.data.label}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    })

    return (
        <div className={style["select-search"]} ref={containerRef}>
            {(filterMultiple && renderMultiple()) || renderSingle()}
        </div>
    )
}
