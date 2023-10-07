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
import {useMemoizedFn, useDebounceFn, useGetState, useControllableValue, useLockFn, useUpdateEffect} from "ahooks"
import {openExternalWebsite} from "@/utils/openWebsite"
import card1 from "./card1.png"
import card2 from "./card2.png"
import card3 from "./card3.png"
import qrCode from "./qrCode.png"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {OnlineJudgment} from "../onlineJudgment/OnlineJudgment"
import {
    PluginsListRefProps,
    PluginsOnlineHeardProps,
    PluginsOnlineListProps,
    PluginsOnlineProps,
    YakitCombinationSearchCircleProps,
    YakitPluginOnlineDetail
} from "./PluginsOnlineType"
import cloneDeep from "lodash/cloneDeep"
import {API} from "@/services/swagger/resposeType"
import {apiFetchList, ssfilters} from "../test"
import {
    PluginsContainer,
    PluginsLayout,
    defaultFilter,
    defaultResponse,
    defaultSearch,
    pluginTypeList
} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {PluginsOnlineDetail} from "./PluginsOnlineDetail"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {yakitNotify} from "@/utils/notification"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"

import classNames from "classnames"
import "../plugins.scss"
import styles from "./PluginsOnline.module.scss"

export const PluginsOnline: React.FC<PluginsOnlineProps> = React.memo((props) => {
    const [isShowRoll, setIsShowRoll] = useState<boolean>(true)

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [refresh, setRefresh] = useState<boolean>(false)

    const pluginsOnlineRef = useRef<HTMLDivElement>(null)
    const pluginsOnlineHeardRef = useRef<HTMLDivElement>(null)
    const pluginsOnlineListRef = useRef<HTMLDivElement>(null)

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
                if (scrollTop === 0) {
                    setIsShowRoll(true)
                    if (pluginsOnlineRef.current) {
                        pluginsOnlineRef.current.scrollTop -= 54
                    }
                }
            }
            if (id === "pluginsOnline") {
                const {scrollHeight, clientHeight} = e.target
                const maxScrollTop = Math.max(0, scrollHeight - clientHeight)
                if (scrollTop === maxScrollTop) {
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
    const {refresh, isShowRoll, plugin, setPlugin} = props

    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(true)
    const [selectList, setSelectList] = useState<string[]>([])
    const [allCheck, setAllCheck] = useState<boolean>(false)
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    const [filters, setFilters] = useState<PluginFilterParams>(
        cloneDeep({...defaultFilter, tags: ["Weblogic", "威胁情报"]})
    )

    const [search, setSearch] = useControllableValue<PluginSearchParams>(props, {
        defaultValuePropName: "searchValue",
        valuePropName: "searchValue",
        trigger: "setSearchValue"
    })

    const [timeType, setTimeType] = useState<string>("所有时间")
    const [heatType, setHeatType] = useState<string>("当前最热")

    // const [response, setResponse] = useState<API.YakitPluginListResponse>(cloneDeep(defaultResponse))
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)

    const [hasMore, setHasMore] = useState<boolean>(true)
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)

    // 单项插件删除
    const [activeDelPlugin, setActiveDelPlugin] = useState<YakitPluginOnlineDetail>()

    const [showFilter, setShowFilter] = useState<boolean>(true)

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])

    const fetchList = useLockFn(
        useMemoizedFn(async (reset?: boolean) => {
            if (loading) return

            setLoading(true)

            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: response.pagemeta.page + 1,
                      limit: response.pagemeta.limit || 20
                  }

            const query = {
                ...params,
                ...search,
                ...filters
            }
            if (!showFilter) {
                query["status"] = []
                query["plugin_type"] = []
                query["tags"] = []
            }
            // console.log("query", reset, {...query})
            try {
                const res = await apiFetchList(query)
                if (!res.data) res.data = []
                dispatch({
                    type: "add",
                    payload: {
                        response: {...res}
                    }
                })
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            } catch (error) {
                yakitNotify("error", "请求数据失败:" + error)
            }
        })
    )

    // 请求数据
    useUpdateEffect(() => {
        fetchList(true)
    }, [refresh])
    // 滚动更多加载
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })
    const onSetActive = useMemoizedFn((type: string[]) => {
        setFilters({...filters, type: type})
    })
    /**下载 */
    const onDownload = useMemoizedFn((value?: YakitPluginOnlineDetail) => {
        setVisibleOnline(true)
    })

    const onDelTag = useMemoizedFn((value?: string) => {
        if (!value) setFilters({...filters, tags: []})
        else setFilters({...filters, tags: (filters.tags || []).filter((item) => item !== value)})
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
    const onLikeClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        dispatch({
            type: "unLikeAndLike",
            payload: {
                item: {
                    ...data
                }
            }
        })
    })
    const onCommentClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        yakitNotify("success", "评论~~~")
    })
    const onDownloadClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        dispatch({
            type: "download",
            payload: {
                item: {
                    ...data
                }
            }
        })
        yakitNotify("success", "下载~~~")
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return (
            <OnlineExtraOperate
                likeProps={{
                    active: data.is_stars,
                    likeNumber: data.starsCountString || "",
                    onLikeClick: () => onLikeClick(data)
                }}
                commentProps={{
                    commentNumber: data.commentCountString || "",
                    onCommentClick: () => onCommentClick(data)
                }}
                downloadProps={{
                    downloadNumber: data.downloadedTotalString || "",
                    onDownloadClick: () => onDownloadClick(data)
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

    const onBack = useMemoizedFn((searchValue) => {
        setPlugin(undefined)
        setSearch(searchValue)
    })
    const onSearch = useMemoizedFn(() => {
        fetchList(true)
    })
    return (
        <>
            {!!plugin && (
                <div className={styles["plugins-online-detail"]}>
                    <PluginsOnlineDetail
                        info={plugin}
                        selectList={selectList}
                        allCheck={allCheck}
                        onCheck={onCheck}
                        optCheck={optCheck}
                        loading={loading}
                        data={response}
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
                subTitle={<TypeSelect active={filters.type || []} list={pluginTypeList} setActive={onSetActive} />}
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
                    loading={loading && response.pagemeta.page === 1}
                    visible={showFilter}
                    setVisible={setShowFilter}
                    selecteds={filters as Record<string, string[]>}
                    onSelect={setFilters}
                    groupList={ssfilters}
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
                        tag={filters.tags || []}
                        onDelTag={onDelTag}
                        visible={showFilter}
                        setVisible={setShowFilter}
                        extraHeader={
                            <div className={styles["plugin-list-extra-heard"]}>
                                <FuncFilterPopover
                                    maxWidth={1200}
                                    icon={<OutlineCalendarIcon />}
                                    name={timeType}
                                    menu={{
                                        type: "grey",
                                        data: [
                                            {key: "toDay", label: "今日"},
                                            {key: "thisWeek", label: "本周"},
                                            {key: "thisMonth", label: "本月"},
                                            {key: "allTimes", label: "所有时间"}
                                        ],
                                        onClick: ({key}) => {
                                            switch (key) {
                                                case "toDay":
                                                    setTimeType("今日")
                                                    break
                                                case "thisWeek":
                                                    setTimeType("本周")
                                                    break
                                                case "thisMonth":
                                                    setTimeType("本月")
                                                    break
                                                case "allTimes":
                                                    setTimeType("所有时间")
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
                                    name={heatType}
                                    menu={{
                                        data: [
                                            {key: "currentHottest", label: "当前最热"},
                                            {key: "mostLikes", label: "点赞最多"},
                                            {key: "downloadMost", label: "下载最多"}
                                        ],
                                        className: styles["func-filter-dropdown-menu"],
                                        onClick: ({key}) => {
                                            switch (key) {
                                                case "currentHottest":
                                                    setHeatType("当前最热")
                                                    break
                                                case "mostLikes":
                                                    setHeatType("点赞最多")
                                                    break
                                                case "downloadMost":
                                                    setHeatType("下载最多")
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
                                        // prImgs={data.prs}
                                        time={data.updated_at}
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

const cardImg = [
    {
        id: "1",
        imgUrl: card1,
        link: "https://yaklang.com/products/intro/",
        isQRCode: false
    },
    {
        id: "2",
        imgUrl: card2,
        link: "https://yaklang.com/products/intro/",
        isQRCode: true
    },
    {
        id: "3",
        imgUrl: card3,
        link: "https://space.bilibili.com/437503777",
        isQRCode: false
    }
]

const PluginsOnlineHeard: React.FC<PluginsOnlineHeardProps> = React.memo((props) => {
    const {onSearch} = props
    const [search, setSearch] = useControllableValue<PluginSearchParams>(props)
    const [visibleQRCode, setVisibleQRCode] = useState<boolean>(false)
    const [codeUrl, setCodeUrl] = useState<string>("")
    const onImgClick = useMemoizedFn((ele) => {
        if (ele.isQRCode) {
            setCodeUrl(ele.link)
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
                        key={ele.id}
                        className={styles["plugin-online-heard-card-img"]}
                        src={ele.imgUrl}
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
                        <img alt='' src={qrCode} className={styles["yakit-modal-code-content-url"]} />
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
