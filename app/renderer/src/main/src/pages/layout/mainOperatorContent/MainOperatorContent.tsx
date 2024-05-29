import React, {useState, useEffect, useRef, useMemo, useImperativeHandle} from "react"
import {Layout, Form, Tooltip} from "antd"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {
    MainOperatorContentProps,
    OnlyPageCache,
    PageCache,
    TabContentProps,
    TabItemProps,
    MultipleNodeInfo,
    TabListProps,
    SubTabListProps,
    SubTabItemProps,
    TabChildrenProps,
    SubTabGroupItemProps,
    GroupRightClickShowContentProps,
    OperateGroup,
    DroppableCloneProps,
    SubTabsProps
} from "./MainOperatorContentType"
import styles from "./MainOperatorContent.module.scss"
import {
    YakitRouteToPageInfo,
    SingletonPageRoute,
    NoPaddingRoute,
    ComponentParams,
    defaultFixedTabs,
    LogOutCloseRoutes
} from "@/routes/newRoute"
import {isEnpriTraceAgent, isBreachTrace, shouldVerifyEnpriTraceLogin} from "@/utils/envfile"
import {useGetState, useInViewport, useLongPress, useMemoizedFn, useThrottleFn, useUpdateEffect} from "ahooks"
import {
    DragDropContext,
    Droppable,
    Draggable,
    DragUpdate,
    ResponderProvided,
    DragStart,
    BeforeCapture,
    DropResult
} from "@hello-pangea/dnd"
import classNames from "classnames"
import _ from "lodash"
import {KeyConvertRoute, routeConvertKey} from "../publicMenu/utils"
import {CheckIcon, OutlinePlusIcon, RemoveIcon, SolidDocumentTextIcon} from "@/assets/newIcon"
import {RouteToPageProps} from "../publicMenu/PublicMenu"
import {YakitSecondaryConfirmProps, useSubscribeClose} from "@/store/tabSubscribe"
import {YakitModalConfirm, showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {defaultUserInfo} from "@/pages/MainOperator"
import {useStore} from "@/store"
import {getRemoteProjectValue, getRemoteValue, setRemoteValue} from "@/utils/kv"
import {UnfinishedBatchTask, UnfinishedSimpleDetectBatchTask} from "@/pages/invoker/batch/UnfinishedBatchTaskList"
import {GroupCount, QueryYakScriptsResponse} from "@/pages/invoker/schema"
import {DownloadAllPlugin} from "@/pages/simpleDetect/SimpleDetect"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import ReactResizeDetector from "react-resize-detector"
import {compareAsc} from "@/pages/yakitStore/viewers/base"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitMenu, YakitMenuItemProps, YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ScrollProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {OutlineChevrondoubleleftIcon, OutlineChevrondoublerightIcon} from "@/assets/icon/outline"

import {FuzzerCacheDataProps, ShareValueProps, getFuzzerCacheData} from "@/pages/fuzzer/HTTPFuzzerPage"
import {AdvancedConfigValueProps} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {RenderFuzzerSequence, RenderSubPage} from "./renderSubPage/RenderSubPage"
import {WebFuzzerType} from "@/pages/fuzzer/WebFuzzerPage/WebFuzzerPageType"
import {FuzzerSequenceCacheDataProps, useFuzzerSequence} from "@/store/fuzzerSequence"
import emiter from "@/utils/eventBus/eventBus"
import {shallow} from "zustand/shallow"
import {menuBodyHeight} from "@/pages/globalVariable"
import {RemoteGV} from "@/yakitGV"
import {PageNodeItemProps, PageProps, defPage, saveFuzzerCache, usePageInfo} from "@/store/pageInfo"
import {startupDuplexConn, closeDuplexConn} from "@/utils/duplex/duplex"
import cloneDeep from "lodash/cloneDeep"
import {onToManageGroup} from "@/pages/securityTool/yakPoC/YakPoC"
import {apiFetchQueryYakScriptGroupLocal} from "@/pages/plugins/utils"
import {PluginGroupType} from "@/pages/plugins/group/PluginGroups"
import {ExpandAndRetractExcessiveState} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {DefFuzzerTableMaxData, defaultAdvancedConfigValue, defaultPostTemplate} from "@/defaultConstants/HTTPFuzzerPage"
import {
    defPluginBatchExecuteExtraFormValue,
    defaultPluginBatchExecutorPageInfo
} from "@/defaultConstants/PluginBatchExecutor"
import {defaultBrutePageInfo} from "@/defaultConstants/NewBrute"
import {defaultScanPortPageInfo} from "@/defaultConstants/NewPortScan"
import {defaultPocPageInfo} from "@/defaultConstants/YakPoC"
import {defaultSpaceEnginePageInfo} from "@/defaultConstants/SpaceEnginePage"
import {defaultSimpleDetectPageInfo} from "@/defaultConstants/SimpleDetectConstants"
import {YakitRoute} from "@/enums/yakitRoute"

const TabRenameModalContent = React.lazy(() => import("./TabRenameModalContent"))
const PageItem = React.lazy(() => import("./renderSubPage/RenderSubPage"))

const {Content} = Layout
const {ipcRenderer} = window.require("electron")

/** 关闭组的提示缓存字段 */
const Close_Group_Tip = "close-group_tip"

const colorList = ["purple", "blue", "lakeBlue", "green", "red", "orange", "bluePurple", "grey"]
const droppable = "droppable"
const droppableGroup = "droppableGroup"
const pageTabItemRightOperation: YakitMenuItemType[] = [
    {
        label: "重命名",
        key: "rename"
    },
    {
        label: "将标签页移动到组",
        key: "addToGroup",
        children: [
            {
                label: "新建组",
                itemIcon: <OutlinePlusIcon />,
                key: "newGroup"
            }
        ]
    },
    // 组内的tab才有下面这个菜单
    // {
    //     label: "从组中移出",
    //     key: "removeFromGroup"
    // },
    {
        type: "divider"
    },
    {
        label: "关闭当前标签页",
        key: "remove"
    },
    {
        label: "关闭其他标签页",
        key: "removeOtherItems"
    }
]

/**
 * 生成组id
 * @returns {string} 生成的组id
 */
export const generateGroupId = (gIndex?: number) => {
    const time = (new Date().getTime() + (gIndex || 0)).toString()
    const groupId = `[${randomString(6)}]-${time}-group`
    return groupId
}

/**
 * @description 通过id在subPage中找到对应的item
 * @returns {currentItem:MultipleNodeInfo,index:number,subIndex:number}
 * */
const getPageItemById = (subPage: MultipleNodeInfo[], id: string) => {
    let current: MultipleNodeInfo = {
        id: "0",
        verbose: "",
        sortFieId: 1,
        groupId: "0"
    }
    let index = -1
    let subIndex = -1
    const l = subPage.length
    for (let i = 0; i < l; i++) {
        const element = subPage[i]
        if (element.id === id) {
            current = {...element}
            index = i
            break
        }
        let isBreak = false
        const groupChildrenList = element.groupChildren || []
        const gLength = groupChildrenList.length
        for (let j = 0; j < gLength; j++) {
            const children = groupChildrenList[j]
            if (children.id === id) {
                current = {...children}
                isBreak = true
                index = i
                subIndex = j
                break
            }
        }
        if (isBreak) break
    }
    return {current, index, subIndex}
}
/**
 * @description 获取组的个数
 * @param subPage
 * @returns {number} 组的个数
 */
const getGroupLength = (subPage) => {
    return subPage.filter((ele) => ele.groupChildren && ele.groupChildren.length > 0).length
}
/**
 * @description 获取当前组的颜色
 * @param subPage
 * @returns {string} 返回颜色
 */
const getColor = (subPage) => {
    const groupLength = getGroupLength(subPage)
    const randNum = groupLength % colorList.length
    return colorList[randNum] || "purple"
}
// 软件初始化时的默认打开页面数据
export const getInitPageCache: () => PageCache[] = () => {
    if (isEnpriTraceAgent()) {
        return []
    }

    if (isBreachTrace()) {
        return [
            {
                routeKey: routeConvertKey(YakitRoute.DB_ChaosMaker, ""),
                verbose: "入侵模拟",
                menuName: YakitRouteToPageInfo[YakitRoute.DB_ChaosMaker].label,
                route: YakitRoute.DB_ChaosMaker,
                singleNode: true,
                multipleNode: []
            }
        ]
    }

    return [
        {
            routeKey: routeConvertKey(YakitRoute.NewHome, ""),
            verbose: "首页",
            menuName: YakitRouteToPageInfo[YakitRoute.NewHome].label,
            route: YakitRoute.NewHome,
            singleNode: true,
            multipleNode: []
        },
        {
            routeKey: routeConvertKey(YakitRoute.DB_HTTPHistory, ""),
            verbose: "History",
            menuName: YakitRouteToPageInfo[YakitRoute.DB_HTTPHistory].label,
            route: YakitRoute.DB_HTTPHistory,
            singleNode: true,
            multipleNode: []
        }
    ]
}

// 软件初始化时的默认当前打开页面的key
export const getInitActiveTabKey = () => {
    if (isEnpriTraceAgent()) {
        return ""
    }
    if (isBreachTrace()) {
        return YakitRoute.DB_ChaosMaker
    }

    return YakitRoute.NewHome
}

/**@description 拖拽样式 */
const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (isDragging) {
        const index = transform.indexOf(",")
        if (index !== -1) transform = transform.substring(0, index) + ",0px)"
    }
    return {
        ...draggableStyle,
        transform
    }
}

const reorder = (list: any[], startIndex: number, endIndex: number) => {
    const result = [...list]
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
}

/**
 * 获取二级菜单所有打开的tab标签页个数
 * @returns {number} total
 */
const getSubPageTotal = (subPage) => {
    let total: number = 0
    subPage.forEach((ele) => {
        if (ele.groupChildren && ele.groupChildren.length > 0) {
            total += ele.groupChildren.length
        } else {
            total += 1
        }
    })
    return total
}

export const MainOperatorContent: React.FC<MainOperatorContentProps> = React.memo((props) => {
    const {routeKeyToLabel} = props

    const [loading, setLoading] = useState(false)

    const {setPagesData, setSelectGroupId, addPagesDataCache, pages, clearAllData, getCurrentSelectPageId} =
        usePageInfo(
            (s) => ({
                setPagesData: s.setPagesData,
                setSelectGroupId: s.setSelectGroupId,
                addPagesDataCache: s.addPagesDataCache,
                pages: s.pages,
                clearAllData: s.clearAllData,
                getCurrentSelectPageId: s.getCurrentSelectPageId
            }),
            shallow
        )

    // tab数据
    const [pageCache, setPageCache, getPageCache] = useGetState<PageCache[]>(_.cloneDeepWith(getInitPageCache()) || [])
    const [currentTabKey, setCurrentTabKey] = useState<YakitRoute | string>(getInitActiveTabKey())

    // 发送到专项漏洞检测modal-show变量
    const [bugTestShow, setBugTestShow] = useState<boolean>(false)
    const [bugList, setBugList] = useState<GroupCount[]>([])
    const [bugTestValue, setBugTestValue] = useState<string>()
    const [bugUrl, setBugUrl] = useState<string>("")

    // 在组件启动的时候，执行一次，用于初始化服务端推送（DuplexConnection）
    useEffect(() => {
        startupDuplexConn()
        return () => {
            // 当组件销毁的时候，关闭DuplexConnection
            closeDuplexConn()
        }
    }, [])

    /** ---------- 新逻辑 start ---------- */

    /**
     * @name 渲染端通信-从顶部菜单里打开一个指定页面
     * @description 本通信方法 替换 老方法"open-route-page-callback"(ipc通信)
     * @description 作用：快速打开一个页面，不带参
     */
    useEffect(() => {
        emiter.on("menuOpenPage", menuOpenPage)
        return () => {
            emiter.off("menuOpenPage", menuOpenPage)
        }
    }, [])

    const menuOpenPage = useMemoizedFn((res: string) => {
        // @ts-ignore
        let data: RouteToPageProps = {}
        try {
            data = JSON.parse(res || "{}")
        } catch (error) {}

        if (!data.route) {
            yakitNotify("error", "menu open page failed!")
            return
        }
        extraOpenMenuPage(data)
    })

    // (创建|更新)-(新建|编辑)-插件编辑器页面的缓存信息
    /**
     * @param source 触发打开页面的父路由
     * @param isUpdate 是否更新缓存数据(不更新则为创建缓存)
     * @param isModify 新建插件还是编辑插件页面
     */
    const cuPluginEditorStorage = useMemoizedFn((source: YakitRoute, isModify?: boolean) => {
        const route: YakitRoute = isModify ? YakitRoute.ModifyYakitScript : YakitRoute.AddYakitScript

        const pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [
                {
                    id: randomString(8),
                    routeKey: route,
                    pageGroupId: "0",
                    pageId: "0",
                    pageName: YakitRouteToPageInfo[route]?.label || "",
                    pageParamsInfo: {
                        pluginInfoEditor: {source: source}
                    },
                    sortFieId: 0
                }
            ],
            routeKey: route,
            singleNode: true
        }
        setPagesData(route, pageNodeInfo)
    })

    /**
     * @name 渲染端通信-打开一个指定页面
     * @description 本通信方法 替换 老方法"fetch-send-to-tab"(ipc通信)
     * @description 作用：快速打开一个页面，带参
     */
    useEffect(() => {
        emiter.on("openPage", onOpenPage)
        return () => {
            emiter.off("openPage", onOpenPage)
        }
    }, [])
    const onOpenPage = useMemoizedFn((res: string) => {
        // @ts-ignore
        let data: {route: YakitRoute; params: any} = {}
        try {
            data = JSON.parse(res || "{}")
        } catch (error) {}

        const {route, params} = data
        switch (route) {
            case YakitRoute.AddYakitScript:
                addYakScript(params)
                break
            case YakitRoute.ModifyYakitScript:
                modifyYakScript(params)
                break
            case YakitRoute.Plugin_Local:
                pluginLocal(params)
                break
            case YakitRoute.Plugin_Store:
                pluginStore(params)
                break
            case YakitRoute.Plugin_Groups:
                pluginGroup(params)
                break
            case YakitRoute.BatchExecutorPage:
                addBatchExecutorPage(params)
                break
            case YakitRoute.Mod_Brute:
                addBrute(params)
                break
            case YakitRoute.Mod_ScanPort:
                addScanPort(params)
                break
            case YakitRoute.PoC:
                /** type 1会打开漏洞检测类型选择  2直接带着数据打开poc页面*/
                if (params.type !== 2) {
                    addBugTest(1, params)
                } else {
                    addPoC(params)
                }

                break
            case YakitRoute.SimpleDetect:
                addSimpleDetect(params)
                break
            default:
                break
        }
    })
    const addSimpleDetect = useMemoizedFn((data) => {
        openMenuPage(
            {route: YakitRoute.SimpleDetect},
            {
                pageParams: {
                    simpleDetectPageInfo: {...data}
                }
            }
        )
    })
    const addScanPort = useMemoizedFn((data) => {
        openMenuPage(
            {route: YakitRoute.Mod_ScanPort},
            {
                pageParams: {
                    scanPortPageInfo: {...data}
                }
            }
        )
    })
    /**弱口令 */
    const addBrute = useMemoizedFn((data) => {
        openMenuPage(
            {route: YakitRoute.Mod_Brute},
            {
                pageParams: {
                    brutePageInfo: {...data}
                }
            }
        )
    })
    /**批量执行 */
    const addBatchExecutorPage = useMemoizedFn((data) => {
        openMenuPage({route: YakitRoute.BatchExecutorPage}, {pageParams: {pluginBatchExecutorPageInfo: data}})
    })
    /**专项漏洞 */
    const addPoC = useMemoizedFn((data) => {
        openMenuPage({route: YakitRoute.PoC}, {pageParams: {pocPageInfo: data}})
    })
    /**
     * @name 新建插件
     * @param source 触发打开页面的父页面路由
     */
    const addYakScript = useMemoizedFn((data: {source: YakitRoute}) => {
        const {source} = data || {}
        const isExist = pageCache.filter((item) => item.route === YakitRoute.AddYakitScript).length
        if (isExist) {
            const modalProps = getSubscribeClose(YakitRoute.AddYakitScript)
            if (modalProps) onModalSecondaryConfirm(modalProps["reset"])
            cuPluginEditorStorage(source, false)
        } else {
            cuPluginEditorStorage(source, false)
        }

        openMenuPage({route: YakitRoute.AddYakitScript})
    })
    /**
     * @name 编辑插件
     * @param source 触发打开页面的父页面路由
     */
    const modifyYakScript = useMemoizedFn((data: {source: YakitRoute; id: number}) => {
        const {source, id} = data || {}
        const isExist = pageCache.filter((item) => item.route === YakitRoute.ModifyYakitScript).length
        if (isExist) {
            emiter.emit("sendEditPluginId", `${id}`)
            const modalProps = getSubscribeClose(YakitRoute.ModifyYakitScript)
            if (modalProps) onModalSecondaryConfirm(modalProps["reset"])
            cuPluginEditorStorage(source, true)
        } else {
            cuPluginEditorStorage(source, true)
        }
        openMenuPage({route: YakitRoute.ModifyYakitScript}, {pageParams: {editPluginId: id}})
    })
    /**
     * @name 本地插件
     * @description 插件商店和我的插件详情中点击去使用,传线上的UUID,传入本地详情进行使用
     * @param uuid 用于本地插件定位uuid对应的插件详情位置
     */
    const pluginLocal = useMemoizedFn((data: {uuid: string}) => {
        const {uuid} = data || {}

        if (uuid) {
            // uuid存在的，先将数据缓存至数据中心,后再打开页面
            const newPageNode: PageNodeItemProps = {
                id: `${randomString(8)}`,
                routeKey: YakitRoute.Plugin_Local,
                pageGroupId: "0",
                pageId: YakitRoute.Plugin_Local, // 用路由key作为页面id
                pageName: YakitRouteToPageInfo[YakitRoute.Plugin_Local]?.label || "",
                pageParamsInfo: {
                    pluginLocalPageInfo: {
                        uuid
                    }
                },
                sortFieId: 0
            }
            const pages: PageProps = {
                ...cloneDeep(defPage),
                routeKey: YakitRoute.Plugin_Local,
                singleNode: true,
                pageList: [newPageNode]
            }
            setPagesData(YakitRoute.Plugin_Local, pages)
        }
        emiter.emit("onRefLocalPluginList", "")
        openMenuPage({route: YakitRoute.Plugin_Local})
    })
    /**
     * @name 插件商店
     * @description 首页的统计模块，点击需要携带搜索参数跳转插件商店页面
     * @param {string} keyword 携带的关键字搜索条件
     * @param {string} plugin_type 携带的插件类型搜索条件
     */
    const pluginStore = useMemoizedFn((data: {keyword: string; plugin_type: string}) => {
        const {keyword, plugin_type} = data || {}

        if (keyword || plugin_type) {
            // 缓存搜索条件
            const newPageNode: PageNodeItemProps = {
                id: `${randomString(8)}`,
                routeKey: YakitRoute.Plugin_Store,
                pageGroupId: "0",
                pageId: YakitRoute.Plugin_Store, // 用路由key作为页面id
                pageName: YakitRouteToPageInfo[YakitRoute.Plugin_Store]?.label || "",
                pageParamsInfo: {
                    pluginOnlinePageInfo: {
                        keyword: keyword || "",
                        plugin_type: plugin_type || ""
                    }
                },
                sortFieId: 0
            }
            const pages: PageProps = {
                ...cloneDeep(defPage),
                routeKey: YakitRoute.Plugin_Store,
                singleNode: true,
                pageList: [newPageNode]
            }
            setPagesData(YakitRoute.Plugin_Store, pages)
        }
        openMenuPage({route: YakitRoute.Plugin_Store})
    })

    const pluginGroup = useMemoizedFn((data: {pluginGroupType: PluginGroupType}) => {
        const {pluginGroupType = "local"} = data || {}
        openMenuPage(
            {route: YakitRoute.Plugin_Groups},
            {
                pageParams: {
                    pluginGroupType
                }
            }
        )
    })

    /** @name 渲染端通信-关闭一个指定页面 */
    useEffect(() => {
        emiter.on("closePage", onClosePage)
        return () => {
            emiter.off("closePage", onClosePage)
        }
    }, [])
    const onClosePage = useMemoizedFn((res: string) => {
        // @ts-ignore
        let data: {route: YakitRoute} = {}
        try {
            data = JSON.parse(res || "{}")
        } catch (error) {}

        const {route} = data
        switch (route) {
            case YakitRoute.AddYakitScript:
            case YakitRoute.ModifyYakitScript:
                // 判断页面是由谁触发打开的
                const targetCache: PageNodeItemProps = (pages.get(route)?.pageList || [])[0]
                let next: YakitRoute | undefined = undefined
                if (targetCache?.pageParamsInfo && targetCache.pageParamsInfo?.pluginInfoEditor) {
                    next = targetCache.pageParamsInfo.pluginInfoEditor?.source
                }
                removeMenuPage({route: route, menuName: ""}, next ? {route: next, menuName: ""} : undefined)
                break
            default:
                removeMenuPage({route: route, menuName: ""})
                break
        }
    })

    /** ---------- 新逻辑 end ---------- */

    // 打开tab页面
    useEffect(() => {
        // 写成HOC是否好点呢，现在一个页面启动就是一个函数
        ipcRenderer.on("fetch-send-to-tab", (e, res: any) => {
            const {type, data = {}} = res
            if (type === "fuzzer") addFuzzer(data)
            if (type === "websocket-fuzzer") addWebsocketFuzzer(data)
            if (type === "plugin-store") addYakRunning(data)
            if (type === "batch-exec-recover") addBatchExecRecover(data as UnfinishedBatchTask)
            if (type === "simple-batch-exec-recover") addSimpleBatchExecRecover(data as UnfinishedSimpleDetectBatchTask)
            if (type === "add-yakit-script") addYakScript(data)
            if (type === "facade-server") addFacadeServer(data)
            if (type === "add-yak-running") addYakRunning(data)
            if (type === "add-data-compare") addDataCompare(data)
            if (type === "**screen-recorder") openMenuPage({route: YakitRoute.ScreenRecorderPage})
            if (type === "**chaos-maker") openMenuPage({route: YakitRoute.DB_ChaosMaker})
            if (type === "**debug-plugin") addPluginDebugger(data)
            if (type === "**debug-monaco-editor") openMenuPage({route: YakitRoute.Beta_DebugMonacoEditor})
            if (type === "**vulinbox-manager") openMenuPage({route: YakitRoute.Beta_VulinboxManager})
            if (type === "**diagnose-network") openMenuPage({route: YakitRoute.Beta_DiagnoseNetwork})
            if (type === "**config-network") openMenuPage({route: YakitRoute.Beta_ConfigNetwork})
            if (type === "**beta-debug-traffic-analize") openMenuPage({route: YakitRoute.Beta_DebugTrafficAnalize})
            if (type === "**webshell-manager") openMenuPage({route: YakitRoute.Beta_WebShellManager})
            if (type === "**webshell-opt") addWebShellOpt(data)

            if (type === "open-plugin-store") {
                const flag = getPageCache().filter((item) => item.route === YakitRoute.Plugin_Store).length
                if (flag === 0) {
                    openMenuPage({route: YakitRoute.Plugin_Store})
                } else {
                    // 该方法在能保证route不是YakitRoute.Plugin_OP时,menuName可以传空字符
                    removeMenuPage({route: YakitRoute.AddYakitScript, menuName: ""})
                    setTimeout(() => ipcRenderer.invoke("send-local-script-list"), 50)
                }
            }
            if (type === YakitRoute.HTTPHacker) {
                openMenuPage({route: YakitRoute.HTTPHacker})
            }
            if (type === YakitRoute.DB_HTTPHistory) {
                openMenuPage({route: YakitRoute.DB_HTTPHistory})
            }
            if (type === YakitRoute.DB_Risk) {
                openMenuPage({route: YakitRoute.DB_Risk})
            }
            if (type === YakitRoute.DNSLog) {
                openMenuPage({route: YakitRoute.DNSLog})
            }
            if (type === YakitRoute.BatchExecutorPage) {
                openMenuPage(
                    {route: YakitRoute.BatchExecutorPage},
                    {
                        pageParams: {
                            ...data
                        }
                    }
                )
            }
            console.info("send to tab: ", type)
        })

        return () => {
            ipcRenderer.removeAllListeners("fetch-send-to-tab")
        }
    }, [])

    const addWebShellOpt = useMemoizedFn((res: any) => {
        const {Id} = res || {}
        if (Id) {
            openMenuPage(
                {route: YakitRoute.Beta_WebShellOpt},
                {
                    pageParams: {
                        id: Id,
                        webshellInfo: res
                    },
                    hideAdd: true
                }
            )
        }
    })
    /** ---------- 增加tab页面 start ---------- */
    /** Global Sending Function(全局发送功能|通过发送新增功能页面)*/
    const addFuzzer = useMemoizedFn(async (res: any) => {
        const {isHttps, isGmTLS, request, advancedConfigValue, openFlag = true, isCache = true} = res || {}
        const cacheData: FuzzerCacheDataProps = (await getFuzzerCacheData()) || {
            proxy: [],
            dnsServers: [],
            etcHosts: [],
            advancedConfigShow: null,
            resNumlimit: DefFuzzerTableMaxData
        }
        let newAdvancedConfigValue = {
            ...advancedConfigValue
        }
        if (isCache) {
            newAdvancedConfigValue.proxy = cacheData.proxy
            newAdvancedConfigValue.dnsServers = cacheData.dnsServers
            newAdvancedConfigValue.etcHosts = cacheData.etcHosts
            newAdvancedConfigValue.resNumlimit = cacheData.resNumlimit
        }
        let newAdvancedConfigShow = cacheData.advancedConfigShow
        let newIsHttps = !!isHttps
        let newIsGmTLS = !!isGmTLS
        let newRequest = request || defaultPostTemplate
        // 有分享内容，数据以分享内容为准
        if (res.hasOwnProperty("shareContent")) {
            try {
                const shareContent: ShareValueProps = JSON.parse(res.shareContent)
                newIsHttps = shareContent.advancedConfiguration.isHttps
                newIsGmTLS = shareContent.advancedConfiguration.isGmTLS
                newRequest = shareContent.request || defaultPostTemplate

                newAdvancedConfigValue = shareContent.advancedConfiguration
                newAdvancedConfigShow = shareContent.advancedConfigShow
                if (shareContent.hasOwnProperty("advancedConfig")) {
                    // 兼容只有【配置】的时候的高级配置显隐,低版本分享给高版本
                    newAdvancedConfigShow = {
                        config: shareContent["advancedConfig"],
                        rule: true
                    }
                }
            } catch (error) {}
        }
        openMenuPage(
            {route: YakitRoute.HTTPFuzzer},
            {
                openFlag,
                pageParams: {
                    request: newRequest,
                    system: system,
                    advancedConfigValue: {
                        ...newAdvancedConfigValue,
                        isHttps: newIsHttps,
                        isGmTLS: newIsGmTLS
                    },
                    advancedConfigShow: newAdvancedConfigShow
                }
            }
        )
    })
    /** websocket fuzzer 和 Fuzzer 类似 */
    const addWebsocketFuzzer = useMemoizedFn(
        (res: {tls: boolean; request: Uint8Array; openFlag?: boolean; toServer?: Uint8Array}) => {
            openMenuPage(
                {route: YakitRoute.WebsocketFuzzer},
                {
                    openFlag: res.openFlag,
                    pageParams: {
                        wsToServer: res.toServer,
                        wsRequest: res.request,
                        wsTls: res.tls
                    }
                }
            )
        }
    )
    /** 数据对比*/
    const addDataCompare = useMemoizedFn((res: {leftData: string; rightData: string}) => {
        openMenuPage(
            {route: YakitRoute.DataCompare},
            {
                pageParams: {
                    leftData: res.leftData,
                    rightData: res.rightData
                }
            }
        )
    })

    const addBugTest = useMemoizedFn((type: number, res?: any) => {
        const {URL = ""} = res || {}
        if (type === 1 && URL) {
            setBugUrl(URL)
            apiFetchQueryYakScriptGroupLocal(false)
                .then((res) => {
                    setBugList(res)
                    setBugTestShow(true)
                })
                .catch((err) => yakitNotify("error", "获取插件组失败:" + err))
        }
        if (type === 2) {
            openMenuPage(
                {route: YakitRoute.PoC},
                {
                    pageParams: {
                        pocPageInfo: {
                            ...defaultPocPageInfo,
                            selectGroup: bugTestValue ? [bugTestValue] : [],
                            formValue: {
                                Targets: {
                                    ...cloneDeep(defPluginBatchExecuteExtraFormValue),
                                    Input: bugUrl ? JSON.parse(bugUrl).join(",") : ""
                                }
                            }
                        }
                    }
                }
            )
            setBugTestValue("")
            setBugUrl("")
        }
    })
    const addYakRunning = useMemoizedFn((res: any) => {
        const {name = "", code = ""} = res || {}
        const filter = pageCache.filter((item) => item.route === YakitRoute.YakScript)

        if (!name || !code) return false

        if ((filter || []).length === 0) {
            openMenuPage({route: YakitRoute.YakScript})
            setTimeout(() => {
                ipcRenderer.invoke("send-to-yak-running", {name, code})
            }, 300)
        } else {
            ipcRenderer.invoke("send-to-yak-running", {name, code})
            setCurrentTabKey(YakitRoute.YakScript)
        }
    })
    const addBatchExecRecover = useMemoizedFn((task: UnfinishedBatchTask) => {
        openMenuPage(
            {route: YakitRoute.BatchExecutorRecover},
            {
                pageParams: {
                    recoverUid: task.Uid,
                    recoverBaseProgress: task.Percent
                },
                hideAdd: true
            }
        )
    })
    const addSimpleBatchExecRecover = useMemoizedFn((task: UnfinishedSimpleDetectBatchTask) => {
        openMenuPage(
            {route: YakitRoute.SimpleDetect},
            {
                pageParams: {
                    recoverUid: task.Uid,
                    recoverBaseProgress: task.Percent,
                    recoverOnlineGroup: task.YakScriptOnlineGroup,
                    recoverTaskName: task.TaskName
                },
                hideAdd: true
            }
        )
    })

    const addFacadeServer = useMemoizedFn((res: any) => {
        const {facadeParams, classParam, classType} = res || {}
        if (facadeParams && classParam && classType) {
            openMenuPage(
                {route: YakitRoute.ReverseServer_New},
                {
                    pageParams: {
                        facadeServerParams: facadeParams,
                        classGeneraterParams: classParam,
                        classType: classType
                    }
                }
            )
        }
    })
    /** 插件调试 */
    const addPluginDebugger = useMemoizedFn((res: any) => {
        const {generateYamlTemplate = false, YamlContent = "", scriptName = ""} = res || {}
        openMenuPage(
            {route: YakitRoute.Beta_DebugPlugin},
            {
                pageParams: {
                    generateYamlTemplate,
                    YamlContent,
                    scriptName
                }
            }
        )
    })
    /**
     * @name 远程通信打开一个页面(新逻辑)
     */
    useEffect(() => {
        ipcRenderer.on("open-route-page-callback", (e, info: RouteToPageProps) => {
            extraOpenMenuPage(info)
        })
        return () => {
            ipcRenderer.removeAllListeners("open-route-page-callback")
        }
    }, [])
    /** ---------- 增加tab页面 end ---------- */

    /** ---------- 远程关闭一级页面 end ---------- */
    // 没看过逻辑
    useEffect(() => {
        ipcRenderer.on("fetch-close-tab", (e, res: any) => {
            const {router, name} = res
            removeMenuPage({route: router, menuName: name || ""})
        })
        ipcRenderer.on("fetch-close-all-tab", () => {
            // delFuzzerList(1)
            setPageCache(getInitPageCache())
            setCurrentTabKey(getInitActiveTabKey())
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-close-tab")
            ipcRenderer.removeAllListeners("fetch-close-all-tab")
        }
    }, [])
    /** ---------- 远程关闭一级页面 end ---------- */

    /** ---------- @name 全局功能快捷键 Start ---------- */
    const documentKeyDown = useMemoizedFn((e: KeyboardEvent) => {
        // ctrl/command + w 关闭当前页面
        e.stopPropagation()
        if (e.code === "KeyW" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if (pageCache.length === 0 || defaultFixedTabs.includes(currentTabKey as YakitRoute)) return
            const data = KeyConvertRoute(currentTabKey)
            if (data) {
                const info: OnlyPageCache = {
                    route: data.route,
                    menuName:
                        data.route === YakitRoute.Plugin_OP
                            ? data.pluginName || ""
                            : YakitRouteToPageInfo[data.route]?.label || "",
                    pluginId: data.pluginId,
                    pluginName: data.pluginName
                }
                onBeforeRemovePage(info)
            }
            return
        }
    })
    useEffect(() => {
        document.addEventListener("keydown", documentKeyDown)
        return () => {
            document.removeEventListener("keydown", documentKeyDown)
        }
    }, [])
    /** ---------- @name 全局功能快捷键 End ---------- */

    /** ---------- 操作系统 start ---------- */
    // 系统类型
    const [system, setSystem] = useState<string>("")
    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
    }, [])
    /** ---------- 操作系统 end ---------- */

    /** ---------- 一级页面的逻辑 start ---------- */

    /** @name 打开一个菜单项页面(只负责打开，如果判断页面是否打开，应在执行该方法前判断) */
    const openMenuPage = useMemoizedFn(
        (
            routeInfo: RouteToPageProps,
            nodeParams?: {
                openFlag?: boolean
                verbose?: string
                hideAdd?: boolean
                pageParams?: ComponentParams
            }
        ) => {
            const {route, pluginId = 0, pluginName = ""} = routeInfo
            // 默认会打开新菜单
            let openFlag = true
            if (nodeParams?.openFlag !== undefined) {
                openFlag = nodeParams?.openFlag
            }
            // 菜单在代码内的名字
            const menuName = route === YakitRoute.Plugin_OP ? pluginName : YakitRouteToPageInfo[route]?.label || ""
            if (!menuName) return

            const filterPage = pageCache.filter((item) => item.route === route && item.menuName === menuName)
            // 单开页面
            if (SingletonPageRoute.includes(route)) {
                const key = routeConvertKey(route, pluginName)
                // 如果存在，设置为当前页面
                if (filterPage.length > 0) {
                    openFlag && setCurrentTabKey(key)
                    return
                }
                const tabName = routeKeyToLabel.get(key) || menuName
                setPageCache([
                    ...pageCache,
                    {
                        routeKey: key,
                        verbose: tabName,
                        menuName: menuName,
                        route: route,
                        singleNode: true,
                        multipleNode: [],
                        pageParams: nodeParams?.pageParams
                    }
                ])
                openFlag && setCurrentTabKey(key)
            } else {
                // 多开页面
                const key = routeConvertKey(route, pluginName)
                let tabName = routeKeyToLabel.get(key) || menuName

                const time = new Date().getTime().toString()
                const tabId = `${key}-[${randomString(6)}]-${time}`

                let verbose =
                    nodeParams?.verbose ||
                    `${tabName}-[${filterPage.length > 0 ? (filterPage[0].multipleLength || 0) + 1 : 1}]`
                if (route === YakitRoute.HTTPFuzzer) {
                    // webFuzzer页面二级tab名称改为WF，特殊
                    verbose =
                        nodeParams?.verbose ||
                        `WF-[${filterPage.length > 0 ? (filterPage[0].multipleLength || 0) + 1 : 1}]`
                }
                const node: MultipleNodeInfo = {
                    id: tabId,
                    verbose,
                    time,
                    pageParams: {
                        ...nodeParams?.pageParams,
                        id: tabId,
                        groupId: "0"
                    },
                    groupId: "0",
                    sortFieId: filterPage.length || 1
                }
                if (filterPage.length > 0) {
                    const pages: PageCache[] = []
                    let order: number = 0
                    pageCache.forEach((item, i) => {
                        const eleItem: PageCache = {...item, multipleNode: [...item.multipleNode]}
                        if (eleItem.route === route && eleItem.menuName === menuName) {
                            eleItem.pluginId = pluginId
                            eleItem.multipleNode.push({...node})
                            eleItem.multipleLength = (eleItem.multipleLength || 0) + 1
                            order = eleItem.multipleNode.length
                            eleItem.openFlag = openFlag
                        }
                        pages.push({...eleItem})
                    })
                    //  请勿随意调整执行顺序，先加页面的数据，再新增页面，以便于设置页面初始值
                    switch (route) {
                        case YakitRoute.HTTPFuzzer:
                            addFuzzerList(node.id, node, order)
                            break
                        case YakitRoute.Space_Engine:
                            onSetSpaceEngineData(node, order)
                            break
                        case YakitRoute.PoC:
                            onSetPocData(node, order)
                            break
                        case YakitRoute.BatchExecutorPage:
                            onBatchExecutorPage(node, order)
                            break
                        case YakitRoute.Mod_Brute:
                            onBrutePage(node, order)
                            break
                        case YakitRoute.Mod_ScanPort:
                            onScanPortPage(node, order)
                            break
                        case YakitRoute.SimpleDetect:
                            onSetSimpleDetectData(node, order)
                            break
                        default:
                            break
                    }
                    setPageCache([...pages])
                    openFlag && setCurrentTabKey(key)
                } else {
                    //  请勿随意调整执行顺序，先加页面的数据，再新增页面，以便于设置页面初始值

                    switch (route) {
                        case YakitRoute.HTTPFuzzer:
                            addFuzzerList(node.id, node, 1)
                            break
                        case YakitRoute.Space_Engine:
                            onSetSpaceEngineData(node, 1)
                            break
                        case YakitRoute.PoC:
                            onSetPocData(node, 1)
                            break
                        case YakitRoute.BatchExecutorPage:
                            onBatchExecutorPage(node, 1)
                            break
                        case YakitRoute.Mod_Brute:
                            onBrutePage(node, 1)
                            break
                        case YakitRoute.Mod_ScanPort:
                            onScanPortPage(node, 1)
                            break
                        case YakitRoute.SimpleDetect:
                            onSetSimpleDetectData(node, 1)
                            break
                        default:
                            break
                    }
                    setPageCache([
                        ...pageCache,
                        {
                            routeKey: key,
                            verbose: tabName,
                            menuName: menuName,
                            route: route,
                            pluginId: pluginId,
                            pluginName: route === YakitRoute.Plugin_OP ? pluginName || "" : undefined,
                            singleNode: undefined,
                            multipleNode: [{...node}],
                            multipleLength: 1,
                            hideAdd: nodeParams?.hideAdd
                        }
                    ])
                    openFlag && setCurrentTabKey(key)
                }
            }
        }
    )
    const onBatchExecutorPage = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.BatchExecutorPage,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                pluginBatchExecutorPageInfo: node.pageParams?.pluginBatchExecutorPageInfo
                    ? {
                          ...defaultPluginBatchExecutorPageInfo,
                          ...node.pageParams.pluginBatchExecutorPageInfo
                      }
                    : undefined
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.BatchExecutorPage, newPageNode)
    })

    const onBrutePage = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.Mod_Brute,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                brutePageInfo: node.pageParams?.brutePageInfo
                    ? {
                          ...defaultBrutePageInfo,
                          ...node.pageParams.brutePageInfo
                      }
                    : undefined
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.Mod_Brute, newPageNode)
    })
    const onScanPortPage = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.Mod_ScanPort,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                scanPortPageInfo: node.pageParams?.scanPortPageInfo
                    ? {
                          ...defaultScanPortPageInfo,
                          ...node.pageParams.scanPortPageInfo
                      }
                    : undefined
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.Mod_ScanPort, newPageNode)
    })
    /** @name 多开页面的额外处理逻辑(针对web-fuzzer页面) */
    const openMultipleMenuPage = useMemoizedFn((routeInfo: RouteToPageProps) => {
        switch (routeInfo.route) {
            case YakitRoute.HTTPFuzzer:
                addFuzzer({})
                break

            default:
                openMenuPage(routeInfo)
                break
        }
    })
    /** @name 判断页面是否打开，打开则定位该页面，未打开则打开页面 */
    const extraOpenMenuPage = useMemoizedFn((routeInfo: RouteToPageProps) => {
        if (SingletonPageRoute.includes(routeInfo.route)) {
            const flag =
                pageCache.filter(
                    (item) => item.route === routeInfo.route && (item.pluginName || "") === (routeInfo.pluginName || "")
                ).length === 0
            if (flag) openMenuPage(routeInfo)
            else {
                setCurrentTabKey(
                    routeInfo.route === YakitRoute.Plugin_OP
                        ? routeConvertKey(routeInfo.route, routeInfo.pluginName || "")
                        : routeInfo.route
                )
            }
        } else {
            openMultipleMenuPage(routeInfo)
        }
    })
    const {getSubscribeClose, removeSubscribeClose} = useSubscribeClose()
    const {clearDataByRoute} = usePageInfo(
        (s) => ({
            clearDataByRoute: s.clearDataByRoute
        }),
        shallow
    )
    /** @description 多开页面的一级页面关闭事件 */
    const onBeforeRemovePage = useMemoizedFn((data: OnlyPageCache) => {
        switch (data.route) {
            case YakitRoute.AddYakitScript:
            case YakitRoute.ModifyYakitScript:
            case YakitRoute.HTTPFuzzer:
                const modalProps = getSubscribeClose(data.route)
                if (modalProps) onModalSecondaryConfirm(modalProps["close"])
                break

            default:
                removeMenuPage(data)
                break
        }
    })
    /**
     * @name 移除一级页面
     * @param assignRoute 删除页面后指定某个页面展示(如果指定页面未打开则执行正常流程)
     */
    const removeMenuPage = useMemoizedFn((data: OnlyPageCache, assignPage?: OnlyPageCache) => {
        // 获取需要关闭页面的索引
        const index = pageCache.findIndex((item) => {
            if (data.route === YakitRoute.Plugin_OP) {
                return item.route === data.route && item.menuName === data.menuName
            } else {
                return item.route === data.route
            }
        })
        if (index === -1) return

        let activeIndex: number = -1

        // 如果有指定关闭后展示的页面，执行该逻辑
        if (assignPage) {
            activeIndex = pageCache.findIndex((item) => {
                if (assignPage.route === YakitRoute.Plugin_OP) {
                    return item.route === assignPage.route && item.menuName === assignPage.menuName
                } else {
                    return item.route === assignPage.route
                }
            })
        }
        if (activeIndex === -1) {
            if (index > 0 && getPageCache()[index - 1]) activeIndex = index - 1
            if (index === 0 && getPageCache()[index + 1]) activeIndex = index + 1
        }

        // 获取关闭页面后展示页面的信息
        const {route, pluginId = 0, pluginName = ""} = getPageCache()[activeIndex]
        const key = routeConvertKey(route, pluginName)
        if (currentTabKey === routeConvertKey(data.route, data.pluginName)) {
            setCurrentTabKey(key)
        }
        if (index === 0 && getPageCache().length === 1) setCurrentTabKey("" as any)

        setPageCache(
            getPageCache().filter((i) => {
                if (data.route === YakitRoute.Plugin_OP) {
                    return !(i.route === data.route && i.menuName === data.menuName)
                } else {
                    return !(i.route === data.route)
                }
            })
        )
        removeSubscribeClose(data.route)
        // 关闭一级页面时,清除缓存
        clearDataByRoute(data.route)
        if (data.route === YakitRoute.HTTPFuzzer) {
            clearFuzzerSequence()
        }
    })

    /** ---------- 一级页面的逻辑 end ---------- */

    /** ---------- 登录状态变化的逻辑 start ---------- */
    const {userInfo, setStoreUserInfo} = useStore()
    const IsEnpriTrace = shouldVerifyEnpriTraceLogin()
    useEffect(() => {
        ipcRenderer.on("login-out", (e) => {
            setStoreUserInfo(defaultUserInfo)
            if (IsEnpriTrace) {
                ipcRenderer.invoke("update-judge-license", true)
                // 只要路由不是Plugin_OP,可以把menuName设置为空字符
                removeMenuPage({route: YakitRoute.AccountAdminPage, menuName: ""})
                removeMenuPage({route: YakitRoute.RoleAdminPage, menuName: ""})
                removeMenuPage({route: YakitRoute.HoleCollectPage, menuName: ""})
                removeMenuPage({route: YakitRoute.ControlAdminPage, menuName: ""})
            } else {
                // 只要路由不是Plugin_OP,可以把menuName设置为空字符
                removeMenuPage({route: YakitRoute.LicenseAdminPage, menuName: ""})
                removeMenuPage({route: YakitRoute.TrustListPage, menuName: ""})
            }
            IsEnpriTrace ? setRemoteValue("token-online-enterprise", "") : setRemoteValue("token-online", "")
        })
        return () => {
            ipcRenderer.removeAllListeners("login-out")
        }
    }, [])
    // 登录用户非高权限时，软件已打开的高权限页面需自动关闭
    useEffect(() => {
        const {isLogin} = userInfo
        if (!isLogin) {
            for (let item of LogOutCloseRoutes) {
                removeMenuPage({route: item, menuName: ""})
            }
        }
    }, [userInfo])
    /** ---------- 登录状态变化的逻辑 end ---------- */
    /** ---------- 简易企业版 start ---------- */
    useEffect(() => {
        if (isEnpriTraceAgent()) {
            // 简易企业版页面控制
            extraOpenMenuPage({route: YakitRoute.SimpleDetect})
            // 简易企业版判断本地插件数-导入弹窗
            const newParams = {
                Type: "yak,mitm,codec,packet-hack,port-scan",
                Keyword: "",
                Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"},
                UserId: 0
            }
            ipcRenderer.invoke("QueryYakScript", newParams).then((item: QueryYakScriptsResponse) => {
                if (item.Data.length === 0) {
                    const m = showYakitModal({
                        title: "导入插件",
                        type: "white",
                        content: <DownloadAllPlugin onClose={() => m.destroy()} />,
                        bodyStyle: {padding: 24},
                        footer: null
                    })
                    return m
                }
            })
        }

        if (isBreachTrace()) {
            extraOpenMenuPage({route: YakitRoute.DB_ChaosMaker})
        }
    }, [])
    /** ---------- 简易企业版 end ---------- */

    /** ---------- web-fuzzer 缓存逻辑 start ---------- */
    const {setFuzzerSequenceCacheData, clearFuzzerSequence, addFuzzerSequenceCacheData} = useFuzzerSequence(
        (s) => ({
            setFuzzerSequenceCacheData: s.setFuzzerSequenceCacheData,
            clearFuzzerSequence: s.clearFuzzerSequence,
            addFuzzerSequenceCacheData: s.addFuzzerSequenceCacheData
        }),
        shallow
    )
    // fuzzer-tab页数据订阅事件
    const unFuzzerCacheData = useRef<any>(null)
    // web-fuzzer多开页面缓存数据
    useEffect(() => {
        if (!isEnpriTraceAgent()) {
            // 触发获取web-fuzzer的缓存
            fetchFuzzerList()
        }
        getFuzzerSequenceCache()
        // 开启fuzzer-tab页内数据的订阅事件
        if (unFuzzerCacheData.current) {
            unFuzzerCacheData.current()
        }
        unFuzzerCacheData.current = usePageInfo.subscribe(
            (state) => state.pages.get("httpFuzzer") || [],
            (selectedState, previousSelectedState) => {
                saveFuzzerCache(selectedState)
            }
        )

        return () => {
            // 注销fuzzer-tab页内数据的订阅事件
            if (unFuzzerCacheData.current) {
                unFuzzerCacheData.current()
                unFuzzerCacheData.current = null
            }
        }
    }, [])

    const getFuzzerSequenceCache = useMemoizedFn(() => {
        getRemoteProjectValue(RemoteGV.FuzzerSequenceCache).then((res: any) => {
            try {
                clearFuzzerSequence()
                const cache = JSON.parse(res || "[]")
                setFuzzerSequenceCacheData(cache)
            } catch (error) {
                yakitNotify("error", "webFuzzer序列化获取缓存数据解析失败:" + error)
            }
        })
    })

    // 获取数据库中缓存的web-fuzzer页面信息
    const fetchFuzzerList = useMemoizedFn(async () => {
        try {
            // 如果路由中已经存在webFuzzer页面，则不需要再从缓存中初始化页面
            if (pageCache.findIndex((ele) => ele.route === YakitRoute.HTTPFuzzer) !== -1) return

            setLoading(true)
            const cacheData: FuzzerCacheDataProps = (await getFuzzerCacheData()) || {
                proxy: [],
                dnsServers: [],
                etcHosts: [],
                advancedConfigShow: null,
                resNumlimit: DefFuzzerTableMaxData
            }
            const defaultCache = {
                proxy: cacheData.proxy,
                dnsServers: cacheData.dnsServers,
                etcHosts: cacheData.etcHosts,
                resNumlimit: cacheData.resNumlimit
            }
            getRemoteProjectValue(RemoteGV.FuzzerCache)
                .then((res: any) => {
                    clearAllData()
                    const cache = JSON.parse(res || "[]")
                    // 菜单在代码内的名字
                    const menuName = YakitRouteToPageInfo[YakitRoute.HTTPFuzzer]?.label || ""
                    const key = routeConvertKey(YakitRoute.HTTPFuzzer, "")
                    const tabName = routeKeyToLabel.get(key) || menuName
                    let pageNodeInfo: PageProps = {
                        ...cloneDeep(defPage),
                        currentSelectPageId: getCurrentSelectPageId(YakitRoute.HTTPFuzzer) || "",
                        routeKey: YakitRoute.HTTPFuzzer
                    }
                    let multipleNodeListLength: number = 0
                    const multipleNodeList: MultipleNodeInfo[] = cache.filter((ele) => ele.groupId === "0")
                    const pLength = multipleNodeList.length
                    for (let index = 0; index < pLength; index++) {
                        const parentItem: MultipleNodeInfo = multipleNodeList[index]
                        const childrenList = cache.filter((ele) => ele.groupId === parentItem.id)
                        const cLength = childrenList.length
                        const groupChildrenList: MultipleNodeInfo[] = []

                        for (let j = 0; j < cLength; j++) {
                            const childItem: MultipleNodeInfo = childrenList[j]
                            const nodeItem = {
                                ...childItem
                            }
                            groupChildrenList.push({...nodeItem})
                            const newNodeItem = {
                                id: `${randomString(8)}-${j + 1}`,
                                routeKey: YakitRoute.HTTPFuzzer,
                                pageGroupId: nodeItem.groupId,
                                pageId: nodeItem.id,
                                pageName: nodeItem.verbose,
                                pageParamsInfo: {
                                    webFuzzerPageInfo: {
                                        pageId: nodeItem.id,
                                        advancedConfigValue: {
                                            ...defaultAdvancedConfigValue,
                                            ...defaultCache,
                                            ...nodeItem.pageParams
                                        },
                                        advancedConfigShow: cacheData.advancedConfigShow,
                                        request: nodeItem.pageParams?.request || ""
                                    }
                                },
                                sortFieId: nodeItem.sortFieId,
                                expand: nodeItem.expand,
                                color: nodeItem.color
                            }
                            pageNodeInfo.pageList.push(newNodeItem)
                        }
                        if (cLength > 0) {
                            multipleNodeListLength += cLength
                        } else {
                            multipleNodeListLength += 1
                            parentItem.pageParams = {
                                ...parentItem.pageParams
                            }
                        }
                        parentItem.groupChildren = groupChildrenList.sort((a, b) => compareAsc(a, b, "sortFieId"))

                        const pageListItem = {
                            id: `${randomString(8)}-${index + 1}`,
                            routeKey: YakitRoute.HTTPFuzzer,
                            pageGroupId: parentItem.groupId,
                            pageId: parentItem.id,
                            pageName: parentItem.verbose,
                            pageParamsInfo: {
                                webFuzzerPageInfo: {
                                    pageId: parentItem.id,
                                    advancedConfigValue: {
                                        ...defaultAdvancedConfigValue,
                                        ...defaultCache,
                                        ...parentItem.pageParams
                                    },
                                    advancedConfigShow: cacheData.advancedConfigShow,
                                    request: parentItem.pageParams?.request || ""
                                }
                            },
                            sortFieId: parentItem.sortFieId,
                            expand: parentItem.expand,
                            color: parentItem.color
                        }
                        pageNodeInfo.pageList.push({...pageListItem})
                    }
                    const newMultipleNodeList = multipleNodeList.sort((a, b) => compareAsc(a, b, "sortFieId"))
                    if (newMultipleNodeList.length === 0) return
                    // console.log("multipleNodeList", multipleNodeList)
                    // console.log("pageNodeInfo", pageNodeInfo)
                    const webFuzzerPage = {
                        routeKey: key,
                        verbose: tabName,
                        menuName: menuName,
                        route: YakitRoute.HTTPFuzzer,
                        pluginId: undefined,
                        pluginName: undefined,
                        singleNode: undefined,
                        multipleNode: multipleNodeList,
                        multipleLength: multipleNodeListLength
                    }
                    const oldPageCache = [...pageCache]
                    const index = oldPageCache.findIndex((ele) => ele.menuName === menuName)
                    if (index === -1) {
                        oldPageCache.push(webFuzzerPage)
                    } else {
                        oldPageCache.splice(index, 1, webFuzzerPage)
                    }
                    setPagesData(YakitRoute.HTTPFuzzer, pageNodeInfo)
                    setPageCache(oldPageCache)
                    setCurrentTabKey(key)
                    const lastPage = multipleNodeList[multipleNodeList.length - 1]
                    if (lastPage && lastPage.id.includes("group")) {
                        // 最后一个是组的时候，需要设置当前选中组
                        setSelectGroupId(YakitRoute.HTTPFuzzer, lastPage.id)
                    }
                })
                .catch((e) => {})
                .finally(() => setTimeout(() => setLoading(false), 200))
        } catch (error) {
            yakitNotify("error", "fetchFuzzerList失败:" + error)
        }
    })
    // 新增缓存数据
    /**@description 新增缓存数据 目前最新只缓存 request isHttps verbose */
    const addFuzzerList = useMemoizedFn((key: string, node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.HTTPFuzzer,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                webFuzzerPageInfo: {
                    pageId: node.id,
                    advancedConfigValue: {
                        ...defaultAdvancedConfigValue,
                        ...node.pageParams?.advancedConfigValue
                    },
                    advancedConfigShow: node.pageParams?.advancedConfigShow,
                    request: node.pageParams?.request || defaultPostTemplate
                }
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.HTTPFuzzer, newPageNode)
    })

    // 序列导入更新菜单
    useEffect(() => {
        emiter.on("onFuzzerSequenceImportUpdateMenu", onFuzzerSequenceImportUpdateMenu)
        return () => {
            emiter.off("onFuzzerSequenceImportUpdateMenu", onFuzzerSequenceImportUpdateMenu)
        }
    }, [])
    const onFuzzerSequenceImportUpdateMenu = useMemoizedFn((data: string) => {
        try {
            const newGroupItem: MultipleNodeInfo = JSON.parse(data)
            const index = pageCache.findIndex((ele) => ele.route === YakitRoute.HTTPFuzzer)
            if (index === -1) return
            const fuzzerMenuItem = structuredClone(pageCache[index])
            newGroupItem.verbose = `未命名[${getGroupLength(fuzzerMenuItem.multipleNode)}]`
            newGroupItem.sortFieId = fuzzerMenuItem.multipleNode.length + 1
            newGroupItem.color = getColor(fuzzerMenuItem.multipleNode)
            fuzzerMenuItem.multipleNode.push(newGroupItem)
            pageCache[index] = fuzzerMenuItem
            setPageCache([...pageCache])

            // 页面数据
            const groupChildrenLen = newGroupItem.groupChildren?.length || 0
            const pageList: PageNodeItemProps[] = []
            if (newGroupItem.groupChildren && groupChildrenLen > 0) {
                for (let index = 0; index < groupChildrenLen; index++) {
                    const nodeItem = newGroupItem.groupChildren[index]
                    const newNodeItem: PageNodeItemProps = {
                        id: `${randomString(8)}-${index + 1}`,
                        routeKey: YakitRoute.HTTPFuzzer,
                        pageGroupId: nodeItem.groupId,
                        pageId: nodeItem.id,
                        pageName: nodeItem.verbose,
                        pageParamsInfo: {
                            webFuzzerPageInfo: {
                                pageId: nodeItem.id,
                                advancedConfigValue: {
                                    ...defaultAdvancedConfigValue,
                                    ...nodeItem.pageParams?.advancedConfigValue
                                },
                                request: nodeItem.pageParams?.request || ""
                            }
                        },
                        sortFieId: nodeItem.sortFieId
                    }
                    pageList.push(newNodeItem)
                }

                const pageListItem: PageNodeItemProps = {
                    id: `${randomString(8)}-${index + 1}`,
                    routeKey: YakitRoute.HTTPFuzzer,
                    pageId: newGroupItem.id,
                    pageGroupId: "0",
                    pageName: newGroupItem.verbose,
                    pageParamsInfo: {},
                    sortFieId: newGroupItem.sortFieId,
                    expand: newGroupItem.expand,
                    color: newGroupItem.color
                }
                pageList.push(pageListItem)

                const oldPageList = pages.get(YakitRoute.HTTPFuzzer)?.pageList
                let pageNodeInfo: PageProps = {
                    ...cloneDeep(defPage),
                    pageList: oldPageList || [],
                    routeKey: YakitRoute.HTTPFuzzer
                }
                pageNodeInfo.pageList = [...pageNodeInfo.pageList, ...pageList]

                // console.table(pageNodeInfo.pageList)
                setPagesData(YakitRoute.HTTPFuzzer, pageNodeInfo)
            }

            // fuzzer数据
            const fuzzerSequenceData: FuzzerSequenceCacheDataProps = {
                groupId: newGroupItem.id,
                cacheData: []
            }
            newGroupItem.groupChildren?.forEach((ele, i) => {
                const configData: AdvancedConfigValueProps = {
                    ...defaultAdvancedConfigValue,
                    ...ele.pageParams?.advancedConfigValue
                }
                const sequenceProps = {
                    id: randomString(8) + `${i + 1}`,
                    inheritCookies: !!configData.inheritCookies,
                    inheritVariables: !!configData.inheritVariables,
                    name: `Step [${i}]`,
                    pageGroupId: newGroupItem.groupId,
                    pageId: ele.id,
                    pageName: ele.verbose
                }
                fuzzerSequenceData.cacheData = [...fuzzerSequenceData.cacheData, sequenceProps]
            })
            addFuzzerSequenceCacheData(fuzzerSequenceData.groupId, fuzzerSequenceData.cacheData)
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    /** ---------- web-fuzzer 缓存逻辑 end ---------- */
    /**
     * @description 设置空间引擎页面的缓存数据
     * @param {MultipleNodeInfo} node
     * @param {number} order
     */
    const onSetSpaceEngineData = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.Space_Engine,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                spaceEnginePageInfo: {...(node?.pageParams?.spaceEnginePageInfo || defaultSpaceEnginePageInfo)}
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.Space_Engine, newPageNode)
    })
    /**简易版 安全检测 */
    const onSetSimpleDetectData = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.SimpleDetect,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                simpleDetectPageInfo: {...(node?.pageParams?.simpleDetectPageInfo || defaultSimpleDetectPageInfo)}
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.SimpleDetect, newPageNode)
    })
    /**
     * @description 设置专项漏洞
     */
    const onSetPocData = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.PoC,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                pocPageInfo: {
                    ...defaultPocPageInfo,
                    ...node.pageParams?.pocPageInfo
                }
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.PoC, newPageNode)
    })
    // 新增数据对比页面
    useEffect(() => {
        ipcRenderer.on("main-container-add-compare", (e, params) => {
            openMenuPage({route: YakitRoute.DataCompare})

            // 区分新建对比页面还是别的页面请求对比的情况
            ipcRenderer.invoke("created-data-compare")
        })
        return () => {
            ipcRenderer.removeAllListeners("main-container-add-compare")
        }
    }, [pageCache])
    return (
        <Content>
            <YakitSpin spinning={loading}>
                <TabContent
                    pageCache={pageCache}
                    setPageCache={setPageCache}
                    currentTabKey={currentTabKey}
                    setCurrentTabKey={setCurrentTabKey}
                    openMultipleMenuPage={openMultipleMenuPage}
                    onRemove={(tabItem) => {
                        const removeItem: OnlyPageCache = {
                            menuName: tabItem.menuName,
                            route: tabItem.route,
                            pluginId: tabItem.pluginId,
                            pluginName: tabItem.pluginName
                        }
                        onBeforeRemovePage(removeItem)
                    }}
                />
            </YakitSpin>
            <YakitModal
                visible={bugTestShow}
                onCancel={() => setBugTestShow(false)}
                onOk={() => {
                    if (!bugTestValue) {
                        yakitNotify("error", "请选择类型后再次提交")
                        return
                    }
                    addBugTest(2)
                    setBugTestShow(false)
                }}
                type='white'
                title={<></>}
                closable={true}
                bodyStyle={{padding: 0}}
            >
                <div style={{padding: "0 24px"}}>
                    <Form.Item
                        label='专项漏洞类型'
                        help={
                            bugList.length === 0 && (
                                <span className={styles["bug-test-help"]}>
                                    点击管理分组新建分组
                                    <span className={styles["bug-test-help-active"]} onClick={onToManageGroup}>
                                        管理分组
                                    </span>
                                </span>
                            )
                        }
                    >
                        <YakitSelect
                            allowClear={true}
                            onChange={(value, option: any) => {
                                setBugTestValue(value)
                            }}
                            value={bugTestValue}
                        >
                            {bugList.map((item) => (
                                <YakitSelect.Option key={item.Value} value={item.Value}>
                                    {item.Value}
                                </YakitSelect.Option>
                            ))}
                        </YakitSelect>
                    </Form.Item>
                </div>
            </YakitModal>
        </Content>
    )
})

const TabContent: React.FC<TabContentProps> = React.memo((props) => {
    const {currentTabKey, setCurrentTabKey, onRemove, pageCache, setPageCache, openMultipleMenuPage} = props
    /** ---------- 拖拽排序 start ---------- */
    const onDragEnd = useMemoizedFn((result: DropResult, provided: ResponderProvided) => {
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable1" && result.destination.droppableId === "droppable1") {
            const menuList: PageCache[] = reorder(pageCache, result.source.index, result.destination.index)
            setPageCache(menuList)
        }
    })
    const onSetPageCache = useMemoizedFn((subMenuList: MultipleNodeInfo[], index: number) => {
        try {
            if (subMenuList.length > 0) {
                pageCache[index].multipleNode = [...subMenuList]
                // setSubPage([...subMenuList])
                setPageCache([...pageCache])
            } else {
                const newPage = pageCache.filter((_, i) => i !== index)
                // setSubPage([])
                setPageCache([...newPage])
                if (newPage.length > 0) {
                    const activeTabItem = pageCache[index - 1]
                    const key = routeConvertKey(activeTabItem.route, activeTabItem.pluginName)
                    setCurrentTabKey(key)
                }
            }
        } catch (error) {}
    })
    /** ---------- 拖拽排序 end ---------- */
    return (
        <div className={styles["tab-menu"]}>
            <ReactResizeDetector
                onResize={(_, height) => {
                    if (!height) return
                    menuBodyHeight.firstTabMenuBodyHeight = height
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <TabList
                pageCache={pageCache}
                setPageCache={setPageCache}
                currentTabKey={currentTabKey}
                setCurrentTabKey={setCurrentTabKey}
                onRemove={onRemove}
                onDragEnd={onDragEnd}
            />
            <TabChildren
                pageCache={pageCache}
                currentTabKey={currentTabKey}
                openMultipleMenuPage={openMultipleMenuPage}
                onSetPageCache={onSetPageCache}
            />
        </div>
    )
})

const TabChildren: React.FC<TabChildrenProps> = React.memo((props) => {
    const {pageCache, currentTabKey, openMultipleMenuPage, onSetPageCache} = props
    return (
        <>
            {pageCache.map((pageItem, index) => {
                return (
                    <div
                        key={pageItem.routeKey}
                        tabIndex={currentTabKey === pageItem.routeKey ? 1 : -1}
                        style={{
                            display: currentTabKey === pageItem.routeKey ? "" : "none",
                            padding:
                                !pageItem.singleNode || NoPaddingRoute.includes(pageItem.route)
                                    ? 0
                                    : "8px 16px 13px 16px"
                        }}
                        className={styles["page-body"]}
                    >
                        {pageItem.singleNode ? (
                            <React.Suspense fallback={<>loading page ...</>}>
                                <PageItem routeKey={pageItem.route} params={pageItem.pageParams} />
                            </React.Suspense>
                        ) : (
                            <SubTabList
                                pageCache={pageCache}
                                currentTabKey={currentTabKey}
                                openMultipleMenuPage={openMultipleMenuPage}
                                pageItem={pageItem}
                                index={index}
                                onSetPageCache={onSetPageCache}
                            />
                        )}
                    </div>
                )
            })}
        </>
    )
})

const TabList: React.FC<TabListProps> = React.memo((props) => {
    const {pageCache, setPageCache, currentTabKey, setCurrentTabKey, onDragEnd, onRemove} = props
    const {clearFuzzerSequence} = useFuzzerSequence(
        (s) => ({
            clearFuzzerSequence: s.clearFuzzerSequence
        }),
        shallow
    )
    const {clearAllData, clearOtherDataByRoute} = usePageInfo(
        (s) => ({
            clearAllData: s.clearAllData,
            clearOtherDataByRoute: s.clearOtherDataByRoute
        }),
        shallow
    )
    const onRightClickOperation = useMemoizedFn((event: React.MouseEvent, index: number) => {
        const currentPageItem: PageCache = pageCache[index]
        showByRightContext(
            {
                width: 180,
                type: "grey",
                data: [
                    {
                        label: "关闭当前标签页",
                        key: "removeCurrent"
                    },
                    {
                        label: "关闭所有标签页",
                        key: "removeAll"
                    },
                    {
                        label: "关闭其他标签页",
                        key: "removeOther"
                    }
                ],
                onClick: ({key, keyPath}) => {
                    switch (key) {
                        case "removeCurrent":
                            onRemoveCurrentTabs(currentPageItem)
                            break
                        case "removeAll":
                            onRemoveAllTabs(currentPageItem, index)
                            break
                        case "removeOther":
                            onRemoveOtherTabs(currentPageItem)
                            break
                        default:
                            break
                    }
                }
            },
            event.clientX,
            event.clientY,
            true
        )
    })
    /**关闭当前标签页 */
    const onRemoveCurrentTabs = useMemoizedFn((item: PageCache) => {
        onRemove(item)
    })
    /**关闭所有标签页 如果有首页需要保留首页 */
    const onRemoveAllTabs = useMemoizedFn((item: PageCache, index: number) => {
        const m = YakitModalConfirm({
            width: 420,
            type: "white",
            onCancelText: "取消",
            onOkText: "关闭所有",
            icon: <ExclamationCircleOutlined />,
            onOk: () => {
                // const newPage: PageCache | undefined = pageCache.find((p) => p.route === YakitRoute.NewHome)
                const fixedTabs = pageCache.filter((ele) => defaultFixedTabs.includes(ele.route))
                if (fixedTabs.length > 0) {
                    const key = fixedTabs[fixedTabs.length - 1].routeKey
                    setPageCache([...fixedTabs])
                    setCurrentTabKey(key)
                } else {
                    setPageCache([])
                }
                //关闭所有清除fuzzer和序列化缓存数据
                clearAllData()
                clearFuzzerSequence()
                m.destroy()
            },
            // onCancel: () => {
            //     m.destroy()
            // },
            content: "是否关闭所有标签页"
        })
    })
    /**关闭其他标签页 如果有首页需要保留首页*/
    const onRemoveOtherTabs = useMemoizedFn((item: PageCache) => {
        const m = YakitModalConfirm({
            width: 420,
            type: "white",
            onCancelText: "取消",
            onOkText: "关闭其他",
            icon: <ExclamationCircleOutlined />,
            onOk: () => {
                if (pageCache.length <= 0) return
                const fixedTabs = pageCache.filter((ele) => defaultFixedTabs.includes(ele.route))
                const newPage: PageCache[] = [...fixedTabs, item]
                setPageCache(newPage)
                clearOtherDataByRoute(item.routeKey)
                if (item.route !== YakitRoute.HTTPFuzzer) {
                    //当前item不是YakitRoute.HTTPFuzzer,则清除序列化缓存数据
                    clearFuzzerSequence()
                }
                m.destroy()
            },
            // onCancel: () => {
            //     m.destroy()
            // },
            content: "是否保留当前标签页，关闭其他标签页"
        })
    })
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId='droppable1' direction='horizontal'>
                {(provided, snapshot) => {
                    return (
                        <div
                            className={classNames(styles["tab-menu-first"])}
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            {pageCache.map((item, index) => {
                                return (
                                    <React.Fragment key={item.routeKey}>
                                        <TabItem
                                            item={item}
                                            index={index}
                                            currentTabKey={currentTabKey}
                                            onSelect={(val, k) => {
                                                setCurrentTabKey(k)
                                            }}
                                            onRemove={onRemove}
                                            onContextMenu={(e) => {
                                                onRightClickOperation(e, index)
                                            }}
                                        />
                                    </React.Fragment>
                                )
                            })}
                            {provided.placeholder}
                        </div>
                    )
                }}
            </Droppable>
        </DragDropContext>
    )
})
const TabItem: React.FC<TabItemProps> = React.memo((props) => {
    const {index, item, currentTabKey, onSelect, onRemove, onContextMenu} = props
    return (
        <>
            {defaultFixedTabs.includes(item.route) ? (
                <div
                    className={classNames(styles["tab-menu-first-item"], styles["tab-menu-item-fixed"], {
                        [styles["tab-menu-first-item-active"]]: item.routeKey === currentTabKey
                    })}
                    key={item.routeKey}
                    onClick={() => {
                        onSelect(item, item.routeKey)
                    }}
                >
                    <span className='content-ellipsis'>{item.verbose || ""}</span>
                </div>
            ) : (
                <Draggable key={item.routeKey} draggableId={item.routeKey} index={index}>
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                            className={classNames(styles["tab-menu-first-item"], {
                                [styles["tab-menu-first-item-active"]]: item.routeKey === currentTabKey,
                                [styles["tab-menu-first-item-dragging"]]: snapshot.isDragging
                            })}
                            key={item.routeKey}
                            onClick={() => {
                                onSelect(item, item.routeKey)
                            }}
                            onContextMenu={onContextMenu}
                        >
                            <Tooltip
                                title={item.verbose || ""}
                                overlayClassName={styles["toolTip-overlay"]}
                                destroyTooltipOnHide={true}
                                placement='top'
                            >
                                <div className={styles["tab-menu-item-verbose-wrapper"]}>
                                    <span className='content-ellipsis'>{item.verbose || ""}</span>
                                    <RemoveIcon
                                        className={styles["remove-icon"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRemove(item)
                                        }}
                                    />
                                </div>
                            </Tooltip>
                        </div>
                    )}
                </Draggable>
            )}
        </>
    )
})

const SubTabList: React.FC<SubTabListProps> = React.memo((props) => {
    const {pageItem, index, pageCache, currentTabKey, openMultipleMenuPage, onSetPageCache} = props
    // webFuzzer 序列化
    const [type, setType] = useState<WebFuzzerType>("config")

    const [subPage, setSubPage] = useState<MultipleNodeInfo[]>(pageItem.multipleNode || [])
    const [selectSubMenu, setSelectSubMenu] = useState<MultipleNodeInfo>({
        id: "0",
        verbose: "",
        sortFieId: 1,
        groupId: "0"
    }) // 选中的二级菜单

    const tabsRef = useRef(null)
    const subTabsRef = useRef<any>()
    const [inViewport = true] = useInViewport(tabsRef)

    useEffect(() => {
        if (currentTabKey === YakitRoute.HTTPFuzzer) {
            emiter.on("sendSwitchSequenceToMainOperatorContent", onSetType)
        }
        emiter.on("switchSubMenuItem", onSelectSubMenuById)
        ipcRenderer.on("fetch-add-group", onAddGroup)

        return () => {
            emiter.off("sendSwitchSequenceToMainOperatorContent", onSetType)
            emiter.off("switchSubMenuItem", onSelectSubMenuById)
            ipcRenderer.removeListener("fetch-add-group", onAddGroup)
        }
    }, [currentTabKey])

    useEffect(() => {
        // 处理外部新增一个二级tab
        setSubPage(pageItem.multipleNode || [])
    }, [pageItem.multipleNode])

    // 切换一级页面时聚焦
    useEffect(() => {
        const key = routeConvertKey(pageItem.route, pageItem.pluginName)
        if (currentTabKey === key) {
            onFocusPage()
        }
    }, [currentTabKey])

    useEffect(() => {
        // 新增的时候选中的item
        const multipleNodeLength = pageItem.multipleNode.length
        if (multipleNodeLength > 0) {
            let currentNode: MultipleNodeInfo = pageItem.multipleNode[multipleNodeLength - 1] || {
                id: "0",
                verbose: "",
                sortFieId: 1
            }
            if (!currentNode.groupChildren) currentNode.groupChildren = []
            if ((currentNode?.groupChildren?.length || 0) > 0) {
                currentNode = currentNode.groupChildren[0]
            }
            if (pageItem.openFlag !== false) {
                setSelectSubMenu({...currentNode})
            }
        }
    }, [pageItem.multipleLength])
    useUpdateEffect(() => {
        if (type !== "sequence") {
            emiter.emit("onRefWebFuzzer")
            /**VariableList组件从数据中心刷新最新的展开项,从序列切换到其他tab时，inViewport不会发生变化，所以采取信号发送 */
            emiter.emit("onRefVariableActiveKey")
        }
    }, [type])
    const onSetType = useMemoizedFn((res) => {
        if (!inViewport) return
        try {
            const value = JSON.parse(res)
            setType(value.type)
        } catch (error) {}
    })
    /**页面聚焦 */
    const onFocusPage = useMemoizedFn(() => {
        setTimeout(() => {
            if (!tabsRef || !tabsRef.current) return
            const ref = tabsRef.current as unknown as HTMLDivElement
            ref.focus()
        }, 100)
    })
    const onAddGroup = useMemoizedFn((e, res: {pageId: string}) => {
        if (!inViewport) return
        const {index} = getPageItemById(subPage, res.pageId)
        if (index === -1) return
        subTabsRef.current?.onNewGroup(subPage[index])
        setTimeout(() => {
            setType("sequence")
        }, 200)
    })
    /**快捷关闭或者新增 */
    const onKeyDown = useMemoizedFn((e: React.KeyboardEvent, subItem: MultipleNodeInfo) => {
        // 快捷键关闭
        if (e.code === "KeyW" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            e.stopPropagation()
            if (pageCache.length === 0) return
            subTabsRef.current?.onRemove(subItem)
            return
        }
        // 快捷键新增
        if (e.code === "KeyT" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            e.stopPropagation()
            subTabsRef.current?.onAddSubPage()
            return
        }
    })
    const flatSubPage = useMemo(() => {
        const newData: MultipleNodeInfo[] = []
        subPage.forEach((ele) => {
            if (ele.groupChildren && ele.groupChildren.length > 0) {
                ele.groupChildren.forEach((groupItem) => {
                    newData.push({...groupItem})
                })
            } else {
                newData.push({...ele})
            }
        })
        return newData
    }, [subPage])
    const onSelectSubMenuById = useMemoizedFn((resVal) => {
        try {
            const res = JSON.parse(resVal)
            if (!inViewport) return
            const index = flatSubPage.findIndex((ele) => ele.id === res.pageId)
            if (index === -1) return
            const newSubPage: MultipleNodeInfo = {...flatSubPage[index]}
            setSelectSubMenu({...newSubPage})
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                setType("config")
            }
        } catch (error) {}
    })
    return (
        <div
            ref={tabsRef}
            className={styles["tab-menu-sub-content"]}
            onKeyDown={(e) => {
                onKeyDown(e, selectSubMenu)
            }}
            tabIndex={0}
        >
            <SubTabs
                currentTabKey={currentTabKey}
                ref={subTabsRef}
                onFocusPage={onFocusPage}
                pageItem={pageItem}
                subPage={subPage}
                setSubPage={setSubPage}
                selectSubMenu={selectSubMenu}
                setSelectSubMenu={setSelectSubMenu}
                setType={setType}
                openMultipleMenuPage={openMultipleMenuPage}
                onSetPageCache={(list) => onSetPageCache(list, index)}
            />
            <div className={styles["render-sub-page"]}>
                <RenderSubPage
                    renderSubPage={flatSubPage}
                    route={pageItem.route}
                    pluginId={pageItem.pluginId || 0}
                    selectSubMenuId={selectSubMenu.id || "0"}
                />
                <RenderFuzzerSequence route={pageItem.route} type={type} setType={setType} />
            </div>
        </div>
    )
})

const SubTabs: React.FC<SubTabsProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            currentTabKey,
            pageItem,
            onFocusPage,
            subPage,
            setSubPage,
            setType,
            selectSubMenu,
            setSelectSubMenu,
            onSetPageCache,
            openMultipleMenuPage
        } = props

        //拖拽组件相关
        const [combineIds, setCombineIds] = useState<string[]>([]) //组合中的ids
        const [isCombineEnabled, setIsCombineEnabled] = useState<boolean>(true)
        const [dropType, setDropType] = useState<string>(droppable)
        const [subDropType, setSubDropType] = useState<string>(droppableGroup)

        const [scroll, setScroll] = useState<ScrollProps>({
            scrollLeft: 0,
            scrollBottom: 0,
            scrollRight: 0
        })

        const [closeGroupTip, setCloseGroupTip] = useState<boolean>(true) // 关闭组的时候是否还需要弹窗提示,默认是要弹窗的;如果用户选择了不再提示,后续则就不需要再弹出提示框

        const combineColorRef = useRef<string>("")
        const scrollLeftIconRef = useRef<any>()
        const scrollRightIconRef = useRef<any>()

        const {
            setPagesData,
            setSelectGroupId,
            queryPagesDataById,
            getPagesDataByGroupId,
            updatePagesDataCacheById,
            removeCurrentSelectGroupId,
            removePagesDataCacheById,
            setPageNodeInfoByPageGroupId,
            addPagesDataCache,
            setCurrentSelectPageId
        } = usePageInfo(
            (s) => ({
                setPagesData: s.setPagesData,
                setSelectGroupId: s.setSelectGroupId,
                queryPagesDataById: s.queryPagesDataById,
                getPagesDataByGroupId: s.getPagesDataByGroupId,
                updatePagesDataCacheById: s.updatePagesDataCacheById,
                removeCurrentSelectGroupId: s.removeCurrentSelectGroupId,
                removePagesDataCacheById: s.removePagesDataCacheById,
                setPageNodeInfoByPageGroupId: s.setPageNodeInfoByPageGroupId,
                addPagesDataCache: s.addPagesDataCache,
                setCurrentSelectPageId: s.setCurrentSelectPageId
            }),
            shallow
        )

        const {
            addFuzzerSequenceList,
            removeFuzzerSequenceList,
            clearFuzzerSequence,
            onlySaveFuzzerSequenceCacheDataIncomingGroupId,
            removeGroupOther,
            queryFuzzerSequenceCacheDataByGroupId,
            updateFuzzerSequenceCacheData,
            removeFuzzerSequenceCacheData,
            removeWithinGroupDataById
        } = useFuzzerSequence(
            (s) => ({
                addFuzzerSequenceList: s.addFuzzerSequenceList,
                removeFuzzerSequenceList: s.removeFuzzerSequenceList,
                clearFuzzerSequence: s.clearFuzzerSequence,
                onlySaveFuzzerSequenceCacheDataIncomingGroupId: s.onlySaveFuzzerSequenceCacheDataIncomingGroupId,
                removeGroupOther: s.removeGroupOther,
                queryFuzzerSequenceCacheDataByGroupId: s.queryFuzzerSequenceCacheDataByGroupId,
                updateFuzzerSequenceCacheData: s.updateFuzzerSequenceCacheData,
                removeFuzzerSequenceCacheData: s.removeFuzzerSequenceCacheData,
                removeWithinGroupDataById: s.removeWithinGroupDataById
            }),
            shallow
        )

        useImperativeHandle(
            ref,
            () => ({
                onAddSubPage,
                onRemove,
                onNewGroup
            }),
            []
        )
        useEffect(() => {
            getIsCloseGroupTip()
        }, [])

        const tabMenuSubRef = useRef<any>()

        useEffect(() => {
            // 切换选中页面时聚焦
            onFocusPage()
            if (subPage.length === 0) return
            const groupChildrenList = subPage[subPage.length - 1].groupChildren || []
            if (groupChildrenList.length > 0) {
                // 二级tab最后一个是组
                const index = groupChildrenList.findIndex((ele) => ele.id === selectSubMenu.id)
                if (index !== -1) {
                    setTimeout(() => {
                        scrollToRightMost()
                    }, 200)
                }
            }
            if (selectSubMenu.id === subPage[subPage.length - 1].id) {
                //滚动到最后边
                scrollToRightMost()
            }
            if (selectSubMenu.id !== "0") {
                if (selectSubMenu.groupId === "0") {
                    if (currentTabKey === YakitRoute.HTTPFuzzer) setType("config")
                    removeCurrentSelectGroupId(currentTabKey)
                } else {
                    if (currentTabKey === YakitRoute.HTTPFuzzer) {
                        addFuzzerSequenceList({
                            groupId: selectSubMenu.groupId
                        })
                    }
                    setSelectGroupId(currentTabKey, selectSubMenu.groupId)
                }
                setCurrentSelectPageId(currentTabKey, selectSubMenu.id)
            }
        }, [selectSubMenu])
        useLongPress(
            () => {
                if (!tabMenuSubRef.current) return
                if (!scrollLeftIconRef.current) return
                tabMenuSubRef.current.scrollLeft = 0
            },
            scrollLeftIconRef,
            {
                delay: 300,
                onClick: () => {
                    if (!tabMenuSubRef.current) return
                    tabMenuSubRef.current.scrollLeft -= 100
                },
                onLongPressEnd: () => {
                    tabMenuSubRef.current.scrollLeft = tabMenuSubRef.current.scrollLeft + 0
                }
            }
        )
        useLongPress(
            () => {
                if (!tabMenuSubRef.current) return
                if (!scrollRightIconRef.current) return
                tabMenuSubRef.current.scrollLeft = tabMenuSubRef.current.scrollWidth
            },
            scrollRightIconRef,
            {
                delay: 300,
                onClick: () => {
                    if (!tabMenuSubRef.current) return
                    tabMenuSubRef.current.scrollLeft += 100
                },
                onLongPressEnd: () => {
                    tabMenuSubRef.current.scrollLeft = tabMenuSubRef.current.scrollLeft - 0
                }
            }
        )

        /**滚动到最后边 */
        const scrollToRightMost = useMemoizedFn(() => {
            if (!tabMenuSubRef.current) {
                const tabMenuSub = document.getElementById(`tab-menu-sub-${pageItem.route}`)
                tabMenuSubRef.current = tabMenuSub
            }
            if (!tabMenuSubRef.current) return

            if (tabMenuSubRef.current.scrollWidth > 0) {
                tabMenuSubRef.current.scrollLeft = tabMenuSubRef.current.scrollWidth
            } else {
                setTimeout(() => {
                    scrollToRightMost()
                }, 200)
            }
        })

        /**@description  关闭组是否需要提示*/
        const getIsCloseGroupTip = useMemoizedFn(() => {
            getRemoteValue(Close_Group_Tip).then((e) => {
                setCloseGroupTip(e === "false" ? false : true)
            })
        })

        const onDragUpdate = useMemoizedFn((result: DragUpdate, provided: ResponderProvided) => {
            const sourceIndex = result.source.index
            const {subIndex} = getPageItemById(subPage, result.draggableId)
            if (subIndex === -1) {
                // 拖动的来源item是组时，不用合并
                if ((subPage[sourceIndex]?.groupChildren?.length || 0) > 0) return
            }
            const {droppableId: sourceDroppableId} = result.source
            if (result.combine) {
                if (result.source.droppableId === "droppable2" && result.combine.droppableId === "droppable2") {
                    const {index} = getPageItemById(subPage, result.combine.draggableId)
                    const groupChildrenList = subPage[index].groupChildren || []
                    if (groupChildrenList.length > 0) return
                    const ids = [result.combine.draggableId, result.draggableId]
                    if (combineIds.length === 0 && !combineColorRef.current) {
                        combineColorRef.current = getColor(subPage)
                    }
                    setCombineIds(ids)
                    return
                }

                if (sourceDroppableId.includes("group") && result.combine.droppableId === "droppable2") {
                    const ids = [result.combine.draggableId, result.draggableId]
                    if (combineIds.length === 0 && !combineColorRef.current) {
                        combineColorRef.current = getColor(subPage)
                    }
                    setCombineIds(ids)
                    return
                }
            }
            setCombineIds([])
        })
        const onSubMenuDragEnd = useMemoizedFn((result: DropResult, provided: ResponderProvided) => {
            try {
                // console.log("onSubMenuDragEnd", result)
                const {droppableId: sourceDroppableId} = result.source
                /** 合并组   ---------start--------- */
                if (result.combine) {
                    // 组外两个游离的标签页合成组
                    if (result.source.droppableId === "droppable2" && result.combine.droppableId === "droppable2") {
                        mergingGroup(result)
                    }
                    // 组内的标签页拖拽到组外并和组外的一个标签页合成组(组内向组外合并)
                    if (sourceDroppableId.includes("group") && result.combine.droppableId === "droppable2") {
                        mergeWithinAndOutsideGroup(result)
                    }
                }
                setIsCombineEnabled(true)
                setDropType(droppable)
                setSubDropType(droppableGroup)
                setCombineIds([])
                combineColorRef.current = ""
                /** 合并组   ---------end--------- */
                /** 移动排序 ---------start--------- */
                if (!result.destination && !result.source) {
                    return
                }

                const {droppableId: destinationDroppableId} = result.destination || {droppableId: "0"}
                // 组外之间移动
                if (sourceDroppableId === "droppable2" && destinationDroppableId === "droppable2") {
                    movingBetweenOutsideGroups(result)
                }
                //组之间的移动
                if (sourceDroppableId.includes("group") && destinationDroppableId.includes("group")) {
                    if (sourceDroppableId === destinationDroppableId) {
                        //同一个组之间的移动
                        movingWithinSameGroup(result)
                    } else {
                        // 从组A到组B
                        movingBetweenDifferentGroups(result)
                    }
                }

                // 组内向外移动 变游离的tab
                if (sourceDroppableId.includes("group") && destinationDroppableId === "droppable2") {
                    movingWithinAndOutsideGroup(result)
                }
                // 组外向组内移动
                if (result.source.droppableId === "droppable2" && destinationDroppableId.includes("group")) {
                    moveOutOfGroupAndInGroup(result)
                }
                /** 移动排序 ---------end--------- */
            } catch (error) {}
        })
        /** @description 组外向组内移动合并 */
        const mergingGroup = useMemoizedFn((result: DropResult) => {
            if (!result.combine) {
                return
            }
            const sourceIndex = result.source.index
            const combineId = result.combine.draggableId
            const combineIndex = subPage.findIndex((ele) => ele.id === combineId)
            if (combineIndex === -1 || !subPage[combineIndex]) return

            const sourceGroupChildrenLength = subPage[sourceIndex]?.groupChildren?.length || 0
            const combineGroupChildrenLength = subPage[combineIndex]?.groupChildren?.length || 0

            // 拖动的来源item是组时目的地item是游离页面，不合并
            if (sourceGroupChildrenLength > 0 && combineGroupChildrenLength === 0) return

            if (sourceGroupChildrenLength > 0 && combineGroupChildrenLength > 0) {
                // 拖动的来源item是组时目的地item也是组，合并  已经废弃
                // const groupList = subPage[sourceIndex].groupChildren?.map((ele) => ({ ...ele, groupId })) || []
                // subPage[combineIndex].groupChildren = (subPage[combineIndex].groupChildren || []).concat(groupList)
                // subPage[combineIndex].expand = true
            } else {
                const groupId =
                    sourceGroupChildrenLength > 0 || combineGroupChildrenLength > 0
                        ? subPage[combineIndex].id
                        : generateGroupId()
                const dropItem: MultipleNodeInfo = {
                    ...subPage[sourceIndex],
                    groupId
                }
                if (subPage[combineIndex].groupChildren && (subPage[combineIndex].groupChildren || []).length > 0) {
                    subPage[combineIndex].expand = true
                    subPage[combineIndex].groupChildren = (subPage[combineIndex].groupChildren || []).concat(dropItem)
                } else {
                    const groupLength = getGroupLength(subPage)
                    subPage[combineIndex].groupChildren = [{...subPage[combineIndex], groupId}, dropItem]
                    subPage[combineIndex].verbose = `未命名[${groupLength}]`
                    subPage[combineIndex].color = combineColorRef.current
                    subPage[combineIndex].expand = true
                    subPage[combineIndex].id = groupId
                }
                if (selectSubMenu.id === dropItem.id) {
                    setSelectSubMenu((s) => ({...s, groupId}))
                }
            }
            const combineItem = subPage[combineIndex]
            subPage.splice(sourceIndex, 1)
            onUpdatePageCache(subPage)
            const isSetGroup = combineItem.groupChildren?.findIndex((ele) => ele.id === selectSubMenu.id) !== -1
            if (isSetGroup) {
                setSelectGroupId(currentTabKey, combineItem.id)
            }
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                addFuzzerSequenceList({groupId: combineItem.id})
            }
            onAddGroupsAndThenSort(combineItem, subPage, currentTabKey)
        })

        /**@description 组内向组外合并 */
        const mergeWithinAndOutsideGroup = useMemoizedFn((result: DropResult) => {
            if (!result.combine) {
                return
            }
            const {index: sourceIndex, droppableId} = result.source
            const {draggableId: combineDraggableId} = result.combine

            if (droppableId === combineDraggableId) return // 同一个组不能合并
            if (droppableId.includes("group") === combineDraggableId.includes("group")) {
                // 不能正常拖拽的时候，两个组之间的拖拽交互失效
                // 所以执行movingBetweenDifferentGroups,不走合并的逻辑
                const newResult: DropResult = {
                    combine: null,
                    destination: {
                        droppableId: combineDraggableId,
                        index: 0
                    },
                    draggableId: result.draggableId,
                    mode: "FLUID",
                    reason: "DROP",
                    source: {
                        droppableId,
                        index: sourceIndex
                    },
                    type: ""
                }
                movingBetweenDifferentGroups(newResult)
                return
            }
            // 删除拖拽的组内标签页
            const gIndex = subPage.findIndex((ele) => ele.id === droppableId)
            if (gIndex === -1) return

            const sourceItem = subPage[gIndex].groupChildren?.splice(sourceIndex, 1)
            if (!sourceItem) return
            if (sourceItem.length <= 0) return
            const combineIndex = subPage.findIndex((ele) => ele.id === combineDraggableId)

            if (combineIndex === -1) return
            const newGroupId = generateGroupId()
            //将拖拽的item和组外的目的地item合并

            const dropItem: MultipleNodeInfo = {
                ...sourceItem[0],
                groupId: newGroupId
            }
            if (selectSubMenu.id === dropItem.id) {
                setSelectSubMenu((s) => ({...s, groupId: newGroupId}))
            }
            const groupLength = getGroupLength(subPage)
            subPage[combineIndex].groupChildren = [{...subPage[combineIndex], groupId: newGroupId}, dropItem]
            subPage[combineIndex].verbose = `未命名[${groupLength}]`
            subPage[combineIndex].color = combineColorRef.current || subPage[sourceIndex].color
            subPage[combineIndex].expand = true
            subPage[combineIndex].id = newGroupId

            const combineItem = subPage[combineIndex]
            // 拖拽后组内item===0,则删除该组
            if (subPage[gIndex].groupChildren?.length === 0) {
                subPage.splice(gIndex, 1)
                removeFuzzerSequenceList({
                    groupId: sourceItem[0].groupId
                })
            }
            onUpdatePageCache(subPage)
            onAddGroupsAndThenSort(combineItem, subPage, currentTabKey)
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                addFuzzerSequenceList({
                    groupId: combineItem.id
                })
            }
            const isSetGroup = combineItem.groupChildren?.findIndex((ele) => ele.id === selectSubMenu.id) !== -1
            if (isSetGroup) {
                setSelectGroupId(currentTabKey, combineItem.id)
            }
        })
        /** @description 组外之间移动 */
        const movingBetweenOutsideGroups = useMemoizedFn((result: DropResult) => {
            if (!result.destination) {
                return
            }
            const {index: sourceIndex} = result.source
            const {index: destinationIndex} = result.destination
            const sourceItem = subPage[sourceIndex]
            const destinationItem = subPage[destinationIndex]
            const subMenuList: MultipleNodeInfo[] = reorder(subPage, sourceIndex, destinationIndex)
            setSubPage([...subMenuList])
            onUpdatePageCache(subMenuList)
            const source = {
                id: sourceItem.id,
                sortFieId: destinationIndex + 1
            }
            const destination = {
                id: destinationItem.id,
                sortFieId: sourceIndex + 1
            }
            onExchangeOrderPages(currentTabKey, source, destination)
        })
        /** @description 同一个组内之间移动 */
        const movingWithinSameGroup = useMemoizedFn((result: DropResult) => {
            if (!result.destination) {
                return
            }
            const {index: sourceIndex} = result.source
            const {droppableId, index: destinationIndex} = result.destination
            const groupId = droppableId
            const gIndex = subPage.findIndex((ele) => ele.id === groupId)
            if (gIndex === -1) return
            const groupChildrenList = subPage[gIndex].groupChildren || []
            const groupChildrenSourceItem = groupChildrenList[sourceIndex]
            const groupChildrenDestinationItem = groupChildrenList[destinationIndex]
            const newGroupChildrenList: MultipleNodeInfo[] = reorder(groupChildrenList, sourceIndex, destinationIndex)
            subPage[gIndex].groupChildren = newGroupChildrenList
            onUpdatePageCache(subPage)
            // 排序
            const source = {
                id: groupChildrenSourceItem.id,
                sortFieId: destinationIndex + 1
            }
            const destination = {
                id: groupChildrenDestinationItem.id,
                sortFieId: sourceIndex + 1
            }
            onExchangeOrderPages(currentTabKey, source, destination)
        })

        /** @description 不同一个组间移动 从组A到组B */
        const movingBetweenDifferentGroups = useMemoizedFn((result: DropResult) => {
            if (!result.destination) {
                return
            }
            const {droppableId: dropSourceId, index: sourceIndex} = result.source
            const {droppableId: dropDestinationId, index: destinationIndex} = result.destination
            const sourceGroupId = dropSourceId
            const destinationGroupId = dropDestinationId
            // 将拖拽的item从来源地中删除
            const sourceNumber = subPage.findIndex((ele) => ele.id === sourceGroupId)
            if (sourceNumber === -1) return
            const sourceGroupChildrenList = subPage[sourceNumber].groupChildren || []
            const sourceItem = sourceGroupChildrenList[sourceIndex] // 拖拽的item
            sourceGroupChildrenList.splice(sourceIndex, 1)
            subPage[sourceNumber].groupChildren = sourceGroupChildrenList

            // 将拖拽的item添加到目的地的组内
            const destinationNumber = subPage.findIndex((ele) => ele.id === destinationGroupId)
            const destinationGroupChildrenList = subPage[destinationNumber].groupChildren || []
            if (destinationGroupChildrenList.length === 0) return
            const newSourceItem: MultipleNodeInfo = {
                ...sourceItem,
                groupId: destinationGroupId
            }
            if (selectSubMenu.id === newSourceItem.id) {
                setSelectSubMenu((s) => ({...s, groupId: destinationGroupId}))
            }

            destinationGroupChildrenList.splice(destinationIndex, 0, newSourceItem) // 按顺序将拖拽的item放进目的地中并修改组的id
            subPage[destinationNumber].groupChildren = destinationGroupChildrenList

            if (sourceGroupChildrenList.length === 0) {
                // 组内的标签页为0时,删除该组
                subPage.splice(sourceNumber, 1)
                removeFuzzerSequenceList({
                    groupId: sourceItem.id
                })
            }
            onUpdatePageCache(subPage)
            onUpdateSorting(subPage, currentTabKey)
        })

        /** @description 组内向组外移动 */
        const movingWithinAndOutsideGroup = useMemoizedFn((result: DropResult) => {
            if (!result.destination) {
                return
            }
            const {droppableId: dropSourceId, index: sourceIndex} = result.source
            const {index: destinationIndex} = result.destination

            const sourceGroupId = dropSourceId
            // 将拖拽的item从来源地中删除
            const sourceNumber = subPage.findIndex((ele) => ele.id === sourceGroupId)
            if (sourceNumber === -1) return
            const sourceGroupChildrenList: MultipleNodeInfo[] = subPage[sourceNumber].groupChildren || []
            const sourceItem = sourceGroupChildrenList[sourceIndex] // 拖拽的item
            sourceGroupChildrenList.splice(sourceIndex, 1)
            subPage[sourceNumber].groupChildren = sourceGroupChildrenList

            const newSourceItem: MultipleNodeInfo = {
                ...sourceItem,
                groupId: "0"
            }
            if (selectSubMenu.id === sourceItem.id) {
                setSelectSubMenu((s) => ({...s, groupId: "0"}))
            }
            // 将拖拽的item添加到目的地的组内
            subPage.splice(destinationIndex, 0, newSourceItem)

            // 如果组内的item为0 ,需要删除组
            if (sourceGroupChildrenList.length === 0) {
                const number = subPage.findIndex((ele) => ele.id === sourceGroupId)
                subPage.splice(number, 1)
                removeFuzzerSequenceList({
                    groupId: sourceItem.groupId
                })
            }
            onUpdatePageCache([...subPage])
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                removeWithinGroupDataById(sourceItem.groupId, newSourceItem.id)
            }
            onUpdateSorting(subPage, currentTabKey)
        })
        /** @description 组外向组内移动 */
        const moveOutOfGroupAndInGroup = useMemoizedFn((result: DropResult) => {
            if (!result.destination) {
                return
            }
            const {index} = getPageItemById(subPage, result.draggableId)
            //拖动的是组
            if ((subPage[index].groupChildren?.length || 0) > 0) return
            const {index: sourceIndex} = result.source
            const {droppableId: dropDestinationId, index: destinationIndex} = result.destination
            const sourceItem = subPage[sourceIndex] // 拖拽的item

            const destinationGroupId = dropDestinationId

            const destinationNumber = subPage.findIndex((ele) => ele.id === destinationGroupId)
            if (sourceItem.groupChildren && sourceItem.groupChildren.length > 0) {
                // 拖拽的item是一个组,两个组合并 已废弃
                // const pageList = sourceItem.groupChildren.map((ele) => ({
                //     ...ele,
                //     groupId: destinationGroupId
                // }))
                // subPage[destinationNumber].groupChildren?.splice(destinationIndex, 0, ...pageList)
            } else {
                // 将拖拽的item添加到目的地的组内

                const destinationGroupChildrenList = subPage[destinationNumber].groupChildren || []
                if (destinationGroupChildrenList.length === 0) return
                const newSourceItem: MultipleNodeInfo = {
                    ...sourceItem,
                    groupId: destinationGroupId
                }
                if (selectSubMenu.id === newSourceItem.id) {
                    setSelectSubMenu((s) => ({...s, groupId: destinationGroupId}))
                }
                destinationGroupChildrenList.splice(destinationIndex, 0, newSourceItem) // 按顺序将拖拽的item放进目的地中并修改组的id
                subPage[destinationNumber].groupChildren = destinationGroupChildrenList
            }
            // 将拖拽的item从来源地中删除
            subPage.splice(sourceIndex, 1)
            onUpdatePageCache(subPage)
            onUpdateSorting(subPage, currentTabKey)
        })
        /** 更新pageCache和subPage，保证二级新开tab后顺序不变 */
        const onUpdatePageCache = useMemoizedFn((subMenuList: MultipleNodeInfo[]) => {
            try {
                onSetPageCache(subMenuList)
                setTimeout(() => {
                    onScrollTabMenu()
                }, 200)
            } catch (error) {}
        })
        const onAddSubPage = useMemoizedFn(() => {
            if (getSubPageTotal(subPage) >= 100) {
                yakitNotify("error", "超过标签页数量限制")
                return
            }
            openMultipleMenuPage({
                route: pageItem.route,
                pluginId: pageItem.pluginId,
                pluginName: pageItem.pluginName
            })
        })
        /** @description 删除item 更新选中的item*/
        const onUpdateSelectSubPage = useMemoizedFn((handleItem: MultipleNodeInfo) => {
            if (selectSubMenu.id === "0") return
            // 先判断被删除的item是否是独立的，如果是独立的则不需要走组内的逻辑
            // 独立的item被删除 游离的/没有组的
            const itemIndex = subPage.findIndex((ele) => ele.id === handleItem.id)
            if (itemIndex !== -1) {
                let currentNode: MultipleNodeInfo = subPage[itemIndex + 1]
                if (!currentNode) currentNode = subPage[itemIndex - 1]
                if (!currentNode) currentNode = subPage[0]
                if ((currentNode?.groupChildren?.length || 0) > 0) {
                    // 若此时选中的是一个组，则选中组内的第一个
                    if (!currentNode.groupChildren) currentNode.groupChildren = []
                    if (!currentNode.expand) {
                        // 如果组是关闭状态,则需要变为展开状态
                        const number = subPage.findIndex((ele) => ele.id === currentNode.id)
                        if (number === -1) return
                        subPage[number] = {
                            ...subPage[number],
                            expand: true
                        }
                        onUpdatePageCache([...subPage])
                    }
                    currentNode = currentNode.groupChildren[0]
                }
                setSelectSubMenu({...currentNode})
                return
            }
            // 删除组内的
            const groupIndex = subPage.findIndex((ele) => ele.id === handleItem.groupId)
            if (groupIndex !== -1) {
                const groupList: MultipleNodeInfo = subPage[groupIndex] || {
                    id: "0",
                    verbose: "",
                    sortFieId: 1
                }
                if (!groupList.groupChildren) groupList.groupChildren = []
                const groupChildrenIndex = groupList.groupChildren.findIndex((ele) => ele.id === handleItem.id)
                if (groupChildrenIndex === -1) return
                // 选中组内的前一个或者后一个
                let currentChildrenNode: MultipleNodeInfo = groupList.groupChildren[groupChildrenIndex + 1]
                if (!currentChildrenNode) currentChildrenNode = groupList.groupChildren[groupChildrenIndex - 1]
                if (!currentChildrenNode) currentChildrenNode = groupList.groupChildren[0]
                // 删除的item等于最后一个item，则选中组的前一个或者后一个item
                if (currentChildrenNode.id === handleItem.id) {
                    currentChildrenNode = subPage[groupIndex + 1]
                    if (!currentChildrenNode) currentChildrenNode = subPage[groupIndex - 1]
                    if (!currentChildrenNode) currentChildrenNode = subPage[0]
                    if ((currentChildrenNode?.groupChildren?.length || 0) > 0) {
                        // 若此时选中的是一个组，则选中组内的第一个
                        if (!currentChildrenNode.groupChildren) currentChildrenNode.groupChildren = []
                        if (!currentChildrenNode.expand) {
                            // 如果组是关闭状态,则需要变为张开状态
                            const number = subPage.findIndex((ele) => ele.id === currentChildrenNode.id)
                            if (number === -1) return
                            subPage[number] = {
                                ...subPage[number],
                                expand: true
                            }
                            onUpdatePageCache([...subPage])
                        }
                        currentChildrenNode = currentChildrenNode.groupChildren[0]
                    }
                }
                setSelectSubMenu({...currentChildrenNode})
            }
        })
        /**@description 设置传入的item为选中的item */
        const onSetSelectSubMenu = useMemoizedFn((handleItem: MultipleNodeInfo) => {
            if (handleItem.groupChildren && handleItem.groupChildren.length > 0) {
                const index = handleItem.groupChildren.findIndex((ele) => ele.id === selectSubMenu.id)
                if (index === -1) setSelectSubMenu(handleItem.groupChildren[0])
            } else {
                setSelectSubMenu({...handleItem})
            }
        })
        /** 关闭当前标签页 */
        const onRemoveSubPage = useMemoizedFn((removeItem: MultipleNodeInfo) => {
            //  先更改当前选择item,在删除
            if (removeItem.id === selectSubMenu.id) onUpdateSelectSubPage(removeItem)
            const {index, subIndex} = getPageItemById(subPage, removeItem.id)
            if (subIndex === -1) {
                // 删除游离页面
                subPage.splice(index, 1)
            } else {
                // 删除组内页面
                const groupItem = subPage[index]
                const groupChildren = groupItem.groupChildren || []
                if (groupChildren.length > 0) {
                    groupChildren.splice(subIndex, 1)
                }
                //删除后再判断
                if (groupChildren.length === 0) {
                    subPage.splice(index, 1)
                    removePagesDataCacheById(currentTabKey, groupItem.id)
                    if (currentTabKey === YakitRoute.HTTPFuzzer) {
                        removeFuzzerSequenceList({
                            groupId: groupItem.id
                        })
                    }
                } else {
                    subPage.splice(index + 1, 0)
                }
            }
            onUpdatePageCache([...subPage])
            onUpdateSorting(subPage, currentTabKey)
        })
        /**
         * @description 页面节点的右键点击事件
         */
        const onRightClickOperation = useMemoizedFn((event: React.MouseEvent, item: MultipleNodeInfo) => {
            let menuData: YakitMenuItemType[] = _.cloneDeepWith(pageTabItemRightOperation)
            const groupList = subPage.filter((ele) => (ele.groupChildren?.length || 0) > 0)
            groupList.forEach((groupItem) => {
                let labelText = groupItem.verbose
                if (!labelText) {
                    const groupChildren = groupItem.groupChildren || []
                    const gLength = groupChildren.length
                    if (gLength > 0) {
                        labelText = `“${groupChildren[0].verbose}”和另外 ${gLength - 1} 个标签页`
                    }
                }
                const node = {
                    label: (
                        <div className={styles["right-menu-item"]} key={groupItem.id}>
                            <div className={classNames(styles["item-color-block"], `color-bg-${groupItem.color}`)} />
                            <span>{labelText}</span>
                        </div>
                    ),
                    key: groupItem.id
                }
                const i = menuData[1] as YakitMenuItemProps
                i.children?.push(node)
            })
            const {subIndex} = getPageItemById(subPage, item.id)
            if (subIndex !== -1) {
                menuData.splice(2, 0, {
                    label: "从组中移出",
                    key: "removeFromGroup"
                })
            }
            showByRightContext(
                {
                    width: 180,
                    type: "grey",
                    data: menuData,
                    onClick: ({key, keyPath}) => {
                        switch (key) {
                            case "rename":
                                onRename(item)
                                break
                            case "removeFromGroup":
                                onRemoveFromGroup(item)
                                break
                            case "remove":
                                onRemove(item)
                                break
                            case "removeOtherItems":
                                onRemoveOther(item)
                                break
                            case "newGroup":
                                onNewGroup(item)
                                break
                            default:
                                onAddToGroup(item, key)
                                break
                        }
                    }
                },
                event.clientX,
                event.clientY,
                true
            )
        })

        /**重命名 */
        const onRename = useMemoizedFn((item: MultipleNodeInfo) => {
            const m = showYakitModal({
                footer: null,
                closable: false,
                hiddenHeader: true,
                content: (
                    <React.Suspense fallback={<div>loading...</div>}>
                        <TabRenameModalContent
                            title='重命名'
                            onClose={() => {
                                m.destroy()
                            }}
                            name={item.verbose}
                            onOk={(val) => {
                                if (val.length > 50) {
                                    yakitNotify("error", "不能超过50个字符")
                                    return
                                }

                                const {index, subIndex} = getPageItemById(subPage, item.id)
                                if (index === -1) return
                                if (subIndex === -1) {
                                    // 当前情况说明item是游离的页面,没有在其他组内
                                    subPage[index] = {...subPage[index], verbose: val}
                                    onUpdatePageCache(subPage)
                                } else {
                                    // 当前情况说明item在subPage[index]的组内
                                    const groupChildrenList = subPage[index].groupChildren || []
                                    if (groupChildrenList.length > 0) {
                                        groupChildrenList[subIndex] = {
                                            ...groupChildrenList[subIndex],
                                            verbose: val
                                        }
                                        subPage[index] = {
                                            ...subPage[index],
                                            groupChildren: [...groupChildrenList]
                                        }
                                        onUpdatePageCache(subPage)
                                    }
                                }
                                const updateItem = {
                                    ...item,
                                    verbose: val
                                }
                                onUpdatePageName(currentTabKey, updateItem)
                                m.destroy()
                            }}
                        />
                    </React.Suspense>
                )
            })
        })
        /**更新数据中心得页面名称数据 */
        const onUpdatePageName = useMemoizedFn((currentTabKey: string, param: MultipleNodeInfo) => {
            const current: PageNodeItemProps | undefined = queryPagesDataById(currentTabKey, param.id)
            if (!current) return
            current.pageName = param.verbose
            updatePagesDataCacheById(currentTabKey, current)
            emiter.emit("secondMenuTabDataChange", "")
        })
        /**将页面添加到新建组 */
        const onNewGroup = useMemoizedFn((item: MultipleNodeInfo) => {
            const {index, subIndex} = getPageItemById(subPage, item.id)
            const groupLength = getGroupLength(subPage)
            const groupId = generateGroupId()
            const newGroup: MultipleNodeInfo = {
                id: groupId,
                groupId: "0",
                verbose: `未命名[${groupLength}]`,
                sortFieId: subPage.length,
                groupChildren: [{...item, groupId}],
                expand: true,
                color: getColor(subPage)
            }
            if (selectSubMenu.id === item.id) {
                setSelectSubMenu({...item, groupId})
            }

            if (subIndex === -1) {
                // 游离页面移动到新建组
                subPage.splice(index, 1, newGroup)
            } else {
                // 组A移动到新建组
                const groupChildren = subPage[index].groupChildren || []
                if (groupChildren.length > 0) {
                    groupChildren.splice(subIndex, 1)
                    subPage[index] = {
                        ...subPage[index],
                        groupChildren: [...groupChildren]
                    }
                }

                if (groupChildren.length === 0) {
                    subPage.splice(index, 1, newGroup)
                } else {
                    subPage.splice(index + 1, 0, newGroup)
                }
            }
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                onUpdateFuzzerSequenceCacheData(item)
            }
            onAddGroupsAndThenSort(newGroup, subPage, currentTabKey)
            onUpdatePageCache([...subPage])
        })
        /**将标签页移动到组 */
        const onAddToGroup = useMemoizedFn((item: MultipleNodeInfo, key: string) => {
            const {index, subIndex} = getPageItemById(subPage, item.id)
            const {index: gIndex, current: currentGroup} = getPageItemById(subPage, key)

            if (subIndex === -1) {
                //游离页面移动到组内
                // subPage[gIndex].groupChildren?.push({ ...item, groupId: subPage[gIndex].id })
                subPage[gIndex] = {
                    ...subPage[gIndex],
                    groupChildren: [...(subPage[gIndex].groupChildren || []), {...item, groupId: subPage[gIndex].id}]
                }
                subPage.splice(index, 1)
            } else {
                // 组A移动到组B
                const groupChildren = subPage[index].groupChildren || []
                if (groupChildren.length > 0) {
                    groupChildren.splice(subIndex, 1)
                    subPage[index] = {
                        ...subPage[index],
                        groupChildren: [...groupChildren]
                    }
                }
                subPage[gIndex] = {
                    ...subPage[gIndex],
                    groupChildren: [...(subPage[gIndex].groupChildren || []), {...item, groupId: subPage[gIndex].id}]
                }
                // subPage[gIndex].groupChildren?.push({ ...item, groupId: subPage[gIndex].id })
                if (groupChildren.length === 0) subPage.splice(index, 1)
            }
            if (selectSubMenu.id === item.id) {
                setSelectSubMenu({...item, groupId: currentGroup.id})
            }

            onUpdatePageCache([...subPage])
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                onUpdateFuzzerSequenceCacheData(item)
            }
            onUpdateSorting(subPage, currentTabKey)
        })
        /**从组中移出 */
        const onRemoveFromGroup = useMemoizedFn((item: MultipleNodeInfo) => {
            const {index, subIndex} = getPageItemById(subPage, item.id)
            if (subIndex === -1) return
            const groupChildren = subPage[index].groupChildren || []
            if (groupChildren.length > 0) {
                groupChildren.splice(subIndex, 1)
                subPage[index] = {
                    ...subPage[index],
                    groupChildren: [...groupChildren]
                }
            }
            const newGroup: MultipleNodeInfo = {
                ...item,
                groupId: "0",
                groupChildren: [],
                expand: undefined,
                color: undefined
            }
            if (selectSubMenu.id === item.id) {
                setSelectSubMenu({...newGroup})
            }
            if (groupChildren.length === 0) {
                subPage.splice(index, 1, newGroup)
            } else {
                subPage.splice(index + 1, 0, newGroup)
            }
            onUpdatePageCache([...subPage])
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                onUpdateFuzzerSequenceCacheData(item)
            }
            onUpdateSorting(subPage, currentTabKey)
        })
        /**更新全局变量中得序列缓存数据 */
        const onUpdateFuzzerSequenceCacheData = useMemoizedFn((item: MultipleNodeInfo) => {
            const sequenceCache = queryFuzzerSequenceCacheDataByGroupId(item.groupId).filter(
                (ele) => ele.pageId !== item.id
            )
            if (sequenceCache.length > 0) {
                updateFuzzerSequenceCacheData(item.groupId, sequenceCache)
            } else {
                removeFuzzerSequenceCacheData(item.groupId)
            }
        })

        /**关闭当前标签页 */
        const onRemove = useMemoizedFn((item: MultipleNodeInfo) => {
            onRemoveSubPage(item)
        })
        /**二级游离页面/未分组的页面 关闭其他标签页 */
        const onRemoveOther = useMemoizedFn((item: MultipleNodeInfo) => {
            const {index, subIndex} = getPageItemById(subPage, item.id)
            if (subIndex === -1) {
                // 游离页面的关闭其他tabs
                const m = YakitModalConfirm({
                    width: 420,
                    type: "white",
                    onCancelText: "取消",
                    onOkText: "关闭其他",
                    icon: <ExclamationCircleOutlined />,
                    onOk: () => {
                        const newSubPage: MultipleNodeInfo[] = [item]
                        onSetSelectSubMenu(item)
                        onUpdatePageCache(newSubPage)
                        const current: PageNodeItemProps | undefined = queryPagesDataById(currentTabKey, item.id)
                        if (current) {
                            const pages: PageProps = {
                                ...cloneDeep(defPage),
                                pageList: [{...current, sortFieId: 1}],
                                routeKey: currentTabKey
                            }
                            setPagesData(currentTabKey, pages)
                        }
                        if (currentTabKey === YakitRoute.HTTPFuzzer) {
                            if (item.groupId === "0") {
                                clearFuzzerSequence()
                            }
                        }
                        m.destroy()
                    },
                    // onCancel: () => {
                    //     m.destroy()
                    // },
                    content: "是否保留当前标签页，关闭其他标签页"
                })
            } else {
                // 关闭组内的其他tabs
                const m = YakitModalConfirm({
                    width: 420,
                    type: "white",
                    onCancelText: "取消",
                    onOkText: "关闭组内其他",
                    icon: <ExclamationCircleOutlined />,
                    onOk: () => {
                        const groupItem = subPage[index]
                        subPage[index].groupChildren = [item]
                        onSetSelectSubMenu(item)
                        onUpdatePageCache(subPage)
                        //更新fuzzer缓存
                        const current: PageNodeItemProps | undefined = queryPagesDataById(currentTabKey, item.id)
                        if (current) {
                            const groupList = [{...current, sortFieId: 1}]
                            setPageNodeInfoByPageGroupId(currentTabKey, item.groupId, groupList)
                        }
                        if (currentTabKey === YakitRoute.HTTPFuzzer) {
                            // 移出序列中该组的其他数据
                            removeGroupOther(groupItem.id, item.id)
                        }
                        m.destroy()
                    },
                    // onCancel: () => {
                    //     m.destroy()
                    // },
                    content: "是否仅保留当前标签页，关闭组内其他标签页"
                })
            }
        })

        const onGroupRightClickOperation = useMemoizedFn((event: React.MouseEvent, indexSub: number) => {
            const currentGroup: MultipleNodeInfo = subPage[indexSub]
            const m = showByRightContext(
                <GroupRightClickShowContent
                    groupItem={currentGroup}
                    onUpdateGroup={(group) => {
                        onUpdateGroup(group)
                    }}
                    onOperateGroup={(key, group) => {
                        switch (key) {
                            case "cancelGroup":
                                onCancelGroup(group)
                                break
                            case "closeGroup":
                                onCloseGroupConfirm(group)
                                break
                            case "closeOtherTabs":
                                onCloseOtherTabs(group)
                                break
                            default:
                                break
                        }
                        m.destroy()
                    }}
                />,
                event.clientX,
                event.clientY,
                true
            )
        })
        /**@description 取消组/将组内的页面变成游离的状态 */
        const onCancelGroup = useMemoizedFn((groupItem: MultipleNodeInfo) => {
            const index = subPage.findIndex((ele) => ele.id === groupItem.id)
            if (index === -1) return

            const current = subPage[index]
            const groupChildrenList = (current.groupChildren || []).map((g, gIndex) => {
                return {
                    ...g,
                    groupId: "0"
                }
            })
            subPage.splice(index, 1, ...groupChildrenList)
            onUpdatePageCache([...subPage])
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                removeFuzzerSequenceList({
                    groupId: current.id
                })
            }
            onUpdateSorting(subPage, currentTabKey)
        })
        /**更新两个item的排序字段 */
        const onExchangeOrderPages = useMemoizedFn(
            (
                routeKey: YakitRoute | string,
                source: {
                    id: string
                    sortFieId: number
                },
                destination: {
                    id: string
                    sortFieId: number
                }
            ) => {
                const currentSource: PageNodeItemProps | undefined = queryPagesDataById(routeKey, source.id)
                const currentDestination: PageNodeItemProps | undefined = queryPagesDataById(routeKey, destination.id)
                if (currentSource) {
                    updatePagesDataCacheById(routeKey, {
                        ...currentSource,
                        sortFieId: source.sortFieId
                    })
                }
                if (currentDestination) {
                    updatePagesDataCacheById(routeKey, {
                        ...currentDestination,
                        sortFieId: destination.sortFieId
                    })
                }
                setTimeout(() => {
                    emiter.emit("secondMenuTabDataChange", "")
                }, 200)
            }
        )
        /**先添加新组，再onUpdateSorting */
        const onAddGroupsAndThenSort = useMemoizedFn(
            (newGroup: MultipleNodeInfo, subPage: MultipleNodeInfo[], currentRouteKey: string) => {
                // 先添加新组，再onUpdateSorting
                const newPageGroupNode: PageNodeItemProps = {
                    id: `${randomString(8)}-${newGroup.sortFieId}`,
                    routeKey: currentRouteKey,
                    pageGroupId: "0",
                    pageId: newGroup.id,
                    pageName: newGroup.verbose,
                    pageParamsInfo: {},
                    sortFieId: newGroup.sortFieId,
                    expand: newGroup.expand,
                    color: newGroup.color
                }
                addPagesDataCache(currentRouteKey, newPageGroupNode)
                onUpdateSorting(subPage, currentRouteKey)
            }
        )
        /**更新排序和组内的页面所属组id 所有二级菜单的排序 */
        const onUpdateSorting = useMemoizedFn((subPage: MultipleNodeInfo[], currentRouteKey: string) => {
            const pageList: PageNodeItemProps[] = []
            subPage.forEach((ele, index) => {
                if (ele.groupChildren && ele.groupChildren.length > 0) {
                    ele.groupChildren.forEach((childrenItem, subIndex) => {
                        const currentChildrenItem: PageNodeItemProps | undefined = queryPagesDataById(
                            currentRouteKey,
                            childrenItem.id
                        )
                        if (currentChildrenItem)
                            pageList.push({...currentChildrenItem, pageGroupId: ele.id, sortFieId: subIndex + 1})
                    })
                }
                const current: PageNodeItemProps | undefined = queryPagesDataById(currentRouteKey, ele.id)
                if (current) {
                    pageList.push({...current, pageGroupId: "0", sortFieId: index + 1})
                }
            })
            const pages: PageProps = {
                ...cloneDeep(defPage),
                pageList: pageList,
                routeKey: currentRouteKey
            }
            setPagesData(currentRouteKey, pages)
        })
        /**@description 关闭组/删除组包括组里的页面,有一个弹窗不再提示的功能 */
        const onCloseGroupConfirm = useMemoizedFn((groupItem: MultipleNodeInfo) => {
            if (closeGroupTip) {
                const m = YakitModalConfirm({
                    width: 420,
                    type: "white",
                    onCancelText: "取消",
                    onOkText: "关闭组",
                    icon: <ExclamationCircleOutlined />,
                    onOk: () => {
                        getIsCloseGroupTip()
                        onCloseGroup(groupItem)
                        m.destroy()
                    },
                    // onCancel: () => {
                    //     m.destroy()
                    // },
                    content: <CloseGroupContent />
                })
            } else {
                onCloseGroup(groupItem)
            }
        })
        /**关闭组 组的右键事件 */
        const onCloseGroup = useMemoizedFn((groupItem: MultipleNodeInfo) => {
            const index = subPage.findIndex((ele) => ele.id === groupItem.id)
            if (index === -1) return
            onUpdateSelectSubPage(groupItem)
            subPage.splice(index, 1)
            onUpdatePageCache([...subPage])
            onUpdateSorting(subPage, currentTabKey)
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                removeFuzzerSequenceList({
                    groupId: groupItem.id
                })
            }
        })
        /**@description 组的右键事件 关闭其他标签页 */
        const onCloseOtherTabs = useMemoizedFn((groupItem: MultipleNodeInfo) => {
            const m = YakitModalConfirm({
                width: 420,
                type: "white",
                onCancelText: "取消",
                onOkText: "关闭其他",
                icon: <ExclamationCircleOutlined />,
                onOk: () => {
                    const newPage = [{...groupItem}]
                    onSetSelectSubMenu(groupItem)
                    onUpdatePageCache(newPage)
                    const currentGroupList: PageNodeItemProps[] = getPagesDataByGroupId(currentTabKey, groupItem.id)
                    const currentGroupItem: PageNodeItemProps | undefined = queryPagesDataById(
                        currentTabKey,
                        groupItem.id
                    )

                    if (currentGroupList && currentGroupItem) {
                        const newPageList = currentGroupList.map((ele, index) => ({...ele, sortFieId: index + 1}))
                        let pageNodeInfo: PageProps = {
                            ...cloneDeep(defPage),
                            pageList: [...newPageList, {...currentGroupItem, sortFieId: 1}],
                            routeKey: currentTabKey,
                            singleNode: false
                        }
                        setPagesData(currentTabKey, pageNodeInfo)
                    }
                    if (currentTabKey === YakitRoute.HTTPFuzzer) {
                        if (groupItem.id !== "0") {
                            onlySaveFuzzerSequenceCacheDataIncomingGroupId(groupItem.id)
                        }
                    }
                    m.destroy()
                },
                // onCancel: () => {
                //     m.destroy()
                // },
                content: "是否保留当前组及其组内标签页，关闭其他组和标签页"
            })
        })
        /**
         * @description 组的右键事件 收起和展开事件
         */
        const onUnfoldAndCollapse = useMemoizedFn((item: MultipleNodeInfo) => {
            const newItem = {...item}
            newItem.expand = !newItem.expand
            onUpdateGroup(newItem)
            setTimeout(() => {
                const number = (newItem.groupChildren || []).findIndex((ele) => ele.id === selectSubMenu.id)
                if (number !== -1 && !newItem.expand) {
                    const total = getSubPageTotal(subPage)
                    // 关闭时, 选中的item在该组内时,将选中的item变为后面可以选中的item
                    const {index} = getPageItemById(subPage, newItem.id)
                    const sLength = subPage.length
                    const initIndex = total >= 100 ? index - 1 : index + 1
                    // 因为限制100个，如果该组为最后一个，就选中上一个可选item
                    for (let i = initIndex; total >= 100 ? i > 0 : i < sLength + 1; total >= 100 ? i-- : i++) {
                        const element: MultipleNodeInfo | undefined = subPage[i]
                        if (!element) {
                            // element不存在时,新建一个tab选中
                            onAddSubPage()
                            break
                        }
                        if (element.expand && element.groupChildren && element.groupChildren.length > 0) {
                            //下一个为组时,选中组内的第一个
                            onSetSelectSubMenu(element.groupChildren[0])
                            break
                        }
                        if (element && element.groupChildren?.length === 0) {
                            // 下一个为游离的tab页面时,选中该tab
                            onSetSelectSubMenu(element)
                            break
                        }
                    }
                }
                onScrollTabMenu()
            }, 300)
        })
        /**
         * @description 更新组
         */
        const onUpdateGroup = useMemoizedFn((groupItem: MultipleNodeInfo) => {
            const index = subPage.findIndex((ele) => ele.id === groupItem.id)
            if (index === -1) return
            subPage[index] = {...groupItem}
            onUpdatePageCache([...subPage])
            let currentGroup: PageNodeItemProps | undefined = queryPagesDataById(currentTabKey, groupItem.id)
            if (currentGroup) {
                const newCurrentGroup = {
                    ...currentGroup,
                    color: groupItem.color,
                    expand: groupItem.expand,
                    pageName: groupItem.verbose
                }
                updatePagesDataCacheById(currentTabKey, newCurrentGroup)
                emiter.emit("secondMenuTabDataChange", "")
            }
        })
        const onDragStart = useMemoizedFn((result: DragStart, provided: ResponderProvided) => {
            if (!result.source) return
            const {index, subIndex} = getPageItemById(subPage, result.draggableId)
            if (index === -1) return

            if (subIndex === -1) {
                // 拖动的不是组内的item
                const groupChildrenList = subPage[index].groupChildren || []
                if (groupChildrenList.length > 0) {
                    //拖拽的是组
                    setIsCombineEnabled(false)
                    return
                }
            }
        })
        const onBeforeCapture = useMemoizedFn((result: BeforeCapture) => {
            const {index, subIndex} = getPageItemById(subPage, result.draggableId)
            if (index === -1) return
            // subIndex === -1 没有在组内
            if (subIndex === -1) {
                const groupChildrenList = subPage[index].groupChildren || []
                if (groupChildrenList.length > 0) {
                    //如果拖拽的是一个组,则应该只能排序,不能组合
                    // setDropType(droppable)
                    // setSubDropType(droppableGroup)
                    return
                } else {
                    //如果拖拽的是一个item,可以排序也可以组合
                    setDropType(droppableGroup)
                    setSubDropType(droppableGroup)
                }
            } else {
                setDropType(droppableGroup)
                setSubDropType(droppableGroup)
            }
        })
        const onScrollTabMenu = useThrottleFn(
            (e) => {
                if (tabMenuSubRef.current) {
                    const {scrollWidth, scrollLeft, clientWidth} = tabMenuSubRef.current
                    const scrollRight = scrollWidth - scrollLeft - clientWidth
                    setScroll({
                        ...scroll,
                        scrollLeft: scrollLeft,
                        scrollRight: scrollRight
                    })
                }
            },
            {wait: 200}
        ).run
        const selectMenuGroupId = useMemo(() => {
            return selectSubMenu.groupId
        }, [selectSubMenu.groupId])
        return (
            <DragDropContext
                onDragEnd={onSubMenuDragEnd}
                onDragUpdate={onDragUpdate}
                onDragStart={onDragStart}
                onBeforeCapture={onBeforeCapture}
            >
                <Droppable
                    droppableId='droppable2'
                    direction='horizontal'
                    isCombineEnabled={isCombineEnabled}
                    type={dropType}
                    // isCombineEnabled={true}
                    // type='droppable'
                >
                    {(provided, snapshot) => {
                        return (
                            <div className={styles["tab-menu-sub-body"]}>
                                <div
                                    className={classNames(styles["outline-chevron-double-left"], {
                                        [styles["outline-chevron-double-display-none"]]: scroll.scrollLeft <= 0
                                    })}
                                    ref={scrollLeftIconRef}
                                >
                                    <OutlineChevrondoubleleftIcon />
                                </div>
                                <div
                                    className={classNames(styles["tab-menu-sub"], {
                                        [styles["tab-menu-sub-width"]]: pageItem.hideAdd === true
                                    })}
                                    id={`tab-menu-sub-${pageItem.route}`}
                                    ref={provided.innerRef}
                                    onScroll={onScrollTabMenu}
                                >
                                    {subPage.map((item, indexSub) => {
                                        if (item.groupChildren && item.groupChildren.length > 0) {
                                            return (
                                                <React.Fragment key={item.id}>
                                                    <SubTabGroupItem
                                                        subPage={subPage}
                                                        subItem={item}
                                                        index={indexSub}
                                                        selectMenuGroupId={selectMenuGroupId}
                                                        selectSubMenu={selectSubMenu}
                                                        setSelectSubMenu={setSelectSubMenu}
                                                        onRemoveSub={onRemoveSubPage}
                                                        onContextMenu={onRightClickOperation}
                                                        onUnfoldAndCollapse={onUnfoldAndCollapse}
                                                        onGroupContextMenu={onGroupRightClickOperation}
                                                        dropType={subDropType}
                                                    />
                                                </React.Fragment>
                                            )
                                        }
                                        const isCombine = combineIds.findIndex((ele) => ele === item.id) !== -1
                                        return (
                                            <React.Fragment key={item.id}>
                                                <SubTabItem
                                                    subItem={item}
                                                    dropType={dropType}
                                                    index={indexSub}
                                                    selectSubMenu={selectSubMenu}
                                                    setSelectSubMenu={setSelectSubMenu}
                                                    onRemoveSub={onRemoveSubPage}
                                                    onContextMenu={onRightClickOperation}
                                                    combineColor={isCombine ? combineColorRef.current : ""}
                                                />
                                            </React.Fragment>
                                        )
                                    })}
                                    {provided.placeholder}
                                </div>
                                <div
                                    className={classNames(styles["outline-chevron-double-right"], {
                                        [styles["outline-chevron-double-display-none"]]: scroll.scrollRight <= 0
                                    })}
                                    ref={scrollRightIconRef}
                                >
                                    <OutlineChevrondoublerightIcon />
                                </div>
                                {pageItem.hideAdd !== true && (
                                    <OutlinePlusIcon
                                        className={styles["outline-plus-icon"]}
                                        onClick={() => onAddSubPage()}
                                    />
                                )}
                            </div>
                        )
                    }}
                </Droppable>
            </DragDropContext>
        )
    })
)

export interface SimpleTabInterface {
    tabId: string
    status: ExpandAndRetractExcessiveState
}

const SubTabItem: React.FC<SubTabItemProps> = React.memo((props) => {
    const {subItem, dropType, index, selectSubMenu, setSelectSubMenu, onRemoveSub, onContextMenu, combineColor} = props
    const isActive = useMemo(() => subItem.id === selectSubMenu?.id, [subItem, selectSubMenu])
    const [tabStatus, setTabStatus] = useState<ExpandAndRetractExcessiveState>()
    useEffect(() => {
        emiter.on("simpleDetectTabEvent", onSimpleDetectTabEvent)
        return () => {
            emiter.off("simpleDetectTabEvent", onSimpleDetectTabEvent)
        }
    }, [])
    // 修改颜色
    const onSimpleDetectTabEvent = useMemoizedFn((v) => {
        const obj: SimpleTabInterface = JSON.parse(v)
        if (obj.tabId === subItem.id) {
            setTabStatus(obj.status)
        }
    })
    return (
        <Draggable key={subItem.id} draggableId={subItem.id} index={index}>
            {(provided, snapshot) => {
                const itemStyle = getItemStyle(snapshot.isDragging, provided.draggableProps.style)
                return (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                            ...itemStyle
                        }}
                        className={classNames(styles["tab-menu-sub-item"], {
                            [styles["tab-menu-sub-item-active"]]: isActive,
                            [styles["tab-menu-sub-item-dragging"]]: snapshot.isDragging,
                            [styles[`tab-menu-sub-item-combine-${combineColor}`]]: !!combineColor,
                            [styles[`tab-menu-sub-item-${tabStatus}`]]: !!tabStatus
                        })}
                        onClick={() => {
                            setSelectSubMenu({...subItem})
                        }}
                        onContextMenu={(e) => onContextMenu(e, subItem)}
                    >
                        {(isActive || snapshot.isDragging) && (
                            <div
                                className={classNames({
                                    [styles["tab-menu-sub-item-line"]]: isActive || !!combineColor
                                })}
                            />
                        )}
                        <Tooltip
                            title={subItem.verbose || ""}
                            overlayClassName={styles["toolTip-overlay"]}
                            destroyTooltipOnHide={true}
                            placement='top'
                        >
                            <div className={styles["tab-menu-item-verbose-wrapper"]}>
                                <div className={styles["tab-menu-item-verbose"]}>
                                    <SolidDocumentTextIcon className={styles["document-text-icon"]} />
                                    <span className='content-ellipsis'>{subItem.verbose || ""}</span>
                                </div>
                                <RemoveIcon
                                    className={classNames(styles["remove-icon"], {
                                        [styles["remove-show-icon"]]: isActive
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onRemoveSub(subItem)
                                    }}
                                />
                            </div>
                        </Tooltip>
                    </div>
                )
            }}
        </Draggable>
    )
})

const getGroupItemStyle = (snapshotGroup, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (snapshotGroup.isDragging) {
        const index = transform.indexOf(",")
        if (index !== -1) transform = transform.substring(0, index) + ",0px)"
    }
    return {
        ...draggableStyle,
        // opacity: 1,
        transform
    }
}
const cloneItemStyle = (draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (transform) {
        const index = transform.indexOf(",")
        if (index !== -1) transform = transform.substring(0, index) + ",0px)"
    }
    return {
        ...draggableStyle,
        transform
    }
}
const SubTabGroupItem: React.FC<SubTabGroupItemProps> = React.memo((props) => {
    const {
        subPage,
        subItem,
        index,
        selectSubMenu,
        setSelectSubMenu,
        onRemoveSub,
        onContextMenu,
        onUnfoldAndCollapse,
        onGroupContextMenu,
        dropType
    } = props
    const color = useMemo(() => subItem.color || "purple", [subItem.color])

    useEffect(() => {
        let element = document.getElementById(subItem.id)
        if (!element) return
        if (subItem.expand && (!element.style.width || element.style.width === "0px")) {
            element.style.width = `${subItem.childrenWidth}px`
        }
        setTimeout(() => {
            if (!element) return
            element.style.width = ""
        }, 200)
    }, [subItem.expand, subItem.groupChildren])
    const groupChildrenList = useMemo(() => {
        return subItem.groupChildren || []
    }, [subItem.groupChildren])
    return (
        <Draggable key={subItem.id} draggableId={subItem.id} index={index}>
            {(providedGroup, snapshotGroup) => {
                const groupStyle = getGroupItemStyle(snapshotGroup, providedGroup.draggableProps.style)
                return (
                    <div
                        ref={providedGroup.innerRef}
                        {...providedGroup.draggableProps}
                        style={{...groupStyle}}
                        className={classNames(styles["tab-menu-sub-group"], styles["tab-menu-sub-group-hidden"], {
                            [styles[`tab-menu-sub-group-${color}`]]: subItem.expand
                        })}
                    >
                        <div
                            {...providedGroup.dragHandleProps}
                            className={classNames(
                                styles["tab-menu-sub-group-name"],
                                styles[`tab-menu-sub-group-name-${color}`],
                                {
                                    [styles["tab-menu-sub-group-name-retract"]]: !subItem.expand
                                }
                            )}
                            onClick={(e) => {
                                const clickedElement = e.target as any
                                // // 获取点击元素的下一个兄弟元素
                                const nextSiblingElement = clickedElement.nextElementSibling
                                if (nextSiblingElement) {
                                    const width = nextSiblingElement.clientWidth
                                    if (subItem.expand) {
                                        subItem.childrenWidth = width
                                        // 收
                                        nextSiblingElement.style = "width:0px;"
                                    } else {
                                        // 展开
                                        nextSiblingElement.style = `width:${subItem.childrenWidth}px;`
                                    }
                                }
                                onUnfoldAndCollapse(subItem)
                            }}
                            onContextMenu={(e) => onGroupContextMenu(e, index)}
                        >
                            {subItem.verbose || ""}
                            <div
                                className={classNames(
                                    styles["tab-menu-sub-group-number"],
                                    styles[`tab-menu-sub-group-number-${color}`]
                                )}
                                style={{display: subItem.expand ? "none" : "flex"}}
                            >
                                {subItem.groupChildren?.length || 0}
                            </div>
                        </div>
                        <Droppable
                            droppableId={subItem.id}
                            direction='horizontal'
                            isCombineEnabled={false}
                            type={dropType}
                            renderClone={(provided, snapshot, rubric) => {
                                const cloneStyle = cloneItemStyle(provided.draggableProps.style)
                                return (
                                    <div
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        ref={provided.innerRef}
                                        style={{...cloneStyle}}
                                    >
                                        <DroppableClone
                                            subPage={subPage}
                                            selectSubMenu={selectSubMenu}
                                            draggableId={rubric.draggableId}
                                        />
                                    </div>
                                )
                            }}
                        >
                            {(provided, snapshot) => {
                                return (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={classNames(
                                            styles["tab-menu-sub-group-children"],
                                            styles["tab-menu-sub-group-children-motion"],
                                            {
                                                [styles["tab-menu-sub-group-children-hidden"]]: !subItem.expand
                                            }
                                        )}
                                        id={subItem.id}
                                    >
                                        {groupChildrenList.map((groupItem, index) => (
                                            <React.Fragment key={groupItem.id}>
                                                <SubTabItem
                                                    subItem={groupItem}
                                                    dropType={dropType}
                                                    index={index}
                                                    selectSubMenu={selectSubMenu}
                                                    setSelectSubMenu={setSelectSubMenu}
                                                    onRemoveSub={onRemoveSub}
                                                    onContextMenu={onContextMenu}
                                                    combineColor={color}
                                                />
                                            </React.Fragment>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )
                            }}
                        </Droppable>
                    </div>
                )
            }}
        </Draggable>
    )
})

/**验证组名是否超过50个字符 */
const onVerifyGroupName = (val: string) => {
    if (val.length > 50) {
        yakitNotify("error", "不能超过50个字符")
        return false
    }
    return true
}
const GroupRightClickShowContent: React.FC<GroupRightClickShowContentProps> = React.memo((props) => {
    const {groupItem, onOperateGroup, onUpdateGroup} = props
    const [group, setGroup] = useState<MultipleNodeInfo>({...groupItem})
    const [name, setName] = useState<string>(group.verbose)
    useEffect(() => {
        setName(group.verbose)
    }, [group.verbose])
    const onUpdate = useMemoizedFn((text, value) => {
        group[text] = value
        setGroup({...group})
        onUpdateGroup({...group})
    })

    return (
        <div
            className={styles["group-right-click-show-content"]}
            onClick={(e) => {
                e.stopPropagation()
            }}
        >
            <div className={styles["show-content-heard"]}>
                <YakitInput
                    value={name}
                    onChange={(e) => {
                        const {value} = e.target
                        if (onVerifyGroupName(value)) {
                            setName(value)
                        }
                    }}
                    onPressEnter={() => {
                        if (onVerifyGroupName(name)) {
                            onUpdate("verbose", name)
                        }
                    }}
                    onBlur={(e) => {
                        const {value} = e.target
                        if (onVerifyGroupName(value)) {
                            onUpdate("verbose", value)
                        }
                    }}
                />
                <div className={classNames(styles["color-list"])}>
                    {colorList.map((color) => (
                        <div
                            className={classNames(styles["color-list-item"], `color-bg-${color}`)}
                            onClick={(e) => {
                                onUpdate("color", color)
                            }}
                            key={color}
                        >
                            {group.color === color && <CheckIcon className={styles["check-icon"]} />}
                        </div>
                    ))}
                </div>
            </div>
            <YakitMenu
                type='grey'
                width={232}
                data={[
                    {
                        label: "取消组合",
                        key: "cancelGroup"
                    },
                    {
                        label: "关闭组",
                        key: "closeGroup"
                    },
                    {
                        label: "关闭其他标签页",
                        key: "closeOtherTabs"
                    }
                ]}
                onClick={({key}) => {
                    onOperateGroup(key as OperateGroup, group)
                }}
            />
        </div>
    )
})

const CloseGroupContent: React.FC = React.memo(() => {
    const [tipChecked, setTipChecked] = useState<boolean>(false)
    const onChecked = useMemoizedFn((check: boolean) => {
        setTipChecked(check)
        setRemoteValue(Close_Group_Tip, `${!check}`)
    })
    return (
        <div className={styles["close-group-content"]}>
            <div>是否关闭当前组,关闭后,组内的页面也会关闭</div>
            <label className={styles["close-group-check"]}>
                <YakitCheckbox checked={tipChecked} onChange={(e) => onChecked(e.target.checked)} />
                不再提示
            </label>
        </div>
    )
})

const DroppableClone: React.FC<DroppableCloneProps> = React.memo((props) => {
    const {subPage, selectSubMenu, draggableId} = props
    const [groupItem, setGroupItem] = useState<MultipleNodeInfo>({
        id: "0",
        verbose: "",
        sortFieId: 1,
        groupId: "0"
    })
    const [item, setItem] = useState<MultipleNodeInfo>({
        id: "0",
        verbose: "",
        sortFieId: 1,
        groupId: "0"
    })
    useEffect(() => {
        const {index, subIndex} = getPageItemById(subPage, draggableId)
        if (subIndex === -1) return
        let groupChildrenList = subPage[index].groupChildren || []
        if (groupChildrenList.length === 0) return
        let item: MultipleNodeInfo = groupChildrenList[subIndex]
        setItem(item)
        setGroupItem(subPage[index])
    }, [draggableId])
    const isActive = useMemo(() => item.id === selectSubMenu?.id, [item, selectSubMenu])
    return (
        <div
            className={classNames(styles["tab-menu-sub-item"], {
                [styles["tab-menu-sub-item-active"]]: isActive,
                [styles["tab-menu-sub-item-dragging"]]: true,
                [styles[`tab-menu-sub-item-combine-${groupItem.color}`]]: !!groupItem.color
            })}
        >
            {isActive && (
                <div
                    className={classNames({
                        [styles["tab-menu-sub-item-active-line"]]: isActive || !!groupItem.color
                    })}
                />
            )}
            <div className={styles["tab-menu-item-verbose-wrapper"]}>
                <div className={styles["tab-menu-item-verbose"]}>
                    <SolidDocumentTextIcon className={styles["document-text-icon"]} />
                    <span className='content-ellipsis'>{item.verbose || ""}</span>
                </div>
                <RemoveIcon
                    className={classNames(styles["remove-icon"], {
                        [styles["remove-show-icon"]]: isActive
                    })}
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                />
            </div>
        </div>
    )
})

// 多开页面的一级页面关闭的确认弹窗
const onModalSecondaryConfirm = (props?: YakitSecondaryConfirmProps) => {
    let m = YakitModalConfirm({
        width: 420,
        type: "white",
        onCancelText: "不保存",
        onOkText: "保存",
        keyboard: false,
        zIndex: 1010,
        ...(props || {}),
        onOk: () => {
            if (props?.onOk) {
                props.onOk(m)
            } else {
                m.destroy()
            }
        },
        content: props?.content
    })
    return m
}
