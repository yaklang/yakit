import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {
    AuthorImgProps,
    CodeScoreModalProps,
    CodeScoreModuleProps,
    CodeScoreSmokingEvaluateResponseProps,
    FilterPopoverBtnProps,
    FuncBtnProps,
    FuncFilterPopoverProps,
    FuncSearchProps,
    GridLayoutOptProps,
    GridListProps,
    ListLayoutOptProps,
    ListListProps,
    ListShowContainerProps,
    OnlineRecycleExtraOperateProps,
    PluginDiffEditorModalProps,
    PluginEditorModalProps,
    PluginTypeTagProps,
    PluginsListProps,
    TagShowOpt,
    TagsListShowProps,
    TypeSelectProps
} from "./funcTemplateType"
import {
    useControllableValue,
    useDebounceFn,
    useGetState,
    useInViewport,
    useMemoizedFn,
    useSize,
    useThrottleFn,
    useVirtualList,
    useCreation
} from "ahooks"
import {
    OutlineArrowscollapseIcon,
    OutlineCalendarIcon,
    OutlineClouddownloadIcon,
    OutlineDatabasebackupIcon,
    OutlineDotshorizontalIcon,
    OutlineFilterIcon,
    OutlineOpenIcon,
    OutlineSearchIcon,
    OutlineThumbupIcon,
    OutlineTrashIcon,
    OutlineViewgridIcon,
    OutlineViewlistIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {SolidCheckIcon, SolidExclamationIcon, SolidThumbupIcon} from "@/assets/icon/solid"
import {
    SolidOfficialpluginIcon,
    SolidYakitPluginIcon,
    SolidPluginYakMitmIcon,
    SolidPluginProtScanIcon,
    SolidSparklesPluginIcon,
    SolidDocumentSearchPluginIcon,
    SolidCollectionPluginIcon
} from "@/assets/icon/colors"
import {LoadingOutlined} from "@ant-design/icons"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {Dropdown, Form, Radio, Tooltip} from "antd"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {formatDate} from "@/utils/timeUtil"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {PluginTestErrorIcon, PluginTestWarningIcon, PluginsGridCheckIcon} from "./icon"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import YakitLogo from "@/assets/yakitLogo.png"
import {PluginFilterParams, PluginSearchParams} from "./baseTemplateType"
import {yakitNotify} from "@/utils/notification"
import {
    DownloadOnlinePluginsRequest,
    PluginStarsRequest,
    apiDownloadPluginOnline,
    apiFetchGroupStatisticsCheck,
    apiFetchGroupStatisticsLocal,
    apiFetchGroupStatisticsMine,
    apiFetchGroupStatisticsOnline,
    apiPluginStars
} from "./utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import {API} from "@/services/swagger/resposeType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {funcSearchType, pluginTypeToName} from "./builtInData"
import UnLogin from "@/assets/unLogin.png"
import {v4 as uuidv4} from "uuid"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitDiffEditor} from "@/components/yakitUI/YakitDiffEditor/YakitDiffEditor"
import has from "lodash/has"
import {onPluginTagsToName} from "./baseTemplate"
import classNames from "classnames"
import "./plugins.scss"
import styles from "./funcTemplate.module.scss"

const {ipcRenderer} = window.require("electron")

/** @name 标题栏的搜索选项组件 */
export const TypeSelect: React.FC<TypeSelectProps> = memo((props) => {
    const {active, list, setActive} = props

    const divRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(divRef)

    const [visible, setVisible, getVisible] = useGetState<boolean>(false)

    const isEllipsis = useMemo(() => {
        return inViewport
    }, [inViewport])

    useEffect(() => {
        if (isEllipsis && getVisible()) setVisible(false)
    }, [isEllipsis])

    return (
        <div className={styles["type-select-wrapper"]}>
            {list.map((item, index) => {
                const select = active.findIndex((ele) => ele.key === item.key) !== -1
                return (
                    <div
                        key={item.key}
                        className={classNames(styles["type-select-opt"], {
                            [styles["type-select-active"]]: select
                        })}
                        onClick={() => {
                            if (select) setActive(active.filter((el) => el.key !== item.key))
                            else
                                setActive(
                                    active.concat([
                                        {
                                            key: item.key,
                                            name: item.name
                                        }
                                    ])
                                )
                        }}
                    >
                        {item.icon}
                        <div className={styles["content-style"]}>
                            {item.name}
                            {index === list.length - 1 && <div ref={divRef} className={styles["mask-wrapper"]}></div>}
                        </div>
                    </div>
                )
            })}

            {!isEllipsis && (
                <div className={styles["ellipsis-wrapper"]}>
                    <YakitPopover
                        overlayClassName={styles["ellipsis-type-select-popover"]}
                        trigger={"click"}
                        placement='bottomRight'
                        visible={visible}
                        onVisibleChange={(value) => setVisible(value)}
                        content={
                            <div className={styles["ellipsis-type-select-wrapper"]}>
                                <div className={styles["list-wrapper"]}>
                                    {list.map((item) => {
                                        return (
                                            <div
                                                key={item.key}
                                                className={classNames(styles["opt-wrapper"], {
                                                    [styles["opt-active"]]:
                                                        active.findIndex((ele) => ele.key === item.key) !== -1
                                                })}
                                                onClick={() => {
                                                    if (active.findIndex((ele) => ele.key === item.key) !== -1)
                                                        setActive(active.filter((el) => el.key !== item.key))
                                                    else
                                                        setActive(
                                                            active.concat([
                                                                {
                                                                    key: item.key,
                                                                    name: item.name
                                                                }
                                                            ])
                                                        )
                                                }}
                                            >
                                                {item.name}
                                                <SolidCheckIcon />
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className={styles["list-btn-wrapper"]}>
                                    <div className={styles["btn-style"]} onClick={() => setActive([])}>
                                        重置
                                    </div>
                                </div>
                            </div>
                        }
                    >
                        <div className={classNames(styles["ellipsis-body"], {[styles["ellipsis-active"]]: visible})}>
                            <OutlineDotshorizontalIcon />
                        </div>
                    </YakitPopover>
                </div>
            )}
        </div>
    )
})

/** @name 带屏幕宽度自适应的按钮组件 */
export const FuncBtn: React.FC<FuncBtnProps> = memo((props) => {
    const {name, maxWidth, className, ...rest} = props

    const [isIcon, setIsIcon, getIsIcon] = useGetState<boolean>(false)
    const mediaHandle = useMemoizedFn((e) => {
        let value = !!e.matches
        if (getIsIcon() === value) return
        setIsIcon(value)
    })
    useEffect(() => {
        if (!maxWidth) return
        const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`)
        setIsIcon(!!mediaQuery.matches)

        mediaQuery.addEventListener("change", mediaHandle)
        return () => {
            mediaQuery.removeEventListener("change", mediaHandle)
        }
    }, [])

    return isIcon ? (
        <Tooltip title={name} overlayClassName='plugins-tooltip'>
            <YakitButton {...rest}></YakitButton>
        </Tooltip>
    ) : (
        <YakitButton {...rest}>
            <span className={styles["title-style"]}>{name}</span>
        </YakitButton>
    )
})

/** @name 带屏幕宽度自适应的搜索内容组件 */
export const FuncSearch: React.FC<FuncSearchProps> = memo((props) => {
    const {maxWidth, onSearch: onsearch, yakitCombinationSearchProps = {}, includeSearchType} = props

    const [isIcon, setIsIcon, getIsIcon] = useGetState<boolean>(false)
    const mediaHandle = useMemoizedFn((e) => {
        let value = !!e.matches
        if (getIsIcon() === value) return
        if (showPopver && !value) setShowPopver(false)
        setIsIcon(value)
    })
    useEffect(() => {
        if (!maxWidth) return
        const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`)
        setIsIcon(!!mediaQuery.matches)

        mediaQuery.addEventListener("change", mediaHandle)
        return () => {
            mediaQuery.removeEventListener("change", mediaHandle)
        }
    }, [])

    const [search, setSearch] = useControllableValue<PluginSearchParams>(props)
    const [showPopver, setShowPopver] = useState<boolean>(false)

    const onTypeChange = useMemoizedFn((value: string) => {
        setSearch({
            ...search,
            type: value as PluginSearchParams["type"]
        })
    })
    const onValueChange = useMemoizedFn((e) => {
        let newSearch: PluginSearchParams = {
            ...search
        }
        switch (search.type) {
            case "keyword":
                newSearch.keyword = e.target.value
                break
            case "userName":
                newSearch.userName = e.target.value
                break
            case "fieldKeywords":
                newSearch.fieldKeywords = e.target.value
                break
            default:
                break
        }
        setSearch({
            ...newSearch
        })
    })
    const onSearch = useDebounceFn(
        useMemoizedFn(() => {
            onsearch(search)
        }),
        {wait: 0}
    ).run
    const searchValue = useMemo(() => {
        switch (search.type) {
            case "keyword":
                return search.keyword
            case "userName":
                return search.userName
            case "fieldKeywords":
                return search.fieldKeywords
            default:
                return ""
        }
    }, [search])
    const funcSearchTypeList = useCreation(() => {
        if (includeSearchType && includeSearchType?.length) {
            return funcSearchType.filter((item) => includeSearchType.includes(item.value as PluginSearchParams["type"]))
        }
        return funcSearchType
    }, [includeSearchType])
    return (
        <div className={isIcon ? styles["func-search-icon-wrapper"] : styles["func-search-wrapper"]}>
            <YakitCombinationSearch
                beforeOptionWidth={92}
                {...yakitCombinationSearchProps}
                wrapperClassName={classNames(styles["search-body"], yakitCombinationSearchProps.wrapperClassName || "")}
                valueBeforeOption={search.type}
                addonBeforeOption={funcSearchTypeList}
                onSelectBeforeOption={onTypeChange}
                inputSearchModuleTypeProps={{
                    value: searchValue,
                    onChange: onValueChange,
                    onSearch: onSearch,
                    ...(yakitCombinationSearchProps?.inputSearchModuleTypeProps || {})
                }}
            />
            <YakitPopover
                overlayClassName={styles["func-search-popver"]}
                content={
                    <YakitCombinationSearch
                        beforeOptionWidth={92}
                        {...yakitCombinationSearchProps}
                        valueBeforeOption={search.type}
                        addonBeforeOption={funcSearchTypeList}
                        onSelectBeforeOption={onTypeChange}
                        inputSearchModuleTypeProps={{
                            value: searchValue,
                            onChange: onValueChange,
                            onSearch: onSearch,
                            ...(yakitCombinationSearchProps?.inputSearchModuleTypeProps || {})
                        }}
                    />
                }
                trigger='click'
                visible={showPopver}
                onVisibleChange={setShowPopver}
                placement='bottomRight'
            >
                <YakitButton
                    className={styles["search-icon"]}
                    size='large'
                    type='outline2'
                    icon={<OutlineSearchIcon />}
                    isActive={showPopver}
                ></YakitButton>
            </YakitPopover>
        </div>
    )
})

/** @name 带下拉菜单的按钮组件 */
export const FuncFilterPopover: React.FC<FuncFilterPopoverProps> = memo((props) => {
    const {
        maxWidth,
        icon,
        name,
        menu: {onClick, type = "grey", ...menurest},
        button,
        disabled,
        placement = "bottom"
    } = props

    const [isIcon, setIsIcon, getIsIcon] = useGetState<boolean>(false)
    const mediaHandle = useMemoizedFn((e) => {
        let value = !!e.matches
        if (getIsIcon() === value) return
        setIsIcon(value)
    })
    useEffect(() => {
        if (!maxWidth) return
        const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`)
        setIsIcon(!!mediaQuery.matches)

        mediaQuery.addEventListener("change", mediaHandle)
        return () => {
            mediaQuery.removeEventListener("change", mediaHandle)
        }
    }, [])

    /** 判断组件是纯图标还是带内容 */
    const nameAndIcon = useMemo(() => {
        if (!name) return false
        if (isIcon) return false
        return true
    }, [name, isIcon])

    const [show, setShow] = useState<boolean>(false)

    const overlay = useMemo(() => {
        return (
            <YakitMenu
                {...menurest}
                type={type}
                onClick={(e) => {
                    e.domEvent.stopPropagation()
                    if (onClick) onClick(e)
                    setShow(false)
                }}
            />
        )
    }, [onClick, type, menurest])
    return (
        <Dropdown
            overlayClassName={styles["func-filter-popover"]}
            overlay={overlay}
            placement={placement}
            onVisibleChange={setShow}
            disabled={disabled}
        >
            {nameAndIcon ? (
                <YakitButton
                    // style={{padding: "3px 4px"}}
                    isActive={show}
                    onClick={(e) => e.stopPropagation()}
                    {...(button || {})}
                >
                    {name}
                    {icon}
                </YakitButton>
            ) : (
                <YakitButton
                    isActive={show}
                    icon={icon}
                    onClick={(e) => e.stopPropagation()}
                    {...(button || {})}
                ></YakitButton>
            )}
        </Dropdown>
    )
})

/** @name 代表作者的图标ICON */
export const AuthorIcon: React.FC<{}> = memo((props) => {
    return <div className={styles["author-icon-wrapper"]}>作者</div>
})
/** @name 代表申请人的图标ICON */
export const ApplicantIcon: React.FC<{}> = memo((props) => {
    return <div className={styles["applicant-icon-wrapper"]}>申请人</div>
})

/** @name 插件主要部分组件 */
export const PluginsList: React.FC<PluginsListProps> = memo((props) => {
    const {
        checked,
        onCheck,
        isList,
        setIsList,
        total,
        selected,
        filters,
        setFilters,
        extraHeader,
        children,
        visible,
        setVisible
    } = props

    /** 全选框是否为半选状态 */
    const checkIndeterminate = useMemo(() => {
        if (checked) return false
        if (!checked && selected > 0) return true
        return false
    }, [checked, selected])

    const [tagShow, setTagShow] = useState<boolean>(false)
    const onExpend = useMemoizedFn(() => {
        setVisible(true)
    })

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
    return (
        <div className={styles["plugins-list"]}>
            <div className={styles["list-header"]}>
                <div className={styles["header-body"]}>
                    {!visible && (
                        <div className={styles["header-body-filter"]}>
                            <Tooltip title='展开筛选' placement='topLeft' overlayClassName='plugins-tooltip'>
                                <YakitButton
                                    type='text2'
                                    onClick={onExpend}
                                    icon={
                                        <OutlineOpenIcon className={styles["panel-header-icon"]} onClick={onExpend} />
                                    }
                                ></YakitButton>
                            </Tooltip>
                        </div>
                    )}
                    <div className={styles["body-check"]}>
                        <YakitCheckbox
                            indeterminate={checkIndeterminate}
                            checked={checked}
                            onChange={(e) => onCheck(e.target.checked)}
                        />
                        全选
                    </div>
                    <div className={styles["body-total-selected"]}>
                        <div>
                            Total <span className={styles["num-style"]}>{+total || 0}</span>
                        </div>
                        <div className={styles["divider-style"]} />
                        <div>
                            Selected <span className={styles["num-style"]}>{+selected || 0}</span>
                        </div>
                    </div>
                    {tagLength > 0 && (
                        <div className={styles["body-filter-tag"]}>
                            {tagLength <= 2 ? (
                                showTagList.map((item) => {
                                    return (
                                        <YakitTag key={item.value} color='info' closable onClose={() => onDelTag(item)}>
                                            {item.label}
                                        </YakitTag>
                                    )
                                })
                            ) : (
                                <YakitPopover
                                    overlayClassName={styles["plugins-list-tag-total-popover"]}
                                    content={
                                        <div className={styles["plugins-list-tag-total"]}>
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

                <div className={styles["header-extra"]}>
                    {extraHeader || null}
                    <Tooltip
                        className='plugins-tooltip'
                        placement='topRight'
                        title={isList ? "切换至宫格视图" : "切换至列表视图"}
                    >
                        <div className={styles["is-list-btn"]} onClick={() => setIsList(!isList)}>
                            {isList ? <OutlineViewgridIcon /> : <OutlineViewlistIcon />}
                        </div>
                    </Tooltip>
                </div>
            </div>

            <div className={styles["list-body"]}>{children}</div>
        </div>
    )
})

/** @name 插件列表组件 */
export const ListShowContainer: <T>(props: ListShowContainerProps<T>) => any = memo((props) => {
    const {
        isList,
        data,
        keyName = "uuid",
        gridNode,
        gridHeight,
        listNode,
        listHeight,
        loading,
        hasMore,
        updateList,
        id,
        listClassName,
        gridClassName,
        showIndex,
        setShowIndex,
        isShowSearchResultEmpty
    } = props

    // useWhyDidYouUpdate("ListShowContainer", {...props})

    const listId = useMemo(() => {
        if (id) {
            return `${id}-list`
        }
    }, [id])
    const gridId = useMemo(() => {
        if (id) {
            return `${id}-grid`
        }
    }, [id])
    return isShowSearchResultEmpty ? (
        <YakitEmpty
            image={SearchResultEmpty}
            imageStyle={{width: 274, height: 180, marginBottom: 24}}
            title='搜索结果“空”'
            style={{paddingTop: "10%"}}
            className={styles["empty-list"]}
        />
    ) : (
        <div className={styles["list-show-container"]}>
            <div
                tabIndex={isList ? 0 : -1}
                className={classNames(styles["tab-panel"], {[styles["tab-hidden-panel"]]: !isList})}
            >
                <ListList
                    id={listId}
                    isList={isList}
                    data={data}
                    keyName={keyName}
                    render={listNode}
                    optHeight={listHeight}
                    loading={loading}
                    hasMore={hasMore}
                    updateList={updateList}
                    listClassName={listClassName}
                    showIndex={showIndex}
                    setShowIndex={setShowIndex}
                />
            </div>
            <div
                tabIndex={isList ? -1 : 0}
                className={classNames(styles["tab-panel"], {[styles["tab-hidden-panel"]]: isList})}
            >
                <GridList
                    id={gridId}
                    isList={isList}
                    data={data}
                    keyName={keyName}
                    render={gridNode}
                    optHeight={gridHeight}
                    loading={loading}
                    hasMore={hasMore}
                    updateList={updateList}
                    gridClassName={gridClassName}
                    showIndex={showIndex}
                    setShowIndex={setShowIndex}
                />
            </div>
        </div>
    )
})

/** @name 插件列表布局列表 */
export const ListList: <T>(props: ListListProps<T>) => any = memo((props) => {
    const {
        isList,
        data,
        render,
        keyName,
        optHeight,
        loading,
        hasMore,
        updateList,
        id,
        listClassName,
        showIndex,
        setShowIndex
    } = props

    // useWhyDidYouUpdate("ListList", {...props})

    // 列表布局相关变量
    const listContainerRef = useRef<HTMLDivElement>(null)
    // 获取组件高度相关数据
    const fetchListHeight = useMemoizedFn(() => {
        const {scrollTop, clientHeight, scrollHeight} = listContainerRef.current || {
            scrollTop: 0,
            clientHeight: 0,
            scrollHeight: 0
        }
        return {scrollTop, clientHeight, scrollHeight}
    })
    const listwrapperRef = useRef<HTMLDivElement>(null)
    const [list, scrollTo] = useVirtualList(data, {
        containerTarget: listContainerRef,
        wrapperTarget: listwrapperRef,
        itemHeight: optHeight || 73,
        overscan: 50
    })

    const [inView] = useInViewport(listContainerRef)
    const oldInView = useRef<boolean>(!!inView)
    useEffect(() => {
        if (!oldInView.current && inView) {
            scrollTo(showIndex || 0)
        }
        // 数据重置刷新
        if (oldInView.current && inView && showIndex === 0) {
            scrollTo(0)
        }
        oldInView.current = !!inView
    }, [inView, showIndex])

    const onScrollCapture = useThrottleFn(
        useMemoizedFn(() => {
            // 不执行非列表布局逻辑
            if (!isList) return

            if (loading) return
            if (!hasMore) return

            if (listContainerRef && listContainerRef.current) {
                const {scrollTop, clientHeight, scrollHeight} = fetchListHeight()
                if (setShowIndex) setShowIndex(Math.round(scrollTop / optHeight))

                const scrollBottom = scrollHeight - scrollTop - clientHeight
                if (scrollBottom <= optHeight * 3) {
                    updateList()
                }
            }
        }),
        {wait: 200, leading: false}
    )

    useEffect(() => {
        // 不执行非列表布局逻辑
        if (!isList) return

        if (loading) return
        if (!hasMore) return

        if (listContainerRef && listContainerRef.current && listwrapperRef && listwrapperRef.current) {
            const {clientHeight} = fetchListHeight()
            const bodyHeight = listwrapperRef.current?.clientHeight
            if (bodyHeight + optHeight * 2 <= clientHeight) {
                updateList()
            }
        }
    }, [loading, listContainerRef.current?.clientHeight, listwrapperRef.current?.clientHeight])

    return (
        <div
            ref={listContainerRef}
            id={id}
            className={classNames(styles["list-list-warpper"], listClassName)}
            onScroll={() => onScrollCapture.run()}
        >
            <div ref={listwrapperRef}>
                {list.map((ele) => {
                    return (
                        <div key={(ele.data || {})[keyName]} className={styles["list-opt"]}>
                            {render(ele)}
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
/** @name 插件列表形式单个项组件 */
export const ListLayoutOpt: React.FC<ListLayoutOptProps> = memo((props) => {
    const {
        order,
        data,
        checked,
        onCheck,
        img,
        title,
        help,
        time,
        type,
        isCorePlugin,
        official,
        subTitle,
        extraNode,
        onClick
    } = props

    // 副标题组件
    const subtitle = useMemoizedFn(() => {
        if (subTitle) return subTitle(data)
        return null
    })
    // 拓展组件
    const extra = useMemoizedFn(() => {
        if (extraNode) return extraNode(data)
        return null
    })
    // 组件点击回调
    const onclick = useMemoizedFn(() => {
        if (onClick) return onClick(data, order, !checked)
        return null
    })

    const authorImgNode = useMemo(() => {
        if (isCorePlugin) {
            return <AuthorImg src={YakitLogo} icon={pluginTypeToName[type].icon} />
        }
        return <AuthorImg src={img || UnLogin} builtInIcon={official ? "official" : undefined} />
    }, [isCorePlugin, img, official, type])

    return (
        <div className={styles["list-layout-opt-wrapper"]} onClick={onclick}>
            <div className={styles["opt-body"]}>
                <div className={styles["content-style"]}>
                    <YakitCheckbox
                        checked={checked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onCheck(data, e.target.checked)}
                    />
                    {authorImgNode}
                    <div className={styles["title-wrapper"]}>
                        <div className={styles["title-body"]}>
                            <div className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}>
                                {title}
                            </div>
                            {subtitle()}
                        </div>
                        <div className={classNames(styles["help-style"], "yakit-content-single-ellipsis")}>
                            {help || "No Description about it."}
                        </div>
                    </div>
                </div>
                <div className={styles["time-style"]}>{formatDate(time)}</div>
            </div>
            {extra()}
        </div>
    )
})

/** @name 插件网格布局列表 */
export const GridList: <T>(props: GridListProps<T>) => any = memo((props) => {
    const {
        isList,
        data,
        render,
        keyName,
        optHeight,
        loading,
        hasMore,
        updateList,
        id,
        gridClassName,
        showIndex,
        setShowIndex
    } = props

    // 计算网格列数
    const bodyRef = useSize(document.querySelector("body"))
    const gridCol = useMemo(() => {
        const width = bodyRef?.width || 900
        if (width >= 1156 && width < 1480) return 3
        if (width >= 1480 && width < 1736) return 4
        if (width >= 1736) return 5
        return 2
    }, [bodyRef])
    // 展示的数据
    const shwoData = useMemo(() => {
        const len = data.length
        const rowNum = Math.ceil(len / gridCol)
        const arr: any[] = []
        for (let i = 0; i < rowNum; i++) {
            const order = i * gridCol
            const newArr = data.slice(order, order + gridCol)
            arr.push(newArr)
        }
        return arr
    }, [data, gridCol])

    const containerRef = useRef<HTMLDivElement>(null)
    // 获取组件高度相关数据
    const fetchListHeight = useMemoizedFn(() => {
        const {scrollTop, clientHeight, scrollHeight} = containerRef.current || {
            scrollTop: 0,
            clientHeight: 0,
            scrollHeight: 0
        }
        return {scrollTop, clientHeight, scrollHeight}
    })
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [list, scrollTo] = useVirtualList(shwoData, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: optHeight,
        overscan: 10
    })

    const [inView] = useInViewport(containerRef)
    const oldInView = useRef<boolean>(!!inView)
    useEffect(() => {
        if (!oldInView.current && inView) {
            scrollTo(Math.floor((showIndex || 0) / gridCol))
        }
        // 数据重置刷新
        if (oldInView.current && inView && showIndex === 0) {
            scrollTo(0)
        }
        oldInView.current = !!inView
    }, [inView, gridCol, showIndex])

    // 滚动加载
    const onScrollCapture = useThrottleFn(
        useMemoizedFn(() => {
            // 不执行非网格布局逻辑
            if (isList) return

            if (loading) return
            if (!hasMore) return

            if (containerRef && containerRef.current) {
                const {scrollTop, clientHeight, scrollHeight} = fetchListHeight()
                if (setShowIndex) setShowIndex(Math.round(scrollTop / (optHeight + 16)) * gridCol + 1)

                const scrollBottom = scrollHeight - scrollTop - clientHeight
                if (scrollBottom <= optHeight * 2) {
                    updateList()
                }
            }
        }),
        {wait: 200, leading: false}
    )

    // 首屏数据不够时自动加载下一页
    useEffect(() => {
        // 不执行非网格布局逻辑
        if (isList) return

        if (loading) return
        if (!hasMore) return

        if (containerRef && containerRef.current && wrapperRef && wrapperRef.current) {
            const {clientHeight} = fetchListHeight()
            const wrapperHeight = wrapperRef.current?.clientHeight || 0
            if (wrapperHeight < clientHeight) {
                updateList()
            }
        }
    }, [loading, hasMore, containerRef.current?.clientHeight])

    return (
        <div
            ref={containerRef}
            className={classNames(styles["grid-list-wrapper"], gridClassName)}
            id={id}
            onScroll={() => onScrollCapture.run()}
        >
            <div ref={wrapperRef}>
                {list.map((ele) => {
                    const itemArr: any[] = ele.data
                    return (
                        <div
                            key={`${itemArr.map((item) => item[keyName]).join("-")}`}
                            className={styles["row-wrapper"]}
                        >
                            {itemArr.map((item, index) => {
                                const order = ele.index * gridCol + index
                                return (
                                    <div
                                        key={item[keyName]}
                                        className={classNames(styles["item-wrapper"], {
                                            [styles["first-item-wrapper"]]: index === 0,
                                            [styles["last-item-wrapper"]]: index === gridCol - 1
                                        })}
                                    >
                                        {render({index: order, data: item})}
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
/** @name 插件网格形式单个项组件 */
export const GridLayoutOpt: React.FC<GridLayoutOptProps> = memo((props) => {
    const {
        order,
        data,
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

    // useWhyDidYouUpdate("GridLayoutOpt", {...props})

    // 副标题组件
    const subtitle = useMemoizedFn(() => {
        if (subTitle) return subTitle(data)
        return null
    })
    // 拓展组件
    const extra = useMemoizedFn(() => {
        if (extraFooter) return extraFooter(data)
        return null
    })
    // 组件点击回调
    const onclick = useMemoizedFn(() => {
        if (onClick) return onClick(data, order, !checked)
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
        <div className={styles["grid-layout-opt-wrapper"]} onClick={onclick}>
            <div
                className={classNames(styles["opt-check-wrapper"], {[styles["opt-check-active"]]: checked})}
                onClick={(e) => {
                    e.stopPropagation()
                    onCheck(data, !checked)
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
                                <YakitTag color={pluginTypeToName[type]?.color as any}>
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

/** @name 用户头像(头像右下角带小icon) */
export const AuthorImg: React.FC<AuthorImgProps> = memo((props) => {
    const {size = "middle", src, builtInIcon, icon, wrapperClassName, iconClassName = ""} = props
    const [isError, setIsError] = useState<boolean>(false)
    const srcUrl = useMemo(() => {
        if (isError) return UnLogin
        if (src) return src
        else return UnLogin
    }, [src, isError])

    const imgClass = useMemo(() => {
        if (size === "large") return styles["author-large-img-style"]
        if (size === "small") return styles["author-small-img-style"]
        return styles["author-middle-img-style"]
    }, [size])
    const imgBodyClass = useMemo(() => {
        if (size === "large") return styles["author-large-img-body"]
        if (size === "small") return styles["author-small-img-body"]
        return styles["author-middle-img-body"]
    }, [size])

    const iconNode = useMemo(() => {
        if (icon) return icon
        switch (builtInIcon) {
            case "official":
                return <SolidOfficialpluginIcon />

            case "yakit":
                return <SolidYakitPluginIcon />

            case "mitm":
                return <SolidPluginYakMitmIcon />

            case "port":
                return <SolidPluginProtScanIcon />

            case "sparkles":
                return <SolidSparklesPluginIcon />

            case "documentSearch":
                return <SolidDocumentSearchPluginIcon />

            case "collection":
                return <SolidCollectionPluginIcon />

            default:
                break
        }
    }, [builtInIcon, icon])
    const onErrorImg = useMemoizedFn((e) => {
        if (e.type === "error") {
            setIsError(true)
        } else {
            setIsError(false)
        }
    })
    return (
        <div className={classNames(imgBodyClass, wrapperClassName)}>
            <img className={imgClass} src={srcUrl} alt='' onError={onErrorImg} />
            {iconNode && <div className={classNames(styles["author-img-mask"], iconClassName)}>{iconNode}</div>}
        </div>
    )
})

/** @name 插件标签横向一行展示 */
export const TagsListShow: React.FC<TagsListShowProps> = memo((props) => {
    const {tags} = props

    // 获取wrapper和第一个标签的宽度
    const wrapperRef = useRef<HTMLDivElement>(null)
    const wrapperSize = useSize(wrapperRef)
    const firstRef = useRef<HTMLDivElement>(null)
    const initFirstWidthRef = useRef<number>(0)
    const fetchFirstWidth = useMemoizedFn(() => {
        if (initFirstWidthRef.current) return initFirstWidthRef.current
        if (!firstRef || !firstRef.current) return 0
        initFirstWidthRef.current = firstRef.current.getBoundingClientRect().width
        return initFirstWidthRef.current
    })

    // 判断是否需要将第一个标签隐藏并换成...展示
    const isShow = useMemo(() => {
        if (!wrapperSize?.width) return true
        const firstWidth = fetchFirstWidth()
        if (!firstWidth) return true

        const {width} = wrapperSize
        if (width > firstWidth + 16) return true
        else return false
    }, [wrapperSize])

    if (tags.length === 0) return null

    return (
        <div ref={wrapperRef} className={classNames(styles["tags-list-show-wrapper"], "yakit-content-single-ellipsis")}>
            {isShow
                ? tags.map((item, index) => {
                      return (
                          <div
                              ref={index === 0 ? firstRef : undefined}
                              key={`tag-${item}`}
                              className={styles["tag-wrapper"]}
                          >
                              {item}
                          </div>
                      )
                  })
                : "..."}
        </div>
    )
})

export const OnlineRecycleExtraOperate: React.FC<OnlineRecycleExtraOperateProps> = React.memo((props) => {
    const {data, isLogin, pluginRemoveCheck, onRemoveClick, onReductionClick, onRemoveOrReductionBefore} = props
    const [removeLoading, setRemoveLoading] = useState<boolean>(false)
    const [reductionLoading, setReductionLoading] = useState<boolean>(false)
    const onRemove = useMemoizedFn(async (e) => {
        e.stopPropagation()
        if (!isLogin) {
            yakitNotify("error", "登录才可以进行删除")
            return
        }
        try {
            if (pluginRemoveCheck) {
                setRemoveLoading(true)
                await onRemoveClick(data)
                setTimeout(() => {
                    setRemoveLoading(false)
                }, 200)
            } else {
                onRemoveOrReductionBefore(data, "remove")
            }
        } catch (error) {}
    })
    const onReduction = useMemoizedFn(async (e) => {
        e.stopPropagation()
        if (!isLogin) {
            yakitNotify("error", "登录才可以进行还原")
            return
        }
        try {
            setReductionLoading(true)
            await onReductionClick(data)
            setTimeout(() => {
                setReductionLoading(false)
            }, 200)
        } catch (error) {}
    })
    return (
        <div className={styles["plugin-recycle-extra-node"]}>
            {removeLoading ? (
                <LoadingOutlined className={styles["plugin-loading"]} />
            ) : (
                <YakitButton type='text2' icon={<OutlineTrashIcon />} onClick={onRemove} />
            )}
            <YakitButton icon={<OutlineDatabasebackupIcon />} onClick={onReduction} loading={reductionLoading}>
                还原
            </YakitButton>
        </div>
    )
})

/** @name 标题栏的搜索选项组件 */
export const FilterPopoverBtn: React.FC<FilterPopoverBtnProps> = memo((props) => {
    const {defaultFilter, onFilter, refresh, type = "online", fixFilterList = []} = props

    const excludeFilterName = useMemo(() => {
        return ["tags", "plugin_group"]
    }, [])

    const [visible, setVisible] = useState<boolean>(false)
    const [filterList, setFilterList] = useState<API.PluginsSearch[]>([])
    const [isActive, setIsActive] = useState<boolean>(false)

    // 查询筛选条件统计数据列表
    useEffect(() => {
        if (fixFilterList.length > 0) {
            setFilterList(fixFilterList)
            return
        }
        if (type === "online") {
            apiFetchGroupStatisticsOnline().then((res) => {
                const list = (res?.data || []).filter((item) => !excludeFilterName.includes(item.groupKey))
                setFilterList(list)
            })
        }
        if (type === "check") {
            apiFetchGroupStatisticsCheck().then((res) => {
                const list = (res?.data || []).filter((item) => !excludeFilterName.includes(item.groupKey))
                setFilterList(list)
            })
        }
        if (type === "user") {
            apiFetchGroupStatisticsMine().then((res) => {
                const list = (res?.data || []).filter((item) => !excludeFilterName.includes(item.groupKey))
                setFilterList(list)
            })
        }
        if (type === "local") {
            apiFetchGroupStatisticsLocal().then((res) => {
                const list = (res?.data || []).filter((item) => !excludeFilterName.includes(item.groupKey))
                setFilterList(list)
            })
        }
        return () => {
            setFilterList([])
        }
    }, [refresh])

    const [form] = Form.useForm()
    useEffect(() => {
        form.setFieldsValue({...defaultFilter})
        onSetIsActive(defaultFilter)
    }, [defaultFilter])
    /**需求：详情的搜索会清除tag，插件组因为已经移出到外面，所以插件组不会被清除 */
    const onFinish = useMemoizedFn((value) => {
        for (let name of excludeFilterName) {
            if (has(value, name)) delete value[name]
        }
        onFilter({...value, plugin_group: defaultFilter.plugin_group})
        setVisible(false)
        onSetIsActive(value)
    })
    /**需求：详情的重置会清除tag，插件组因为已经移出到外面，所以插件组不会被清除 */
    const onReset = useMemoizedFn(() => {
        const value = {
            plugin_type: [],
            status: [],
            plugin_private: [],
            plugin_group: defaultFilter.plugin_group
        }
        form.setFieldsValue({
            ...value
        })
        onFilter(value)
        setVisible(false)
        setIsActive(false)
    })
    /** 显示激活状态判断 */
    const onSetIsActive = useMemoizedFn((value: PluginFilterParams) => {
        const valueArr = (Object.keys(value) || []).filter((item) => !excludeFilterName.includes(item))
        if (valueArr.length > 0) {
            let isActive = false
            valueArr.forEach((key) => {
                if (value[key] && value[key].length > 0) {
                    if (fixFilterList.length > 0) {
                        const groupData = fixFilterList.find((ele) => ele.groupKey === "key") || {data: []}
                        const list = (value[key] || [])
                            .map((ele) => ele.value)
                            .sort()
                            .join(",")
                        const defList = (groupData.data || [])
                            .map((ele) => ele.value)
                            .sort()
                            .join(",")
                        if (list && list !== defList) {
                            isActive = true
                        }
                    } else {
                        isActive = true
                    }
                }
            })
            setIsActive(isActive)
        }
    })
    return (
        <YakitPopover
            overlayClassName={styles["filter-popover-btn"]}
            placement='bottomLeft'
            trigger={["click"]}
            visible={visible}
            onVisibleChange={(value) => {
                setVisible(value)
                if (!value) onFinish(form.getFieldsValue())
            }}
            content={
                <div className={styles["filter-popover-btn-wrapper"]}>
                    <Form form={form} layout='vertical' onFinish={onFinish}>
                        {filterList.map((item) => {
                            return (
                                <Form.Item key={item.groupKey} name={item.groupKey} label={item.groupName}>
                                    <YakitSelect labelInValue mode='multiple' allowClear={true}>
                                        {item.data.map((el) => (
                                            <YakitSelect.Option key={el.value} value={el.value}>
                                                {el.label}
                                            </YakitSelect.Option>
                                        ))}
                                    </YakitSelect>
                                </Form.Item>
                            )
                        })}

                        <div className={styles["form-btns"]}>
                            <YakitButton type='text' onClick={onReset}>
                                重置搜索
                            </YakitButton>
                            <YakitButton type='primary' htmlType='submit'>
                                搜索
                            </YakitButton>
                        </div>
                    </Form>
                </div>
            }
        >
            <YakitButton type='text2' icon={<OutlineFilterIcon />} isHover={visible} isActive={isActive} />
        </YakitPopover>
    )
})

/** @name 插件源码评分模块(包含评分逻辑),可和别的模块组合成新UI一起使用 */
export const CodeScoreModule: React.FC<CodeScoreModuleProps> = memo((props) => {
    const {
        type,
        code,
        isStart,
        successWait = 1000,
        successHint = "（表现良好，开始上传插件中...）",
        failedHint = "（上传失败，请修复后再上传）",
        callback,
        hiddenScoreHint,
        specialHint = "(无法判断，是否需要转人工审核)",
        specialBtnText = "转人工审核",
        specialExtraBtn = null,
        hiddenSpecialBtn = false
    } = props

    const [loading, setLoading] = useState<boolean>(true)
    const [response, setResponse] = useState<CodeScoreSmokingEvaluateResponseProps>()

    const fetchStartState = useMemoizedFn(() => {
        return isStart
    })

    /**
     * 特殊处理，验证中处在一种情况，如果出现则需要人工点击通过
     * 情况描述：验证结果只有一条错误信息，并且错误信息是 <请检查插件是否正常发起请求>
     */
    const [isSpecial, setIsSpecial] = useState<boolean>(false)

    // 开始评分
    const onTest = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("SmokingEvaluatePlugin", {PluginType: type, Code: code})
            .then((rsp: CodeScoreSmokingEvaluateResponseProps) => {
                if (!fetchStartState()) return
                const newResults = rsp.Results.map((ele) => ({...ele, IdKey: uuidv4()}))
                setResponse({
                    Score: rsp.Score,
                    Results: newResults
                })

                const specialFlag = newResults.length === 1 && newResults[0]?.Item === "逻辑测试失败[logic Test]"
                if (+rsp?.Score >= 60) {
                    setTimeout(() => {
                        callback(true)
                    }, successWait)
                } else {
                    specialFlag ? setIsSpecial(true) : callback(false)
                }
            })
            .catch((e) => {
                yakitNotify("error", `插件基础测试失败: ${e}`)
                callback(false)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    useEffect(() => {
        if (isStart) {
            onTest()
        }

        return () => {
            setLoading(false)
            setResponse(undefined)
            setIsSpecial(false)
        }
    }, [isStart])

    // 转人工审核按钮
    const onManualReview = useMemoizedFn(() => {
        callback(true)
    })

    return (
        <div className={styles["code-score-modal"]}>
            {!hiddenScoreHint && (
                <div className={styles["header-wrapper"]}>
                    <div className={styles["title-style"]}>检测项包含：</div>
                    <div className={styles["header-body"]}>
                        <div className={styles["opt-content"]}>
                            <div className={styles["content-order"]}>1</div>
                            基础编译测试，判断语法是否符合规范，是否存在不正确语法；
                        </div>
                        <div className={styles["opt-content"]}>
                            <div className={styles["content-order"]}>2</div>
                            把基础防误报服务器作为测试基准，防止条件过于宽松导致的误报；
                        </div>
                        <div className={styles["opt-content"]}>
                            <div className={styles["content-order"]}>3</div>
                            检查插件执行过程是否会发生崩溃。
                        </div>
                    </div>
                </div>
            )}
            {loading && (
                <div className={styles["loading-wrapper"]}>
                    <div className={styles["loading-body"]}>
                        <div className={styles["loading-icon"]}>
                            <YakitSpin spinning={true} />
                        </div>
                        <div className={styles["loading-title"]}>
                            <div className={styles["title-style"]}>检测中，请耐心等待...</div>
                            <div className={styles["subtitle-style"]}>
                                一般来说，检测将会在 <span className={styles["active-style"]}>10-20s</span> 内结束
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {!loading && (
                <div className={styles["loading-wrapper"]}>
                    <div className={styles["error-list"]}>
                        {response && (
                            <div className={styles["list-body"]}>
                                {(response?.Results || []).map((item, index) => {
                                    let errorPosition: string = ""
                                    try {
                                        const {StartLine, StartColumn, EndLine, EndColumn} = item.Range || {}
                                        if (StartLine && StartColumn && EndLine && EndColumn) {
                                            errorPosition = `[${StartLine}:${StartColumn}-${EndLine}:${EndColumn}]`
                                        }
                                    } catch (error) {}

                                    return (
                                        <div className={styles["list-opt"]} key={item.IdKey}>
                                            <div className={styles["opt-header"]}>
                                                {item.Severity === "Warning" ? (
                                                    <PluginTestWarningIcon />
                                                ) : (
                                                    <PluginTestErrorIcon />
                                                )}
                                                {item.Item}
                                            </div>
                                            <div className={styles["opt-content"]}>
                                                <pre>{item.Suggestion}</pre>
                                                {errorPosition && (
                                                    <span className={styles["error-position"]}> {errorPosition}</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        {response && (+response?.Score || 0) < 60 && (
                            <div className={styles["opt-results"]}>
                                <SolidExclamationIcon />
                                <div className={styles["content-style"]}>{isSpecial ? specialHint : failedHint}</div>
                            </div>
                        )}
                        {response && (+response?.Score || 0) >= 60 && (
                            <div className={styles["opt-results"]}>
                                <div className={styles["success-score"]}>
                                    {+response?.Score}
                                    <span className={styles["suffix-style"]}>分</span>
                                </div>
                                <div className={styles["content-style"]}>{successHint}</div>
                            </div>
                        )}
                        {!response && (
                            <div className={styles["opt-results"]}>
                                <div className={styles["content-style"]}>检查错误，请关闭后再次尝试!</div>
                            </div>
                        )}

                        {!hiddenSpecialBtn && response && isSpecial && (
                            <div className={styles["footer-btn"]}>
                                {specialExtraBtn}
                                <YakitButton onClick={onManualReview}>{specialBtnText}</YakitButton>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
})

/** @name 插件源码评分弹窗 */
export const CodeScoreModal: React.FC<CodeScoreModalProps> = memo((props) => {
    const {visible, onCancel, ...rest} = props

    // 不合格|取消
    const onFailed = useMemoizedFn(() => {
        onCancel(false)
    })
    // 合格
    const onSuccess = useMemoizedFn(() => {
        onCancel(true)
    })

    const moduleCallback = useMemoizedFn((value: boolean) => {
        if (value) {
            onSuccess()
        }
    })

    return (
        <YakitModal
            title='插件基础检测'
            type='white'
            width={"50%"}
            centered={true}
            maskClosable={false}
            closable={true}
            visible={visible}
            footer={null}
            destroyOnClose={true}
            onCancel={onFailed}
            bodyStyle={{padding: 0}}
        >
            {visible && <CodeScoreModule {...rest} isStart={visible} callback={moduleCallback} />}
        </YakitModal>
    )
})

/** @name 插件类型标签 */
export const PluginTypeTag: React.FC<PluginTypeTagProps> = memo((props) => {
    const {checked, setCheck, disabled, icon, name, description} = props

    return (
        <div
            className={classNames(styles["type-tag-wrapper"], {
                [styles["type-tag-active"]]: checked,
                [styles["type-tag-disabled"]]: disabled
            })}
            onClick={() => {
                if (disabled) return
                setCheck()
            }}
        >
            <div className={styles["type-tag-header"]}>
                {icon}
                <Radio
                    className='plugins-radio-wrapper'
                    disabled={disabled}
                    checked={checked}
                    onClick={(e) => {
                        e.stopPropagation()
                        setCheck()
                    }}
                />
            </div>
            <div className={styles["type-tag-content"]}>
                <div className={styles["content-title"]}>{name}</div>
                <div className={styles["content-body"]}>{description}</div>
            </div>
        </div>
    )
})

/** @name 源码放大版编辑器 */
export const PluginEditorModal: React.FC<PluginEditorModalProps> = memo((props) => {
    const {language = "yak", visible, setVisible, code} = props

    const [content, setContent] = useState<string>("")

    useEffect(() => {
        if (visible) {
            setContent(code || "")
        } else {
            setContent("")
        }
    }, [visible])

    return (
        <YakitModal
            title='源码'
            subTitle={
                <div className={styles["plugin-editor-modal-subtitle"]}>
                    <span>可在此定义插件输入原理，并编写输出 UI</span>
                    <span>按 Esc 即可退出全屏</span>
                </div>
            }
            type='white'
            width='80%'
            centered={true}
            maskClosable={false}
            closable={true}
            closeIcon={<OutlineArrowscollapseIcon className={styles["plugin-editor-modal-close-icon"]} />}
            footer={null}
            visible={visible}
            onCancel={() => setVisible(content)}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["plugin-editor-modal-body"]}>
                <YakitEditor type={language} value={content} setValue={setContent} />
            </div>
        </YakitModal>
    )
})

/** @name 对比器放大版编辑器 */
export const PluginDiffEditorModal: React.FC<PluginDiffEditorModalProps> = memo((props) => {
    const {language = "yak", oldCode, newCode, visible, setVisible} = props

    const [content, setContent] = useState<string>("")
    const [update, setUpdate] = useState<boolean>(false)

    useEffect(() => {
        if (visible) {
            setContent(newCode || "")
            setUpdate(!update)
            return () => {
                setContent("")
            }
        }
    }, [visible])

    return (
        <YakitModal
            title='源码'
            subTitle={
                <div className={styles["plugin-editor-modal-subtitle"]}>
                    <span>可在此定义插件输入原理，并编写输出 UI</span>
                    <span>按 Esc 即可退出全屏</span>
                </div>
            }
            type='white'
            width='80%'
            centered={true}
            maskClosable={false}
            closable={true}
            closeIcon={<OutlineArrowscollapseIcon className={styles["plugin-editor-modal-close-icon"]} />}
            footer={null}
            visible={visible}
            onCancel={() => setVisible(content)}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["plugin-editor-modal-body"]}>
                <YakitDiffEditor
                    leftDefaultCode={oldCode}
                    leftReadOnly={true}
                    rightDefaultCode={content}
                    setRightCode={setContent}
                    triggerUpdate={update}
                    language={language}
                />
            </div>
        </YakitModal>
    )
})
