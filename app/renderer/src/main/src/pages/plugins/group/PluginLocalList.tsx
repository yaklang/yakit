import React, {useState, useRef, useMemo, useEffect, useReducer} from "react"
import {useMemoizedFn, useInViewport, useDebounceFn, useLatest} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {defaultSearch} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {FuncSearch, ListShowContainer, GridLayoutOpt, ListLayoutOpt, FuncBtn} from "../funcTemplate"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {OutlinePluscircleIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useStore} from "@/store"
import {initialLocalState, pluginLocalReducer} from "../pluginReducer"
import {apiQueryYakScript, apiQueryYakScriptTotal, convertLocalPluginsRequestParams} from "../utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {getRemoteValue} from "@/utils/kv"
import emiter from "@/utils/eventBus/eventBus"
import {RemoteGV} from "@/yakitGV"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import "../plugins.scss"
import {PluginListWrap} from "./PluginListWrap"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {UpdateGroupList} from "./UpdateGroupList"
import styles from "./PluginLocalList.module.scss"

interface PluginLocalGroupsListProps {}
const defaultFilters = {plugin_type: [], tags: []}

export const PluginLocalList: React.FC<PluginLocalGroupsListProps> = React.memo((props) => {
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<YakScript[]>([])
    const showPluginIndex = useRef<number>(0) // 当前展示的插件序列
    const [plugin, setPlugin] = useState<YakScript>() // 点击单项拿到的插件数据
    const [isList, setIsList] = useState<boolean>(false) // 网格与列表之间切换
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters] = useState<PluginFilterParams>(defaultFilters) // 过滤条件 插件组需要过滤Yak、codec
    const userInfo = useStore((s) => s.userInfo)
    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)
    const [loading, setLoading] = useState<boolean>(false)
    const latestLoadingRef = useLatest(loading)
    const isLoadingRef = useRef<boolean>(true) // 是否为初次加载
    const pluginsGroupsRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsGroupsRef)
    const [initTotal, setInitTotal] = useState<number>(0)
    const [privateDomain, setPrivateDomain] = useState<string>("") // 私有域地址
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [groupList, setGroupList] = useState<any>([]) // 组数据
    const updateGroupListRef = useRef<any>()

    useEffect(() => {
        getInitTotal()
    }, [userInfo.isLogin, inViewport])

    // 获取插件total
    const getInitTotal = useMemoizedFn(() => {
        apiQueryYakScriptTotal().then((res) => {
            setInitTotal(+res.Total)
        })
    })

    useEffect(() => {
        getPrivateDomainAndRefList()
    }, [])

    useEffect(() => {
        emiter.on("onSwitchPrivateDomain", getPrivateDomainAndRefList)
        return () => {
            emiter.off("onSwitchPrivateDomain", getPrivateDomainAndRefList)
        }
    }, [])

    // 获取私有域
    const getPrivateDomainAndRefList = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
            if (setting) {
                const values = JSON.parse(setting)
                setPrivateDomain(values.BaseUrl)
                setTimeout(() => {
                    fetchList(true)
                }, 200)
            }
        })
    })

    // 滚动更多加载
    const onUpdateList = useMemoizedFn(() => {
        fetchList()
    })

    // 点击刷新按钮重新拿数据
    const onRefListAndTotalAndGroup = useMemoizedFn(() => {
        getInitTotal()
        fetchList(true)
    })

    // 获取插件列表数据
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
                      page: +response.Pagination.Page + 1,
                      limit: +response.Pagination.Limit || 20
                  }
            const queryFilters = filters
            const querySearch = search
            const query: QueryYakScriptRequest = {
                ...convertLocalPluginsRequestParams(queryFilters, querySearch, params)
            }
            try {
                const res = await apiQueryYakScript(query)
                if (!res.Data) res.Data = []
                const length = +res.Pagination.Page === 1 ? res.Data.length : res.Data.length + response.Data.length
                setHasMore(length < +res.Total)
                const newData = res.Data.map((ele) => ({
                    ...ele,
                    isLocalPlugin: privateDomain !== ele.OnlineBaseUrl
                }))
                dispatch({
                    type: "add",
                    payload: {
                        response: {
                            ...res,
                            Data: newData
                        }
                    }
                })
                if (+res.Pagination.Page === 1) {
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
            fetchList(true)
        }, 200)
    })

    // 全选
    // const onCheck = useMemoizedFn((value: boolean) => {
    //     setSelectList([])
    //     setAllCheck(value)
    // })

    // 单选
    const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.Data.filter((item) => item.ScriptName !== data.ScriptName))
            setAllCheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...selectList, data])
        else setSelectList(selectList.filter((item) => item.ScriptName !== data.ScriptName))
    })

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList, response.Total])

    // 主要用于勾选样式添加
    const checkList = useMemo(() => {
        return selectList.map((ele) => ele.ScriptName)
    }, [selectList])

    // 用于网格 列表 插件切换定位
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    // 单项点击回调
    const optClick = useMemoizedFn((data: YakScript, index: number) => {
        setPlugin({...data})
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
        <div className={styles["plugin-local-list-wrapper"]} ref={pluginsGroupsRef}>
            <PluginListWrap
                title='重要资产'
                total={response.Total}
                selected={selectNum}
                isList={isList}
                setIsList={setIsList}
                extraHeader={
                    <div className='extra-header-wrapper'>
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
                    <ListShowContainer<YakScript>
                        id='local'
                        isList={isList}
                        data={response.Data || []}
                        gridNode={(info: {index: number; data: YakScript}) => {
                            const {index, data} = info
                            const check = allCheck || checkList.includes(data.ScriptName)
                            return (
                                <GridLayoutOpt
                                    order={index}
                                    data={data}
                                    checked={check}
                                    onCheck={optCheck}
                                    title={data.ScriptName}
                                    type={data.Type}
                                    tags={data.Tags}
                                    help={data.Help || ""}
                                    img={data.HeadImg || ""}
                                    user={data.Author || ""}
                                    isCorePlugin={!!data.IsCorePlugin}
                                    official={!!data.OnlineOfficial}
                                    prImgs={(data.CollaboratorInfo || []).map((ele) => ele.HeadImg)}
                                    time={data.UpdatedAt || 0}
                                    extraFooter={(data) => optExtraNode(data, index)}
                                    subTitle={optSubTitle}
                                    onClick={(data, index, value) => optCheck(data, value)}
                                />
                            )
                        }}
                        gridHeight={226}
                        listNode={(info: {index: number; data: YakScript}) => {
                            const {index, data} = info
                            const check = allCheck || checkList.includes(data.ScriptName)
                            return (
                                <ListLayoutOpt
                                    order={index}
                                    data={data}
                                    checked={check}
                                    onCheck={optCheck}
                                    img={data.HeadImg || ""}
                                    title={data.ScriptName}
                                    help={data.Help || ""}
                                    time={data.UpdatedAt || 0}
                                    type={data.Type}
                                    isCorePlugin={!!data.IsCorePlugin}
                                    official={!!data.OnlineOfficial}
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
                        isShowSearchResultEmpty={+response.Total === 0}
                        showIndex={showPluginIndex.current}
                        setShowIndex={setShowPluginIndex}
                        keyName='ScriptName'
                    />
                ) : (
                    <div className={styles["plugin-local-empty"]}>
                        <YakitEmpty
                            title='暂无数据'
                            description='可新建插件同步至云端，创建属于自己的插件'
                            style={{marginTop: 80}}
                        />
                        <div className={styles["plugin-local-buttons"]}>
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
