import React, {memo, useEffect, useMemo, useReducer, useRef, useState} from "react"
import {PluginsContainer, PluginsLayout, statusTag} from "../baseTemplate"
import {
    AuthorImg,
    FuncBtn,
    FuncFilterPopover,
    FuncSearch,
    GridLayoutOpt,
    ListLayoutOpt,
    ListShowContainer,
    PluginsList,
    TypeSelect
} from "../funcTemplate"
import {TypeSelectOpt} from "../funcTemplateType"
import {
    OutlineClouddownloadIcon,
    OutlineDotshorizontalIcon,
    OutlinePencilaltIcon,
    OutlineRefreshIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useDebounceFn, useGetState, useInViewport, useLatest, useLockFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Form} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {BackInfoProps, DetailRefProps, PluginManageDetail} from "./PluginManageDetail"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {yakitNotify} from "@/utils/notification"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {
    DownloadOnlinePluginsRequest,
    PluginsQueryProps,
    apiDeletePluginCheck,
    apiDownloadPluginCheck,
    apiFetchCheckList,
    apiFetchGroupStatisticsCheck,
    convertDownloadOnlinePluginBatchRequestParams,
    convertPluginsRequestParams,
    excludeNoExistfilter
} from "../utils"
import {isCommunityEdition, isEnpriTrace, isEnpriTraceAgent, shouldVerifyEnpriTraceLogin} from "@/utils/envfile"
import {NetWorkApi} from "@/services/fetch"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {DefaultStatusList, PluginGV, defaultPagemeta, defaultSearch} from "../builtInData"
import {useStore} from "@/store"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRouteConstants"
import {PluginGroupList} from "../local/PluginsLocalType"

interface PluginManageProps {}

export const PluginManage: React.FC<PluginManageProps> = (props) => {
    // 判断该页面-用户是否可见状态
    const layoutRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(layoutRef)
    // 初始时，数据是否为空，为空展示空数据时的UI
    const [initTotal, setInitTotal] = useState<number>(0)
    const getInitTotal = useMemoizedFn(() => {
        apiFetchCheckList({page: 1, limit: 50}).then((res) => {
            setInitTotal(+res.pagemeta.total)
        })
    })
    // 由不可见变为可见时，刷新总数统计和筛选条件数据
    useUpdateEffect(() => {
        getInitTotal()
        onInit(true)
    }, [inViewPort])

    // 用户信息
    const {userInfo} = useStore()

    // 获取插件列表数据-相关逻辑
    /** 是否为加载更多 */
    const [loading, setLoading] = useGetState<boolean>(false)
    const latestLoadingRef = useLatest(loading)
    /** 是否为首屏加载 */
    const isLoadingRef = useRef<boolean>(true)

    const [showFilter, setShowFilter] = useState<boolean>(true)
    // 获取筛选栏展示状态
    useEffect(() => {
        getRemoteValue(PluginGV.AuditFilterCloseStatus).then((value: string) => {
            if (value === "true") setShowFilter(true)
            if (value === "false") setShowFilter(false)
        })
    }, [])
    const onSetShowFilter = useMemoizedFn((v) => {
        setRemoteValue(PluginGV.AuditFilterCloseStatus, `${v}`)
        setShowFilter(v)
    })

    const [filters, setFilters] = useState<PluginFilterParams>({
        plugin_type: [],
        status: [],
        tags: [],
        plugin_group: []
    })
    /** 首页顶部的审核状态组件选中情况 */
    const pluginStatusSelect: TypeSelectOpt[] = useMemo(() => {
        return (
            filters.status?.map((ele) => ({
                key: ele.value,
                name: ele.label
            })) || []
        )
    }, [filters.status])
    const [searchs, setSearchs] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [hasMore, setHasMore] = useState<boolean>(true)

    // 获取插件列表数据
    const fetchList = useDebounceFn(
        useMemoizedFn((reset?: boolean) => {
            // 从详情页返回不进行搜索
            if (isDetailBack.current) {
                isDetailBack.current = false
                return
            }

            if (latestLoadingRef.current) return
            if (reset) {
                isLoadingRef.current = true
                onCheck(false)
                setShowPluginIndex(0)
            }

            setLoading(true)
            const params: PluginListPageMeta = !!reset
                ? {...defaultPagemeta}
                : {
                      page: response.pagemeta.page + 1,
                      limit: response.pagemeta.limit || 20
                  }
            // api接口请求参数
            const query: PluginsQueryProps = {...convertPluginsRequestParams({...filters}, searchs, params)}

            apiFetchCheckList(query)
                .then((res) => {
                    if (!res.data) res.data = []
                    dispatch({
                        type: "add",
                        payload: {
                            response: {...res}
                        }
                    })

                    const dataLength = +res.pagemeta.page === 1 ? res.data : response.data.concat(res.data)
                    const isMore = res.data.length < res.pagemeta.limit || dataLength.length >= res.pagemeta.total
                    setHasMore(!isMore)

                    isLoadingRef.current = false
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                })
        }),
        {wait: 300}
    ).run

    const [pluginFilters, setPluginFilters] = useState<PluginGroupList[]>([])
    // 获取所有过滤条件统计数据
    const fetchPluginFilters = useMemoizedFn(() => {
        apiFetchGroupStatisticsCheck().then((res) => {
            setPluginFilters(res.data)
        })
    })

    /**
     * @name 数据初始化
     * @param noRefresh 初始化时不刷新列表数据
     */
    const onInit = useMemoizedFn((noRefresh?: boolean) => {
        fetchPluginFilters()
        if (!noRefresh) fetchList(true)
    })

    // 页面初始化的首次列表请求
    useEffect(() => {
        getInitTotal()
        onInit()
    }, [])
    // 滚动更多加载
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })

    // 关键词|作者搜索
    const onKeywordAndUser = useMemoizedFn((value: PluginSearchParams) => {
        fetchList(true)
    })

    // 当filters过滤条件被其他页面或者意外删掉，插件列表却带了该过滤条件的情况，切换到该页面时需要把被删掉的过滤条件排除
    useEffect(() => {
        const {realFilter, updateFilterFlag} = excludeNoExistfilter(filters, pluginFilters)
        if (updateFilterFlag) {
            setFilters(realFilter)
        }
    }, [filters, pluginFilters])

    // 过滤条件搜索
    useUpdateEffect(() => {
        fetchList(true)
    }, [filters])
    const onFilter = useMemoizedFn((value: Record<string, API.PluginsSearchData[]>) => {
        setFilters({...value})
    })
    const onSetActive = useMemoizedFn((status: TypeSelectOpt[]) => {
        const newStatus: API.PluginsSearchData[] = status.map((ele) => ({
            value: ele.key,
            label: ele.name,
            count: 0
        }))
        setFilters({...filters, status: newStatus})
    })

    // ----- 选中插件 -----
    const [allCheck, setAllcheck] = useState<boolean>(false)
    const [selectList, setSelectList, getSelectList] = useGetState<YakitPluginOnlineDetail[]>([])
    // 选中插件的uuid集合
    const selectUUIDs = useMemo(() => {
        return getSelectList().map((item) => item.uuid)
    }, [selectList])
    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])
    // 全选|取消全选
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllcheck(value)
    })

    // 清空选中并刷新列表
    const onClearSelecteds = useMemoizedFn(() => {
        if (allCheck) setAllcheck(false)
        setSelectList([])
        onInit()
    })

    /** 修改作者按钮展示状态 */
    const showAuthState = useMemo(() => {
        if (userInfo.role === "superAdmin") {
            if (isCommunityEdition()) return true
            else return false
        }
        if (userInfo.role === "admin") {
            if (isCommunityEdition()) return true
            if (isEnpriTrace()) return true
            if (isEnpriTraceAgent()) return true
            return false
        }
        return false
    }, [userInfo.role])
    /** 批量修改插件作者 */
    const [showModifyAuthor, setShowModifyAuthor] = useState<boolean>(false)
    const onShowModifyAuthor = useMemoizedFn(() => {
        setShowModifyAuthor(true)
    })
    const onModifyAuthor = useMemoizedFn(() => {
        setShowModifyAuthor(false)
        onCheck(false)
        fetchList(true)
    })

    /** 批量下载插件 */
    const [showBatchDownload, setShowBatchDownload] = useState<boolean>(false)
    const [downloadLoading, setDownloadLoading] = useState<boolean>(false)
    // 批量下载(首页批量下载和详情批量下载共用一个方法)
    const onBatchDownload = useMemoizedFn((newParams?: BackInfoProps) => {
        // 选中插件数量
        let selectTotal: number = selectNum
        // 选中插件UUID
        let selectUuids: string[] = [...selectUUIDs]
        // 搜索内容
        let downloadSearch: PluginSearchParams = {...searchs}
        // 搜索筛选条件
        let downloadFilter: PluginFilterParams = {...filters}

        if (newParams) {
            selectTotal = newParams.allCheck ? response.pagemeta.total : newParams.selectList.length
            selectUuids = newParams.selectList.map((item) => item.uuid)
            downloadSearch = {...newParams.search}
            downloadFilter = {...newParams.filter}
        }

        if (selectTotal === 0) {
            // 全部下载
            setShowBatchDownload(true)
        } else {
            // 批量下载
            let downloadRequest: DownloadOnlinePluginsRequest = {}
            if (allCheck) {
                downloadRequest = {...convertDownloadOnlinePluginBatchRequestParams(downloadFilter, downloadSearch)}
            } else {
                downloadRequest = {
                    UUID: selectUuids
                }
            }
            if (downloadLoading) return
            setDownloadLoading(true)
            apiDownloadPluginCheck(downloadRequest)
                .then(() => {
                    onCheck(false)
                })
                .finally(() => {
                    setTimeout(() => {
                        setDownloadLoading(false)
                    }, 200)
                })
        }
    })
    /** 单个插件下载 */
    const onDownload = useLockFn(async (value: YakitPluginOnlineDetail) => {
        let downloadRequest: DownloadOnlinePluginsRequest = {
            UUID: [value.uuid]
        }

        apiDownloadPluginCheck(downloadRequest).then(() => {})
    })

    /** 批量删除插件 */
    // 原因窗口(删除|不通过)
    const [showReason, setShowReason] = useState<{visible: boolean; type: "nopass" | "del"}>({
        visible: false,
        type: "nopass"
    })
    // 单项插件删除
    const activeDelPlugin = useRef<YakitPluginOnlineDetail>()
    const onShowDelPlugin = useMemoizedFn(() => {
        setShowReason({visible: true, type: "del"})
    })
    const onCancelReason = useMemoizedFn(() => {
        activeDelPlugin.current = undefined
        activeDetailData.current = undefined
        setShowReason({visible: false, type: "nopass"})
    })
    // 删除插件集合接口
    const apiDelPlugins = useMemoizedFn(
        (params?: API.PluginsWhereDeleteRequest, thenCallback?: () => any, catchCallback?: () => any) => {
            apiDeletePluginCheck(params)
                .then(() => {
                    if (thenCallback) thenCallback()
                })
                .catch((e) => {
                    if (detailRef && detailRef.current) {
                        detailRef.current.onDelCallback([], false)
                    }
                    if (catchCallback) catchCallback()
                })
        }
    )
    // 删除插件(首页批量|清空|单个|详情内删除共用一个方法)
    const onReasonCallback = useMemoizedFn((reason: string) => {
        const type = showReason.type

        // 是否全选
        let delAllCheck: boolean = allCheck
        // 选中插件数量
        let selectTotal: number = selectNum
        // 选中插件UUID
        let selectUuids: string[] = [...selectUUIDs]
        // 搜索内容
        let delSearch: PluginSearchParams = {...searchs}
        // 搜索筛选条件
        let delFilter: PluginFilterParams = {...filters}

        // 如果是从详情页过来的回调事件
        if (activeDetailData.current) {
            delAllCheck = activeDetailData.current.allCheck
            selectTotal = activeDetailData.current.allCheck
                ? response.pagemeta.total
                : activeDetailData.current.selectList.length
            selectUuids = activeDetailData.current.selectList.map((item) => item.uuid)
            delSearch = {...activeDetailData.current.search}
            delFilter = {...activeDetailData.current.filter}
        }

        // 获取单个删除插件的信息
        const onlyPlugin: YakitPluginOnlineDetail | undefined = activeDelPlugin.current
        onCancelReason()

        // 删除插件逻辑
        if (type === "del") {
            // 清空操作(无视搜索条件)
            if (selectTotal === 0 && !onlyPlugin) {
                apiDelPlugins({description: reason}, () => {
                    setSearchs({...delSearch})
                    setFilters({...delFilter})
                    onClearSelecteds()
                    if (!!plugin) setPlugin(undefined)
                })
            }
            // 单个删除
            else if (!!onlyPlugin) {
                let delRequest: API.PluginsWhereDeleteRequest = {uuid: [onlyPlugin.uuid]}
                apiDelPlugins({...delRequest, description: reason}, () => {
                    // 当前

                    const next: YakitPluginOnlineDetail = response.data[showPluginIndex.current + 1]
                    dispatch({
                        type: "remove",
                        payload: {
                            itemList: [onlyPlugin]
                        }
                    })

                    if (!!plugin) {
                        // 将删除结果回传到详情页
                        if (detailRef && detailRef.current) {
                            detailRef.current.onDelCallback([onlyPlugin], true)
                        }
                        setPlugin({...next})
                    } else {
                        // 首页的单独删除
                        const index = selectUUIDs.findIndex((item) => item === onlyPlugin?.uuid)
                        if (index > -1) {
                            optCheck(onlyPlugin, false)
                        }
                    }
                    onInit(true)
                })
            }
            // 批量删除
            // 详情的批量删除成功后自动返回首页
            else if (!activeDelPlugin.current) {
                let delRequest: API.PluginsWhereDeleteRequest = {}
                if (delAllCheck) {
                    delRequest = {...convertPluginsRequestParams(delFilter, delSearch), description: reason}
                } else {
                    delRequest = {uuid: selectUuids, description: reason}
                }
                apiDelPlugins(delRequest, () => {
                    setSearchs({...delSearch})
                    setFilters({...delFilter})
                    onClearSelecteds()
                    // 以前详情页的逻辑
                    if (!!plugin) setPlugin(undefined)
                })
            }
        }
    })

    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(false)

    // 当前展示的插件序列
    const showPluginIndex = useRef<number>(0)
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    /** 管理分组展示状态 */
    const magGroupState = useMemo(() => {
        if (["admin", "superAdmin"].includes(userInfo.role || "")) return true
        else return false
    }, [userInfo.role])

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail | undefined>()

    // 单项组件-相关操作和展示组件逻辑
    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakitPluginOnlineDetail, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.data.filter((item) => item.uuid !== data.uuid))
            setAllcheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...getSelectList(), data])
        else setSelectList(getSelectList().filter((item) => item.uuid !== data.uuid))
    })
    /** 单项副标题组件 */
    const optSubTitle = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return statusTag[`${data.status}`]
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return (
            <FuncFilterPopover
                icon={<OutlineDotshorizontalIcon />}
                menu={{
                    data: [
                        {
                            key: "download",
                            label: "下载",
                            itemIcon: <OutlineClouddownloadIcon />
                        },
                        {type: "divider"},
                        {
                            key: "del",
                            label: "删除",
                            type: "danger",
                            itemIcon: <OutlineTrashIcon />
                        }
                    ],
                    className: styles["func-filter-dropdown-menu"],
                    onClick: ({key}) => {
                        switch (key) {
                            case "del":
                                activeDelPlugin.current = data
                                setShowReason({visible: true, type: "del"})
                                return
                            case "download":
                                onDownload(data)
                                return
                            default:
                                return
                        }
                    }
                }}
                button={{
                    type: "text2"
                }}
                placement='bottomRight'
            />
        )
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
        setPlugin({...data})
        setShowPluginIndex(index)
    })

    // 详情页-相关回调逻辑
    const detailRef = useRef<DetailRefProps>(null)
    // 是否从详情页返回的
    const isDetailBack = useRef<boolean>(false)
    /** 返回事件 */
    const onBack = useMemoizedFn((data: BackInfoProps) => {
        isDetailBack.current = true
        setPlugin(undefined)
        setAllcheck(data.allCheck)
        setSelectList(data.selectList)
        setSearchs(data.search)
        setFilters(data.filter)
    })
    /** 搜索事件 */
    const onDetailSearch = useMemoizedFn((detailSearch: PluginSearchParams, detailFilter: PluginFilterParams) => {
        setSearchs({...detailSearch})
        // 延时是防止同时赋值后的搜索拿不到最新的搜索条件数据
        setTimeout(() => {
            setFilters({...detailFilter})
        }, 100)
    })
    /** 删除插件事件 */
    const activeDetailData = useRef<BackInfoProps>()
    const onDetailDel = useMemoizedFn((detail: YakitPluginOnlineDetail | undefined, data: BackInfoProps) => {
        activeDelPlugin.current = detail
        activeDetailData.current = {...data}
        onShowDelPlugin()
    })
    /**初始数据为空的时候,刷新按钮,刷新列表和初始total,以及分组数据 */
    const onRefListAndTotalAndGroup = useMemoizedFn(() => {
        getInitTotal()
        fetchList(true)
        fetchPluginFilters()
    })
    return (
        <div ref={layoutRef} className={styles["plugin-manage-layout"]}>
            {!!plugin && (
                <PluginManageDetail
                    ref={detailRef}
                    spinLoading={isLoadingRef.current && loading}
                    listLoading={loading}
                    response={response}
                    dispatch={dispatch}
                    info={plugin}
                    defaultAllCheck={allCheck}
                    defaultSelectList={selectList}
                    defaultSearch={searchs}
                    defaultFilter={filters}
                    downloadLoading={downloadLoading}
                    onBatchDownload={onBatchDownload}
                    onPluginDel={onDetailDel}
                    currentIndex={showPluginIndex.current}
                    setCurrentIndex={setShowPluginIndex}
                    onBack={onBack}
                    loadMoreData={onUpdateList}
                    onDetailSearch={onDetailSearch}
                />
            )}

            <PluginsLayout
                title='插件管理'
                hidden={!!plugin}
                subTitle={<TypeSelect active={pluginStatusSelect} list={DefaultStatusList} setActive={onSetActive} />}
                extraHeader={
                    <div className='extra-header-wrapper'>
                        <FuncSearch maxWidth={1000} value={searchs} onSearch={onKeywordAndUser} onChange={setSearchs} />
                        <div className='divider-style'></div>
                        <div className='btn-group-wrapper'>
                            {showAuthState && (
                                <FuncBtn
                                    maxWidth={1150}
                                    icon={<OutlinePencilaltIcon />}
                                    disabled={selectNum === 0 && !allCheck}
                                    type='outline2'
                                    size='large'
                                    name={"修改作者"}
                                    onClick={onShowModifyAuthor}
                                />
                            )}
                            <FuncBtn
                                maxWidth={1150}
                                icon={<OutlineClouddownloadIcon />}
                                type='outline2'
                                size='large'
                                loading={downloadLoading}
                                name={selectNum > 0 ? "下载" : "一键下载"}
                                onClick={() => onBatchDownload()}
                                disabled={initTotal === 0}
                            />
                            <FuncBtn
                                maxWidth={1150}
                                icon={<OutlineTrashIcon />}
                                type='outline2'
                                size='large'
                                name={selectNum > 0 ? "删除" : "清空"}
                                onClick={onShowDelPlugin}
                                disabled={initTotal === 0}
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
                    onSelect={onFilter}
                    groupList={pluginFilters.map((item) => {
                        if (item.groupKey === "plugin_group") {
                            item.groupExtraOptBtn = magGroupState ? (
                                <>
                                {(shouldVerifyEnpriTraceLogin()&&userInfo.role === "admin")||!shouldVerifyEnpriTraceLogin()?<>
                                    <YakitButton
                                        type='text'
                                        onClick={() =>
                                            emiter.emit(
                                                "openPage",
                                                JSON.stringify({
                                                    route: YakitRoute.Plugin_Groups,
                                                    params: {pluginGroupType: "online"}
                                                })
                                            )
                                        }
                                    >
                                        管理分组
                                    </YakitButton>
                                    <div className={styles["divider-style"]} />
                                </>:<></>}
                                </>
                            ) : (
                                <></>
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
                        total={response.pagemeta.total}
                        selected={selectNum}
                        filters={filters}
                        setFilters={setFilters}
                        visible={showFilter}
                        setVisible={onSetShowFilter}
                    >
                        {initTotal > 0 ? (
                            <ListShowContainer<YakitPluginOnlineDetail>
                                id='pluginManage'
                                isList={isList}
                                data={response.data}
                                gridNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectUUIDs.includes(data.uuid)
                                    return (
                                        <GridLayoutOpt
                                            order={index}
                                            data={data}
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
                                            official={data.official}
                                            subTitle={optSubTitle}
                                            extraFooter={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                gridHeight={226}
                                listNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectUUIDs.includes(data.uuid)
                                    return (
                                        <ListLayoutOpt
                                            order={index}
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            img={data.head_img}
                                            title={info.index + data.script_name}
                                            help={data.help || ""}
                                            time={data.updated_at}
                                            type={""}
                                            isCorePlugin={!!data.isCorePlugin}
                                            official={data.official}
                                            subTitle={optSubTitle}
                                            extraNode={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                listHeight={73}
                                loading={loading}
                                hasMore={hasMore}
                                updateList={onUpdateList}
                                showIndex={showPluginIndex.current}
                                setShowIndex={setShowPluginIndex}
                                isShowSearchResultEmpty={+response.pagemeta.total === 0}
                            />
                        ) : (
                            <div className={styles["plugin-manage-empty"]}>
                                <YakitEmpty title='暂无数据' />

                                <div className={styles["plugin-manage-buttons"]}>
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

            <ModifyAuthorModal
                visible={showModifyAuthor}
                setVisible={setShowModifyAuthor}
                plugins={selectUUIDs}
                onOK={onModifyAuthor}
            />
            <ReasonModal
                visible={showReason.visible}
                setVisible={onCancelReason}
                type={showReason.type}
                total={!!activeDelPlugin.current ? 1 : selectNum || response.pagemeta.total}
                onOK={onReasonCallback}
            />
            {showBatchDownload && (
                <YakitGetOnlinePlugin
                    listType='check'
                    visible={showBatchDownload}
                    setVisible={(v) => {
                        setShowBatchDownload(v)
                    }}
                />
            )}
        </div>
    )
}

interface ModifyAuthorModalProps {
    visible: boolean
    setVisible: (show: boolean) => any
    plugins: string[]
    onOK: () => any
}
/** @name 批量修改插件作者 */
const ModifyAuthorModal: React.FC<ModifyAuthorModalProps> = memo((props) => {
    const {visible, setVisible, plugins, onOK} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [list, setList] = useState<API.UserList[]>([])
    const [value, setValue] = useState<number>()
    const onsearch = useDebounceFn(
        (value?: string) => {
            if (!value) {
                setList([])
                return
            }
            if (loading) return

            setLoading(true)
            NetWorkApi<{keywords: string}, API.UserOrdinaryResponse>({
                method: "get",
                url: "user/ordinary",
                params: {keywords: value}
            })
                .then((res) => {
                    setList(res?.data || [])
                })
                .catch((err) => {
                    yakitNotify("error", "获取普通用户失败：" + err)
                })
                .finally(() => {
                    setTimeout(() => setLoading(false), 200)
                })
        },
        {
            wait: 500
        }
    ).run

    const [submitLoading, setSubmitLoading] = useState<boolean>(false)
    const [status, setStatus] = useState<"" | "error">("")
    const submit = useMemoizedFn(() => {
        if (!value) {
            setStatus("error")
            return
        }

        setSubmitLoading(true)
        NetWorkApi<API.UpPluginsUserRequest, API.ActionSucceeded>({
            method: "post",
            url: "up/plugins/user",
            data: {uuid: plugins, user_id: +value || 0}
        })
            .then((res) => {
                onOK()
            })
            .catch((err) => {
                yakitNotify("error", "批量修改失败，原因:" + err)
            })
            .finally(() => {
                setTimeout(() => setSubmitLoading(false), 200)
            })
    })
    const cancel = useMemoizedFn(() => {
        if (submitLoading) return
        setVisible(false)
    })

    useEffect(() => {
        if (!visible) {
            setList([])
            setValue(undefined)
            setStatus("")
            setSubmitLoading(false)
        }
    }, [visible])

    return (
        <YakitModal
            title='批量修改插件作者'
            width={448}
            type='white'
            centered={true}
            closable={true}
            keyboard={false}
            visible={visible}
            cancelButtonProps={{loading: submitLoading}}
            confirmLoading={submitLoading}
            onCancel={cancel}
            onOk={submit}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["modify-author-modal-body"]}>
                <Form.Item
                    labelCol={{span: 24}}
                    label={<>作者：</>}
                    help={
                        <>
                            共选择了 <span className={styles["modify-author-hint-span"]}>{plugins.length || 0}</span>{" "}
                            个插件
                        </>
                    }
                    validateStatus={status}
                >
                    <YakitSelect
                        placeholder='请输入用户名进行搜索'
                        showArrow={false}
                        showSearch={true}
                        filterOption={false}
                        notFoundContent={loading ? <YakitSpin spinning={true} size='small' /> : ""}
                        allowClear={true}
                        value={value}
                        onSearch={onsearch}
                        onChange={(value, option: any) => {
                            setValue(value)
                            if (value) setStatus("")
                        }}
                    >
                        {list.map((item) => (
                            <YakitSelect.Option key={item.name} value={item.id} record={item}>
                                <div className={styles["modify-author-item-wrapper"]}>
                                    <AuthorImg size='small' src={item.head_img || ""} />
                                    {item.name}
                                </div>
                            </YakitSelect.Option>
                        ))}
                    </YakitSelect>
                </Form.Item>
            </div>
        </YakitModal>
    )
})

interface ReasonModalProps {
    visible: boolean
    setVisible: () => any
    type?: string
    total?: number
    onOK: (reason: string) => any
}
/** @name 原因说明 */
export const ReasonModal: React.FC<ReasonModalProps> = memo((props) => {
    const {visible, setVisible, type = "nopass", total, onOK} = props

    const title = useMemo(() => {
        if (type === "nopass") return "不通过原因"
        if (type === "del") return "删除原因"
        return "未知错误窗口,请关闭重试!"
    }, [type])

    useEffect(() => {
        if (!visible) setValue("")
    }, [visible])

    const [value, setValue] = useState<string>("")
    const onSubmit = useMemoizedFn(() => {
        if (!value) {
            yakitNotify("error", "请输入删除原因!")
            return
        }
        onOK(value)
    })

    return (
        <YakitModal
            title={title}
            width={448}
            type='white'
            centered={true}
            closable={true}
            maskClosable={false}
            keyboard={false}
            visible={visible}
            onCancel={setVisible}
            onOk={onSubmit}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["reason-modal-body"]}>
                <YakitInput.TextArea
                    autoSize={{minRows: 3, maxRows: 3}}
                    showCount
                    value={value}
                    maxLength={150}
                    onChange={(e) => setValue(e.target.value)}
                />
                {total && (
                    <div className={styles["hint-wrapper"]}>
                        共选择了 <span className={styles["total-num"]}>{total || 0}</span> 个插件
                    </div>
                )}
            </div>
        </YakitModal>
    )
})
