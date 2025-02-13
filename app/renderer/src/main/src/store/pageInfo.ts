import {AdvancedConfigValueProps} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {YakitRoute} from "@/enums/yakitRoute"
import {subscribeWithSelector, persist, StorageValue} from "zustand/middleware"
import debounce from "lodash/debounce"
import {AdvancedConfigShowProps} from "@/pages/fuzzer/HTTPFuzzerPage"
import {yakitNotify} from "@/utils/notification"
import {RemoteGV} from "@/yakitGV"
import {setRemoteProjectValue} from "@/utils/kv"
import cloneDeep from "lodash/cloneDeep"
import {createWithEqualityFn} from "zustand/traditional"
import {HybridScanControlAfterRequest, HybridScanModeType} from "@/models/HybridScan"
import {defaultAdvancedConfigValue, defaultPostTemplate} from "@/defaultConstants/HTTPFuzzerPage"
import {PluginSourceType} from "@/pages/pluginHub/type"
import {FuzzerRemoteGV} from "@/enums/fuzzer"
import {SyntaxFlowScanModeType} from "@/pages/yakRunnerCodeScan/YakRunnerCodeScanType"

/**
 * @description 页面暂存数据
 * @property {PageNodeItemProps[]} pageNodeList 页面的一些信息
 * @property {string} routeKey 路由
 * @property {boolean} singleNode 是否为单开页面,单开页面的逻辑暂时没有写
 */
export interface PageProps {
    pageList: PageNodeItemProps[]
    routeKey: string
    singleNode: boolean
    currentSelectPageId: string
}

export interface PageNodeItemProps {
    id: string
    routeKey: string
    pageGroupId: string
    pageId: string
    pageName: string
    pageParamsInfo: PageParamsInfoProps
    sortFieId: number
    expand?: boolean
    color?: string
    // pageChildrenList: PageNodeItemProps[]
}

/** 页面保存的数据*/
interface PageParamsInfoProps {
    /** YakitRoute.HTTPFuzzer webFuzzer页面缓存数据 */
    webFuzzerPageInfo?: WebFuzzerPageInfoProps
    /**批量执行页面 */
    pluginBatchExecutorPageInfo?: PluginBatchExecutorPageInfoProps
    /**专项漏洞页面 */
    pocPageInfo?: PocPageInfoProps
    /**弱口令页面 */
    brutePageInfo?: BrutePageInfoProps
    /**端口扫描页面 */
    scanPortPageInfo?: ScanPortPageInfoProps
    /**空间引擎页面 */
    spaceEnginePageInfo?: SpaceEnginePageInfoProps
    /**简易版 安全检测页面 */
    simpleDetectPageInfo?: SimpleDetectPageInfoProps
    /**webSocketFuzzer页面 */
    websocketFuzzerPageInfo?: WebsocketFuzzerPageInfoProps
    /**新建插件页面 */
    addYakitScriptPageInfo?: AddYakitScriptPageInfoProps
    /**打开插件仓库页面 */
    pluginHubPageInfo?: PluginHubPageInfoProps
    /**新建漏洞与风险统计页面 */
    riskPageInfo?: RiskPageInfoProps
    hTTPHackerPageInfo?: HTTPHackerPageInfoProps
    auditCodePageInfo?: AuditCodePageInfoProps
    codeScanPageInfo?: CodeScanPageInfoProps
    /**记事本编辑页面 */
    modifyNotepadPageInfo?: ModifyNotepadPageInfoProps
}

export interface AddYakitScriptPageInfoProps {
    /**插件类型 */
    pluginType: string
    /**插件源码 */
    code: string
    source: YakitRoute
    [key: string]: any
}
export interface SpaceEnginePageInfoProps {}

export interface SimpleDetectPageInfoProps {
    /**执行批量执行的runtimeId */
    runtimeId: string
}
export interface WebsocketFuzzerPageInfoProps {
    wsTls?: boolean
    wsRequest?: Uint8Array
    wsToServer?: Uint8Array
}
export interface PluginBatchExecutorPageInfoProps {
    /**执行批量执行的runtimeId */
    runtimeId: string
    /**批量执行结果的默认选中的tab默认值 */
    defaultActiveKey: string
    /**是否为https */
    https: boolean
    /**选中的数据History id */
    httpFlowIds: []
    /**请求包 */
    request: Uint8Array
    /**执行任务的状态 */
    hybridScanMode: HybridScanModeType
}
export interface WebFuzzerPageInfoProps {
    pageId: string
    advancedConfigValue: AdvancedConfigValueProps
    request: string
    advancedConfigShow?: AdvancedConfigShowProps | null
    //高级配置中变量的二级Panel 展开项
    variableActiveKeys?: string[]
    // 热加载代码
    hotPatchCode: string
}

export interface PocPageInfoProps {
    /** type 1会打开漏洞检测类型选择  2直接带着数据打开poc页面*/
    type?: number
    /**按组搜的选中 */
    selectGroup?: string[]
    /**按关键字搜的选中/poc内置组*/
    selectGroupListByKeyWord?: string[]
    formValue?: HybridScanControlAfterRequest
    /**是否为https */
    https: boolean
    /**选中的数据History id */
    httpFlowIds: []
    /**请求包 */
    request: Uint8Array
    /**执行批量执行的runtimeId */
    runtimeId: string
    /**执行任务的状态 */
    hybridScanMode: HybridScanModeType
    /**按关键词搜索的列表，搜索框的默认值, */
    defGroupKeywords?: string
}

export interface BrutePageInfoProps {
    /**输入目标 */
    targets: string
}

export interface ScanPortPageInfoProps {
    /**输入目标 */
    targets: string
}

export interface PluginHubPageInfoProps {
    /**切换到插件仓库指定tab */
    tabActive: PluginSourceType
    /**
     * @param uuid 打开插件的uuid
     * @param name 打开插件的name
     * @param tabActive 主动跳到详情里的指定 tab 上
     * @description tabActive-如果想打开指定 tab 页面里的指定子 tab，可以使用'/'进行分割，例如：'log/check'，log是主tab，check是子tab
     */
    detailInfo?: {uuid: string; name: string; tabActive?: string; isCorePlugin?: boolean}
    /**是否刷新列表(传 true-刷新列表和高级筛选, false-刷新列表, 不传不刷新) */
    refeshList?: boolean
    /**是否打开管理分组抽屉 */
    openGroupDrawer?: boolean
}

export interface RiskPageInfoProps {
    /**漏洞危险等级 */
    SeverityList?: string[]
}
interface ImmediatelyLaunchedInfo {
    host: string
    port: string
    enableInitialPlugin: boolean
}
export interface HTTPHackerPageInfoProps {
    immediatelyLaunchedInfo?: ImmediatelyLaunchedInfo
}

export interface AuditCodePageInfoProps {
    Schema: string
    // 基础路径 / 由Path、Variable、Value组成完整路径信息
    Path: string
    Variable?: string
    Value?: string
    // 正常操作查询
    Location: string
    Query?: {Key: string; Value: number}[]
}

export interface CodeScanPageInfoProps {
    projectName?: string[]
    selectGroupListByKeyWord?: string[]
    codeScanMode?: SyntaxFlowScanModeType
    runtimeId?: string
}

export interface ModifyNotepadPageInfoProps {
    /**笔记本 hash */
    notepadHash?: string
    /**笔记本标题 */
    title?: string
}
interface PageInfoStoreProps {
    pages: Map<string, PageProps>

    selectGroupId: Map<string, string>

    currentPageTabRouteKey: YakitRoute | string

    /**设置 pages数据，例如：fuzzer缓存页面；未分组的关闭其他页面只保留当前页面*/
    setPagesData: (key: string, p: PageProps) => void
    /**设置组内的数据，例如:组内的关闭其他页面 */
    setPageNodeInfoByPageGroupId: (key, gId: string, list: PageNodeItemProps[]) => void

    /**通过组的id获取组下的页面数据 */
    getPagesDataByGroupId: (key: string, gId: string) => PageNodeItemProps[]
    /**通过id获取页面数据 */
    queryPagesDataById: (key: string, pageId: string) => PageNodeItemProps | undefined
    /**新增缓存页面数据 */
    addPagesDataCache: (key: string, v: PageNodeItemProps) => void
    /**更新缓存页面数据 */
    updatePagesDataCacheById: (key: string, v: PageNodeItemProps) => void
    /** 删除页面缓存数据*/
    removePagesDataCacheById: (key: string, id: string) => void
    /** 通过组id 删除组数据以及组下的页面缓存数据 */
    removePagesDataCacheByGroupId: (key: string, gId: string) => void

    /**设置页面中选中的组id */
    setSelectGroupId: (key: string, s: string) => void
    /**删除选中组 */
    removeCurrentSelectGroupId: (key: string) => void

    /**获取当前选中组内的tab名称 返回string[] */
    getCurrentGroupAllTabName: (key) => string[]
    /**获取当前选中组*/
    getCurrentSelectGroup: (key) => PageNodeItemProps | undefined
    clearAllData: () => void
    clearDataByRoute: (key: string) => void
    /**只保留routeKey的数据，删除除此routeKey之外的数据 */
    clearOtherDataByRoute: (routeKey: string) => void
    /** 设置当前激活的页面id */
    setCurrentSelectPageId: (routeKey: string, pageId: string) => void
    /** 获取当前激活的页面id */
    getCurrentSelectPageId: (routeKey: string) => string
    /** 通过 RuntimeId 获取页面数据 【批量执行/安全检测(简易版)】 */
    getPageInfoByRuntimeId: (routeKey: string, pageId: string) => PageNodeItemProps | undefined
    /**展开或者收起所有的组 isExpand:true展开/false收起*/
    updateGroupExpandOrRetract: (routeKey: string, isExpand: boolean) => void
    
    setCurrentPageTabRouteKey: (route: YakitRoute | string) => void
    getCurrentPageTabRouteKey: () => YakitRoute | string
}
export const defPage: PageProps = {
    pageList: [],
    routeKey: "",
    singleNode: false,
    currentSelectPageId: ""
}
const pageInfoToRuntimeIdMap = {
    [YakitRoute.BatchExecutorPage]: "pluginBatchExecutorPageInfo",
    [YakitRoute.SimpleDetect]: "simpleDetectPageInfo",
    [YakitRoute.PoC]: "pocPageInfo",
    [YakitRoute.YakRunner_Code_Scan]: "codeScanPageInfo"
}
export const usePageInfo = createWithEqualityFn<PageInfoStoreProps>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                pages: new Map(),
                selectGroupId: new Map(),
                currentPageTabRouteKey: "",

                setPagesData: (key, values) => {
                    const newVal = new Map(get().pages).set(key, values)
                    set({
                        ...get(),
                        pages: newVal
                    })
                },
                setPageNodeInfoByPageGroupId: (key, groupId, list) => {
                    const newVal = get().pages
                    const current = newVal.get(key) || cloneDeep(defPage)
                    const groupList: PageNodeItemProps[] = current.pageList.filter((ele) => ele.pageGroupId !== groupId)
                    const newGroupList = groupList.concat(list)
                    newVal.set(key, {
                        ...current,
                        pageList: newGroupList
                    })
                    set({
                        ...get(),
                        pages: newVal
                    })
                },
                getPagesDataByGroupId: (key, groupId) => {
                    const {pages} = get()
                    const current = pages.get(key) || cloneDeep(defPage)
                    return current.pageList.filter((ele) => ele.pageGroupId === groupId)
                },
                queryPagesDataById: (key, pageId) => {
                    const {pages} = get()
                    const current = pages.get(key) || cloneDeep(defPage)
                    return current.pageList.find((ele) => ele.pageId === pageId)
                },
                getPageInfoByRuntimeId: (routeKey, runtimeId) => {
                    const {pages} = get()
                    const current = pages.get(routeKey) || cloneDeep(defPage)
                    return current.pageList.find(
                        (ele) => ele?.pageParamsInfo[pageInfoToRuntimeIdMap[routeKey]]?.runtimeId === runtimeId
                    )
                },
                addPagesDataCache: (key, value) => {
                    const newVal = get().pages
                    const current = newVal.get(key) || cloneDeep(defPage)
                    current.pageList.push(value)
                    newVal.set(key, {
                        ...current
                    })
                    set({
                        ...get(),
                        pages: new Map(newVal)
                    })
                },
                updatePagesDataCacheById: (key, value) => {
                    const {pages} = get()
                    const current: PageProps = pages.get(key) || cloneDeep(defPage)
                    let updateIndex: number = current.pageList.findIndex((ele) => ele.pageId === value.pageId)
                    if (updateIndex !== -1) {
                        current.pageList[updateIndex] = {
                            ...value
                        }
                        const newVal = pages.set(key, {
                            ...current
                        })
                        set({
                            ...get(),
                            pages: newVal
                        })
                    }
                },
                removePagesDataCacheById: (key, id) => {
                    const newVal = get().pages
                    const current: PageProps = newVal.get(key) || cloneDeep(defPage)
                    const newPageList = current.pageList.filter((ele) => ele.pageId !== id)
                    newVal.set(key, {
                        ...current,
                        pageList: newPageList
                    })
                    set({
                        ...get(),
                        pages: newVal
                    })
                },
                removePagesDataCacheByGroupId: (key, gId) => {
                    const newVal = get().pages
                    const current: PageProps = newVal.get(key) || cloneDeep(defPage)
                    const newPageList = current.pageList.filter((ele) => ele.pageGroupId !== gId)
                    newVal.set(key, {
                        ...current,
                        pageList: newPageList
                    })
                    set({
                        ...get(),
                        pages: newVal
                    })
                },
                setCurrentSelectGroup: (key, groupId) => {},
                setSelectGroupId: (key, val) => {
                    const selectGroupId = get().selectGroupId
                    selectGroupId.set(key, val)
                    set({
                        ...get(),
                        selectGroupId
                    })
                },
                removeCurrentSelectGroupId: (key) => {
                    const {selectGroupId} = get()
                    if (selectGroupId.size > 0) {
                        selectGroupId.delete(key)
                        set({
                            ...get(),
                            selectGroupId
                        })
                    }
                },
                getCurrentGroupAllTabName: (key) => {
                    const {selectGroupId, pages} = get()
                    const currentGroupId = selectGroupId.get(key)
                    const currentPages: PageProps = pages.get(key) || cloneDeep(defPage)
                    return currentPages.pageList
                        .filter((ele) => ele.pageGroupId === currentGroupId)
                        .map((ele) => ele.pageName)
                },
                getCurrentSelectGroup: (key) => {
                    const {selectGroupId, pages} = get()
                    const currentGroupId = selectGroupId.get(key)
                    const currentPages: PageProps = pages.get(key) || cloneDeep(defPage)
                    return currentPages.pageList.find((ele) => ele.pageGroupId === currentGroupId)
                },
                clearAllData: () => {
                    set({
                        pages: new Map(),
                        selectGroupId: new Map()
                    })
                },
                clearDataByRoute: (key) => {
                    const {selectGroupId, pages} = get()
                    selectGroupId.delete(key)
                    pages.delete(key)
                    set({
                        pages: new Map(pages),
                        selectGroupId: new Map(selectGroupId)
                    })
                },
                clearOtherDataByRoute: (key) => {
                    const {selectGroupId, pages} = get()
                    const newSelectGroupId = selectGroupId.get(key)
                    const newPages = pages.get(key)
                    set({
                        pages: new Map().set(key, newPages),
                        selectGroupId: new Map().set(key, newSelectGroupId)
                    })
                },
                setCurrentSelectPageId: (key, pageId) => {
                    const newPages = get().pages
                    const currentPage = newPages.get(key) || cloneDeep(defPage)
                    newPages.set(key, {
                        ...currentPage,
                        currentSelectPageId: pageId
                    })
                    set({
                        ...get(),
                        pages: newPages
                    })
                },
                getCurrentSelectPageId: (key) => {
                    const {pages} = get()
                    const current = pages.get(key) || cloneDeep(defPage)
                    return current.currentSelectPageId
                },
                updateGroupExpandOrRetract: (key, isExpand) => {
                    const newPages = get().pages
                    const currentPage = newPages.get(key) || cloneDeep(defPage)
                    const newPageList = currentPage.pageList.map((ele) => {
                        if (ele.pageId.endsWith("group")) {
                            return {
                                ...ele,
                                expand: true
                            }
                        }
                        return ele
                    })
                    newPages.set(key, {
                        ...currentPage,
                        pageList: newPageList
                    })
                    set({
                        ...get(),
                        pages: newPages
                    })
                },
                setCurrentPageTabRouteKey: (route: YakitRoute | string) => {
                    set({
                        ...get(),
                        currentPageTabRouteKey: route
                    })
                },
                getCurrentPageTabRouteKey: () => {
                    const {currentPageTabRouteKey} = get()
                    return currentPageTabRouteKey
                }
            }),
            {
                name: "page-info",
                storage: {
                    getItem: async (name: string) => {
                        try {
                            const str = sessionStorage.getItem(name)
                            if (!str) return null
                            const {state} = JSON.parse(str)
                            return {
                                state: {
                                    ...state,
                                    pages: new Map(state.pages),
                                    selectGroupId: new Map(state.selectGroupId)
                                }
                            }
                        } catch (error) {
                            yakitNotify("error", "page-info解析数据错误:" + error)
                            return null
                        }
                    },
                    setItem: async (name, value: StorageValue<PageInfoStoreProps>) => {
                        const str = JSON.stringify({
                            state: {
                                ...value.state,
                                pages: Array.from(value.state.pages.entries()),
                                selectGroupId: Array.from(value.state.selectGroupId.entries())
                            }
                        })
                        sessionStorage.setItem(name, str)
                    },
                    removeItem: async (name: string): Promise<void> => {
                        sessionStorage.removeItem(name)
                    }
                }
            }
        )
    ),
    Object.is
)

export const saveFuzzerCache = debounce(
    (selectedState: PageProps) => {
        try {
            const {pageList = []} = selectedState || {
                pageList: []
            }
            const cache = getFuzzerProcessedCacheData(pageList)
            setRemoteProjectValue(FuzzerRemoteGV.FuzzerCache, JSON.stringify(cache)).catch((error) => {})
        } catch (error) {
            yakitNotify("error", "webFuzzer缓存数据失败:" + error)
        }
    },
    500,
    {leading: true}
)

/**处理WF需要缓存的数据 */
export const getFuzzerProcessedCacheData = (pageList) => {
    const cache = pageList.map((ele) => {
        const advancedConfigValue =
            ele.pageParamsInfo?.webFuzzerPageInfo?.advancedConfigValue || defaultAdvancedConfigValue
        const hotPatchCode = ele.pageParamsInfo?.webFuzzerPageInfo?.hotPatchCode
        return {
            groupChildren: [],
            groupId: ele.pageGroupId,
            id: ele.pageId,
            pageParams: {
                actualHost: advancedConfigValue.actualHost || "",
                id: ele.pageId,
                isHttps: advancedConfigValue.isHttps,
                request: ele.pageParamsInfo?.webFuzzerPageInfo?.request || defaultPostTemplate,
                params: advancedConfigValue.params,
                extractors: advancedConfigValue.extractors,
                matchers: advancedConfigValue.matchers,
                repeatTimes: advancedConfigValue.repeatTimes,
                concurrent: advancedConfigValue.concurrent,
                minDelaySeconds: advancedConfigValue.minDelaySeconds,
                maxDelaySeconds: advancedConfigValue.maxDelaySeconds,
                hotPatchCode: hotPatchCode
            },
            sortFieId: ele.sortFieId,
            verbose: ele.pageName,
            expand: ele.expand,
            color: ele.color
        }
    })
    return cache
}
