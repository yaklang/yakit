import React, {useState, useRef, useMemo, useEffect, useReducer} from "react"
import {FuncBtn, FuncSearch, GridLayoutOpt, ListLayoutOpt, ListShowContainer} from "../funcTemplate"
import {OutlinePluscircleIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {useMemoizedFn, useDebounceFn, useInViewport, useLatest} from "ahooks"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import cloneDeep from "lodash/cloneDeep"
import {defaultSearch} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {yakitNotify} from "@/utils/notification"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {PluginsQueryProps, apiFetchOnlineList, convertPluginsRequestParams} from "../utils"
import {useStore} from "@/store"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import emiter from "@/utils/eventBus/eventBus"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {isCommunityEdition} from "@/utils/envfile"
import "../plugins.scss"
import {PluginListWrap} from "./PluginListWrap"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {UpdateGroupList} from "./UpdateGroupList"
import styles from "./PluginOnlineList.module.scss"

interface PluginOnlineGroupsListProps {}
export const PluginOnlineList: React.FC<PluginOnlineGroupsListProps> = React.memo((props) => {
    const userInfo = useStore((s) => s.userInfo)
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const pluginsOnlineGroupsListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsOnlineGroupsListRef)
    const [initTotal, setInitTotal] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(false)
    const latestLoadingRef = useLatest(loading)
    const isLoadingRef = useRef<boolean>(true) // 是否为初次加载
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [search, setSearch] = useState<PluginSearchParams>(
        cloneDeep({
            ...defaultSearch,
            keyword: ""
        })
    )
    const [filters, setFilters] = useState<PluginFilterParams>({
        plugin_type: [],
        tags: []
    })
    const [isList, setIsList] = useState<boolean>(false) // 判断是网格还是列表
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<string[]>([])
    const showPluginIndex = useRef<number>(0)
    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()
    const [groupList, setGroupList] = useState<any>([]) // 组数据
    const updateGroupListRef = useRef<any>()

    useEffect(() => {
        getInitTotal()
    }, [userInfo.isLogin, inViewport])

    // 获取total
    const getInitTotal = useMemoizedFn(() => {
        apiFetchOnlineList({
            page: 1,
            limit: 1
        }).then((res) => {
            setInitTotal(+res.pagemeta.total)
        })
    })
    useEffect(() => {
        onSwitchPrivateDomainRefOnlinePluginInit()
    }, [])
    useEffect(() => {
        emiter.on("onSwitchPrivateDomain", onSwitchPrivateDomainRefOnlinePluginInit)
        return () => {
            emiter.off("onSwitchPrivateDomain", onSwitchPrivateDomainRefOnlinePluginInit)
        }
    }, [])
    // 切换私有域，刷新初始化的total和列表数据,回到列表页
    const onSwitchPrivateDomainRefOnlinePluginInit = useMemoizedFn(() => {
        onRefListAndTotalAndGroup()
        setPlugin(undefined)
    })

    // 点击刷新按钮
    const onRefListAndTotalAndGroup = useMemoizedFn(() => {
        getInitTotal()
        fetchList(true)
    })

    // 滚动更多加载
    const onUpdateList = useMemoizedFn(() => {
        fetchList()
    })

    // 搜索
    const onSearch = useMemoizedFn((val) => {
        setSearch(val)
        setTimeout(() => {
            fetchList(true)
        }, 200)
    })

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
            const queryFilters = filters
            const querySearch = search
            const query: PluginsQueryProps = {
                ...convertPluginsRequestParams(queryFilters, querySearch, params)
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

    // 全选
    // const onCheck = useMemoizedFn((value: boolean) => {
    //     setSelectList([])
    //     setAllCheck(value)
    // })

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList, response.pagemeta.total])

    // 单项勾选|取消勾选
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

    // 当前展示的插件序列
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    // 单项点击回调
    const optClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
        setPlugin({...data})
        setShowPluginIndex(index)
    })

    // 获取组所有组数据
    const getGroupListAll = () => {
        setGroupList([
            {
                groupName: "test",
                checked: true
            },
            {
                groupName: "test1",
                checked: false
            },
            {
                groupName: "test2",
                checked: false
            }
        ])
    }

    // 更新组数据
    const updateGroupList = () => {
        console.log(updateGroupListRef.current.latestGroupList)
    }

    // 单项额外操作
    const optExtraNode = useMemoizedFn((data, index) => {
        return (
            <YakitPopover
                overlayClassName={styles["add-group-popover"]}
                placement='bottomRight'
                trigger='click'
                content={<UpdateGroupList ref={updateGroupListRef} originGroupList={groupList}></UpdateGroupList>}
                onVisibleChange={(visible) => {
                    if (visible) {
                        getGroupListAll()
                    } else {
                        updateGroupList()
                    }
                }}
            >
                <OutlinePluscircleIcon
                    className={styles["add-group-icon"]}
                    onClick={() => {
                        optClick(data, index)
                    }}
                />
            </YakitPopover>
        )
    })

    return (
        <div className={styles["plugin-online-list-wrapper"]} ref={pluginsOnlineGroupsListRef}>
            <PluginListWrap
                title='重要资产'
                total={response.pagemeta.total}
                selected={selectNum}
                isList={isList}
                setIsList={setIsList}
                extraHeader={
                    <div className='extra-header-wrapper'>
                        <YakitPopover
                            overlayClassName={styles["add-group-popover"]}
                            placement='bottomRight'
                            trigger='click'
                            content={
                                <UpdateGroupList ref={updateGroupListRef} originGroupList={groupList}></UpdateGroupList>
                            }
                            onVisibleChange={(visible) => {
                                if (visible) {
                                    getGroupListAll()
                                } else {
                                    updateGroupList()
                                }
                            }}
                        >
                            <FuncBtn
                                maxWidth={1050}
                                icon={<SolidPluscircleIcon />}
                                size='large'
                                name='添加到组...'
                                onClick={() => {}}
                            />
                        </YakitPopover>
                        <div className='divider-style'></div>
                        <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                    </div>
                }
            >
                {initTotal > 0 ? (
                    <ListShowContainer<YakitPluginOnlineDetail>
                        id='online'
                        isList={isList}
                        data={response.data}
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
                                    extraFooter={(data) => optExtraNode(data, index)}
                                    onClick={(data, index, value) => optCheck(data, value)}
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
                                    extraNode={(data) => optExtraNode(data, index)}
                                    onClick={(data, index) => {}}
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
            </PluginListWrap>
        </div>
    )
})
