import React, {useState, useRef, useMemo, useEffect} from "react"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    FuncBtn,
    FuncFilterPopver,
    FuncSearch,
    GridLayoutOpt,
    ListLayoutOpt,
    ListShowContainer,
    PluginsList,
    TypeSelect,
    funcSearchType
} from "../funcTemplate"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {
    OutlineClouddownloadIcon,
    OutlineDotshorizontalIcon,
    OutlinePencilaltIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import classNames from "classnames"
import {
    useMemoizedFn,
    useInViewport,
    useEventListener,
    useSize,
    useThrottleFn,
    useScroll,
    useNetwork,
    useDebounceFn,
    useUpdateEffect,
    useGetState
} from "ahooks"
import {openExternalWebsite} from "@/utils/openWebsite"
import card1 from "./card1.png"
import card2 from "./card2.png"
import card3 from "./card3.png"
import qrCode from "./qrCode.png"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {OnlineJudgment} from "../onlineJudgment/OnlineJudgment"
import {
    PluginsOnlineHeardProps,
    PluginsOnlineListProps,
    PluginsOnlineProps,
    YakitCombinationSearchCircleProps
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
    pluginTypeToName,
    statusTag
} from "../baseTemplate"
import {TypeSelectOpt} from "../funcTemplateType"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {PluginManageDetail} from "../manage/PluginManageDetail"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import "../plugins.scss"
import styles from "./PluginsOnline.module.scss"

const TypeType: TypeSelectOpt[] = [
    {key: "yak", ...pluginTypeToName["yak"]},
    {key: "mitm", ...pluginTypeToName["mitm"]},
    {key: "port-scan", ...pluginTypeToName["port-scan"]},
    {key: "codec", ...pluginTypeToName["codec"]},
    {key: "lua", ...pluginTypeToName["lua"]},
    {key: "nuclei", ...pluginTypeToName["nuclei"]}
]

export const PluginsOnline: React.FC<PluginsOnlineProps> = React.memo((props) => {
    const pluginsOnlineRef = useRef<HTMLDivElement>(null)
    const pluginsOnlineHeardRef = useRef<HTMLDivElement>(null)
    const pluginsOnlineListRef = useRef<HTMLDivElement>(null)

    const [isShowRoll, setIsShowRoll] = useState<boolean>(true)

    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((change) => {
                    // console.log("change", change)
                    if (change.intersectionRatio <= 0) {
                        setIsShowRoll(false)
                        // pluginsOnlineListRef.current?.focus()
                    } else {
                        setIsShowRoll(true)
                    }
                })
            },
            {
                root: pluginsOnlineRef.current
            }
        )
        setTimeout(() => {
            if (pluginsOnlineHeardRef.current) {
                io.observe(pluginsOnlineHeardRef.current)
            }
        }, 1000)
        return () => {
            io.disconnect()
        }
    }, [pluginsOnlineHeardRef])
    useEffect(() => {
        window.addEventListener("scroll", handleScroll, true)
        return () => {
            window.removeEventListener("scroll", handleScroll, true)
        }
    }, [])
    const handleScroll = useDebounceFn(
        useMemoizedFn((e) => {
            e.stopPropagation()
            if (e.target.id === "online-list" || e.target.id === "online-grid") {
                const {scrollTop} = e.target
                // console.log("scrollTop", scrollTop)
                if (scrollTop === 0) {
                    setIsShowRoll(true)
                    pluginsOnlineRef.current?.focus()
                }
            }
        }),
        {wait: 200, leading: true}
    ).run
    return (
        <OnlineJudgment>
            <div
                className={classNames(styles["plugins-online"], {
                    [styles["plugins-online-overflow-hidden"]]: !isShowRoll
                })}
            >
                <div ref={pluginsOnlineRef} className={classNames(styles["plugins-online-body"])}>
                    <div ref={pluginsOnlineHeardRef}>
                        <PluginsOnlineHeard />
                    </div>
                    <div
                        className={classNames(styles["plugins-online-list"], {
                            [styles["plugins-online-list-no-roll"]]: isShowRoll
                        })}
                        ref={pluginsOnlineListRef}
                    >
                        <PluginsOnlineList />
                    </div>
                </div>
            </div>
        </OnlineJudgment>
    )
})

const PluginsOnlineList: React.FC<PluginsOnlineListProps> = React.memo((props) => {
    // 获取插件列表数据-相关逻辑
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    /** 是否为首页加载 */
    const isLoadingRef = useRef<boolean>(true)
    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(true)

    const [plugin, setPlugin] = useState<API.YakitPluginDetail>()
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, setResponse] = useState<API.YakitPluginListResponse>(cloneDeep(defaultResponse))
    const [hasMore, setHasMore] = useState<boolean>(true)

    // 单项插件删除
    const [activeDelPlugin, setActiveDelPlugin] = useState<API.YakitPluginDetail>()

    const [showFilter, setShowFilter] = useState<boolean>(true)

    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList, getSelectList] = useGetState<string[]>([])
    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])

    const fetchList = useMemoizedFn((reset?: boolean) => {
        if (loading) return

        setLoading(true)

        const params: PluginListPageMeta = !!reset
            ? {page: 1, limit: 20}
            : {
                  page: response.pagemeta.page + 1,
                  limit: response.pagemeta.limit || 20
              }

        apiFetchList(params)
            .then((res: API.YakitPluginListResponse) => {
                if (!res.data) res.data = []

                const data = false && res.pagemeta.page === 1 ? res.data : response.data.concat(res.data)
                // const isMore = res.data.length < res.pagemeta.limit || data.length === response.pagemeta.total
                // setHasMore(!isMore)
                // console.log(data)

                setResponse({
                    ...res,
                    data: [...data]
                })
                isLoadingRef.current = false
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })

    // 页面初始化的首次列表请求
    useEffect(() => {
        fetchList(true)
    }, [])
    // 滚动更多加载
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })
    const onSetActive = useMemoizedFn((status: string[]) => {
        setFilters({...filters, status: status})
    })
    /**下载 */
    const onDownload = useMemoizedFn((value?: API.YakitPluginDetail) => {})
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        if (value) setSelectList([])
        setAllCheck(value)
    })
    const onDelTag = useMemoizedFn((value?: string) => {
        if (!value) setFilters({...filters, tags: []})
        else setFilters({...filters, tags: (filters.tags || []).filter((item) => item !== value)})
    })
    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: API.YakitPluginDetail, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.data.map((item) => item.uuid).filter((item) => item !== data.uuid))
            setAllCheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...getSelectList(), data.uuid])
        else setSelectList(getSelectList().filter((item) => item !== data.uuid))
    })
    /** 单项副标题组件 */
    const optSubTitle = useMemoizedFn((data: API.YakitPluginDetail) => {
        return <>{statusTag[`${1 % 3}`]}</>
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: API.YakitPluginDetail) => {
        return (
            <FuncFilterPopver
                icon={<OutlineDotshorizontalIcon />}
                name={""}
                menu={{
                    data: [
                        {key: "del", label: "删除"},
                        {key: "download", label: "下载"}
                    ],
                    className: styles["func-filter-dropdown-menu"],
                    onClick: ({key}) => {
                        switch (key) {
                            // case "download":
                            //     onDownload(data)
                            //     break
                            default:
                                break
                        }
                    }
                }}
                placement='bottomRight'
            />
        )
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: API.YakitPluginDetail) => {
        setPlugin({...data})
    })
    /**新建插件 */
    const onNewAddPlugin = useMemoizedFn(() => {})
    // 关键词/作者搜索
    const onKeywordAndUser = useMemoizedFn((type: string | null, value: string) => {
        if (!type) setSearch(cloneDeep(defaultSearch))
        else {
            if (type === "keyword") setSearch({...search, keyword: value})
            if (type === "user") setSearch({...search, userName: value})
        }
    })
    return (
        <>
            {!!plugin && (
                <PluginManageDetail
                    info={plugin}
                    allCheck={allCheck}
                    onCheck={onCheck}
                    data={response}
                    selected={selectNum}
                    onBack={() => {}}
                />
            )}
            <PluginsLayout
                title='插件管理'
                hidden={!!plugin}
                subTitle={<TypeSelect active={filters.status || []} list={TypeType} setActive={onSetActive} />}
                extraHeader={
                    <div className={styles["online-extra-header-wrapper"]}>
                        <FuncSearch onSearch={onKeywordAndUser} />
                        <div className='divider-style'></div>
                        <div className={styles["btn-group-wrapper"]}>
                            <FuncBtn
                                icon={<OutlineClouddownloadIcon className='btn-icon-color' />}
                                name={selectNum > 0 ? "下载" : "一键下载"}
                                onClick={() => onDownload()}
                            />
                            <FuncBtn
                                type='primary'
                                icon={<SolidPluscircleIcon />}
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
                    selecteds={filters as Record<string, string[]>}
                    onSelect={setFilters}
                    groupList={ssfilters}
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
                    >
                        <ListShowContainer<API.YakitPluginDetail>
                            id='online'
                            isList={isList}
                            data={response.data}
                            gridNode={(info: {index: number; data: API.YakitPluginDetail}) => {
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
                                        subTitle={optSubTitle}
                                        extraFooter={optExtraNode}
                                        onClick={optClick}
                                    />
                                )
                            }}
                            gridHeight={210}
                            listNode={(info: {index: number; data: API.YakitPluginDetail}) => {
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
                        />
                    </PluginsList>
                </PluginsContainer>
            </PluginsLayout>
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
                    <YakitCombinationSearchCircle />
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
    return (
        <div className={styles["yakit-combination-search-circle"]}>
            <YakitSelect
                defaultValue='keyword'
                wrapperStyle={{width: 75}}
                wrapperClassName={styles["yakit-combination-search-circle-select-wrapper"]}
                bordered={false}
                options={funcSearchType}
            />
            <div className={styles["yakit-combination-search-circle-line"]} />
            <YakitInput
                className={styles["yakit-combination-search-circle-input"]}
                wrapperClassName={styles["yakit-combination-search-circle-input-wrapper"]}
                bordered={false}
                placeholder='请输入关键词搜索插件'
            />
            <div className={classNames(styles["yakit-combination-search-circle-icon"])}>
                <OutlineSearchIcon />
            </div>
        </div>
    )
})
