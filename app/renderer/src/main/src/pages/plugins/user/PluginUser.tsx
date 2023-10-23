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
import {useMemoizedFn, useDebounceFn, useLockFn, useControllableValue, useInViewport} from "ahooks"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import {OnlineJudgment} from "../onlineJudgment/OnlineJudgment"
import cloneDeep from "lodash/cloneDeep"
import {PluginsContainer, PluginsLayout, defaultSearch, pluginStatusToName, statusTag} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {yakitNotify} from "@/utils/notification"
import {
    OnlineRecycleExtraOperateProps,
    OnlineUserExtraOperateProps,
    PluginRecycleListProps,
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

import classNames from "classnames"
import "../plugins.scss"
import styles from "./PluginUser.module.scss"
import {useStore} from "@/store"
import {
    DownloadOnlinePluginsRequest,
    PluginGV,
    PluginsQueryProps,
    apiDeletePluginMine,
    apiDownloadOnlinePlugin,
    apiFetchGroupStatisticsMine,
    apiFetchMineList,
    apiFetchRecycleList,
    apiUpdatePluginMine,
    convertPluginsRequestParams
} from "../utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"

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
    // ------我的插件中列表得一些参数start
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [allCheckUser, setAllCheckUser] = useState<boolean>(false)
    const [selectListUser, setSelectListUser] = useState<string[]>([])
    // ------ end

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()
    const [searchUser, setSearchUser] = useState<PluginSearchParams>(cloneDeep(defaultSearch))

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

    const pluginUserListRef = useRef<PluginUserListRefProps>({
        allCheck: false,
        // response: cloneDeep(initialOnlineState),
        selectList: [],
        loadMoreData: () => {},
        onRemovePluginBatchBefore: () => {}
    })
    const pluginsListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsListRef)

    const userInfo = useStore((s) => s.userInfo)

    const onRemove = useMemoizedFn(() => {
        if (pluginUserListRef.current.onRemovePluginBatchBefore) pluginUserListRef.current.onRemovePluginBatchBefore()
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
    const onDownload = useMemoizedFn((value?: YakitPluginOnlineDetail) => {
        setVisibleOnline(true)
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
        setAllCheckUser(backValues.allCheck)
        setSelectListUser(backValues.selectList)
    })
    const onSearch = useDebounceFn(
        useMemoizedFn(() => {
            if (userPluginType === "myOnlinePlugin") {
                setRefreshUser(!refreshUser)
            } else {
                setRefreshRecycle(!refreshRecycle)
            }
        }),
        {wait: 200, leading: true}
    ).run
    const pluginPrivateSelect: TypeSelectOpt[] = useMemo(() => {
        return (
            filters.plugin_private?.map((ele) => ({
                key: ele.value === "true" ? "2" : "1",
                name: ele.label
            })) || []
        )
    }, [filters.plugin_private])
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
                    dispatch={dispatch}
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
                                        onClick={() => onDownload()}
                                    />
                                    <FuncBtn
                                        maxWidth={1050}
                                        icon={<OutlineTrashIcon />}
                                        type='outline2'
                                        size='large'
                                        name={isSelectUserNum ? "删除" : "清空"}
                                        onClick={() => onRemove()}
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
                                        icon={<OutlineClouddownloadIcon />}
                                        type='outline2'
                                        size='large'
                                        name={isSelectRecycleNum ? "删除" : "清空"}
                                        onClick={() => {}}
                                    />
                                    <FuncBtn
                                        maxWidth={1050}
                                        icon={<OutlineDatabasebackupIcon />}
                                        size='large'
                                        name='还原'
                                        onClick={() => {}}
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
                        setPlugin={setPlugin}
                        searchValue={search}
                        setSearchValue={setSearch}
                        filters={filters}
                        setFilters={setFilters}
                        response={response}
                        dispatch={dispatch}
                        defaultAllCheck={allCheckUser}
                        defaultSelectList={selectListUser}
                    />
                </div>
                <div
                    className={classNames(styles["plugin-recycle-list"], {
                        [styles["plugin-user-list-hidden"]]: userPluginType === "myOnlinePlugin"
                    })}
                    tabIndex={userPluginType === "myOnlinePlugin" ? -1 : 0}
                >
                    <PluginRecycleList
                        refresh={refreshRecycle}
                        inViewport={inViewport}
                        isLogin={userInfo.isLogin}
                        searchValue={search}
                        setSearchValue={setSearch}
                        setIsSelectRecycleNum={setIsSelectRecycleNum}
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
            setPlugin,
            dispatch,
            response,
            defaultAllCheck,
            defaultSelectList
        } = props
        /** 是否为加载更多 */
        const [loading, setLoading] = useState<boolean>(false)
        /** 是否为首页加载 */
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
        const userInfo = useStore((s) => s.userInfo)

        // 选中插件的数量
        const selectNum = useMemo(() => {
            if (allCheck) return response.pagemeta.total
            else return selectList.length
        }, [allCheck, selectList])

        useImperativeHandle(
            ref,
            () => ({
                allCheck,
                selectList,
                loadMoreData: onUpdateList,
                onRemovePluginBatchBefore
            }),
            [allCheck, selectList]
        )
        useEffect(() => {
            getInitTotal()
            getPluginRemoveCheck()
        }, [inViewport])
        // 页面初始化的首次列表请求
        useEffect(() => {
            fetchList(true)
        }, [isLogin, refresh, filters])
        useEffect(() => {
            getPluginGroupList()
        }, [isLogin])
        useEffect(() => {
            setIsSelectUserNum(selectList.length > 0)
        }, [selectList.length])
        const getInitTotal = useMemoizedFn(() => {
            apiFetchMineList({
                page: 1,
                limit: 1
            }).then((res) => {
                setInitTotal(+res.pagemeta.total)
            })
        })
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
                const query: PluginsQueryProps = convertPluginsRequestParams(filters, search, params)
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
                } catch (error) {}
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
        )
        /**获取插件删除的提醒记录状态 */
        const getPluginRemoveCheck = useMemoizedFn(() => {
            getRemoteValue(PluginGV.PluginRemoveCheck).then((data) => {
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
                    <OnlineUserExtraOperate plugin={data} onSelect={(key) => onUserSelect(key, data)} />
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
                case "share":
                    onShare(data.uuid)
                    break
                case "download":
                    onDownloadClick(data)
                    break
                case "editState":
                    onUpdatePrivate(data)
                    break
                case "remove":
                    removePluginRef.current = data
                    onRemovePluginSingleBefore(data)
                    break
                default:
                    break
            }
        })
        const onShare = useMemoizedFn((uuid: string) => {
            ipcRenderer.invoke("copy-clipboard", uuid).then(() => {
                yakitNotify("success", "分享ID复制成功")
            })
        })
        /**下载 */
        const onDownloadClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            let downloadParams: DownloadOnlinePluginsRequest = {
                UUID: selectList
            }
            setLoading(true)
            apiDownloadOnlinePlugin(downloadParams)
                .then(() => {
                    yakitNotify("success", "下载成功")
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                )
        })
        /**更改私有状态 */
        const onUpdatePrivate = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            const updateItem: API.UpdatePluginRequest = {
                uuid: data.uuid,
                is_private: `${!data.is_private}`
            }
            apiUpdatePluginMine(updateItem).then(() => {
                const isPrivate: boolean = !data.is_private
                let status: number = 0
                if (userInfo.role === "ordinary") {
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
            })
        })
        /**单个删除之前操作 */
        const onRemovePluginSingleBefore = useMemoizedFn((data: YakitPluginOnlineDetail) => {
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
        /**单个删除 */
        const onRemovePluginSingle = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            let deleteParams: API.PluginsWhereDeleteRequest = {
                uuid: [data.uuid]
            }
            // console.log("单个删除", deleteParams)
            // console.log("pluginRemoveCheck", pluginRemoveCheck)
            apiDeletePluginMine(deleteParams).then(() => {
                dispatch({
                    type: "remove",
                    payload: {
                        itemList: [data]
                    }
                })
                setRemoteValue(PluginGV.PluginRemoveCheck, `${pluginRemoveCheck}`)
                const index = selectList.findIndex((ele) => ele === data.uuid)
                if (index !== -1) {
                    optCheck(data, false)
                }
                removePluginRef.current = undefined
                setRemoveCheckVisible(false)
            })
        })
        /**批量删除 */
        const onRemovePluginBatch = useMemoizedFn(() => {
            // console.log("pluginRemoveCheck", pluginRemoveCheck)
            if (!allCheck && selectList.length === 0) {
                // 删除全部，清空
                // console.log("全部清空")
                apiDeletePluginMine().then(() => {
                    fetchList(true)
                    setRemoveCheckVisible(false)
                })
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
                // console.log("批量删除", deleteParams)
                apiDeletePluginMine(deleteParams).then(() => {
                    setRemoveCheckVisible(false)
                    setSelectList([])
                    if (allCheck) {
                        setAllCheck(false)
                        setIsSelectUserNum(false)
                    }
                    fetchList(true)
                    setRemoteValue(PluginGV.PluginRemoveCheck, `${pluginRemoveCheck}`)
                })
            }
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
            if (removePluginRef.current) {
                onRemovePluginSingle(removePluginRef.current)
            } else {
                onRemovePluginBatch()
            }
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

const PluginRecycleList: React.FC<PluginRecycleListProps> = React.memo((props) => {
    const {refresh, inViewport, isLogin, setIsSelectRecycleNum} = props
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [selectList, setSelectList] = useState<string[]>([])
    const [isList, setIsList] = useState<boolean>(true)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [search, setSearch] = useControllableValue<PluginSearchParams>(props, {
        defaultValuePropName: "searchValue",
        valuePropName: "searchValue",
        trigger: "setSearchValue"
    })
    const [allCheck, setAllCheck] = useState<boolean>(false)

    const [initTotal, setInitTotal] = useState<number>(0)

    useEffect(() => {
        getInitTotal()
    }, [inViewport])
    // 页面初始化的首次列表请求
    useEffect(() => {
        fetchList(true)
    }, [isLogin, refresh])

    const getInitTotal = useMemoizedFn(() => {
        apiFetchRecycleList({
            page: 1,
            limit: 1
        }).then((res) => {
            setInitTotal(+res.pagemeta.total)
        })
    })

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

            const query: PluginsQueryProps = convertPluginsRequestParams({}, search, params)
            try {
                const res = await apiFetchRecycleList(query)
                const length = res.data.length + response.data.length
                setHasMore(length < +res.pagemeta.total)
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
            setIsSelectRecycleNum(true)
            setSelectList([...selectList, data.uuid])
        } else {
            const newSelectList = selectList.filter((item) => item !== data.uuid)
            setSelectList(newSelectList)
            if (newSelectList.length === 0) setIsSelectRecycleNum(false)
        }
    })
    // 滚动更多加载
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        if (value) setSelectList([])
        setAllCheck(value)
        setIsSelectRecycleNum(value)
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {})
    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])
    const onDelTag = useMemoizedFn(() => {})
    const onSetVisible = useMemoizedFn(() => {})
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return <OnlineRecycleExtraOperate onRemove={() => onRemove(data)} onReduction={() => onReduction(data)} />
    })
    const onRemove = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        const index = selectList.findIndex((ele) => ele === data.uuid)
        if (index !== -1) {
            optCheck(data, false)
        }
        dispatch({
            type: "remove",
            payload: {
                itemList: [data]
            }
        })
    })
    const onReduction = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        dispatch({
            type: "remove",
            payload: {
                itemList: [data]
            }
        })
        // 调用还原的接口
    })
    const onSetFilters = useMemoizedFn(() => {})
    return (
        <>
            <PluginsList
                checked={allCheck}
                onCheck={onCheck}
                isList={isList}
                setIsList={setIsList}
                total={response.pagemeta.total}
                selected={selectNum}
                filters={{}}
                setFilters={onSetFilters}
                visible={true}
                setVisible={onSetVisible}
            >
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
        </>
    )
})

const OnlineRecycleExtraOperate: React.FC<OnlineRecycleExtraOperateProps> = React.memo((props) => {
    const {onRemove, onReduction} = props
    return (
        <div className={styles["plugin-recycle-extra-node"]}>
            <YakitButton type='text2' icon={<OutlineTrashIcon />} onClick={onRemove} />
            <YakitButton icon={<OutlineDatabasebackupIcon />} onClick={onReduction}>
                还原
            </YakitButton>
        </div>
    )
})

export const OnlineUserExtraOperate: React.FC<OnlineUserExtraOperateProps> = React.memo((props) => {
    const {plugin, onSelect} = props
    const onClick = useMemoizedFn(({key}) => {
        onSelect(key)
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
