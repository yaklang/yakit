import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useControllableValue, useMemoizedFn} from "ahooks"
import {PluginSourceType, PluginToDetailInfo} from "../type"
import {HubListRecycle} from "./HubListRecycle"
import {HubListOwn} from "./HubListOwn"
import {HubListLocal} from "./HubListLocal"
import {HubListOnline} from "./HubListOnline"
import {PageNodeItemProps, PluginHubPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import {useStore} from "@/store"
import {PluginEnvVariables} from "../pluginEnvVariables/PluginEnvVariables"
import {PluginSearchParams} from "@/pages/plugins/baseTemplateType"
import {
    OutlineAdjustmentsIcon,
    OutlineLocalPluginIcon,
    OutlineOnlinePluginIcon,
    OutlineOwnPluginIcon,
    OutlineTrashSecondIcon
} from "@/assets/icon/outline"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"

import classNames from "classnames"
import styles from "./PluginHubList.module.scss"

interface PluginHubListProps {
    /** 根元素的id */
    rootElementId?: string
    active?: PluginSourceType
    setActive: (active: PluginSourceType) => void
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
        onSetActive(tabActive || "online", true)
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
            onSetActive("online", true)
        }
    }, [])

    /** ---------- Tabs组件逻辑 Start ---------- */
    const [active, setActive] = useControllableValue<PluginSourceType>(props, {
        valuePropName: "active",
        trigger: "setActive"
    })
    const activeRef = useRef<PluginSourceType>(active)
    const [hubSideBarList, setHubSideBarList] = useState<YakitTabsProps[]>([
        {
            value: "online",
            label: () => "插件商店",
            icon: <OutlineOnlinePluginIcon />,
            show: true,
            hint: () => "插件商店"
        },
        {value: "own", label: () => "我的", icon: <OutlineOwnPluginIcon />, show: false, hint: () => "我的插件"},
        {value: "local", label: () => "本地", icon: <OutlineLocalPluginIcon />, show: false, hint: () => "本地插件"},
        {value: "setting", label: () => "配置", icon: <OutlineAdjustmentsIcon />, show: false, hint: () => "配置"},
        {value: "recycle", label: () => "回收站", icon: <OutlineTrashSecondIcon />, show: false, hint: () => "回收站"}
    ])
    // 无详情页的列表tab类型
    const noDetailTabs = useRef<PluginSourceType[]>(["recycle", "setting"])
    // 控制各个列表的初始渲染变量，存在列表对应类型，则代表列表UI已经被渲染
    const rendered = useRef<Set<string>>(new Set())
    const [activeHidden, setActiveHidden] = useState<boolean>(false)
    const onSetActive = useMemoizedFn((type: PluginSourceType, openFlag = false) => {
        if (noDetailTabs.current.includes(active) || openFlag || (!isLogin && type === "own")) {
            setHubSideBarList((prev) => {
                prev.forEach((i) => {
                    if (type === i.value) {
                        i.show = true
                    } else {
                        i.show = false
                    }
                })
                return [...prev]
            })
        } else {
            setHubSideBarList((prev) => {
                prev.forEach((i) => {
                    if (type === i.value) {
                        i.show = !i.show
                    } else {
                        i.show = false
                    }
                })
                return [...prev]
            })
        }

        if (type !== active) {
            if (!rendered.current.has(type)) {
                rendered.current.add(type)
            }
            setActive(type)
        }
    })
    useEffect(() => {
        const show = hubSideBarList.find((ele) => ele.value === active)?.show !== false
        if (isDetail) {
            setHiddenDetail(!show)
        } else {
            setActiveHidden(!show)
        }
        setHiddenDetailPage(noDetailTabs.current.includes(active))
        activeRef.current = active
    }, [hubSideBarList, active, isDetail])
    useEffect(() => {
        if (!isLogin && activeRef.current === "own") {
            onSetActive("own", true)
        }
    }, [isLogin])

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
            if (active !== "local") onSetActive("local", true)
            emiter.emit("editorLocalSaveToLocalList", content)
        } else {
            onSetActive("local", true)
        }
    })

    /** 跳转到本地页面并根据搜索条件展示结果 */
    const [localSearchParams, setLocalSearchParams] = useState<PluginSearchParams | undefined>(undefined)
    const onChangeLocal = useMemoizedFn((searchParams?: PluginSearchParams) => {
        setLocalSearchParams(searchParams)
        onSetActive("local", true)
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

    const barHint = useMemoizedFn((key: string) => {
        const item = hubSideBarList.find((item) => item.value === key)
        if (key !== active) {
            return `点击进入${item ? item.hint?.() : "列表"}`
        } else {
            if (noDetailTabs.current.includes(key as PluginSourceType)) return ""
            if (key === "own" && !isLogin) return ""
            if (isDetail) {
                return !item?.show ? "展开详情列表" : "收起详情列表"
            } else {
                return !item?.show ? "展开高级筛选" : "收起高级筛选"
            }
        }
    })

    return (
        <div className={styles["plugin-hub-list"]}>
            <div className={styles["side-bar-list"]}>
                <YakitSideTab
                    yakitTabs={hubSideBarList}
                    activeKey={active}
                    onActiveKey={(v) => onSetActive(v as PluginSourceType)}
                    barHint={barHint}
                />
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
                            onChangeLocal={onChangeLocal}
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
                            externalSearchParams={localSearchParams}
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
