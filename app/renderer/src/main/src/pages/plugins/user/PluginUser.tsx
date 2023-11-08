import React, {useState, useRef, useMemo, useEffect, useReducer, forwardRef, useImperativeHandle} from "react"
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
    OutlineClouddownloadIcon,
    OutlineDatabasebackupIcon,
    OutlineDotshorizontalIcon,
    OutlineLockclosedIcon,
    OutlineLockopenIcon,
    OutlineShareIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useMemoizedFn, useDebounceFn, useLockFn, useControllableValue} from "ahooks"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import {OnlineJudgment} from "../onlineJudgment/OnlineJudgment"
import cloneDeep from "lodash/cloneDeep"
import {apiFetchList, ssfilters} from "../test"
import {
    PluginsContainer,
    PluginsLayout,
    defaultFilter,
    defaultResponse,
    defaultSearch,
    pluginStatusToName,
    statusTag
} from "../baseTemplate"
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
import {YakitPluginListOnlineResponse, YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {PrivatePluginIcon} from "@/assets/newIcon"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {API} from "@/services/swagger/resposeType"
import {TypeSelectOpt} from "../funcTemplateType"

import classNames from "classnames"
import "../plugins.scss"
import styles from "./PluginUser.module.scss"

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
        key: "0", // 公开
        name: pluginStatusToName["1"],
        icon: <SolidCloudpluginIcon />
    },
    {
        key: "1", // 私密
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
        loadMoreData: () => {}
    })

    const onRemove = useMemoizedFn(() => {})
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
            value: ele.key,
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
                key: ele.value,
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
                    <div className='extra-header-wrapper'>
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
                        refresh={refreshUser}
                        setIsSelectUserNum={setIsSelectUserNum}
                        setPlugin={setPlugin}
                        searchValue={search}
                        setSearchValue={setSearch}
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
        const {refresh, setIsSelectUserNum, setPlugin, dispatch, response, defaultAllCheck, defaultSelectList} = props
        /** 是否为加载更多 */
        const [loading, setLoading] = useState<boolean>(false)
        /** 是否为首页加载 */
        const isLoadingRef = useRef<boolean>(true)
        const [allCheck, setAllCheck] = useState<boolean>(defaultAllCheck)
        const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep({...defaultFilter}))
        const [search, setSearch] = useControllableValue<PluginSearchParams>(props, {
            defaultValuePropName: "searchValue",
            valuePropName: "searchValue",
            trigger: "setSearchValue"
        })

        const [isList, setIsList] = useState<boolean>(true)
        const [selectList, setSelectList] = useState<string[]>(defaultSelectList)

        const [hasMore, setHasMore] = useState<boolean>(true)

        const [showFilter, setShowFilter] = useState<boolean>(true)

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
                loadMoreData: onUpdateList
            }),
            [allCheck, selectList]
        )

        // 页面初始化的首次列表请求
        useEffect(() => {
            fetchList(true)
        }, [refresh])

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
                setIsSelectUserNum(true)
                setSelectList([...selectList, data.uuid])
            } else {
                const newSelectList = selectList.filter((item) => item !== data.uuid)
                setSelectList(newSelectList)
                if (newSelectList.length === 0) setIsSelectUserNum(false)
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
                    yakitNotify("success", "分享~~~")
                    break
                case "download":
                    onDownloadClick(data)
                    break
                case "editState":
                    onUpdatePrivate(data)
                    break
                case "remove":
                    onRemovePlugin(data)
                    break
                default:
                    break
            }
        })
        /**下载 */
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
        /**更改私有状态 */
        const onUpdatePrivate = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            dispatch({
                type: "update",
                payload: {
                    item: {
                        ...data,
                        is_private: !data.is_private,
                        status: data.is_private ? 0 : data.status
                    }
                }
            })
        })
        /** 删除插件 */
        const onRemovePlugin = useMemoizedFn((data: YakitPluginOnlineDetail) => {
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

        /**全选 */
        const onCheck = useMemoizedFn((value: boolean) => {
            if (value) setSelectList([])
            setAllCheck(value)
            setIsSelectUserNum(value)
        })
        return (
            <>
                {/* {!!plugin && (
                    <PluginUserDetail
                        info={plugin}
                        defaultSelectList={selectList}
                        allCheck={false}
                        onCheck={() => {}}
                        optCheck={() => {}}
                        loading={false}
                        response={response}
                        onBack={onBack}
                        loadMoreData={() => {}}
                        defaultSearchValue={search}
                    />
                )} */}
                <PluginsContainer
                    loading={loading && isLoadingRef.current}
                    visible={showFilter}
                    setVisible={setShowFilter}
                    selecteds={filters as Record<string, API.PluginsSearchData[]>}
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
                        filters={filters}
                        setFilters={setFilters}
                        visible={showFilter}
                        setVisible={setShowFilter}
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
                    </PluginsList>
                </PluginsContainer>
            </>
        )
    })
)

const PluginRecycleList: React.FC<PluginRecycleListProps> = React.memo((props) => {
    const {refresh, setIsSelectRecycleNum} = props
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

    // 页面初始化的首次列表请求
    useEffect(() => {
        fetchList(true)
    }, [refresh])

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
                ...search
            }
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
    const onSetFilters=useMemoizedFn(()=>{

    })
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
