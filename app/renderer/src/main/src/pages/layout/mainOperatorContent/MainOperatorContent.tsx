import React, {useState, useEffect, useRef, useMemo, useContext, useImperativeHandle} from "react"
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
import {YakitRouteToPageInfo, YakitRoute, SingletonPageRoute, NoPaddingRoute, ComponentParams} from "@/routes/newRoute"
import {isEnpriTraceAgent, isBreachTrace, shouldVerifyEnpriTraceLogin} from "@/utils/envfile"
import {useCreation, useGetState, useLongPress, useMemoizedFn, useThrottleFn} from "ahooks"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import classNames from "classnames"
import _ from "lodash"
import {KeyConvertRoute, routeConvertKey} from "../publicMenu/utils"
import {CheckIcon, OutlinePlusIcon, RemoveIcon, SolidDocumentTextIcon} from "@/assets/newIcon"
import {RouteToPageProps} from "../publicMenu/PublicMenu"
import {YakitSecondaryConfirmProps, useSubscribeClose} from "@/store/tabSubscribe"
import {YakitModalConfirm, showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {defaultUserInfo} from "@/pages/MainOperator"
import {useStore} from "@/store"
import {getLocalValue, getRemoteProjectValue, getRemoteValue, setRemoteProjectValue, setRemoteValue} from "@/utils/kv"
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
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitMenu, YakitMenuItemProps, YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ScrollProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {OutlineChevrondoubleleftIcon, OutlineChevrondoublerightIcon} from "@/assets/icon/outline"
import {
    NodeInfoProps,
    PageInfoProps,
    PageNodeItemProps,
    WebFuzzerPageInfoProps,
    usePageNode
} from "@/store/pageNodeInfo"
import HTTPFuzzerPage, {
    WEB_FUZZ_DNS_Hosts_Config,
    WEB_FUZZ_DNS_Server_Config,
    WEB_FUZZ_PROXY,
    defaultAdvancedConfigValue
} from "@/pages/fuzzer/HTTPFuzzerPage"
import {KVPair} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {MainOperatorContext} from "../MainContext"
import {RenderFuzzerSequence, RenderSubPage} from "./renderSubPage/RenderSubPage"
import {WebFuzzerType} from "@/pages/fuzzer/WebFuzzerPage/WebFuzzerPageType"
import {useFuzzerSequence} from "@/store/fuzzerSequence"
import emiter from "@/utils/eventBus"

const TabRenameModalContent = React.lazy(() => import("./TabRenameModalContent"))
const PageItem = React.lazy(() => import("./renderSubPage/RenderSubPage"))

const {Content} = Layout
const {ipcRenderer} = window.require("electron")

/** web-fuzzer缓存数据对应键 */
const FuzzerCache = "fuzzer-list-cache"
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
                label: (
                    <div className={styles["right-menu-item"]}>
                        <OutlinePlusIcon />
                        新建组
                    </div>
                ),
                key: "newGroup"
            }
            // {
            //     label: (
            //         <div className={styles["right-menu-item"]}>
            //             <div className={classNames(styles["item-color-block"], `color-bg-blue`)} />
            //             <span>正式项目配置</span>
            //         </div>
            //     ),
            //     key: "55"
            // }
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
const generateGroupId = (gIndex?: number) => {
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

// const reorder = (list: any[], startIndex: number, endIndex: number) => {
//     const result = Array.from(list)
//     const [removed] = result.splice(startIndex, 1)
//     result.splice(endIndex, 0, removed)
//     return result
// }
/**数组元素交换位置 */
const reorder = (arr, index1, index2) => {
    // 检查索引是否有效
    if (index1 < 0 || index1 >= arr.length || index2 < 0 || index2 >= arr.length) {
        // console.error("索引无效")
        return
    }

    // 交换元素位置
    let temp = arr[index1]
    arr[index1] = arr[index2]
    arr[index2] = temp

    return arr
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
/**一级tab固定展示额tab */
const defaultFixedTabs = [YakitRoute.NewHome, YakitRoute.DB_HTTPHistory]
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

    const {addPageNode} = usePageNode()

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
            if (type === "**debug-plugin") openMenuPage({route: YakitRoute.Beta_DebugPlugin})
            if (type === "**debug-monaco-editor") openMenuPage({route: YakitRoute.Beta_DebugMonacoEditor})
            if (type === "**vulinbox-manager") openMenuPage({route: YakitRoute.Beta_VulinboxManager})
            if (type === "**diagnose-network") openMenuPage({route: YakitRoute.Beta_DiagnoseNetwork})
            if (type === "**config-network") openMenuPage({route: YakitRoute.Beta_ConfigNetwork})
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
                removeMenuPage(info)
            }
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
            if (SingletonPageRoute.includes(route)) {
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
                    params: {
                        ...nodeParams?.params,
                        id: tabId,
                        groupId: "0"
                    },
                    groupId: "0",
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
    const {setPageNode, getPageNodeInfoByPageId, updatePageNodeInfoByPageId} = usePageNode()
    // web-fuzzer多开页面缓存数据
    const fuzzerList = useRef<Map<string, MultipleNodeInfo>>(new Map<string, MultipleNodeInfo>())
    const proxyRef = useRef<string[]>()
    const dnsServersRef = useRef<string[]>()
    const etcHostsRef = useRef<KVPair[]>()
    const isFetchFuzzerList = useCreation<boolean>(() => {
        return !!(proxyRef.current && dnsServersRef.current && etcHostsRef.current)
    }, [proxyRef.current, dnsServersRef.current, etcHostsRef.current])
    useEffect(() => {
        // web-fuzzer页面更新缓存数据
        ipcRenderer.on("fetch-fuzzer-setting-data", (e, res: any) => {
            try {
                // 缓存
                const haveItem = fuzzerList.current.get(res.key || "")
                if (!haveItem) return
                const params = JSON.parse(res.param)
                updateFuzzerList(res.key, {...haveItem, params})

                // 序列化
                const webFuzzerPageInfo = JSON.parse(res.webFuzzerPageInfo)
                onUpdateFuzzerSequenceDueToDataChanges(res.key, webFuzzerPageInfo)
            } catch (error) {
                yakitNotify("error", "webFuzzer数据缓存失败：" + error)
            }
        })
        getFuzzerDefaultCache()
        return () => {
            ipcRenderer.removeAllListeners("fetch-fuzzer-setting-data")
        }
    }, [])
    useEffect(() => {
        if (!isFetchFuzzerList) return
        // 简易版不获取webFuzzer缓存
        if (!isEnpriTraceAgent()) {
            // 触发获取web-fuzzer的缓存
            fetchFuzzerList()
        }
    }, [isFetchFuzzerList])
    /**
     * 因为页面数据变化更新fuzzer序列化
     * 组内的才有序列化
     */
    const onUpdateFuzzerSequenceDueToDataChanges = useMemoizedFn((key: string, param: WebFuzzerPageInfoProps) => {
        const fuzzerPage = pageCache.find((ele) => ele.route === YakitRoute.HTTPFuzzer)
        if (!fuzzerPage) return
        const nodeInfo: NodeInfoProps | undefined = getPageNodeInfoByPageId(YakitRoute.HTTPFuzzer, key)
        if (!nodeInfo) return
        const {currentItem} = nodeInfo
        const newCurrentItem: PageNodeItemProps = {
            ...currentItem,
            pageParamsInfo: {
                webFuzzerPageInfo: {
                    pageId: param.pageId,
                    advancedConfigValue: {...param.advancedConfigValue},
                    request: param.request
                }
            }
        }
        updatePageNodeInfoByPageId(YakitRoute.HTTPFuzzer, currentItem.pageId, {...newCurrentItem})
    })

    /**@description 获取Fuzzer默认缓存 */
    const getFuzzerDefaultCache = useMemoizedFn(() => {
        getRemoteValue(WEB_FUZZ_PROXY).then((e) => {
            if (!e) {
                proxyRef.current = []
                return
            }
            proxyRef.current = e ? e.split(",") : []
        })
        getRemoteValue(WEB_FUZZ_DNS_Server_Config).then((e) => {
            if (!e) {
                dnsServersRef.current = []
                return
            }
            try {
                dnsServersRef.current = JSON.parse(e)
            } catch (error) {}
        })
        getRemoteValue(WEB_FUZZ_DNS_Hosts_Config).then((e) => {
            if (!e) {
                etcHostsRef.current = []
                return
            }
            try {
                etcHostsRef.current = JSON.parse(e)
            } catch (error) {}
        })
    })

    // 定时向数据库保存web-fuzzer缓存数据
    const saveFuzzerList = debounce(() => {
        const historys: MultipleNodeInfo[] = []
        fuzzerList.current.forEach((value) => {
            if ((value?.params?.request || "").length < 1000000) historys.push(value)
        })
        // console.log("historys", historys)
        // 简易版不设置webFuzzer缓存
        if (!isEnpriTraceAgent()) {
            setRemoteProjectValue(FuzzerCache, JSON.stringify(historys))
        }
    }, 500)

    // 获取数据库中缓存的web-fuzzer页面信息
    const fetchFuzzerList = useMemoizedFn(() => {
        // 如果路由中已经存在webFuzzer页面，则不需要再从缓存中初始化页面
        if (pageCache.findIndex((ele) => ele.route === YakitRoute.HTTPFuzzer) !== -1) return
        setLoading(true)
        getRemoteProjectValue(FuzzerCache)
            .then((res: any) => {
                const cache = JSON.parse(res || "[]")
                // 菜单在代码内的名字
                const menuName = YakitRouteToPageInfo[YakitRoute.HTTPFuzzer]?.label || ""
                const key = routeConvertKey(YakitRoute.HTTPFuzzer, "")
                const tabName = routeKeyToLabel.get(key) || menuName
                fuzzerList.current.clear()
                let pageNodeInfo: PageInfoProps = {
                    pageNodeList: [],
                    routeKey: YakitRoute.HTTPFuzzer,
                    singleNode: false
                }
                let multipleNodeListLength: number = 0
                const multipleNodeList = cache.filter((ele) => ele.groupId === "0")
                const pLength = multipleNodeList.length
                const defaultCache = {
                    proxy: proxyRef.current || [],
                    dnsServers: dnsServersRef.current || [],
                    etcHosts: etcHostsRef.current || []
                }
                for (let index = 0; index < pLength; index++) {
                    const parentItem = multipleNodeList[index]
                    const childrenList = cache.filter((ele) => ele.groupId === parentItem.id)
                    const cLength = childrenList.length
                    const groupChildrenList: MultipleNodeInfo[] = []

                    const pageNodeChildrenList: PageNodeItemProps[] = []
                    for (let j = 0; j < cLength; j++) {
                        const childItem = childrenList[j]
                        const nodeItem: MultipleNodeInfo = {
                            ...childItem,
                        }
                        fuzzerList.current.set(nodeItem.id, {...nodeItem})
                        groupChildrenList.push({...nodeItem})
                        pageNodeChildrenList.push({
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
                                        ...nodeItem.params
                                    },
                                    request: nodeItem.params?.request || ""
                                }
                            },
                            pageChildrenList: []
                        })
                    }
                    if (cLength > 0) {
                        multipleNodeListLength += cLength
                    } else {
                        multipleNodeListLength += 1
                        parentItem.params = {
                            ...parentItem.params,
                        }
                    }
                    parentItem.groupChildren = groupChildrenList.sort((a, b) => compareAsc(a, b, "sortFieId"))

                    pageNodeInfo.pageNodeList.push({
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
                                    ...parentItem.params
                                },
                                request: parentItem.params?.request || ""
                            }
                        },
                        pageChildrenList: pageNodeChildrenList
                    })
                    fuzzerList.current.set(parentItem.id, {...parentItem, groupChildren: []})
                }
                const newMultipleNodeList = multipleNodeList.sort((a, b) => compareAsc(a, b, "sortFieId"))
                if (newMultipleNodeList.length === 0) return
                // console.log("multipleNodeList", multipleNodeList)
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
                setPageNode(YakitRoute.HTTPFuzzer, pageNodeInfo)
            })
            .catch((e) => {})
            .finally(() => setTimeout(() => setLoading(false), 200))
    })
    // 新增缓存数据
    /**@description 新增缓存数据 目前最新只缓存 request isHttps verbose */
    const addFuzzerList = (key: string, node: MultipleNodeInfo) => {
        fuzzerList.current.set(key, node)

        const newPageNode: PageNodeItemProps = {
            id: "",
            routeKey: YakitRoute.HTTPFuzzer,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                webFuzzerPageInfo: {
                    pageId: node.id,
                    advancedConfigValue: {
                        ...defaultAdvancedConfigValue,
                        ...node.params
                    },
                    request: node.params?.request || ""
                }
            },
            pageChildrenList: []
        }
        addPageNode(YakitRoute.HTTPFuzzer, newPageNode)
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
    /**更新排序和内容缓存 */
    const webFuzzerCache = useMemoizedFn((subPage: MultipleNodeInfo[]) => {
        if (subPage.length <= 0) {
            delFuzzerList(1)
            return
        }
        const newFuzzerList = new Map<string, MultipleNodeInfo>()
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
                    newFuzzerList.set(groupChildrenItem.id, newGroupChildrenItem)
                })
                if (!subItem.groupId) return
                const newGroupItem: MultipleNodeInfo = {
                    id: subItem.id,
                    verbose: subItem.verbose || "",
                    groupId: subItem.groupId,
                    expand: subItem.expand,
                    color: subItem.color,
                    sortFieId: subIndex + 1,
                    childrenWidth: subItem.childrenWidth
                }
                newFuzzerList.set(subItem.id, newGroupItem)
            } else {
                const haveItem = fuzzerList.current.get(subItem.id)
                const newItem: MultipleNodeInfo = {
                    ...haveItem,
                    ...subItem,
                    params: haveItem?.params,
                    sortFieId: subIndex + 1,
                    groupChildren: [],
                    expand: undefined,
                    color: undefined
                }
                newFuzzerList.set(subItem.id, newItem)
            }
        })
        fuzzerList.current = new Map<string, MultipleNodeInfo>(newFuzzerList)
        saveFuzzerList()
    })
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
    const onAfterUpdateSubItem = useMemoizedFn((page: PageCache, subItem: MultipleNodeInfo) => {
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
    const onUpdateSubPage = useMemoizedFn((page: PageCache, subPage: MultipleNodeInfo[]) => {
        switch (page.route) {
            case YakitRoute.HTTPFuzzer:
                webFuzzerCache(subPage)
                break
            default:
                break
        }
    })

    /** ---------- MainOperatorContext回调 end ---------- */
    return (
        <Content>
            <YakitSpin spinning={loading}>
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
                        afterUpdateSubItem: onAfterUpdateSubItem,
                        onUpdateSubPage: onUpdateSubPage
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
            </YakitSpin>
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
                            <React.Suspense fallback={<>loading page ...</>}>
                                <PageItem routeKey={pageItem.route} params={pageItem.params} />
                            </React.Suspense>
                        ) : (
                            <SubTabList pageItem={pageItem} index={index} />
                        )}
                    </div>
                )
            })}
        </>
    )
})

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
                const fixedTabs = pageCache.filter((ele) => defaultFixedTabs.includes(ele.route))
                const newPage: PageCache[] = [...fixedTabs, item]
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
    const {pageCache, currentTabKey, onUpdateSubPage} = useContext(MainOperatorContext)
    const {pageItem, index} = props
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

    useEffect(() => {
        ipcRenderer.on("fetch-webFuzzer-setType", onSetType)
        ipcRenderer.on("fetch-add-group", onAddGroup)
        ipcRenderer.on("fetch-open-subMenu-item", onSelectSubMenuById)
        return () => {
            ipcRenderer.removeListener("fetch-webFuzzer-setType", onSetType)
            ipcRenderer.removeListener("fetch-add-group", onAddGroup)
            ipcRenderer.removeListener("fetch-open-subMenu-item", onSelectSubMenuById)
        }
    }, [])

    useEffect(() => {
        // 处理外部新增一个二级tab
        setSubPage(pageItem.multipleNode || [])
        onUpdateSubPage(pageItem, pageItem.multipleNode || [])
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
            setSelectSubMenu(currentNode)
        }
    }, [pageItem.multipleLength])
    const onSetType = useMemoizedFn((e, res: {type: WebFuzzerType}) => {
        setType(res.type)
        if(type===res.type&&res.type==='config'){
            emiter.emit("onSetFuzzerAdvancedConfigShow")
        }
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
        const {index} = getPageItemById(subPage, res.pageId)
        if (index === -1) return
        subTabsRef.current?.onNewGroup(subPage[index])
        setTimeout(() => {
            setType("sequence")
        }, 200)
    })
    /**快捷关闭或者新增 */
    const onKeyDown = useMemoizedFn((e: React.KeyboardEvent, subItem: MultipleNodeInfo) => {
        e.stopPropagation()
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
    const onSelectSubMenuById = useMemoizedFn((e, res: {pageId: string}) => {
        const index = flatSubPage.findIndex((ele) => ele.id === res.pageId)
        if (index === -1) return
        const newSubPage: MultipleNodeInfo = {...flatSubPage[index]}
        setSelectSubMenu(newSubPage)
        if (currentTabKey === YakitRoute.HTTPFuzzer) {
            setType("config")
        }
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
                ref={subTabsRef}
                onFocusPage={onFocusPage}
                pageItem={pageItem}
                index={index}
                subPage={subPage}
                setSubPage={setSubPage}
                selectSubMenu={selectSubMenu}
                setSelectSubMenu={setSelectSubMenu}
                setType={setType}
            />
            <div className={styles["render-sub-page"]}>
                <RenderSubPage
                    renderSubPage={flatSubPage}
                    route={pageItem.route}
                    pluginId={pageItem.pluginId || 0}
                    selectSubMenuId={selectSubMenu.id}
                />
                <RenderFuzzerSequence route={pageItem.route} type={type} setType={setType} />
            </div>
        </div>
    )
})

const SubTabs: React.FC<SubTabsProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            openMultipleMenuPage,
            pageCache,
            setPageCache,
            currentTabKey,
            setCurrentTabKey,
            afterDeleteSubPage,
            afterUpdateSubItem,
            onUpdateSubPage
        } = useContext(MainOperatorContext)
        const {pageItem, index, onFocusPage, subPage, setSubPage, setType, selectSubMenu, setSelectSubMenu} = props

        //拖拽组件相关
        const [combineIds, setCombineIds] = useState<string[]>([]) //组合中的ids
        const [isCombineEnabled, setIsCombineEnabled] = useState<boolean>(true)
        const [dropType, setDropType] = useState<string>(droppable)
        const [subDropType, setSubDropType] = useState<string>(droppableGroup)

        const [scroll, setScroll] = useState<ScrollProps>({
            scrollLeft: 0,
            scrollBottom: 0,
            scrollRight: 0 //初始值要大于1
        })

        const [closeGroupTip, setCloseGroupTip] = useState<boolean>(true) // 关闭组的时候是否还需要弹窗提示,默认是要弹窗的;如果用户选择了不再提示,后续则就不需要再弹出提示框

        const combineColorRef = useRef<string>("")
        const scrollLeftIconRef = useRef<any>()
        const scrollRightIconRef = useRef<any>()

        const {
            getPageNodeInfoByPageId,
            addPageNode,
            addPageNodeInfoByPageGroupId,
            removePageNodeInfoByPageId,
            flatPageChildrenListAndRemoveGroupByPageGroupId,
            setPageNodeInfoByPageGroupId,
            updatePageNodeInfoByPageId,
            removePageNodeByPageGroupId,
            setPageNode,
            getPageNodeInfoByPageGroupId,
            exchangeOrderPageNodeByPageGroupId,
            setCurrentSelectGroup,
            removeCurrentSelectGroup
        } = usePageNode()

        const {addFuzzerSequenceList, removeFuzzerSequenceList, setSelectGroupId} = useFuzzerSequence()

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
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                if (selectSubMenu.groupId === "0") {
                    setType("config")
                    removeCurrentSelectGroup(YakitRoute.HTTPFuzzer)
                    // setSelectGroupId('')
                } else {
                    setCurrentSelectGroup(YakitRoute.HTTPFuzzer, selectSubMenu.groupId)
                    addFuzzerSequenceList({
                        groupId: selectSubMenu.groupId
                    })
                    setSelectGroupId(selectSubMenu.groupId)
                }
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

        const onDragUpdate = useMemoizedFn((result) => {
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
        const onSubMenuDragEnd = useMemoizedFn((result) => {
            try {
                // console.log("onSubMenuDragEnd", result)
                const {droppableId: sourceDroppableId} = result.source
                /**将拖拽item变为选中item ---------start---------  0817,暂时取消拖拽选中*/
                // const { index, subIndex } = getPageItemById(subPage, result.draggableId)
                // if (index === -1) return
                // const groupChildrenList = subPage[index].groupChildren || []
                // if (subIndex === -1) {
                //     if (groupChildrenList.length === 0) setSelectSubMenu(()=>subPage[index])
                // } else {
                //     setSelectSubMenu(()=>groupChildrenList[subIndex])
                // }
                /**将拖拽item变为选中item ---------end---------*/
                /** 合并组   ---------start--------- */
                if (result.combine) {
                    // 组外两个游离的标签页合成组
                    if (result.source.droppableId === "droppable2" && result.combine.droppableId === "droppable2") {
                        mergingGroup(result)
                    }
                    // 组内的标签页拖拽到组外并和组外的一个标签页合成组(组内向组外合并)
                    if (sourceDroppableId.includes("group") && result.combine.droppableId === "droppable2") {
                        mergeWithinAndOutsideGroup(result) //bug
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
        const mergingGroup = useMemoizedFn((result) => {
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
            const groupId = generateGroupId()
            if (sourceGroupChildrenLength > 0 && combineGroupChildrenLength > 0) {
                // 拖动的来源item是组时目的地item也是组，合并  已经废弃
                // const groupList = subPage[sourceIndex].groupChildren?.map((ele) => ({ ...ele, groupId })) || []
                // subPage[combineIndex].groupChildren = (subPage[combineIndex].groupChildren || []).concat(groupList)
                // subPage[combineIndex].expand = true
            } else {
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
                setSelectSubMenu((s) => ({...s, groupId}))
            }
            const combineItem = subPage[combineIndex]
            subPage.splice(sourceIndex, 1)
            onUpdatePageCache(subPage)
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                // push新的序列表数据
                pushSequenceByGroupChildren(combineItem)
            }
        })

        /**@description 组内向组外合并 */
        const mergeWithinAndOutsideGroup = useMemoizedFn((result) => {
            if (!result.combine) {
                return
            }
            const {index: sourceIndex, droppableId} = result.source
            const {draggableId: combineDraggableId} = result.combine
            // 删除拖拽的组内标签页
            const gIndex = subPage.findIndex((ele) => ele.id === droppableId)
            if (gIndex === -1) return

            const sourceItem = subPage[gIndex].groupChildren?.splice(sourceIndex, 1)
            if (!sourceItem) return
            const combineIndex = subPage.findIndex((ele) => ele.id === combineDraggableId)

            if (combineIndex === -1) return
            const newGroupId = generateGroupId()
            //将拖拽的item和组外的目的地item合并
            const dropItem: MultipleNodeInfo = {
                ...sourceItem[0],
                groupId: newGroupId
            }
            const groupLength = getGroupLength(subPage)
            subPage[combineIndex].groupChildren = [{...subPage[combineIndex], groupId: newGroupId}, dropItem]
            subPage[combineIndex].verbose = `未命名[${groupLength}]`
            subPage[combineIndex].color = combineColorRef.current || subPage[sourceIndex].color
            subPage[combineIndex].expand = true
            subPage[combineIndex].id = newGroupId

            const combineItem = subPage[combineIndex]

            setSelectSubMenu((s) => ({...s, groupId: newGroupId}))

            // 拖拽后组内item===0,则删除该组
            if (subPage[gIndex].groupChildren?.length === 0) {
                subPage.splice(gIndex, 1)
            }
            onUpdatePageCache(subPage)
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                // push新组的序列表数据
                pushSequenceByGroupChildren(combineItem)
                // 删除 source的item所在序列化中的数据，生成新组的时候push新的序列化数据
                removePageNodeInfoByPageId(YakitRoute.HTTPFuzzer, sourceItem[0].id)
                setCurrentSelectGroup(YakitRoute.HTTPFuzzer, combineItem.id)
                setSelectGroupId(combineItem.id)
            }
        })
        /** @description 组外之间移动 */
        const movingBetweenOutsideGroups = useMemoizedFn((result) => {
            if (!result.destination) {
                return
            }
            // setSelectSubMenu(subPage[result.source.index])
            const subMenuList: MultipleNodeInfo[] = reorder(subPage, result.source.index, result.destination.index)
            setSubPage([...subMenuList])
            onUpdatePageCache(subMenuList)
        })
        /** @description 同一个组内之间移动 */
        const movingWithinSameGroup = useMemoizedFn((result) => {
            if (!result.destination) {
                return
            }
            const {index: sourceIndex} = result.source
            const {droppableId, index: destinationIndex} = result.destination
            const groupId = droppableId
            const gIndex = subPage.findIndex((ele) => ele.id === groupId)
            if (gIndex === -1) return
            const groupChildrenList = subPage[gIndex].groupChildren || []
            // setSelectSubMenu(groupChildrenList[sourceIndex])
            const newGroupChildrenList: MultipleNodeInfo[] = reorder(groupChildrenList, sourceIndex, destinationIndex)
            subPage[gIndex].groupChildren = newGroupChildrenList
            onUpdatePageCache(subPage)
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                // 序列排序
                exchangeOrderPageNodeByPageGroupId(YakitRoute.HTTPFuzzer, groupId, sourceIndex, destinationIndex)
            }
        })
        /** @description 不同一个组间移动 从组A到组B */
        const movingBetweenDifferentGroups = useMemoizedFn((result) => {
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

            // setSelectSubMenu(newSourceItem)
            setSelectSubMenu((s) => ({...s, groupId: destinationGroupId}))

            destinationGroupChildrenList.splice(destinationIndex, 0, newSourceItem) // 按顺序将拖拽的item放进目的地中并修改组的id
            subPage[destinationNumber].groupChildren = destinationGroupChildrenList

            if (sourceGroupChildrenList.length === 0) {
                // 组内的标签页为0时,删除该组
                subPage.splice(sourceNumber, 1)
            }
            onUpdatePageCache(subPage)
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                // 删除组A中的序列化数据,向组B新增序列化数据,
                addSequenceByPageGroupId(sourceItem, destinationGroupId, destinationIndex)
            }
        })

        /** @description 组内向组外移动 */
        const movingWithinAndOutsideGroup = useMemoizedFn((result) => {
            if (!result.destination) {
                return
            }
            const {droppableId: dropSourceId, index: sourceIndex} = result.source
            const {index: destinationIndex} = result.destination

            const sourceGroupId = dropSourceId
            // 将拖拽的item从来源地中删除
            const sourceNumber = subPage.findIndex((ele) => ele.id === sourceGroupId)
            if (sourceNumber === -1) return
            const sourceGroupChildrenList = subPage[sourceNumber].groupChildren || []
            const sourceItem = sourceGroupChildrenList[sourceIndex] // 拖拽的item
            sourceGroupChildrenList.splice(sourceIndex, 1)
            subPage[sourceNumber].groupChildren = sourceGroupChildrenList

            const newSourceItem: MultipleNodeInfo = {
                ...sourceItem,
                groupId: "0"
            }

            // setSelectSubMenu(newSourceItem)
            setSelectSubMenu((s) => ({...s, groupId: "0"}))

            // 将拖拽的item添加到目的地的组内
            subPage.splice(destinationIndex, 0, newSourceItem)

            // 如果组内的item为0 ,需要删除组
            if (sourceGroupChildrenList.length === 0) {
                const number = subPage.findIndex((ele) => ele.id === sourceGroupId)
                subPage.splice(number, 1)
            }
            onUpdatePageCache([...subPage])
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                onRemoveGroupAndPushPageNode({
                    ...sourceItem,
                    groupId: "0"
                })
            }
        })
        /** @description 组外向组内移动 */
        const moveOutOfGroupAndInGroup = useMemoizedFn((result) => {
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
                // setSelectSubMenu(newSourceItem)
                setSelectSubMenu((s) => ({...s, groupId: destinationGroupId}))
                destinationGroupChildrenList.splice(destinationIndex, 0, newSourceItem) // 按顺序将拖拽的item放进目的地中并修改组的id
                subPage[destinationNumber].groupChildren = destinationGroupChildrenList
            }
            // 将拖拽的item从来源地中删除
            subPage.splice(sourceIndex, 1)
            onUpdatePageCache(subPage)
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                // 向组B新增序列化数据,删除游离的数据，
                addSequenceByPageGroupId(sourceItem, destinationGroupId, destinationIndex)
            }
        })
        /** 更新pageCache和subPage，保证二级新开tab后顺序不变 */
        const onUpdatePageCache = useMemoizedFn((subMenuList: MultipleNodeInfo[]) => {
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

                setSelectSubMenu(currentNode)
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
                setSelectSubMenu(currentChildrenNode)
            }
        })
        /**@description 设置传入的item为选中的item */
        const onSetSelectSubMenu = useMemoizedFn((handleItem: MultipleNodeInfo) => {
            if (handleItem.groupChildren && handleItem.groupChildren.length > 0) {
                const index = handleItem.groupChildren.findIndex((ele) => ele.id === selectSubMenu.id)
                if (index === -1) setSelectSubMenu(handleItem.groupChildren[0])
            } else {
                setSelectSubMenu(handleItem)
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
                const groupChildren = subPage[index].groupChildren || []
                if (groupChildren.length > 0) {
                    groupChildren.splice(subIndex, 1)
                }
                if (groupChildren.length === 0) {
                    subPage.splice(index, 1)
                } else {
                    subPage.splice(index + 1, 0)
                }
            }
            onUpdatePageCache([...subPage])
            if (subPage.length === 0) {
                onUpdateSubPage(pageItem, subPage)
            } else {
                afterDeleteSubPage("single", pageItem.route, removeItem)
            }
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                removePageNodeInfoByPageId(YakitRoute.HTTPFuzzer, removeItem.id)
            }
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
                                    // subPage[index].verbose = val
                                    subPage[index] = {...subPage[index], verbose: val}
                                    afterUpdateSubItem(pageItem, subPage[index])
                                    onUpdatePageCache(subPage)
                                }
                                if (subIndex !== -1) {
                                    // 当前情况说明item在subPage[index]的组内
                                    const groupChildrenList = subPage[index].groupChildren || []
                                    if (groupChildrenList.length > 0) {
                                        // groupChildrenList[subIndex].verbose = val
                                        groupChildrenList[subIndex] = {
                                            ...groupChildrenList[subIndex],
                                            verbose: val
                                        }
                                        subPage[index] = {
                                            ...subPage[index],
                                            groupChildren: [...groupChildrenList]
                                        }
                                        afterUpdateSubItem(pageItem, subPage[index])
                                        onUpdatePageCache(subPage)
                                        if (currentTabKey === YakitRoute.HTTPFuzzer) {
                                            // 更新序列化数据
                                            const updateItem = groupChildrenList[subIndex]
                                            onUpdateFuzzerSequence(updateItem.id, updateItem)
                                        }
                                    }
                                }

                                m.destroy()
                            }}
                        />
                    </React.Suspense>
                )
            })
        })
        const onUpdateFuzzerSequence = useMemoizedFn((key: string, param: MultipleNodeInfo) => {
            const nodeInfo: NodeInfoProps | undefined = getPageNodeInfoByPageId(YakitRoute.HTTPFuzzer, key)
            if (!nodeInfo) return
            const {index, subIndex, parentItem} = nodeInfo
            if (index === -1 || subIndex === -1) return
            const updateSequence = parentItem.pageChildrenList[subIndex]
            updateSequence.pageName = param.verbose
            updatePageNodeInfoByPageId(YakitRoute.HTTPFuzzer, param.id, updateSequence)
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
                if (currentTabKey === YakitRoute.HTTPFuzzer) {
                    // push新的序列表数据
                    pushSequenceByGroupChildren(newGroup)
                    // removePageNodeInfoByPageId(YakitRoute.HTTPFuzzer,item.id)
                }
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
                if (currentTabKey === YakitRoute.HTTPFuzzer) {
                    pushSequenceByGroupChildren(newGroup) // 新建序列数据
                    removePageNodeInfoByPageId(YakitRoute.HTTPFuzzer, item.id) // 删除组A中的序列
                    // 更新选中组内的childrenList
                    setCurrentSelectGroup(YakitRoute.HTTPFuzzer, item.groupId)
                }
            }
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
                addSequenceByPageGroupId(item, currentGroup.id)
            }
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
                setSelectSubMenu(newGroup)
            }
            if (groupChildren.length === 0) {
                subPage.splice(index, 1, newGroup)
            } else {
                subPage.splice(index + 1, 0, newGroup)
            }
            onUpdatePageCache([...subPage])
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                onRemoveGroupAndPushPageNode(newGroup)
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
                        afterDeleteSubPage("other", pageItem.route, item)
                        if (currentTabKey === YakitRoute.HTTPFuzzer) {
                            let pageNodeInfo: PageInfoProps = {
                                pageNodeList: [],
                                routeKey: YakitRoute.HTTPFuzzer,
                                singleNode: false
                            }
                            setPageNode(YakitRoute.HTTPFuzzer, pageNodeInfo)
                        }
                        m.destroy()
                    },
                    onCancel: () => {
                        m.destroy()
                    },
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
                        subPage[index].groupChildren = [item]
                        onSetSelectSubMenu(item)
                        onUpdatePageCache(subPage)
                        if (currentTabKey === YakitRoute.HTTPFuzzer) {
                            const groupList = [
                                {
                                    id: "",
                                    routeKey: YakitRoute.HTTPFuzzer,
                                    pageGroupId: item.groupId,
                                    pageId: item.id,
                                    pageName: item.verbose,
                                    pageParamsInfo: {
                                        webFuzzerPageInfo: {
                                            pageId: item.id,
                                            advancedConfigValue: {
                                                ...defaultAdvancedConfigValue,
                                                ...item.params
                                            },
                                            request: item.params?.request || ""
                                        }
                                    },
                                    pageChildrenList: []
                                }
                            ]
                            setPageNodeInfoByPageGroupId(YakitRoute.HTTPFuzzer, item.groupId, groupList)
                        }
                        m.destroy()
                    },
                    onCancel: () => {
                        m.destroy()
                    },
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
                flatPageChildrenListAndRemoveGroupByPageGroupId(YakitRoute.HTTPFuzzer, groupItem.id)
            }
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
                    onCancel: () => {
                        m.destroy()
                    },
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

            // 序列
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                removePageNodeByPageGroupId(YakitRoute.HTTPFuzzer, groupItem.id)
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
                    m.destroy()
                    if (currentTabKey === YakitRoute.HTTPFuzzer) {
                        const pageNodeList: PageNodeItemProps | undefined = getPageNodeInfoByPageGroupId(
                            YakitRoute.HTTPFuzzer,
                            groupItem.id
                        )
                        if (!pageNodeList) return
                        let pageNodeInfo: PageInfoProps = {
                            pageNodeList: [pageNodeList],
                            routeKey: YakitRoute.HTTPFuzzer,
                            singleNode: false
                        }
                        setPageNode(YakitRoute.HTTPFuzzer, pageNodeInfo)
                    }
                },
                onCancel: () => {
                    m.destroy()
                },
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
        })
        const onDragStart = useMemoizedFn((result) => {
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
        const onBeforeCapture = useMemoizedFn((result) => {
            const {index, subIndex} = getPageItemById(subPage, result.draggableId)
            if (index === -1) return
            // subIndex === -1 没有在组内
            if (subIndex === -1) {
                const groupChildrenList = subPage[index].groupChildren || []
                if (groupChildrenList.length > 0) {
                    //如果拖拽的是一个组,则应该只能排序,不能组合
                    // setDropType(droppable)
                    // setSubDropType(droppableGroup)
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

        // ------------------- 序列化相关 start -------------------
        /**
         * @description 新建组时， 传入 groupItem ，新增序列化数据
         * @param groupItem
         */
        const pushSequenceByGroupChildren = useMemoizedFn((groupItem: MultipleNodeInfo) => {
            const sequenceList: PageNodeItemProps[] = []
            const groupChildrenList = groupItem.groupChildren || []
            groupChildrenList.forEach((nodeItem, j) => {
                const nodeInfo = getPageNodeInfoByPageId(YakitRoute.HTTPFuzzer, nodeItem.id)
                if (!nodeInfo) return
                const {currentItem} = nodeInfo
                sequenceList.push({
                    id: `${randomString(8)}-${j + 1}`,
                    routeKey: YakitRoute.HTTPFuzzer,
                    pageGroupId: nodeItem.groupId,
                    pageId: nodeItem.id,
                    pageName: nodeItem.verbose,
                    pageParamsInfo: currentItem.pageParamsInfo,
                    pageChildrenList: []
                })
            })
            const newPageNodeList: PageNodeItemProps = {
                // id: `${randomString(8)}-${index + 1}`,
                id: "",
                routeKey: YakitRoute.HTTPFuzzer,
                pageGroupId: groupItem.groupId,
                pageId: groupItem.id,
                pageName: groupItem.verbose,
                pageParamsInfo: {
                    webFuzzerPageInfo: {
                        pageId: groupItem.id,
                        advancedConfigValue: {
                            ...defaultAdvancedConfigValue
                        },
                        request: ""
                    }
                },
                pageChildrenList: sequenceList
            }
            addPageNode(YakitRoute.HTTPFuzzer, newPageNodeList)
        })
        /** 删除组A中的序列化数据,向组B新增序列化数据 */
        const addSequenceByPageGroupId = useMemoizedFn(
            (sourceItem: MultipleNodeInfo, destinationGroupId: string, destinationIndex?: number) => {
                const removePageNode = removePageNodeInfoByPageId(YakitRoute.HTTPFuzzer, sourceItem.id)
                if (removePageNode) {
                    setCurrentSelectGroup(YakitRoute.HTTPFuzzer, destinationGroupId)
                    setSelectGroupId(destinationGroupId)
                    addPageNodeInfoByPageGroupId(
                        YakitRoute.HTTPFuzzer,
                        destinationGroupId,
                        {
                            ...removePageNode,
                            pageGroupId: destinationGroupId
                        },
                        destinationIndex
                    )
                }
            }
        )
        /**
         * @description 从组内移除序列数据，并将移除的item变为游离的
         */
        const onRemoveGroupAndPushPageNode = useMemoizedFn((item: MultipleNodeInfo) => {
            removePageNodeInfoByPageId(YakitRoute.HTTPFuzzer, item.id)
            const newPageNode: PageNodeItemProps = {
                id: "",
                routeKey: YakitRoute.HTTPFuzzer,
                pageGroupId: item.groupId,
                pageId: item.id,
                pageName: item.verbose,
                pageParamsInfo: {
                    webFuzzerPageInfo: {
                        pageId: item.id,
                        advancedConfigValue: {
                            ...defaultAdvancedConfigValue,
                            ...item.params
                        },
                        request: item.params?.request || ""
                    }
                },
                pageChildrenList: []
            }
            addPageNode(YakitRoute.HTTPFuzzer, newPageNode)
        })
        // ------------------- 序列化相关 end -------------------
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

const SubTabItem: React.FC<SubTabItemProps> = React.memo((props) => {
    const {subItem, dropType, index, selectSubMenu, setSelectSubMenu, onRemoveSub, onContextMenu, combineColor} = props
    const isActive = useMemo(() => subItem.id === selectSubMenu?.id, [subItem, selectSubMenu])
    return (
        <Draggable key={subItem.id} draggableId={subItem.id} index={index} type={dropType}>
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
                            [styles[`tab-menu-sub-item-combine-${combineColor}`]]: !!combineColor
                        })}
                        onClick={() => {
                            setSelectSubMenu(subItem)
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
                        {provided.placeholder}
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
                                        {...provided.draggableProps}
                                        // {...provided.dragHandleProps}
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
                        {providedGroup.placeholder}
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
