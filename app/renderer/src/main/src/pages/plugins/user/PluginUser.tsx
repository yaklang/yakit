import React, {useState, useRef, useMemo, useEffect} from "react"
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
    OutlineDatabasebackupIcon,
    OutlineDotshorizontalIcon,
    OutlineLockclosedIcon,
    OutlineLockopenIcon,
    OutlineSearchIcon,
    OutlineShareIcon,
    OutlineSwitchverticalIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {useMemoizedFn, useDebounceFn, useGetState} from "ahooks"
import {openExternalWebsite} from "@/utils/openWebsite"
import card1 from "./card1.png"
import card2 from "./card2.png"
import card3 from "./card3.png"
import qrCode from "./qrCode.png"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon, SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {OnlineJudgment} from "../onlineJudgment/OnlineJudgment"
import cloneDeep from "lodash/cloneDeep"
import {API} from "@/services/swagger/resposeType"
import {apiFetchList, ssfilters} from "../test"
import {
    PluginsContainer,
    PluginsLayout,
    defaultFilter,
    defaultResponse,
    defaultSearch,
    pluginStatusToName,
    pluginTypeList,
    statusTag
} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {PluginManageDetail} from "../manage/PluginManageDetail"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {yakitNotify} from "@/utils/notification"
import {
    OnlineRecycleExtraOperateProps,
    OnlineUserExtraOperateProps,
    PluginRecycleListProps,
    PluginUserListProps,
    PluginUserProps
} from "./PluginUserType"
import {YakitSegmented} from "@/components/yakitUI/YakitSegmented/YakitSegmented"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PluginUserDetail} from "./PluginUserDetail"

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
        key: "1",
        name: pluginStatusToName["1"],
        icon: <SolidCloudpluginIcon />
    },
    {
        key: "2",
        name: pluginStatusToName["2"],
        icon: <SolidPrivatepluginIcon />
    }
]

export type MePluginType = "myOnlinePlugin" | "recycle"

export const PluginUser: React.FC<PluginUserProps> = React.memo((props) => {
    const [plugin, setPlugin] = useState<API.YakitPluginDetail>()
    const [searchUser, setSearchUser] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [pluginState, setPluginState] = useState<string[]>(["1"])
    const [isSelectNum, setIsSelectNum] = useState<boolean>(false)

    const [userPluginType, setUserPluginType] = useState<MePluginType>("myOnlinePlugin")

    const onRemove = useMemoizedFn(() => {})
    const onSwitchUserPluginType = useDebounceFn(
        useMemoizedFn((v) => {
            setUserPluginType(v as MePluginType)
        }),
        {wait: 200, leading: true}
    ).run
    /**新建插件 */
    const onNewAddPlugin = useMemoizedFn(() => {})
    // 关键词/作者搜索
    const onKeywordAndUser = useMemoizedFn((type: string | null, value: string) => {
        if (!type) setSearchUser(cloneDeep(defaultSearch))
        else {
            if (type === "keyword") setSearchUser({...searchUser, keyword: value})
            if (type === "user") setSearchUser({...searchUser, userName: value})
        }
    })
    /**下载 */
    const onDownload = useMemoizedFn((value?: API.YakitPluginDetail) => {})
    const onSetActive = useMemoizedFn((state: string[]) => {
        setPluginState(state)
    })
    const onBack = useMemoizedFn(() => {
        setPlugin(undefined)
    })

    return (
        <OnlineJudgment>
            {!!plugin && (
                <PluginUserDetail
                    info={plugin}
                    selectList={[]}
                    allCheck={false}
                    onCheck={() => {}}
                    optCheck={() => {}}
                    loading={false}
                    data={cloneDeep(defaultResponse)}
                    onBack={onBack}
                    loadMoreData={() => {}}
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
                        <TypeSelect active={pluginState} list={onlinePluginTypeList} setActive={onSetActive} />
                    )
                }
                extraHeader={
                    <div className='extra-header-wrapper'>
                        <FuncSearch onSearch={onKeywordAndUser} />
                        <div className='divider-style'></div>
                        <div className='btn-group-wrapper'>
                            {userPluginType === "myOnlinePlugin" ? (
                                <>
                                    <FuncBtn
                                        maxWidth={1050}
                                        icon={<OutlineClouddownloadIcon />}
                                        type='outline2'
                                        size='large'
                                        name={isSelectNum ? "下载" : "一键下载"}
                                        onClick={() => onDownload()}
                                    />
                                    <FuncBtn
                                        maxWidth={1050}
                                        icon={<OutlineClouddownloadIcon />}
                                        type='outline2'
                                        size='large'
                                        name='清空'
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
                                        name='清空'
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
                        pluginState={pluginState}
                        searchUser={searchUser}
                        setIsSelectNum={setIsSelectNum}
                        plugin={plugin}
                        setPlugin={setPlugin}
                    />
                </div>
                <div
                    className={classNames(styles["plugin-recycle-list"], {
                        [styles["plugin-user-list-hidden"]]: userPluginType === "myOnlinePlugin"
                    })}
                    tabIndex={userPluginType === "myOnlinePlugin" ? -1 : 0}
                >
                    <PluginRecycleList />
                </div>
            </PluginsLayout>
        </OnlineJudgment>
    )
})

const PluginUserList: React.FC<PluginUserListProps> = React.memo((props) => {
    const {pluginState, searchUser, setIsSelectNum, plugin, setPlugin} = props
    // const [plugin, setPlugin] = useState<API.YakitPluginDetail>()
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    /** 是否为首页加载 */
    const isLoadingRef = useRef<boolean>(true)
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [filters, setFilters] = useState<PluginFilterParams>(
        cloneDeep({...defaultFilter, tags: ["Weblogic", "威胁情报"]})
    )
    const [response, setResponse] = useState<API.YakitPluginListResponse>(cloneDeep(defaultResponse))
    const [selectList, setSelectList] = useState<string[]>([])
    const [isList, setIsList] = useState<boolean>(true)

    const [hasMore, setHasMore] = useState<boolean>(true)

    const [showFilter, setShowFilter] = useState<boolean>(true)

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])
    // 页面初始化的首次列表请求
    useEffect(() => {
        fetchList(true)
    }, [])

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
                    isLoadingRef.current = false
                }, 300)
            })
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
        if (value) {
            setIsSelectNum(true)
            setSelectList([...selectList, data.uuid])
        } else {
            const newSelectList = selectList.filter((item) => item !== data.uuid)
            setSelectList(newSelectList)
            if (newSelectList.length === 0) setIsSelectNum(false)
        }
    })
    // 滚动更多加载
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: API.YakitPluginDetail) => {
        return (
            <div className={styles["plugin-user-extra-node"]}>
                <OnlineExtraOperate
                    likeProps={{
                        active: data.is_stars,
                        likeNumber: data.stars,
                        onLikeClick: onLikeClick
                    }}
                    commentProps={{
                        commentNumber: data.comment_num,
                        onCommentClick: onCommentClick
                    }}
                    downloadProps={{
                        downloadNumber: `${data.downloaded_total}`,
                        onDownloadClick: onDownloadClick
                    }}
                />
                <div className='divider-style' />
                <OnlineUserExtraOperate plugin={data} />
            </div>
        )
    })
    /** 单项副标题组件 */
    const optSubTitle = useMemoizedFn((data: API.YakitPluginDetail) => {
        return statusTag[`${1 % 3}`]
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: API.YakitPluginDetail) => {
        setPlugin(data)
    })
    const onLikeClick = useMemoizedFn(() => {
        yakitNotify("success", "点赞~~~")
    })
    const onCommentClick = useMemoizedFn(() => {
        yakitNotify("success", "评论~~~")
    })
    const onDownloadClick = useMemoizedFn(() => {
        yakitNotify("success", "下载~~~")
    })

    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        if (value) setSelectList([])
        setAllCheck(value)
        setIsSelectNum(value)
    })
    const onBack = useMemoizedFn(() => {
        setPlugin(undefined)
    })
    return (
        <>
            {/* {!!plugin && (
                <PluginUserDetail
                    info={plugin}
                    selectList={selectList}
                    allCheck={allCheck}
                    onCheck={onCheck}
                    optCheck={optCheck}
                    loading={loading}
                    data={response}
                    onBack={onBack}
                    loadMoreData={onUpdateList}
                />
            )} */}
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
        </>
    )
})

const PluginRecycleList: React.FC<PluginRecycleListProps> = React.memo((props) => {
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    /** 是否为首页加载 */
    const isLoadingRef = useRef<boolean>(true)
    const [response, setResponse] = useState<API.YakitPluginListResponse>(cloneDeep(defaultResponse))
    const [selectList, setSelectList] = useState<string[]>([])
    const [isList, setIsList] = useState<boolean>(true)
    const [hasMore, setHasMore] = useState<boolean>(true)

    const [allCheck, setAllCheck] = useState<boolean>(false)

    // 页面初始化的首次列表请求
    useEffect(() => {
        fetchList(true)
    }, [])

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
                    isLoadingRef.current = false
                }, 300)
            })
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
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        if (value) setSelectList([])
        setAllCheck(value)
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: API.YakitPluginDetail) => {})
    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])
    const onDelTag = useMemoizedFn(() => {})
    const onSetVisible = useMemoizedFn(() => {})
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: API.YakitPluginDetail) => {
        return <OnlineRecycleExtraOperate uuid={data.uuid} onRemove={onRemove} onReduction={onReduction} />
    })
    /** 单项副标题组件 */
    const optSubTitle = useMemoizedFn((data: API.YakitPluginDetail) => {
        return statusTag[`${data.status}`]
    })
    const onRemove = useMemoizedFn((uuid: string) => {})
    const onReduction = useMemoizedFn((uuid: string) => {})
    return (
        <>
            <PluginsList
                checked={allCheck}
                onCheck={onCheck}
                isList={isList}
                setIsList={setIsList}
                total={response.pagemeta.total}
                selected={selectNum}
                tag={[]}
                onDelTag={onDelTag}
                visible={true}
                setVisible={onSetVisible}
            >
                <ListShowContainer<API.YakitPluginDetail>
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
        </>
    )
})

const OnlineRecycleExtraOperate: React.FC<OnlineRecycleExtraOperateProps> = React.memo((props) => {
    const {uuid, onRemove, onReduction} = props
    const onRemoveClick = useMemoizedFn(() => {
        onRemove(uuid)
    })
    const onReductionClick = useMemoizedFn(() => {
        onReduction(uuid)
    })
    return (
        <div className={styles["plugin-recycle-extra-node"]}>
            <YakitButton type='text2' icon={<OutlineTrashIcon />} onClick={onRemoveClick} />
            <YakitButton icon={<OutlineDatabasebackupIcon />} onClick={onReductionClick}>
                还原
            </YakitButton>
        </div>
    )
})

export const OnlineUserExtraOperate: React.FC<OnlineUserExtraOperateProps> = React.memo((props) => {
    const {plugin} = props
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
                        label: (
                            <span className={styles["remove-menu-item"]}>
                                <OutlineTrashIcon className={styles["plugin-user-extra-node-icon"]} />
                                <span>删除</span>
                            </span>
                        )
                    }
                ],
                className: styles["func-filter-dropdown-menu"],
                onClick: ({key}) => {
                    switch (key) {
                        default:
                            break
                    }
                }
            }}
            button={{type: "text2"}}
            placement='bottomRight'
        />
    )
})
