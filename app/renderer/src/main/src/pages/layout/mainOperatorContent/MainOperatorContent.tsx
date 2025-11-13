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
    SubTabsProps,
    SwitchSubMenuItemProps
} from "./MainOperatorContentType"
import styles from "./MainOperatorContent.module.scss"
import {
    YakitRouteToPageInfo,
    SingletonPageRoute,
    NoPaddingRoute,
    ComponentParams,
    defaultFixedTabs,
    LogOutCloseRoutes,
    defaultFixedTabsNoSinglPageRoute
} from "@/routes/newRoute"
import {
    isEnpriTraceAgent,
    isBreachTrace,
    isEnterpriseOrSimpleEdition,
    isEnterpriseEdition,
    isIRify,
    isCommunityIRify,
    isEnpriTraceIRify
} from "@/utils/envfile"
import {
    useCreation,
    useDebounceFn,
    useGetState,
    useInViewport,
    useInterval,
    useLongPress,
    useMemoizedFn,
    useThrottleFn,
    useUpdateEffect
} from "ahooks"
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
import {CheckIcon, RemoveIcon, SolidDocumentTextIcon} from "@/assets/newIcon"
import {RouteToPageProps} from "../publicMenu/PublicMenu"
import {SubscribeCloseType, YakitSecondaryConfirmProps, useSubscribeClose} from "@/store/tabSubscribe"
import {YakitModalConfirm, showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {defaultUserInfo} from "@/pages/MainOperator"
import {useStore} from "@/store"
import {getRemoteProjectValue, getRemoteValue, setRemoteProjectValue, setRemoteValue} from "@/utils/kv"
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
import {
    OutlineChevrondoubleleftIcon,
    OutlineChevrondoublerightIcon,
    OutlinePlusIcon,
    OutlineRefreshIcon,
    OutlineSortascendingIcon,
    OutlineSortdescendingIcon,
    OutlineStoreIcon
} from "@/assets/icon/outline"

import {FuzzerCacheDataProps, ShareValueProps, getFuzzerCacheData} from "@/pages/fuzzer/HTTPFuzzerPage"
import {AdvancedConfigValueProps} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {RenderFuzzerSequence, RenderSubPage} from "./renderSubPage/RenderSubPage"
import {WebFuzzerType} from "@/pages/fuzzer/WebFuzzerPage/WebFuzzerPageType"
import {
    FuzzerSequenceCacheDataProps,
    getFuzzerSequenceProcessedCacheData,
    useFuzzerSequence
} from "@/store/fuzzerSequence"
import emiter from "@/utils/eventBus/eventBus"
import {shallow} from "zustand/shallow"
import {RemoteGV} from "@/yakitGV"
import {
    AddYakitScriptPageInfoProps,
    AuditCodePageInfoProps,
    CodeScanPageInfoProps,
    HTTPHackerPageInfoProps,
    MITMHackerPageInfoProps,
    HTTPHistoryAnalysisPageInfo,
    ModifyNotepadPageInfoProps,
    PageNodeItemProps,
    PageProps,
    PluginHubPageInfoProps,
    RiskPageInfoProps,
    defPage,
    getFuzzerProcessedCacheData,
    saveFuzzerCache,
    usePageInfo,
    AIForgeEditorPageInfoProps,
    AIToolEditorPageInfoProps,
    YakRunnerScanHistoryPageInfoProps
} from "@/store/pageInfo"
import {startupDuplexConn, closeDuplexConn} from "@/utils/duplex/duplex"
import cloneDeep from "lodash/cloneDeep"
import {onToManageGroup} from "@/pages/securityTool/yakPoC/YakPoC"
import {apiFetchQueryYakScriptGroupLocal} from "@/pages/plugins/utils"
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
import {defaultAddYakitScriptPageInfo} from "@/defaultConstants/AddYakitScript"
import {useMenuHeight} from "@/store/menuHeight"
import {HybridScanInputTarget} from "@/models/HybridScan"
import {defaultWebsocketFuzzerPageInfo} from "@/defaultConstants/WebsocketFuzzer"
import {RestoreTabContent} from "./TabRenameModalContent"
import {
    FuzzerConfig,
    QueryFuzzerConfigRequest,
    SaveFuzzerConfigRequest,
    apiQueryFuzzerConfig,
    apiSaveFuzzerConfig
} from "./utils"
import {defaultCodeScanPageInfo} from "@/defaultConstants/CodeScan"
import {FuzzerRemoteGV} from "@/enums/fuzzer"
import {defaultModifyNotepadPageInfo} from "@/defaultConstants/ModifyNotepad"
import {APIFunc} from "@/apiUtils/type"
import {getHotPatchCodeInfo} from "@/pages/fuzzer/HTTPFuzzerHotPatch"
import {PublicHTTPHistoryIcon} from "@/routes/publicIcon"
import {GlobalConfigRemoteGV} from "@/enums/globalConfig"
import {defaultHTTPHistoryAnalysisPageInfo} from "@/defaultConstants/hTTPHistoryAnalysis"
import {BatchAddNewGroupFormItem} from "./BatchAddNewGroup"
import useShortcutKeyTrigger from "@/utils/globalShortcutKey/events/useShortcutKeyTrigger"
import {ShortcutKeyPageName} from "@/utils/globalShortcutKey/events/pageMaps"
import {getGlobalShortcutKeyEvents} from "@/utils/globalShortcutKey/events/global"
import {
    convertKeyEventToKeyCombination,
    sortKeysCombination,
    unregisterShortcutFocusHandle
} from "@/utils/globalShortcutKey/utils"
import { keepSearchNameMapStore } from "@/store/keepSearchName"
import { useHttpFlowStore } from "@/store/httpFlow"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const BatchAddNewGroup = React.lazy(() => import("./BatchAddNewGroup"))
const BatchEditGroup = React.lazy(() => import("./BatchEditGroup/BatchEditGroup"))
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
            // {
            //     label: "新建组",
            //     itemIcon: <OutlinePlusIcon />,
            //     key: "newGroup"
            // },
            {
                label: "批量新建组",
                itemIcon: <OutlinePlusIcon />,
                key: "batchNewGroup"
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
 * 获取oldArray中被删除的数据
 * @param oldArray
 * @param newArray
 * @returns
 */
const getDeletedItems = (oldArray: MultipleNodeInfo[], newArray: MultipleNodeInfo[]): MultipleNodeInfo[] => {
    const newArrayIds = new Set(newArray.map((item) => item.id))
    return oldArray.filter((oldItem) => !newArrayIds.has(oldItem.id))
}
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
 * 收集所有的组
 */
const collectGroupsWithChildren = (data: MultipleNodeInfo[]) => {
    const result: MultipleNodeInfo[] = []
    function traverse(list: MultipleNodeInfo[]) {
        list.forEach((item: MultipleNodeInfo) => {
            if (Array.isArray(item.groupChildren) && item.groupChildren.length > 0) {
                result.push(item)
                traverse(item.groupChildren)
            }
        })
    }
    traverse(data)
    return result
}

/**
 * 获取所有tab页对象
 */
const collectLeafNodes = (data: MultipleNodeInfo[]) => {
    const leafNodes: MultipleNodeInfo[] = []
    function traverse(item: MultipleNodeInfo) {
        // 如果存在 groupChildren 且不为空，则继续递归
        if (Array.isArray(item.groupChildren) && item.groupChildren.length > 0) {
            item.groupChildren.forEach((child) => traverse(child))
        } else {
            // 如果没有子节点，则认为是叶子节点
            leafNodes.push(item)
        }
    }
    data.forEach((item) => traverse(item))
    return leafNodes
}

/**
 * 移除指定id的tab页对象
 */
const filterTabByIds = (data: MultipleNodeInfo[], idsToRemove: string[]) => {
    return data
        .map((item) => {
            if (Array.isArray(item.groupChildren)) {
                item.groupChildren = filterTabByIds(item.groupChildren, idsToRemove)
            }
            return item
        })
        .filter((item) => {
            const isGroup = typeof item.id === "string" && item.id.endsWith("-group")
            const shouldRemoveById = idsToRemove.includes(item.id)
            const shouldRemoveEmptyGroup = isGroup && item.groupChildren?.length === 0
            return !shouldRemoveById && !shouldRemoveEmptyGroup
        })
}

/**
 * 判断指定tab页id是否在subPage里面
 */
const containsId = (data: MultipleNodeInfo[], targetId: string) => {
    for (const item of data) {
        if (item.id === targetId) return true
        if (Array.isArray(item.groupChildren)) {
            const foundInChildren = containsId(item.groupChildren, targetId)
            if (foundInChildren) return true
        }
    }
    return false
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
export const getInitPageCache: (routeKeyToLabel: Map<string, string>) => PageCache[] = (routeKeyToLabel) => {
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

    if (isIRify()) {
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

    const time = new Date().getTime().toString()
    const tabId = `${YakitRoute.DB_HTTPHistoryAnalysis}-[${randomString(6)}]-${time}`
    const menuName = YakitRouteToPageInfo[YakitRoute.DB_HTTPHistoryAnalysis]?.label || ""
    let tabName = routeKeyToLabel.get(YakitRoute.DB_HTTPHistoryAnalysis) || menuName
    let verbose = `${tabName}-1`
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
        },
        {
            routeKey: routeConvertKey(YakitRoute.DB_HTTPHistoryAnalysis, ""),
            verbose: "流量分析器",
            menuName: YakitRouteToPageInfo[YakitRoute.DB_HTTPHistoryAnalysis].label,
            route: YakitRoute.DB_HTTPHistoryAnalysis,
            singleNode: false,
            multipleLength: 1,
            multipleNode: [
                {
                    id: tabId,
                    verbose,
                    time,
                    groupId: "0",
                    sortFieId: 1
                }
            ]
        }
    ]
}

// 固定页面需要icon图标的
const InitPageHasRouteIcon = [
    {
        route: YakitRoute.DB_HTTPHistoryAnalysis,
        routeIcon: <PublicHTTPHistoryIcon />
    }
]

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

export let childWindowHash = ""
export const MainOperatorContent: React.FC<MainOperatorContentProps> = React.memo((props) => {
    const {routeKeyToLabel} = props
    const {t, i18n} = useI18nNamespaces(["layout"])

    const [loading, setLoading] = useState(false)

    useShortcutKeyTrigger("screenshot", () => {
        ipcRenderer.invoke("activate-screenshot")
    })

    const {
        setPagesData,
        setSelectGroupId,
        addPagesDataCache,
        pages,
        clearAllData,
        getCurrentSelectPageId,
        setCurrentPageTabRouteKey,
        clearOtherDataByRoute
    } = usePageInfo(
        (s) => ({
            setPagesData: s.setPagesData,
            setSelectGroupId: s.setSelectGroupId,
            addPagesDataCache: s.addPagesDataCache,
            pages: s.pages,
            clearAllData: s.clearAllData,
            getCurrentSelectPageId: s.getCurrentSelectPageId,
            setCurrentPageTabRouteKey: s.setCurrentPageTabRouteKey,
            clearOtherDataByRoute: s.clearOtherDataByRoute
        }),
        shallow
    )

    useEffect(() => {
        ipcRenderer.on("child-window-hash", (event, {hash}) => {
            childWindowHash = hash
        })
        return () => {
            childWindowHash = ""
            ipcRenderer.send("close-childWin")
            ipcRenderer.removeAllListeners("child-window-hash")
        }
    }, [])

    // tab数据
    const [pageCache, setPageCache, getPageCache] = useGetState<PageCache[]>(
        _.cloneDeepWith(getInitPageCache(routeKeyToLabel)) || []
    )
    const [currentTabKey, setCurrentTabKey] = useState<YakitRoute | string>(getInitActiveTabKey())
    useEffect(() => {
        setCurrentPageTabRouteKey(currentTabKey)
        // 固定页面多开，如果从未打开，则默认新增一个标签页
        if (defaultFixedTabsNoSinglPageRoute.includes(currentTabKey as YakitRoute)) {
            const item = getPageCache().find((i) => i.routeKey === currentTabKey)
            if (!item?.multipleNode.length) {
                openMenuPage({route: currentTabKey as YakitRoute})
            }
        }
    }, [currentTabKey])

    // 发送到专项漏洞检测modal-show变量
    const [bugTestShow, setBugTestShow] = useState<boolean>(false)
    const [bugList, setBugList] = useState<GroupCount[]>([])
    const [bugTestValue, setBugTestValue] = useState<string>()
    const [bugUrl, setBugUrl] = useState<string>("")
    const { resetCompareData }  = useHttpFlowStore() 

    // 在组件启动的时候，执行一次，用于初始化服务端推送（DuplexConnection）
    useEffect(() => {
        startupDuplexConn()
        return () => {
            // 当组件销毁的时候，关闭DuplexConnection
            closeDuplexConn()
        }
    }, [])

    /** ---------- 新逻辑 start ---------- */

    useEffect(() => {
        /**切换一级菜单选中key */
        emiter.on("switchMenuItem", onSwitchMenuItem)
        /**关闭一级菜单 */
        emiter.on("onCloseFirstMenu", onCloseFirstMenu)
        return () => {
            emiter.off("switchMenuItem", onSwitchMenuItem)
            emiter.off("onCloseFirstMenu", onCloseFirstMenu)
        }
    }, [])
    const onSwitchMenuItem = useMemoizedFn((data) => {
        try {
            const value = JSON.parse(data)
            if (value?.route) {
                setCurrentTabKey(value.route)
            }
        } catch (error) {
            yakitNotify("error", `切换一级菜单选中key失败:${error}`)
        }
    })
    const onCloseFirstMenu = useMemoizedFn((res) => {
        try {
            const value: OnlyPageCache = JSON.parse(res)
            const data: OnlyPageCache = {
                menuName: "",
                route: value.route
            }
            removeMenuPage(data)
        } catch (error) {}
    })
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
            case YakitRoute.Plugin_Hub:
                pluginHub(params)
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
            case YakitRoute.DB_Risk:
                addRiskPage(params)
                break
            case YakitRoute.HTTPHacker:
                addHTTPHackerPage(params)
                break
            case YakitRoute.YakRunner_Audit_Code:
                addYakRunnerAuditCodePage(params)
                break
            case YakitRoute.YakRunner_Code_Scan:
                addYakRunnerCodeScanPage(params)
                break
            case YakitRoute.YakRunner_Audit_Hole:
                addYakRunnerAuditHolePage(params)
                break
            case YakitRoute.Modify_Notepad:
                addModifyNotepad(params)
                break
            case YakitRoute.Rule_Management:
                addRuleManagement()
                break
            case YakitRoute.YakRunner_Project_Manager:
                addProjectManager()
                break
            case YakitRoute.YakRunner_ScanHistory:
                addScanHistory(params)
                break
            case YakitRoute.MITMHacker:
                addMITMHacker(params)
                break
            case YakitRoute.DB_HTTPHistoryAnalysis:
                addHTTPHistoryAnalysis(params)
                break
            case YakitRoute.ShortcutKey:
                addShortcutKey(params)
                break
            case YakitRoute.ModifyAIForge:
                modifyAIForge(params)
                break
            case YakitRoute.ModifyAITool:
                modifyAITool(params)
                break
            case YakitRoute.DB_Report:
                dbReport()
                break
            default:
                break
        }
    })

    const dbReport = useMemoizedFn(()=>{
        const isExist = pageCache.filter((item) => item.route === YakitRoute.DB_Report).length
        if (isExist) {
            emiter.emit("onRefreshDBReport")
        }
        openMenuPage({route: YakitRoute.DB_Report})
    })

    const addProjectManager = useMemoizedFn(() => {
        const isExist = pageCache.filter((item) => item.route === YakitRoute.YakRunner_Project_Manager).length
        if (isExist) {
            emiter.emit("onRefreshProjectManager")
        }
        openMenuPage({route: YakitRoute.YakRunner_Project_Manager})
    })

    const addScanHistory = useMemoizedFn((data: YakRunnerScanHistoryPageInfoProps) => {
        const isExist = pageCache.filter((item) => item.route === YakitRoute.YakRunner_ScanHistory).length
        if (isExist && data) {
            emiter.emit("onYakRunnerScanHistoryPageInfo", JSON.stringify(data))
        }
        openMenuPage(
            {route: YakitRoute.YakRunner_ScanHistory},
            {
                pageParams: {
                    yakRunnerScanHistoryPageInfo: {
                        ...data
                    }
                }
            }
        )
    })

    const addShortcutKey = useMemoizedFn((data: ShortcutKeyPageName) => {
        openMenuPage(
            {route: YakitRoute.ShortcutKey},
            {
                pageParams: {
                    shortcutKeyPage: data
                }
            }
        )
    })

    const addRuleManagement = useMemoizedFn(() => {
        openMenuPage({route: YakitRoute.Rule_Management})
    })

    const addYakRunnerCodeScanPage = useMemoizedFn((data: CodeScanPageInfoProps) => {
        openMenuPage(
            {route: YakitRoute.YakRunner_Code_Scan},
            {
                pageParams: {
                    codeScanPageInfo: {...data}
                }
            }
        )
    })

    const addYakRunnerAuditCodePage = useMemoizedFn((data?: AuditCodePageInfoProps) => {
        const isExist = pageCache.filter((item) => item.route === YakitRoute.YakRunner_Audit_Code).length
        if (isExist && data) {
            emiter.emit("onAuditCodePageInfo", JSON.stringify(data))
        }
        const pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [
                {
                    id: randomString(8),
                    routeKey: YakitRoute.YakRunner_Audit_Code,
                    pageGroupId: "0",
                    pageId: YakitRoute.YakRunner_Audit_Code,
                    pageName: YakitRouteToPageInfo[YakitRoute.YakRunner_Audit_Code]?.label || "",
                    pageParamsInfo: {
                        auditCodePageInfo: data
                    },
                    sortFieId: 0
                }
            ],
            routeKey: YakitRoute.YakRunner_Audit_Code,
            singleNode: true
        }
        setPagesData(YakitRoute.YakRunner_Audit_Code, pageNodeInfo)
        openMenuPage(
            {route: YakitRoute.YakRunner_Audit_Code},
            {
                pageParams: {
                    auditCodePageInfo: data
                        ? {
                              ...data
                          }
                        : undefined
                }
            }
        )
    })

    const addYakRunnerAuditHolePage = useMemoizedFn((data: RiskPageInfoProps) => {
        const isExist = pageCache.filter((item) => item.route === YakitRoute.YakRunner_Audit_Hole).length
        if (isExist) {
            if (data.SeverityList) {
                emiter.emit("auditHoleVulnerabilityLevel", JSON.stringify(data.SeverityList))
            }
        }
        const pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [
                {
                    id: randomString(8),
                    routeKey: YakitRoute.YakRunner_Audit_Hole,
                    pageGroupId: "0",
                    pageId: YakitRoute.YakRunner_Audit_Hole,
                    pageName: YakitRouteToPageInfo[YakitRoute.YakRunner_Audit_Hole]?.label || "",
                    pageParamsInfo: {
                        riskPageInfo: data
                    },
                    sortFieId: 0
                }
            ],
            routeKey: YakitRoute.YakRunner_Audit_Hole,
            singleNode: true
        }
        setPagesData(YakitRoute.YakRunner_Audit_Hole, pageNodeInfo)
        openMenuPage(
            {route: YakitRoute.YakRunner_Audit_Hole},
            {
                pageParams: {
                    riskPageInfoProps: {
                        ...data
                    }
                }
            }
        )
    })

    const addHTTPHackerPage = useMemoizedFn((data: HTTPHackerPageInfoProps) => {
        const pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [
                {
                    id: randomString(8),
                    routeKey: YakitRoute.HTTPHacker,
                    pageGroupId: "0",
                    pageId: YakitRoute.HTTPHacker,
                    pageName: YakitRouteToPageInfo[YakitRoute.HTTPHacker]?.label || "",
                    pageParamsInfo: {
                        hTTPHackerPageInfo: data
                    },
                    sortFieId: 0
                }
            ],
            routeKey: YakitRoute.HTTPHacker,
            singleNode: true
        }
        setPagesData(YakitRoute.HTTPHacker, pageNodeInfo)
        openMenuPage(
            {route: YakitRoute.HTTPHacker},
            {
                pageParams: {
                    hTTPHackerPageInfoProps: {
                        ...data
                    }
                }
            }
        )
    })
    /** HTTPHackerPage v2 */
    const addMITMHacker = useMemoizedFn((data: MITMHackerPageInfoProps) => {
        const pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [
                {
                    id: randomString(8),
                    routeKey: YakitRoute.MITMHacker,
                    pageGroupId: "0",
                    pageId: YakitRoute.MITMHacker,
                    pageName: YakitRouteToPageInfo[YakitRoute.MITMHacker]?.label || "",
                    pageParamsInfo: {
                        mitmHackerPageInfo: data
                    },
                    sortFieId: 0
                }
            ],
            routeKey: YakitRoute.MITMHacker,
            singleNode: true
        }
        setPagesData(YakitRoute.MITMHacker, pageNodeInfo)
        openMenuPage(
            {route: YakitRoute.MITMHacker},
            {
                pageParams: {
                    mitmHackerPageInfo: {
                        ...data
                    }
                }
            }
        )
    })
    const addRiskPage = useMemoizedFn((data: RiskPageInfoProps) => {
        const isExist = pageCache.filter((item) => item.route === YakitRoute.DB_Risk).length
        if (isExist) {
            if (data.SeverityList) {
                emiter.emit("specifyVulnerabilityLevel", JSON.stringify(data.SeverityList))
            }
        }
        const pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [
                {
                    id: randomString(8),
                    routeKey: YakitRoute.DB_Risk,
                    pageGroupId: "0",
                    pageId: YakitRoute.DB_Risk,
                    pageName: YakitRouteToPageInfo[YakitRoute.DB_Risk]?.label || "",
                    pageParamsInfo: {
                        riskPageInfo: data
                    },
                    sortFieId: 0
                }
            ],
            routeKey: YakitRoute.DB_Risk,
            singleNode: true
        }
        setPagesData(YakitRoute.DB_Risk, pageNodeInfo)
        openMenuPage(
            {route: YakitRoute.DB_Risk},
            {
                pageParams: {
                    riskPageInfoProps: {
                        ...data
                    }
                }
            }
        )
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
    const addModifyNotepad = useMemoizedFn((data: ModifyNotepadPageInfoProps) => {
        openMenuPage(
            {route: YakitRoute.Modify_Notepad},
            {
                verbose: data.title,
                pageParams: {
                    modifyNotepadPageInfo: {...data}
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
    const addYakScript = useMemoizedFn((data: AddYakitScriptPageInfoProps) => {
        const isExist = pageCache.filter((item) => item.route === YakitRoute.AddYakitScript).length
        if (isExist) {
            const modalProps = getSubscribeClose(YakitRoute.AddYakitScript)
            if (modalProps) {
                judgeDataIsFuncOrSettingForConfirm(
                    modalProps["reset"],
                    (setting) => {
                        onModalSecondaryConfirm(setting, isModalVisibleRef)
                    },
                    () => {}
                )
            }
        }
        openMenuPage(
            {route: YakitRoute.AddYakitScript},
            {
                pageParams: {
                    addYakitScriptPageInfo: {
                        ...defaultAddYakitScriptPageInfo,
                        ...data
                    }
                }
            }
        )
    })
    /**
     * @name 插件仓库
     */
    const pluginHub = useMemoizedFn((data: PluginHubPageInfoProps) => {
        const isExist = pageCache.filter((item) => item.route === YakitRoute.Plugin_Hub).length
        if (isExist) {
            emiter.emit("openPluginHubListAndDetail", JSON.stringify(data || ""))
        }
        const pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [
                {
                    id: randomString(8),
                    routeKey: YakitRoute.Plugin_Hub,
                    pageGroupId: "0",
                    pageId: YakitRoute.Plugin_Hub,
                    pageName: YakitRouteToPageInfo[YakitRoute.Plugin_Hub]?.label || "",
                    pageParamsInfo: {
                        pluginHubPageInfo: data
                    },
                    sortFieId: 0
                }
            ],
            routeKey: YakitRoute.Plugin_Hub,
            singleNode: true
        }
        setPagesData(YakitRoute.Plugin_Hub, pageNodeInfo)
        openMenuPage({route: YakitRoute.Plugin_Hub})
    })

    /**
     * @name 新建forge模板
     * @param source 触发打开页面的父页面路由
     */
    const modifyAIForge = useMemoizedFn((data: AIForgeEditorPageInfoProps) => {
        const isExist = pageCache.filter((item) => item.route === YakitRoute.ModifyAIForge).length
        if (isExist) {
            const modalProps = getSubscribeClose(YakitRoute.ModifyAIForge)
            if (modalProps) {
                judgeDataIsFuncOrSettingForConfirm(
                    modalProps["reset"],
                    (setting) => {
                        onModalSecondaryConfirm(setting, isModalVisibleRef)
                    },
                    () => {}
                )
            }
        }
        openMenuPage(
            {route: YakitRoute.ModifyAIForge},
            {
                pageParams: {
                    modifyAIForgePageInfo: {...data}
                }
            }
        )
    })

    /**
     * @name 编辑AI tool
     * @param source 触发打开页面的父页面路由
     */
    const modifyAITool = useMemoizedFn((data: AIToolEditorPageInfoProps) => {
        const isExist = pageCache.filter((item) => item.route === YakitRoute.ModifyAITool).length
        if (isExist) {
            const modalProps = getSubscribeClose(YakitRoute.ModifyAITool)
            if (modalProps) {
                judgeDataIsFuncOrSettingForConfirm(
                    modalProps["reset"],
                    (setting) => {
                        onModalSecondaryConfirm(setting, isModalVisibleRef)
                    },
                    () => {}
                )
            }
        }
        openMenuPage(
            {route: YakitRoute.ModifyAITool},
            {
                pageParams: {
                    modifyAIToolPageInfo: {...data}
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
                // 判断页面是由谁触发打开的
                const addTargetCache: PageNodeItemProps = (pages.get(route)?.pageList || [])[0]
                let addNext: YakitRoute | undefined = undefined
                if (addTargetCache?.pageParamsInfo && addTargetCache.pageParamsInfo?.addYakitScriptPageInfo) {
                    addNext = addTargetCache.pageParamsInfo.addYakitScriptPageInfo?.source
                }
                removeMenuPage({route: route, menuName: ""}, addNext ? {route: addNext, menuName: ""} : undefined)
                break
            case YakitRoute.AddAIForge:
            case YakitRoute.ModifyAIForge:
                // 新建|编辑 forge 的关闭后跳转回 ai-agent 页面
                removeMenuPage({route: route, menuName: ""}, {route: YakitRoute.AI_Agent, menuName: ""})
                break

            case YakitRoute.AddAITool:
            case YakitRoute.ModifyAITool:
                // 新建|编辑 tool 的关闭后跳转回 ai-agent 页面
                removeMenuPage({route: route, menuName: ""}, {route: YakitRoute.AI_Agent, menuName: ""})
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
            if (type === "add-yakit-script") addYakScript(data)
            if (type === "facade-server") addFacadeServer(data)
            if (type === "add-yak-running") addYakRunning(data)
            if (type === "add-data-compare") addDataCompare(data)
            if (type === "**screen-recorder") openMenuPage({route: YakitRoute.ScreenRecorderPage})
            if (type === "**chaos-maker") openMenuPage({route: YakitRoute.DB_ChaosMaker})
            if (type === "**debug-monaco-editor") openMenuPage({route: YakitRoute.Beta_DebugMonacoEditor})
            if (type === "**vulinbox-manager") openMenuPage({route: YakitRoute.Beta_VulinboxManager})
            if (type === "**diagnose-network") openMenuPage({route: YakitRoute.Beta_DiagnoseNetwork})
            if (type === "**config-network") openMenuPage({route: YakitRoute.Beta_ConfigNetwork})
            if (type === "**beta-debug-traffic-analize") openMenuPage({route: YakitRoute.Beta_DebugTrafficAnalize})
            if (type === "**webshell-manager") openMenuPage({route: YakitRoute.Beta_WebShellManager})
            if (type === "**webshell-opt") addWebShellOpt(data)

            if (type === YakitRoute.HTTPHacker) {
                openMenuPage({route: YakitRoute.HTTPHacker})
            }
            if (type === YakitRoute.MITMHacker) {
                openMenuPage({route: YakitRoute.MITMHacker})
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
            if (type === YakitRoute.YakRunner_Code_Scan) {
                openMenuPage({route: YakitRoute.YakRunner_Code_Scan})
            }
            if (type === YakitRoute.YakRunner_Audit_Code) {
                openMenuPage({route: YakitRoute.YakRunner_Audit_Code})
            }
            if (type === YakitRoute.YakRunner_Audit_Hole) {
                openMenuPage({route: YakitRoute.YakRunner_Audit_Hole})
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
        const {
            isHttps,
            request,
            advancedConfigValue,
            openFlag = true,
            isCache = true,
            downstreamProxyStr = ""
        } = res || {}
        try {
            const isExistWF = pageCache.findIndex((ele) => ele.route === YakitRoute.HTTPFuzzer) !== -1
            if (!isExistWF) {
                await onInitFuzzer()
            }
            const cacheData: FuzzerCacheDataProps = (await getFuzzerCacheData()) || {
                proxy: [],
                dnsServers: [],
                etcHosts: [],
                advancedConfigShow: null,
                resNumlimit: DefFuzzerTableMaxData,
                noSystemProxy: false,
                disableUseConnPool: false
            }
            let newAdvancedConfigValue = {
                ...advancedConfigValue
            }
            if (isCache) {
                newAdvancedConfigValue.proxy = cacheData.proxy
                newAdvancedConfigValue.dnsServers = cacheData.dnsServers
                newAdvancedConfigValue.etcHosts = cacheData.etcHosts
                newAdvancedConfigValue.resNumlimit = cacheData.resNumlimit
                newAdvancedConfigValue.noSystemProxy = cacheData.noSystemProxy
                newAdvancedConfigValue.disableUseConnPool = cacheData.disableUseConnPool
            }

            let newAdvancedConfigShow = cacheData.advancedConfigShow
            let newIsHttps = !!isHttps
            let newRequest = request || defaultPostTemplate
            // 有分享内容，数据以分享内容为准
            if (res.hasOwnProperty("shareContent")) {
                const shareContent: ShareValueProps = JSON.parse(res.shareContent)
                newIsHttps = shareContent.advancedConfiguration.isHttps
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
            }
            if (downstreamProxyStr) {
                newAdvancedConfigValue.proxy = downstreamProxyStr.split(",")
            }

            // 获取全局热加载缓存信息
            const hotPatchCode = await getHotPatchCodeInfo()

            openMenuPage(
                {route: YakitRoute.HTTPFuzzer},
                {
                    openFlag,
                    pageParams: {
                        request: newRequest,
                        system: system,
                        advancedConfigValue: {
                            ...newAdvancedConfigValue,
                            isHttps: newIsHttps
                        },
                        advancedConfigShow: newAdvancedConfigShow,
                        hotPatchCode: hotPatchCode
                    }
                }
            )
        } catch (error) {
            yakitNotify("error", `打开WF失败:${error}`)
        }
    })
    /** websocket fuzzer 和 Fuzzer 类似 */
    const addWebsocketFuzzer = useMemoizedFn(
        (res: {tls: boolean; request: Uint8Array; openFlag?: boolean; toServer?: Uint8Array}) => {
            openMenuPage(
                {route: YakitRoute.WebsocketFuzzer},
                {
                    openFlag: res.openFlag,
                    pageParams: {
                        websocketFuzzerPageInfo: {
                            wsToServer: res.toServer,
                            wsRequest: res.request,
                            wsTls: res.tls
                        }
                    }
                }
            )
        }
    )
    /** 流量分析器 */
    const addHTTPHistoryAnalysis = useMemoizedFn((data: HTTPHistoryAnalysisPageInfo) => {
        openMenuPage(
            {route: YakitRoute.DB_HTTPHistoryAnalysis},
            {
                verbose: data.verbose,
                pageParams: {
                    hTTPHistoryAnalysisPageInfo: {
                        ...data
                    }
                }
            }
        )
    })
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
    /*ANCHOR[id=add-bug-test] - type=2:直接打开页面*/
    const addBugTest = useMemoizedFn((type: number, res?: any) => {
        const {URL = ""} = res || {}
        if (type === 1 && URL) {
            setBugUrl(URL)
            apiFetchQueryYakScriptGroupLocal(false, [], 2)
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
                                    HTTPRequestTemplate: cloneDeep(defPluginBatchExecuteExtraFormValue),
                                    InputFile: [],
                                    Input: bugUrl ? JSON.parse(bugUrl).join(",") : ""
                                } as HybridScanInputTarget
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
            setPageCache(getInitPageCache(routeKeyToLabel))
            setCurrentTabKey(getInitActiveTabKey())
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-close-tab")
            ipcRenderer.removeAllListeners("fetch-close-all-tab")
        }
    }, [])
    /** ---------- 远程关闭一级页面 end ---------- */

    /** ---------- @name 全局功能快捷键 Start ---------- */
    const isModalVisibleRef = useRef<boolean>(false)
    useShortcutKeyTrigger("removePage", (focus) => {
        if (focus) {
            let item = focus.find((i) => i.startsWith(currentTabKey))
            if (item) {
                // 在此处进行关闭二级页面
                emiter.emit("onRemoveSecondPageByFocus", item)
                return
            }
        }
        // 此处如若在webfuuzer monaco中执行关闭时不会走 onKeyDown关闭 逻辑 而是走此处关闭逻辑
        if (!isModalVisibleRef.current) {
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
        }
    })
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
                const tabName = routeKeyToLabel.get(key) || menuName
                const time = new Date().getTime().toString()
                // 如果存在，设置为当前页面
                if (filterPage.length > 0) {
                    const currentPage = filterPage[0]
                    const singleUpdateNode: MultipleNodeInfo = {
                        id: currentPage.routeKey,
                        verbose: currentPage.verbose,
                        time,
                        pageParams: {
                            ...nodeParams?.pageParams,
                            id: currentPage.routeKey,
                            groupId: "0"
                        },
                        groupId: "0",
                        sortFieId: 1
                    }
                    //  请勿随意调整执行顺序，先加页面的数据，再新增页面，以便于设置页面初始值
                    onSetPageInfoDataOfSingle(route, singleUpdateNode)
                    openFlag && setCurrentTabKey(key)
                    return
                }

                // 单页面的id与routeKey一样
                const singleNode: MultipleNodeInfo = {
                    id: key,
                    verbose: tabName,
                    time,
                    pageParams: {
                        ...nodeParams?.pageParams,
                        id: key,
                        groupId: "0"
                    },
                    groupId: "0",
                    sortFieId: 1
                }
                //  请勿随意调整执行顺序，先加页面的数据，再新增页面，以便于设置页面初始值
                onSetPageInfoDataOfSingle(route, singleNode)

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
                    `${tabName}-${filterPage.length > 0 ? (filterPage[0].multipleLength || 0) + 1 : 1}`

                switch (route) {
                    case YakitRoute.HTTPFuzzer:
                        verbose =
                            nodeParams?.verbose ||
                            `${filterPage.length > 0 ? (filterPage[0].multipleLength || 0) + 1 : 1}`
                        break
                    case YakitRoute.Modify_Notepad:
                        verbose =
                            nodeParams?.verbose ||
                            `Untitled-${filterPage.length > 0 ? (filterPage[0].multipleLength || 0) + 1 : 1}`
                        break
                    default:
                        break
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
                    onSetPageInfoDataOfMultiple(route, node, order)
                    setPageCache([...pages])
                    openFlag && setCurrentTabKey(key)
                } else {
                    //  请勿随意调整执行顺序，先加页面的数据，再新增页面，以便于设置页面初始值
                    onSetPageInfoDataOfMultiple(route, node, 1)
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
    /**单开页面 设置数据中心页面中的值 */
    const onSetPageInfoDataOfSingle = useMemoizedFn((route: YakitRoute, singleUpdateNode: MultipleNodeInfo) => {
        switch (route) {
            case YakitRoute.AddYakitScript:
                onSetAddYakitScriptData(singleUpdateNode, 1)
                break
            case YakitRoute.MITMHacker:
                onMITMHackerPage(singleUpdateNode, 1)
                break
            case YakitRoute.ModifyAIForge:
                onSetModifyAIForgeData(singleUpdateNode, 1)
                break
            case YakitRoute.ModifyAITool:
                onSetModifyAIToolData(singleUpdateNode, 1)
                break
            case YakitRoute.YakRunner_ScanHistory:
                onSetYakRunnerScanHistory(singleUpdateNode, 1)
                break
            default:
                break
        }
    })
    /**多开页面 设置数据中心页面中的值 */
    const onSetPageInfoDataOfMultiple = useMemoizedFn((route: YakitRoute, node: MultipleNodeInfo, order: number) => {
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
            case YakitRoute.WebsocketFuzzer:
                onWebsocketFuzzer(node, order)
                break
            case YakitRoute.Modify_Notepad:
                onSetModifyNotepadData(node, order)
                break
            case YakitRoute.YakRunner_Code_Scan:
                onCodeScanPage(node, order)
                break
            case YakitRoute.DB_HTTPHistoryAnalysis:
                onHTTPHistoryAnalysis(node, order)
                break
            case YakitRoute.DataCompare:
                onDataCompare(node, order)
                break
            default:
                break
        }
    })
    /**单页面直接set */
    const onSetAddYakitScriptData = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.AddYakitScript,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                addYakitScriptPageInfo: node.pageParams?.addYakitScriptPageInfo
                    ? {
                          ...defaultAddYakitScriptPageInfo,
                          ...node.pageParams.addYakitScriptPageInfo
                      }
                    : undefined
            },
            sortFieId: order
        }
        let pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [newPageNode],
            routeKey: YakitRoute.AddYakitScript
        }
        setPagesData(YakitRoute.AddYakitScript, pageNodeInfo)
    })
    const onSetModifyAIForgeData = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.ModifyAIForge,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                modifyAIForgePageInfo: node.pageParams?.modifyAIForgePageInfo
                    ? {...node.pageParams.modifyAIForgePageInfo}
                    : undefined
            },
            sortFieId: order
        }
        let pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [newPageNode],
            routeKey: YakitRoute.ModifyAIForge
        }
        setPagesData(YakitRoute.ModifyAIForge, pageNodeInfo)
    })
    const onSetModifyAIToolData = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.ModifyAITool,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                modifyAIToolPageInfo: node.pageParams?.modifyAIToolPageInfo
                    ? {...node.pageParams.modifyAIToolPageInfo}
                    : undefined
            },
            sortFieId: order
        }
        let pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [newPageNode],
            routeKey: YakitRoute.ModifyAITool
        }
        setPagesData(YakitRoute.ModifyAITool, pageNodeInfo)
    })

    const onSetYakRunnerScanHistory = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.YakRunner_ScanHistory,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                yakRunnerScanHistory: node.pageParams?.yakRunnerScanHistoryPageInfo
                    ? {
                          ...node.pageParams.yakRunnerScanHistoryPageInfo
                      }
                    : undefined
            },
            sortFieId: order
        }
        let pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [newPageNode],
            routeKey: YakitRoute.YakRunner_ScanHistory
        }
        setPagesData(YakitRoute.YakRunner_ScanHistory, pageNodeInfo)
    })
    const onBatchExecutorPage = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.BatchExecutorPage,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                pluginBatchExecutorPageInfo: {
                    ...defaultPluginBatchExecutorPageInfo,
                    ...(node.pageParams?.pluginBatchExecutorPageInfo || {})
                }
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
    const {clearDataByRoute, cachePages} = usePageInfo(
        (s) => ({
            clearDataByRoute: s.clearDataByRoute,
            cachePages: s.pages
        }),
        shallow
    )
    /** @description 多开页面的一级页面关闭事件 */
    const onBeforeRemovePage = useMemoizedFn((data: OnlyPageCache) => {
        switch (data.route) {
            case YakitRoute.AddYakitScript:
            case YakitRoute.HTTPFuzzer:
            case YakitRoute.Codec:
            case YakitRoute.AddAIForge:
            case YakitRoute.ModifyAIForge:
                const modalProps = getSubscribeClose(data.route)
                if (modalProps) {
                    judgeDataIsFuncOrSettingForConfirm(
                        modalProps["close"],
                        (setting) => {
                            onModalSecondaryConfirm(setting, isModalVisibleRef, data.route)
                        },
                        () => {
                            removeMenuPage(data)
                        }
                    )
                }
                break
            case YakitRoute.AddAITool:
            case YakitRoute.ModifyAITool:
                const toolModalProps = getSubscribeClose(data.route)
                if (toolModalProps) {
                    judgeDataIsFuncOrSettingForConfirm(
                        toolModalProps["close"],
                        (setting) => {
                            onModalSecondaryConfirm(setting, isModalVisibleRef)
                        },
                        () => {
                            removeMenuPage(data)
                        }
                    )
                }
                break
            case YakitRoute.YakScript:
                emiter.emit("onCloseYakRunner")
                break
            case YakitRoute.MITMHacker:
                removeMenuPage(data)
                keepSearchNameMapStore.removeKeepSearchRouteNameMap(YakitRoute.MITMHacker)
                break
            default:
                removeMenuPage(data)
                break
        }
    })
    /**
     * @name 移除一级页面
     * @param assignRoute //ANCHOR[id=remove-menuPage] - 删除页面后指定某个页面展示(如果指定页面未打开则执行正常流程)
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
        if(data.route === YakitRoute.DataCompare) {
            //替换ipcRenderer.invoke("reset-data-compare")
            resetCompareData()
            
            // ipcRenderer.invoke("reset-data-compare")
        }
    })

    /** ---------- 一级页面的逻辑 end ---------- */

    /** ---------- 登录状态变化的逻辑 start ---------- */
    const {userInfo, setStoreUserInfo} = useStore()
    useEffect(() => {
        ipcRenderer.on("login-out", (e) => {
            setStoreUserInfo(defaultUserInfo)
            if (isEnterpriseOrSimpleEdition()) {
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
            isEnterpriseOrSimpleEdition()
                ? setRemoteValue("token-online-enterprise", "")
                : setRemoteValue("token-online", "")
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
    const {setFuzzerSequenceCacheData, setFuzzerSequenceList, clearFuzzerSequence, addFuzzerSequenceCacheData} =
        useFuzzerSequence(
            (s) => ({
                setFuzzerSequenceList: s.setFuzzerSequenceList,
                setFuzzerSequenceCacheData: s.setFuzzerSequenceCacheData,
                clearFuzzerSequence: s.clearFuzzerSequence,
                addFuzzerSequenceCacheData: s.addFuzzerSequenceCacheData
            }),
            shallow
        )
    // useInterval(
    //     () => {
    //         onCacheHistoryWF()
    //     },
    //     1000 * 60 * 5 /** 每5分钟执行一次*/,
    //     {immediate: true}
    // )
    // fuzzer-tab页数据订阅事件
    const unFuzzerCacheData = useRef<any>(null)
    // web-fuzzer多开页面缓存数据
    useEffect(() => {
        if (isEnterpriseEdition()) {
            // 不是社区版的时候，每次进来都需要清除页面数据中心数据和FuzzerSequence数据
            clearAllData()
            clearFuzzerSequence()
        } else {
            // 社区版需要清除:非wf和FuzzerSequence数据
            clearOtherDataByRoute(YakitRoute.HTTPFuzzer)
        }
        getRemoteValue(RemoteGV.SelectFirstMenuTabKey)
            .then((cacheTabKey) => {
                /**没有缓存数据或者缓存数据的tab key为HTTPFuzzer，初始化WF缓存数据 */
                if (!cacheTabKey || cacheTabKey === YakitRoute.HTTPFuzzer) {
                    onInitFuzzer()
                }
            })
            .catch((error) => {
                yakitNotify("error", `SelectFirstMenuTabKey获取数据失败:${error}`)
            })

        // 开启fuzzer-tab页内数据的订阅事件
        if (unFuzzerCacheData.current) {
            unFuzzerCacheData.current()
        }
        if (!isIRify()) {
            unFuzzerCacheData.current = usePageInfo.subscribe(
                (state) => state.pages.get(YakitRoute.HTTPFuzzer) || [],
                (selectedState, previousSelectedState) => {
                    if (Array.isArray(selectedState) && Array.isArray(previousSelectedState)) return
                    saveFuzzerCache(selectedState as PageProps)
                }
            )
        }

        return () => {
            // 注销fuzzer-tab页内数据的订阅事件
            if (unFuzzerCacheData.current) {
                unFuzzerCacheData.current()
                unFuzzerCacheData.current = null
            }
        }
    }, [])
    const onInitFuzzer = useMemoizedFn(async () => {
        if (!isEnpriTraceAgent() && !isCommunityIRify() && !isEnpriTraceIRify()) {
            // 如果路由中已经存在webFuzzer页面，则不需要再从缓存中初始化页面
            if (pageCache.findIndex((ele) => ele.route === YakitRoute.HTTPFuzzer) === -1) {
                // 触发获取web-fuzzer的缓存
                try {
                    setLoading(true)
                    const res = await getRemoteProjectValue(FuzzerRemoteGV.FuzzerCache)
                    const cache = JSON.parse(res || "[]")
                    await fetchFuzzerList(cache)
                    await getFuzzerSequenceCache()
                    setTimeout(() => setLoading(false), 200)
                } catch (error) {
                    setLoading(false)
                    yakitNotify("error", `onInitFuzzer初始化WF数据失败:${error}`)
                    //进入webfuzzer页面,出现初始化数据失败报错时,弹窗【恢复标签页】,支持用户手动恢复
                    onRestoreHistory(YakitRoute.HTTPFuzzer)
                }
            }
        }
    })
    const getFuzzerSequenceCache = useMemoizedFn(() => {
        getRemoteProjectValue(FuzzerRemoteGV.FuzzerSequenceCache).then((res: any) => {
            try {
                const cache = JSON.parse(res || "[]")
                onSetFuzzerSequenceCacheData(cache)
            } catch (error) {
                yakitNotify("error", "webFuzzer序列化获取缓存数据解析失败:" + error)
            }
        })
    })

    const onSetFuzzerSequenceCacheData = useMemoizedFn((cache: FuzzerSequenceCacheDataProps[]) => {
        clearFuzzerSequence()
        setFuzzerSequenceList(cache.map((ele) => ({groupId: ele.groupId})))
        setFuzzerSequenceCacheData(cache)
    })

    // 获取数据库中缓存的web-fuzzer页面信息
    const fetchFuzzerList = useMemoizedFn(async (cache) => {
        try {
            const cacheData: FuzzerCacheDataProps = (await getFuzzerCacheData()) || {
                proxy: [],
                dnsServers: [],
                etcHosts: [],
                advancedConfigShow: null,
                resNumlimit: DefFuzzerTableMaxData,
                noSystemProxy: false,
                disableUseConnPool: false
            }
            const defaultCache = {
                proxy: cacheData.proxy,
                dnsServers: cacheData.dnsServers,
                etcHosts: cacheData.etcHosts,
                resNumlimit: cacheData.resNumlimit,
                noSystemProxy: cacheData.noSystemProxy,
                disableUseConnPool: cacheData.disableUseConnPool
            }
            clearAllData()
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
                                request: nodeItem.pageParams?.request || "",
                                hotPatchCode: nodeItem.pageParams?.hotPatchCode || ""
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
                            request: parentItem.pageParams?.request || "",
                            hotPatchCode: parentItem.pageParams?.hotPatchCode || ""
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
        } catch (error) {
            yakitNotify("error", "fetchFuzzerList失败:" + error)
        }
    })

    // 新增缓存数据
    /**@description 新增缓存数据 目前最新只缓存 request isHttps verbose hotPatchCode */
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
                    request: node.pageParams?.request || defaultPostTemplate,
                    hotPatchCode: node.pageParams?.hotPatchCode || ""
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
                                request: nodeItem.pageParams?.request || "",
                                hotPatchCode: nodeItem.pageParams?.hotPatchCode || ""
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
    /**流量分析器页面 */
    const onHTTPHistoryAnalysis = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.DB_HTTPHistoryAnalysis,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                hTTPHistoryAnalysisPageInfo: {
                    ...(node?.pageParams?.hTTPHistoryAnalysisPageInfo || defaultHTTPHistoryAnalysisPageInfo)
                }
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.DB_HTTPHistoryAnalysis, newPageNode)
    })
    /**代码扫描 */
    const onCodeScanPage = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.YakRunner_Code_Scan,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                codeScanPageInfo: {...(node?.pageParams?.codeScanPageInfo || defaultCodeScanPageInfo)}
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.YakRunner_Code_Scan, newPageNode)
    })
    /**mitm劫持 v2版本 */
    const onMITMHackerPage = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.MITMHacker,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                mitmHackerPageInfo: node.pageParams?.mitmHackerPageInfo
            },
            sortFieId: order
        }
        let pageNodeInfo: PageProps = {
            ...cloneDeep(defPage),
            pageList: [newPageNode],
            routeKey: YakitRoute.MITMHacker
        }
        setPagesData(YakitRoute.MITMHacker, pageNodeInfo)
    })
    /**WebsocketFuzzer */
    const onWebsocketFuzzer = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.WebsocketFuzzer,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                websocketFuzzerPageInfo: {
                    ...(node?.pageParams?.websocketFuzzerPageInfo || defaultWebsocketFuzzerPageInfo)
                }
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.WebsocketFuzzer, newPageNode)
    })

    /**记事本编辑 */
    const onSetModifyNotepadData = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.Modify_Notepad,
            pageGroupId: node.groupId,
            pageId: node.id,
            pageName: node.verbose,
            pageParamsInfo: {
                modifyNotepadPageInfo: {...(node?.pageParams?.modifyNotepadPageInfo || defaultModifyNotepadPageInfo)}
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.Modify_Notepad, newPageNode)
    })

    /** 数据对比 */
    const onDataCompare = useMemoizedFn((node: MultipleNodeInfo, order: number) => {
        const newPageNode: PageNodeItemProps = {
            id: `${randomString(8)}-${order}`,
            routeKey: YakitRoute.DataCompare,
            pageGroupId: node.groupId,
            pageId: node.id, 
            pageName: node.verbose,
            pageParamsInfo: {},
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.DataCompare, newPageNode)
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
                    ...(node.pageParams?.pocPageInfo || {})
                }
            },
            sortFieId: order
        }
        addPagesDataCache(YakitRoute.PoC, newPageNode)
    })

    const switchComparePage = () => {
        const dataCompareSub = getPageCache().find(item => item.route === YakitRoute.DataCompare)?.multipleNode
        const last = dataCompareSub?.[dataCompareSub.length - 1] || {}
        emiter.emit("switchSubMenuItem", JSON.stringify({pageId: last.id, forceRefresh: true}))
    }

    // 新增数据对比页面
    useEffect(() => {
        ipcRenderer.on("main-container-add-compare", (e, params) => {
            openMenuPage({route: YakitRoute.DataCompare}, {openFlag: params.openFlag ?? true})
            switchComparePage()
        })
        ipcRenderer.on("switch-compare-page",() => {
            setCurrentTabKey(YakitRoute.DataCompare)
            switchComparePage()
        })
        return () => {
            ipcRenderer.removeAllListeners("main-container-add-compare")
            ipcRenderer.removeAllListeners("switch-compare-page")
        }
    }, [pageCache])
    /**从历史记录中恢复数据 */
    const onRestoreHistory = useMemoizedFn((routeKey: YakitRoute) => {
        switch (routeKey) {
            case YakitRoute.HTTPFuzzer:
                const m = showYakitModal({
                    title: "恢复标签页",
                    footer: null,
                    content: <RestoreTabContent onClose={() => m.destroy()} onRestore={onRestoreHTTPFuzzer} />
                })
                break

            default:
                break
        }
    })
    const onRestoreHTTPFuzzer: (query: QueryFuzzerConfigRequest) => Promise<null> = useMemoizedFn(async (query) => {
        return new Promise(async (resolve) => {
            apiQueryFuzzerConfig(query).then(async ({Data = []}) => {
                try {
                    const pageList =
                        Data.map((ele) => ({
                            ...JSON.parse(ele.Config)
                        })) || []
                    if (pageList.length > 0) {
                        await fetchFuzzerList(pageList)
                        // FuzzerSequence
                        const resSequence = await getRemoteProjectValue(FuzzerRemoteGV.FuzzerSequenceCacheHistoryList)
                        if (!!resSequence) {
                            const listSequence = JSON.parse(resSequence)
                            if (listSequence?.length > 0) {
                                const itemSequence = listSequence[0]
                                await onSetFuzzerSequenceCacheData(itemSequence)
                            }
                        }
                    } else {
                        yakitNotify("info", `暂无WF历史数据`)
                    }
                    resolve(null)
                } catch (error) {
                    yakitNotify("error", `WF历史数据恢复失败:${error}`)
                }
            })
        })
    })

    /**保存历史记录 */
    const onSaveHistory = useMemoizedFn((routeKey: YakitRoute) => {
        switch (routeKey) {
            case YakitRoute.HTTPFuzzer:
                onSaveHTTPFuzzer()
                break

            default:
                break
        }
    })
    const onSaveHTTPFuzzer = useMemoizedFn(async () => {
        if (loading) return
        const wfPageInfo = pages.get(YakitRoute.HTTPFuzzer)?.pageList || []
        const pageData: FuzzerConfig[] = getFuzzerProcessedCacheData(wfPageInfo).map((item) => ({
            PageId: item.id,
            Type: item.id.endsWith("group") ? "pageGroup" : "page",
            Config: JSON.stringify(item)
        }))
        const params: SaveFuzzerConfigRequest = {
            Data: pageData
        }
        setLoading(true)
        apiSaveFuzzerConfig(params)
            .then(async () => {
                // FuzzerSequence
                const resSequence = await getRemoteProjectValue(FuzzerRemoteGV.FuzzerSequenceCache)
                const cacheSequence = JSON.parse(resSequence || "[]")
                if (cacheSequence.length > 0) {
                    const historySequenceList = [cacheSequence]
                    setRemoteProjectValue(
                        FuzzerRemoteGV.FuzzerSequenceCacheHistoryList,
                        JSON.stringify(historySequenceList)
                    )
                }
                yakitNotify("success", t("MainOperatorContent.save_fuzzer_history_success"))
            })
            .finally(() => setTimeout(() => setLoading(false), 200))
    })
    // webfuzzer页面触发快捷键事件
    useEffect(() => {
        emiter.on("onSaveHistoryDataHttpFuzzer", onSaveHTTPFuzzer)
        return () => {
            emiter.off("onSaveHistoryDataHttpFuzzer", onSaveHTTPFuzzer)
        }
    }, [])
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
                    onRestoreHistory={onRestoreHistory}
                    onSaveHistory={onSaveHistory}
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
                                    点击管理新建分组
                                    <span
                                        className={styles["bug-test-help-active"]}
                                        onClick={() => {
                                            setBugTestShow(false)
                                            onToManageGroup()
                                        }}
                                    >
                                        管理
                                    </span>
                                </span>
                            )
                        }
                    >
                        <YakitSelect
                            allowClear
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
    const {
        currentTabKey,
        setCurrentTabKey,
        onRemove,
        pageCache,
        setPageCache,
        openMultipleMenuPage,
        onRestoreHistory,
        onSaveHistory
    } = props
    const {updateMenuBodyHeight} = useMenuHeight(
        (s) => ({
            updateMenuBodyHeight: s.updateMenuBodyHeight
        }),
        shallow
    )
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
    const onUpdateMenuBodyHeight = useMemoizedFn((height) => {
        updateMenuBodyHeight({
            firstTabMenuBodyHeight: height
        })
    })

    return (
        <div className={styles["tab-menu"]}>
            <ReactResizeDetector
                onResize={(_, height) => {
                    if (!height) return
                    onUpdateMenuBodyHeight(height)
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
                onRestoreHistory={onRestoreHistory}
                onSaveHistory={onSaveHistory}
            />
        </div>
    )
})

const TabChildren: React.FC<TabChildrenProps> = React.memo((props) => {
    const {pageCache, currentTabKey, openMultipleMenuPage, onSetPageCache, onRestoreHistory, onSaveHistory} = props
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
                        id={"main-operator-page-body-" + pageItem.routeKey}
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
                                onRestoreHistory={onRestoreHistory}
                                onSaveHistory={onSaveHistory}
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
                setCurrentTabKey(item.routeKey)
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

    const showInitPageIcon = (item: PageCache) => {
        return InitPageHasRouteIcon.find((i) => i.route === item.route)?.routeIcon
    }

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
                    {item.routeKey === currentTabKey || !showInitPageIcon(item) ? (
                        <span className='content-ellipsis'>{item.verbose || ""}</span>
                    ) : (
                        <span className={styles["route-icon"]} title={item.verbose || ""}>
                            {showInitPageIcon(item)}
                        </span>
                    )}
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
    const {
        pageItem,
        index,
        pageCache,
        currentTabKey,
        openMultipleMenuPage,
        onSetPageCache,
        onRestoreHistory,
        onSaveHistory
    } = props
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
        // 切换一级页面时聚焦
        const key = routeConvertKey(pageItem.route, pageItem.pluginName)
        if (currentTabKey === key) {
            onFocusPage()
        }
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
    useUpdateEffect(() => {
        // 切换一级页面时,缓存当前选择的key
        onSetSelectFirstMenuTabKey(currentTabKey)
    }, [currentTabKey])

    useEffect(() => {
        // 处理外部新增一个二级tab
        setSubPage(pageItem.multipleNode || [])
    }, [pageItem.multipleNode])

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
    /**缓存当前一级菜单选中的key */
    const onSetSelectFirstMenuTabKey = useDebounceFn(
        (tabKey: YakitRoute | string) => {
            setRemoteValue(RemoteGV.SelectFirstMenuTabKey, tabKey)
        },
        {wait: 200, leading: true}
    ).run
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
    const onAddGroup = useMemoizedFn((e, {pageId, type: addType }: { pageId: string, type: WebFuzzerType }) => {
        if (!inViewport) return
        const {index} = getPageItemById(subPage, pageId)
        if (index === -1) return
        subTabsRef.current?.onNewGroup(subPage[index])
        setTimeout(() => {
            setType(addType)
        }, 200)
    })
    /**快捷关闭或者新增 */
    const onKeyDown = useMemoizedFn((e, subItem: MultipleNodeInfo) => {
        const keys = convertKeyEventToKeyCombination(e)
        if (!keys) return
        const triggerKeys = sortKeysCombination(keys).join("")

        const event = getGlobalShortcutKeyEvents()
        const closeEvent = sortKeysCombination(event.removePage.keys).join("")
        const openEvent = sortKeysCombination(event.addSubPage.keys).join("")
        // 快捷键关闭
        if (triggerKeys === closeEvent) {
            e.preventDefault()
            e.stopPropagation()
            if (pageCache.length === 0) return
            subTabsRef.current?.onRemove(subItem)
            return
        }
        // 快捷键新增
        if (triggerKeys === openEvent) {
            e.preventDefault()
            e.stopPropagation()
            subTabsRef.current?.onAddSubPage()
            return
        }
    })

    const onRemoveSecondPageByFocusFun = useMemoizedFn((focus: string) => {
        if (focus === selectSubMenu.id) {
            if (pageCache.length === 0) return
            unregisterShortcutFocusHandle(focus)
            subTabsRef.current?.onRemove(selectSubMenu)
        }
    })

    // 序列导入更新菜单
    useEffect(() => {
        emiter.on("onRemoveSecondPageByFocus", onRemoveSecondPageByFocusFun)
        return () => {
            emiter.off("onRemoveSecondPageByFocus", onRemoveSecondPageByFocusFun)
        }
    }, [])

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
            const res: SwitchSubMenuItemProps = JSON.parse(resVal)
            if (res.forceRefresh !== true && !inViewport) return
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
                onRestoreHistory={onRestoreHistory}
                onSaveHistory={onSaveHistory}
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
            openMultipleMenuPage,
            onRestoreHistory,
            onSaveHistory
        } = props
        const {t, i18n} = useI18nNamespaces(["layout"])

        //拖拽组件相关
        const [combineIds, setCombineIds] = useState<string[]>([]) //组合中的ids
        const [isCombineEnabled, setIsCombineEnabled] = useState<boolean>(true)
        const [dropType, setDropType] = useState<string>(droppable)
        const [subDropType, setSubDropType] = useState<string>(droppableGroup)

        const [isExpand, setIsExpand] = useState<boolean>(false) //是否可以拖拽

        const [scroll, setScroll] = useState<ScrollProps>({
            scrollLeft: 0,
            scrollBottom: 0,
            scrollRight: 0
        })

        const [closeGroupTip, setCloseGroupTip] = useState<boolean>(true) // 关闭组的时候是否还需要弹窗提示,默认是要弹窗的;如果用户选择了不再提示,后续则就不需要再弹出提示框

        const combineColorRef = useRef<string>("")
        const scrollLeftIconRef = useRef<any>()
        const scrollRightIconRef = useRef<any>()

        const secondaryTabsNumRef = useRef<number>(100) // 二级标签页数量限制 默认100
        const getSecondaryTabsNum = () => {
            getRemoteValue(GlobalConfigRemoteGV.SecondaryTabsNum).then((set) => {
                if (set) {
                    secondaryTabsNumRef.current = Number(set)
                }
            })
        }
        const onUpdateSecondaryTabsNum = (num: number) => {
            secondaryTabsNumRef.current = num
        }

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
            setCurrentSelectPageId,
            updateGroupExpandOrRetract
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
                setCurrentSelectPageId: s.setCurrentSelectPageId,
                updateGroupExpandOrRetract: s.updateGroupExpandOrRetract
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

        const { resetCompareData } = useHttpFlowStore()


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
            getSecondaryTabsNum()
            getIsCloseGroupTip()
            emiter.on("onCloseCurrentPage", onCloseCurrentPage)
            emiter.on("onUpdateSubMenuNameFormPage", onUpdateSubMenuNameFormPage)
            emiter.on("onUpdateSecondaryTabsNum", onUpdateSecondaryTabsNum)
            return () => {
                emiter.off("onCloseCurrentPage", onCloseCurrentPage)
                emiter.off("onUpdateSubMenuNameFormPage", onUpdateSubMenuNameFormPage)
                emiter.off("onUpdateSecondaryTabsNum", onUpdateSecondaryTabsNum)
            }
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
            if (getSubPageTotal(subPage) >= secondaryTabsNumRef.current) {
                yakitNotify("error", "超过标签页数量限制")
                return
            }

            //新增对比tab清除当前store数据
            pageItem.route === YakitRoute.DataCompare && resetCompareData();
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
        const onCloseCurrentPage = useMemoizedFn((id: string) => {
            const current: PageNodeItemProps | undefined = queryPagesDataById(currentTabKey, id)
            if (!current) return
            const removeItem: MultipleNodeInfo = {
                id: current.pageId,
                verbose: current.pageName,
                sortFieId: current.sortFieId,
                groupId: current.pageGroupId
            }
            onRemoveSubPage(removeItem)
        })

        /** 关闭当前标签页 */
        const onRemoveSubPageFun = useMemoizedFn((removeItem: MultipleNodeInfo) => {
            // 固定tab的多开页面，最后一个页面不能删除
            if (defaultFixedTabsNoSinglPageRoute.includes(pageItem.route) && subPage.length === 1) return

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

        /** @description 多开页面的二级页面关闭事件 */
        const onRemoveSubPage = useMemoizedFn((removeItem: MultipleNodeInfo) => {
            switch (pageItem.route) {
                case YakitRoute.Codec:
                    emiter.emit("onCloseSubPageByJudge", JSON.stringify(removeItem))
                    break
                default:
                    onRemoveSubPageFun(removeItem)
                    break
            }
        })

        const onCloseSubPageByInfoFun = useMemoizedFn((res) => {
            try {
                const data: MultipleNodeInfo = JSON.parse(res)
                if (data.id === selectSubMenu.id) {
                    onRemoveSubPageFun(data)
                }
            } catch (error) {}
        })
        useEffect(() => {
            emiter.on("onCloseSubPageByInfo", onCloseSubPageByInfoFun)
            return () => {
                emiter.off("onCloseSubPageByInfo", onCloseSubPageByInfoFun)
            }
        }, [])
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
            const {subIndex, index} = getPageItemById(subPage, item.id)
            if (subIndex !== -1) {
                menuData.splice(2, 0, {
                    label: "从组中移出",
                    key: "removeFromGroup"
                })
            }
            if (currentTabKey === YakitRoute.HTTPFuzzer) {
                menuData.push({
                    label: "恢复标签页",
                    key: "restoreTab"
                })
            }

            // 固定页面支持多开页面第一个标签页需要移除关闭标签选项
            if (defaultFixedTabsNoSinglPageRoute.includes(currentTabKey) && index === 0) {
                // @ts-ignore
                menuData = menuData.filter((item) => item.key !== "remove")
            }

            showByRightContext(
                {
                    width: 180,
                    type: "grey",
                    data: menuData,
                    onClick: ({key, keyPath}) => {
                        switch (key) {
                            case "rename":
                                onShowRenameModal(item)
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
                            case "batchNewGroup":
                                openBatchNewGroup(item)
                                break
                            case "newGroup":
                                onNewGroup(item)
                                break
                            case "restoreTab":
                                onRestoreHistory(currentTabKey)
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
        const onShowRenameModal = useMemoizedFn((item: MultipleNodeInfo) => {
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
                                onRenameAndUpdatePageNameAndSendEmiter({
                                    route: currentTabKey,
                                    updateItem: {
                                        ...item,
                                        verbose: val
                                    }
                                })
                                m.destroy()
                            }}
                        />
                    </React.Suspense>
                )
            })
        })
        /**
         * 从页面中修改菜单名，不需要再发送修改的信号
         */
        const onUpdateSubMenuNameFormPage = useMemoizedFn((val) => {
            try {
                const data = JSON.parse(val)
                const {route, value, pageId} = data
                const {index, subIndex} = getPageItemById(subPage, pageId)
                if (index === -1) return
                let item
                if (subIndex === -1) {
                    item = subPage[index]
                } else {
                    item = subPage[index][subIndex]
                }
                item.verbose = value
                onRenameAndUpdatePageName({route, updateItem: {...item}})
            } catch (error) {}
        })
        const onRename = useMemoizedFn((val: string, item: MultipleNodeInfo) => {
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
        })
        /**修改名称，更新数据中心得页面名称数据并发送数据修改的信号 */
        const onRenameAndUpdatePageNameAndSendEmiter = useMemoizedFn(
            (data: {route: YakitRoute; updateItem: MultipleNodeInfo}) => {
                const {route, updateItem} = data
                onRename(updateItem.verbose, updateItem)
                onUpdatePageName({route, updateItem}).then(() => {
                    emiter.emit("secondMenuTabDataChange", "")
                })
            }
        )
        /**修改名称，更新数据中心得页面名称数据 */
        const onRenameAndUpdatePageName = useMemoizedFn((data: {route: YakitRoute; updateItem: MultipleNodeInfo}) => {
            const {route, updateItem} = data
            onRename(updateItem.verbose, updateItem)
            onUpdatePageName({route, updateItem})
        })
        /**仅更新数据中心得页面名称数据 */
        const onUpdatePageName: APIFunc<{route: YakitRoute; updateItem: MultipleNodeInfo}, null> = (data) => {
            return new Promise((resolve, reject) => {
                const {route, updateItem} = data
                const current: PageNodeItemProps | undefined = queryPagesDataById(route, updateItem.id)
                if (!current) {
                    reject("当前页面不存在")
                    return
                }
                current.pageName = updateItem.verbose
                updatePagesDataCacheById(route, current)
                resolve(null)
            })
        }

        const openBatchNewGroup = useMemoizedFn((item: MultipleNodeInfo) => {
            const m = showYakitModal({
                title: "创建新组",
                footer: null,
                content: (
                    <BatchAddNewGroup
                        initialValues={{
                            groupName: "",
                            tabIds: [item.id]
                        }}
                        allGroup={collectGroupsWithChildren(cloneDeep(subPage))}
                        tabs={collectLeafNodes(cloneDeep(subPage))}
                        onFinish={(v) => {
                            onBatchNewGroup(item, v, () => {
                                m.destroy()
                            })
                        }}
                        onCancel={() => {
                            m.destroy()
                        }}
                    ></BatchAddNewGroup>
                )
            })
        })
        /**将页面添加到新建组 批量*/
        const onBatchNewGroup = useMemoizedFn(
            (item: MultipleNodeInfo, batchAddInfo: BatchAddNewGroupFormItem, finish: () => void) => {
                let newSubPage: MultipleNodeInfo[] = cloneDeep(subPage)
                const addNewGroupTabsIds = batchAddInfo.tabIds
                // 判断是将标签加入已经存在的组，往原来的组塞数据
                if (batchAddInfo.groupId) {
                    newSubPage = filterTabByIds(cloneDeep(subPage), addNewGroupTabsIds)
                    const {current} = getPageItemById(cloneDeep(subPage), batchAddInfo.groupId)
                    const groupChildren = collectLeafNodes(cloneDeep(subPage))
                        .filter((i) => addNewGroupTabsIds.includes(i.id))
                        .map((i: MultipleNodeInfo) => ({...i, groupId: batchAddInfo.groupId}))
                    if (current.groupChildren) {
                        const mergedMap = new Map()
                        current.groupChildren.forEach((item) => {
                            mergedMap.set(item.id, item)
                        })
                        groupChildren.forEach((item) => {
                            mergedMap.set(item.id, item)
                        })
                        const mergedArray = Array.from(mergedMap.values())

                        if (newSubPage.length === 0) {
                            newSubPage.push({
                                ...current,
                                groupChildren: mergedArray
                            })
                        } else {
                            const {index} = getPageItemById(newSubPage, batchAddInfo.groupId)
                            if (index !== -1) {
                                newSubPage.splice(index, 1, {
                                    ...current,
                                    groupChildren: mergedArray
                                })
                            } else {
                                newSubPage.push({
                                    ...current,
                                    groupChildren: mergedArray
                                })
                            }
                        }
                    }

                    if (selectSubMenu.id === item.id) {
                        setSelectSubMenu({...item, groupId: batchAddInfo.groupId})
                    }

                    onUpdateSorting(newSubPage, currentTabKey)
                } else {
                    const groupId = generateGroupId()
                    const newGroup: MultipleNodeInfo = {
                        id: groupId,
                        groupId: "0",
                        verbose: batchAddInfo.groupName,
                        sortFieId: subPage.length,
                        groupChildren: collectLeafNodes(cloneDeep(subPage))
                            .filter((i) => addNewGroupTabsIds.includes(i.id))
                            .map((i: MultipleNodeInfo) => ({...i, groupId})),
                        expand: true,
                        color: getColor(subPage)
                    }

                    if (selectSubMenu.id === item.id) {
                        setSelectSubMenu({...item, groupId})
                    }

                    const {subIndex: oldSubIndex} = getPageItemById(subPage, item.id)
                    if (oldSubIndex === -1) {
                        newSubPage = filterTabByIds(
                            cloneDeep(subPage),
                            addNewGroupTabsIds.filter((id) => id !== item.id)
                        )
                    } else {
                        newSubPage = filterTabByIds(cloneDeep(subPage), addNewGroupTabsIds)
                    }

                    if (newSubPage.length === 0 || !containsId(newSubPage, item.id)) {
                        newSubPage.push(newGroup)
                    } else {
                        const {index, subIndex} = getPageItemById(newSubPage, item.id)
                        if (subIndex === -1) {
                            // 游离页面移动到新建组
                            newSubPage.splice(index, 1, newGroup)
                        } else {
                            newSubPage.push(newGroup)
                        }
                    }

                    onAddGroupsAndThenSort(newGroup, newSubPage, currentTabKey)
                }

                if (currentTabKey === YakitRoute.HTTPFuzzer) {
                    collectLeafNodes(cloneDeep(subPage))
                        .filter((i) => addNewGroupTabsIds.includes(i.id))
                        .forEach((i) => {
                            if (batchAddInfo.groupId === "" || batchAddInfo.groupId !== i.groupId) {
                                onUpdateFuzzerSequenceCacheData(i)
                            }
                        })
                }

                onUpdatePageCache([...newSubPage])
                finish()
            }
        )

        /**将页面添加到新建组 单个 */
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
                            case "editGroup":
                                onEditGroup(group)
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
        /**编辑组合 */
        const onEditGroup = useMemoizedFn((group: MultipleNodeInfo) => {
            const groupChildren = (group.groupChildren || []).map((ele) => ({
                ...ele,
                pageParams: undefined
            }))
            const m = showYakitModal({
                title: "编辑组",
                footer: null,
                content: (
                    <BatchEditGroup
                        groupName={group.verbose}
                        groupChildren={groupChildren}
                        tabList={collectLeafNodes(subPage)}
                        onFinish={(l) =>
                            onEditGroupSave(group, l, () => {
                                m.destroy()
                            })
                        }
                        onCancel={() => {
                            m.destroy()
                        }}
                    ></BatchEditGroup>
                )
            })
        })

        const onEditGroupSave = useMemoizedFn(
            (group: MultipleNodeInfo, list: MultipleNodeInfo[], callback: () => void) => {
                const {index} = getPageItemById(subPage, group.id)
                if (index === -1) return
                let newSubPage: MultipleNodeInfo[] = []
                if (list.length === 0) {
                    // 清空该组,页面游离
                    newSubPage = subPage.filter((ele) => ele.id !== group.id)
                    newSubPage.splice(index, 0, ...(group.groupChildren || []))
                } else {
                    const ids = list.map((ele) => ele.id)
                    const length = subPage.length
                    for (let i = 0; i < length; i++) {
                        let current: MultipleNodeInfo = subPage[i]
                        if (current.id === group.id) {
                            current = {
                                ...current,
                                groupChildren: list
                            }
                            const deletedItems = getDeletedItems(group.groupChildren || [], list).reverse()
                            newSubPage.push(current)
                            newSubPage.splice(newSubPage.length, 0, ...(deletedItems || []))
                            continue
                        }
                        if (ids.includes(current.id)) continue
                        let groupChildren: MultipleNodeInfo[] = []
                        const childrenLength = current.groupChildren?.length || 0
                        if (childrenLength) {
                            groupChildren = current.groupChildren?.filter((ele) => !ids.includes(ele.id)) || []
                        }

                        if (childrenLength && groupChildren.length === 0) continue
                        current.groupChildren = groupChildren
                        newSubPage.push(current)
                    }
                }
                onUpdatePageCache(newSubPage)
                onUpdateSorting(newSubPage, currentTabKey)
                callback()
            }
        )
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
                    const initIndex = total >= secondaryTabsNumRef.current ? index - 1 : index + 1
                    // 因为限制secondaryTabsNumRef.current个，如果该组为最后一个，就选中上一个可选item
                    for (
                        let i = initIndex;
                        total >= secondaryTabsNumRef.current ? i > 0 : i < sLength + 1;
                        total >= secondaryTabsNumRef.current ? i-- : i++
                    ) {
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
            () => {
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
        const onRetract = useMemoizedFn(() => {
            setIsExpand(false)
            setTimeout(() => {
                // 组的key绑定的groupId，id只会在页面的节点上
                const data = `[data-rfd-draggable-id="${selectSubMenu.id}"]`
                const selectElement = document.querySelector(data)
                const position = !!selectElement?.getClientRects().length ? selectElement?.getClientRects()[0] : null
                if (!!position) {
                    tabMenuSubRef.current.scrollLeft = position.left - 60
                }
            }, 20)
        })
        const onExpand = useMemoizedFn(() => {
            const newSubPage = subPage.map((ele) => (ele.id.endsWith("group") ? {...ele, expand: true} : ele))
            onUpdatePageCache(newSubPage)
            updateGroupExpandOrRetract(currentTabKey, true)
            setTimeout(() => {
                setIsExpand(true)
            }, 20)
        })
        /**当滚动条出现的时候才显示展开收起icon */
        const isShowExpandIcon = useCreation(() => {
            return scroll.scrollLeft > 0 || scroll.scrollRight > 0
        }, [scroll.scrollLeft, scroll.scrollRight])
        const isWebFuzzerRoute = useCreation(() => {
            return currentTabKey === YakitRoute.HTTPFuzzer
        }, [currentTabKey])
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
                                        [styles["outline-chevron-double-display-none"]]:
                                            scroll.scrollLeft <= 0 || isExpand
                                    })}
                                    ref={scrollLeftIconRef}
                                >
                                    <OutlineChevrondoubleleftIcon />
                                </div>
                                <div
                                    className={classNames(styles["tab-menu-sub"], {
                                        [styles["tab-menu-sub-width"]]: pageItem.hideAdd === true,
                                        [styles["tab-menu-sub-maxWidth-64"]]: isWebFuzzerRoute, // WF页面二级菜单的默认占位最大宽度
                                        [styles["tab-menu-sub-maxWidth-64"]]: isShowExpandIcon && !isWebFuzzerRoute, // 除了WF页面，其他多开页面二级菜单展开后占位最大宽度
                                        [styles["tab-menu-sub-maxWidth-96"]]: isShowExpandIcon && isWebFuzzerRoute, // WF页面二级菜单展开后占位最大宽度
                                        [styles["tab-menu-sub-expand"]]: isExpand
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
                                                        onShowRenameModal={onShowRenameModal}
                                                        onUnfoldAndCollapse={onUnfoldAndCollapse}
                                                        onGroupContextMenu={onGroupRightClickOperation}
                                                        dropType={subDropType}
                                                        isDragDisabled={isExpand}
                                                        currentTabKey={currentTabKey}
                                                    />
                                                </React.Fragment>
                                            )
                                        }
                                        const isCombine = combineIds.findIndex((ele) => ele === item.id) !== -1
                                        return (
                                            <React.Fragment key={item.id}>
                                                <SubTabItem
                                                    subItem={item}
                                                    index={indexSub}
                                                    selectSubMenu={selectSubMenu}
                                                    setSelectSubMenu={setSelectSubMenu}
                                                    onRemoveSub={onRemoveSubPage}
                                                    onContextMenu={onRightClickOperation}
                                                    onShowRenameModal={onShowRenameModal}
                                                    combineColor={isCombine ? combineColorRef.current : ""}
                                                    isDragDisabled={isExpand}
                                                    currentTabKey={currentTabKey}
                                                />
                                            </React.Fragment>
                                        )
                                    })}
                                    {provided.placeholder}
                                </div>
                                <div
                                    className={classNames(styles["outline-chevron-double-right"], {
                                        [styles["outline-chevron-double-display-none"]]:
                                            scroll.scrollRight <= 0 || isExpand,
                                        [styles["outline-chevron-double-right-wf"]]: isWebFuzzerRoute
                                    })}
                                    ref={scrollRightIconRef}
                                >
                                    <OutlineChevrondoublerightIcon />
                                </div>
                                <div
                                    className={classNames(styles["extra-operate"], {
                                        [styles["extra-operate-expand"]]: isExpand
                                    })}
                                >
                                    {isExpand ? (
                                        <OutlineSortascendingIcon
                                            className={styles["extra-operate-icon"]}
                                            onClick={onRetract}
                                        />
                                    ) : (
                                        isShowExpandIcon && (
                                            <OutlineSortdescendingIcon
                                                className={styles["extra-operate-icon"]}
                                                onClick={onExpand}
                                            />
                                        )
                                    )}
                                    {isWebFuzzerRoute && (
                                        <Tooltip title={t("MainOperatorContent.SubTabs.save_webfuzzer_history")} placement={isExpand ? "left" : "top"}>
                                            <OutlineStoreIcon
                                                className={styles["extra-operate-icon"]}
                                                onClick={() => onSaveHistory(currentTabKey)}
                                            />
                                        </Tooltip>
                                    )}

                                    {pageItem.hideAdd !== true && (
                                        <OutlinePlusIcon
                                            className={styles["extra-operate-icon"]}
                                            onClick={() => onAddSubPage()}
                                        />
                                    )}
                                </div>
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
    const {
        subItem,
        isDragDisabled,
        index,
        selectSubMenu,
        setSelectSubMenu,
        onRemoveSub,
        onContextMenu,
        onShowRenameModal,
        combineColor,
        currentTabKey
    } = props
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
        <Draggable key={subItem.id} draggableId={subItem.id} index={index} isDragDisabled={isDragDisabled}>
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
                            [styles[`tab-menu-sub-item-${tabStatus}`]]: !!tabStatus,
                            [styles[`tab-menu-sub-item-disable-drag`]]: !!isDragDisabled
                        })}
                        onClick={() => {
                            setSelectSubMenu({...subItem})
                        }}
                        onContextMenu={(e) => onContextMenu(e, subItem)}
                        onDoubleClick={() => onShowRenameModal(subItem)}
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
                                    <span className='content-ellipsis'>{subItem.verbose || ""}</span>
                                </div>
                                {!(defaultFixedTabsNoSinglPageRoute.includes(currentTabKey) && index === 0) && (
                                    <RemoveIcon
                                        className={classNames(styles["remove-icon"], {
                                            [styles["remove-show-icon"]]: isActive
                                        })}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRemoveSub(subItem)
                                        }}
                                    />
                                )}
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
        onShowRenameModal,
        onUnfoldAndCollapse,
        onGroupContextMenu,
        dropType,
        isDragDisabled,
        currentTabKey
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
    const onGroupClick = useMemoizedFn((e) => {
        if (isDragDisabled) return
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
    })
    return (
        <Draggable key={subItem.id} draggableId={subItem.id} index={index} isDragDisabled={isDragDisabled}>
            {(providedGroup, snapshotGroup) => {
                const groupStyle = getGroupItemStyle(snapshotGroup, providedGroup.draggableProps.style)
                return (
                    <div
                        ref={providedGroup.innerRef}
                        {...providedGroup.draggableProps}
                        style={{...groupStyle}}
                        className={classNames(styles["tab-menu-sub-group"], styles["tab-menu-sub-group-hidden"], {
                            [styles[`tab-menu-sub-group-${color}`]]: subItem.expand,
                            [styles[`tab-menu-sub-group-disable-drag`]]: isDragDisabled
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
                            onClick={onGroupClick}
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
                                                    index={index}
                                                    selectSubMenu={selectSubMenu}
                                                    setSelectSubMenu={setSelectSubMenu}
                                                    onRemoveSub={onRemoveSub}
                                                    onContextMenu={onContextMenu}
                                                    onShowRenameModal={onShowRenameModal}
                                                    combineColor={color}
                                                    isDragDisabled={isDragDisabled}
                                                    currentTabKey={currentTabKey}
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
    const menu = useCreation(() => {
        return [
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
            },
            {
                label: "编辑组合",
                key: "editGroup"
            }
        ]
    }, [])

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
                            {group.color === color && (
                                <CheckIcon className={classNames(styles["check-icon"], `color-text-${color}`)} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <YakitMenu
                type='grey'
                width={232}
                data={menu}
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

/**
 * @name 判断页面关闭时的确认弹框是方法还是配置对象
 */
const judgeDataIsFuncOrSettingForConfirm = async (
    data: SubscribeCloseType,
    showHint: (info: YakitSecondaryConfirmProps) => void,
    hiddenHint: () => void
) => {
    if (typeof data === "function") {
        const setting = await data()
        if (setting) {
            showHint(setting)
        } else {
            hiddenHint()
        }
    } else {
        showHint(data)
    }
}

// 多开页面的一级页面关闭的确认弹窗
const onModalSecondaryConfirm = (props?: YakitSecondaryConfirmProps, visibleRef?: React.MutableRefObject<boolean>, route?: YakitRoute) => {
    if (visibleRef) visibleRef.current = true
    let m = YakitModalConfirm({
        width: 420,
        type: "white",
        onCancelText: "不保存",
        onOkText: "保存",
        keyboard: false,
        zIndex: 1010,
        onCloseX: () => {
            m.destroy()
        },
        footerStyle: {padding: "0 24px 24px"},
        footer: undefined,
        ...(props || {}),
        onOk: () => {
            if (visibleRef) {
                visibleRef.current = false
            }
            if(route){
                keepSearchNameMapStore.removeKeepSearchRouteNameMap(route)
            }
            if (props?.onOk) {
                props.onOk(m)
            } else {
                m.destroy()
            }
        },
        onCancel: () => {
            if (visibleRef) {
                visibleRef.current = false
            }
            if (props?.onCancel) {
                props?.onCancel(m)
            } else {
                m.destroy()
            }
        },
        content: props?.content
    })
    props?.getModal?.(m)
    return m
}
