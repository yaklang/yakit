import React, {ReactNode, memo, useEffect, useMemo, useRef, useState} from "react"
import {useInViewport, useMemoizedFn, useSize, useThrottleFn, useVirtualList} from "ahooks"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {API} from "@/services/swagger/resposeType"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {PluginFilterParams, PluginSearchParams} from "@/pages/plugins/baseTemplateType"
import {AuthorIcon, AuthorImg, CodeScoreModule, FuncFilterPopover, FuncSearch} from "@/pages/plugins/funcTemplate"
import {TagShowOpt} from "@/pages/plugins/funcTemplateType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {Tooltip} from "antd"
import has from "lodash/has"
import {
    OutlineCalendarIcon,
    OutlineClouddownloadIcon,
    OutlineClouduploadIcon,
    OutlineDatabasebackupIcon,
    OutlineDotshorizontalIcon,
    OutlineExportIcon,
    OutlineLoadingIcon,
    OutlineLockclosedIcon,
    OutlineLockopenIcon,
    OutlinePencilaltIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineShareIcon,
    OutlineTerminalIcon,
    OutlineThumbupIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {pluginTypeToName} from "@/pages/plugins/builtInData"
import {PluginsGridCheckIcon} from "@/pages/plugins/icon"
import {onPluginTagsToName} from "@/pages/plugins/baseTemplate"
import {formatDate} from "@/utils/timeUtil"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {yakitNotify} from "@/utils/notification"
import {
    PluginStarsRequest,
    PluginsRecycleRequest,
    apiPluginStars,
    apiReductionRecyclePlugin,
    apiUpdatePluginPrivateMine
} from "@/pages/plugins/utils"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {useStore} from "@/store"
import {RollingLoadList, RollingLoadListProps} from "@/components/RollingLoadList/RollingLoadList"
import {YakEditor} from "@/utils/editors"
import {CheckboxChangeEvent} from "antd/lib/checkbox"
import {SolidClouduploadIcon, SolidThumbupIcon} from "@/assets/icon/solid"
import {YakScript} from "@/pages/invoker/schema"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {PluginUpload} from "@/pages/plugins/local/PluginLocalUpload"
import {setClipboardText} from "@/utils/clipboard"

import YakitLogo from "@/assets/yakitLogo.png"
import UnLogin from "@/assets/unLogin.png"
import classNames from "classnames"
import "../../plugins/plugins.scss"
import styles from "./PluginHubList.module.scss"

const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse

interface HubListFilterProps {
    wrapperClassName?: string
    /** 插件筛选条件数据 */
    groupList: API.PluginsSearch[]
    /** 选中数据 */
    selecteds: Record<string, API.PluginsSearchData[]>
    onSelect: (selected: Record<string, API.PluginsSearchData[]>) => void
    /** 是否隐藏该组件 */
    isHidden?: boolean
    /** 数据为空时的提示内容 */
    noDataHint?: string
    groupItemExtra?: (key: API.PluginsSearch) => ReactNode
}
/** @name 插件列表筛选条件数据组 */
export const HubListFilter: React.FC<HubListFilterProps> = memo((props) => {
    const {wrapperClassName, groupList, selecteds, onSelect, isHidden, noDataHint, groupItemExtra} = props

    const [activeKey, setActiveKey] = useState<string[]>([])
    useEffect(() => {
        const keys = groupList.map((l) => l.groupKey)
        setActiveKey(keys)
    }, [groupList])

    const onClear = useMemoizedFn((key: string) => {
        const selected = {...selecteds}
        selected[key] = []
        onSelect({...selected})
    })
    const onCheck = useMemoizedFn((groupKey: string, data: API.PluginsSearchData, check: boolean) => {
        const selected = {...selecteds}
        if (check) {
            selected[groupKey] = [...(selected[groupKey] || []), data]
        } else {
            selected[groupKey] = (selected[groupKey] || []).filter((item) => item.value !== data.value)
        }
        onSelect({...selected})
    })

    return (
        <div
            className={classNames(
                styles["hub-list-filter"],
                {[styles["hub-list-filter-hidden"]]: !!isHidden},
                wrapperClassName
            )}
        >
            <div className={styles["hub-list-filter-header"]}>高级筛选</div>
            <div className={styles["hub-list-filter-body"]}>
                <YakitCollapse
                    activeKey={activeKey}
                    onChange={(key) => setActiveKey(key as string[])}
                    className={styles["filter-collapse"]}
                >
                    {groupList.map((item, i) => (
                        <YakitPanel
                            header={item.groupName}
                            key={item.groupKey}
                            extra={
                                <>
                                    {groupItemExtra && groupItemExtra(item)}
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        className={styles["clear-btn"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onClear(item.groupKey)
                                        }}
                                    >
                                        清空
                                    </YakitButton>
                                </>
                            }
                        >
                            {(item.data || []).map((listItem) => {
                                const checked =
                                    (selecteds[item.groupKey] || []).findIndex(
                                        (ele) => ele.value === listItem.value
                                    ) !== -1
                                return (
                                    <label
                                        className={classNames(styles["list-item"], {
                                            [styles["list-item-active"]]: checked
                                        })}
                                        key={`${item.groupKey}-${listItem.value}`}
                                    >
                                        <div className={styles["list-item-left"]}>
                                            <YakitCheckbox
                                                checked={checked}
                                                onChange={(e) => onCheck(item.groupKey, listItem, e.target.checked)}
                                            />
                                            <span
                                                className={classNames(
                                                    styles["item-title"],
                                                    "yakit-content-single-ellipsis"
                                                )}
                                                title={listItem.label}
                                            >
                                                {listItem.label}
                                            </span>
                                        </div>
                                        <span className={styles["list-item-extra"]}>{listItem.count}</span>
                                    </label>
                                )
                            })}
                        </YakitPanel>
                    ))}
                </YakitCollapse>
                {groupList.length > 0 && <div className={styles["to-end"]}>已经到底啦～</div>}
                {groupList.length === 0 && <YakitEmpty style={{paddingTop: 48}} title={noDataHint || "暂无数据"} />}
            </div>
        </div>
    )
})

interface HubOuterListProps {
    /** 列表标题 */
    title: string
    /** 头部拓展元素 */
    headerExtra?: ReactNode
    /**列表头部右侧拓展元素 */
    listHeaderRightExtra?: ReactNode
    /** 全选 */
    allChecked: boolean
    setAllChecked: (val: boolean) => any
    total: number
    /** 选中插件数量 */
    selected: number
    /** 搜索内容 */
    search: PluginSearchParams
    setSearch: (data: PluginSearchParams) => any
    onSearch: (val: PluginSearchParams) => any
    /** 搜索条件 */
    filters: PluginFilterParams
    setFilters: (filters: PluginFilterParams) => void
    children?: ReactNode
}
/** @name 插件外层列表UI */
export const HubOuterList: React.FC<HubOuterListProps> = memo((props) => {
    const {
        title,
        headerExtra,
        listHeaderRightExtra,
        allChecked,
        setAllChecked,
        total,
        selected,
        search,
        setSearch,
        onSearch,
        filters,
        setFilters,
        children
    } = props

    /** 全选框是否为半选状态 */
    const checkIndeterminate = useMemo(() => {
        if (allChecked) return false
        if (!allChecked && selected > 0) return true
        return false
    }, [allChecked, selected])

    const showTagList = useMemo(() => {
        let list: TagShowOpt[] = []
        try {
            Object.entries(filters).forEach(([key, value]) => {
                const itemList = (value || []).map((ele) => ({tagType: key, label: ele.label, value: ele.value}))
                if (itemList.length > 0) {
                    list = [...list, ...itemList]
                }
            })
        } catch (error) {}
        return list
    }, [filters])

    const tagLength = useMemo(() => {
        return showTagList.length
    }, [showTagList])

    const [tagShow, setTagShow] = useState<boolean>(false)

    const onDelTag = useMemoizedFn((value: TagShowOpt) => {
        if (has(filters, value.tagType)) {
            filters[value.tagType] = (filters[value.tagType] || []).filter((ele) => ele.value !== value.value)
            setFilters({...filters})
        }
    })
    const onDelAllTag = useMemoizedFn(() => {
        let newFilters: PluginFilterParams = {}
        Object.keys(filters).forEach((key) => {
            newFilters[key] = []
        })
        setFilters(newFilters)
    })

    return (
        <div className={styles["hub-outer-list"]}>
            <div className={styles["hub-outer-list-header"]}>
                <div className={styles["title-style"]}>{title}</div>
                <div className={styles["extra-wrapper"]}>
                    <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                    {!!headerExtra && (
                        <>
                            <div className={styles["divider-style"]} />
                            {headerExtra}
                        </>
                    )}
                </div>
            </div>

            <div className={styles["hub-outer-list-body"]}>
                <div className={styles["hub-outer-list-body-header"]}>
                    <div className={styles["hub-outer-list-body-header-left"]}>
                        <div className={styles["header-check"]}>
                            <YakitCheckbox
                                indeterminate={checkIndeterminate}
                                checked={allChecked}
                                onChange={(e) => setAllChecked(e.target.checked)}
                            />
                            全选
                        </div>

                        <div className={styles["total-and-selected"]}>
                            <div>
                                Total <span className={styles["num-style"]}>{Number(total) || 0}</span>
                            </div>
                            <div className={styles["divider-style"]} />
                            <div>
                                Selected <span className={styles["num-style"]}>{Number(selected) || 0}</span>
                            </div>
                        </div>

                        {tagLength > 0 && (
                            <div className={styles["header-filter-tag"]}>
                                {tagLength <= 2 ? (
                                    showTagList.map((item) => {
                                        return (
                                            <YakitTag
                                                key={item.value}
                                                color='info'
                                                closable
                                                onClose={() => onDelTag(item)}
                                            >
                                                {item.label}
                                            </YakitTag>
                                        )
                                    })
                                ) : (
                                    <YakitPopover
                                        overlayClassName={styles["hub-outer-list-filter-popover"]}
                                        content={
                                            <div className={styles["hub-outer-list-filter"]}>
                                                {showTagList.map((item) => {
                                                    return (
                                                        <Tooltip
                                                            title={item.label}
                                                            placement='top'
                                                            overlayClassName='plugins-tooltip'
                                                            key={item.value}
                                                        >
                                                            <YakitTag closable onClose={() => onDelTag(item)}>
                                                                {item.label}
                                                            </YakitTag>
                                                        </Tooltip>
                                                    )
                                                })}
                                            </div>
                                        }
                                        trigger='hover'
                                        onVisibleChange={setTagShow}
                                        placement='bottomLeft'
                                    >
                                        <div
                                            className={classNames(styles["tag-total"], {
                                                [styles["tag-total-active"]]: tagShow
                                            })}
                                        >
                                            <span>
                                                筛选条件 <span className={styles["total-style"]}>{tagLength}</span>
                                            </span>
                                            <OutlineXIcon onClick={() => onDelAllTag()} />
                                        </div>
                                    </YakitPopover>
                                )}
                            </div>
                        )}
                    </div>
                    <div className={styles["hub-outer-list-body-header-right"]}>{listHeaderRightExtra}</div>
                </div>

                <div className={styles["hub-outer-list-body-container"]}>{children || null}</div>
            </div>
        </div>
    )
})

interface HubGridListProps<T> {
    /** 列表数据 */
    data: T[]
    /** 插件项的唯一值字段 */
    keyName: string
    /** 网格布局-item组件 */
    gridNode: (info: {index: number; data: T}) => ReactNode
    /** 列表是否在加载状态 */
    loading: boolean
    /** 是否还有数据可以加载 */
    hasMore: boolean
    /** 更新列表数据 */
    updateList: (reset?: boolean) => any
    /** 当前展示的插件index */
    showIndex?: number
    /** 修改当前展示的插件index */
    setShowIndex?: (i: number) => any
}
/** @name 插件网格列表 */
export const HubGridList: <T>(props: HubGridListProps<T>) => any = memo((props) => {
    const {data, keyName, gridNode, loading, hasMore, updateList, showIndex, setShowIndex} = props

    const itemHeight = useRef(226)

    const listRef = useRef<HTMLDivElement>(null)
    const listSize = useSize(listRef)
    /**
     * @name 记录列表的列数
     * @description 主要用于防止隐藏到显示时，列数重置为2时引起的滚动定位计算错误问题
     */
    const oldGridCol = useRef<number>(2)
    /** 每行的列数 */
    const gridCol = useMemo(() => {
        if (listSize?.width === 0) return oldGridCol.current
        const width = listSize?.width || 600
        if (width >= 900 && width < 1200) {
            oldGridCol.current = 3
            return 3
        }
        if (width >= 1200 && width < 1500) {
            oldGridCol.current = 4
            return 4
        }
        if (width >= 1500) {
            oldGridCol.current = 5
            return 5
        }
        oldGridCol.current = 2
        return 2
    }, [listSize])

    /** 展示列表数据 */
    const showData = useMemo(() => {
        const len = data.length
        const row = Math.ceil(len / gridCol)
        const arr: any[] = []
        for (let i = 0; i < row; i++) {
            arr.push(data.slice(i * gridCol, (i + 1) * gridCol))
        }
        return arr
    }, [data, gridCol])

    const containerRef = useRef<HTMLDivElement>(null)
    /** 获取列表scrollTop, clientHeight, scrollHeight */
    const fetchListPosition = useMemoizedFn(() => {
        const position = {
            scrollTop: 0,
            clientHeight: 0,
            scrollHeight: 0
        }
        if (listRef && listRef.current) {
            position.clientHeight = listRef.current.getBoundingClientRect().height || 0
            position.scrollTop = listRef.current.scrollTop || 0
            position.scrollHeight = listRef.current.scrollHeight || 0
        }
        return {...position}
    })
    const [list, scrollTo] = useVirtualList(showData, {
        containerTarget: listRef,
        wrapperTarget: containerRef,
        itemHeight: itemHeight.current,
        overscan: 5
    })

    const [inView = true] = useInViewport(listRef)
    const previousInView = useRef<boolean>(!!inView)
    useEffect(() => {
        // 滚动定位
        if (!previousInView.current && inView) {
            scrollTo(Math.floor((showIndex || 0) / oldGridCol.current))
        }
        // 数据重置或刷新
        if (previousInView.current && inView && showIndex === 0) {
            scrollTo(0)
        }
        previousInView.current = !!inView
    }, [gridCol, inView, showIndex])

    // 滚动加载
    const onScrollCapture = useThrottleFn(
        useMemoizedFn(() => {
            if (loading) return

            if (containerRef && containerRef.current) {
                const {scrollTop, clientHeight, scrollHeight} = fetchListPosition()
                if (setShowIndex) setShowIndex(Math.round(scrollTop / (itemHeight.current + 16)) * gridCol + 1)

                if (!hasMore) return
                const scrollBottom = scrollHeight - scrollTop - clientHeight
                if (scrollBottom <= itemHeight.current * 2) {
                    updateList()
                }
            }
        }),
        {wait: 200, leading: false}
    ).run

    // 首屏数据不够时自动加载下一页
    useEffect(() => {
        if (loading) return
        if (!hasMore) return

        if (containerRef && containerRef.current) {
            const {clientHeight: wrapperHeight} = fetchListPosition()
            if (!wrapperHeight) return
            const listHeight = containerRef.current?.clientHeight || 0
            if (listHeight < wrapperHeight) {
                updateList()
            }
        }
    }, [loading, hasMore, listRef.current?.clientHeight])

    return (
        <div ref={listRef} className={styles["hub-grid-list"]} onScroll={() => onScrollCapture()}>
            <div ref={containerRef}>
                {list.map((item, index) => {
                    const arr: any[] = item.data
                    return (
                        <div
                            key={`${arr.map((info) => info[keyName]).join("-")}`}
                            className={styles["hub-grid-list-row"]}
                        >
                            {arr.map((el, i) => {
                                const order = item.index * gridCol + i
                                return (
                                    <div
                                        key={el[keyName]}
                                        className={classNames(
                                            styles["hub-grid-list-opt"],
                                            styles[`grid-opt-${gridCol}`]
                                        )}
                                    >
                                        {gridNode({index: order, data: el})}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}

                {!loading && !hasMore && <div className={styles["no-more-wrapper"]}>暂无更多数据</div>}
                {data.length > 0 && loading && (
                    <div className={styles["loading-wrapper"]}>
                        <YakitSpin wrapperClassName={styles["loading-style"]} />
                    </div>
                )}
            </div>
        </div>
    )
})

interface HubGridOptProps {
    /** 插件在列表中的索引 */
    order: number
    /** 插件详细信息 */
    info: any
    /** 是否选中 */
    checked: boolean
    /** 勾选的回调 */
    onCheck: (info: any, value: boolean) => any
    /** 插件名 */
    title: string
    /** 插件类型 */
    type: string
    /** 插件标签 */
    tags: string
    /** 插件解释信息 */
    help: string
    /** 插件作者头像 */
    img: string
    /** 插件作者 */
    user: string
    /** 贡献者头像 */
    prImgs?: string[]
    /** 插件更新时间 */
    time: number
    /** 是否为内置插件 */
    isCorePlugin: boolean
    /** 是否为官方插件 */
    official: boolean
    /** 插件相关拓展节点 */
    subTitle?: (data: any) => ReactNode
    extraFooter?: (data: any) => ReactNode
    /** 点击该展示项的回调 */
    onClick?: (data: any, index: number, value: boolean) => any
}
/** @name 插件网格单项 */
export const HubGridOpt: React.FC<HubGridOptProps> = memo((props) => {
    const {
        order,
        info,
        checked,
        onCheck,
        title,
        type,
        tags,
        help,
        img,
        user,
        prImgs = [],
        time,
        isCorePlugin,
        official,
        subTitle,
        extraFooter,
        onClick
    } = props

    // 副标题组件
    const subtitle = useMemoizedFn(() => {
        if (subTitle) return subTitle(info)
        return null
    })
    // 拓展组件
    const extra = useMemoizedFn(() => {
        if (extraFooter) return extraFooter(info)
        return null
    })
    // 组件点击回调
    const onclick = useMemoizedFn(() => {
        if (onClick) return onClick(info, order, !checked)
        return null
    })

    /** 展示的标签列表 */
    const tagList = useMemo(() => {
        if (!tags) return []
        if (tags === "null") return []
        let arr: string[] = []
        try {
            arr = tags ? tags.split(",") : []
        } catch (error) {}
        return arr
    }, [tags])
    /** 贡献者数据 */
    const contributes = useMemo(() => {
        if (prImgs.length <= 5) return {arr: prImgs, length: 0}
        else {
            return {arr: prImgs.slice(0, 5), length: prImgs.length - 5}
        }
    }, [prImgs])
    const authorImgNode = useMemo(() => {
        if (isCorePlugin) {
            return <AuthorImg src={YakitLogo} icon={pluginTypeToName[type].icon} />
        }
        return <AuthorImg src={img || UnLogin} builtInIcon={official ? "official" : undefined} />
    }, [isCorePlugin, img, official, type])

    return (
        <div className={styles["hub-grid-opt"]} onClick={onclick}>
            <div
                className={classNames(styles["opt-check-wrapper"], {[styles["opt-check-active"]]: checked})}
                onClick={(e) => {
                    e.stopPropagation()
                    onCheck(info, !checked)
                }}
            >
                <PluginsGridCheckIcon />
            </div>

            <div className={classNames(styles["opt-body"], {[styles["opt-active-body"]]: checked})}>
                <div className={styles["opt-content"]}>
                    <div className={styles["title-wrapper"]}>
                        <div
                            className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}
                            title={title}
                        >
                            {title}
                        </div>
                        {subtitle()}
                    </div>

                    <div className={styles["content-wrapper"]}>
                        <div className={styles["tags-wrapper"]}>
                            {pluginTypeToName[type] && pluginTypeToName[type].name && (
                                <YakitTag style={{marginRight: 0}} color={pluginTypeToName[type]?.color as any}>
                                    {pluginTypeToName[type]?.name}
                                </YakitTag>
                            )}
                            <div className={classNames(styles["tag-list"], "yakit-content-single-ellipsis")}>
                                {tagList.map((item) => {
                                    return (
                                        <div key={`tag-${item}`} className={styles["tag-opt"]}>
                                            <div
                                                className={classNames(
                                                    styles["text-style"],
                                                    "yakit-content-single-ellipsis"
                                                )}
                                            >
                                                {onPluginTagsToName(item)}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className={classNames(styles["help-wrapper"], "yakit-content-multiLine-ellipsis")}>
                            {help || "No Description about it."}
                        </div>

                        <div className={styles["user-wrapper"]}>
                            <div className={styles["user-body"]}>
                                {authorImgNode}
                                <div className={classNames(styles["user-style"], "yakit-content-single-ellipsis")}>
                                    {user || "anonymous"}
                                </div>
                                <AuthorIcon />
                            </div>
                            <div className={styles["contribute-body"]}>
                                {contributes.arr.map((item, index) => {
                                    return (
                                        <img
                                            key={`${item}-${index}`}
                                            src={item || UnLogin}
                                            className={styles["img-style"]}
                                        />
                                    )
                                })}
                                {contributes.length > 0 && (
                                    <div className={styles["more-style"]}>{`+${contributes.length}`}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles["opt-footer"]} onClick={(e) => e.stopPropagation()}>
                    <div className={styles["footer-time"]}>
                        <OutlineCalendarIcon />
                        {formatDate(time)}
                    </div>
                    <div className={styles["extra-footer"]}>{extra()}</div>
                </div>
            </div>
        </div>
    )
})

interface HubDetailListProps<T> {
    /**搜索内容 */
    search: PluginSearchParams
    /** 设置搜索内容 */
    setSearch: (s: PluginSearchParams) => void
    /** 搜索内容功能回调(自带防抖功能) */
    onSearch: (value: PluginSearchParams) => any
    /** 搜索栏额外操作元素 */
    filterNode?: ReactNode
    /** 搜索条件下边操作元素 */
    filterBodyBottomNode?: ReactNode
    /** 搜索栏额外过滤组件 */
    filterExtra?: ReactNode
    /** 全选框状态 */
    checked: boolean
    /** 设置全选框 */
    onCheck: (value: boolean) => any
    /** 插件总数 */
    total: number
    /** 已勾选插件数量 */
    selected: number
    /** 搜索列表属性 */
    listProps: RollingLoadListProps<T>
    /** 查询第一页的loading */
    spinLoading?: boolean
}
/** @name 插件详情列表 */
export const HubDetailList: <T>(props: HubDetailListProps<T>) => any = memo((props) => {
    const {
        search,
        setSearch,
        onSearch,
        filterNode,
        filterBodyBottomNode,
        filterExtra,
        checked,
        onCheck,
        total,
        selected,
        listProps,
        spinLoading
    } = props

    /** 全选框是否为半选状态 */
    const checkIndeterminate = useMemo(() => {
        if (checked) return false
        if (!checked && selected > 0) return true
        return false
    }, [checked, selected])

    return (
        <div className={styles["hub-detail-list"]}>
            <div className={styles["filter-header"]}>
                <div className={styles["header-search"]}>
                    <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                </div>
                {filterNode || null}
                <div className={styles["filter-body"]}>
                    <div className={styles["display-show"]}>
                        <div className={styles["all-check"]}>
                            <YakitCheckbox
                                indeterminate={checkIndeterminate}
                                checked={checked}
                                onChange={(e) => onCheck(e.target.checked)}
                            />
                            全选
                        </div>
                        <div className={styles["count-num"]}>
                            Total <span className={styles["num-style"]}>{total}</span>
                        </div>
                        <div className={styles["divider-style"]}></div>
                        <div className={styles["count-num"]}>
                            Selected <span className={styles["num-style"]}>{selected}</span>
                        </div>
                    </div>
                    {filterExtra || null}
                </div>
                {filterBodyBottomNode || null}
            </div>
            <YakitSpin spinning={!!spinLoading} wrapperClassName={styles["filter-list"]}>
                <RollingLoadList {...listProps} />
            </YakitSpin>
        </div>
    )
})

interface HubDetailListOptProps<T> {
    /** 插件在列表里的索引 */
    order: number
    plugin: T
    check: boolean
    headImg: string
    pluginName: string
    help?: string
    content: string
    official: boolean
    pluginType: string
    /** @name 是否内置 */
    isCorePlugin: boolean
    optCheck: (data: T, value: boolean) => any
    extra?: (data: T) => ReactNode
    onPluginClick: (plugin: T, index: number) => void
    /**是否可以勾选 */
    enableCheck?: boolean
    /**是否可以点击 */
    enableClick?: boolean
}
/** @name 插件详情列表单项 */
export const HubDetailListOpt: <T>(props: HubDetailListOptProps<T>) => any = memo((props) => {
    const {
        order,
        plugin,
        check,
        headImg,
        isCorePlugin,
        official,
        pluginType,
        pluginName,
        help,
        content,
        optCheck,
        extra,
        onPluginClick,
        enableCheck = true,
        enableClick = true
    } = props

    const onCheck = useMemoizedFn((e: CheckboxChangeEvent) => {
        if (enableCheck) optCheck(plugin, e.target.checked)
    })
    const authorImgNode = useMemo(() => {
        if (isCorePlugin) {
            return <AuthorImg src={YakitLogo} icon={pluginTypeToName[pluginType].icon} />
        }
        return <AuthorImg src={headImg || UnLogin} builtInIcon={official ? "official" : undefined} />
    }, [isCorePlugin, headImg, pluginType, official])
    const onClick = useMemoizedFn((e) => {
        if (enableClick) onPluginClick(plugin, order)
    })

    // 副标题组件
    const extraNode = useMemoizedFn(() => {
        if (extra) return extra(plugin)
        return null
    })
    return (
        <div
            className={classNames(styles["opt-wrapper"], {
                [styles["opt-wrapper-enableClick"]]: enableClick
            })}
            onClick={onClick}
        >
            <div className={styles["plugin-details-item"]}>
                <div className={styles["plugin-details-item-info"]}>
                    {enableCheck && (
                        <YakitCheckbox
                            checked={check}
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                            onChange={onCheck}
                        />
                    )}
                    {authorImgNode}
                    <div
                        className={classNames(
                            styles["plugin-details-item-info-text-style"],
                            "yakit-content-single-ellipsis"
                        )}
                        title={pluginName}
                    >
                        {pluginName}
                    </div>
                </div>
                <div className={styles["plugin-details-item-show"]}>
                    {extraNode()}
                    <Tooltip
                        title={help || "No Description about it."}
                        placement='topRight'
                        overlayClassName='plugins-tooltip'
                    >
                        <OutlineQuestionmarkcircleIcon className={styles["plugin-details-item-show-icon-style"]} />
                    </Tooltip>
                    <YakitPopover
                        placement='topRight'
                        overlayClassName={styles["terminal-popover"]}
                        content={<YakEditor type={pluginType} value={content} readOnly={true} />}
                    >
                        <OutlineTerminalIcon className={styles["plugin-details-item-show-icon-style"]} />
                    </YakitPopover>
                </div>
            </div>
        </div>
    )
})

interface FooterExtraBtnProps {
    loading?: boolean
    title: string
    icon?: ReactNode
    onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}
/** @name 单项拓展按钮 */
export const FooterExtraBtn: React.FC<FooterExtraBtnProps> = memo((props) => {
    const {loading, title, icon, onClick} = props

    const handleClick = useMemoizedFn((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (loading) return
        onClick(e)
    })

    return (
        <div className={styles["footer-extra-btn"]} onClick={handleClick}>
            {loading ? (
                <OutlineLoadingIcon className={styles["loading"]} />
            ) : (
                <>
                    {icon || null}
                    <span className={styles["title-style"]}>{title || ""}</span>
                </>
            )}
        </div>
    )
})

interface OnlineOptFooterExtraProps {
    isLogin: boolean
    info: YakitPluginOnlineDetail
    /** 当前正在执行下载的插件UUID队列 */
    execDownloadInfo?: YakitPluginOnlineDetail[]
    onDownload: (data: YakitPluginOnlineDetail) => void
    callback: (type: string, info: YakitPluginOnlineDetail) => any
}
/** @name 插件商店单项-点赞|下载 */
export const OnlineOptFooterExtra: React.FC<OnlineOptFooterExtraProps> = memo((props) => {
    const {isLogin, info, execDownloadInfo = [], onDownload, callback} = props

    const [starLoading, setStarLoading] = useState<boolean>(false)
    const onStar = useMemoizedFn((e) => {
        e.stopPropagation()
        if (starLoading) return
        if (!info.uuid) {
            yakitNotify("error", "插件信息错误，无法进行点赞操作")
            return
        }
        if (!isLogin) {
            yakitNotify("error", "登录后才可以进行点赞")
            return
        }

        const request: PluginStarsRequest = {
            uuid: info.uuid,
            operation: info.is_stars ? "remove" : "add"
        }
        setStarLoading(true)
        apiPluginStars(request)
            .then(() => {
                callback("star", info)
            })
            .catch(() => {})
            .finally(() =>
                setTimeout(() => {
                    setStarLoading(false)
                }, 200)
            )
    })

    const downloadLoading = useMemo(() => {
        if (!execDownloadInfo || execDownloadInfo.length === 0) return false
        const findIndex = execDownloadInfo.findIndex((ele) => ele.uuid === info.uuid)
        if (findIndex > -1) return true
        return false
    }, [info, execDownloadInfo])
    const handleDownload = useMemoizedFn((e) => {
        e.stopPropagation()
        if (downloadLoading) return
        if (!info.uuid) {
            yakitNotify("error", "插件信息错误，无法进行下载操作")
            return
        }
        onDownload(info)
    })

    return (
        <div className={styles["hub-opt-footer-extra"]}>
            <FooterExtraBtn
                loading={starLoading}
                icon={info.is_stars ? <SolidThumbupIcon className={styles["stared-icon"]} /> : <OutlineThumbupIcon />}
                title={info.starsCountString || ""}
                onClick={onStar}
            />
            <div className={styles["divider-style"]}></div>
            <FooterExtraBtn
                loading={downloadLoading}
                icon={<OutlineClouddownloadIcon />}
                title={info.downloadedTotalString || ""}
                onClick={handleDownload}
            />
        </div>
    )
})

interface OwnOptFooterExtraProps {
    isLogin: boolean
    info: YakitPluginOnlineDetail
    /** 当前正在执行下载的插件UUID队列 */
    execDownloadInfo?: YakitPluginOnlineDetail[]
    onDownload: (data: YakitPluginOnlineDetail) => void
    /** 当前正在执行删除的插件UUID队列 */
    execDelInfo?: YakitPluginOnlineDetail[]
    onDel: (data: YakitPluginOnlineDetail) => void
    callback: (type: string, info: YakitPluginOnlineDetail) => any
}
/** @name 我的插件单项-下载|分享|更多(改公开|删除) */
export const OwnOptFooterExtra: React.FC<OwnOptFooterExtraProps> = memo((props) => {
    const {isLogin, info, execDownloadInfo = [], onDownload, execDelInfo = [], onDel, callback} = props

    const userinfo = useStore((s) => s.userInfo)

    const downloadLoading = useMemo(() => {
        if (!execDownloadInfo || execDownloadInfo.length === 0) return false
        const findIndex = execDownloadInfo.findIndex((ele) => ele.uuid === info.uuid)
        if (findIndex > -1) return true
        return false
    }, [info, execDownloadInfo])
    const handleDownload = useMemoizedFn((e) => {
        e.stopPropagation()
        if (downloadLoading) return
        if (!info.uuid) {
            yakitNotify("error", "插件信息错误，无法进行下载操作")
            return
        }
        onDownload(info)
    })

    // 分享
    const onShare = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!info.uuid) {
            yakitNotify("error", "分享插件的UUID不存在")
            return
        }
        setClipboardText(info.uuid, {hintText: "插件UUID已粘贴到剪切板"})
    })

    const delLoading = useMemo(() => {
        if (!execDelInfo || execDelInfo.length === 0) return false
        const findIndex = execDelInfo.findIndex((ele) => ele.uuid === info.uuid)
        if (findIndex > -1) return true
        return false
    }, [info, execDelInfo])
    const handleDel = useMemoizedFn(() => {
        if (delLoading) return
        if (!isLogin) {
            yakitNotify("error", "登录后才可以进行删除")
            return
        }
        onDel(info)
    })

    const [stateLoading, setStateLoading] = useState<boolean>(false)
    const onState = useMemoizedFn(() => {
        if (stateLoading) return
        if (!isLogin) {
            yakitNotify("error", "登录后才可以改变状态")
            return
        }
        if (!info.uuid) {
            yakitNotify("error", "插件关键信息获取错误")
            return
        }

        setStateLoading(true)
        if (info.is_private) {
            const m = showYakitModal({
                title: "插件基础检测",
                type: "white",
                width: "50%",
                centered: true,
                maskClosable: false,
                closable: true,
                footer: null,
                mask: false,
                destroyOnClose: true,
                bodyStyle: {padding: 0},
                content: (
                    <CodeScoreModule
                        type={info.type || ""}
                        code={info.content || ""}
                        isStart={true}
                        callback={async (isPass: boolean) => {
                            if (isPass) {
                                await handleChangeState()
                                m.destroy()
                            } else {
                                setStateLoading(false)
                            }
                        }}
                    />
                ),
                onCancel: () => {
                    m.destroy()
                    setStateLoading(false)
                }
            })
        } else {
            handleChangeState()
        }
    })
    const handleChangeState = useMemoizedFn(() => {
        const updateItem: API.UpPluginsPrivateRequest = {
            uuid: info.uuid,
            is_private: !info.is_private
        }
        apiUpdatePluginPrivateMine(updateItem)
            .then(() => {
                const isPrivate: boolean = !info.is_private
                let status: number = 0
                if (userinfo.role === "ordinary") {
                    // 为待审核
                    status = 0
                } else {
                    // 为审核通过
                    if (!isPrivate) status = 1
                }
                // 我的插件详情修改私密公开状态，需要使用回调
                callback("state", {...info, is_private: isPrivate, status: status})
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setStateLoading(false)
                }, 200)
            })
    })

    const onMenu = useMemoizedFn((key: string) => {
        if (key === "state") {
            onState()
        }
        if (key === "del") {
            handleDel()
        }
    })

    return (
        <div className={styles["hub-opt-footer-extra"]}>
            <YakitButton
                type='text2'
                icon={<OutlineClouddownloadIcon />}
                loading={downloadLoading}
                onClick={handleDownload}
            />
            <div className={styles["divider-style"]}></div>
            <YakitButton type='text2' icon={<OutlineShareIcon />} onClick={onShare} />
            <div className={styles["divider-style"]}></div>
            <FuncFilterPopover
                icon={<OutlineDotshorizontalIcon />}
                menu={{
                    type: "primary",
                    data: [
                        {
                            key: "state",
                            label: info.is_private ? "改为公开" : "改为私密",
                            itemIcon: info.is_private ? <OutlineLockopenIcon /> : <OutlineLockclosedIcon />,
                            disabled: stateLoading
                        },
                        {
                            key: "del",
                            label: "删除线上",
                            type: "danger",
                            itemIcon: <OutlineTrashIcon />,
                            disabled: delLoading
                        }
                    ],
                    onClick: ({key}) => onMenu(key)
                }}
                button={{type: "text2"}}
                placement='bottomRight'
            />
        </div>
    )
})

interface RecycleOptFooterExtraProps {
    isLogin: boolean
    info: YakitPluginOnlineDetail
    /** 当前正在执行删除的插件UUID队列 */
    execDelInfo?: YakitPluginOnlineDetail[]
    onDel: (data: YakitPluginOnlineDetail) => void
    restoreCallback: (data: YakitPluginOnlineDetail) => void
}
/** @name 回收站单项-删除和还原 */
export const RecycleOptFooterExtra: React.FC<RecycleOptFooterExtraProps> = memo((props) => {
    const {isLogin, info, execDelInfo = [], onDel, restoreCallback} = props

    const delLoading = useMemo(() => {
        if (!execDelInfo) return false
        const findIndex = execDelInfo.findIndex((ele) => ele.uuid === info.uuid)
        if (findIndex > -1) return true
        return false
    }, [info, execDelInfo])

    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!isLogin) {
            yakitNotify("error", "登录后才可以进行删除")
            return
        }
        if (delLoading) return
        onDel(info)
    })

    const [restoreLoading, setRestoreLoading] = useState<boolean>(false)
    const onRestore = useMemoizedFn((e) => {
        e.stopPropagation()
        if (restoreLoading) return
        if (!isLogin) {
            yakitNotify("error", "登录后才可以进行还原")
            return
        }

        setRestoreLoading(true)
        let request: PluginsRecycleRequest = {
            uuid: [info.uuid]
        }
        apiReductionRecyclePlugin(request)
            .then(() => {
                restoreCallback(info)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setRestoreLoading(false)
                }, 100)
            })
    })

    return (
        <div className={styles["hub-opt-footer-extra"]}>
            <YakitButton loading={delLoading} type='text2' icon={<OutlineTrashIcon />} onClick={onRemove} />

            <YakitButton loading={restoreLoading} icon={<OutlineDatabasebackupIcon />} onClick={onRestore}>
                还原
            </YakitButton>
        </div>
    )
})

interface LocalOptFooterExtraProps {
    isLogin: boolean
    info: YakScript
    onEdit: (data: YakScript) => void
    /** 当前正在执行上传的插件队列 */
    uploadInfo?: YakScript
    onUpload: (data: YakScript) => void
    onExport: (data: YakScript) => void
    /** 当前正在执行删除的插件UUID队列 */
    execDelInfo?: YakScript[]
    onDel: (data: YakScript) => void
}
/** @name 本地插件单项-上传|编辑|导出|删除本地 */
export const LocalOptFooterExtra: React.FC<LocalOptFooterExtraProps> = memo((props) => {
    const {isLogin, info, onEdit, uploadInfo, onUpload, onExport, execDelInfo = [], onDel} = props

    const isShowUpload = useMemo(() => {
        return !info.IsCorePlugin
    }, [info.IsCorePlugin])
    const uploadLoading = useMemo(() => {
        return info.ScriptName === uploadInfo?.ScriptName || info.Id === uploadInfo?.Id
    }, [info, uploadInfo])
    const [uploadTipShow, setUploadTipShow] = useState<boolean>(false)
    // 上传
    const handleUpload = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!isShowUpload || uploadLoading) return
        if (!info.ScriptName) {
            yakitNotify("error", "插件信息错误，无法进行上传操作")
            return
        }
        if (!isLogin) {
            yakitNotify("error", "登录后才可以进行上传")
            return
        }
        setUploadTipShow(false)
        onUpload(info)
    })
    // 编辑
    const handleEdit = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!info.ScriptName) {
            yakitNotify("error", "插件信息错误，请刷新列表后重试")
            return
        }
        onEdit(info)
    })

    const onMenus = useMemoizedFn(({key}) => {
        if (key === "export") {
            onExport(info)
        }
        if (key === "del") {
            handleDel()
        }
    })

    const delLoading = useMemo(() => {
        if (!execDelInfo || execDelInfo.length === 0) return false
        const findIndex = execDelInfo.findIndex((ele) => ele.ScriptName === info.ScriptName)
        if (findIndex > -1) return true
        return false
    }, [info, execDelInfo])
    // 删除
    const handleDel = useMemoizedFn(() => {
        if (delLoading) return
        if (!info.ScriptName) {
            yakitNotify("error", "插件信息错误，无法进行删除操作,请刷新列表重试")
            return
        }
        onDel(info)
    })

    const menus = useMemo(() => {
        if (!!info.IsCorePlugin) {
            return [
                {
                    key: "export",
                    label: "导出",
                    itemIcon: <OutlineExportIcon />
                }
            ]
        }
        return [
            {
                key: "export",
                label: "导出",
                itemIcon: <OutlineExportIcon />
            },
            {
                key: "del",
                label: "删除本地",
                type: "danger",
                itemIcon: <OutlineTrashIcon />,
                disabled: delLoading
            }
        ]
    }, [info])

    return (
        <div className={styles["local-opt-footer-extra"]}>
            {isShowUpload && (
                <>
                    <Tooltip title='上传' visible={uploadTipShow} onVisibleChange={(val) => setUploadTipShow(val)}>
                        <YakitButton
                            type='text2'
                            icon={<OutlineClouduploadIcon />}
                            loading={uploadLoading}
                            onClick={handleUpload}
                        />
                    </Tooltip>
                    <div className={styles["divider-style"]}></div>
                </>
            )}

            <Tooltip title='编辑'>
                <YakitButton type='text2' icon={<OutlinePencilaltIcon />} onClick={handleEdit} />
            </Tooltip>

            <div className={styles["divider-style"]}></div>

            <FuncFilterPopover
                icon={<OutlineDotshorizontalIcon />}
                menu={{
                    selectedKeys: [],
                    type: "primary",
                    data: menus as YakitMenuItemType[],
                    onClick: onMenus
                }}
                button={{type: "text2"}}
                placement='bottomRight'
            />
        </div>
    )
})

interface PluginsUploadHintProps {
    visible: boolean
    setVisible: (value: boolean) => void
}
/** @name 本地插件批量上传 */
export const PluginsUploadHint: React.FC<PluginsUploadHintProps> = React.memo((props) => {
    const {visible, setVisible} = props
    const onCancel = useMemoizedFn(() => {
        setVisible(false)
    })
    return (
        <YakitHint
            visible={visible}
            title='一键上传'
            heardIcon={<SolidClouduploadIcon style={{color: "var(--yakit-warning-5)"}} />}
            footer={null}
            isDrag={true}
            mask={false}
        >
            <PluginUpload
                isUploadAll={true}
                isPrivate={false}
                onSave={onCancel}
                onCancel={onCancel}
                pluginNames={[]}
                show={visible}
                footerClassName={styles["plugins-upload-hint-footer"]}
            />
        </YakitHint>
    )
})
