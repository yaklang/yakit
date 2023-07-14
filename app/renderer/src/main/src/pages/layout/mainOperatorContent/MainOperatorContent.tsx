import React, {useState, useEffect, useRef, useMemo, useContext, createContext} from "react"
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
    PageItemProps,
    MainOperatorContextProps,
    SubTabGroupItemProps
} from "./MainOperatorContentType"
import styles from "./MainOperatorContent.module.scss"
import {
    YakitRouteToPageInfo,
    YakitRoute,
    RouteToPage,
    SinglePageRoute,
    NoPaddingRoute,
    ComponentParams
} from "@/routes/newRoute"
import {isEnpriTraceAgent, isBreachTrace, shouldVerifyEnpriTraceLogin} from "@/utils/envfile"
import {useDebounceEffect, useGetState, useMap, useMemoizedFn} from "ahooks"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import classNames from "classnames"
import _ from "lodash"
import {KeyConvertRoute, routeConvertKey} from "../publicMenu/utils"
import {OutlinePlusIcon, RemoveIcon, SolidDocumentTextIcon} from "@/assets/newIcon"
import {RouteToPageProps} from "../publicMenu/PublicMenu"
import {YakitSecondaryConfirmProps, useSubscribeClose} from "@/store/tabSubscribe"
import {YakitModalConfirm, showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {defaultUserInfo} from "@/pages/MainOperator"
import {useStore} from "@/store"
import {getLocalValue, getRemoteProjectValue, setRemoteProjectValue, setRemoteValue} from "@/utils/kv"
import {BugInfoProps, BugList, CustomBugList} from "@/pages/invoker/batch/YakBatchExecutors"
import {UnfinishedBatchTask, UnfinishedSimpleDetectBatchTask} from "@/pages/invoker/batch/UnfinishedBatchTaskList"
import {QueryYakScriptsResponse} from "@/pages/invoker/schema"
import {showModal} from "@/utils/showModal"
import {DownloadAllPlugin} from "@/pages/simpleDetect/SimpleDetect"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import debounce from "lodash/debounce"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import ReactResizeDetector from "react-resize-detector"
import {compareAsc} from "@/pages/yakitStore/viewers/base"

const TabRenameModalContent = React.lazy(() => import("./TabRenameModalContent"))

const {Content} = Layout
const {ipcRenderer} = window.require("electron")

export const MainOperatorContext = createContext<MainOperatorContextProps>({
    pageCache: [],
    setPageCache: () => {},
    currentTabKey: "",
    setCurrentTabKey: () => {},
    tabMenuHeight: 0,
    setTabMenuHeight: () => {},
    openMultipleMenuPage: () => {},
    afterDeleteFirstPage: () => {},
    afterDeleteSubPage: () => {},
    afterUpdateSubPage: () => {},
    afterDragEndSubPage: () => {}
})

/** web-fuzzer缓存数据对应键 */
const FuzzerCache = "fuzzer-list-cache"

const colorList = ["red", "green", "blue", "yellow", "orange", "purple", "cyan", "bluePurple", "grey"]

const getWebFuzzerCacheToPage = (list) => {
    try {
        const l = list.length
        const map: any = {},
            dest: any = []
        for (var i = 0; i < l; i++) {
            var ai = list[i]
            if (!map[ai.groupId]) {
                dest.push({
                    groupId: ai.groupId,
                    sortFieId: ai.sortFieId,
                    data: [ai]
                })
                map[ai.groupId] = ai
            } else {
                for (var j = 0; j < dest.length; j++) {
                    var dj = dest[j]
                    if (dj.groupId === ai.groupId) {
                        if (ai.groupName !== undefined) {
                            dj.sortFieId = ai.sortFieId
                        }
                        dj.data.push(ai)
                        break
                    }
                }
            }
        }
        return dest.sort((a, b) => compareAsc(a, b, "sortFieId")) || []
    } catch (error) {
        return []
    }
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
    const result = Array.from(list)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
}
/**
 * @description 根据页面信息生成id
 * @returns {string} id
 */
const getIdByPageInfo = (route: YakitRoute, pluginName?: string) => {
    const key = routeConvertKey(route, pluginName)
    const time = new Date().getTime().toString()
    const id = `${key}-[${randomString(6)}]-${time}`
    return id
}

export const MainOperatorContent: React.FC<MainOperatorContentProps> = React.memo((props) => {
    const {routeKeyToLabel} = props

    const [loading, setLoading] = useState(false)
    const [tabMenuHeight, setTabMenuHeight] = useState<number>(0)

    // tab数据
    const [pageCache, setPageCache, getPageCache] = useGetState<PageCache[]>(_.cloneDeepWith(getInitPageCache()) || [])
    const [currentTabKey, setCurrentTabKey] = useState<YakitRoute | string>(getInitActiveTabKey())

    // 发送到专项漏洞检测modal-show变量
    const [bugTestShow, setBugTestShow] = useState<boolean>(false)
    const [bugList, setBugList] = useState<BugInfoProps[]>([])
    const [bugTestValue, setBugTestValue] = useState<BugInfoProps[]>([])
    const [bugUrl, setBugUrl] = useState<string>("")

    // 打开tab页面
    useEffect(() => {
        // 写成HOC是否好点呢，现在一个页面启动就是一个函数
        ipcRenderer.on("fetch-send-to-tab", (e, res: any) => {
            const {type, data = {}} = res
            if (type === "fuzzer") addFuzzer(data)
            if (type === "websocket-fuzzer") addWebsocketFuzzer(data)
            if (type === "scan-port") addScanPort(data)
            if (type === "brute") addBrute(data)
            if (type === "bug-test") addBugTest(1, data)
            if (type === "plugin-store") addYakRunning(data)
            if (type === "batch-exec-recover") addBatchExecRecover(data as UnfinishedBatchTask)
            if (type === "simple-batch-exec-recover") addSimpleBatchExecRecover(data as UnfinishedSimpleDetectBatchTask)
            if (type === "exec-packet-scan")
                addPacketScan(data["httpFlows"], data["https"], data["httpRequest"], data["keyword"])
            if (type === "add-yakit-script") addYakScript(data)
            if (type === "yakit-plugin-journal-details") addYakPluginJournalDetails(data)
            if (type === "online-plugin-recycle-bin") addOnlinePluginRecycleBin(data)
            if (type === "facade-server") addFacadeServer(data)
            if (type === "add-yak-running") addYakRunning(data)
            if (type === "**screen-recorder") openMenuPage({route: YakitRoute.ScreenRecorderPage})
            if (type === "**chaos-maker") openMenuPage({route: YakitRoute.DB_ChaosMaker})
            if (type === "**matcher-extractor") openMenuPage({route: YakitRoute.Beta_MatcherExtractorPage})
            if (type === "**debug-plugin") openMenuPage({route: YakitRoute.Beta_DebugPlugin})
            if (type === "**debug-monaco-editor") openMenuPage({route: YakitRoute.Beta_DebugMonacoEditor})
            if (type === "**vulinbox-manager") openMenuPage({route: YakitRoute.Beta_VulinboxManager})
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
            if (type === YakitRoute.DB_Risk) {
                openMenuPage({route: YakitRoute.DB_Risk})
            }
            if (type === YakitRoute.DNSLog) {
                openMenuPage({route: YakitRoute.DNSLog})
            }
            console.info("send to tab: ", type)
        })

        return () => {
            ipcRenderer.removeAllListeners("fetch-send-to-tab")
        }
    }, [])
    /** ---------- 增加tab页面 start ---------- */
    /** Global Sending Function(全局发送功能|通过发送新增功能页面)*/
    const addFuzzer = useMemoizedFn((res: any) => {
        const {isHttps, isGmTLS, request} = res || {}
        if (request) {
            openMenuPage(
                {route: YakitRoute.HTTPFuzzer},
                {
                    params: {
                        isHttps: isHttps || false,
                        isGmTLS: isGmTLS || false,
                        request: request || "",
                        system: system,
                        shareContent: res.shareContent
                    }
                }
            )
        }
    })
    /** websocket fuzzer 和 Fuzzer 类似 */
    const addWebsocketFuzzer = useMemoizedFn((res: {tls: boolean; request: Uint8Array}) => {
        openMenuPage(
            {route: YakitRoute.WebsocketFuzzer},
            {
                params: {
                    wsRequest: res.request,
                    wsTls: res.tls
                }
            }
        )
    })
    const addScanPort = useMemoizedFn((res: any) => {
        const {URL = ""} = res || {}
        if (URL) {
            openMenuPage(
                {route: YakitRoute.Mod_ScanPort},
                {
                    params: {
                        scanportParams: URL
                    }
                }
            )
        }
    })
    const addBrute = useMemoizedFn((res: any) => {
        const {URL = ""} = res || {}
        if (URL) {
            openMenuPage(
                {route: YakitRoute.Mod_Brute},
                {
                    params: {
                        bruteParams: URL
                    }
                }
            )
        }
    })
    const addBugTest = useMemoizedFn((type: number, res?: any) => {
        const {URL = ""} = res || {}
        if (type === 1 && URL) {
            setBugUrl(URL)
            getLocalValue(CustomBugList)
                .then((res: any) => {
                    setBugList(res ? JSON.parse(res) : [])
                    setBugTestShow(true)
                })
                .catch(() => {})
        }
        if (type === 2) {
            const filter = pageCache.filter((item) => item.route === YakitRoute.PoC)
            if (filter.length === 0) {
                openMenuPage({route: YakitRoute.PoC})
                setTimeout(() => {
                    ipcRenderer.invoke("send-to-bug-test", {type: bugTestValue, data: bugUrl})
                    setBugTestValue([])
                    setBugUrl("")
                }, 300)
            } else {
                ipcRenderer.invoke("send-to-bug-test", {type: bugTestValue, data: bugUrl})
                setCurrentTabKey(YakitRoute.PoC)
                setBugTestValue([])
                setBugUrl("")
            }
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
                params: {
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
                params: {
                    recoverUid: task.Uid,
                    recoverBaseProgress: task.Percent,
                    recoverOnlineGroup: task.YakScriptOnlineGroup,
                    recoverTaskName: task.TaskName
                },
                hideAdd: true
            }
        )
    })
    const addPacketScan = useMemoizedFn(
        (httpFlows: number[], https: boolean, request?: Uint8Array, keyword?: string) => {
            openMenuPage(
                {route: YakitRoute.PacketScanPage},
                {
                    params: {
                        packetScan_FlowIds: httpFlows,
                        packetScan_Https: https,
                        packetScan_HttpRequest: request,
                        packetScan_Keyword: keyword
                    },
                    hideAdd: true
                }
            )
        }
    )
    /** ---------- 新建插件 ---------- */
    const addYakScript = useMemoizedFn((res: any) => {
        openMenuPage({route: YakitRoute.AddYakitScript})
    })
    /** ---------- 插件修改历史详情 ---------- */
    const addYakPluginJournalDetails = useMemoizedFn((res: any) => {
        const time = new Date().getTime().toString()
        openMenuPage(
            {route: YakitRoute.YakitPluginJournalDetails},
            {
                params: {
                    YakScriptJournalDetailsId: res.YakScriptJournalDetailsId
                },
                hideAdd: true
            }
        )
    })
    /** ---------- 插件回收站 ---------- */
    const addOnlinePluginRecycleBin = useMemoizedFn((res: any) => {
        openMenuPage({route: YakitRoute.OnlinePluginRecycleBin})
    })
    const addFacadeServer = useMemoizedFn((res: any) => {
        const {facadeParams, classParam, classType} = res || {}
        if (facadeParams && classParam && classType) {
            openMenuPage(
                {route: YakitRoute.ReverseServer_New},
                {
                    params: {
                        facadeServerParams: facadeParams,
                        classGeneraterParams: classParam,
                        classType: classType
                    }
                }
            )
        }
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
            delFuzzerList(1)
            setPageCache(getInitPageCache())
            setCurrentTabKey(getInitActiveTabKey())
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-close-tab")
            ipcRenderer.removeAllListeners("fetch-close-all-tab")
        }
    }, [])
    /** ---------- 远程关闭一级页面 end ---------- */

    /**
     * @name 全局功能快捷键
     */
    const documentKeyDown = useMemoizedFn((e: any) => {
        // ctrl/command + w 关闭当前页面
        e.stopPropagation()
        if (e.code === "KeyW" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if (pageCache.length === 0 || currentTabKey === YakitRoute.NewHome) return
            setLoading(true)
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
                removeMenuPage(info)
            }
            setTimeout(() => setLoading(false), 300)
            return
        }
    })
    useEffect(() => {
        document.onkeydown = documentKeyDown
    }, [])

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
                verbose?: string
                hideAdd?: boolean
                params?: ComponentParams
            }
        ) => {
            const {route, pluginId = 0, pluginName = ""} = routeInfo
            // 菜单在代码内的名字
            const menuName = route === YakitRoute.Plugin_OP ? pluginName : YakitRouteToPageInfo[route]?.label || ""
            if (!menuName) return

            const filterPage = pageCache.filter((item) => item.route === route && item.menuName === menuName)
            // 单开页面
            if (SinglePageRoute.includes(route)) {
                const key = routeConvertKey(route, pluginName)
                // 如果存在，设置为当前页面
                if (filterPage.length > 0) {
                    setCurrentTabKey(key)
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
                        params: nodeParams?.params
                    }
                ])
                setCurrentTabKey(key)
            } else {
                // 多开页面
                const key = routeConvertKey(route, pluginName)
                const tabName = routeKeyToLabel.get(key) || menuName
                const time = new Date().getTime().toString()
                const tabId = `${key}-[${randomString(6)}]-${time}`

                const verbose =
                    nodeParams?.verbose ||
                    `${tabName}-[${filterPage.length > 0 ? (filterPage[0].multipleLength || 0) + 1 : 1}]`
                const node: MultipleNodeInfo = {
                    id: tabId,
                    verbose,
                    time,
                    params: {
                        ...nodeParams?.params,
                        id: tabId
                    },
                    groupId: `[${randomString(6)}]-${time}`,
                    sortFieId: filterPage.length || 1
                }
                if (filterPage.length > 0) {
                    const pages: PageCache[] = []
                    pageCache.forEach((item, i) => {
                        const eleItem: PageCache = {...item, multipleNode: [...item.multipleNode]}
                        if (eleItem.route === route && eleItem.menuName === menuName) {
                            eleItem.pluginId = pluginId
                            eleItem.multipleNode.push({...node})
                            eleItem.multipleLength = (eleItem.multipleLength || 0) + 1
                        }
                        pages.push({...eleItem})
                    })
                    setPageCache([...pages])
                    setCurrentTabKey(key)
                } else {
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
                    setCurrentTabKey(key)
                }
                if (route === YakitRoute.HTTPFuzzer) {
                    addFuzzerList(node.id, node)
                }
            }
        }
    )
    /** @name 多开页面的额外处理逻辑(针对web-fuzzer页面) */
    const openMultipleMenuPage = useMemoizedFn((route: RouteToPageProps) => {
        if (route.route === YakitRoute.HTTPFuzzer) {
            // const time = new Date().getTime().toString()
            openMenuPage(route, {
                params: {
                    system: system
                    // order: time
                }
            })
        } else openMenuPage(route)
    })
    /** @name 判断页面是否打开，打开则定位该页面，未打开则打开页面 */
    const extraOpenMenuPage = useMemoizedFn((routeInfo: RouteToPageProps) => {
        if (SinglePageRoute.includes(routeInfo.route)) {
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
    /** @description 多开页面的一级页面关闭事件 */
    const onBeforeRemovePage = useMemoizedFn((data: OnlyPageCache) => {
        switch (data.route) {
            case YakitRoute.AddYakitScript:
            case YakitRoute.HTTPFuzzer:
                const modalProps = getSubscribeClose(data.route)
                onModalSecondaryConfirm(modalProps)
                break

            default:
                removeMenuPage(data)
                break
        }
    })
    /** @name 移除一级页面 */
    const removeMenuPage = useMemoizedFn((data: OnlyPageCache) => {
        const index = pageCache.findIndex((item) => {
            if (data.route === YakitRoute.Plugin_OP) {
                return item.route === data.route && item.menuName === data.menuName
            } else {
                return item.route === data.route
            }
        })
        if (index === -1) return

        let newIndex = 0
        if (index > 0 && getPageCache()[index - 1]) newIndex = index - 1
        if (index === 0 && getPageCache()[index + 1]) newIndex = index + 1
        const {route, pluginId = 0, pluginName = ""} = getPageCache()[newIndex]
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
        if (data.route === YakitRoute.AddYakitScript) {
            setCurrentTabKey(YakitRoute.Plugin_Local)
        }
        if (data.route === YakitRoute.HTTPFuzzer) {
            delFuzzerList(1) // 删除web-fuzzer页面缓存数据
            removeSubscribeClose(YakitRoute.HTTPFuzzer)
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
                removeMenuPage({route: YakitRoute.PlugInAdminPage, menuName: ""})
            }
            IsEnpriTrace ? setRemoteValue("token-online-enterprise", "") : setRemoteValue("token-online", "")
        })
        return () => {
            ipcRenderer.removeAllListeners("login-out")
        }
    }, [])
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
                    const m = showModal({
                        title: "导入插件",
                        content: <DownloadAllPlugin type='modal' onClose={() => m.destroy()} />
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
    // web-fuzzer多开页面缓存数据
    const fuzzerList = useRef<Map<string, MultipleNodeInfo>>(new Map<string, MultipleNodeInfo>())
    // 定时向数据库保存web-fuzzer缓存数据
    const saveFuzzerList = debounce(() => {
        const historys: MultipleNodeInfo[] = []
        fuzzerList.current.forEach((value) => {
            if ((value?.params?.request || "").length < 1000000) historys.push(value)
        })
        console.log("historys", historys)
        setRemoteProjectValue(FuzzerCache, JSON.stringify(historys))
    }, 500)
    // 获取数据库中缓存的web-fuzzer页面信息
    const fetchFuzzerList = useMemoizedFn(() => {
        // 如果路由中已经存在webFuzzer页面，则不需要再从缓存中初始化页面
        if (pageCache.findIndex((ele) => ele.route === YakitRoute.HTTPFuzzer) !== -1) return
        setLoading(true)
        getRemoteProjectValue(FuzzerCache)
            .then((res: any) => {
                const cache = JSON.parse(res || "[]")
                let multipleNodeList: MultipleNodeInfo[] = []
                // 菜单在代码内的名字
                const menuName = YakitRouteToPageInfo[YakitRoute.HTTPFuzzer]?.label || ""
                const key = routeConvertKey(YakitRoute.HTTPFuzzer, "")
                const tabName = routeKeyToLabel.get(key) || menuName
                const fuzeerArray = getWebFuzzerCacheToPage(cache)
                const l = fuzeerArray.length
                let multipleNodeListLength: number = 0
                fuzzerList.current.clear()
                // 这里看看需要对其数量进行限制不
                for (let index = 0; index < l; index++) {
                    const itemObj = fuzeerArray[index]
                    const groupChildrenList: MultipleNodeInfo[] = []
                    let groupItem: MultipleNodeInfo = {
                        id: "0",
                        verbose: "",
                        sortFieId: 1
                    }
                    const groupTime = (new Date().getTime() + index).toString()
                    const groupId = `[${randomString(6)}]-${groupTime}`
                    itemObj.data.forEach((ele, number) => {
                        const time = (new Date().getTime() + number).toString() // +index 唯一
                        const verbose = ele.verbose || `${tabName}-[${(multipleNodeList.length || 0) + 1}]` // webFuzzer 保存的修改后的菜单二级tab名字
                        const tabId = `${key}-[${randomString(6)}]-${time}`
                        const nodeItem: MultipleNodeInfo = {
                            ...ele,
                            verbose,
                            id: tabId,
                            groupId,
                            time: time,
                            sortFieId: index + 1, // 以1开始排序
                            params: {
                                ...ele.params,
                                id: tabId
                            }
                        }
                        fuzzerList.current.set(tabId, {...nodeItem})
                        if (ele.groupName !== undefined) {
                            groupItem = {...nodeItem}
                        } else {
                            groupChildrenList.push({...nodeItem})
                        }
                    })
                    if (groupItem.id !== "0") {
                        multipleNodeListLength += groupChildrenList.length
                        multipleNodeList.push({
                            ...groupItem,
                            groupChildren: groupChildrenList
                        })
                    } else {
                        multipleNodeListLength++
                        multipleNodeList.push({
                            ...(groupChildrenList[0] || {})
                        })
                    }
                }
                if (multipleNodeList.length === 0) return
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
                setPageCache(oldPageCache)
                setCurrentTabKey(key)
            })
            .catch((e) => {
                console.info(e)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    // 新增缓存数据
    /**@description 新增缓存数据 目前最新只缓存 request isHttps verbose */
    const addFuzzerList = (key: string, node: MultipleNodeInfo) => {
        fuzzerList.current.set(key, node)
    }
    /**
     * 删除web-fuzzer页面缓存数据
     * @description 1-删除全部缓存数据
     * @description 2-删除指定缓存数据
     * @description 3-删除除指定外的所有缓存数据
     */
    const delFuzzerList = (type: number, key?: string) => {
        if (type === 1) fuzzerList.current.clear()
        if (type === 2 && key) if (fuzzerList.current.has(key)) fuzzerList.current.delete(key)
        if (type === 3 && key) {
            const info = fuzzerList.current.get(key)
            if (info) {
                fuzzerList.current.clear()
                fuzzerList.current.set(key, info)
            }
        }
        saveFuzzerList()
    }
    // 更新缓存数据内容
    const updateFuzzerList = (key: string, param: MultipleNodeInfo) => {
        fuzzerList.current.set(key, param)
        saveFuzzerList()
    }

    useEffect(() => {
        // web-fuzzer页面更新缓存数据
        ipcRenderer.on("fetch-fuzzer-setting-data", (e, res: any) => {
            try {
                const haveItem = fuzzerList.current.get(res.key || "")
                if (!haveItem) return
                const params = JSON.parse(res.param)
                updateFuzzerList(res.key, {...haveItem, params})
            } catch (error) {
                yakitNotify("error", "webFuzzer数据缓存失败：" + error)
            }
        })
        // 触发获取web-fuzzer的缓存
        fetchFuzzerList()

        return () => {
            ipcRenderer.removeAllListeners("fetch-fuzzer-setting-data")
        }
    }, [])
    /** ---------- web-fuzzer 缓存逻辑 end ---------- */

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

    /** ---------- MainOperatorContext回调 start ---------- */
    const onAfterDeleteFirstPage = useMemoizedFn((type: "all" | "other" | "single", page?: PageCache) => {
        switch (type) {
            case "all":
                delFuzzerList(1)
                break
            case "other":
                if (!page) return
                if (page.route !== YakitRoute.HTTPFuzzer) delFuzzerList(1)
                break
            default:
                break
        }
    })
    const onAfterDeleteSubPage = useMemoizedFn(
        (subType: "other" | "single", route: YakitRoute | string, subPage: MultipleNodeInfo) => {
            switch (subType) {
                case "other":
                    if (route === YakitRoute.HTTPFuzzer) delFuzzerList(3, subPage.id)
                    break
                default:
                    if (route === YakitRoute.HTTPFuzzer) delFuzzerList(2, subPage.id)
                    break
            }
        }
    )
    const onAfterUpdateSubPage = useMemoizedFn((page: PageCache, subItem: MultipleNodeInfo) => {
        switch (page.route) {
            case YakitRoute.HTTPFuzzer:
                if (subItem.id) {
                    const haveItem = fuzzerList.current.get(subItem.id)
                    updateFuzzerList(subItem.id, {...haveItem, ...subItem, params: haveItem?.params})
                }
                break

            default:
                break
        }
    })
    const onAfterDragEndSubPage = useMemoizedFn((page: PageCache, subPage: MultipleNodeInfo[]) => {
        switch (page.route) {
            case YakitRoute.HTTPFuzzer:
                if (subPage.length <= 0) return
                subPage.forEach((subItem, subIndex) => {
                    if (subItem.groupChildren && subItem.groupChildren.length > 0) {
                        subItem.groupChildren.forEach((groupChildrenItem, groupIndex) => {
                            const haveGroupChildrenItem = fuzzerList.current.get(groupChildrenItem.id)
                            const newGroupChildrenItem: MultipleNodeInfo = {
                                ...haveGroupChildrenItem,
                                ...groupChildrenItem,
                                params: haveGroupChildrenItem?.params,
                                sortFieId: groupIndex + 1
                            }
                            fuzzerList.current.set(groupChildrenItem.id, newGroupChildrenItem)
                        })
                        if (!subItem.groupId) return
                        const newGroupItem: MultipleNodeInfo = {
                            id: subItem.groupId,
                            verbose: subItem.groupName || "",
                            groupId: subItem.groupId,
                            groupName: subItem.groupName,
                            expand: subItem.expand,
                            color: subItem.color,
                            sortFieId: subIndex + 1
                        }
                        fuzzerList.current.set(subItem.groupId, newGroupItem)
                    } else {
                        const haveItem = fuzzerList.current.get(subItem.id)
                        const newItem: MultipleNodeInfo = {
                            ...haveItem,
                            ...subItem,
                            params: haveItem?.params,
                            sortFieId: subIndex + 1,
                            // groupId: undefined,
                            groupChildren: [],
                            groupName: undefined,
                            expand: undefined,
                            color: undefined
                        }
                        fuzzerList.current.set(subItem.id, newItem)
                    }
                })
                saveFuzzerList()
                break

            default:
                break
        }
    })
    /** ---------- MainOperatorContext回调 end ---------- */
    return (
        <Content>
            <MainOperatorContext.Provider
                value={{
                    pageCache,
                    setPageCache,
                    currentTabKey,
                    setCurrentTabKey,
                    tabMenuHeight,
                    setTabMenuHeight,
                    openMultipleMenuPage,
                    afterDeleteFirstPage: onAfterDeleteFirstPage,
                    afterDeleteSubPage: onAfterDeleteSubPage,
                    afterUpdateSubPage: onAfterUpdateSubPage,
                    afterDragEndSubPage: onAfterDragEndSubPage
                }}
            >
                <TabContent
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
            </MainOperatorContext.Provider>
            <YakitModal
                visible={bugTestShow}
                onCancel={() => setBugTestShow(false)}
                onOk={() => {
                    if ((bugTestValue || []).length === 0) return yakitNotify("error", "请选择类型后再次提交")
                    addBugTest(2)
                    setBugTestShow(false)
                }}
                type='white'
                title={<></>}
                closable={true}
            >
                <div style={{padding: "0 24px"}}>
                    <Form.Item label='专项漏洞类型'>
                        <YakitSelect
                            allowClear={true}
                            onChange={(value, option: any) => {
                                const {record} = option
                                setBugTestValue(
                                    value
                                        ? [
                                              {
                                                  filter: record?.filter,
                                                  key: record?.key,
                                                  title: record?.title
                                              }
                                          ]
                                        : []
                                )
                            }}
                            value={(bugTestValue || [])[0]?.key}
                        >
                            {(BugList.concat(bugList) || []).map((item) => (
                                <YakitSelect.Option key={item.key} value={item.key} record={item}>
                                    {item.title}
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
    const {pageCache, setPageCache, setTabMenuHeight} = useContext(MainOperatorContext)
    const {onRemove} = props

    /** ---------- 拖拽排序 start ---------- */
    const onDragEnd = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable1" && result.destination.droppableId === "droppable1") {
            const menuList: PageCache[] = reorder(pageCache, result.source.index, result.destination.index)
            setPageCache(menuList)
        }
    })

    /** ---------- 拖拽排序 end ---------- */
    return (
        <div className={styles["tab-menu"]}>
            <ReactResizeDetector
                onResize={(_, height) => {
                    if (!height) return
                    setTabMenuHeight(height)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <TabList onRemove={onRemove} onDragEnd={onDragEnd} />
            <TabChildren />
        </div>
    )
})

const TabChildren: React.FC<TabChildrenProps> = React.memo((props) => {
    const {pageCache, currentTabKey} = useContext(MainOperatorContext)
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
                            <PageItem routeKey={pageItem.route} params={pageItem.params} />
                        ) : (
                            <SubTabList pageItem={pageItem} index={index} />
                        )}
                    </div>
                )
            })}
        </>
    )
})

const PageItem: React.FC<PageItemProps> = React.memo(
    (props) => {
        return <>{RouteToPage(props.routeKey, props.yakScriptId, props.params)}</>
    },
    (preProps, nextProps) => {
        if (preProps.routeKey === nextProps.routeKey) {
            return true
        }
        return false
    }
)

const TabList: React.FC<TabListProps> = React.memo((props) => {
    const {pageCache, setPageCache, currentTabKey, setCurrentTabKey, afterDeleteFirstPage} =
        useContext(MainOperatorContext)
    const {onDragEnd, onRemove} = props
    const onRightClickOperation = useMemoizedFn((event: React.MouseEvent, index: number) => {
        const currentPageItem: PageCache = pageCache[index]
        showByRightContext(
            {
                width: 180,
                type: "grey",
                data: [
                    {
                        label: "关闭所有标签页",
                        key: "remove"
                    },
                    {
                        label: "关闭其他标签页",
                        key: "removeOther"
                    }
                ],
                onClick: ({key, keyPath}) => {
                    switch (key) {
                        case "remove":
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
            event.clientY
        )
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
                const newPage: PageCache | undefined = pageCache.find((p) => p.route === YakitRoute.NewHome)
                if (!!newPage) {
                    const key = newPage.routeKey
                    setPageCache([newPage])
                    setCurrentTabKey(key)
                } else {
                    setPageCache([])
                }
                m.destroy()
                afterDeleteFirstPage("all")
            },
            onCancel: () => {
                m.destroy()
            },
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
                const newPage: PageCache[] = [{...pageCache[0]}, item]
                setPageCache(newPage)
                afterDeleteFirstPage("other", item)
                m.destroy()
            },
            onCancel: () => {
                m.destroy()
            },
            content: "是否保留当前标签页，关闭其他标签页"
        })
    })
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId='droppable1' direction='horizontal'>
                {(provided, snapshot) => (
                    <div className={styles["tab-menu-first"]} {...provided.droppableProps} ref={provided.innerRef}>
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
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    )
})
const TabItem: React.FC<TabItemProps> = React.memo((props) => {
    const {index, item, currentTabKey, onSelect, onRemove, onContextMenu} = props
    return (
        <>
            {item.verbose === "首页" ? (
                <div
                    className={classNames(styles["tab-menu-first-item"], {
                        [styles["tab-menu-first-item-active"]]: item.routeKey === currentTabKey
                    })}
                    key={item.routeKey}
                    onClick={() => {
                        onSelect(item, item.routeKey)
                    }}
                    style={{maxWidth: 60, minWidth: 40}}
                >
                    <span>{item.verbose || ""}</span>
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
                                <div className={styles["tab-menu-item-verbose"]}>
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
    const {
        openMultipleMenuPage,
        pageCache,
        setPageCache,
        currentTabKey,
        setCurrentTabKey,
        afterDeleteSubPage,
        afterUpdateSubPage,
        afterDragEndSubPage
    } = useContext(MainOperatorContext)
    const {pageItem, index} = props
    const [subPage, setSubPage] = useState<MultipleNodeInfo[]>(pageItem.multipleNode || [])
    const [renderSubPage, setRenderSubPage] = useState<MultipleNodeInfo[]>([])
    const [selectSubMenu, setSelectSubMenu] = useState<MultipleNodeInfo>({
        id: "0",
        verbose: "",
        sortFieId: 1
    }) // 选中的二级菜单
    const [currentSubIndex, setCurrentSubIndex] = useState<number>(0)
    const [combineIds, setCombineIds] = useState<string[]>([]) //组合中的ids

    const [alreadyRenderList, {set: setRenderList, get: getRenderList}] = useMap<string, boolean>(
        new Map<string, boolean>()
    )

    const tabsRef = useRef(null)
    const combineColorRef = useRef<string>("purple")

    useDebounceEffect(
        () => {
            // 多个二级批量新增时，控制渲染
            setRenderList(selectSubMenu.id, true)
        },
        [selectSubMenu],
        {wait: 200}
    )
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
            setSelectSubMenu(currentNode)
            setCurrentSubIndex(multipleNodeLength - 1)
        }
    }, [pageItem.multipleLength])
    useEffect(() => {
        // 处理外部新增一个二级tab
        setSubPage(pageItem.multipleNode || [])
    }, [pageItem.multipleNode])

    useEffect(() => {
        // 扁平化 只管渲染
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
        setRenderSubPage(newData)
    }, [subPage])
    // 切换一级页面时聚焦
    useEffect(() => {
        const key = routeConvertKey(pageItem.route, pageItem.pluginName)
        if (currentTabKey === key) {
            setTimeout(() => {
                if (!tabsRef || !tabsRef.current) return
                const ref = tabsRef.current as unknown as HTMLDivElement
                ref.focus()
            }, 100)
        }
    }, [currentTabKey])
    const onDragUpdate = useMemoizedFn((result) => {
        if (
            result.source.droppableId === "droppable2" &&
            result.combine &&
            result.combine.droppableId === "droppable2"
        ) {
            const ids = [result.combine.draggableId, result.draggableId]
            if (combineIds.length === 0) {
                const index = subPage.findIndex((ele) => ele.groupChildren && ele.groupChildren.length > 0)
                const randNum = Math.floor(Math.random() * 10) // 0-9随机数
                combineColorRef.current = index === -1 ? "purple" : colorList[randNum] || "purple"
            }
            setCombineIds(ids)
            return
        }
        setCombineIds([])
    })
    const onSubMenuDragEnd = useMemoizedFn((result) => {
        console.log("result", result)
        /** 合并组   ---------start--------- */
        if (
            result.source.droppableId === "droppable2" &&
            result.combine &&
            result.combine.droppableId === "droppable2"
        ) {
            mergingGroup(result)
        }
        setCombineIds([])
        combineColorRef.current = ""
        /** 合并组   ---------end--------- */
        /** 移动排序 ---------start--------- */
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable2" && result.destination.droppableId === "droppable2") {
            movingBetweenOutsideGroups(result)
        }
        if (result.source.droppableId === "droppable3" && result.destination.droppableId === "droppable3") {
            movingBetweenGroups(result)
        }
        if (result.source.droppableId === "droppable3" && result.destination.droppableId === "droppable2") {
            movingWithinAndOutsideGroup(result)
        }
        /** 移动排序 ---------end--------- */
    })
    /** @description 组外向组内移动合并 */
    const mergingGroup = useMemoizedFn((result) => {
        if (!result.combine) {
            return
        }

        const sourceIndex = result.source.index
        const combineId = result.combine.draggableId
        const combineIndex = subPage.findIndex((ele) => ele.id === combineId)
        if (combineIndex === -1 || !subPage[combineIndex]) return
        const dropItem: MultipleNodeInfo = {
            ...subPage[sourceIndex],
            groupId: subPage[combineIndex].groupId
        }
        if (subPage[combineIndex].groupChildren && (subPage[combineIndex].groupChildren || []).length > 0) {
            subPage[combineIndex].groupChildren = (subPage[combineIndex].groupChildren || []).concat(dropItem)
        } else {
            const id = getIdByPageInfo(pageItem.route, pageItem.pluginName)
            subPage[combineIndex].groupChildren = [{...subPage[combineIndex]}, dropItem]
            subPage[combineIndex].groupName = "未命名"
            subPage[combineIndex].color = combineColorRef.current
            subPage[combineIndex].expand = true
            subPage[combineIndex].id = id
        }
        subPage.splice(sourceIndex, 1)
        afterDragEndSubPage(pageItem, subPage)
        onUpdatePageCache(subPage)
    })
    /** @description 组外之间移动 */
    const movingBetweenOutsideGroups = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
        const subMenuList: MultipleNodeInfo[] = reorder(subPage, result.source.index, result.destination.index)
        afterDragEndSubPage(pageItem, subPage)
        onUpdatePageCache(subMenuList)
    })
    /** @description 组内之间移动 */
    const movingBetweenGroups = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
    })
    /** @description 组内向组外移动 */
    const movingWithinAndOutsideGroup = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
        // const destinationIndex = result.destination.index
        // const length = subMenu.length
        // let currentDropGroupCurrent: MenuChildrenDataProps = {
        //     key: "0"
        // }
        // for (let index = 0; index < length; index++) {
        //     const subMenuItem = subMenu[index]
        //     if (subMenuItem.children && subMenuItem.children.length > 0) {
        //         const number = subMenuItem.children.findIndex((e) => e.key === result.draggableId)
        //         if (number !== -1) {
        //             currentDropGroupCurrent = subMenuItem.children[number]
        //             subMenuItem.children = subMenuItem.children.filter((_, n) => n !== number)
        //             if (subMenuItem.children.length === 0) {
        //                 subMenu.splice(index, 1)
        //                 index--
        //             }
        //             break
        //         }
        //     }
        // }
        // if (currentDropGroupCurrent.key !== "0") subMenu.splice(destinationIndex, 0, currentDropGroupCurrent)
        // setSubMenu([...subMenu])
    })
    /** 更新pageCache和subPage，保证二级新开tab后顺序不变 */
    const onUpdatePageCache = useMemoizedFn((subMenuList: MultipleNodeInfo[]) => {
        try {
            if (subMenuList.length > 0) {
                pageCache[index].multipleNode = subMenuList
                setSubPage([...subMenuList])
                setPageCache(pageCache)
            } else {
                const newPage = pageCache.filter((_, i) => i !== index)
                setSubPage([])
                setPageCache([...newPage])
                if (newPage.length > 0) {
                    const activeTabItem = pageCache[index - 1]
                    const key = routeConvertKey(activeTabItem.route, activeTabItem.pluginName)
                    setCurrentTabKey(key)
                }
            }
        } catch (error) {}
    })
    const onAddSubPage = useMemoizedFn(() => {
        openMultipleMenuPage({
            route: pageItem.route,
            pluginId: pageItem.pluginId,
            pluginName: pageItem.pluginName
        })
    })
    /** @description 删除item后 更新选中的item*/
    const onUpdateSelectSubPage = useMemoizedFn((handleItem: MultipleNodeInfo) => {
        if (selectSubMenu.id === "0") return
        if (handleItem.id !== selectSubMenu.id) return
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
                currentNode = currentNode.groupChildren[0]
            }
            setSelectSubMenu(currentNode)
            return
        }
        // 删除组内的
        const groupIndex = subPage.findIndex((ele) => ele.groupId === handleItem.groupId)
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
                    currentChildrenNode = currentChildrenNode.groupChildren[0]
                }
            }
            setSelectSubMenu(currentChildrenNode)
        }
    })
    const onRemoveSubPage = useMemoizedFn((removeItem: MultipleNodeInfo) => {
        const newSubPage: MultipleNodeInfo[] = []
        subPage.forEach((subItem) => {
            if (!subItem.groupChildren) subItem.groupChildren = []
            const index = subItem.groupChildren.findIndex((ele) => ele.id === removeItem.id)
            let newGroupChildren = subItem.groupChildren || []
            if (index !== -1) {
                newGroupChildren = subItem.groupChildren.filter((_, i) => i !== index)
            }
            // 删除的当前item和组内删除最后一个都不添加到新的newSubPage
            if (subItem.id === removeItem.id) return
            if (subItem.groupChildren.length === 1 && index !== -1) return
            newSubPage.push({
                ...subItem,
                groupChildren: newGroupChildren
            })
        })
        onUpdateSelectSubPage(removeItem)
        onUpdatePageCache(newSubPage)
        afterDeleteSubPage("single", pageItem.route, removeItem)
    })
    const onRightClickOperation = useMemoizedFn((event: React.MouseEvent, indexSub: number) => {
        const currentSubItem: MultipleNodeInfo = subPage[indexSub]
        showByRightContext(
            {
                width: 180,
                type: "grey",
                data: [
                    {
                        label: "重命名",
                        key: "rename"
                    },
                    {
                        label: "将标签页添加到组",
                        key: "addToGroup",
                        children: [
                            {
                                label: (
                                    <div className={styles["right-menu-item"]}>
                                        <OutlinePlusIcon />
                                        新建组
                                    </div>
                                ),
                                key: "newGroup"
                            },
                            {
                                label: (
                                    <div className={styles["right-menu-item"]}>
                                        <div className={classNames(styles["item-color-block"], `color-bg-blue`)} />
                                        <span>正式项目配置</span>
                                    </div>
                                ),
                                key: "55"
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
                        key: "removeOther"
                    }
                ],
                onClick: ({key, keyPath}) => {
                    switch (key) {
                        case "rename":
                            onRename(currentSubItem, indexSub)
                            break
                        case "addToGroup":
                            onAddToGroup(currentSubItem)
                            break
                        case "removeFromGroup":
                            onRemoveFromGroup(currentSubItem)
                            break
                        case "remove":
                            onRemove(currentSubItem, indexSub)
                            break
                        case "removeOther":
                            onRemoveOther(currentSubItem)
                            break
                        default:
                            break
                    }
                }
            },
            event.clientX,
            event.clientY
        )
    })
    /**重命名 */
    const onRename = useMemoizedFn((item: MultipleNodeInfo, indexSub: number) => {
        const m = showYakitModal({
            footer: null,
            closable: false,
            content: (
                <React.Suspense fallback={<div>loading...</div>}>
                    <TabRenameModalContent
                        title='重命名'
                        onClose={() => {
                            m.destroy()
                        }}
                        name={item.verbose}
                        onOk={(val) => {
                            if (subPage.findIndex((ele) => ele.verbose === val) !== -1) {
                                yakitNotify("error", "该名称已存在")
                                return
                            }
                            subPage[indexSub].verbose = val
                            afterUpdateSubPage(pageItem, subPage[indexSub])
                            onUpdatePageCache(subPage)
                            m.destroy()
                        }}
                    />
                </React.Suspense>
            )
        })
    })
    /**将标签页添加到组 */
    const onAddToGroup = useMemoizedFn((item: MultipleNodeInfo) => {})
    /**从组中移出 */
    const onRemoveFromGroup = useMemoizedFn((item: MultipleNodeInfo) => {})
    /**关闭当前标签页 */
    const onRemove = useMemoizedFn((item: MultipleNodeInfo, indexSub: number) => {
        onRemoveSubPage(item)
    })
    /**二级 关闭其他标签页 */
    const onRemoveOther = useMemoizedFn((item: MultipleNodeInfo) => {
        const m = YakitModalConfirm({
            width: 420,
            type: "white",
            onCancelText: "取消",
            onOkText: "关闭其他",
            icon: <ExclamationCircleOutlined />,
            onOk: () => {
                const newSubPage: MultipleNodeInfo[] = [item]
                onUpdatePageCache(newSubPage)
                afterDeleteSubPage("other", pageItem.route, item)
                m.destroy()
            },
            onCancel: () => {
                m.destroy()
            },
            content: "是否保留当前标签页，关闭其他标签页"
        })
    })
    const onKeyDown = useMemoizedFn((e: React.KeyboardEvent, subItem: MultipleNodeInfo, indexSub: number) => {
        e.stopPropagation()
        // 快捷键关闭
        if (e.code === "KeyW" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            e.stopPropagation()
            if (pageCache.length === 0) return
            onRemove(subItem, indexSub)
            return
        }
        // 快捷键新增
        if (e.code === "KeyT" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            e.stopPropagation()
            onAddSubPage()
            return
        }
    })

    return (
        <div
            ref={tabsRef}
            className={styles["tab-menu-sub-content"]}
            onKeyDown={(e) => {
                // 有组的时候，有问题 currentSubIndex
                onKeyDown(e, selectSubMenu, currentSubIndex)
            }}
            tabIndex={0}
        >
            <DragDropContext onDragEnd={onSubMenuDragEnd} onDragUpdate={onDragUpdate}>
                <Droppable droppableId='droppable2' direction='horizontal' isCombineEnabled={true}>
                    {(provided, snapshot) => (
                        <div className={styles["tab-menu-sub-body"]}>
                            <div
                                className={classNames(styles["tab-menu-sub"], {
                                    [styles["tab-menu-sub-width"]]: pageItem.hideAdd === true
                                })}
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {subPage.map((item, indexSub) => {
                                    if (item.groupChildren && item.groupChildren.length > 0) {
                                        return (
                                            <React.Fragment key={item.id}>
                                                <SubTabGroupItem
                                                    subItem={item}
                                                    index={indexSub}
                                                    selectSubMenu={selectSubMenu}
                                                    setSelectSubMenu={(val) => {
                                                        setSelectSubMenu(val)
                                                        setCurrentSubIndex(0)
                                                    }}
                                                    onRemoveSub={(val) => {
                                                        onRemoveSubPage(val)
                                                    }}
                                                    onContextMenu={(e) => {
                                                        onRightClickOperation(e, indexSub)
                                                    }}
                                                />
                                            </React.Fragment>
                                        )
                                    }
                                    return (
                                        <React.Fragment key={item.id}>
                                            <SubTabItem
                                                subItem={item}
                                                index={indexSub}
                                                selectSubMenu={selectSubMenu}
                                                setSelectSubMenu={(val) => {
                                                    setSelectSubMenu(val)
                                                    setCurrentSubIndex(indexSub)
                                                }}
                                                onRemoveSub={(val) => {
                                                    onRemoveSubPage(val)
                                                }}
                                                onContextMenu={(e) => {
                                                    onRightClickOperation(e, indexSub)
                                                }}
                                                isCombine={combineIds.findIndex((ele) => ele === item.id) !== -1}
                                                combineColor={combineColorRef.current}
                                            />
                                        </React.Fragment>
                                    )
                                })}
                            </div>
                            {pageItem.hideAdd !== true && (
                                <OutlinePlusIcon
                                    className={styles["outline-plus-icon"]}
                                    onClick={() => onAddSubPage()}
                                />
                            )}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            {renderSubPage.map((subItem, numberSub) => {
                return (
                    getRenderList(subItem.id) && (
                        <div
                            key={subItem.id}
                            tabIndex={selectSubMenu.id === subItem.id ? 1 : -1}
                            style={{
                                display: selectSubMenu.id === subItem.id ? "" : "none",
                                padding: NoPaddingRoute.includes(pageItem.route) ? 0 : "8px 16px 13px 16px"
                            }}
                            className={styles["page-body"]}
                        >
                            <PageItem
                                routeKey={pageItem.route}
                                yakScriptId={+(pageItem.pluginId || 0)}
                                params={subItem.params}
                            />
                        </div>
                    )
                )
            })}
        </div>
    )
})

const SubTabItem: React.FC<SubTabItemProps> = React.memo((props) => {
    const {subItem, index, selectSubMenu, setSelectSubMenu, onRemoveSub, onContextMenu, isCombine, combineColor} = props
    const isActive = useMemo(() => subItem.id === selectSubMenu?.id, [subItem, selectSubMenu])

    return (
        <Draggable key={subItem.id} draggableId={subItem.id} index={index}>
            {(provided, snapshot) => {
                return (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                        className={classNames(styles["tab-menu-sub-item"], {
                            [styles["tab-menu-sub-item-active"]]: isActive,
                            [styles["tab-menu-sub-item-dragging"]]: snapshot.isDragging,
                            [styles[`tab-menu-sub-item-combine-${combineColor}`]]: isCombine
                        })}
                        onClick={() => {
                            setSelectSubMenu(subItem)
                        }}
                        onContextMenu={onContextMenu}
                    >
                        <Tooltip
                            title={subItem.verbose || ""}
                            overlayClassName={styles["toolTip-overlay"]}
                            destroyTooltipOnHide={true}
                            placement='top'
                        >
                            <div className={styles["tab-menu-item-verbose"]}>
                                <SolidDocumentTextIcon className={styles["document-text-icon"]} />
                                <span className='content-ellipsis'>{subItem.verbose || ""}</span>
                            </div>
                        </Tooltip>
                        {isActive && (
                            <RemoveIcon
                                className={styles["remove-icon"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRemoveSub(subItem)
                                }}
                            />
                        )}
                    </div>
                )
            }}
        </Draggable>
    )
})

const SubTabGroupItem: React.FC<SubTabGroupItemProps> = React.memo((props) => {
    const {subItem, index, selectSubMenu, setSelectSubMenu, onRemoveSub, onContextMenu} = props

    return (
        <Draggable key={subItem.id} draggableId={subItem.id} index={index}>
            {(provided, snapshot) => {
                return (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                    >
                        <Droppable droppableId='droppable3' direction='horizontal'>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={classNames(
                                        styles["tab-menu-sub-group"],
                                        styles[`tab-menu-sub-group-${subItem.color || ""}`]
                                    )}
                                    // style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                    // className={classNames(styles["tab-menu-sub-item"], {
                                    //     [styles["tab-menu-sub-item-active"]]: isActive,
                                    //     [styles["tab-menu-sub-item-dragging"]]: snapshot.isDragging
                                    // })}
                                    // onClick={() => {
                                    //     setSelectSubMenu(subItem)
                                    // }}
                                    // onContextMenu={onContextMenu}
                                >
                                    <div
                                        className={classNames(
                                            styles["tab-menu-sub-group-name"],
                                            styles[`tab-menu-sub-group-name-${subItem.color || ""}`],
                                            {
                                                [styles["tab-menu-sub-group-name-retract"]]: !subItem.expand
                                            }
                                        )}
                                        // onClick={() => onExpand()}
                                    >
                                        {subItem.groupName || ""}
                                        {!subItem.expand && (
                                            <div
                                                className={classNames(
                                                    styles["tab-menu-sub-group-number"],
                                                    styles[`tab-menu-sub-group-number-${subItem.color || ""}`]
                                                )}
                                            >
                                                {subItem.groupChildren?.length || 0}
                                            </div>
                                        )}
                                    </div>
                                    {subItem.expand &&
                                        subItem.groupChildren?.map((groupItem, index) => (
                                            <React.Fragment key={groupItem.id}>
                                                <SubTabItem
                                                    subItem={groupItem}
                                                    index={index}
                                                    selectSubMenu={selectSubMenu}
                                                    setSelectSubMenu={(val) => {
                                                        setSelectSubMenu(val)
                                                    }}
                                                    onRemoveSub={(val) => {
                                                        onRemoveSub(val)
                                                    }}
                                                    onContextMenu={(e) => {
                                                        onContextMenu(e)
                                                    }}
                                                />
                                            </React.Fragment>
                                        ))}
                                </div>
                            )}
                        </Droppable>
                    </div>
                )
            }}
        </Draggable>
    )
})

// 多开页面的一级页面关闭的确认弹窗
const onModalSecondaryConfirm = (props?: YakitSecondaryConfirmProps) => {
    let m = YakitModalConfirm({
        width: 420,
        type: "white",
        onCancelText: "不保存",
        onOkText: "保存",
        icon: <ExclamationCircleOutlined />,
        ...(props || {}),
        onOk: () => {
            if (props?.onOk) {
                props.onOk(m)
            } else {
                m.destroy()
            }
        },
        closeIcon: (
            <div
                onClick={(e) => {
                    e.stopPropagation()
                    m.destroy()
                }}
                className='modal-remove-icon'
            >
                <RemoveIcon />
            </div>
        ),
        content: <div style={{paddingTop: 8}}>{props?.content}</div>
    })
    return m
}
