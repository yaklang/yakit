import {AdvancedConfigValueProps} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {YakitRoute} from "@/routes/newRoute"
import {subscribeWithSelector, persist, StorageValue} from "zustand/middleware"
import debounce from "lodash/debounce"
import {defaultAdvancedConfigValue, defaultPostTemplate} from "@/pages/fuzzer/HTTPFuzzerPage"
import {yakitNotify} from "@/utils/notification"
import {RemoteGV} from "@/yakitGV"
import {setRemoteProjectValue} from "@/utils/kv"
import cloneDeep from "lodash/cloneDeep"
import {createWithEqualityFn} from "zustand/traditional"

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
    pluginInfoEditor?: {source: YakitRoute}
    /** YakitRoute.Plugin_Local 本地插件页面缓存数据 */
    pluginLocalPageInfo?: {uuid: string}
    /**YakitRoute.Plugin_Store 插件商店页面 */
    pluginOnlinePageInfo?: {keyword: string; plugin_type: string}
    pluginBatchExecutorPageInfo?: PluginBatchExecutorPageInfoProps
}

export interface PluginBatchExecutorPageInfoProps {
    /**执行批量执行的runtimeId */
    runtimeId: string
    /**批量执行结果的默认选中的tab默认值 */
    defaultActiveKey: string
}
export interface WebFuzzerPageInfoProps {
    pageId: string
    advancedConfigValue: AdvancedConfigValueProps
    request: string
}

interface PageInfoStoreProps {
    pages: Map<string, PageProps>

    selectGroupId: Map<string, string>

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
}
const defPage: PageProps = {
    pageList: [],
    routeKey: "",
    singleNode: false
}
export const usePageInfo = createWithEqualityFn<PageInfoStoreProps>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                pages: new Map(),
                selectGroupId: new Map(),
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
try {
    /**
     *  @description 打开软化后这个订阅会一直存在，直到关闭软件;后续再看看优化方法
     */
    const unFuzzerCacheData = usePageInfo.subscribe(
        // (state) => state.pages.get(YakitRoute.HTTPFuzzer) || [],
        (state) => state.pages.get("httpFuzzer") || [], // 因为循环引用导致开发环境热加载YakitRoute.HTTPFuzzer为undefined
        (selectedState, previousSelectedState) => {
            saveFuzzerCache(selectedState)
        }
    )

    const saveFuzzerCache = debounce(
        (selectedState: PageProps) => {
            try {
                const {pageList = []} = selectedState || {
                    pageList: []
                }
                const cache = pageList.map((ele) => {
                    const advancedConfigValue =
                        ele.pageParamsInfo?.webFuzzerPageInfo?.advancedConfigValue || defaultAdvancedConfigValue
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
                            extractors: advancedConfigValue.extractors
                        },
                        sortFieId: ele.sortFieId,
                        verbose: ele.pageName,
                        expand: ele.expand,
                        color: ele.color
                    }
                })
                // console.log("saveFuzzerCache", cache)
                // console.table(pageList)
                setRemoteProjectValue(RemoteGV.FuzzerCache, JSON.stringify(cache)).catch((error) => {})
            } catch (error) {
                yakitNotify("error", "webFuzzer缓存数据失败:" + error)
            }
        },
        500,
        {leading: true}
    )
} catch (error) {
    yakitNotify("error", "page-info缓存数据错误:" + error)
}
