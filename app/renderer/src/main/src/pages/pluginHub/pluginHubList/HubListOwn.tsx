import React, {memo, useRef, useMemo, useState, useReducer, useEffect} from "react"
import {useMemoizedFn, useDebounceFn, useUpdateEffect, useInViewport} from "ahooks"
import {OutlineTrashIcon, OutlineRefreshIcon, OutlineClouddownloadIcon, OutlinePlusIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {RemotePluginGV} from "@/enums/plugin"
import {PluginSearchParams, PluginListPageMeta, PluginFilterParams} from "@/pages/plugins/baseTemplateType"
import {defaultSearch} from "@/pages/plugins/builtInData"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {pluginOnlineReducer, initialOnlineState} from "@/pages/plugins/pluginReducer"
import {
    PluginsQueryProps,
    convertPluginsRequestParams,
    apiFetchGroupStatisticsMine,
    DownloadOnlinePluginsRequest,
    convertDownloadOnlinePluginBatchRequestParams,
    apiDownloadPluginMine,
    apiDeletePluginMine,
    apiFetchMineList,
    excludeNoExistfilter
} from "@/pages/plugins/utils"
import {getRemoteValue} from "@/utils/kv"
import {yakitNotify} from "@/utils/notification"
import cloneDeep from "lodash/cloneDeep"
import useListenWidth from "../hooks/useListenWidth"
import {HubButton} from "../hubExtraOperate/funcTemplate"
import {NoPromptHint} from "../utilsUI/UtilsTemplate"
import {
    HubOuterList,
    HubGridList,
    HubGridOpt,
    HubListFilter,
    OwnOptFooterExtra,
    HubDetailList,
    HubDetailListOpt
} from "./funcTemplate"
import {useStore} from "@/store"
import {OnlineJudgment} from "@/pages/plugins/onlineJudgment/OnlineJudgment"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {HubListBaseProps} from "../type"
import {API} from "@/services/swagger/resposeType"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import useGetSetState from "../hooks/useGetSetState"
import {FilterPopoverBtn} from "@/pages/plugins/funcTemplate"
import {Tooltip} from "antd"
import {SolidPrivatepluginIcon} from "@/assets/icon/colors"
import {statusTag} from "@/pages/plugins/baseTemplate"
import {DefaultOnlinePlugin, PluginOperateHint} from "../defaultConstant"
import {grpcDownloadOnlinePlugin, grpcFetchLocalPluginDetail} from "../utils/grpc"
import {defaultAddYakitScriptPageInfo} from "@/defaultConstants/AddYakitScript"

import classNames from "classnames"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import styles from "./PluginHubList.module.scss"

interface HubListOwnProps extends HubListBaseProps {}
/** @name 我的插件 */
export const HubListOwn: React.FC<HubListOwnProps> = memo((props) => {
    const {hiddenFilter, isDetailList, hiddenDetailList, onPluginDetail} = props

    const divRef = useRef<HTMLDivElement>(null)
    const wrapperWidth = useListenWidth(divRef)
    const [inViewPort = true] = useInViewport(divRef)

    const userinfo = useStore((s) => s.userInfo)
    const isLogin = useMemo(() => userinfo.isLogin, [userinfo])
    const fetchIsLogin = useMemoizedFn(() => userinfo.isLogin)

    /** ---------- 列表相关变量 Start ---------- */
    const [loading, setLoading] = useState<boolean>(false)
    // 是否为获取列表第一页的加载状态
    const isInitLoading = useRef<boolean>(false)
    const hasMore = useRef<boolean>(true)

    // 列表无条件下的总数
    const [listTotal, setListTotal] = useState<number>(0)

    const [filterGroup, setFilterGroup] = useState<API.PluginsSearch[]>([])

    // 列表数据
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    // 全选
    const [allChecked, setAllChecked] = useState<boolean>(false)
    // 选中插件
    const [selectList, setSelectList] = useState<YakitPluginOnlineDetail[]>([])
    // 搜索条件
    const [search, setSearch, getSearch] = useGetSetState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters, getFilters] = useGetSetState<PluginFilterParams>({
        plugin_type: [],
        tags: [],
        status: [],
        plugin_private: []
    })

    const showIndex = useRef<number>(0)
    const setShowIndex = useMemoizedFn((index: number) => {
        showIndex.current = index
    })
    /** ---------- 列表相关变量 End ---------- */

    /** ---------- 列表相关方法 Start ---------- */
    // 刷新搜索条件数据和无条件列表总数
    const onRefreshFilterAndTotal = useDebounceFn(
        useMemoizedFn(() => {
            fetchInitTotal()
            fetchFilterGroup()
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        if (isLogin) {
            handleRefreshList(true)
        }
    }, [isLogin])
    useUpdateEffect(() => {
        if (inViewPort && fetchIsLogin()) {
            onRefreshFilterAndTotal()
        }
    }, [inViewPort])
    /** 搜索条件 */
    useUpdateEffect(() => {
        if (!fetchIsLogin()) return
        fetchList(true)
    }, [filters])

    // 选中搜索条件可能在搜索数据组中不存在时进行清除
    useEffect(() => {
        const {realFilter, updateFilterFlag} = excludeNoExistfilter(filters, filterGroup)
        if (updateFilterFlag) setFilters(realFilter)
    }, [filters, filterGroup])

    const fetchInitTotal = useMemoizedFn(() => {
        apiFetchMineList({page: 1, limit: 1}, true)
            .then((res) => {
                setListTotal(Number(res.pagemeta.total) || 0)
            })
            .catch(() => {})
    })

    // 搜索条件分组数据
    const fetchFilterGroup = useMemoizedFn(() => {
        apiFetchGroupStatisticsMine()
            .then((res) => {
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
                      page: response.pagemeta.page + 1,
                      limit: response.pagemeta.limit || 20
                  }

            const queryFilter = {...getFilters()}
            const queryFearch = {...getSearch()}
            const query: PluginsQueryProps = convertPluginsRequestParams(queryFilter, queryFearch, params)
            try {
                const res = await apiFetchMineList(query)
                if (!res.data) res.data = []
                const length = +res.pagemeta.page === 1 ? res.data.length : res.data.length + response.data.length
                hasMore.current = length < +res.pagemeta.total
                dispatch({
                    type: "add",
                    payload: {
                        response: {...res}
                    }
                })
                if (+res.pagemeta.page === 1) {
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
        handleRefreshList(true)
    })

    /** 单项勾选 */
    const optCheck = useMemoizedFn((data: YakitPluginOnlineDetail, value: boolean) => {
        // 全选情况时的取消勾选
        if (allChecked) {
            setSelectList(response.data.filter((item) => item.uuid !== data.uuid))
            setAllChecked(false)
            return
        }
        // 单项勾选回调
        if (value) {
            setSelectList([...selectList, data])
        } else {
            const newSelectList = selectList.filter((item) => item.uuid !== data.uuid)
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
            onCheck(false)
            setSearch(val)
            fetchList(true)
        }),
        {wait: 300, leading: true}
    ).run
    /** ---------- 列表相关方法 End ---------- */

    /** ---------- 通信监听 Start ---------- */
    // 刷新列表(是否刷新高级筛选数据)
    const handleRefreshList = useDebounceFn(
        useMemoizedFn((updateFilterGroup?: boolean) => {
            if (!fetchIsLogin()) return
            if (updateFilterGroup) fetchFilterGroup()
            fetchList(true)
        }),
        {wait: 200}
    ).run

    // 详情删除线上插件触发列表的局部更新
    const handleDetailDeleteToOnline = useMemoizedFn((info: string) => {
        if (!info) return
        try {
            const plugin: {name: string; uuid: string} = JSON.parse(info)
            if (!plugin.name && !plugin.uuid) return
            const index = selectList.findIndex((ele) => ele.uuid === plugin.uuid)
            const data: YakitPluginOnlineDetail = {
                ...DefaultOnlinePlugin,
                uuid: plugin.uuid || "",
                script_name: plugin.name || ""
            }
            if (index !== -1) {
                optCheck(data, false)
            }
            onRefreshFilterAndTotal()
            emiter.emit("ownDeleteToRecycleList")
            dispatch({
                type: "remove",
                payload: {
                    itemList: [data]
                }
            })
        } catch (error) {}
    })

    // 详情里改公开|私密后更新列表里的插件信息
    const handleChangeStatus = useMemoizedFn((content: string) => {
        if (!content) return
        try {
            const plugin: {name: string; uuid: string; is_private: boolean; status: number} = JSON.parse(content)
            if (!plugin.name && !plugin.uuid) return
            const el = response.data.find((ele) => ele.uuid === plugin.uuid)
            if (!el) return
            const data: YakitPluginOnlineDetail = {
                ...el,
                is_private: plugin.is_private,
                status: plugin.status
            }
            dispatch({
                type: "update",
                payload: {
                    item: data
                }
            })
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onRefreshOwnPluginList", handleRefreshList)
        emiter.on("detailDeleteOwnPlugin", handleDetailDeleteToOnline)
        emiter.on("detailChangeStatusOwnPlugin", handleChangeStatus)
        return () => {
            emiter.off("onRefreshOwnPluginList", handleRefreshList)
            emiter.off("detailDeleteOwnPlugin", handleDetailDeleteToOnline)
            emiter.off("detailChangeStatusOwnPlugin", handleChangeStatus)
        }
    }, [])
    /** ---------- 通信监听 Start ---------- */

    const listLength = useMemo(() => {
        return Number(response.pagemeta.total) || 0
    }, [response])
    const selectedNum = useMemo(() => {
        if (allChecked) return response.pagemeta.total
        else return selectList.length
    }, [allChecked, selectList, response.pagemeta.total])

    /** ---------- 下载插件 Start ---------- */
    useEffect(() => {
        // 批量下载的同名覆盖二次确认框缓存
        getRemoteValue(RemotePluginGV.BatchDownloadPluginSameNameOverlay)
            .then((res) => {
                batchSameNameCache.current = res === "true"
            })
            .catch((err) => {})
        // 单个下载的同名覆盖二次确认框缓存
        getRemoteValue(RemotePluginGV.SingleDownloadPluginSameNameOverlay)
            .then((res) => {
                singleSameNameCache.current = res === "true"
            })
            .catch((err) => {})
    }, [])

    // 单个下载
    const singleSameNameCache = useRef<boolean>(false)
    const [singleSameNameHint, setSingleSameNameHint] = useState<boolean>(false)
    const handleSingleSameNameHint = useMemoizedFn((isOK: boolean, cache: boolean) => {
        if (isOK) {
            singleSameNameCache.current = cache
            const data = singleDownload[singleDownload.length - 1]
            if (data) handleSingleDownload(data)
        } else {
            setSingleDownload((arr) => arr.slice(0, arr.length - 1))
        }
        setSingleSameNameHint(false)
    })
    // 单个下载的插件信息队列
    const [singleDownload, setSingleDownload] = useState<YakitPluginOnlineDetail[]>([])
    const onFooterExtraDownload = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        const findIndex = singleDownload.findIndex((item) => item.uuid === info.uuid)
        if (findIndex > -1) {
            yakitNotify("error", "该插件正在执行下载操作,请稍后再试")
            return
        }
        setSingleDownload((arr) => {
            arr.push(info)
            return [...arr]
        })

        grpcFetchLocalPluginDetail({Name: info.script_name, UUID: info.uuid}, true)
            .then((res) => {
                const {ScriptName, UUID} = res
                if (ScriptName === info.script_name && UUID !== info.uuid) {
                    if (!singleSameNameCache.current) {
                        if (singleSameNameHint) return
                        setSingleSameNameHint(true)
                        return
                    }
                }
                handleSingleDownload(info)
            })
            .catch((err) => {
                handleSingleDownload(info)
            })
    })
    // 单个插件下载
    const handleSingleDownload = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        grpcDownloadOnlinePlugin({uuid: info.uuid})
            .then((res) => {
                emiter.emit(
                    "editorLocalSaveToLocalList",
                    JSON.stringify({
                        id: Number(res.Id) || 0,
                        name: res.ScriptName,
                        uuid: res.UUID || ""
                    })
                )
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setSingleDownload((arr) => arr.filter((item) => item.uuid !== info.uuid))
                }, 50)
            })
    })

    const [allDownloadHint, setAllDownloadHint] = useState<boolean>(false)
    // 全部下载
    const handleAllDownload = useMemoizedFn(() => {
        if (allDownloadHint) return
        setAllDownloadHint(true)
    })

    const [batchDownloadLoading, setBatchDownloadLoading] = useState<boolean>(false)
    // 批量下载
    const handleBatchDownload = useMemoizedFn(() => {
        if (batchDownloadLoading) return

        let request: DownloadOnlinePluginsRequest = {}
        if (selectedNum > 0) {
            if (allChecked) {
                request = {
                    ...request,
                    ...convertDownloadOnlinePluginBatchRequestParams({...getFilters()}, {...getSearch()})
                }
            } else {
                request = {
                    ...request,
                    UUID: selectList.map((item) => item.uuid)
                }
            }
        }

        setBatchDownloadLoading(true)
        apiDownloadPluginMine(request)
            .then(() => {
                emiter.emit("onRefreshLocalPluginList", true)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    onCheck(false)
                    setBatchDownloadLoading(false)
                }, 200)
            })
    })

    const batchSameNameCache = useRef<boolean>(false)
    const [batchSameNameHint, setBatchSameNameHint] = useState<boolean>(false)
    const handleBatchSameNameHint = useMemoizedFn((isOK: boolean, cache: boolean) => {
        if (isOK) {
            batchSameNameCache.current = cache
            handleBatchDownloadPlugin()
        }
        setBatchSameNameHint(false)
    })

    const onHeaderExtraDownload = useMemoizedFn(() => {
        if (!batchSameNameCache.current) {
            if (batchSameNameHint) return
            setBatchSameNameHint(true)
            return
        }
        handleBatchDownloadPlugin()
    })
    const handleBatchDownloadPlugin = useMemoizedFn(() => {
        if (selectedNum > 0) {
            handleBatchDownload()
        } else {
            handleAllDownload()
        }
    })
    /** ---------- 下载插件 End ---------- */

    /** ---------- 删除插件 Start ---------- */
    useEffect(() => {
        // 删除插件的二次确认弹框
        getRemoteValue(RemotePluginGV.UserPluginRemoveCheck)
            .then((res) => {
                delHintCache.current = res === "true"
            })
            .catch((err) => {})
    }, [])

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
            let request: API.PluginsWhereDeleteRequest | undefined = undefined
            if (allChecked) {
                request = {...convertPluginsRequestParams(filters, search)}
            }
            if (!allChecked && selectedNum > 0) {
                request = {uuid: selectList.map((item) => item.uuid)}
            }
            await apiDeletePluginMine(request)
        } catch (error) {}
        onCheck(false)
        fetchFilterGroup()
        emiter.emit("ownDeleteToRecycleList")
        fetchList(true)
        setTimeout(() => {
            setBatchDelLoading(false)
        }, 200)
    })

    // 单个删除的插件信息队列
    const [singleDel, setSingleDel] = useState<YakitPluginOnlineDetail[]>([])
    const onFooterExtraDel = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        const findIndex = singleDel.findIndex((item) => item.uuid === info.uuid)
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
    const handleSingeDel = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        let request: API.PluginsWhereDeleteRequest = {
            uuid: [info.uuid]
        }
        apiDeletePluginMine(request)
            .then(() => {
                const index = selectList.findIndex((ele) => ele.uuid === info.uuid)
                if (index !== -1) {
                    optCheck(info, false)
                }
                onRefreshFilterAndTotal()
                emiter.emit("ownDeleteToRecycleList")
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
                    setSingleDel((arr) => arr.filter((item) => item.uuid !== info.uuid))
                }, 50)
            })
    })
    /** ---------- 删除插件 End ---------- */

    /** ---------- 单个操作(下载|改为公开/私密)的回调 Start ---------- */
    const optCallback = useMemoizedFn((type: string, info: YakitPluginOnlineDetail) => {
        if (type === "state") {
            dispatch({
                type: "update",
                payload: {
                    item: info
                }
            })
        }
    })
    /** ---------- 单个操作(下载|改为公开/私密)的回调 End ---------- */

    // 新建插件
    const onNewPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.AddYakitScript,
                params: {...defaultAddYakitScriptPageInfo, source: YakitRoute.Plugin_Hub}
            })
        )
    })

    /** ---------- 详情列表操作 Start ---------- */
    // 进入插件详情
    const onOptClick = useMemoizedFn((info: YakitPluginOnlineDetail, index: number) => {
        if (!info.script_name && !info.uuid) {
            yakitNotify("error", "未获取到插件信息，请刷新列表重试")
            return
        }
        setShowIndex(index)
        onPluginDetail({type: "own", name: info.script_name, uuid: info.uuid, isCorePlugin: !!info.isCorePlugin})
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

    /** 详情条件搜索 */
    const onDetailFilter = useMemoizedFn((value: PluginFilterParams) => {
        onCheck(false)
        setFilters(value)
        fetchList(true)
    })

    // 详情单项副标题
    const detailOptSubTitle = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        return info.is_private ? <SolidPrivatepluginIcon className='icon-svg-16' /> : statusTag[`${info.status}`]
    })
    /** ---------- 详情列表操作 End ---------- */

    // 批量的删除和还原
    const headerExtra = () => {
        return (
            <div className={styles["hub-list-header-extra"]}>
                <HubButton
                    width={wrapperWidth}
                    iconWidth={900}
                    icon={<OutlineClouddownloadIcon />}
                    type='outline2'
                    size='large'
                    name={selectedNum > 0 ? "下载" : "一键下载"}
                    loading={batchDownloadLoading}
                    disabled={listTotal === 0}
                    onClick={onHeaderExtraDownload}
                />
                <HubButton
                    width={wrapperWidth}
                    iconWidth={900}
                    icon={<OutlineTrashIcon />}
                    size='large'
                    name={selectedNum > 0 ? "删除" : "清空"}
                    disabled={listTotal === 0}
                    loading={batchDelLoading}
                    onClick={onHeaderExtraDel}
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
        )
    }
    // 单项副标题
    const optSubTitle = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        return <>{info.is_private ? <SolidPrivatepluginIcon /> : statusTag[`${info.status}`]}</>
    })
    // 单项的下载|分享|改为公开/私密|删除
    const extraFooter = (info: YakitPluginOnlineDetail) => {
        return (
            <OwnOptFooterExtra
                isLogin={isLogin}
                info={info}
                execDownloadInfo={singleDownload}
                onDownload={onFooterExtraDownload}
                execDelInfo={singleDel}
                onDel={onFooterExtraDel}
                callback={optCallback}
            />
        )
    }

    return (
        <div
            className={classNames(styles["plugin-hub-tab-list"], {
                [styles["plugin-hub-tab-detail-list"]]: isDetailList && !hiddenDetailList && !isLogin
            })}
        >
            <OnlineJudgment isJudgingLogin={true}>
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
                            />
                        </div>

                        <div className={styles["list-body"]}>
                            <HubOuterList
                                title='我的插件'
                                headerExtra={headerExtra()}
                                allChecked={allChecked}
                                setAllChecked={onCheck}
                                total={response.pagemeta.total}
                                selected={selectedNum}
                                search={search}
                                setSearch={setSearch}
                                onSearch={onSearch}
                                filters={filters as Record<string, API.PluginsSearchData[]>}
                                setFilters={setFilters}
                            >
                                {listLength > 0 ? (
                                    <HubGridList
                                        data={response.data}
                                        keyName='uuid'
                                        loading={loading}
                                        hasMore={hasMore.current}
                                        updateList={onUpdateList}
                                        showIndex={showIndex.current}
                                        setShowIndex={setShowIndex}
                                        gridNode={(info) => {
                                            const {index, data} = info
                                            const check =
                                                allChecked ||
                                                selectList.findIndex((ele) => ele.uuid === data.uuid) !== -1
                                            return (
                                                <HubGridOpt
                                                    order={index}
                                                    info={data}
                                                    checked={check}
                                                    onCheck={optCheck}
                                                    title={data.script_name}
                                                    type={data.type}
                                                    tags={data.tags}
                                                    help={data.help || ""}
                                                    img={data.head_img || ""}
                                                    user={data.authors || ""}
                                                    prImgs={(data.collaborator || []).map((ele) => ele.head_img)}
                                                    time={data.updated_at}
                                                    isCorePlugin={!!data.isCorePlugin}
                                                    official={!!data.official}
                                                    subTitle={optSubTitle}
                                                    extraFooter={extraFooter}
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
                                            <YakitButton
                                                type='outline1'
                                                icon={<OutlinePlusIcon />}
                                                onClick={onNewPlugin}
                                            >
                                                新建插件
                                            </YakitButton>
                                            <YakitButton
                                                type='outline1'
                                                icon={<OutlineRefreshIcon />}
                                                onClick={onRefresh}
                                            >
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
                            checked={allChecked}
                            onCheck={onCheck}
                            total={listLength}
                            selected={selectedNum}
                            filterExtra={
                                <div className={styles["hub-detail-list-extra"]}>
                                    <FilterPopoverBtn defaultFilter={filters} onFilter={onDetailFilter} type='user' />
                                    <div className={styles["divider-style"]}></div>
                                    <Tooltip
                                        title={selectedNum > 0 ? "下载" : "一键下载"}
                                        overlayClassName='plugins-tooltip'
                                    >
                                        <YakitButton
                                            type='text2'
                                            loading={batchDownloadLoading}
                                            disabled={listTotal === 0}
                                            icon={<OutlineClouddownloadIcon />}
                                            onClick={onHeaderExtraDownload}
                                        />
                                    </Tooltip>
                                    {/* <div className={styles["divider-style"]}></div>
                                    <Tooltip
                                        title={selectedNum > 0 ? "删除" : "清空"}
                                        overlayClassName='plugins-tooltip'
                                    >
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
                            listProps={{
                                rowKey: "uuid",
                                numberRoll: scrollTo,
                                data: response.data,
                                loadMoreData: onUpdateList,
                                classNameRow: styles["hub-detail-list-opt"],
                                renderRow: (info, i) => {
                                    const check =
                                        allChecked || selectList.findIndex((item) => item.uuid === info.uuid) !== -1
                                    return (
                                        <HubDetailListOpt
                                            order={i}
                                            plugin={info}
                                            check={check}
                                            headImg={info.head_img}
                                            pluginName={info.script_name}
                                            help={info.help}
                                            content={info.content}
                                            optCheck={optCheck}
                                            official={info.official}
                                            isCorePlugin={!!info.isCorePlugin}
                                            pluginType={info.type}
                                            extra={detailOptSubTitle}
                                            onPluginClick={onOptClick}
                                        />
                                    )
                                },
                                page: response.pagemeta.page,
                                hasMore: hasMore.current,
                                loading: loading,
                                defItemHeight: 46,
                                isRef: loading && isInitLoading.current
                            }}
                            spinLoading={loading && isInitLoading.current}
                        />
                    </div>
                )}
            </OnlineJudgment>

            <NoPromptHint
                visible={delHint}
                title='是否要删除插件'
                content={PluginOperateHint["delOnline"]}
                cacheKey={RemotePluginGV.UserPluginRemoveCheck}
                onCallback={delHintCallback}
            />

            {allDownloadHint && (
                <YakitGetOnlinePlugin
                    visible={allDownloadHint}
                    setVisible={() => setAllDownloadHint(false)}
                    listType='mine'
                />
            )}

            {/* 批量下载同名覆盖提示 */}
            <NoPromptHint
                visible={batchSameNameHint}
                title='同名覆盖提示'
                content='如果本地存在同名插件会直接进行覆盖'
                cacheKey={RemotePluginGV.BatchDownloadPluginSameNameOverlay}
                onCallback={handleBatchSameNameHint}
            />

            {/* 单个下载同名覆盖提示 */}
            <NoPromptHint
                visible={singleSameNameHint}
                title='同名覆盖提示'
                content='本地有插件同名，下载将会覆盖，是否下载'
                cacheKey={RemotePluginGV.SingleDownloadPluginSameNameOverlay}
                onCallback={handleSingleSameNameHint}
            />
        </div>
    )
})
