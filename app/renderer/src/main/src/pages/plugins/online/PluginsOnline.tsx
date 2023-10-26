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
    TypeSelect,
    funcSearchType
} from "../funcTemplate"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {
    OutlineCalendarIcon,
    OutlineClouddownloadIcon,
    OutlineSearchIcon,
    OutlineSwitchverticalIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {useMemoizedFn, useDebounceFn, useControllableValue, useLockFn, useUpdateEffect, useInViewport} from "ahooks"
import {openExternalWebsite} from "@/utils/openWebsite"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {OnlineJudgment} from "../onlineJudgment/OnlineJudgment"
import {
    NavigationBars,
    OtherSearchProps,
    PluginOnlineDetailBackProps,
    PluginsOnlineHeardProps,
    PluginsOnlineListProps,
    PluginsOnlineProps,
    YakitCombinationSearchCircleProps,
    YakitPluginOnlineDetail
} from "./PluginsOnlineType"
import cloneDeep from "lodash/cloneDeep"
import {API} from "@/services/swagger/resposeType"
import {PluginsContainer, PluginsLayout, defaultSearch, pluginTypeList} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {PluginsOnlineDetail} from "./PluginsOnlineDetail"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {yakitNotify} from "@/utils/notification"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import styles from "./PluginsOnline.module.scss"
import {NetWorkApi} from "@/services/fetch"
import {
    DownloadOnlinePluginsRequest,
    PluginsQueryProps,
    apiDownloadOnlinePlugin,
    apiFetchGroupStatisticsOnline,
    apiFetchOnlineList,
    convertDownloadOnlinePluginBatchRequestParams,
    convertPluginsRequestParams
} from "../utils"
import {useStore} from "@/store"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {TypeSelectOpt} from "../funcTemplateType"

import classNames from "classnames"
import "../plugins.scss"

export const PluginsOnline: React.FC<PluginsOnlineProps> = React.memo((props) => {
    const [isShowRoll, setIsShowRoll] = useState<boolean>(true)

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
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
                if (!Math.trunc(Math.abs(scrollTop - maxScrollTop))) {
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
        <OnlineJudgment>
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
        </OnlineJudgment>
    )
})
const PluginsOnlineList: React.FC<PluginsOnlineListProps> = React.memo((props, ref) => {
    const {refresh, isShowRoll, plugin, setPlugin, inViewport} = props

    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(true)
    const [selectList, setSelectList] = useState<string[]>([])
    const [allCheck, setAllCheck] = useState<boolean>(false)
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    const [filters, setFilters] = useState<PluginFilterParams>({
        plugin_type: [],
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

    // const [response, setResponse] = useState<API.YakitPluginListResponse>(cloneDeep(defaultResponse))
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [initTotal, setInitTotal] = useState<number>(0)

    const [hasMore, setHasMore] = useState<boolean>(true)
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)

    const [showFilter, setShowFilter] = useState<boolean>(true)

    /** 是否为初次加载 */
    const isLoadingRef = useRef<boolean>(true)

    const userInfo = useStore((s) => s.userInfo)
    useEffect(() => {
        getInitTotal()
    }, [inViewport])
    // 请求数据
    useUpdateEffect(() => {
        fetchList(true)
    }, [userInfo.isLogin, refresh, filters, otherSearch])
    useUpdateEffect(() => {
        if (visibleOnline) return
        fetchList(true)
    }, [visibleOnline])

    useEffect(() => {
        getPluginGroupList()
    }, [userInfo.isLogin, inViewport])

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])

    const getInitTotal = useMemoizedFn(() => {
        apiFetchOnlineList({
            page: 1,
            limit: 1
        }).then((res) => {
            setInitTotal(+res.pagemeta.total)
        })
    })

    const fetchList = useLockFn(
        useMemoizedFn(async (reset?: boolean) => {
            if (loading) return
            if (reset) {
                isLoadingRef.current = true
            }
            setLoading(true)
            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: response.pagemeta.page + 1,
                      limit: response.pagemeta.limit || 20
                  }
            const query: PluginsQueryProps = {
                ...convertPluginsRequestParams(filters, search, params),
                time_search: otherSearch.timeType.key === "allTimes" ? "" : otherSearch.timeType.key,
                order_by: otherSearch.heatType.key
            }
            try {
                const res = await apiFetchOnlineList(query)
                if (!res.data) res.data = []
                const length = res.data.length + response.data.length
                setHasMore(length < +res.pagemeta.total)
                dispatch({
                    type: "add",
                    payload: {
                        response: {...res}
                    }
                })
            } catch (error) {}

            setTimeout(() => {
                setLoading(false)
                isLoadingRef.current = false
            }, 300)
        })
    )

    /**获取分组统计列表 */
    const getPluginGroupList = useMemoizedFn(() => {
        apiFetchGroupStatisticsOnline().then((res) => {
            setPluginGroupList(res.data)
        })
    })

    // 滚动更多加载
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
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
    /**下载 */
    const onDownload = useMemoizedFn((value?: YakitPluginOnlineDetail) => {
        if (selectNum === 0) {
            // 全部下载
            setVisibleOnline(true)
        } else {
            // 批量下载
            let downloadParams: DownloadOnlinePluginsRequest = {}
            if (allCheck) {
                downloadParams = {
                    ...convertDownloadOnlinePluginBatchRequestParams(filters, search)
                }
            } else {
                downloadParams = {
                    UUID: selectList
                }
            }
            setLoading(true)
            apiDownloadOnlinePlugin(downloadParams)
                .then(() => {
                    fetchList(true)
                    yakitNotify("success", "下载成功")
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                )
        }
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
        if (value) setSelectList([])
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
    const optClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        setPlugin({...data})
    })
    /**新建插件 */
    const onNewAddPlugin = useMemoizedFn(() => {})

    const onBack = useMemoizedFn((backValues: PluginOnlineDetailBackProps) => {
        setPlugin(undefined)
        setSearch(backValues.search)
        setAllCheck(backValues.allCheck)
        setSelectList(backValues.selectList)
    })
    /**
     * @description 此方法防抖不要加leading：true,会影响search拿到最新得值，用useLatest也拿不到最新得；如若需要leading：true，则需要使用setTimeout包fetchList
     */
    const onSearch = useDebounceFn(
        useMemoizedFn(() => {
        fetchList(true)
        }),
        {
            wait: 200
        }
    ).run
    const pluginTypeSelect: TypeSelectOpt[] = useMemo(() => {
        return (
            filters.plugin_type?.map((ele) => ({
                key: ele.value,
                name: ele.label
            })) || []
        )
    }, [filters.plugin_type])
    return (
        <>
            {!!plugin && (
                <div className={styles["plugins-online-detail"]}>
                    <PluginsOnlineDetail
                        info={plugin}
                        defaultSelectList={selectList}
                        defaultAllCheck={allCheck}
                        loading={loading}
                        response={response}
                        onBack={onBack}
                        loadMoreData={onUpdateList}
                        defaultSearchValue={search}
                        dispatch={dispatch}
                    />
                </div>
            )}
            <PluginsLayout
                title={isShowRoll ? <></> : "插件商店"}
                hidden={!!plugin}
                subTitle={<TypeSelect active={pluginTypeSelect} list={pluginTypeList} setActive={onSetActive} />}
                extraHeader={
                    <div className='extra-header-wrapper'>
                        {!isShowRoll && (
                            <>
                                <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                                <div className='divider-style'></div>
                            </>
                        )}

                        <div className='btn-group-wrapper'>
                            <FuncBtn
                                maxWidth={1050}
                                icon={<OutlineClouddownloadIcon />}
                                type='outline2'
                                size='large'
                                name={selectNum > 0 ? "下载" : "一键下载"}
                                onClick={() => onDownload()}
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
                    setVisible={setShowFilter}
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
                        setVisible={setShowFilter}
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
                                    const {data} = info
                                    const check = allCheck || selectList.includes(data.uuid)
                                    return (
                                        <GridLayoutOpt
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            title={data.script_name}
                                            type={data.type}
                                            tags={data.tags}
                                            help={data.help || ""}
                                            img={data.head_img || ""}
                                            user={data.authors || ""}
                                            // prImgs={[]}
                                            time={data.updated_at}
                                            isCorePlugin={!!data.isCorePlugin}
                                            official={!!data.isCorePlugin}
                                            extraFooter={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                gridHeight={210}
                                listNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {data} = info
                                    const check = allCheck || selectList.includes(data.uuid)
                                    return (
                                        <ListLayoutOpt
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
                            />
                        ) : (
                            <YakitEmpty title='暂无数据' style={{marginTop: 80}} />
                        )}
                    </PluginsList>
                </PluginsContainer>
            </PluginsLayout>
            {visibleOnline && (
                <YakitGetOnlinePlugin
                    visible={visibleOnline}
                    setVisible={(v) => {
                        setVisibleOnline(v)
                    }}
                />
            )}
        </>
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
                        这里可以写一句对于插件的 slogan
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
            <YakitModal visible={visibleQRCode} title={null} footer={null} centered={true} width={368}>
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
            />
            <div className={styles["yakit-combination-search-circle-line"]} />
            <YakitInput
                className={styles["yakit-combination-search-circle-input"]}
                wrapperClassName={styles["yakit-combination-search-circle-input-wrapper"]}
                bordered={false}
                placeholder='请输入关键词搜索插件'
                value={keyword}
                onChange={onChangeInput}
            />
            <div className={classNames(styles["yakit-combination-search-circle-icon"])} onClick={onClickSearch}>
                <OutlineSearchIcon />
            </div>
        </div>
    )
})
