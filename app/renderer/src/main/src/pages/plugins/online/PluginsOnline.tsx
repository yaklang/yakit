import React, {useState, useRef, useMemo, useEffect, useReducer} from "react"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    FuncBtn,
    FuncFilterPopover,
    FuncSearch,
    GridLayoutOpt,
    ListLayoutOpt,
    ListShowContainer,
    OnlineExtraOperate,
    PluginsList,
    TypeSelect
} from "../funcTemplate"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {
    OutlineCalendarIcon,
    OutlineClouddownloadIcon,
    OutlineClouduploadIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineSwitchverticalIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {useMemoizedFn, useDebounceFn, useControllableValue, useUpdateEffect, useInViewport, useLatest} from "ahooks"
import {openExternalWebsite} from "@/utils/openWebsite"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {
    DownloadArgumentProps,
    NavigationBars,
    OnlineBackInfoProps,
    OtherSearchProps,
    PluginOnlineDetailBackProps,
    PluginsOnlineHeardProps,
    PluginsOnlineListProps,
    PluginsOnlineProps,
    PluginsUploadAllProps,
    YakitCombinationSearchCircleProps,
    YakitPluginOnlineDetail
} from "./PluginsOnlineType"
import cloneDeep from "lodash/cloneDeep"
import {API} from "@/services/swagger/resposeType"
import {PluginsContainer, PluginsLayout} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {PluginsOnlineDetail} from "./PluginsOnlineDetail"
import {SolidClouduploadIcon, SolidPluscircleIcon} from "@/assets/icon/solid"
import {yakitNotify} from "@/utils/notification"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import styles from "./PluginsOnline.module.scss"
import {NetWorkApi} from "@/services/fetch"
import {
    DownloadOnlinePluginsRequest,
    PluginsQueryProps,
    apiDownloadPluginOnline,
    apiFetchGroupStatisticsOnline,
    apiFetchOnlineList,
    convertDownloadOnlinePluginBatchRequestParams,
    convertPluginsRequestParams,
    excludeNoExistfilter
} from "../utils"
import {useStore} from "@/store"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {TypeSelectOpt} from "../funcTemplateType"
import {DefaultTypeList, PluginGV, defaultSearch, funcSearchType, pluginTypeToName} from "../builtInData"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {isCommunityEdition} from "@/utils/envfile"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {PluginUpload} from "../local/PluginLocalUpload"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import classNames from "classnames"
import "../plugins.scss"
import {CodeGV} from "@/yakitGV"

/**插件商店页面的处理缓存中的搜索参数 */
const getPluginOnlinePageData = (pluginOnlinePageData) => {
    const pageList = pluginOnlinePageData?.pageList || []
    if (pageList.length === 0) {
        return {
            keyword: "",
            plugin_type: []
        }
    }
    const {keyword, plugin_type} = pageList[0].pageParamsInfo?.pluginOnlinePageInfo || {
        keyword: "",
        plugin_type: ""
    }
    const types = !!plugin_type ? plugin_type.split(",") : []
    const typeList: API.PluginsSearchData[] = types.map((ele) => ({
        value: ele,
        label: pluginTypeToName[ele]?.name || "",
        count: 0
    }))
    return {
        keyword,
        plugin_type: typeList || []
    }
}

export const PluginsOnline: React.FC<PluginsOnlineProps> = React.memo((props) => {
    const {pluginOnlinePageData} = usePageInfo(
        (s) => ({
            pluginOnlinePageData: s.pages?.get(YakitRoute.Plugin_Store) || {
                pageList: [],
                routeKey: "",
                singleNode: true
            }
        }),
        shallow
    )
    const [isShowRoll, setIsShowRoll] = useState<boolean>(true)

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()
    const [search, setSearch] = useState<PluginSearchParams>(
        cloneDeep({
            ...defaultSearch,
            keyword: getPluginOnlinePageData(pluginOnlinePageData).keyword || ""
        })
    )
    const [refresh, setRefresh] = useState<boolean>(false)

    const pluginsOnlineRef = useRef<HTMLDivElement>(null)
    const pluginsOnlineHeardRef = useRef<HTMLDivElement>(null)
    const pluginsOnlineListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsOnlineListRef)

    useEffect(() => {
        window.addEventListener("scroll", handleScroll, true)
        return () => {
            window.removeEventListener("scroll", handleScroll, true)
        }
    }, [])
    const handleScroll = useDebounceFn(
        useMemoizedFn((e) => {
            e.stopPropagation()
            const {scrollTop, id} = e.target
            if (id === "online-list" || id === "online-grid") {
                if (scrollTop === 1) {
                    setIsShowRoll(true)
                    if (pluginsOnlineRef.current) {
                        pluginsOnlineRef.current.scrollTop -= 54
                    }
                }
            }
            if (id === "pluginsOnline") {
                const {scrollHeight, clientHeight} = e.target
                const maxScrollTop = Math.max(0, scrollHeight - clientHeight)
                if (Math.trunc(Math.abs(scrollTop - maxScrollTop)) <= 2) {
                    setIsShowRoll(false)
                } else {
                    setIsShowRoll(true)
                }
            }
        }),
        {wait: 200, leading: true}
    ).run
    const onSearch = useDebounceFn(
        useMemoizedFn(() => {
            setRefresh(!refresh)
        }),
        {wait: 200, leading: true}
    ).run
    return (
        <>
            <div className={styles["plugins-online"]}>
                <div id='pluginsOnline' ref={pluginsOnlineRef} className={classNames(styles["plugins-online-body"])}>
                    <div
                        ref={pluginsOnlineHeardRef}
                        className={classNames({
                            [styles["plugin-online-heard-hidden"]]: plugin
                        })}
                    >
                        <PluginsOnlineHeard value={search} onChange={setSearch} onSearch={onSearch} />
                    </div>
                    <div className={styles["plugins-online-list"]} ref={pluginsOnlineListRef}>
                        <PluginsOnlineList
                            refresh={refresh}
                            inViewport={inViewport}
                            plugin={plugin}
                            setPlugin={setPlugin}
                            isShowRoll={isShowRoll}
                            searchValue={search}
                            setSearchValue={setSearch}
                        />
                    </div>
                </div>
            </div>
        </>
    )
})

const PluginsOnlineList: React.FC<PluginsOnlineListProps> = React.memo((props, ref) => {
    const {refresh, isShowRoll, plugin, setPlugin, inViewport} = props
    const {pluginOnlinePageData, clearDataByRoute} = usePageInfo(
        (s) => ({
            pluginOnlinePageData: s.pages?.get(YakitRoute.Plugin_Store) || {
                pageList: [],
                routeKey: "",
                singleNode: true
            },
            clearDataByRoute: s.clearDataByRoute
        }),
        shallow
    )
    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<string[]>([])
    const [allCheck, setAllCheck] = useState<boolean>(false)
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    const [downloadLoading, setDownloadLoading] = useState<boolean>(false)
    const [filters, setFilters] = useState<PluginFilterParams>({
        plugin_type: getPluginOnlinePageData(pluginOnlinePageData).plugin_type,
        tags: []
    })

    const [search, setSearch] = useControllableValue<PluginSearchParams>(props, {
        defaultValue: {
            ...props.searchValue
        },
        defaultValuePropName: "searchValue",
        valuePropName: "searchValue",
        trigger: "setSearchValue"
    })
    const [pluginGroupList, setPluginGroupList] = useState<API.PluginsSearch[]>([])

    const [otherSearch, setOtherSearch] = useState<OtherSearchProps>({
        timeType: {
            key: "allTimes",
            label: "所有时间"
        },
        heatType: {
            key: "updated_at",
            label: "默认排序"
        }
    })

    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [initTotal, setInitTotal] = useState<number>(0)

    const [hasMore, setHasMore] = useState<boolean>(true)
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)
    const [visibleUploadAll, setVisibleUploadAll] = useState<boolean>(false)

    const [showFilter, setShowFilter] = useState<boolean>(true)

    const [menuExpand, setMenuExpand] = useState<boolean>(true)

    /** 是否为初次加载 */
    const isLoadingRef = useRef<boolean>(true)
    const latestLoadingRef = useLatest(loading)

    const userInfo = useStore((s) => s.userInfo)

    // 获取筛选栏展示状态
    useEffect(() => {
        getRemoteValue(PluginGV.StoreFilterCloseStatus).then((value: string) => {
            if (value === "true") setShowFilter(true)
            if (value === "false") setShowFilter(false)
        })
    }, [])
    useUpdateEffect(() => {
        // 需要刷新插件商店商店列表+统计
        onSwitchPrivateDomainRefOnlinePluginInit()
    }, [userInfo.isLogin])
    useEffect(() => {
        getInitTotal()
        getPluginGroupList()
    }, [inViewport])
    // 请求数据
    useEffect(() => {
        fetchList(true)
    }, [refresh, filters, otherSearch])

    // 当filters过滤条件被其他页面或者意外删掉，插件列表却带了该过滤条件的情况，切换到该页面时需要把被删掉的过滤条件排除
    useEffect(() => {
        const {realFilter, updateFilterFlag} = excludeNoExistfilter(filters, pluginGroupList)
        if (updateFilterFlag) {
            setFilters(realFilter)
        }
    }, [filters, pluginGroupList])

    useEffect(() => {
        emiter.on("onSwitchPrivateDomain", onSwitchPrivateDomainRefOnlinePluginInit)
        emiter.on("onRefOnlinePluginList", onRefOnlinePluginList)
        emiter.on("menuExpandSwitch", onMenuExpandSwitch)
        return () => {
            emiter.off("onSwitchPrivateDomain", onSwitchPrivateDomainRefOnlinePluginInit)
            emiter.off("onRefOnlinePluginList", onRefOnlinePluginList)
            emiter.off("menuExpandSwitch", onMenuExpandSwitch)
        }
    }, [])
    useEffect(() => {
        /**首页点击热词和类型,更新缓存中的数据,需要刷新插件商店的列表 */
        if (pluginOnlinePageData.pageList.length > 0) {
            onRefOnlinePluginListByQuery()
        }
    }, [pluginOnlinePageData])
    useEffect(() => {
        getRemoteValue(CodeGV.MenuExpand).then((result: string) => {
            if (!result) setMenuExpand(true)
            onMenuExpandSwitch(result)
        })
    }, [])
    const onMenuExpandSwitch = useMemoizedFn((value) => {
        try {
            const expandResult: boolean = JSON.parse(value)
            setMenuExpand(expandResult)
        } catch (e) {
            setMenuExpand(true)
        }
    })
    /**切换私有域，刷新初始化的total和列表数据,回到列表页 */
    const onSwitchPrivateDomainRefOnlinePluginInit = useMemoizedFn(() => {
        fetchList(true)
        getPluginGroupList()
        getInitTotal()
        setPlugin(undefined)
    })
    /**
     * @description 刷新搜索条件,目前触发地方(首页-插件热点触发的插件商店搜索条件过滤)
     */
    /**首页点击热词和类型,更新缓存中的数据,需要刷新插件商店的列表 */
    const onRefOnlinePluginListByQuery = useMemoizedFn(() => {
        const {keyword = "", plugin_type = []} = getPluginOnlinePageData(pluginOnlinePageData)
        if (!!keyword) {
            setSearch({
                userName: "",
                keyword: keyword,
                type: "keyword"
            })
            setTimeout(() => {
                fetchList(true)
            }, 200)
        }
        if (plugin_type.length > 0) {
            // filters修改后会更着useEffect修改
            setFilters({
                ...filters,
                plugin_type
            })
        }
        // 设置完搜索条件后清除
        clearDataByRoute(YakitRoute.Plugin_Store)
    })
    const onRefOnlinePluginList = useMemoizedFn(() => {
        setTimeout(() => {
            fetchList(true)
        }, 200)
    })

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList, response.pagemeta.total])

    const getInitTotal = useMemoizedFn(() => {
        apiFetchOnlineList({
            page: 1,
            limit: 1
        }).then((res) => {
            setInitTotal(+res.pagemeta.total)
        })
    })
    const filtersDetailRef = useRef<PluginFilterParams>() // 详情中的filter条件
    const searchDetailRef = useRef<PluginSearchParams>() // 详情中的search条件
    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            // if (latestLoadingRef.current) return //先注释，会影响详情的更多加载
            if (reset) {
                isLoadingRef.current = true
                setShowPluginIndex(0)
            }
            setLoading(true)
            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: response.pagemeta.page + 1,
                      limit: response.pagemeta.limit || 20
                  }
            const queryFilters = filtersDetailRef.current ? filtersDetailRef.current : filters
            const querySearch = searchDetailRef.current ? searchDetailRef.current : search
            const query: PluginsQueryProps = {
                ...convertPluginsRequestParams(queryFilters, querySearch, params),
                time_search: otherSearch.timeType.key === "allTimes" ? "" : otherSearch.timeType.key,
                order_by: otherSearch.heatType.key
            }
            try {
                const res = await apiFetchOnlineList(query)
                if (!res.data) res.data = []
                const length = +res.pagemeta.page === 1 ? res.data.length : res.data.length + response.data.length
                setHasMore(length < +res.pagemeta.total)
                dispatch({
                    type: "add",
                    payload: {
                        response: {...res}
                    }
                })
                if (+res.pagemeta.page === 1) {
                    setAllCheck(false)
                    setSelectList([])
                }
            } catch (error) {}
            setTimeout(() => {
                isLoadingRef.current = false
                setLoading(false)
            }, 200)
        }),
        {wait: 200, leading: true}
    ).run

    /**获取分组统计列表 */
    const getPluginGroupList = useMemoizedFn(() => {
        apiFetchGroupStatisticsOnline().then((res) => {
            setPluginGroupList(res.data)
        })
    })

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
    const onDownloadBefore = useMemoizedFn(() => {
        const downloadParams: DownloadArgumentProps = {
            allCheckArgument: allCheck,
            filtersArgument: filters,
            searchArgument: search,
            selectListArgument: selectList,
            selectNumArgument: selectNum
        }
        onDownload(downloadParams)
    })
    /**下载 */
    const onDownload = useMemoizedFn((downloadArgument: DownloadArgumentProps, callback?: () => void) => {
        const {filtersArgument, searchArgument, selectListArgument, selectNumArgument, allCheckArgument} =
            downloadArgument
        if (selectNumArgument === 0) {
            // 全部下载
            setVisibleOnline(true)
        } else {
            // 批量下载
            let downloadParams: DownloadOnlinePluginsRequest = {}
            if (allCheckArgument) {
                downloadParams = {
                    ...convertDownloadOnlinePluginBatchRequestParams(filtersArgument, searchArgument)
                }
            } else {
                downloadParams = {
                    UUID: selectListArgument
                }
            }
            setDownloadLoading(true)
            apiDownloadPluginOnline(downloadParams).finally(() => {
                if (callback) callback()
                setTimeout(() => {
                    onCheck(false)
                    setDownloadLoading(false)
                }, 200)
            })
        }
    })

    // 当前展示的插件序列
    const showPluginIndex = useRef<number>(0)
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakitPluginOnlineDetail, value: boolean) => {
        try {
            // 全选情况时的取消勾选
            if (allCheck) {
                setSelectList(response.data.map((item) => item.uuid).filter((item) => item !== data.uuid))
                setAllCheck(false)
                return
            }
            // 单项勾选回调
            if (value) setSelectList([...selectList, data.uuid])
            else setSelectList(selectList.filter((item) => item !== data.uuid))
        } catch (error) {
            yakitNotify("error", "勾选失败:" + error)
        }
    })
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllCheck(value)
    })

    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return (
            <OnlineExtraOperate
                data={data}
                isLogin={userInfo.isLogin}
                dispatch={dispatch}
                likeProps={{
                    active: data.is_stars,
                    likeNumber: data.starsCountString || ""
                    // onLikeClick: () => onLikeClick(data)
                }}
                commentProps={{
                    commentNumber: data.commentCountString || ""
                    // onCommentClick: () => onCommentClick(data)
                }}
                downloadProps={{
                    downloadNumber: data.downloadedTotalString || ""
                    // onDownloadClick: () => onDownloadClick(data)
                }}
            />
        )
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
        setPlugin({...data})
        setShowPluginIndex(index)
    })
    /**新建插件 */
    const onNewAddPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Store}})
        )
    })

    const onBack = useMemoizedFn((backValues: PluginOnlineDetailBackProps) => {
        searchDetailRef.current = undefined
        filtersDetailRef.current = undefined
        setPlugin(undefined)
        setSearch(backValues.search)
        setFilters(backValues.filter)
        setAllCheck(backValues.allCheck)
        setSelectList(backValues.selectList)
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
    const onBatchDownload = useMemoizedFn((newParams: OnlineBackInfoProps, callback: () => void) => {
        const batchDownloadParams: DownloadArgumentProps = {
            allCheckArgument: newParams.allCheck,
            filtersArgument: newParams.filter,
            searchArgument: newParams.search,
            selectListArgument: newParams.selectList,
            selectNumArgument: newParams.selectNum
        }
        onDownload(batchDownloadParams, callback)
    })
    /** 详情搜索事件 */
    const onDetailSearch = useMemoizedFn((detailSearch: PluginSearchParams, detailFilter: PluginFilterParams) => {
        searchDetailRef.current = detailSearch
        filtersDetailRef.current = detailFilter
        fetchList(true)
    })
    const onUploadAll = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "请先登录")
            return
        }
        if (userInfo.role !== "admin") {
            yakitNotify("error", "暂无权限")
            return
        }
        setVisibleUploadAll(true)
    })
    const onSetShowFilter = useMemoizedFn((v) => {
        setRemoteValue(PluginGV.StoreFilterCloseStatus, `${v}`)
        setShowFilter(v)
    })
    /**初始数据为空的时候,刷新按钮,刷新列表和初始total,以及分组数据 */
    const onRefListAndTotalAndGroup = useMemoizedFn(() => {
        getInitTotal()
        fetchList(true)
        getPluginGroupList()
    })
    return (
        <>
            {!!plugin && (
                <div
                    className={classNames(styles["plugins-online-detail"], {
                        [styles["plugins-online-detail-ee-or-es"]]: !isCommunityEdition(),
                        [styles["plugins-online-detail-ee-or-es-menu-retract"]]: !isCommunityEdition() && !menuExpand,
                        [styles["plugins-online-detail-menu-retract"]]: isCommunityEdition() && !menuExpand
                    })}
                >
                    <PluginsOnlineDetail
                        info={plugin}
                        defaultSelectList={selectList}
                        defaultAllCheck={allCheck}
                        loading={loading}
                        spinLoading={loading && isLoadingRef.current}
                        response={response}
                        onBack={onBack}
                        loadMoreData={onUpdateList}
                        defaultSearchValue={search}
                        dispatch={dispatch}
                        onBatchDownload={onBatchDownload}
                        defaultFilter={filters}
                        downloadLoading={downloadLoading}
                        onDetailSearch={onDetailSearch}
                        currentIndex={showPluginIndex.current}
                        setCurrentIndex={setShowPluginIndex}
                    />
                </div>
            )}
            <PluginsLayout
                title={
                    <div
                        className={classNames(styles["plugin-heard-title"], {
                            [styles["plugin-heard-title-hidden"]]: isShowRoll
                        })}
                    >
                        插件商店
                    </div>
                }
                hidden={!!plugin}
                subTitle={<TypeSelect active={pluginTypeSelect} list={DefaultTypeList} setActive={onSetActive} />}
                extraHeader={
                    <div className='extra-header-wrapper'>
                        <div
                            className={classNames(styles["extra-header-search-wrapper"], {
                                [styles["extra-header-search-wrapper-hidden"]]: isShowRoll
                            })}
                        >
                            <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                            <div className='divider-style'></div>
                        </div>

                        <div className='btn-group-wrapper'>
                            <FuncBtn
                                maxWidth={1050}
                                icon={<OutlineClouddownloadIcon />}
                                type='outline2'
                                size='large'
                                name={selectNum > 0 ? "下载" : "一键下载"}
                                onClick={onDownloadBefore}
                                loading={downloadLoading}
                                disabled={initTotal === 0}
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
                    groupList={pluginGroupList}
                    filterClassName={classNames({
                        [styles["list-overflow-hidden"]]: isShowRoll
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
                        extraHeader={
                            <div className={styles["plugin-list-extra-heard"]}>
                                <FuncFilterPopover
                                    maxWidth={1200}
                                    icon={<OutlineCalendarIcon />}
                                    name={otherSearch.timeType.label as string}
                                    menu={{
                                        type: "grey",
                                        data: [
                                            {key: "day", label: "今日"},
                                            {key: "week", label: "本周"},
                                            {key: "month", label: "本月"},
                                            {key: "allTimes", label: "所有时间"}
                                        ],
                                        onClick: ({key}) => {
                                            switch (key) {
                                                case "day":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        timeType: {
                                                            key: "day",
                                                            label: "今日"
                                                        }
                                                    })
                                                    break
                                                case "week":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        timeType: {
                                                            key: "week",
                                                            label: "本周"
                                                        }
                                                    })
                                                    break
                                                case "month":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        timeType: {
                                                            key: "month",
                                                            label: "本月"
                                                        }
                                                    })
                                                    break
                                                case "allTimes":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        timeType: {
                                                            key: "allTimes",
                                                            label: "所有时间"
                                                        }
                                                    })
                                                    break
                                                default:
                                                    return
                                            }
                                        }
                                    }}
                                    button={{type: "text2", style: {padding: "3px 4px"}}}
                                    placement='bottomRight'
                                />
                                <FuncFilterPopover
                                    maxWidth={1200}
                                    icon={<OutlineSwitchverticalIcon />}
                                    name={otherSearch.heatType.label as string}
                                    menu={{
                                        data: [
                                            {key: "updated_at", label: "默认排序"},
                                            {key: "stars", label: "点赞最多"},
                                            {key: "download_total", label: "下载最多"}
                                        ],
                                        className: styles["func-filter-dropdown-menu"],
                                        onClick: ({key}) => {
                                            switch (key) {
                                                case "updated_at":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        heatType: {
                                                            key: "updated_at",
                                                            label: "默认排序"
                                                        }
                                                    })
                                                    break
                                                case "stars":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        heatType: {
                                                            key: "stars",
                                                            label: "点赞最多"
                                                        }
                                                    })
                                                    break
                                                case "download_total":
                                                    setOtherSearch({
                                                        ...otherSearch,
                                                        heatType: {
                                                            key: "download_total",
                                                            label: "下载最多"
                                                        }
                                                    })
                                                    break
                                                default:
                                                    return
                                            }
                                        }
                                    }}
                                    button={{type: "text2", style: {padding: "3px 4px"}}}
                                    placement='bottomRight'
                                />
                                <div className='divider-style' style={{marginLeft: 4}} />
                            </div>
                        }
                    >
                        {initTotal > 0 ? (
                            <ListShowContainer<YakitPluginOnlineDetail>
                                id='online'
                                isList={isList}
                                data={response.data}
                                listClassName={classNames({
                                    [styles["list-overflow-hidden"]]: isShowRoll
                                })}
                                gridClassName={classNames({
                                    [styles["list-overflow-hidden"]]: isShowRoll
                                })}
                                gridNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectList.includes(data.uuid)
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
                                            official={!!data.official}
                                            extraFooter={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                gridHeight={226}
                                listNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectList.includes(data.uuid)
                                    return (
                                        <ListLayoutOpt
                                            order={index}
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            img={data.head_img}
                                            title={data.script_name}
                                            help={data.help || ""}
                                            time={data.updated_at}
                                            type={data.type}
                                            isCorePlugin={!!data.isCorePlugin}
                                            official={!!data.official}
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
                            <div className={styles["plugin-online-empty"]}>
                                <YakitEmpty
                                    title='暂无数据'
                                    description={isCommunityEdition() ? "" : "可将本地所有插件一键上传"}
                                />
                                <div className={styles["plugin-online-buttons"]}>
                                    {userInfo.role === "admin" && (
                                        <YakitButton
                                            type='outline1'
                                            icon={<OutlineClouduploadIcon />}
                                            onClick={onUploadAll}
                                        >
                                            一键上传
                                        </YakitButton>
                                    )}
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
            {visibleOnline && <YakitGetOnlinePlugin visible={visibleOnline} setVisible={setVisibleOnline} />}
            {visibleUploadAll && <PluginsUploadAll visible={visibleUploadAll} setVisible={setVisibleUploadAll} />}
        </>
    )
})

const PluginsUploadAll: React.FC<PluginsUploadAllProps> = React.memo((props) => {
    const {visible, setVisible} = props
    const onCancel = useMemoizedFn(() => {
        setVisible(false)
    })
    return (
        <YakitHint
            visible={visible}
            title='一键上传'
            heardIcon={<SolidClouduploadIcon style={{color: "var(--yakit-warning-5)"}} />}
            footer={null}
            isDrag={true}
            mask={false}
        >
            <PluginUpload
                isUploadAll={true}
                isPrivate={false}
                onSave={onCancel}
                onCancel={onCancel}
                pluginNames={[]}
                show={visible}
                footerClassName={styles["upload-all-btns"]}
            />
        </YakitHint>
    )
})

const PluginsOnlineHeard: React.FC<PluginsOnlineHeardProps> = React.memo((props) => {
    const {onSearch} = props
    const [search, setSearch] = useControllableValue<PluginSearchParams>(props)
    const [visibleQRCode, setVisibleQRCode] = useState<boolean>(false)
    const [codeUrl, setCodeUrl] = useState<string>("")
    const [cardImg, setCardImg] = useState<API.NavigationBarsListResponse[]>([])
    useEffect(() => {
        getBars()
    }, [])
    /**获取导航卡片 */
    const getBars = useMemoizedFn(() => {
        NetWorkApi<NavigationBars, API.NavigationBarsResponse>({
            method: "get",
            url: "navigation/bars"
        })
            .then((res: API.NavigationBarsResponse) => {
                setCardImg(res.data || [])
            })
            .catch((err) => {
                yakitNotify("error", "获取卡片导航失败:" + err)
            })
            .finally(() => {})
    })
    const onImgClick = useMemoizedFn((ele) => {
        if (ele.otherLink) {
            setCodeUrl(ele.otherLink)
            setVisibleQRCode(true)
        } else {
            openExternalWebsite(ele.link)
        }
    })
    return (
        <div className={styles["plugin-online-heard"]}>
            <div className={styles["plugin-online-heard-bg"]} />
            <div className={styles["plugin-online-heard-content"]}>
                <div className={styles["plugin-online-heard-content-top"]}>
                    <div className={styles["plugin-online-heard-content-top-tip"]}>Hello everyone! 👋</div>
                    <div className={styles["plugin-online-heard-content-top-title"]}>Yakit 插件商店</div>
                    <div className={styles["plugin-online-heard-content-top-subTitle"]}>
                        未封闭的牛头&nbsp;&nbsp;YAK&nbsp;等待你来填满
                    </div>
                    <YakitCombinationSearchCircle value={search} onChange={setSearch} onSearch={onSearch} />
                </div>
            </div>
            <div className={styles["plugin-online-heard-card"]}>
                {cardImg.map((ele) => (
                    <img
                        key={ele.card}
                        className={styles["plugin-online-heard-card-img"]}
                        src={ele.card}
                        alt=''
                        onClick={() => onImgClick(ele)}
                    />
                ))}
            </div>
            <YakitModal
                visible={visibleQRCode}
                title={null}
                footer={null}
                centered={true}
                width={368}
                onCancel={() => setVisibleQRCode(false)}
                hiddenHeader={true}
                bodyStyle={{padding: 0}}
            >
                <div className={styles["yakit-modal-code"]}>
                    <div className={styles["yakit-modal-code-heard"]}>
                        <div className={styles["yakit-modal-code-heard-title"]}>
                            <SolidYakCattleNoBackColorIcon className={styles["yakit-modal-code-heard-title-icon"]} />
                            <span className={styles["yakit-modal-code-heard-title-text"]}>Yak Project</span>
                        </div>
                        <div
                            className={styles["yakit-modal-code-heard-remove"]}
                            onClick={() => setVisibleQRCode(false)}
                        >
                            <OutlineXIcon />
                        </div>
                    </div>
                    <div className={styles["yakit-modal-code-content"]}>
                        <img alt='' src={codeUrl} className={styles["yakit-modal-code-content-url"]} />
                        <span className={styles["yakit-modal-code-content-tip"]}>微信扫码关注公众号</span>
                    </div>
                </div>
            </YakitModal>
        </div>
    )
})
const YakitCombinationSearchCircle: React.FC<YakitCombinationSearchCircleProps> = React.memo((props) => {
    const {value, onSearch} = props
    const [search, setSearch] = useControllableValue<PluginSearchParams>(props)
    const keyword = useMemo(() => {
        if (search.type === "keyword") {
            return search.keyword
        } else {
            return search.userName
        }
    }, [search])
    const onSelect = useMemoizedFn((type) => {
        setSearch({
            ...value,
            type
        })
    })
    const onChangeInput = useMemoizedFn((e) => {
        if (value.type === "keyword") {
            setSearch({
                ...value,
                keyword: e.target.value
            })
        } else {
            setSearch({
                ...value,
                userName: e.target.value
            })
        }
    })
    const onClickSearch = useMemoizedFn(() => {
        onSearch()
    })
    return (
        <div className={styles["yakit-combination-search-circle"]}>
            <YakitSelect
                defaultValue='keyword'
                wrapperStyle={{width: 75}}
                wrapperClassName={styles["yakit-combination-search-circle-select-wrapper"]}
                bordered={false}
                options={funcSearchType}
                value={search.type}
                onSelect={onSelect}
                size='large'
            />
            <div className={styles["yakit-combination-search-circle-line"]} />
            <YakitInput
                className={styles["yakit-combination-search-circle-input"]}
                wrapperClassName={styles["yakit-combination-search-circle-input-wrapper"]}
                bordered={false}
                placeholder='请输入关键词搜索插件'
                value={keyword}
                onChange={onChangeInput}
                onPressEnter={onSearch}
            />
            <div className={classNames(styles["yakit-combination-search-circle-icon"])} onClick={onClickSearch}>
                <OutlineSearchIcon />
            </div>
        </div>
    )
})
