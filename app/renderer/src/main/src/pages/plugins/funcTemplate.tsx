import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {
    AuthorImgProps,
    FuncBtnProps,
    FuncFilterPopverProps,
    FuncSearchProps,
    GridLayoutOptProps,
    GridListProps,
    ListLayoutOptProps,
    ListListProps,
    ListShowContainerProps,
    PluginsListProps,
    TagsListShowProps,
    TypeSelectProps
} from "./funcTemplateType"
import {
    useGetState,
    useInViewport,
    useMemoizedFn,
    useSize,
    useThrottleFn,
    useVirtualList,
    useWhyDidYouUpdate
} from "ahooks"
import {
    OutlineCalendarIcon,
    OutlineDotshorizontalIcon,
    OutlineSearchIcon,
    OutlineViewgridIcon,
    OutlineViewlistIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {SolidCheckIcon} from "@/assets/icon/solid"
import {
    SolidOfficialpluginIcon,
    SolidYakitPluginIcon,
    SolidPluginYakMitmIcon,
    SolidPluginProtScanIcon,
    SolidSparklesPluginIcon,
    SolidDocumentSearchPluginIcon,
    SolidCollectionPluginIcon
} from "@/assets/icon/colors"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {Dropdown} from "antd"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {formatDate} from "@/utils/timeUtil"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {pluginTypeToName} from "./baseTemplate"
import {PluginsGridCheckIcon} from "./icon"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import YakitLogo from "@/assets/yakitLogo.png"

import styles from "./funcTemplate.module.scss"
import classNames from "classnames"

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
                return (
                    <div
                        key={item.key}
                        className={classNames(styles["type-select-opt"], {
                            [styles["type-select-active"]]: active.includes(item.key)
                        })}
                        onClick={() => {
                            if (active.includes(item.key)) setActive(active.filter((el) => el !== item.key))
                            else setActive(active.concat([item.key]))
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
                                                    [styles["opt-active"]]: active.includes(item.key)
                                                })}
                                                onClick={() => {
                                                    if (active.includes(item.key))
                                                        setActive(active.filter((el) => el !== item.key))
                                                    else setActive(active.concat([item.key]))
                                                }}
                                            >
                                                {item.name}
                                                <SolidCheckIcon />
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className={styles["list-btn-wrapper"]}>
                                    <div
                                        className={classNames(styles["btn-style"], styles["reset-btn"])}
                                        onClick={() => setActive([])}
                                    >
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

/**
 * @name 带屏幕宽度自适应的按钮组件
 * @description 注意！组件样式设置了媒体查询，查询宽度暂只适应插件列表相关页面
 */
export const FuncBtn: React.FC<FuncBtnProps> = memo((props) => {
    const {icon, name, className, ...rest} = props

    return (
        <YakitButton
            type='outline2'
            size='large'
            className={classNames(styles["func-btn-wrapper"], className || "")}
            {...rest}
        >
            {icon}
            <span className={styles["title-style"]}>{name}</span>
        </YakitButton>
    )
})

const funcSearchType: {value: string; label: string}[] = [
    {value: "user", label: "按作者"},
    {value: "keyword", label: "关键字"}
]
/**
 * @name 带屏幕宽度自适应的搜索内容组件
 * @description 注意！组件样式设置了媒体查询，查询宽度暂只适应插件商店功能相关页面
 * 包括: 插件管理、插件商店、我的插件、本地插件
 */
export const FuncSearch: React.FC<FuncSearchProps> = memo((props) => {
    const {defaultValue = "", onSearch: onsearch} = props

    const [type, setType] = useState<string>("keyword")
    const [search, setSearch, getSearch] = useGetState<string>(defaultValue)

    const [showPopver, setShowPopver] = useState<boolean>(false)

    const onTypeChange = useMemoizedFn((value: string) => {
        setType(value)
        setSearch("")
        onsearch(null, "")
    })
    const onSearch = useMemoizedFn(() => {
        onsearch(type, getSearch())
    })

    return (
        <div className={styles["func-search-wrapper"]}>
            <YakitCombinationSearch
                wrapperClassName={styles["search-body"]}
                valueBeforeOption={type}
                addonBeforeOption={funcSearchType}
                onSelectBeforeOption={onTypeChange}
                inputSearchModuleTypeProps={{
                    value: search,
                    onChange: (e) => setSearch(e.target.value),
                    onSearch: onSearch
                }}
            />
            <YakitPopover
                overlayClassName={styles["func-search-popver"]}
                content={
                    <YakitCombinationSearch
                        valueBeforeOption={type}
                        addonBeforeOption={funcSearchType}
                        onSelectBeforeOption={onTypeChange}
                        inputSearchModuleTypeProps={{
                            value: search,
                            onChange: (e) => setSearch(e.target.value),
                            onSearch: onSearch
                        }}
                    />
                }
                trigger='click'
                onVisibleChange={setShowPopver}
                placement='bottomLeft'
            >
                <YakitButton
                    className={classNames(styles["search-icon"], {"button-text-primary": showPopver})}
                    size='large'
                    type='outline2'
                >
                    <OutlineSearchIcon />
                </YakitButton>
            </YakitPopover>
        </div>
    )
})

/** @name 带下拉菜单的按钮组件 */
export const FuncFilterPopver: React.FC<FuncFilterPopverProps> = memo((props) => {
    const {
        icon,
        name,
        menu: {onClick, ...menurest},
        placement = "bottom"
    } = props

    const [show, setShow] = useState<boolean>(false)

    const overlay = useMemo(() => {
        return (
            <YakitMenu
                {...menurest}
                onClick={(e) => {
                    e.domEvent.stopPropagation()
                    if (onClick) onClick(e)
                    setShow(false)
                }}
            />
        )
    }, [onClick, menurest])

    return (
        <Dropdown
            overlayClassName={styles["func-filter-popover"]}
            overlay={overlay}
            placement={placement}
            onVisibleChange={(open) => setShow(open)}
        >
            <div
                className={classNames(styles["func-filter-wrapper"], {[styles["func-filter-active"]]: show})}
                onClick={(e) => e.stopPropagation()}
            >
                {name}
                {icon}
            </div>
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
    const {checked, onCheck, isList, setIsList, total, selected, tag, onDelTag, extraHeader, children} = props

    /** 全选框是否为半选状态 */
    const checkIndeterminate = useMemo(() => {
        if (checked) return false
        if (!checked && selected > 0) return true
        return false
    }, [checked, selected])

    const [tagShow, setTagShow] = useState<boolean>(false)
    const tagLength = useMemo(() => {
        return tag.length
    }, [tag])

    return (
        <div className={styles["plugins-list"]}>
            <div className={styles["list-header"]}>
                <div className={styles["header-body"]}>
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
                                tag.map((item) => {
                                    return (
                                        <div key={item} className={styles["tag-opt"]}>
                                            {item}
                                            <OutlineXIcon onClick={() => onDelTag(item)} />
                                        </div>
                                    )
                                })
                            ) : (
                                <YakitPopover
                                    overlayClassName={styles["plugins-list-tag-total-popover"]}
                                    content={
                                        <div className={styles["plugins-list-tag-total"]}>
                                            {tag.map((item) => {
                                                return (
                                                    <div key={`total-${item}`} className={styles["tag-opt"]}>
                                                        {item}
                                                        <OutlineXIcon onClick={() => onDelTag(item)} />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    }
                                    trigger='click'
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
                                        <OutlineXIcon onClick={() => onDelTag()} />
                                    </div>
                                </YakitPopover>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles["header-extra"]}>
                    {extraHeader || null}
                    <div className={styles["is-list-btn"]} onClick={() => setIsList(!isList)}>
                        {isList ? <OutlineViewgridIcon /> : <OutlineViewlistIcon />}
                    </div>
                </div>
            </div>

            <div className={styles["list-body"]}>{children}</div>
        </div>
    )
})

/** @name 插件列表组件 */
export const ListShowContainer: <T>(props: ListShowContainerProps<T>) => any = memo((props) => {
    const {isList, data, gridNode, gridHeight, listNode, listHeight, loading, hasMore, updateList} = props

    // useWhyDidYouUpdate("ListShowContainer", {...props})

    return (
        <div className={styles["list-show-container"]}>
            <div
                tabIndex={isList ? 0 : -1}
                className={classNames(styles["tab-panel"], {[styles["tab-hidden-panel"]]: !isList})}
            >
                <ListList
                    isList={isList}
                    data={data}
                    render={listNode}
                    optHeight={listHeight}
                    loading={loading}
                    hasMore={hasMore}
                    updateList={updateList}
                />
            </div>
            <div
                tabIndex={isList ? -1 : 0}
                className={classNames(styles["tab-panel"], {[styles["tab-hidden-panel"]]: isList})}
            >
                <GridList
                    isList={isList}
                    data={data}
                    render={gridNode}
                    optHeight={gridHeight}
                    loading={loading}
                    hasMore={hasMore}
                    updateList={updateList}
                />
            </div>
        </div>
    )
})

/** @name 插件列表布局列表 */
export const ListList: <T>(props: ListListProps<T>) => any = memo((props) => {
    const {isList, data, render, optHeight, loading, hasMore, updateList} = props

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
    const [list] = useVirtualList(data, {
        containerTarget: listContainerRef,
        wrapperTarget: listwrapperRef,
        itemHeight: optHeight || 73,
        overscan: 50
    })

    const onScrollCapture = useThrottleFn(
        () => {
            // 不执行非列表布局逻辑
            if (!isList) return

            if (loading) return
            if (!hasMore) return

            if (listContainerRef && listContainerRef.current) {
                const {scrollTop, clientHeight, scrollHeight} = fetchListHeight()
                const scrollBottom = scrollHeight - scrollTop - clientHeight
                if (scrollBottom <= optHeight * 3) {
                    updateList()
                }
            }
        },
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
        <div ref={listContainerRef} className={styles["list-list-warpper"]} onScroll={() => onScrollCapture.run()}>
            <div ref={listwrapperRef}>
                {list.map((ele) => {
                    return (
                        <div key={(ele.data || {})["uuid"]} className={styles["list-opt"]}>
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
    const {data, checked, onCheck, img, title, help, time, subTitle, extraNode, onClick} = props

    // useWhyDidYouUpdate("ListLayoutOpt", {...props})

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
        if (onClick) return onClick(data)
        return null
    })

    return (
        <div className={styles["list-layout-opt-wrapper"]} onClick={onclick}>
            <div className={styles["opt-body"]}>
                <div className={styles["content-style"]}>
                    <YakitCheckbox
                        checked={checked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onCheck(data, e.target.checked)}
                    />
                    <AuthorImg src={img || ""} />
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
    const {isList, data, render, optHeight, loading, hasMore, updateList} = props

    // useWhyDidYouUpdate("ListList", {...props})

    const bodyRef = useSize(document.querySelector("body"))
    const gridContainerRef = useRef<HTMLDivElement>(null)
    const gridCol = useMemo(() => {
        const width = bodyRef?.width || 900
        if (width >= 1156 && width < 1480) return 3
        if (width >= 1480 && width < 1736) return 4
        if (width >= 1736) return 5
        return 2
    }, [bodyRef])
    // 列表最小高度
    const wrapperHeight = useMemo(() => {
        const count = data.length || 0
        const rows = Math.ceil(count / gridCol)
        return rows * optHeight + rows * 16
    }, [data, gridCol])

    useEffect(() => {
        // 不执行非网格布局逻辑
        if (isList) return

        if (loading) return
        if (!hasMore) return
        if (wrapperHeight === 0) return

        if (gridContainerRef && gridContainerRef.current) {
            const clientHeight = gridContainerRef.current?.clientHeight || 0
            if (wrapperHeight <= clientHeight + optHeight) {
                updateList()
            }
        }
    }, [wrapperHeight, loading, gridContainerRef.current?.clientHeight])

    const onScrollCapture = useThrottleFn(
        () => {
            // 不执行非网格布局逻辑
            if (isList) return

            if (loading) return
            if (!hasMore) return

            // 网格布局
            if (gridContainerRef && gridContainerRef.current) {
                const {scrollTop, clientHeight, scrollHeight} = gridContainerRef.current || {
                    scrollTop: 0,
                    clientHeight: 0,
                    scrollHeight: 0
                }
                const scrollBottom = scrollHeight - scrollTop - clientHeight
                if (scrollBottom <= optHeight * 2) {
                    updateList()
                }
            }
        },
        {wait: 200, leading: false}
    )

    return (
        <div ref={gridContainerRef} className={styles["grid-list-wrapper"]} onScroll={() => onScrollCapture.run()}>
            <div style={{minHeight: wrapperHeight}} className={styles["grid-list-body"]}>
                <ul className={styles["ul-wrapper"]}>
                    {data.map((item, index) => {
                        const rowNum = Math.floor(index / gridCol)
                        const colNum = index % gridCol
                        return (
                            <li
                                key={item["uuid"]}
                                style={{
                                    zIndex: index + 1,
                                    transform: `translate(${colNum * 100}%, ${rowNum * 100}%)`
                                }}
                                className={classNames(styles["li-style"], {[styles["li-first-style"]]: colNum === 0})}
                            >
                                {render({index: index, data: item})}
                            </li>
                        )
                    })}
                </ul>
            </div>
            {!loading && !hasMore && <div className={styles["no-more-wrapper"]}>暂无更多数据</div>}
            {data.length > 0 && loading && (
                <div className={styles["loading-wrapper"]}>
                    <YakitSpin wrapperClassName={styles["loading-style"]} />
                </div>
            )}
        </div>
    )
})
/** @name 插件网格形式单个项组件 */
export const GridLayoutOpt: React.FC<GridLayoutOptProps> = memo((props) => {
    const {
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
        if (onClick) return onClick(data)
        return null
    })

    /** 展示的标签列表 */
    const tagList = useMemo(() => {
        if (!tags) return []
        if (tags === "null") return []
        let arr: string[] = []
        try {
            arr = JSON.parse(tags)
        } catch (error) {}
        return arr
    }, [tags])
    /** 是否有作者 */
    const noUser = useMemo(() => {
        return !img && !user
    }, [img, user])
    /** 贡献者数据 */
    const contributes = useMemo(() => {
        if (prImgs.length <= 5) return {arr: prImgs, length: 0}
        else {
            return {arr: prImgs.slice(0, 5), length: prImgs.length - 5}
        }
    }, [prImgs])

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
                        <div className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}>
                            {title}
                        </div>
                        {subtitle()}
                    </div>

                    <div className={styles["content-wrapper"]}>
                        <div className={styles["tags-wrapper"]}>
                            <YakitTag color={pluginTypeToName[type].color as any}>
                                {pluginTypeToName[type].name}
                            </YakitTag>
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
                                                {item}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div
                            className={classNames(
                                {[styles["help-wrapper"]]: !noUser, [styles["help-noshow-user-wrapper"]]: noUser},
                                "yakit-content-multiLine-ellipsis"
                            )}
                        >
                            {help || "No Description about it."}
                        </div>

                        {!noUser && (
                            <div className={styles["user-wrapper"]}>
                                <div className={styles["user-body"]}>
                                    <AuthorImg src={img || ""} />
                                    <div className={classNames(styles["user-style"], "yakit-content-single-ellipsis")}>
                                        {user || ""}
                                    </div>
                                    <AuthorIcon />
                                </div>
                                <div className={styles["contribute-body"]}>
                                    {contributes.arr.map((item, index) => {
                                        return <AuthorImg key={`${index}|${item}`} src={item || ""} />
                                    })}
                                    {contributes.length > 0 && (
                                        <div className={styles["more-style"]}>{`+${contributes.length}`}</div>
                                    )}
                                </div>
                            </div>
                        )}
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
    const {size = "middle", src, builtInIcon, icon} = props
    const [srcUrl, setSrcUrl] = useState<string>(src || YakitLogo)

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
            setSrcUrl(YakitLogo)
        }
    })
    return (
        <div className={imgBodyClass}>
            <img className={imgClass} src={srcUrl} alt='' onError={onErrorImg} />
            {iconNode && <div className={styles["author-img-mask"]}>{iconNode}</div>}
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
