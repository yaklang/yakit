import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {
    FuncBtnProps,
    FuncFilterPopverProps,
    FuncSearchProps,
    GridLayoutOptProps,
    ListLayoutOptProps,
    ListShowContainerProps,
    PluginsListProps,
    TypeSelectProps
} from "./funcTemplateType"
import {useGetState, useInViewport, useMemoizedFn, useScroll, useSize, useVirtualList} from "ahooks"
import {
    OutlineCalendarIcon,
    OutlineDotshorizontalIcon,
    OutlineSearchIcon,
    OutlineViewgridIcon,
    OutlineViewlistIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {SolidCheckIcon} from "@/assets/icon/solid"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {Dropdown} from "antd"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {formatDate} from "@/utils/timeUtil"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import ReactResizeDetector from "react-resize-detector"
import {AuthorIcon, AuthorImg, pluginTypeToName} from "./baseTemplate"
import {PluginsGridCheckIcon} from "./icon"

import styles from "./funcTemplate.module.scss"
import classNames from "classnames"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

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
    const {isList, total, data, gridNode, gridHeight, listNode, listHeight, loading, updateList, onKey} = props

    // 列表布局相关变量
    const listContainerRef = useRef<HTMLDivElement>(null)
    const listwrapperRef = useRef<HTMLDivElement>(null)
    const [list] = useVirtualList(data, {
        containerTarget: listContainerRef,
        wrapperTarget: listwrapperRef,
        itemHeight: listHeight,
        overscan: 6
    })
    // 网格布局相关变量
    // const [gridCol, setGridCol] = useState<number>(3)
    // const showList = useMemo(() => {
    //     // @ts-ignore
    //     const arr: T[][] = []
    //     const length = Math.ceil(data.length / gridCol)
    //     for (let i = 0; i < length; i++) {
    //         arr.push(data.slice(i * gridCol, i * gridCol + gridCol))
    //     }
    //     return arr
    // }, [data, gridCol])
    // const gridContainerRef = useRef<HTMLDivElement>(null)
    // const gridwrapperRef = useRef<HTMLDivElement>(null)
    // const [grid] = useVirtualList(showList, {
    //     containerTarget: gridContainerRef,
    //     wrapperTarget: gridwrapperRef,
    //     itemHeight: gridHeight + 16,
    //     overscan: 6
    // })
    // ----
    const bodyRef = useSize(document.querySelector("body"))
    const gridContainerRef = useRef<HTMLDivElement>(null)
    const gridCol = useMemo(() => {
        const width = bodyRef?.width || 900
        if (width >= 1156 && width < 1480) return 3
        if (width >= 1480 && width < 1736) return 4
        if (width >= 1736) return 5
        return 2
    }, [bodyRef])

    const listPosition = useScroll(listContainerRef, ({top}) => {
        if (listContainerRef.current) {
            const clientHeight = listContainerRef.current?.clientHeight
            const scrollHeight = listContainerRef.current?.scrollHeight

            if (loading) return false
            if (top + clientHeight > scrollHeight - 10) {
                if (data.length === total) return false
                updateList()
            }
        }

        return false
    })
    const gridPosition = useScroll(gridContainerRef, ({top}) => {
        if (gridContainerRef.current) {
            const clientHeight = gridContainerRef.current?.clientHeight
            const scrollHeight = gridContainerRef.current?.scrollHeight

            if (loading) return false
            if (top + clientHeight > scrollHeight - 10) {
                if (data.length === total) return false
                updateList()
            }
        }

        return false
    })

    return (
        <div className={styles["list-show-container"]}>
            <YakitSpin spinning={loading}>
                {/* 列表布局 */}
                <div
                    ref={listContainerRef}
                    className={classNames(styles["list-wrapper"], {[styles["list-hide-container"]]: !isList})}
                >
                    <div ref={listwrapperRef}>
                        {list.map((ele) => {
                            return listNode(ele)
                        })}
                    </div>
                </div>
                {/* 网格布局 */}
                <div
                    ref={gridContainerRef}
                    className={classNames(styles["grid-wrapper"], {[styles["list-hide-container"]]: isList})}
                >
                    <ul className={styles["ul-wrapper"]}>
                        {data.map((item, index) => {
                            const rowNum = Math.floor(index / gridCol)
                            const colNum = index % gridCol
                            return (
                                <li
                                    key={onKey({index: index, data: item})}
                                    style={{
                                        zIndex: index + 1,
                                        transform: `translate(${colNum * 100}%, ${rowNum * 100}%)`
                                    }}
                                    className={styles["li-style"]}
                                >
                                    {gridNode({index: index, data: item})}
                                </li>
                            )
                        })}
                    </ul>
                </div>
                {/* <div
                    ref={gridContainerRef}
                    className={classNames(styles["list-wrapper"], {[styles["list-hide-container"]]: isList})}
                >
                    <ReactResizeDetector
                        onResize={(w, h) => {
                            if (!w || !h) {
                                return
                            }
                            let cols = Math.floor(w / 288)
                            if (cols >= 5) setGridCol(cols)
                            else setGridCol(cols)
                        }}
                        handleWidth={true}
                        handleHeight={false}
                        refreshMode={"debounce"}
                        refreshRate={50}
                    />
                    <div ref={gridwrapperRef}>
                        {grid.map((ele) => {
                            return (
                                <div className={styles["grid-row-wrapper"]}>
                                    {ele.data.map((item, i) => {
                                        return gridNode({row: ele.index, col: i, data: item})
                                    })}
                                </div>
                            )
                        })}
                    </div>
                </div> */}
            </YakitSpin>
        </div>
    )
})

/** @name 插件列表形式单个项组件 */
export const ListLayoutOpt: React.FC<ListLayoutOptProps> = memo((props) => {
    const {onlyId, checked, onCheck, img, title, help, time, subTitle, extraNode, onClick} = props

    return (
        <div key={onlyId} className={styles["list-layout-opt-wrapper"]} onClick={onClick}>
            <div className={styles["opt-body"]}>
                <div className={styles["content-style"]}>
                    <YakitCheckbox
                        checked={checked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onCheck(e.target.checked)}
                    />
                    <AuthorImg src={img || ""} />
                    <div className={styles["title-wrapper"]}>
                        <div className={styles["title-body"]}>
                            <div className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}>
                                {title}
                            </div>
                            {subTitle || null}
                        </div>
                        <div className={classNames(styles["help-style"], "yakit-content-single-ellipsis")}>
                            {help || "No Description about it."}
                        </div>
                    </div>
                </div>
                <div className={styles["time-style"]}>{formatDate(time)}</div>
            </div>
            {extraNode || null}
        </div>
    )
})

/** @name 插件网格形式单个项组件 */
export const GridLayoutOpt: React.FC<GridLayoutOptProps> = memo((props) => {
    const {onlyId, checked, onCheck, title, type, tags, help, img, user, prImgs, time, subTitle, extraFooter, onClick} =
        props

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
        <div key={onlyId} className={styles["grid-layout-opt-wrapper"]} onClick={onClick}>
            <div
                className={classNames(styles["opt-check-wrapper"], {[styles["opt-check-active"]]: checked})}
                onClick={(e) => {
                    e.stopPropagation()
                    onCheck(!checked)
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
                        {subTitle || null}
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
                    <div className={styles["extra-footer"]}>{extraFooter || null}</div>
                </div>
            </div>
        </div>
    )
})
