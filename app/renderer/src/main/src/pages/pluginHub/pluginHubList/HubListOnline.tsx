import React, {memo, useRef, useMemo, useState, useReducer, useEffect} from "react"
import {useMemoizedFn, useDebounceFn} from "ahooks"
import {OutlineRefreshIcon, OutlineClouddownloadIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {PluginSearchParams, PluginListPageMeta, PluginFilterParams} from "@/pages/plugins/baseTemplateType"
import {defaultSearch} from "@/pages/plugins/builtInData"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {pluginOnlineReducer, initialOnlineState} from "@/pages/plugins/pluginReducer"
import {
    PluginsQueryProps,
    convertPluginsRequestParams,
    apiFetchRecycleList,
    apiFetchGroupStatisticsMine,
    DownloadOnlinePluginsRequest,
    convertDownloadOnlinePluginBatchRequestParams,
    apiDownloadPluginOnline
} from "@/pages/plugins/utils"
import {yakitNotify} from "@/utils/notification"
import {cloneDeep} from "bizcharts/lib/utils"
import useListenWidth from "../hooks/useListenWidth"
import {HubButton} from "../hubExtraOperate/funcTemplate"
import {HubOuterList, HubGridList, HubGridOpt, HubListFilter, OnlineOptFooterExtra} from "./funcTemplate"
import {useStore} from "@/store"
import {OnlineJudgment} from "@/pages/plugins/onlineJudgment/OnlineJudgment"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {HubListBaseProps} from "../type"
import {API} from "@/services/swagger/resposeType"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {isCommunityEdition} from "@/utils/envfile"

import classNames from "classnames"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import styles from "./PluginHubList.module.scss"

interface HubListOnlineProps extends HubListBaseProps {}
/** @name 插件商店 */
export const HubListOnline: React.FC<HubListOnlineProps> = memo((props) => {
    const {hiddenFilter, isDetailList, onPluginDetail} = props

    const divRef = useRef<HTMLDivElement>(null)
    const wrapperWidth = useListenWidth(divRef)

    const userinfo = useStore((s) => s.userInfo)
    const isLogin = useMemo(() => userinfo.isLogin, [userinfo])

    /** ---------- 列表相关变量 Start ---------- */
    const [loading, setLoading] = useState<boolean>(false)
    // 是否为获取列表第一页的加载状态
    const isInitLoading = useRef<boolean>(false)
    const hasMore = useRef<boolean>(true)

    const [filterGroup, setFilterGroup] = useState<API.PluginsSearch[]>([])

    // 列表数据
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    // 全选
    const [allChecked, setAllChecked] = useState<boolean>(false)
    // 选中插件
    const [selectList, setSelectList] = useState<YakitPluginOnlineDetail[]>([])
    // 搜索条件
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters] = useState<PluginFilterParams>({
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
    useEffect(() => {
        if (isLogin) {
            fetchFilterGroup()
            fetchList(true)
        }
    }, [isLogin])

    // 搜搜条件分组数据
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

            const queryFilter = filters
            const queryFearch = search
            const query: PluginsQueryProps = convertPluginsRequestParams(queryFilter, queryFearch, params)
            try {
                const res = await apiFetchRecycleList(query)
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
                    setAllChecked(false)
                    setSelectList([])
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
        fetchList(true)
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
    /** ---------- 列表相关方法 End ---------- */

    const listLength = useMemo(() => {
        return Number(response.pagemeta.total) || 0
    }, [response])
    const isSearch = useMemo(() => {
        if (search.type === "keyword") return !!search.keyword
        if (search.type === "userName") return !!search.userName
        return false
    }, [search])
    const selectedNum = useMemo(() => selectList.length, [selectList])
    const disabledBatchBtn = useMemo(() => {
        return !Number(response.pagemeta.total)
    }, [response.pagemeta.total])

    /** ---------- 下载插件 Start ---------- */
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
                ...convertDownloadOnlinePluginBatchRequestParams(filters, search)
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
            .then(() => {})
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    onCheck(false)
                    setBatchDownloadLoading(false)
                }, 200)
            })
    })

    const headerExtraDownload = useMemoizedFn(() => {
        if (allChecked || selectedNum > 0) {
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

    // 新建插件
    const onNewPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Store}})
        )
    })

    // 进入插件详情
    const onOptClick = useMemoizedFn((info: YakitPluginOnlineDetail, index: number) => {
        if (!info.script_name && !info.uuid) {
            yakitNotify("error", "未获取到插件信息，请刷新列表重试")
            return
        }
        onPluginDetail({type: "own", name: info.script_name, uuid: info.uuid})
    })

    // 批量下载
    const headerExtra = useMemo(() => {
        return (
            <div className={styles["hub-list-header-extra"]}>
                <HubButton
                    width={wrapperWidth}
                    iconWidth={900}
                    icon={<OutlineClouddownloadIcon />}
                    type='outline2'
                    size='large'
                    name={selectedNum > 0 || allChecked ? "下载" : "一键下载"}
                    loading={batchDownloadLoading}
                    disabled={disabledBatchBtn}
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
    }, [wrapperWidth, selectedNum, disabledBatchBtn])
    // 单项的点赞|下载
    const extraFooter = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        return <OnlineOptFooterExtra isLogin={isLogin} info={info} callback={optCallback} />
    })

    return (
        <div className={styles["plugin-hub-tab-list"]}>
            {/* CE版不需要登录，EE和SE版需要登录后才可使用 */}
            <OnlineJudgment isJudgingLogin={!isCommunityEdition()}>
                <YakitSpin spinning={loading && isInitLoading.current}>
                    <div className={classNames(styles["outer-list"], {[styles["hidden-view"]]: isDetailList})}>
                        <div className={classNames(styles["list-filter"], {[styles["hidden-view"]]: hiddenFilter})}>
                            <HubListFilter
                                groupList={filterGroup}
                                selecteds={filters as Record<string, API.PluginsSearchData[]>}
                                onSelect={setFilters}
                            />
                        </div>

                        <div className={styles["list-body"]}>
                            {listLength > 0 ? (
                                <HubOuterList
                                    title='插件商店'
                                    headerExtra={headerExtra}
                                    allChecked={allChecked}
                                    setAllChecked={onCheck}
                                    total={response.pagemeta.total}
                                    selected={selectedNum}
                                    search={search}
                                    setSearch={setSearch}
                                    filters={{}}
                                    setFilters={() => {}}
                                >
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
                                                    official={!!data.isCorePlugin}
                                                    extraFooter={extraFooter}
                                                    onClick={onOptClick}
                                                />
                                            )
                                        }}
                                    />
                                </HubOuterList>
                            ) : isSearch ? (
                                <YakitEmpty
                                    image={SearchResultEmpty}
                                    imageStyle={{width: 274, height: 180, marginBottom: 24}}
                                    title='搜索结果“空”'
                                    style={{paddingTop: "10%"}}
                                    className={styles["hub-list-recycle-empty"]}
                                />
                            ) : (
                                <div className={styles["hub-list-recycle-empty"]}>
                                    <YakitEmpty title='暂无数据' />
                                    <div className={styles["refresh-buttons"]}>
                                        <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={onRefresh}>
                                            刷新
                                        </YakitButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isDetailList && <div className={styles["inner-list"]}></div>}
                </YakitSpin>
            </OnlineJudgment>

            {allDownloadHint && (
                <YakitGetOnlinePlugin visible={allDownloadHint} setVisible={() => setAllDownloadHint(false)} />
            )}
        </div>
    )
})
