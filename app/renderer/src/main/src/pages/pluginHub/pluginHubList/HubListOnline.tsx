import React, {memo, useRef, useMemo, useState, useReducer, useEffect} from "react"
import {useMemoizedFn, useDebounceFn, useUpdateEffect, useInViewport} from "ahooks"
import {OutlineRefreshIcon, OutlineClouddownloadIcon, OutlineClouduploadIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {PluginSearchParams, PluginListPageMeta, PluginFilterParams} from "@/pages/plugins/baseTemplateType"
import {defaultSearch} from "@/pages/plugins/builtInData"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {pluginOnlineReducer, initialOnlineState} from "@/pages/plugins/pluginReducer"
import {
    PluginsQueryProps,
    convertPluginsRequestParams,
    DownloadOnlinePluginsRequest,
    convertDownloadOnlinePluginBatchRequestParams,
    apiDownloadPluginOnline,
    apiFetchOnlineList,
    apiFetchGroupStatisticsOnline,
    excludeNoExistfilter
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
    OnlineOptFooterExtra,
    HubDetailList,
    HubDetailListOpt,
    PluginsUploadHint
} from "./funcTemplate"
import {useStore} from "@/store"
import {OnlineJudgment} from "@/pages/plugins/onlineJudgment/OnlineJudgment"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {HubListBaseProps} from "../type"
import {API} from "@/services/swagger/resposeType"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {
    PluginGroup,
    TagsAndGroupRender,
    YakFilterRemoteObj,
    YakitGetOnlinePlugin
} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {isCommunityEdition} from "@/utils/envfile"
import {FilterPopoverBtn} from "@/pages/plugins/funcTemplate"
import {Tooltip} from "antd"
import useGetSetState from "../hooks/useGetSetState"
import {getRemoteValue} from "@/utils/kv"
import {RemotePluginGV} from "@/enums/plugin"
import {NoPromptHint} from "../utilsUI/UtilsTemplate"
import {SolidYakOfficialPluginColorIcon} from "@/assets/icon/colors"
import {grpcDownloadOnlinePlugin, grpcFetchLocalPluginDetail} from "../utils/grpc"
import {defaultAddYakitScriptPageInfo} from "@/defaultConstants/AddYakitScript"

import classNames from "classnames"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import styles from "./PluginHubList.module.scss"

interface HubListOnlineProps extends HubListBaseProps {}
/** @name 插件商店 */
export const HubListOnline: React.FC<HubListOnlineProps> = memo((props) => {
    const {hiddenFilter, isDetailList, hiddenDetailList, onPluginDetail} = props

    const divRef = useRef<HTMLDivElement>(null)
    const wrapperWidth = useListenWidth(divRef)
    const [inViewPort = true] = useInViewport(divRef)

    const userinfo = useStore((s) => s.userInfo)
    const isLogin = useMemo(() => userinfo.isLogin, [userinfo])

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
    const [search, setSearch, getSearch] = useGetSetState<PluginSearchParams>(cloneDeep({...defaultSearch}))
    const [filters, setFilters, getFilters] = useGetSetState<PluginFilterParams>({plugin_type: [], tags: []})

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
        handleRefreshList(true)
    }, [])

    useUpdateEffect(() => {
        if (inViewPort) {
            onRefreshFilterAndTotal()
        }
    }, [inViewPort])
    /** 搜索条件 */
    useUpdateEffect(() => {
        fetchList(true)
    }, [filters])

    const fetchInitTotal = useMemoizedFn(() => {
        apiFetchOnlineList({page: 1, limit: 1}, true)
            .then((res) => {
                setListTotal(Number(res.pagemeta.total) || 0)
            })
            .catch(() => {})
    })

    // 搜索条件分组数据
    const fetchFilterGroup = useMemoizedFn((refFlagList: boolean = true) => {
        apiFetchGroupStatisticsOnline()
            .then((res) => {
                if (refFlagList) {
                    const latestGroup = res.data.find((item) => item.groupKey === "plugin_group")?.data || []
                    const oldGroup = filterGroup.find((item) => item.groupKey === "plugin_group")?.data || []
                    const {realFilter, updateFilterFlag} = excludeNoExistfilter(filters, res.data)
                    if (updateFilterFlag) {
                        setFilters(realFilter)
                    } else {
                        if (JSON.stringify(latestGroup) != JSON.stringify(oldGroup)) {
                            fetchList(true)
                        }
                    }
                }
                setFilterGroup(res.data)
            })
            .catch(() => {})
    })

    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            if (reset) {
                if (isInitLoading.current) return
            } else {
                if (loading) return
            }
            if (reset) {
                fetchInitTotal()
                isInitLoading.current = true
                setShowIndex(0)
            }
            setLoading(true)

            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20, order_by: "updated_at"}
                : {
                      page: response.pagemeta.page + 1,
                      limit: response.pagemeta.limit || 20,
                      order_by: "updated_at"
                  }

            const queryFilter = getFilters()
            const queryFearch = getSearch()
            const query: PluginsQueryProps = convertPluginsRequestParams(queryFilter, queryFearch, params)
            try {
                const res = await apiFetchOnlineList(query)
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
            if (updateFilterGroup) fetchFilterGroup(false)
            fetchList(true)
        }),
        {wait: 200}
    ).run
    const handleSwitchPrivateDomain = useMemoizedFn(() => {
        handleRefreshList(true)
    })

    useEffect(() => {
        emiter.on("onSwitchPrivateDomain", handleSwitchPrivateDomain)
        emiter.on("onRefreshOnlinePluginList", handleRefreshList)
        return () => {
            emiter.off("onSwitchPrivateDomain", handleSwitchPrivateDomain)
            emiter.off("onRefreshOnlinePluginList", handleRefreshList)
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
                dispatch({
                    type: "download",
                    payload: {
                        item: {...info}
                    }
                })
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

        if (allChecked) {
            request = {
                ...request,
                ...convertDownloadOnlinePluginBatchRequestParams(getFilters(), getSearch())
            }
        }
        if (!allChecked && selectedNum > 0) {
            request = {
                ...request,
                UUID: selectList.map((item) => item.uuid)
            }
        }

        setBatchDownloadLoading(true)
        apiDownloadPluginOnline(request)
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

    const headerExtraDownload = useMemoizedFn(() => {
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

    /** ---------- 单个操作(点赞|下载)的回调 Start ---------- */
    const optCallback = useMemoizedFn((type: string, info: YakitPluginOnlineDetail) => {
        if (type === "star") {
            dispatch({
                type: "unLikeAndLike",
                payload: {
                    item: {...info}
                }
            })
        }
        if (type === "download") {
            dispatch({
                type: "download",
                payload: {
                    item: {...info}
                }
            })
        }
    })
    /** ---------- 单个操作(下载|改为公开/私密)的回调 End ---------- */

    /** ---------- 一键上传本地插件 Start ---------- */
    const [uploadModal, setUploadModal] = useState<boolean>(false)
    const openUploadAll = useMemoizedFn(() => {
        if (uploadModal) return
        if (!isLogin) {
            yakitNotify("error", "请先登录后才可一键上传")
            return
        }
        if (userinfo.role !== "admin") {
            yakitNotify("error", "暂无权限使用该操作")
            return
        }
        setUploadModal(true)
    })
    /** ---------- 一键上传本地插件 End ---------- */

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
        onPluginDetail({type: "online", name: info.script_name, uuid: info.uuid, isCorePlugin: !!info.isCorePlugin})
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
        })) as YakFilterRemoteObj[]
        return group || []
    }, [filters])
    /** ---------- 详情列表操作 End ---------- */

    // 批量下载
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
                    onClick={headerExtraDownload}
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
    // 单项的点赞|下载
    const extraFooter = (info: YakitPluginOnlineDetail) => {
        return (
            <OnlineOptFooterExtra
                isLogin={isLogin}
                info={info}
                execDownloadInfo={singleDownload}
                onDownload={onFooterExtraDownload}
                callback={optCallback}
            />
        )
    }

    // 单项副标题
    const optSubTitle = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        if (info?.official) {
            return <SolidYakOfficialPluginColorIcon />
        }
        return null
    })
    return (
        <div ref={divRef} className={styles["plugin-hub-tab-list"]}>
            {/* CE版不需要登录，EE和SE版需要登录后才可使用 */}
            <OnlineJudgment isJudgingLogin={!isCommunityEdition()}>
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
                                title='插件商店'
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
                                                    extraFooter={extraFooter}
                                                    onClick={onOptClick}
                                                    subTitle={optSubTitle}
                                                />
                                            )
                                        }}
                                    />
                                ) : listTotal === 0 ? (
                                    <div className={styles["hub-list-empty"]}>
                                        <YakitEmpty
                                            title='暂无数据'
                                            description={isCommunityEdition() ? "" : "可将本地所有插件一键上传"}
                                        />
                                        <div className={styles["refresh-buttons"]}>
                                            {userinfo.role !== "admin" && (
                                                <YakitButton
                                                    type='outline1'
                                                    icon={<OutlineClouduploadIcon />}
                                                    onClick={openUploadAll}
                                                >
                                                    一键上传
                                                </YakitButton>
                                            )}
                                            <YakitButton
                                                type='outline1'
                                                icon={<OutlineRefreshIcon />}
                                                onClick={onRefresh}
                                            >
                                                刷新
                                            </YakitButton>
                                        </div>
                                    </div>
                                ) : (
                                    <YakitEmpty
                                        image={SearchResultEmpty}
                                        imageStyle={{margin: "0 auto 24px", width: 274, height: 180}}
                                        title='搜索结果“空”'
                                        className={styles["hub-list-empty"]}
                                    />
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
                                    isOnline={true}
                                    selectGroup={detailSelectedGroup}
                                    setSelectGroup={(group) =>
                                        onDetailFilter(convertGroupParam({...getFilters()}, {group}))
                                    }
                                    isShowGroupMagBtn={false}
                                />
                            }
                            checked={allChecked}
                            onCheck={onCheck}
                            total={listLength}
                            selected={selectedNum}
                            filterExtra={
                                <div className={styles["hub-detail-list-extra"]}>
                                    <FilterPopoverBtn defaultFilter={filters} onFilter={onDetailFilter} type='online' />
                                    <div className={styles["divider-style"]}></div>
                                    <Tooltip title='下载插件' overlayClassName='plugins-tooltip'>
                                        <YakitButton
                                            type='text2'
                                            loading={batchDownloadLoading}
                                            disabled={listTotal === 0}
                                            icon={<OutlineClouddownloadIcon />}
                                            onClick={headerExtraDownload}
                                        />
                                    </Tooltip>
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
                                rowKey: "uuid",
                                numberRoll: scrollTo,
                                data: response.data,
                                loadMoreData: onUpdateList,
                                classNameRow: styles["hub-detail-list-opt"],
                                renderRow: (info, i) => {
                                    const check =
                                        allChecked || selectList.findIndex((item) => item.uuid === info.uuid) !== -1
                                    return (
                                        <HubDetailListOpt<YakitPluginOnlineDetail>
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

            {/* 一键下载 */}
            {allDownloadHint && (
                <YakitGetOnlinePlugin visible={allDownloadHint} setVisible={() => setAllDownloadHint(false)} />
            )}
            {/* 一键上传 */}
            {uploadModal && <PluginsUploadHint visible={uploadModal} setVisible={setUploadModal} />}

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
