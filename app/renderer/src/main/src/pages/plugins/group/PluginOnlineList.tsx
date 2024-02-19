import React, {useState, useRef, useMemo, useEffect, useReducer} from "react"
import {FuncBtn, FuncSearch, GridLayoutOpt, ListLayoutOpt, ListShowContainer} from "../funcTemplate"
import {OutlinePluscircleIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {useMemoizedFn, useDebounceFn, useInViewport, useLatest, useUpdateEffect} from "ahooks"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import cloneDeep from "lodash/cloneDeep"
import {defaultSearch} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {yakitNotify} from "@/utils/notification"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {
    PluginsQueryProps,
    apiFetchGetYakScriptGroupOnline,
    apiFetchOnlineList,
    apiFetchSaveYakScriptGroupOnline,
    convertPluginsRequestParams
} from "../utils"
import {useStore} from "@/store"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import emiter from "@/utils/eventBus/eventBus"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import "../plugins.scss"
import {PluginListWrap} from "./PluginListWrap"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {UpdateGroupList, UpdateGroupListItem} from "./UpdateGroupList"
import {GroupListItem} from "./PluginGroupList"
import {YakScript} from "@/pages/invoker/schema"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import styles from "./PluginOnlineList.module.scss"
import {API} from "@/services/swagger/resposeType"

const defaultFilters = {
    plugin_type: [],
    plugin_group: []
}

interface PluginOnlineGroupsListProps {
    pluginsGroupsInViewport: boolean
    activeGroup: GroupListItem
}
export const PluginOnlineList: React.FC<PluginOnlineGroupsListProps> = React.memo((props) => {
    const {pluginsGroupsInViewport, activeGroup} = props
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<string[]>([])
    const showPluginIndex = useRef<number>(0)
    const [isList, setIsList] = useState<boolean>(false) // 判断是网格还是列表
    const [search, setSearch] = useState<PluginSearchParams>(
        cloneDeep({
            ...defaultSearch,
            keyword: ""
        })
    )
    const [filters, setFilters] = useState<PluginFilterParams>(defaultFilters)
    const userInfo = useStore((s) => s.userInfo)
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [loading, setLoading] = useState<boolean>(false)
    const latestLoadingRef = useLatest(loading)
    const isLoadingRef = useRef<boolean>(true) // 是否为初次加载
    const pluginsOnlineGroupsListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsOnlineGroupsListRef)
    const [initTotal, setInitTotal] = useState<number>(0)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [groupList, setGroupList] = useState<UpdateGroupListItem[]>([]) // 组数据
    const updateGroupListRef = useRef<any>()

    useUpdateEffect(() => {
        const groups =
            activeGroup.default && activeGroup.id === "全部"
                ? []
                : [{value: activeGroup.name, count: 0, label: activeGroup.name}]
        setFilters({...filters, plugin_group: groups})
    }, [activeGroup])

    useUpdateEffect(() => {
        refreshOnlinePluginList()
    }, [filters])

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

    useUpdateEffect(() => {
        refreshOnlinePluginList()
    }, [pluginsGroupsInViewport])

    useEffect(() => {
        emiter.on("onRefPluginGroupMagOnlinePluginList", refreshOnlinePluginList)
        emiter.on("onSwitchPrivateDomain", onSwitchPrivateDomainRefOnlinePluginInit)
        return () => {
            emiter.off("onRefPluginGroupMagOnlinePluginList", refreshOnlinePluginList)
            emiter.off("onSwitchPrivateDomain", onSwitchPrivateDomainRefOnlinePluginInit)
        }
    }, [])

    const refreshOnlinePluginList = () => {
        fetchList(true)
    }

    // 切换私有域，刷新初始化的total和列表数据
    const onSwitchPrivateDomainRefOnlinePluginInit = useMemoizedFn(() => {
        onRefListAndTotal()
    })

    // 滚动更多加载
    const onUpdateList = useMemoizedFn(() => {
        fetchList()
    })

    // 点击刷新按钮
    const onRefListAndTotal = useMemoizedFn(() => {
        getInitTotal()
        refreshOnlinePluginList()
    })

    const [queryFetchList, setQueryFetchList] = useState<PluginsQueryProps>()
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
                ...convertPluginsRequestParams(queryFilters, querySearch, params),
                excludePluginTypes: ["yak", "codec"] // 过滤条件 插件组需要过滤Yak、codec
            }
            // 未分组插件查询
            if (activeGroup.default && activeGroup.id === "未分组" && query.pluginGroup) {
                query.pluginGroup.unSetGroup = true
            }
            console.log("插件列表", query)
            setQueryFetchList(query)
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

    // 搜索
    const onSearch = useMemoizedFn((val) => {
        setSearch(val)
        setTimeout(() => {
            refreshOnlinePluginList()
        }, 200)
    })

    // 全选
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllCheck(value)
    })

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

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList, response.pagemeta.total])

    // 用于网格 列表 插件切换定位
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    // 单项点击回调
    const optClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
        setShowPluginIndex(index)
    })

    // 单项副标题组件
    const optSubTitle = useMemoizedFn((data: YakScript) => {
        if (data.isLocalPlugin) return <></>
        if (data.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon />
        } else {
            return <SolidCloudpluginIcon />
        }
    })

    // 线上获取插件所在插件组和其他插件组
    const pluginUuidRef = useRef<string[]>([])
    const getYakScriptGroupOnline = (uuid: string[]) => {
        pluginUuidRef.current = uuid
        if (!queryFetchList) return
        const query = structuredClone(queryFetchList)
        // TODO query.IncludedScriptNames = uuid
        console.log("获取查询参数", query)
        apiFetchGetYakScriptGroupOnline(query).then((res) => {
            const copySetGroup = [...res.setGroup]
            const newSetGroup = copySetGroup.map((name) => ({
                groupName: name,
                checked: true
            }))
            let copyAllGroup = [...res.allGroup]
            const newAllGroup = copyAllGroup.map((name) => ({
                groupName: name,
                checked: false
            }))
            setGroupList([...newSetGroup, ...newAllGroup])
        })
    }

    // 更新组数据
    const updateGroupList = () => {
        const latestGroupList: UpdateGroupListItem[] = updateGroupListRef.current.latestGroupList

        // 新
        const checkedGroup = latestGroupList.filter((item) => item.checked).map((item) => item.groupName)
        const unCheckedGroup = latestGroupList.filter((item) => !item.checked).map((item) => item.groupName)

        // 旧
        const originCheckedGroup = groupList.filter((item) => item.checked).map((item) => item.groupName)

        let saveGroup: string[] = []
        let removeGroup: string[] = []
        checkedGroup.forEach((groupName: string) => {
            saveGroup.push(groupName)
        })
        unCheckedGroup.forEach((groupName: string) => {
            if (originCheckedGroup.includes(groupName)) {
                removeGroup.push(groupName)
            }
        })
        if ((!saveGroup.length && !removeGroup.length) || !queryFetchList) return
        const params: API.GroupRequest = {
            uuid: pluginUuidRef.current,
            saveGroup,
            removeGroup
        }
        apiFetchSaveYakScriptGroupOnline(params).then(() => {
            if (activeGroup.id !== "全部") {
                refreshOnlinePluginList()
            }
            emiter.emit("onRefLocalPluginList", "") // 刷新线上插件列表
            emiter.emit("onRefPluginGroupMagOnlineQueryYakScriptGroup", "")
        })
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
                        getYakScriptGroupOnline([data.uuid])
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
                checked={allCheck}
                onCheck={onCheck}
                title={activeGroup.name}
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
                                    getYakScriptGroupOnline(selectList)
                                } else {
                                    updateGroupList()
                                }
                            }}
                        >
                            <FuncBtn maxWidth={1050} icon={<SolidPluscircleIcon />} size='large' name='添加到组...' />
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
                                    subTitle={optSubTitle}
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
                                    subTitle={optSubTitle}
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
                        <YakitEmpty title='暂无数据' style={{marginTop: 80}} />
                        <div className={styles["plugin-online-buttons"]}>
                            <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={onRefListAndTotal}>
                                刷新
                            </YakitButton>
                        </div>
                    </div>
                )}
            </PluginListWrap>
        </div>
    )
})
