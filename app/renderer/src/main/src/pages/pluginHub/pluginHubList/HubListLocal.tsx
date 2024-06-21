import React, {memo, useRef, useMemo, useState, useReducer, useEffect} from "react"
import {useMemoizedFn, useDebounceFn, useUpdateEffect, useInViewport} from "ahooks"
import {OutlineClouduploadIcon, OutlinePlusIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {PluginSearchParams, PluginListPageMeta, PluginFilterParams} from "@/pages/plugins/baseTemplateType"
import {defaultFilter, defaultSearch} from "@/pages/plugins/builtInData"
import {pluginLocalReducer, initialLocalState} from "@/pages/plugins/pluginReducer"
import {
    apiFetchGroupStatisticsLocal,
    convertLocalPluginsRequestParams,
    apiQueryYakScript,
    DeleteYakScriptRequestByIdsProps,
    apiDeleteYakScriptByIds,
    DeleteLocalPluginsByWhereRequestProps,
    convertDeleteLocalPluginsByWhereRequestParams,
    apiDeleteLocalPluginsByWhere,
    apiQueryYakScriptTotal,
    excludeNoExistfilter,
    apiQueryYakScriptByYakScriptName
} from "@/pages/plugins/utils"
import {yakitNotify} from "@/utils/notification"
import cloneDeep from "lodash/cloneDeep"
import useListenWidth from "../hooks/useListenWidth"
import {HubButton} from "../hubExtraOperate/funcTemplate"
import {
    HubOuterList,
    HubGridList,
    HubGridOpt,
    HubListFilter,
    LocalOptFooterExtra,
    HubDetailList,
    HubDetailListOpt
} from "./funcTemplate"
import {useStore} from "@/store"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {HubListBaseProps} from "../type"
import {API} from "@/services/swagger/resposeType"
import {SolidChevrondownIcon, SolidPluscircleIcon} from "@/assets/icon/solid"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {FilterPopoverBtn, FuncFilterPopover} from "@/pages/plugins/funcTemplate"
import {ExportYakScriptStreamRequest, PluginGroupList} from "@/pages/plugins/local/PluginsLocalType"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {getRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {NoPromptHint} from "../utilsUI/UtilsTemplate"
import {RemotePluginGV} from "@/enums/plugin"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import {randomString} from "@/utils/randomUtil"
import usePluginUploadHooks, {SaveYakScriptToOnlineRequest} from "@/pages/plugins/pluginUploadHooks"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {PluginLocalUpload, PluginLocalUploadSingle} from "@/pages/plugins/local/PluginLocalUpload"
import {PluginLocalExport, PluginLocalExportForm} from "@/pages/plugins/local/PluginLocalExportProps"
import {DefaultExportRequest, DefaultLocalPlugin, PluginOperateHint} from "../defaultConstant"
import useGetSetState from "../hooks/useGetSetState"
import {PluginGroup, TagsAndGroupRender, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {Tooltip} from "antd"
import {SavePluginInfoSignalProps} from "@/pages/plugins/editDetails/PluginEditDetails"

import classNames from "classnames"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import styles from "./PluginHubList.module.scss"

const {ipcRenderer} = window.require("electron")

interface HubListLocalProps extends HubListBaseProps {
    rootElementId?: string
}
/** @name 本地插件 */
export const HubListLocal: React.FC<HubListLocalProps> = memo((props) => {
    const {rootElementId, hiddenFilter, isDetailList, hiddenDetailList, onPluginDetail} = props

    const divRef = useRef<HTMLDivElement>(null)
    const wrapperWidth = useListenWidth(divRef)
    const [inViewPort = true] = useInViewport(divRef)

    const userinfo = useStore((s) => s.userInfo)
    const isLogin = useMemo(() => userinfo.isLogin, [userinfo])

    // 私有域
    const privateDomain = useRef<string>("")
    const fetchPrivateDomain = useMemoizedFn((callback?: () => void) => {
        getRemoteValue(RemoteGV.HttpSetting)
            .then((res) => {
                if (res) {
                    try {
                        const value = JSON.parse(res)
                        privateDomain.current = value.BaseUrl
                        if (callback) callback()
                    } catch (error) {}
                }
            })
            .catch(() => {})
    })

    /** ---------- 列表相关变量 Start ---------- */
    const [loading, setLoading] = useState<boolean>(false)
    // 是否为获取列表第一页的加载状态
    const isInitLoading = useRef<boolean>(false)
    const hasMore = useRef<boolean>(true)

    // 列表无条件下的总数
    const [listTotal, setListTotal] = useState<number>(0)

    const [filterGroup, setFilterGroup] = useState<PluginGroupList[]>([])

    // 列表数据
    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)
    // 全选
    const [allChecked, setAllChecked] = useState<boolean>(false)
    // 选中插件
    const [selectList, setSelectList] = useState<YakScript[]>([])
    // 搜索条件
    const [search, setSearch, getSearch] = useGetSetState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters, getFilters] = useGetSetState<PluginFilterParams>(cloneDeep(defaultFilter))

    const showIndex = useRef<number>(0)
    const setShowIndex = useMemoizedFn((index: number) => {
        showIndex.current = index
    })
    /** ---------- 列表相关变量 End ---------- */

    /** ---------- 列表相关方法 Start ---------- */
    //编辑插件保存后的刷新列表数据
    const handleEditedToRefreshList = useMemoizedFn((info: string) => {
        try {
            const plugin: SavePluginInfoSignalProps = JSON.parse(info)
            apiQueryYakScriptByYakScriptName({pluginName: plugin.pluginName})
                .then((data: YakScript) => {
                    const newItem = {...data, isLocalPlugin: privateDomain.current !== data.OnlineBaseUrl}
                    // 本地列表是按更新时间排序的，如果当前列表没有该数据，刷新类别，数据会在第一页第一个
                    const index = response.Data.findIndex((ele) => ele.ScriptName === data.ScriptName)
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
                })
                .catch(() => {})
        } catch (error) {}
    })

    //  重置后初始化搜索列表
    const handleResetInitList = useMemoizedFn(() => {
        setSearch(cloneDeep(defaultSearch))
        setFilters(cloneDeep(defaultFilter))
        fetchFilterGroup()
        fetchList(true)
    })

    useEffect(() => {
        fetchPrivateDomain(() => {
            fetchList(true)
        })
        fetchFilterGroup()
    }, [])

    useUpdateEffect(() => {
        fetchFilterGroup()
        fetchList(true)
    }, [isLogin])
    useUpdateEffect(() => {
        fetchFilterGroup()
    }, [inViewPort])
    /** 搜索条件 */
    useUpdateEffect(() => {
        fetchList(true)
    }, [filters])

    useEffect(() => {
        const refreshPrivateDomain = () => {
            fetchPrivateDomain(() => {
                fetchList(true)
            })
        }
        const refreshList = () => {
            setTimeout(() => {
                fetchList(true)
            }, 200)
        }
        emiter.on("onSwitchPrivateDomain", refreshPrivateDomain)
        emiter.on("onRefLocalPluginList", refreshList)
        emiter.on("savePluginInfoSignal", handleEditedToRefreshList)
        emiter.on("onImportRefLocalPluginList", handleResetInitList)

        return () => {
            emiter.off("onSwitchPrivateDomain", refreshPrivateDomain)
            emiter.off("onRefLocalPluginList", refreshList)
            emiter.off("savePluginInfoSignal", handleEditedToRefreshList)
            emiter.off("onImportRefLocalPluginList", handleResetInitList)
        }
    }, [])

    // 选中搜索条件可能在搜索数据组中不存在时进行清除
    useEffect(() => {
        const {realFilter, updateFilterFlag} = excludeNoExistfilter(filters, filterGroup)
        if (updateFilterFlag) setFilters(realFilter)
    }, [filters, filterGroup])

    const fetchInitTotal = useMemoizedFn(() => {
        apiQueryYakScriptTotal(true)
            .then((res) => {
                setListTotal(Number(res.Total) || 0)
            })
            .catch(() => {})
    })

    // 搜索条件分组数据
    const fetchFilterGroup = useMemoizedFn(() => {
        apiFetchGroupStatisticsLocal()
            .then((res: API.PluginsSearchResponse) => {
                setFilterGroup(res.data)
            })
            .catch(() => {})
    })

    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            if (loading) return
            if (reset) {
                fetchInitTotal()
                isInitLoading.current = true
                setShowIndex(0)
            }
            setLoading(true)

            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: +response.Pagination.Page + 1 || 1,
                      limit: +response.Pagination.Limit || 20
                  }

            const queryFilter = {...getFilters()}
            const queryFearch = {...getSearch()}
            const query: QueryYakScriptRequest = {
                ...convertLocalPluginsRequestParams({
                    filter: queryFilter,
                    search: queryFearch,
                    pageParams: params
                })
            }
            if (queryFilter.plugin_group?.length) query.ExcludeTypes = ["yak", "codec"]

            try {
                const res = await apiQueryYakScript(query)
                if (!res.Data) res.Data = []
                const length = +res.Pagination.Page === 1 ? res.Data.length : res.Data.length + response.Data.length
                hasMore.current = length < +res.Total
                const newData = res.Data.filter((ele) => ele.ScriptName !== "").map((ele) => ({
                    ...ele,
                    isLocalPlugin: privateDomain.current !== ele.OnlineBaseUrl
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
                    onCheck(false)
                }
            } catch (error) {}
            setTimeout(() => {
                isInitLoading.current = false
                setLoading(false)
            }, 300)
        }),
        {wait: 200, leading: true}
    ).run
    /** 滚动更多加载 */
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })
    /** 刷新 */
    const onRefresh = useMemoizedFn(() => {
        fetchFilterGroup()
        fetchList(true)
    })

    /** 单项勾选 */
    const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
        // 全选情况时的取消勾选
        if (allChecked) {
            setSelectList(response.Data.filter((item) => item.ScriptName !== data.ScriptName))
            setAllChecked(false)
            return
        }
        // 单项勾选回调
        if (value) {
            setSelectList([...selectList, data])
        } else {
            const newSelectList = selectList.filter((item) => item.ScriptName !== data.ScriptName)
            setSelectList(newSelectList)
        }
    })
    /** 全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllChecked(value)
    })

    /** 搜索内容 */
    const onSearch = useDebounceFn(
        useMemoizedFn((val: PluginSearchParams) => {
            setSearch(val)
            fetchList(true)
        }),
        {wait: 300, leading: true}
    ).run
    /** ---------- 列表相关方法 End ---------- */

    const listLength = useMemo(() => {
        return Number(response.Total) || 0
    }, [response])
    const selectedNum = useMemo(() => {
        if (allChecked) return listLength
        else return selectList.length
    }, [allChecked, selectList, listLength])

    /** ---------- 删除插件 Start ---------- */
    useEffect(() => {
        // 删除插件的二次确认弹框
        getRemoteValue(RemotePluginGV.LocalPluginRemoveCheck)
            .then((res) => {
                delHintCache.current = res === "true"
            })
            .catch((err) => {})

        emiter.on("detailDeleteLocalPlugin", handleDetailDeleteToLocal)
        return () => {
            emiter.off("detailDeleteLocalPlugin", handleDetailDeleteToLocal)
        }
    }, [])
    // 详情删除本地插件触发列表的局部更新
    const handleDetailDeleteToLocal = useMemoizedFn((info: string) => {
        if (!info) return
        try {
            const plugin: {name: string; id: string} = JSON.parse(info)
            if (!plugin.name) return
            const index = selectList.findIndex((ele) => ele.ScriptName === plugin.name)
            const data: YakScript = {
                ...DefaultLocalPlugin,
                Id: Number(plugin.id) || 0,
                ScriptName: plugin.name || ""
            }
            if (index !== -1) {
                optCheck(data, false)
            }
            fetchInitTotal()
            fetchFilterGroup()
            dispatch({
                type: "remove",
                payload: {
                    itemList: [data]
                }
            })
        } catch (error) {}
    })

    // 是否出现二次确认框
    const delHintCache = useRef<boolean>(false)
    // 出发二次确认框的操作源
    const delHintSource = useRef<"batch" | "single">("single")
    const [delHint, setDelHint] = useState<boolean>(false)
    const onOpenDelHint = useMemoizedFn((source: "batch" | "single") => {
        if (delHint) return
        delHintSource.current = source
        setDelHint(true)
    })
    const delHintCallback = useMemoizedFn((isOK: boolean, cache: boolean) => {
        if (isOK) {
            delHintCache.current = cache
            if (delHintSource.current === "batch") {
                handleBatchDel()
            }
            if (delHintSource.current === "single") {
                const info = singleDel[singleDel.length - 1]
                if (info) handleSingeDel(info)
            }
        } else {
            if (delHintSource.current === "single") {
                setSingleDel((arr) => arr.slice(0, arr.length - 1))
            }
        }
        setDelHint(false)
    })

    const [batchDelLoading, setBatchDelLoading] = useState<boolean>(false)
    const onHeaderExtraDel = useMemoizedFn(() => {
        if (delHintCache.current) {
            handleBatchDel()
        } else {
            onOpenDelHint("batch")
        }
    })
    // 批量删除
    const handleBatchDel = useMemoizedFn(async () => {
        if (batchDelLoading) return
        setBatchDelLoading(true)

        try {
            if (allChecked) {
                let request: DeleteLocalPluginsByWhereRequestProps = convertDeleteLocalPluginsByWhereRequestParams(
                    {...getFilters()},
                    {...getSearch()}
                )
                await apiDeleteLocalPluginsByWhere(request)
            }
            if (!allChecked && selectedNum > 0) {
                let request: DeleteYakScriptRequestByIdsProps = {Ids: selectList.map((item) => item.Id)}
                await apiDeleteYakScriptByIds(request)
            }
        } catch (error) {}
        onCheck(false)
        fetchFilterGroup()
        fetchList(true)
        setTimeout(() => {
            setBatchDelLoading(false)
        }, 200)
    })

    // 单个删除的插件信息队列
    const [singleDel, setSingleDel] = useState<YakScript[]>([])
    const onFooterExtraDel = useMemoizedFn((info: YakScript) => {
        const findIndex = singleDel.findIndex((item) => item.ScriptName === info.ScriptName)
        if (findIndex > -1) {
            yakitNotify("error", "该插件正在执行删除操作,请稍后再试")
            return
        }
        setSingleDel((arr) => {
            arr.push(info)
            return [...arr]
        })
        if (delHintCache.current) {
            handleSingeDel(info)
        } else {
            onOpenDelHint("single")
        }
    })
    // 单个删除
    const handleSingeDel = useMemoizedFn((info: YakScript) => {
        let request: DeleteYakScriptRequestByIdsProps = {
            Ids: [info.Id]
        }
        apiDeleteYakScriptByIds(request)
            .then(() => {
                const index = selectList.findIndex((ele) => ele.ScriptName === info.ScriptName)
                if (index !== -1) {
                    optCheck(info, false)
                }
                fetchInitTotal()
                fetchFilterGroup()
                dispatch({
                    type: "remove",
                    payload: {
                        itemList: [info]
                    }
                })
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setSingleDel((arr) => arr.filter((item) => item.ScriptName !== info.ScriptName))
                }, 50)
            })
    })
    /** ---------- 删除插件 End ---------- */

    /** ---------- 上传插件 Start ---------- */
    const taskTokenRef = useRef(randomString(40))
    const {onStart: onStartUploadPlugin} = usePluginUploadHooks({
        isSingle: true,
        taskToken: taskTokenRef.current,
        onUploadData: () => {},
        onUploadSuccess: () => {
            const info = singleUpload[singleUpload.length - 1]
            if (info) handleSingleUploadAfter(info)
        },
        onUploadEnd: () => {
            setSingleUpload((arr) => arr.slice(0, arr.length - 1))
        },
        onUploadError: () => {
            yakitNotify("error", "上传失败")
        }
    })

    const [batchUploadLoading, setBatchUploadLoading] = useState<boolean>(false)
    const onHeaderExtraUpload = useMemoizedFn(() => {
        if (batchUploadLoading) return
        if (!isLogin) {
            yakitNotify("error", "请登录后再上传插件")
            return
        }
        if (selectedNum === 0) return
        handleBatchUpload()
    })
    // 批量上传
    const handleBatchUpload = useMemoizedFn(async () => {
        if (batchUploadLoading) return
        setBatchUploadLoading(true)

        const list = selectList.filter((item) => !item.IsCorePlugin).map((item) => item.ScriptName) || []
        if (!allChecked && list.length === 0) {
            yakitNotify("error", "勾选的插件全为内置插件或没有勾选插件")
            return
        }
        const m = showYakitModal({
            type: "white",
            title: "批量上传插件",
            content: (
                <PluginLocalUpload
                    pluginNames={list}
                    onClose={() => {
                        setBatchUploadLoading(false)
                        m.destroy()
                        setTimeout(() => {
                            // 刷新我的列表
                            emiter.emit("onRefUserPluginList", "")
                            fetchList(true)
                        }, 200)
                    }}
                />
            ),
            footer: null,
            modalAfterClose: () => {
                setBatchUploadLoading(false)
                onCheck(false)
            }
        })
    })

    // 单个上传的插件信息队列
    const [singleUpload, setSingleUpload] = useState<YakScript[]>([])
    const onFooterExtraUpload = useMemoizedFn((info: YakScript) => {
        const findIndex = singleUpload.findIndex((item) => item.ScriptName === info.ScriptName)
        if (findIndex > -1) {
            yakitNotify("error", "该插件正在执行上传操作,请稍后再试")
            return
        }
        setSingleUpload((arr) => {
            return [...arr, info]
        })
        handleSingeUpload(info)
    })
    // 单个上传
    const handleSingeUpload = useMemoizedFn((info: YakScript) => {
        // 也可以用info里的isLocalPlugin判断
        if (info.OnlineBaseUrl === privateDomain.current) {
            const request: SaveYakScriptToOnlineRequest = {
                ScriptNames: [info.ScriptName],
                IsPrivate: !!info.OnlineIsPrivate
            }
            onStartUploadPlugin(request)
        } else {
            const m = showYakitModal({
                type: "white",
                title: "上传插件",
                content: (
                    <PluginLocalUploadSingle
                        plugin={info}
                        onUploadSuccess={() => handleSingleUploadAfter(info)}
                        onClose={() => {
                            setSingleUpload((arr) => arr.filter((item) => item.ScriptName !== info.ScriptName))
                            m.destroy()
                        }}
                        onFailed={() => {
                            setSingleUpload((arr) => arr.filter((item) => item.ScriptName !== info.ScriptName))
                        }}
                    />
                ),
                footer: null
            })
        }
    })
    // 单个上传成功后
    const handleSingleUploadAfter = useMemoizedFn((info: YakScript) => {
        ipcRenderer
            .invoke("GetYakScriptByName", {Name: info.ScriptName})
            .then((i: YakScript) => {
                const newItem = {...i, isLocalPlugin: privateDomain.current !== i.OnlineBaseUrl}
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
    })
    /** ---------- 上传插件 End ---------- */

    /** ---------- 导出插件 Start ---------- */
    // 导出本地插件
    const [exportModal, setExportModal] = useState<boolean>(false)
    const exportParams = useRef<ExportYakScriptStreamRequest>({...DefaultExportRequest})
    const exportSource = useRef<string>("")
    const onHeaderExtraExport = useMemoizedFn(() => {
        exportSource.current = "batch"
        const names: string[] = selectList.map((ele) => ele.ScriptName).filter((item) => !!item)
        openExportModal(names)
    })
    // 单个导出
    const onFooterExtraExport = useMemoizedFn((info: YakScript) => {
        exportSource.current = "single"
        openExportModal([info.ScriptName])
    })
    const openExportModal = useMemoizedFn(async (names: string[]) => {
        if (exportModal) return
        try {
            let m = showYakitModal({
                title: "导出插件",
                width: 450,
                closable: true,
                maskClosable: false,
                footer: null,
                content: (
                    <div style={{margin: "15px 0"}}>
                        <PluginLocalExportForm
                            onCancel={() => m.destroy()}
                            onOK={(values) => {
                                const page: PluginListPageMeta = {
                                    page: +response.Pagination.Page,
                                    limit: +response.Pagination.Limit || 20
                                }
                                const queryFilters = {...getFilters()}
                                const querySearch = {...getSearch()}
                                const query: QueryYakScriptRequest = {
                                    ...convertLocalPluginsRequestParams({
                                        filter: queryFilters,
                                        search: querySearch,
                                        pageParams: page
                                    })
                                }
                                const params: ExportYakScriptStreamRequest = {
                                    OutputFilename: values.OutputFilename,
                                    Password: values.Password,
                                    Filter: {...query, IncludedScriptNames: names}
                                }
                                exportParams.current = params
                                setExportModal(true)
                                m.destroy()
                            }}
                        ></PluginLocalExportForm>
                    </div>
                )
            })
        } catch (error) {
            yakitNotify("error", error + "")
        }
    })
    const closeExportModal = useMemoizedFn(() => {
        exportParams.current = {...DefaultExportRequest}
        if (exportSource.current === "batch") {
            onCheck(false)
        }
        exportSource.current = ""
        setExportModal(false)
    })
    /** ---------- 导出插件 End ---------- */

    // 新建插件
    const onNewPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Hub}})
        )
    })
    // 管理分组
    const onOpenPluginGroup = useMemoizedFn(() => {
        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.Plugin_Groups}))
    })

    /** ---------- 详情列表操作 Start ---------- */
    // 进入插件详情
    const onOptClick = useMemoizedFn((info: YakScript, index: number) => {
        if (!info.ScriptName) {
            yakitNotify("error", "未获取到插件信息，请刷新列表重试")
            return
        }
        setShowIndex(index)
        onPluginDetail({type: "local", name: info.ScriptName, uuid: info.UUID || ""})
    })

    // 触发详情列表的单项定位
    const [scrollTo, setScrollTo] = useState<number>(0)
    useUpdateEffect(() => {
        if (isDetailList) {
            // setTimeout(() => {
            //     setScrollTo(showIndex.current)
            // }, 100)
        }
    }, [isDetailList])

    /** 详情列表转换插件组搜索条件 */
    const convertGroupParam = (filter: PluginFilterParams, extra: {group: YakFilterRemoteObj[]}) => {
        const realFilters: PluginFilterParams = {
            ...filter,
            plugin_group: extra.group.map((item) => ({value: item.name, count: item.total, label: item.name}))
        }
        return realFilters
    }

    /** 详情条件搜索 */
    const onDetailFilter = useMemoizedFn((value: PluginFilterParams) => {
        onCheck(false)
        setFilters(value)
        fetchList(true)
    })

    /** 详情列表-选中组展示 */
    const detailSelectedGroup = useMemo(() => {
        const group: YakFilterRemoteObj[] = cloneDeep(filters).plugin_group?.map((item: API.PluginsSearchData) => ({
            name: item.value,
            total: item.count
        }))
        return group || []
    }, [filters])

    // 详情单项副标题
    const detailOptSubTitle = useMemoizedFn((info: YakScript) => {
        if (privateDomain.current !== info.OnlineBaseUrl) return <></>
        if (info.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon className='icon-svg-16' />
        } else {
            return <SolidCloudpluginIcon className='icon-svg-16' />
        }
    })
    /** ---------- 详情列表操作 End ---------- */

    // 单项副标题
    const optSubTitle = useMemoizedFn((data: YakScript) => {
        if (data.isLocalPlugin) return null
        if (data.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon />
        } else {
            return <SolidCloudpluginIcon />
        }
    })
    // 单项操作
    const extraFooter = (info: YakScript) => {
        return (
            <LocalOptFooterExtra
                isLogin={isLogin}
                info={info}
                execUploadInfo={singleUpload}
                onUpload={onFooterExtraUpload}
                onExport={onFooterExtraExport}
                execDelInfo={singleDel}
                onDel={onFooterExtraDel}
            />
        )
    }

    return (
        <div className={styles["plugin-hub-tab-list"]}>
            <YakitSpin
                wrapperClassName={isDetailList ? styles["hidden-view"] : ""}
                spinning={loading && isInitLoading.current}
            >
                <div className={styles["outer-list"]}>
                    <div className={classNames(styles["list-filter"], {[styles["hidden-view"]]: hiddenFilter})}>
                        <HubListFilter
                            groupList={filterGroup}
                            selecteds={filters as Record<string, API.PluginsSearchData[]>}
                            onSelect={setFilters}
                            groupItemExtra={(info) => {
                                if (info.groupKey === "plugin_group") {
                                    return (
                                        <>
                                            <YakitButton type='text' onClick={onOpenPluginGroup}>
                                                管理分组
                                            </YakitButton>
                                            <div className={styles["local-list-divider-style"]} />
                                        </>
                                    )
                                }
                                return null
                            }}
                        />
                    </div>

                    <div className={styles["list-body"]}>
                        <HubOuterList
                            title='本地插件'
                            headerExtra={
                                <div className={styles["hub-list-header-extra"]}>
                                    <FuncFilterPopover
                                        maxWidth={1200}
                                        icon={<SolidChevrondownIcon />}
                                        name='批量操作'
                                        disabled={selectedNum === 0}
                                        button={{
                                            type: "outline2",
                                            size: "large"
                                        }}
                                        menu={{
                                            type: "primary",
                                            data: [
                                                {key: "export", label: "导出"},
                                                {
                                                    key: "upload",
                                                    label: "上传",
                                                    disabled: allChecked || batchUploadLoading
                                                },
                                                {key: "remove", label: "删除", disabled: batchDelLoading}
                                            ],
                                            onClick: ({key}) => {
                                                switch (key) {
                                                    case "export":
                                                        onHeaderExtraExport()
                                                        break
                                                    case "upload":
                                                        onHeaderExtraUpload()
                                                        break
                                                    case "remove":
                                                        onHeaderExtraDel()
                                                        break
                                                    default:
                                                        return
                                                }
                                            }
                                        }}
                                        placement='bottomRight'
                                    />
                                    <HubButton
                                        width={wrapperWidth}
                                        iconWidth={900}
                                        icon={<SolidPluscircleIcon />}
                                        size='large'
                                        name='新建插件'
                                        onClick={onNewPlugin}
                                    />
                                </div>
                            }
                            allChecked={allChecked}
                            setAllChecked={onCheck}
                            total={response.Total}
                            selected={selectedNum}
                            search={search}
                            setSearch={setSearch}
                            onSearch={onSearch}
                            filters={filters as Record<string, API.PluginsSearchData[]>}
                            setFilters={setFilters}
                        >
                            {listLength > 0 ? (
                                <HubGridList
                                    data={response.Data || []}
                                    keyName='ScriptName'
                                    loading={loading}
                                    hasMore={hasMore.current}
                                    updateList={onUpdateList}
                                    showIndex={showIndex.current}
                                    setShowIndex={setShowIndex}
                                    gridNode={(info) => {
                                        const {index, data} = info
                                        const check =
                                            allChecked ||
                                            selectList.findIndex((ele) => ele.ScriptName === data.ScriptName) !== -1
                                        return (
                                            <HubGridOpt
                                                order={index}
                                                info={data}
                                                checked={check}
                                                onCheck={optCheck}
                                                title={data.ScriptName}
                                                type={data.Type}
                                                tags={data.Tags}
                                                help={data.Help || ""}
                                                img={data.HeadImg || ""}
                                                user={data.Author || ""}
                                                prImgs={(data.CollaboratorInfo || []).map((ele) => ele.HeadImg)}
                                                time={data.UpdatedAt || 0}
                                                isCorePlugin={!!data.IsCorePlugin}
                                                official={!!data.OnlineOfficial}
                                                extraFooter={extraFooter}
                                                subTitle={optSubTitle}
                                                onClick={onOptClick}
                                            />
                                        )
                                    }}
                                />
                            ) : listTotal > 0 ? (
                                <YakitEmpty
                                    image={SearchResultEmpty}
                                    imageStyle={{margin: "0 auto 24px", width: 274, height: 180}}
                                    title='搜索结果“空”'
                                    className={styles["hub-list-empty"]}
                                />
                            ) : (
                                <div className={styles["hub-list-empty"]}>
                                    <YakitEmpty
                                        title='暂无数据'
                                        description='可新建插件同步至云端，创建属于自己的插件'
                                    />
                                    <div className={styles["refresh-buttons"]}>
                                        <YakitButton type='outline1' icon={<OutlinePlusIcon />} onClick={onNewPlugin}>
                                            新建插件
                                        </YakitButton>
                                        <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={onRefresh}>
                                            刷新
                                        </YakitButton>
                                    </div>
                                </div>
                            )}
                        </HubOuterList>
                    </div>
                </div>
            </YakitSpin>

            {isDetailList && (
                <div className={classNames(styles["inner-list"], {[styles["hidden-view"]]: hiddenDetailList})}>
                    <HubDetailList
                        search={search}
                        setSearch={setSearch}
                        onSearch={onSearch}
                        filterNode={
                            <PluginGroup
                                selectGroup={detailSelectedGroup}
                                setSelectGroup={(group) =>
                                    onDetailFilter(convertGroupParam({...getFilters()}, {group}))
                                }
                            />
                        }
                        checked={allChecked}
                        onCheck={onCheck}
                        total={listLength}
                        selected={selectedNum}
                        filterExtra={
                            <div className={styles["hub-detail-list-extra"]}>
                                <FilterPopoverBtn defaultFilter={filters} onFilter={onDetailFilter} type='local' />
                                <div className={styles["divider-style"]}></div>
                                <Tooltip title='上传插件' overlayClassName='plugins-tooltip'>
                                    <YakitButton
                                        type='text2'
                                        loading={batchUploadLoading}
                                        disabled={allChecked || selectedNum === 0}
                                        icon={<OutlineClouduploadIcon />}
                                        onClick={onHeaderExtraUpload}
                                    />
                                </Tooltip>
                                {/* <div className={styles["divider-style"]}></div>
                                <Tooltip title={selectedNum > 0 ? "删除" : "清空"} overlayClassName='plugins-tooltip'>
                                    <YakitButton
                                        type='text2'
                                        loading={batchDelLoading}
                                        disabled={listTotal === 0}
                                        icon={<OutlineTrashIcon />}
                                        onClick={onHeaderExtraDel}
                                    />
                                </Tooltip> */}
                            </div>
                        }
                        filterBodyBottomNode={
                            <div style={{marginTop: 8}}>
                                <TagsAndGroupRender
                                    wrapStyle={{marginBottom: 0}}
                                    selectGroup={detailSelectedGroup}
                                    setSelectGroup={(group) =>
                                        onDetailFilter(convertGroupParam({...getFilters()}, {group}))
                                    }
                                />
                            </div>
                        }
                        listProps={{
                            rowKey: "ScriptName",
                            numberRoll: scrollTo,
                            data: response.Data || [],
                            loadMoreData: onUpdateList,
                            classNameRow: styles["hub-detail-list-opt"],
                            renderRow: (info, i) => {
                                const check =
                                    allChecked ||
                                    selectList.findIndex((item) => item.ScriptName === info.ScriptName) !== -1
                                return (
                                    <HubDetailListOpt
                                        order={i}
                                        plugin={info}
                                        check={check}
                                        headImg={info.HeadImg || ""}
                                        pluginName={info.ScriptName}
                                        help={info.Help || ""}
                                        content={info.Content || ""}
                                        optCheck={optCheck}
                                        official={!!info.OnlineOfficial}
                                        isCorePlugin={!!info.IsCorePlugin}
                                        pluginType={info.Type}
                                        onPluginClick={onOptClick}
                                        extra={detailOptSubTitle}
                                    />
                                )
                            },
                            page: response.Pagination.Page,
                            hasMore: hasMore.current,
                            loading: loading,
                            defItemHeight: 46,
                            isRef: loading && isInitLoading.current
                        }}
                        spinLoading={loading && isInitLoading.current}
                    />
                </div>
            )}

            <NoPromptHint
                visible={delHint}
                title='是否要删除插件'
                content={PluginOperateHint["delLocal"]}
                cacheKey={RemotePluginGV.LocalPluginRemoveCheck}
                onCallback={delHintCallback}
            />

            <PluginLocalExport
                visible={exportModal}
                getContainer={document.getElementById(rootElementId || "") || document.body}
                exportLocalParams={exportParams.current}
                onClose={closeExportModal}
            />
        </div>
    )
})
