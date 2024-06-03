import React, {useState, useRef, useMemo, useEffect, useReducer} from "react"
import {
    ExportParamsProps,
    LocalExtraOperateProps,
    PluginGroupList,
    PluginLocalBackProps,
    PluginsLocalProps
} from "./PluginsLocalType"
import {SolidChevrondownIcon, SolidPluscircleIcon} from "@/assets/icon/solid"
import {useMemoizedFn, useInViewport, useDebounceFn, useLatest, useUpdateEffect, useThrottleFn} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {PluginsLayout, PluginsContainer} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {
    TypeSelect,
    FuncSearch,
    FuncBtn,
    PluginsList,
    FuncFilterPopover,
    ListShowContainer,
    GridLayoutOpt,
    ListLayoutOpt
} from "../funcTemplate"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {
    OutlineClouduploadIcon,
    OutlineExportIcon,
    OutlinePlusIcon,
    OutlineRefreshIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useStore} from "@/store"
import {PluginsLocalDetail} from "./PluginsLocalDetail"
import {initialLocalState, pluginLocalReducer} from "../pluginReducer"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {TypeSelectOpt} from "../funcTemplateType"
import {API} from "@/services/swagger/resposeType"
import {Tooltip} from "antd"
import {LoadingOutlined} from "@ant-design/icons"
import {
    DeleteLocalPluginsByWhereRequestProps,
    DeleteYakScriptRequestByIdsProps,
    apiDeleteLocalPluginsByWhere,
    apiDeleteYakScriptByIds,
    apiFetchGroupStatisticsLocal,
    apiGetYakScriptByOnlineID,
    apiQueryYakScript,
    apiQueryYakScriptByYakScriptName,
    apiQueryYakScriptTotal,
    convertDeleteLocalPluginsByWhereRequestParams,
    convertLocalPluginsRequestParams,
    excludeNoExistfilter,
    onToEditPlugin
} from "../utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import emiter from "@/utils/eventBus/eventBus"
import {PluginLocalUpload, PluginLocalUploadSingle} from "./PluginLocalUpload"
import {YakitRoute} from "@/enums/yakitRoute"
import {DefaultTypeList, PluginGV, defaultFilter, defaultSearch} from "../builtInData"
import {RemoteGV} from "@/yakitGV"
import {randomString} from "@/utils/randomUtil"
import usePluginUploadHooks, {SaveYakScriptToOnlineRequest} from "../pluginUploadHooks"
import {shallow} from "zustand/shallow"
import {usePageInfo} from "@/store/pageInfo"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import {SavePluginInfoSignalProps} from "../editDetails/PluginEditDetails"
import "../plugins.scss"
import styles from "./PluginsLocal.module.scss"
import {PluginLocalExport} from "./PluginLocalExportProps"

const {ipcRenderer} = window.require("electron")

const initExportLocalParams: ExportParamsProps = {
    OutputDir: "",
    YakScriptIds: [],
    Keywords: "",
    Type: "",
    UserName: "",
    Tags: ""
}

export const PluginsLocal: React.FC<PluginsLocalProps> = React.memo((props) => {
    // 获取插件列表数据-相关逻辑
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(false)

    const [plugin, setPlugin] = useState<YakScript>()
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)
    const [initTotal, setInitTotal] = useState<number>(0)
    const [hasMore, setHasMore] = useState<boolean>(true)

    const [showFilter, setShowFilter] = useState<boolean>(true)
    const [removeLoading, setRemoveLoading] = useState<boolean>(false)

    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<YakScript[]>([])

    const [pluginGroupList, setPluginGroupList] = useState<PluginGroupList[]>([])

    const [pluginRemoveCheck, setPluginRemoveCheck] = useState<boolean>(false)
    const [removeCheckVisible, setRemoveCheckVisible] = useState<boolean>(false)

    const [uploadLoading, setUploadLoading] = useState<boolean>(false) //上传的loading

    const [privateDomain, setPrivateDomain] = useState<string>("") // 私有域地址

    /** 是否为初次加载 */
    const isLoadingRef = useRef<boolean>(true)
    const pluginsLocalRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsLocalRef)
    const removePluginRef = useRef<YakScript>()
    const removePluginDetailRef = useRef<YakScript>()
    const filtersDetailRef = useRef<PluginFilterParams>() // 详情中的filter条件
    const searchDetailRef = useRef<PluginSearchParams>() // 详情中的search条件
    const taskTokenRef = useRef(randomString(40))
    const uploadPluginRef = useRef<YakScript>() //上传暂存的插件数据
    const externalIncomingPluginsRef = useRef<YakScript>() // 1.插件商店/我的插件详情中点击去使用传过来的插件暂存数据 2.新建插件/编辑插件：更新了本地插件数据后，本地列表插件页面需要更新对应的数据

    const latestLoadingRef = useLatest(loading)

    // 判断是否在详情页执行打导入
    const [importInDetail, setImportInDetail] = useState<boolean>(false)

    // 导出本地插件
    const [exportStatusModalVisible, setExportStatusModalVisible] = useState<boolean>(false)
    const [exportParams, setExportParams] = useState<ExportParamsProps>(initExportLocalParams)
    const exportCallbackRef = useRef<() => void>()

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList, response.Total])

    const userInfo = useStore((s) => s.userInfo)
    // 获取筛选栏展示状态
    useEffect(() => {
        getRemoteValue(PluginGV.LocalFilterCloseStatus).then((value: string) => {
            if (value === "true") setShowFilter(true)
            if (value === "false") setShowFilter(false)
        })
        getPrivateDomainAndRefList()
    }, [])
    useEffect(() => {
        emiter.on("onRefLocalPluginList", onRefLocalPluginList)
        emiter.on("savePluginInfoSignal", onRefPlugin)
        emiter.on("onSwitchPrivateDomain", getPrivateDomainAndRefList)
        emiter.on("onImportRefLocalPluginList", onImportRefLocalPluginList)
        return () => {
            emiter.off("onRefLocalPluginList", onRefLocalPluginList)
            emiter.off("savePluginInfoSignal", onRefPlugin)
            emiter.off("onSwitchPrivateDomain", getPrivateDomainAndRefList)
            emiter.off("onImportRefLocalPluginList", onImportRefLocalPluginList)
        }
    }, [])
    useEffect(() => {
        getInitTotal()
        getPluginRemoveCheck()
        getPluginGroupListLocal()
    }, [userInfo.isLogin, inViewport])
    // userInfo.isLogin, filters发生变化的时候触发；初始请求数据在 getPrivateDomainAndRefList
    useUpdateEffect(() => {
        fetchList(true)
    }, [userInfo.isLogin, filters])

    // 当filters过滤条件被其他页面或者意外删掉，插件列表却带了该过滤条件的情况，切换到该页面时需要把被删掉的过滤条件排除
    useEffect(() => {
        const {realFilter, updateFilterFlag} = excludeNoExistfilter(filters, pluginGroupList)
        if (updateFilterFlag) {
            setFilters(realFilter)
        }
    }, [filters, pluginGroupList])

    const {pluginLocalPageData, clearDataByRoute} = usePageInfo(
        (s) => ({
            pluginLocalPageData: s.pages?.get(YakitRoute.Plugin_Local) || {
                pageList: [],
                routeKey: "",
                singleNode: true
            },
            clearDataByRoute: s.clearDataByRoute
        }),
        shallow
    )

    /**获取最新的私有域,并刷新列表 */
    const getPrivateDomainAndRefList = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
            if (setting) {
                const values = JSON.parse(setting)
                setPrivateDomain(values.BaseUrl)
                setTimeout(() => {
                    fetchList(true)
                }, 200)
            }
        })
    })
    /**编辑插件修改后，保存成功后，需要刷新本地列表数据和详情数据 */
    const onRefPlugin = useMemoizedFn((data: string) => {
        try {
            const pluginInfo: SavePluginInfoSignalProps = JSON.parse(data)
            apiQueryYakScriptByYakScriptName({
                pluginName: pluginInfo.pluginName
            }).then((item: YakScript) => {
                const newItem = {...item, isLocalPlugin: privateDomain !== item.OnlineBaseUrl}
                // 本地列表是按更新时间排序的，如果当前列表没有该数据，刷新类别，数据会在第一页第一个
                const index = response.Data.findIndex((ele) => ele.ScriptName === item.ScriptName)
                if (index === -1) {
                    fetchList(true)
                } else {
                    dispatch({
                        type: "update",
                        payload: {
                            item: {...newItem}
                        }
                    })
                }
                if (plugin) {
                    setShowPluginIndex(index)
                    setPlugin({...newItem})
                }
            })
        } catch (error) {}
    })
    const onSetExternalIncomingPluginsRef = useMemoizedFn((item?: YakScript) => {
        externalIncomingPluginsRef.current = item
    })
    /** 传线上的UUID,传入本地详情进行使用 */
    const onJumpToLocalPluginDetailByUUID = useMemoizedFn((uid?: string) => {
        let uuid = uid
        if (!uuid) {
            const pageList = pluginLocalPageData?.pageList || []
            if (pageList.length === 0) return
            uuid = pageList[0].pageParamsInfo?.pluginLocalPageInfo?.uuid || ""
        }
        if (!uuid) return
        apiGetYakScriptByOnlineID({UUID: uuid})
            .then((item) => {
                const index = response.Data.findIndex((ele) => ele.ScriptName === item.ScriptName)
                if (index === -1) {
                    // 不存在，主动塞列表中
                    dispatch({
                        type: "unshift",
                        payload: {
                            item
                        }
                    })
                    setShowPluginIndex(0)
                } else {
                    //存在直接选中跳详情
                    setShowPluginIndex(index)
                }
                onSetExternalIncomingPluginsRef(item)
                setPlugin(item)
            })
            .finally(() => {
                // 查询后，需要清除缓存数据中的uuid，目前只有uuid，所以直接清除该路由的缓存数据
                clearDataByRoute(YakitRoute.Plugin_Local)
            })
    })

    /**上传成功后需要修改列表中的数据 */
    const onUploadSuccess = useMemoizedFn(() => {
        if (uploadPluginRef.current) {
            ipcRenderer
                .invoke("GetYakScriptByName", {Name: uploadPluginRef.current.ScriptName})
                .then((i: YakScript) => {
                    const newItem = {...i, isLocalPlugin: privateDomain !== i.OnlineBaseUrl}
                    dispatch({
                        type: "update",
                        payload: {
                            item: {...newItem}
                        }
                    })
                })
                .catch(() => {
                    fetchList(true)
                    yakitNotify("error", "查询最新的本地数据失败,自动刷新列表")
                })
        }
    })
    const {onStart: onStartUploadPlugin} = usePluginUploadHooks({
        isSingle: true,
        taskToken: taskTokenRef.current,
        onUploadData: () => {},
        onUploadSuccess: onUploadSuccess,
        onUploadEnd: () => {
            setTimeout(() => {
                setUploadLoading(false)
            }, 200)
        },
        onUploadError: () => {
            yakitNotify("error", "上传失败")
        }
    })
    const onRefLocalPluginList = useMemoizedFn(() => {
        setTimeout(() => {
            fetchList(true)
        }, 200)
    })

    // 重置所有条件插件列表查询条件
    const resetAllQueryRefLocalList = () => {
        filtersDetailRef.current = undefined
        searchDetailRef.current = undefined
        setFilters(defaultFilter)
        setSearch(cloneDeep(defaultSearch))
        setTimeout(() => {
            getInitTotal()
            getPluginGroupListLocal()
            fetchList(true)
        }, 200)
    }
    // 导入本地插件非详情页时刷新列表
    const onImportRefLocalPluginList = useMemoizedFn(() => {
        if (!plugin) {
            resetAllQueryRefLocalList()
        } else {
            setImportInDetail(true)
            yakitNotify("success", "成功导入本地插件")
        }
    })

    /**获取插件删除的提醒记录状态 */
    const getPluginRemoveCheck = useMemoizedFn(() => {
        getRemoteValue(PluginGV.LocalPluginRemoveCheck).then((data) => {
            setPluginRemoveCheck(data === "true" ? true : false)
        })
    })

    const getInitTotal = useMemoizedFn(() => {
        apiQueryYakScriptTotal().then((res) => {
            setInitTotal(+res.Total)
        })
    })

    /**获取分组统计列表 */
    const getPluginGroupListLocal = useMemoizedFn(() => {
        apiFetchGroupStatisticsLocal().then((res: API.PluginsSearchResponse) => {
            setPluginGroupList(res.data)
        })
    })

    // 真正查询接口传给后端的参数 主要用于其他地方可能需要查询参数的地方
    const queryFetchList = useRef<QueryYakScriptRequest>()
    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            // if (latestLoadingRef.current) return //先注释，会影响详情的更多加载
            if (reset) {
                isLoadingRef.current = true
                onSetExternalIncomingPluginsRef(undefined)
                setShowPluginIndex(0)
            }
            setLoading(true)

            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: +response.Pagination.Page + 1,
                      limit: +response.Pagination.Limit || 20
                  }
            const queryFilters = filtersDetailRef.current ? filtersDetailRef.current : filters
            const querySearch = searchDetailRef.current ? searchDetailRef.current : search
            const query: QueryYakScriptRequest = {
                ...convertLocalPluginsRequestParams({filter: queryFilters, search: querySearch, pageParams: params})
            }
            if (queryFilters.plugin_group?.length) {
                query.ExcludeTypes = ["yak", "codec"]
            }
            queryFetchList.current = query
            try {
                const res = await apiQueryYakScript(query)
                if (!res.Data) res.Data = []
                const length = +res.Pagination.Page === 1 ? res.Data.length : res.Data.length + response.Data.length
                setHasMore(length < +res.Total)
                const newData = res.Data.filter(
                    (ele) => ele.ScriptName !== externalIncomingPluginsRef.current?.ScriptName
                ).map((ele) => ({
                    ...ele,
                    isLocalPlugin: privateDomain !== ele.OnlineBaseUrl
                }))
                dispatch({
                    type: "add",
                    payload: {
                        response: {
                            ...res,
                            Data: newData
                        }
                    }
                })
                if (+res.Pagination.Page === 1) {
                    setAllCheck(false)
                    setSelectList([])
                    // 本地插件页面未打开，插件商店/我的插件点击去使用，先加载第一页的数据，再将数据中心的缓存数据添加到数组头部
                    setTimeout(() => {
                        onJumpToLocalPluginDetailByUUID()
                    }, 200)
                }
            } catch (error) {}
            setTimeout(() => {
                isLoadingRef.current = false
                setLoading(false)
            }, 200)
        }),
        {wait: 200, leading: true}
    ).run
    // 滚动更多加载
    const onUpdateList = useMemoizedFn(() => {
        fetchList()
    })
    const onSetActive = useMemoizedFn((type: TypeSelectOpt[]) => {
        const newType: API.PluginsSearchData[] = type.map((ele) => ({
            value: ele.key,
            label: ele.name,
            count: 0
        }))
        setFilters({...filters, plugin_type: newType})
    })
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllCheck(value)
    })

    // 当前展示的插件序列
    const showPluginIndex = useRef<number>(0)
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.Data.filter((item) => item.ScriptName !== data.ScriptName))
            setAllCheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...selectList, data])
        else setSelectList(selectList.filter((item) => item.ScriptName !== data.ScriptName))
    })

    /** 单项副标题组件 */
    const optSubTitle = useMemoizedFn((data: YakScript) => {
        if (data.isLocalPlugin) return <></>
        if (data.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon />
        } else {
            return <SolidCloudpluginIcon />
        }
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: YakScript) => {
        return (
            <LocalExtraOperate
                data={data}
                isOwn={userInfo.user_id === +data.UserId || +data.UserId === 0}
                onRemovePlugin={() => onRemovePluginBefore(data)}
                onExportPlugin={() => onExportPlugin(data)}
                onUploadPlugin={() => onUploadPlugin(data)}
            />
        )
    })

    /** 上传 */
    const onUploadPlugin = useMemoizedFn(async (data: YakScript) => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "登录后才可上传插件")
            return
        }
        uploadPluginRef.current = data
        // 也可以用后面加的isLocalPlugin判断
        if (data.OnlineBaseUrl === privateDomain) {
            const params: SaveYakScriptToOnlineRequest = {
                ScriptNames: [data.ScriptName],
                IsPrivate: !!data.OnlineIsPrivate
            }
            setUploadLoading(true)
            onStartUploadPlugin(params)
        } else {
            const m = showYakitModal({
                type: "white",
                title: "上传插件",
                content: (
                    <PluginLocalUploadSingle
                        plugin={data}
                        onUploadSuccess={onUploadSuccess}
                        onClose={() => {
                            m.destroy()
                        }}
                    />
                ),
                footer: null
            })
        }
    })

    /**导出 */
    const onExportPlugin = useMemoizedFn((data: YakScript) => {
        onExport([data.Id])
    })
    /**单个删除插件之前操作  */
    const onRemovePluginBefore = useMemoizedFn((data: YakScript) => {
        removePluginRef.current = data
        if (pluginRemoveCheck) {
            onRemovePluginSingle(data)
        } else {
            setRemoveCheckVisible(true)
        }
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: YakScript, index: number) => {
        setPlugin({...data})
        setShowPluginIndex(index)
    })
    /**新建插件 */
    const onNewAddPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Local}})
        )
    })
    const onBack = useMemoizedFn((backValues: PluginLocalBackProps) => {
        searchDetailRef.current = undefined
        filtersDetailRef.current = undefined
        setPlugin(undefined)
        if (importInDetail) {
            setAllCheck(false)
            setSelectList([])
            setImportInDetail(false)
            resetAllQueryRefLocalList()
        } else {
            setSearch(backValues.search)
            setFilters(backValues.filter)
            setAllCheck(backValues.allCheck)
            setSelectList(backValues.selectList)
        }
    })
    const onSearch = useMemoizedFn((val) => {
        setSearch(val)
        setTimeout(() => {
            fetchList(true)
        }, 200)
    })
    const pluginTypeSelect: TypeSelectOpt[] = useMemo(() => {
        return (
            filters.plugin_type?.map((ele) => ({
                key: ele.value,
                name: ele.label
            })) || []
        )
    }, [filters.plugin_type])
    /**批量删除插件之前操作  */
    const onRemovePluginBatchBefore = useMemoizedFn(() => {
        if (pluginRemoveCheck) {
            onRemovePluginBatch()
        } else {
            setRemoveCheckVisible(true)
        }
    })
    /**批量删除 */
    const onRemovePluginBatch = useMemoizedFn(async () => {
        setRemoveLoading(true)
        try {
            if (allCheck) {
                //带条件删除全部
                const deleteAllParams: DeleteLocalPluginsByWhereRequestProps = {
                    ...convertDeleteLocalPluginsByWhereRequestParams(filters, search)
                }
                await apiDeleteLocalPluginsByWhere(deleteAllParams)
            } else {
                // 批量删除
                let deleteBatchParams: DeleteYakScriptRequestByIdsProps = {
                    Ids: (selectList || []).map((ele) => ele.Id)
                }
                await apiDeleteYakScriptByIds(deleteBatchParams)
            }
        } catch (error) {}
        setRemoveCheckVisible(false)
        setSelectList([])
        if (allCheck) {
            setAllCheck(false)
        }
        getInitTotal()
        getPluginGroupListLocal()
        setRemoteValue(PluginGV.LocalPluginRemoveCheck, `${pluginRemoveCheck}`)
        setRemoveLoading(false)
        fetchList(true)
    })
    /**删除提示弹窗 */
    const onPluginRemoveCheckOk = useMemoizedFn(() => {
        if (removePluginDetailRef.current) {
            onRemovePluginDetailSingle(removePluginDetailRef.current)
            return
        }
        if (removePluginRef.current) {
            onRemovePluginSingle(removePluginRef.current)
            return
        }
        onRemovePluginBatch()
    })
    /**列表单个删除 */
    const onRemovePluginSingle = useMemoizedFn((data: YakScript) => {
        onRemovePluginSingleBase(data).then(() => {
            dispatch({
                type: "remove",
                payload: {
                    itemList: [data]
                }
            })
        })
    })
    /**单个删除基础 */
    const onRemovePluginSingleBase = useMemoizedFn((data: YakScript) => {
        let deleteParams: DeleteYakScriptRequestByIdsProps = {
            Ids: [data.Id]
        }
        return new Promise<void>((resolve, reject) => {
            apiDeleteYakScriptByIds(deleteParams)
                .then(() => {
                    const index = selectList.findIndex((ele) => ele.ScriptName === data.ScriptName)
                    if (index !== -1) {
                        optCheck(data, false)
                    }
                    removePluginRef.current = undefined
                    removePluginDetailRef.current = undefined
                    setRemoveCheckVisible(false)
                    getInitTotal()
                    getPluginGroupListLocal()
                    setRemoteValue(PluginGV.LocalPluginRemoveCheck, `${pluginRemoveCheck}`)
                    resolve()
                })
                .catch(reject)
        })
    })

    const onExport = useMemoizedFn(async (Ids: number[], callback?: () => void) => {
        try {
            const showSaveDialogRes = await ipcRenderer.invoke("openDialog", {properties: ["openDirectory"]})
            if (showSaveDialogRes.canceled) return
            if (queryFetchList.current) {
                const params: ExportParamsProps = {
                    OutputDir: showSaveDialogRes.filePaths[0],
                    YakScriptIds: Ids,
                    Keywords: queryFetchList.current.Keyword || "",
                    Type: queryFetchList.current.Type || "",
                    UserName: queryFetchList.current.UserName || "",
                    Tags: queryFetchList.current.Tag + ""
                }
                setExportParams(params)
                setExportStatusModalVisible(true)
                exportCallbackRef.current = callback
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    })
    const checkList = useMemo(() => {
        return selectList.map((ele) => ele.ScriptName)
    }, [selectList])
    const onRemovePluginDetailSingleBefore = useMemoizedFn((data: YakScript) => {
        removePluginDetailRef.current = data
        if (pluginRemoveCheck) {
            onRemovePluginDetailSingle(data)
        } else {
            setRemoveCheckVisible(true)
        }
    })
    /**详情中调用删除操作 */
    const onRemovePluginDetailSingle = useMemoizedFn((data) => {
        setRemoveLoading(true)
        onRemovePluginSingleBase(data)
            .then(() => {
                if (response.Data.length === 1) {
                    // 如果删除是最后一个，就回到列表中得空页面
                    setPlugin(undefined)
                } else {
                    const index = response.Data.findIndex((ele) => ele.ScriptName === data.ScriptName)
                    if (index === -1) return
                    if (index === Number(response.Total) - 1) {
                        // 选中得item为最后一个，删除后选中倒数第二个
                        setPlugin({
                            ...response.Data[index - 1]
                        })
                    } else {
                        //选择下一个
                        setPlugin({
                            ...response.Data[index + 1]
                        })
                    }
                }
                dispatch({
                    type: "remove",
                    payload: {
                        itemList: [data]
                    }
                })
            })
            .finally(() =>
                setTimeout(() => {
                    setRemoveLoading(false)
                }, 200)
            )
    })
    /** 详情搜索事件 */
    const onDetailSearch = useMemoizedFn((detailSearch: PluginSearchParams, detailFilter: PluginFilterParams) => {
        searchDetailRef.current = detailSearch
        filtersDetailRef.current = detailFilter
        fetchList(true)
    })
    // /**详情中的批量删除 */
    // const onDetailsBatchRemove = useMemoizedFn((newParams: PluginLocalDetailBackProps) => {
    //     setAllCheck(newParams.allCheck)
    //     setFilters(newParams.filter)
    //     setSearch(newParams.search)
    //     setSelectList(newParams.selectList)
    //     setTimeout(() => {
    //         onRemovePluginBatchBefore()
    //     }, 200)
    // })
    const onBatchUpload = useMemoizedFn((selectScriptNameList: string[]) => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "请登录后上传")
            return
        }
        if (selectScriptNameList.length === 0) return
        const m = showYakitModal({
            type: "white",
            title: "批量上传插件",
            content: (
                <PluginLocalUpload
                    pluginNames={selectScriptNameList}
                    onClose={() => {
                        m.destroy()
                        setTimeout(() => {
                            fetchList(true)
                        }, 200)
                    }}
                />
            ),
            footer: null,
            modalAfterClose: () => {
                onCheck(false)
            }
        })
    })
    const onDetailsBatchUpload = useMemoizedFn((names) => {
        onBatchUpload(names)
    })
    const onDetailsBatchSingle = useMemoizedFn((plugin: YakScript) => {
        onUploadPlugin(plugin)
    })
    const onSetShowFilter = useMemoizedFn((v) => {
        setRemoteValue(PluginGV.LocalFilterCloseStatus, `${v}`)
        setShowFilter(v)
    })
    /**初始数据为空的时候,刷新按钮,刷新列表和初始total,以及分组数据 */
    const onRefListAndTotalAndGroup = useMemoizedFn(() => {
        getInitTotal()
        fetchList(true)
        getPluginGroupListLocal()
    })
    return (
        <>
            {!!plugin && (
                <PluginsLocalDetail
                    pageWrapId='plugins-local-detail'
                    info={plugin}
                    defaultAllCheck={allCheck}
                    loading={loading}
                    defaultSelectList={selectList}
                    response={response}
                    onBack={onBack}
                    loadMoreData={onUpdateList}
                    defaultSearchValue={search}
                    defaultFilter={filters}
                    dispatch={dispatch}
                    onRemovePluginDetailSingleBefore={onRemovePluginDetailSingleBefore}
                    onDetailExport={onExport}
                    onDetailSearch={onDetailSearch}
                    spinLoading={loading && isLoadingRef.current}
                    // onDetailsBatchRemove={onDetailsBatchRemove}
                    onDetailsBatchUpload={onDetailsBatchUpload}
                    onDetailsBatchSingle={onDetailsBatchSingle}
                    currentIndex={showPluginIndex.current}
                    setCurrentIndex={setShowPluginIndex}
                    removeLoading={removeLoading}
                    onJumpToLocalPluginDetailByUUID={onJumpToLocalPluginDetailByUUID}
                    uploadLoading={uploadLoading}
                    privateDomain={privateDomain}
                />
            )}
            <PluginsLayout
                pageWrapId='plugins-local'
                title='本地插件'
                hidden={!!plugin}
                subTitle={<TypeSelect active={pluginTypeSelect} list={DefaultTypeList} setActive={onSetActive} />}
                extraHeader={
                    <div className='extra-header-wrapper' ref={pluginsLocalRef}>
                        <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                        <div className='divider-style'></div>
                        <div className='btn-group-wrapper'>
                            <FuncFilterPopover
                                maxWidth={1200}
                                icon={<SolidChevrondownIcon />}
                                name='批量操作'
                                disabled={selectNum === 0}
                                button={{
                                    type: "outline2",
                                    size: "large"
                                }}
                                menu={{
                                    type: "primary",
                                    data: [
                                        {key: "export", label: "导出"},
                                        {key: "upload", label: "上传", disabled: allCheck},
                                        {key: "remove", label: "删除"}
                                    ],
                                    onClick: ({key}) => {
                                        switch (key) {
                                            case "export":
                                                const Ids: number[] = selectList.map((ele) => Number(ele.Id))
                                                onExport(Ids)
                                                break
                                            case "upload":
                                                const pluginNames = selectList.map((ele) => ele.ScriptName) || []
                                                onBatchUpload(pluginNames)
                                                break
                                            case "remove":
                                                onRemovePluginBatchBefore()
                                                break
                                            default:
                                                return
                                        }
                                    }
                                }}
                                placement='bottomRight'
                            />
                            <FuncBtn
                                maxWidth={1050}
                                icon={<SolidPluscircleIcon />}
                                size='large'
                                name='新建插件'
                                onClick={onNewAddPlugin}
                            />
                        </div>
                    </div>
                }
            >
                <PluginsContainer
                    loading={loading && isLoadingRef.current}
                    visible={showFilter}
                    setVisible={onSetShowFilter}
                    selecteds={filters as Record<string, API.PluginsSearchData[]>}
                    onSelect={setFilters}
                    groupList={pluginGroupList.map((item) => {
                        if (item.groupKey === "plugin_group") {
                            item.groupExtraOptBtn = (
                                <>
                                    <YakitButton
                                        type='text'
                                        onClick={() =>
                                            emiter.emit(
                                                "menuOpenPage",
                                                JSON.stringify({route: YakitRoute.Plugin_Groups})
                                            )
                                        }
                                    >
                                        管理分组
                                    </YakitButton>
                                    <div className={styles["divider-style"]} />
                                </>
                            )
                        }
                        return item
                    })}
                >
                    <PluginsList
                        checked={allCheck}
                        onCheck={onCheck}
                        isList={isList}
                        setIsList={setIsList}
                        total={response.Total}
                        selected={selectNum}
                        filters={filters}
                        setFilters={setFilters}
                        visible={showFilter}
                        setVisible={onSetShowFilter}
                    >
                        {initTotal > 0 ? (
                            <ListShowContainer<YakScript>
                                id='local'
                                isList={isList}
                                data={response.Data || []}
                                gridNode={(info: {index: number; data: YakScript}) => {
                                    const {index, data} = info
                                    const check = allCheck || checkList.includes(data.ScriptName)
                                    return (
                                        <GridLayoutOpt
                                            order={index}
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            title={data.ScriptName}
                                            type={data.Type}
                                            tags={data.Tags}
                                            help={data.Help || ""}
                                            img={data.HeadImg || ""}
                                            user={data.Author || ""}
                                            isCorePlugin={!!data.IsCorePlugin}
                                            official={!!data.OnlineOfficial}
                                            prImgs={(data.CollaboratorInfo || []).map((ele) => ele.HeadImg)}
                                            time={data.UpdatedAt || 0}
                                            extraFooter={optExtraNode}
                                            subTitle={optSubTitle}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                gridHeight={226}
                                listNode={(info: {index: number; data: YakScript}) => {
                                    const {index, data} = info
                                    const check = allCheck || checkList.includes(data.ScriptName)
                                    return (
                                        <ListLayoutOpt
                                            order={index}
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            img={data.HeadImg || ""}
                                            title={data.ScriptName}
                                            help={data.Help || ""}
                                            time={data.UpdatedAt || 0}
                                            type={data.Type}
                                            isCorePlugin={!!data.IsCorePlugin}
                                            official={!!data.OnlineOfficial}
                                            extraNode={optExtraNode}
                                            onClick={optClick}
                                            subTitle={optSubTitle}
                                        />
                                    )
                                }}
                                listHeight={73}
                                loading={loading}
                                hasMore={hasMore}
                                updateList={onUpdateList}
                                isShowSearchResultEmpty={+response.Total === 0}
                                showIndex={showPluginIndex.current}
                                setShowIndex={setShowPluginIndex}
                                keyName='ScriptName'
                            />
                        ) : (
                            <div className={styles["plugin-local-empty"]}>
                                <YakitEmpty
                                    title='暂无数据'
                                    description='可新建插件同步至云端，创建属于自己的插件'
                                    style={{marginTop: 80}}
                                />
                                <div className={styles["plugin-local-buttons"]}>
                                    <YakitButton type='outline1' icon={<OutlinePlusIcon />} onClick={onNewAddPlugin}>
                                        新建插件
                                    </YakitButton>
                                    <YakitButton
                                        type='outline1'
                                        icon={<OutlineRefreshIcon />}
                                        onClick={onRefListAndTotalAndGroup}
                                    >
                                        刷新
                                    </YakitButton>
                                </div>
                            </div>
                        )}
                    </PluginsList>
                </PluginsContainer>
            </PluginsLayout>
            <YakitHint
                visible={removeCheckVisible}
                title='是否要删除插件'
                content='确认删除后，插件将彻底删除'
                onOk={onPluginRemoveCheckOk}
                onCancel={() => setRemoveCheckVisible(false)}
                footerExtra={
                    <YakitCheckbox checked={pluginRemoveCheck} onChange={(e) => setPluginRemoveCheck(e.target.checked)}>
                        下次不再提醒
                    </YakitCheckbox>
                }
            />
            <PluginLocalExport
                visible={exportStatusModalVisible}
                getContainer={
                    document.getElementById(!!plugin ? "plugins-local-detail" : "plugins-local") || document.body
                }
                exportLocalParams={exportParams}
                onClose={() => {
                    setExportStatusModalVisible(false)
                    setExportParams(initExportLocalParams)
                    const callback = exportCallbackRef.current
                    callback && callback()
                    onCheck(false)
                }}
            ></PluginLocalExport>
        </>
    )
})

export const LocalExtraOperate: React.FC<LocalExtraOperateProps> = React.memo((props) => {
    const {data, isOwn, onRemovePlugin, onExportPlugin, onUploadPlugin} = props
    const [removeLoading, setRemoveLoading] = useState<boolean>(false)
    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const onRemove = useMemoizedFn(async (e) => {
        e.stopPropagation()
        setRemoveLoading(true)
        try {
            await onRemovePlugin()
        } catch (error) {}
        setTimeout(() => {
            setRemoveLoading(false)
        }, 200)
    })
    const onExport = useMemoizedFn((e) => {
        e.stopPropagation()
        onExportPlugin()
    })
    const onEdit = useMemoizedFn((e) => {
        e.stopPropagation()
        onToEditPlugin(data)
    })
    const onUpload = useMemoizedFn(async (e) => {
        e.stopPropagation()

        setUploadLoading(true)
        try {
            await onUploadPlugin()
        } catch (error) {}
        setTimeout(() => {
            setUploadLoading(false)
        }, 200)
    })
    const isShowUpload = useMemo(() => {
        if (!!data.IsCorePlugin) return false
        // if (isLocalPlugin) return true

        return !!data.isLocalPlugin
    }, [data.isLocalPlugin, data.IsCorePlugin, isOwn])
    return (
        <div className={styles["local-extra-operate-wrapper"]}>
            {removeLoading ? (
                <LoadingOutlined className={styles["loading-icon"]} />
            ) : (
                <Tooltip title='删除' destroyTooltipOnHide={true}>
                    <YakitButton type='text2' icon={<OutlineTrashIcon onClick={onRemove} />} />
                </Tooltip>
            )}
            <div className='divider-style' />
            <Tooltip title='导出' destroyTooltipOnHide={true}>
                <YakitButton type='text2' icon={<OutlineExportIcon onClick={onExport} />} />
            </Tooltip>
            <div className='divider-style' />
            <Tooltip title='编辑' destroyTooltipOnHide={true}>
                <YakitButton type='text2' icon={<OutlinePencilaltIcon onClick={onEdit} />} />
            </Tooltip>
            {isShowUpload && (
                <>
                    <div className='divider-style' />
                    <YakitButton
                        icon={<OutlineClouduploadIcon />}
                        onClick={onUpload}
                        className={styles["cloud-upload-icon"]}
                        loading={uploadLoading}
                    >
                        上传
                    </YakitButton>
                </>
            )}
        </div>
    )
})
