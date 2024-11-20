import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {PluginSourceType, PluginToDetailInfo} from "../type"
import {HubListRecycle} from "./HubListRecycle"
import {HubListOwn} from "./HubListOwn"
import {HubListLocal} from "./HubListLocal"
import {Tooltip} from "antd"
import {HubSideBarList} from "../defaultConstant"
import {HubListOnline} from "./HubListOnline"
import {PageNodeItemProps, PluginHubPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import {useStore} from "@/store"
import {PluginEnvVariables} from "../pluginEnvVariables/PluginEnvVariables"

import classNames from "classnames"
import styles from "./PluginHubList.module.scss"

interface PluginHubListProps {
    /** 根元素的id */
    rootElementId?: string
    isDetail: boolean
    /** 进入指定插件的详情页 */
    toPluginDetail: (info: PluginToDetailInfo) => void
    /** 是否隐藏详情页面 */
    setHiddenDetailPage: (v: boolean) => any

    setAutoOpenDetailTab?: (tab?: string) => void
}
/** @name 插件中心 */
export const PluginHubList: React.FC<PluginHubListProps> = memo((props) => {
    const {rootElementId, isDetail, toPluginDetail, setHiddenDetailPage, setAutoOpenDetailTab} = props

    const userinfo = useStore((s) => s.userInfo)
    const isLogin = useMemo(() => userinfo.isLogin, [userinfo])

    const {queryPagesDataById, removePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            removePagesDataCacheById: s.removePagesDataCacheById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.Plugin_Hub,
            YakitRoute.Plugin_Hub
        )
        if (currentItem && currentItem.pageParamsInfo.pluginHubPageInfo) {
            return currentItem.pageParamsInfo.pluginHubPageInfo
        }
        return undefined
    })

    // 处理指定页面和详情类型功能
    const handleSpecifiedPageAndDetail = useMemoizedFn((data: PluginHubPageInfoProps) => {
        const {tabActive, detailInfo, refeshList, openGroupDrawer} = data
        onSetActive(tabActive || "online", false)
        setOpenGroupDrawer(openGroupDrawer || false)
        if (detailInfo) {
            setAutoOpenDetailTab && setAutoOpenDetailTab(detailInfo.tabActive || undefined)
            setTimeout(() => {
                onClickPlugin({type: tabActive, ...detailInfo})
            }, 200)
        }
        if (refeshList !== undefined) {
            switch (tabActive) {
                case "online":
                    emiter.emit("onRefreshOnlinePluginList", refeshList)
                    break
                case "own":
                    emiter.emit("onRefreshOwnPluginList", refeshList)
                    break
                case "local":
                    emiter.emit("onRefreshLocalPluginList", refeshList)
                    break

                default:
                    break
            }
        }
    })

    const [openGroupDrawer, setOpenGroupDrawer] = useState<boolean>(false)
    useEffect(() => {
        const data = initPageInfo()
        if (data) {
            removePagesDataCacheById(YakitRoute.Plugin_Hub, YakitRoute.Plugin_Hub)
            handleSpecifiedPageAndDetail(data)
            setOpenGroupDrawer(data.openGroupDrawer || false)
        } else {
            onSetActive("online")
        }
    }, [])

    /** ---------- Tabs组件逻辑 Start ---------- */
    // 无详情页的列表tab类型
    const noDetailTabs = useRef<PluginSourceType[]>(["recycle", "setting"])
    // 控制各个列表的初始渲染变量，存在列表对应类型，则代表列表UI已经被渲染
    const rendered = useRef<Set<string>>(new Set())
    const [active, setActive] = useState<PluginSourceType>()
    const [activeHidden, setActiveHidden] = useState<boolean>(false)
    const onSetActive = useMemoizedFn((type: PluginSourceType, isSwitchExpand = true) => {
        setHintShow((val) => {
            for (let key of Object.keys(val)) {
                if (noDetailTabs.current.includes(type)) val[key] = false // 点击后隐藏空内容的 tooltip
                else if (type === "own" && !isLogin) val[key] = false // 点击后隐藏未登录时空内容的 tooltip
                else if (key === type) val[key] = true // 正常展示提示
                else val[key] = false // 无关联类型隐藏提示
            }
            return {...val}
        })
        if (type === active) {
            if (noDetailTabs.current.includes(active)) return
            if (isSwitchExpand) {
                isDetail ? setHiddenDetail((val) => !val) : setActiveHidden((val) => !val)
            }
        } else {
            if (!rendered.current.has(type)) {
                rendered.current.add(type)
            }
            setHiddenDetailPage(noDetailTabs.current.includes(type))
            setActive(type)
        }
    })

    const [hintShow, setHintShow] = useState<Record<string, boolean>>({})
    /** ---------- Tabs组件逻辑 End ---------- */

    /** ---------- 进入插件详情逻辑 Start ---------- */
    const [hiddenDetail, setHiddenDetail] = useState<boolean>(false)
    const onClickPlugin = useMemoizedFn((info: PluginToDetailInfo) => {
        if (!isDetail) {
            setHiddenDetail(false)
        }
        toPluginDetail(info)
    })
    /** ---------- 进入插件详情逻辑 End ---------- */

    /** ---------- 通信监听 Start ---------- */
    /**
     * 打开指定插件列表，并可能打开指定插件的详情
     */
    const handleOpenHubListAndDetail = useMemoizedFn((info: string) => {
        try {
            const data = JSON.parse(info) as unknown as PluginHubPageInfoProps
            if (!data) return
            handleSpecifiedPageAndDetail(data)
        } catch (error) {}
    })

    /**
     * 新建插件保存成功后列表定位到本地，然后更新数据，存在两种情况：
     * 1、本地列表已存在 ，则通信更新数据
     * 2、本地列表不存在，打开本地列表会自动请求最新数据
     */
    const handleUpdatePluginInfo = useMemoizedFn((content: string) => {
        if (rendered.current.has("local")) {
            if (active !== "local") onSetActive("local")
            emiter.emit("editorLocalSaveToLocalList", content)
        } else {
            onSetActive("local")
        }
    })

    useEffect(() => {
        emiter.on("openPluginHubListAndDetail", handleOpenHubListAndDetail)
        emiter.on("editorLocalNewToLocalList", handleUpdatePluginInfo)
        return () => {
            emiter.off("openPluginHubListAndDetail", handleOpenHubListAndDetail)
            emiter.off("editorLocalNewToLocalList", handleUpdatePluginInfo)
        }
    }, [])
    /** ---------- 通信监听 Start ---------- */

    const barHint = useMemoizedFn((key: PluginSourceType, isActive: boolean) => {
        if (isActive) {
            if (noDetailTabs.current.includes(key)) return ""
            if (key === "own" && !isLogin) return ""

            if (isDetail) {
                return hiddenDetail ? "展开详情列表" : "收起详情列表"
            } else {
                return activeHidden ? "展开高级筛选" : "收起高级筛选"
            }
        } else {
            const item = HubSideBarList.find((item) => item.key === key)
            return `点击进入${item ? item.hint : "列表"}`
        }
    })

    return (
        <div className={styles["plugin-hub-list"]}>
            <div className={styles["side-bar-list"]}>
                {HubSideBarList.map((item, index) => {
                    const isActive = item.key === active
                    const hint = barHint(item.key, isActive)
                    const selected =
                        item.key !== "recycle" && active === item.key && (isDetail ? hiddenDetail : activeHidden)
                    const visible = !!hintShow[item.key]
                    return (
                        <Tooltip
                            key={item.key}
                            overlayClassName='plugins-tooltip'
                            title={hint}
                            placement='right'
                            visible={visible}
                            onVisibleChange={(visible) =>
                                setHintShow((val) => {
                                    val[item.key] = visible
                                    return {...val}
                                })
                            }
                        >
                            <div
                                key={item.key}
                                className={classNames(styles["side-bar-list-item"], {
                                    [styles["side-bar-list-item-active"]]: isActive,
                                    [styles["side-bar-list-item-selected"]]: selected
                                })}
                                onClick={() => onSetActive(item.key)}
                            >
                                <span className={styles["item-text"]}>{item.title}</span>
                                {item.icon}
                            </div>
                        </Tooltip>
                    )
                })}
            </div>

            <div className={styles["hub-list-body"]}>
                {rendered.current.has("online") && (
                    <div
                        className={classNames(styles["side-content"], {
                            [styles["side-hidden-content"]]: active !== "online"
                        })}
                    >
                        <HubListOnline
                            hiddenFilter={activeHidden}
                            isDetailList={isDetail}
                            hiddenDetailList={hiddenDetail}
                            onPluginDetail={onClickPlugin}
                        />
                    </div>
                )}

                {rendered.current.has("own") && (
                    <div
                        className={classNames(styles["side-content"], {
                            [styles["side-hidden-content"]]: active !== "own"
                        })}
                    >
                        <HubListOwn
                            hiddenFilter={activeHidden}
                            isDetailList={isDetail}
                            hiddenDetailList={hiddenDetail}
                            onPluginDetail={onClickPlugin}
                        />
                    </div>
                )}

                {rendered.current.has("local") && (
                    <div
                        className={classNames(styles["side-content"], {
                            [styles["side-hidden-content"]]: active !== "local"
                        })}
                    >
                        <HubListLocal
                            rootElementId={rootElementId}
                            hiddenFilter={activeHidden}
                            isDetailList={isDetail}
                            hiddenDetailList={hiddenDetail}
                            onPluginDetail={onClickPlugin}
                            openGroupDrawer={openGroupDrawer}
                            onSetOpenGroupDrawer={setOpenGroupDrawer}
                        />
                    </div>
                )}

                {rendered.current.has("recycle") && (
                    <div
                        className={classNames(styles["side-content"], {
                            [styles["side-hidden-content"]]: active !== "recycle"
                        })}
                    >
                        <HubListRecycle />
                    </div>
                )}

                {rendered.current.has("setting") && (
                    <div
                        className={classNames(styles["side-content"], {
                            [styles["side-hidden-content"]]: active !== "setting"
                        })}
                    >
                        <PluginEnvVariables />
                    </div>
                )}
            </div>
        </div>
    )
})
