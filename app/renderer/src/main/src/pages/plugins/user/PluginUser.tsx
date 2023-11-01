import React, {useState, useRef, useMemo, useEffect, useReducer, forwardRef, useImperativeHandle} from "react"
import {
    FuncBtn,
    FuncFilterPopover,
    FuncSearch,
    GridLayoutOpt,
    ListLayoutOpt,
    ListShowContainer,
    PluginsList,
    TypeSelect
} from "../funcTemplate"
import {
    OutlineClouddownloadIcon,
    OutlineDatabasebackupIcon,
    OutlineDotshorizontalIcon,
    OutlineLockclosedIcon,
    OutlineLockopenIcon,
    OutlinePlusIcon,
    OutlineShareIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useMemoizedFn, useDebounceFn, useLockFn, useControllableValue, useInViewport, useLatest} from "ahooks"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import {OnlineJudgment} from "../onlineJudgment/OnlineJudgment"
import cloneDeep from "lodash/cloneDeep"
import {PluginsContainer, PluginsLayout, defaultSearch, pluginStatusToName, statusTag} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {yakitNotify} from "@/utils/notification"
import {
    OnlineUserExtraOperateProps,
    PluginRecycleListRefProps,
    PluginUserDetailBackProps,
    PluginUserListProps,
    PluginUserListRefProps,
    PluginUserProps
} from "./PluginUserType"
import {YakitSegmented} from "@/components/yakitUI/YakitSegmented/YakitSegmented"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PluginUserDetail} from "./PluginUserDetail"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {PrivatePluginIcon} from "@/assets/newIcon"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {API} from "@/services/swagger/resposeType"
import {TypeSelectOpt} from "../funcTemplateType"
import {useStore} from "@/store"
import {
    DownloadOnlinePluginsRequest,
    PluginGV,
    PluginsQueryProps,
    apiDeletePluginMine,
    apiDownloadPluginMine,
    apiFetchGroupStatisticsMine,
    apiFetchMineList,
    apiUpdatePluginPrivateMine,
    convertDownloadOnlinePluginBatchRequestParams,
    convertPluginsRequestParams
} from "../utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {PluginRecycleList} from "./PluginRecycleList"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"

import classNames from "classnames"
import "../plugins.scss"
import styles from "./PluginUser.module.scss"

const {ipcRenderer} = window.require("electron")

export const mePluginTypeList = [
    {
        label: "我的云端插件",
        value: "myOnlinePlugin"
    },
    {
        label: "回收站",
        value: "recycle"
    }
]

/**公开/私密 */
const onlinePluginTypeList = [
    {
        key: "1", // 公开
        name: pluginStatusToName["1"],
        icon: <SolidCloudpluginIcon />
    },
    {
        key: "2", // 私密
        name: pluginStatusToName["2"],
        icon: <SolidPrivatepluginIcon />
    }
]

export type MePluginType = "myOnlinePlugin" | "recycle"

export const PluginUser: React.FC<PluginUserProps> = React.memo((props) => {
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [allCheckUser, setAllCheckUser] = useState<boolean>(false)
    const [selectListUser, setSelectListUser] = useState<string[]>([])

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()

    const [isSelectUserNum, setIsSelectUserNum] = useState<boolean>(false) // 我的插件是否有勾选
    const [isSelectRecycleNum, setIsSelectRecycleNum] = useState<boolean>(false) // 回收站是否有勾选

    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters] = useState<PluginFilterParams>({
        plugin_type: [],
        tags: [],
        status: [],
        plugin_private: []
    })
    const [refreshUser, setRefreshUser] = useState<boolean>(false)
    const [refreshRecycle, setRefreshRecycle] = useState<boolean>(false)

    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)
    const [userPluginType, setUserPluginType] = useState<MePluginType>("myOnlinePlugin")

    const [downloadLoading, setDownloadLoading] = useState<boolean>(false) // 我的插件批量下载

    const pluginUserListRef = useRef<PluginUserListRefProps>({
        allCheck: false,
        selectList: [],
        loadMoreData: () => {},
        onRemovePluginBatchBefore: () => {},
        onDownloadBatch: () => {},
        onRemovePluginDetailSingleBefore: () => {},
        onDetailSearch: () => {},
        spinLoading: false
    })

    const pluginRecycleListRef = useRef<PluginRecycleListRefProps>({
        allCheck: false,
        selectList: [],
        onRemovePluginBatchBefore: () => {},
        onReductionPluginBatchBefore: () => {}
    })
    const pluginsListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsListRef)

    const userInfo = useStore((s) => s.userInfo)

    const onRemove = useMemoizedFn(() => {
        if (pluginUserListRef.current.onRemovePluginBatchBefore) pluginUserListRef.current.onRemovePluginBatchBefore()
    })
    const onRecycleRemove = useMemoizedFn(() => {
        if (pluginRecycleListRef.current.onRemovePluginBatchBefore)
            pluginRecycleListRef.current.onRemovePluginBatchBefore()
    })
    const onRecycleReduction = useMemoizedFn(() => {
        if (pluginRecycleListRef.current.onReductionPluginBatchBefore)
            pluginRecycleListRef.current.onReductionPluginBatchBefore()
    })
    const onSwitchUserPluginType = useDebounceFn(
        useMemoizedFn((v) => {
            setUserPluginType(v as MePluginType)
        }),
        {wait: 200, leading: true}
    ).run
    /**新建插件 */
    const onNewAddPlugin = useMemoizedFn(() => {})
    /**下载 */
    const onDownload = useMemoizedFn(() => {
        if (isSelectUserNum) {
            if (pluginUserListRef.current.onDownloadBatch) pluginUserListRef.current.onDownloadBatch()
        } else {
            setVisibleOnline(true)
        }
    })
    const onSetActive = useMemoizedFn((pluginPrivate: TypeSelectOpt[]) => {
        const newPluginPrivate: API.PluginsSearchData[] = pluginPrivate.map((ele) => ({
            value: ele.key === "2" ? "true" : "false",
            label: ele.name,
            count: 0
        }))
        setFilters({...filters, plugin_private: newPluginPrivate})
    })
    const onBack = useMemoizedFn((backValues: PluginUserDetailBackProps) => {
        setPlugin(undefined)
        setSearch(backValues.search)
        setFilters(backValues.filter)
        setAllCheckUser(backValues.allCheck)
        setSelectListUser(backValues.selectList)
    })
    /**
     * @description 此方法防抖不要加leading：true,会影响search拿到最新得值，用useLatest也拿不到最新得；如若需要leading：true，则需要使用setTimeout包fetchList
     */
    const onSearch = useDebounceFn(
        useMemoizedFn(() => {
            if (userPluginType === "myOnlinePlugin") {
                setRefreshUser(!refreshUser)
            } else {
                setRefreshRecycle(!refreshRecycle)
            }
        }),
        {wait: 200}
    ).run
    const pluginPrivateSelect: TypeSelectOpt[] = useMemo(() => {
        return (
            filters.plugin_private?.map((ele) => ({
                key: ele.value === "true" ? "2" : "1",
                name: ele.label
            })) || []
        )
    }, [filters.plugin_private])
    /**在回收站时,刷新我的插件 */
    const onRefreshUserList = useDebounceFn(
        useMemoizedFn(() => {
            setRefreshUser(!refreshUser)
        }),
        {wait: 500, leading: true}
    ).run
    /**在选中我的插件时,刷新回收站 */
    const onRefreshRecycleList = useDebounceFn(
        useMemoizedFn(() => {
            setRefreshRecycle(!refreshRecycle)
        }),
        {wait: 500, leading: true}
    ).run
    return (
        <OnlineJudgment isJudgingLogin={true}>
            {!!plugin && (
                <PluginUserDetail
                    info={plugin}
                    defaultSelectList={pluginUserListRef.current.selectList}
                    defaultAllCheck={pluginUserListRef.current.allCheck}
                    response={response}
                    onBack={onBack}
                    loadMoreData={pluginUserListRef.current.loadMoreData}
                    defaultSearchValue={search}
                    defaultFilter={filters}
                    dispatch={dispatch}
                    onRemovePluginDetailSingleBefore={pluginUserListRef.current.onRemovePluginDetailSingleBefore}
                    onDetailSearch={pluginUserListRef.current.onDetailSearch}
                    spinLoading={pluginUserListRef.current.spinLoading}
                />
            )}
            <PluginsLayout
                title={
                    <YakitSegmented
                        value={userPluginType}
                        onChange={onSwitchUserPluginType}
                        options={mePluginTypeList}
                    />
                }
                hidden={!!plugin}
                subTitle={
                    userPluginType === "myOnlinePlugin" && (
                        <TypeSelect active={pluginPrivateSelect} list={onlinePluginTypeList} setActive={onSetActive} />
                    )
                }
                extraHeader={
                    <div className='extra-header-wrapper' ref={pluginsListRef}>
                        <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                        <div className='divider-style'></div>
                        <div className='btn-group-wrapper'>
                            {userPluginType === "myOnlinePlugin" ? (
                                <>
                                    <FuncBtn
                                        maxWidth={1050}
                                        icon={<OutlineClouddownloadIcon />}
                                        type='outline2'
                                        size='large'
                                        name={isSelectUserNum ? "下载" : "一键下载"}
                                        onClick={onDownload}
                                        loading={downloadLoading}
                                    />
                                    <FuncBtn
                                        maxWidth={1050}
                                        icon={<OutlineTrashIcon />}
                                        type='outline2'
                                        size='large'
                                        name={isSelectUserNum ? "删除" : "清空"}
                                        onClick={onRemove}
                                    />
                                    <FuncBtn
                                        maxWidth={1050}
                                        icon={<SolidPluscircleIcon />}
                                        size='large'
                                        name='新建插件'
                                        onClick={onNewAddPlugin}
                                    />
                                </>
                            ) : (
                                <>
                                    <FuncBtn
                                        maxWidth={1050}
                                        icon={<OutlineTrashIcon />}
                                        type='outline2'
                                        size='large'
                                        name={isSelectRecycleNum ? "删除" : "清空"}
                                        onClick={onRecycleRemove}
                                    />
                                    <FuncBtn
                                        maxWidth={1050}
                                        icon={<OutlineDatabasebackupIcon />}
                                        size='large'
                                        name='还原'
                                        onClick={onRecycleReduction}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                }
            >
                <div
                    className={classNames(styles["plugin-user-list"], {
                        [styles["plugin-user-list-hidden"]]: userPluginType === "recycle"
                    })}
                    tabIndex={userPluginType === "recycle" ? -1 : 0}
                >
                    <PluginUserList
                        ref={pluginUserListRef}
                        inViewport={inViewport}
                        isLogin={userInfo.isLogin}
                        refresh={refreshUser}
                        setIsSelectUserNum={setIsSelectUserNum}
                        plugin={plugin}
                        setPlugin={setPlugin}
                        searchValue={search}
                        setSearchValue={setSearch}
                        filters={filters}
                        setFilters={setFilters}
                        response={response}
                        dispatch={dispatch}
                        defaultAllCheck={allCheckUser}
                        defaultSelectList={selectListUser}
                        onRefreshRecycleList={onRefreshRecycleList}
                        setDownloadLoading={setDownloadLoading}
                    />
                </div>
                <div
                    className={classNames(styles["plugin-recycle-list"], {
                        [styles["plugin-user-list-hidden"]]: userPluginType === "myOnlinePlugin"
                    })}
                    tabIndex={userPluginType === "myOnlinePlugin" ? -1 : 0}
                >
                    <PluginRecycleList
                        ref={pluginRecycleListRef}
                        refresh={refreshRecycle}
                        inViewport={inViewport}
                        isLogin={userInfo.isLogin}
                        searchValue={search}
                        setSearchValue={setSearch}
                        setIsSelectRecycleNum={setIsSelectRecycleNum}
                        onRefreshUserList={onRefreshUserList}
                    />
                </div>
            </PluginsLayout>
            {visibleOnline && (
                <YakitGetOnlinePlugin
                    visible={visibleOnline}
                    setVisible={(v) => {
                        setVisibleOnline(v)
                    }}
                />
            )}
        </OnlineJudgment>
    )
})

const PluginUserList: React.FC<PluginUserListProps> = React.memo(
    forwardRef((props, ref) => {
        const {
            refresh,
            isLogin,
            inViewport,
            setIsSelectUserNum,
            plugin,
            setPlugin,
            dispatch,
            response,
            defaultAllCheck,
            defaultSelectList,
            onRefreshRecycleList,
            setDownloadLoading
        } = props
        /** 是否为加载更多 */
        const [loading, setLoading] = useState<boolean>(false)

        /** 是否为初次加载 */
        const isLoadingRef = useRef<boolean>(true)
        const [allCheck, setAllCheck] = useState<boolean>(defaultAllCheck)

        const [filters, setFilters] = useControllableValue<PluginFilterParams>(props, {
            defaultValuePropName: "filters",
            valuePropName: "filters",
            trigger: "setFilters"
        })
        const [search, setSearch] = useControllableValue<PluginSearchParams>(props, {
            defaultValuePropName: "searchValue",
            valuePropName: "searchValue",
            trigger: "setSearchValue"
        })

        const [pluginUserGroupList, setPluginUserGroupList] = useState<API.PluginsSearch[]>([])
        const [initTotal, setInitTotal] = useState<number>(0)

        const [isList, setIsList] = useState<boolean>(true)
        const [selectList, setSelectList] = useState<string[]>(defaultSelectList)

        const [hasMore, setHasMore] = useState<boolean>(true)

        const [showFilter, setShowFilter] = useState<boolean>(true)
        const [pluginRemoveCheck, setPluginRemoveCheck] = useState<boolean>(false)
        const [removeCheckVisible, setRemoveCheckVisible] = useState<boolean>(false)

        const removePluginRef = useRef<YakitPluginOnlineDetail>()
        const removePluginDetailRef = useRef<YakitPluginOnlineDetail>()

        const filtersDetailRef = useRef<PluginFilterParams>() // 详情中的filter条件
        const searchDetailRef = useRef<PluginSearchParams>() // 详情中的search条件

        const latestLoadingRef = useLatest(loading)
        const userInfo = useStore((s) => s.userInfo)

        // 选中插件的数量
        const selectNum = useMemo(() => {
            if (allCheck) return response.pagemeta.total
            else return selectList.length
        }, [allCheck, selectList, response.pagemeta.total])
        const spinLoading = loading && isLoadingRef.current //不用useMemo
        useImperativeHandle(
            ref,
            () => ({
                allCheck,
                selectList,
                loadMoreData: onUpdateList,
                onRemovePluginBatchBefore,
                onDownloadBatch,
                onRemovePluginDetailSingleBefore,
                onDetailSearch,
                spinLoading
            }),
            [allCheck, selectList, spinLoading]
        )
        useEffect(() => {
            /** 返回到列表页中需要清除详情页中的search和filter条件 */
            if (!plugin) {
                searchDetailRef.current = undefined
                filtersDetailRef.current = undefined
            }
        }, [plugin])
        useEffect(() => {
            setSelectList(defaultSelectList)
        }, [defaultSelectList])
        useEffect(() => {
            setAllCheck(defaultAllCheck)
        }, [defaultAllCheck])
        useEffect(() => {
            getInitTotal()
            getPluginRemoveCheck()
        }, [isLogin, inViewport, refresh])
        useEffect(() => {
            fetchList(true)
        }, [isLogin, refresh, filters])
        useEffect(() => {
            getPluginGroupList()
        }, [isLogin, inViewport])
        useEffect(() => {
            setIsSelectUserNum(selectList.length > 0 || allCheck)
        }, [selectList.length, allCheck])
        const getInitTotal = useMemoizedFn(() => {
            apiFetchMineList({
                page: 1,
                limit: 1
            }).then((res) => {
                setInitTotal(+res.pagemeta.total)
            })
        })

        const fetchList = useDebounceFn(
            useMemoizedFn(async (reset?: boolean) => {
                // if (latestLoadingRef.current) return //先注释，有影响
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
                const queryFilters = filtersDetailRef.current ? filtersDetailRef.current : filters
                const querySearch = searchDetailRef.current ? searchDetailRef.current : search
                const query: PluginsQueryProps = convertPluginsRequestParams(queryFilters, querySearch, params)
                try {
                    const res = await apiFetchMineList(query)
                    const length = res.data.length + response.data.length
                    setHasMore(length < +res.pagemeta.total)
                    if (!res.data) res.data = []
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
        /**获取插件删除的提醒记录状态 */
        const getPluginRemoveCheck = useMemoizedFn(() => {
            getRemoteValue(PluginGV.UserPluginRemoveCheck).then((data) => {
                setPluginRemoveCheck(data === "true" ? true : false)
            })
        })
        /**获取分组统计列表 */
        const getPluginGroupList = useMemoizedFn(() => {
            apiFetchGroupStatisticsMine().then((res) => {
                setPluginUserGroupList(res.data)
            })
        })
        /** 单项勾选|取消勾选 */
        const optCheck = useMemoizedFn((data: YakitPluginOnlineDetail, value: boolean) => {
            // 全选情况时的取消勾选
            if (allCheck) {
                setSelectList(response.data.map((item) => item.uuid).filter((item) => item !== data.uuid))
                setAllCheck(false)
                return
            }
            // 单项勾选回调
            if (value) {
                setSelectList([...selectList, data.uuid])
            } else {
                const newSelectList = selectList.filter((item) => item !== data.uuid)
                setSelectList(newSelectList)
            }
        })
        // 滚动更多加载
        const onUpdateList = useMemoizedFn((reset?: boolean) => {
            fetchList()
        })
        /** 单项额外操作组件 */
        const optExtraNode = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            return (
                <div className={styles["plugin-user-extra-node"]}>
                    <OnlineUserExtraOperate
                        plugin={data}
                        dispatch={dispatch}
                        userInfoRole={userInfo.role || ""}
                        onSelect={onUserSelect}
                    />
                </div>
            )
        })
        /** 单项副标题组件 */
        const optSubTitle = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            return <>{data.is_private ? <PrivatePluginIcon /> : statusTag[`${data.status}`]}</>
        })
        /** 单项点击回调 */
        const optClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            setPlugin(data)
        })
        const onUserSelect = useMemoizedFn((key: string, data: YakitPluginOnlineDetail) => {
            switch (key) {
                case "remove":
                    onRemovePluginSingleBefore(data)
                    break
                default:
                    break
            }
        })

        /**批量下载 */
        const onDownloadBatch = useMemoizedFn(() => {
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
            setDownloadLoading(true)
            apiDownloadPluginMine(downloadParams).finally(() =>
                setTimeout(() => {
                    setDownloadLoading(false)
                }, 200)
            )
        })
        /**详情中调用删除之前操作 */
        const onRemovePluginDetailSingleBefore = useMemoizedFn((data) => {
            removePluginDetailRef.current = data
            if (pluginRemoveCheck) {
                onRemovePluginDetailSingle(data)
            } else {
                setRemoveCheckVisible(true)
            }
        })
        /**详情中调用删除操作 */
        const onRemovePluginDetailSingle = useMemoizedFn((data) => {
            onRemovePluginSingleBase(data).then(() => {
                if (response.data.length === 1) {
                    // 如果删除是最后一个，就回到列表中得空页面
                    setPlugin(undefined)
                } else {
                    const index = response.data.findIndex((ele) => ele.uuid === data.uuid)
                    if (index === -1) return
                    if (index === Number(response.pagemeta.total) - 1) {
                        // 选中得item为最后一个，删除后选中倒数第二个
                        setPlugin({
                            ...response.data[index - 1]
                        })
                    } else {
                        //选择下一个
                        setPlugin({
                            ...response.data[index + 1]
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
        })
        /**单个删除之前操作 */
        const onRemovePluginSingleBefore = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            removePluginRef.current = data
            if (pluginRemoveCheck) {
                onRemovePluginSingle(data)
            } else {
                setRemoveCheckVisible(true)
            }
        })
        /** 批量删除插件之前操作 */
        const onRemovePluginBatchBefore = useMemoizedFn(() => {
            if (pluginRemoveCheck) {
                onRemovePluginBatch()
            } else {
                setRemoveCheckVisible(true)
            }
        })
        /** 列表页面 单个删除 */
        const onRemovePluginSingle = useMemoizedFn(async (data: YakitPluginOnlineDetail) => {
            onRemovePluginSingleBase(data).then(() => {
                dispatch({
                    type: "remove",
                    payload: {
                        itemList: [data]
                    }
                })
            })
        })
        /**单个删除基础版 */
        const onRemovePluginSingleBase = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            let deleteParams: API.PluginsWhereDeleteRequest = {
                uuid: [data.uuid]
            }
            return new Promise<void>((resolve, reject) => {
                apiDeletePluginMine(deleteParams)
                    .then(() => {
                        const index = selectList.findIndex((ele) => ele === data.uuid)
                        if (index !== -1) {
                            optCheck(data, false)
                        }
                        setRemoteValue(PluginGV.UserPluginRemoveCheck, `${pluginRemoveCheck}`)
                        removePluginRef.current = undefined
                        removePluginDetailRef.current = undefined
                        setRemoveCheckVisible(false)
                        getInitTotal()
                        getPluginGroupList()
                        onRefreshRecycleList()
                        // 再做单独处理
                        resolve()
                    })
                    .catch(reject)
            })
        })
        /**批量删除 */
        const onRemovePluginBatch = useMemoizedFn(async () => {
            setLoading(true)
            try {
                if (!allCheck && selectList.length === 0) {
                    // 删除全部，清空
                    await apiDeletePluginMine()
                } else {
                    // 批量删除
                    let deleteParams: API.PluginsWhereDeleteRequest = {}

                    if (allCheck) {
                        deleteParams = {
                            ...convertPluginsRequestParams(filters, search)
                        }
                    } else {
                        deleteParams = {
                            uuid: selectList
                        }
                    }
                    await apiDeletePluginMine(deleteParams)
                }
            } catch (error) {}

            setRemoveCheckVisible(false)
            setSelectList([])
            if (allCheck) {
                setAllCheck(false)
                setIsSelectUserNum(false)
            }
            getInitTotal()
            getPluginGroupList()
            onRefreshRecycleList()
            setRemoteValue(PluginGV.UserPluginRemoveCheck, `${pluginRemoveCheck}`)
            setLoading(false)
            fetchList(true)
        })

        /**全选 */
        const onCheck = useMemoizedFn((value: boolean) => {
            if (value) setSelectList([])
            setAllCheck(value)
            setIsSelectUserNum(value)
        })
        /**新建插件 */
        const onAddPlugin = useMemoizedFn(() => {})
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
        /** 详情搜索事件 */
        const onDetailSearch = useMemoizedFn((detailSearch: PluginSearchParams, detailFilter: PluginFilterParams) => {
            searchDetailRef.current = detailSearch
            filtersDetailRef.current = detailFilter
            fetchList(true)
        })
        return (
            <>
                <PluginsContainer
                    loading={loading && isLoadingRef.current}
                    visible={showFilter}
                    setVisible={setShowFilter}
                    selecteds={filters as Record<string, API.PluginsSearchData[]>}
                    onSelect={setFilters}
                    groupList={pluginUserGroupList}
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
                    >
                        {initTotal > 0 ? (
                            <ListShowContainer<YakitPluginOnlineDetail>
                                isList={isList}
                                data={response.data}
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
                                            isCorePlugin={!!data.isCorePlugin}
                                            official={!!data.isCorePlugin}
                                            subTitle={optSubTitle}
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
                        ) : (
                            <div className={styles["plugin-user-empty"]}>
                                <YakitEmpty title='暂无数据' description='可新建插件同步至云端，创建属于自己的插件' />
                                <div className={styles["plugin-user-buttons"]}>
                                    <YakitButton type='outline1' icon={<OutlinePlusIcon />} onClick={onAddPlugin}>
                                        新建插件
                                    </YakitButton>
                                </div>
                            </div>
                        )}
                    </PluginsList>
                </PluginsContainer>
                <YakitHint
                    visible={removeCheckVisible}
                    title='是否要删除插件'
                    content='确认删除插件后，插件将会放在回收站'
                    onOk={onPluginRemoveCheckOk}
                    onCancel={() => setRemoveCheckVisible(false)}
                    footerExtra={
                        <YakitCheckbox
                            checked={pluginRemoveCheck}
                            onChange={(e) => setPluginRemoveCheck(e.target.checked)}
                        >
                            下次不再提醒
                        </YakitCheckbox>
                    }
                />
            </>
        )
    })
)

export const OnlineUserExtraOperate: React.FC<OnlineUserExtraOperateProps> = React.memo((props) => {
    const {plugin, onSelect, dispatch, userInfoRole} = props
    const onShare = useMemoizedFn((uuid: string) => {
        ipcRenderer.invoke("copy-clipboard", uuid).then(() => {
            yakitNotify("success", "分享ID复制成功")
        })
    })
    /**下载 */
    const onDownloadClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        let downloadParams: DownloadOnlinePluginsRequest = {
            UUID: [data.uuid]
        }
        apiDownloadPluginMine(downloadParams)
    })
    /**更改私有状态 */
    const onUpdatePrivate = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        const updateItem: API.UpPluginsPrivateRequest = {
            uuid: [data.uuid],
            is_private: !data.is_private
        }
        apiUpdatePluginPrivateMine(updateItem).then(() => {
            const isPrivate: boolean = !data.is_private
            let status: number = 0
            if (userInfoRole === "ordinary") {
                // 为待审核
                status = 0
            } else {
                // 为审核通过
                if (!isPrivate) status = 1
            }
            dispatch({
                type: "update",
                payload: {
                    item: {
                        ...data,
                        is_private: isPrivate,
                        status: status
                    }
                }
            })
            // 我的插件详情修改私密公开状态，需要使用回调
            onSelect("editState", plugin)
        })
    })
    const onClick = useMemoizedFn(({key}) => {
        switch (key) {
            case "share":
                onShare(plugin.uuid)
                break
            case "download":
                onDownloadClick(plugin)
                break
            case "editState":
                onUpdatePrivate(plugin)
                break
            default:
                onSelect(key, plugin)
                break
        }
    })
    return (
        <FuncFilterPopover
            icon={<OutlineDotshorizontalIcon />}
            menu={{
                type: "primary",
                data: [
                    {
                        key: "share",
                        label: "分享",
                        itemIcon: <OutlineShareIcon className={styles["plugin-user-extra-node-icon"]} />
                    },
                    {
                        key: "download",
                        label: "下载",
                        itemIcon: <OutlineClouddownloadIcon className={styles["plugin-user-extra-node-icon"]} />
                    },
                    {
                        key: "editState",
                        label: plugin.is_private ? "改为公开" : "改为私密",
                        itemIcon: plugin.is_private ? (
                            <OutlineLockopenIcon className={styles["plugin-user-extra-node-icon"]} />
                        ) : (
                            <OutlineLockclosedIcon className={styles["plugin-user-extra-node-icon"]} />
                        )
                    },
                    {type: "divider"},
                    {
                        key: "remove",
                        itemIcon: <OutlineTrashIcon className={styles["plugin-user-extra-node-icon"]} />,
                        label: "删除",
                        type: "danger"
                    }
                ],
                className: styles["func-filter-dropdown-menu"],
                onClick: onClick
            }}
            button={{type: "text2"}}
            placement='bottomRight'
        />
    )
})
