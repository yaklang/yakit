import classNames from "classnames"
import {ListSelectFilterPopoverProps, YakitVirtualListProps} from "./YakitVirtualListType"
import styles from "./YakitVirtualList.module.scss"
import {
    useControllableValue,
    useCreation,
    useDebounceEffect,
    useInfiniteScroll,
    useMemoizedFn,
    useThrottleFn,
    useVirtualList
} from "ahooks"
import {useRef, useState} from "react"
import ReactResizeDetector from "react-resize-detector"
import {LoadingOutlined} from "@ant-design/icons"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {
    YakitProtoCheckbox,
    YakitProtoCheckboxProps
} from "@/components/TableVirtualResize/YakitProtoCheckbox/YakitProtoCheckbox"
import React from "react"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {AuthorImg} from "@/pages/plugins/funcTemplate"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

export const YakitVirtualList = <T extends any>(props: YakitVirtualListProps<T>) => {
    const {className, columns, data, loading, hasMore = true, refresh, renderKey = "id", rowSelection} = props

    const [vlistHeigth, setVListHeight] = useState(600)
    const [scroll, setScroll] = useState<boolean>(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const [list] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 48,
        overscan: 5
    })

    useDebounceEffect(
        () => {
            if (!hasMore) return
            if (!containerRef || !wrapperRef) return
            // wrapperRef 中的数据没有铺满 containerRef,那么就要请求更多的数据
            const containerHeight = containerRef.current?.clientHeight || 0
            const wrapperHeight = wrapperRef.current?.clientHeight
            // console.log("wrapperHeight", wrapperHeight, containerHeight)
            if (wrapperHeight && wrapperHeight <= containerHeight) {
                getLoadMoreList()
                setScroll(false)
            } else {
                setScroll(true)
            }
        },
        [wrapperRef.current?.clientHeight, refresh, hasMore],
        {wait: 200}
    )

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
                    // console.log("dd")
                    // loadMoreData() // 获取数据的方法
                }
            }
        },
        {wait: 200, leading: false}
    ).run
    const getLoadMoreList = useMemoizedFn(() => {
        console.log("22")
    })
    const onChangeCheckboxSingle = useMemoizedFn((checked: boolean, key: string, row: T) => {
        if (!rowSelection) return
        if (!rowSelection.onChangeCheckboxSingle) return
        rowSelection.onChangeCheckboxSingle(checked, key, row)
    })
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
    const checkboxPropsMap = useCreation(() => {
        const map = new Map<React.Key, Partial<YakitProtoCheckboxProps>>()
        const {getCheckboxProps} = rowSelection || {}
        if (!!getCheckboxProps) {
            data.forEach((record, index) => {
                const key = record[renderKey]
                const checkboxProps = getCheckboxProps(record) || {}
                map.set(key, checkboxProps)
            })
        }
        return map
    }, [data, rowSelection?.getCheckboxProps])
    const isAll = useCreation(() => {
        return rowSelection?.isAll || (list.length > 0 && rowSelection?.selectedRowKeys?.length === data.length)
    }, [rowSelection?.isAll, list.length, data.length, rowSelection?.selectedRowKeys?.length])
    return (
        <div className={classNames(styles["virtual-list"], className)}>
            <div
                className={classNames(styles["virtual-list-columns"], {
                    [styles["virtual-list-columns-scroll"]]: scroll
                })}
            >
                {columns.map((columnsItem, columnsIndex) => {
                    return (
                        <div
                            key={columnsItem.dataIndex}
                            className={classNames(
                                styles["columns-item"],
                                {
                                    [styles["columns-item-flex"]]: !columnsItem.width
                                },
                                columnsItem.columnsClassName
                            )}
                            style={columnsItem?.width ? {width: columnsItem.width} : {}}
                        >
                            {columnsIndex === 0 && rowSelection && (
                                <YakitProtoCheckbox
                                    checked={isAll}
                                    indeterminate={!isAll && (rowSelection?.selectedRowKeys?.length || 0) > 0}
                                    onChange={(e) => {
                                        onChangeCheckbox(e.target.checked)
                                    }}
                                />
                            )}
                            {columnsItem.filterProps?.filterRender ? (
                                columnsItem.filterProps?.filterRender()
                            ) : (
                                <div className='content-ellipsis'>{columnsItem.title}</div>
                            )}
                        </div>
                    )
                })}
            </div>
            <div className={styles["virtual-list-content"]}>
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
                    ref={containerRef}
                    className={styles["virtual-list-container"]}
                    style={{height: vlistHeigth}}
                    onScroll={onScrollCapture}
                >
                    <div ref={wrapperRef} className={styles["virtual-list-wrapper"]}>
                        {list.map((ele) => (
                            <div className={styles["virtual-list-item"]} key={ele.data[renderKey] || ele.index}>
                                {columns.map((item, index) => {
                                    return (
                                        <div
                                            key={`${ele.index}-${item.title}`}
                                            style={item?.width ? {width: item.width} : {}}
                                            className={classNames(styles["virtual-list-cell"], {
                                                [styles["virtual-list-cell-flex"]]: !item.width
                                            })}
                                        >
                                            {index === 0 && rowSelection && (
                                                <YakitProtoCheckbox
                                                    onChange={(e) => {
                                                        onChangeCheckboxSingle(
                                                            e.target.checked,
                                                            renderKey ? ele.data[renderKey] : ele.index,
                                                            ele.data
                                                        )
                                                    }}
                                                    checked={
                                                        rowSelection?.selectedRowKeys?.findIndex(
                                                            (c) => c === (renderKey ? ele.data[renderKey] : ele.index)
                                                        ) !== -1
                                                    }
                                                    {...(checkboxPropsMap.get(ele.data[renderKey]) || {})}
                                                />
                                            )}
                                            {item?.render ? (
                                                item.render(ele.data[item.dataIndex], ele.data, ele.index)
                                            ) : (
                                                <div className='content-ellipsis'>{ele.data[item.dataIndex]}</div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                        {loading && hasMore && (
                            <div className={styles["text-center"]}>
                                <LoadingOutlined />
                            </div>
                        )}
                        {!loading && !hasMore && <div className={styles["no-more-text"]}>暂无更多数据</div>}
                    </div>
                </div>
            </div>
        </div>
    )
}

export const ListSelectFilterPopover: React.FC<ListSelectFilterPopoverProps> = React.memo((props) => {
    const {children, option = [], placement, filterOption, onSetValue} = props
    const [selectKeys, setSelectKeys] = useControllableValue<string[]>(props, {
        defaultValue: []
    })

    const [visible, setVisible] = useState<boolean>(false)

    const [data, setData] = useState<ListSelectFilterPopoverProps["option"]>(option)
    const [searchText, setSearchText] = useState<string>("")
    const containerRef = useRef<HTMLDivElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    useDebounceEffect(
        () => {
            if (!filterOption) return
            const newData = option.filter((optionItem) => {
                // 如果 filterOption 是函数，调用函数进行自定义过滤
                if (typeof filterOption === "function") {
                    return filterOption(searchText, optionItem)
                } else if (filterOption === true) {
                    if (typeof optionItem?.label === "string") {
                        return optionItem.label?.toUpperCase().indexOf(searchText.toUpperCase()) !== -1
                    }
                    return false
                }
                return true
            })
            setData(newData)
        },
        [searchText],
        {wait: 200, leading: true}
    )

    const [list] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 28,
        overscan: 5
    })

    const onSelect = useMemoizedFn((item) => {
        const checked = selectKeys.includes(item.value)
        onCheck(checked, item)
    })
    const onCheck = useMemoizedFn((checked, item) => {
        if (checked) {
            setSelectKeys((prev) => prev.filter((c) => c !== item.value))
        } else {
            setSelectKeys((v) => [...v, item.value])
        }
    })
    const onClear = useMemoizedFn(() => {
        setSelectKeys([])
    })
    const onSave = useMemoizedFn(() => {
        onSetValue(selectKeys)
        setVisible(false)
    })
    const onVisibleChange = useMemoizedFn((v) => {
        if (!v) {
            onSetValue(selectKeys)
        }
        setVisible(v)
    })
    return (
        <YakitPopover
            visible={visible}
            onVisibleChange={onVisibleChange}
            placement={placement || "bottomLeft"}
            content={
                <div className={styles["filter-popover-content"]}>
                    <div className={styles["search-wrapper"]}>
                        <YakitInput
                            placeholder='请输入关键词搜索'
                            prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                    {option.length > 0 && list.length === 0 && (
                        <YakitEmpty
                            image={SearchResultEmpty}
                            imageStyle={{margin: "24px auto 12px", width: 160}}
                            title='搜索结果“空”'
                        />
                    )}
                    {option.length === 0 && <YakitEmpty imageStyle={{margin: "24px auto 12px", width: 160}} />}
                    <div className={styles["option-list-content"]}>
                        {/* <ReactResizeDetector
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
                        /> */}
                        <div
                            ref={containerRef}
                            // style={{height: vlistHeigth}}
                            className={styles["option-list-container"]}
                        >
                            <div ref={wrapperRef} className={styles["option-list-wrapper"]}>
                                {list.map((ele, index) => {
                                    const item = ele.data
                                    const checked = selectKeys.includes(item.value)
                                    return (
                                        <div
                                            key={item.value}
                                            className={styles["option-item"]}
                                            onClick={() => onSelect(item)}
                                        >
                                            <YakitProtoCheckbox
                                                checked={checked}
                                                onChange={() => onCheck(checked, item)}
                                            />
                                            <div className={styles["item-label"]}>
                                                {item.heardImgSrc && <AuthorImg size='small' src={item.heardImgSrc} />}
                                                <span className='content-ellipsis'>{item.label}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    <div className={styles["option-list-footer"]}>
                        <YakitButton type='text' onClick={onClear}>
                            清空
                        </YakitButton>
                        <YakitButton type='primary' onClick={onSave}>
                            确定
                        </YakitButton>
                    </div>
                </div>
            }
            overlayClassName={styles["author-filter-popover"]}
        >
            {children}
        </YakitPopover>
    )
})
