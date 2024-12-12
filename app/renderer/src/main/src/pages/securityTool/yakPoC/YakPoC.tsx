import React, {ReactElement, useEffect, useReducer, useRef, useState} from "react"
import {
    PluginExecuteLogProps,
    PluginGroupByKeyWordItemProps,
    PluginGroupByKeyWordProps,
    PluginGroupGridItemProps,
    PluginGroupGridProps,
    PluginListByGroupProps,
    PluginLogProps,
    TimeConsumingProps,
    YakPoCExecuteContentProps,
    YakPoCProps
} from "./YakPoCType"
import classNames from "classnames"
import styles from "./YakPoC.module.scss"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {Divider, Tooltip} from "antd"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    HybridScanExecuteContent,
    HybridScanExecuteContentRefProps
} from "@/pages/plugins/pluginBatchExecutor/pluginBatchExecutor"
import {
    useControllableValue,
    useCreation,
    useDebounceFn,
    useInViewport,
    useInterval,
    useMemoizedFn,
    useUpdateEffect
} from "ahooks"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {
    ExpandAndRetract,
    ExpandAndRetractExcessiveState
} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {PluginExecuteProgress} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineCloseIcon,
    OutlineCogIcon,
    OutlineOpenIcon
} from "@/assets/icon/outline"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {FolderColorIcon, SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {CloudDownloadIcon} from "@/assets/newIcon"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {PageNodeItemProps, PocPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import {GroupCount, QueryYakScriptRequest, SaveYakScriptGroupRequest, YakScript} from "@/pages/invoker/schema"
import {
    YakPoCExecutorInputValueProps,
    apiFetchDeleteYakScriptGroupLocal,
    apiFetchQueryYakScriptGroupLocal,
    apiFetchSaveYakScriptGroupLocal,
    apiQueryYakScript,
    hybridScanParamsConvertToInputValue
} from "@/pages/plugins/utils"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {apiFetchQueryYakScriptGroupLocalByPoc} from "./utils"
import {PluginListPageMeta} from "@/pages/plugins/baseTemplateType"
import {initialLocalState, pluginLocalReducer} from "@/pages/plugins/pluginReducer"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {PluginDetailsListItem} from "@/pages/plugins/baseTemplate"
import moment from "moment"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {compareAsc} from "@/pages/yakitStore/viewers/base"
import {batchPluginType} from "@/defaultConstants/PluginBatchExecutor"
import {defaultPocPageInfo} from "@/defaultConstants/YakPoC"
import {HybridScanControlAfterRequest} from "@/models/HybridScan"
import { getRemoteHttpSettingGV } from "@/utils/envfile"

const HybridScanTaskListDrawer = React.lazy(
    () => import("@/pages/plugins/pluginBatchExecutor/HybridScanTaskListDrawer")
)

export const onToManageGroup = () => {
    emiter.emit(
        "openPage",
        JSON.stringify({
            route: YakitRoute.Plugin_Hub,
            params: {tabActive: "local", openGroupDrawer: true}
        })
    )
}

type PocTabKeys = "keyword" | "group"
interface PocTabsItem {
    key: PocTabKeys
    label: ReactElement | string
    contShow: boolean
}

/**专项漏洞检测 */
export const YakPoC: React.FC<YakPoCProps> = React.memo((props) => {
    const {pageId} = props
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.PoC, pageId)
        if (currentItem && currentItem.pageParamsInfo.pocPageInfo) {
            return currentItem.pageParamsInfo.pocPageInfo
        }
        return {...defaultPocPageInfo}
    })
    const [pageInfo, setPageInfo] = useState<PocPageInfoProps>(initPageInfo())
    const [keyWordResponseToSelect, setKeyWordResponseToSelect] = useState<GroupCount[]>([])
    const [responseToSelect, setResponseToSelect] = useState<GroupCount[]>([])

    // 隐藏插件列表
    const [hidden, setHidden] = useState<boolean>(true)
    const [type, setType] = useState<"keyword" | "group">(
        pageInfo.selectGroup && pageInfo.selectGroup?.length > 0 ? "group" : "keyword"
    )

    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")

    // LINK #deleted-init-group-all
    // LINK #set-init-group-all
    const [initSelectGroupAll, setInitSelectGroupAll] = useState<string[]>([]) //任务列表查询/继续，先保存记录的选中组，等待处理完后，清空该值
    const [deletedGroup, setDeletedGroup] = useState<string[]>([]) // 任务列表点击查看/继续的时候被删除的组(包括关键词组的临时组、插件管理中被删除的组)

    const pluginGroupRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginGroupRef)

    useEffect(() => {
        return () => {
            // 页面被关闭得时候，需要删除该页面得临时查询组
            apiFetchQueryYakScriptGroupLocalByPoc({PageId: pageId}).then((res) => {
                const removeGroup = res
                    .filter((item) => !!item.TemporaryId)
                    .map((ele) => ele.Value)
                    .join(",")
                if (!!removeGroup) {
                    apiFetchDeleteYakScriptGroupLocal(removeGroup)
                }
            })
        }
    }, [])

    useEffect(() => {
        // 任务列表点击查看,需要根据后端返回的用户输入模块在页面上复现
        if (!initSelectGroupAll.length) return
        let groupObj: {selectGroup: string[]; selectGroupListByKeyWord: string[]} = {
            selectGroup: [],
            selectGroupListByKeyWord: []
        }
        if (keyWordResponseToSelect.length > 0) {
            // 设置关键词组默认选中
            const initSelectGroup = keyWordResponseToSelect
                .filter((item) => initSelectGroupAll.includes(item.Value))
                .map((ele) => ele.Value)
            groupObj.selectGroupListByKeyWord = initSelectGroup
        }
        if (responseToSelect.length > 0) {
            // 设置组默认选中
            const initSelectGroup = responseToSelect
                .filter((item) => initSelectGroupAll.includes(item.Value))
                .map((ele) => ele.Value)
            groupObj.selectGroup = initSelectGroup
        }
        // 未被删除的组
        const haveGroup = groupObj.selectGroup.concat(groupObj.selectGroupListByKeyWord)
        // 被删除的组
        const removeGroup = initSelectGroupAll.filter((item) => !haveGroup.includes(item))
        setPageInfo((v) => ({...v, ...groupObj}))
        setDeletedGroup(removeGroup)
        /**ANCHOR[id=deleted-init-group-all] - 清空初始查询回来的组 */
        setInitSelectGroupAll([])
    }, [initSelectGroupAll, keyWordResponseToSelect, responseToSelect])

    const onSetSelectGroupList = useMemoizedFn((groups) => {
        setPageInfo((v) => ({...v, selectGroup: groups}))
    })
    const onSetSelectGroupListByKeyWord = useMemoizedFn((groups) => {
        setPageInfo((v) => ({...v, selectGroupListByKeyWord: groups}))
    })
    const selectGroupListAll = useCreation(() => {
        const groups = [
            ...new Set([
                ...(pageInfo.selectGroup || []),
                ...(pageInfo.selectGroupListByKeyWord || []),
                ...(deletedGroup || [])
            ])
        ]
        return groups
    }, [pageInfo.selectGroup, pageInfo.selectGroupListByKeyWord, deletedGroup])
    const onClearAll = useMemoizedFn(() => {
        setPageInfo((v) => ({...v, selectGroup: [], selectGroupListByKeyWord: []}))
        setDeletedGroup([])
        setHidden(false)
        pocTabs.forEach((i) => {
            if (i.key === type) {
                i.contShow = true
            } else {
                i.contShow = false
            }
        })
        setPocTabs([...pocTabs])
    })
    /**设置输入模块的初始值后，根据value刷新列表相关数据 */
    const onInitInputValueAfter = useMemoizedFn((value: HybridScanControlAfterRequest) => {
        try {
            const inputValue: YakPoCExecutorInputValueProps = hybridScanParamsConvertToInputValue(value)
            const {pluginInfo} = inputValue
            const group = pluginInfo.filters?.plugin_group?.map((ele) => ele.value) || []
            /**ANCHOR[id=set-init-group-all] - 设置该条记录的所有选中组 */
            setInitSelectGroupAll(group)
        } catch (error) {}
    })

    const [pocTabs, setPocTabs] = useState<Array<PocTabsItem>>([
        {
            key: "keyword",
            label: <>按关键词</>,
            contShow: true // 初始为true
        },
        {
            key: "group",
            label: <>按组选</>,
            contShow: false
        }
    ])
    const handleTabClick = (item: PocTabsItem) => {
        const contShow = !item.contShow
        pocTabs.forEach((i) => {
            if (i.key === item.key) {
                i.contShow = contShow
            } else {
                i.contShow = false
            }
        })
        setPocTabs([...pocTabs])
        setHidden(!pocTabs.some((item) => item.contShow))
        setType(item.key)
    }
    useEffect(() => {
        if (pageInfo.selectGroup?.length) {
            const t = pageInfo.selectGroup && pageInfo.selectGroup?.length > 0 ? "group" : "keyword"
            pocTabs.forEach((i) => {
                if (i.key === t) {
                    i.contShow = true
                } else {
                    i.contShow = false
                }
            })
            setPocTabs([...pocTabs])
            setType(t)
            setHidden(!pocTabs.some((item) => item.contShow))
        } else {
            setHidden(false)
        }
    }, [])

    // 当其他地方直接设置setHidden(true)时，tab相关状态也需要更新
    const handleHidden = useMemoizedFn(() => {
        if (hidden) {
            pocTabs.forEach((i) => {
                i.contShow = false
            })
            setPocTabs([...pocTabs])
        }
    })
    useUpdateEffect(() => {
        handleHidden()
    }, [hidden])

    return (
        <div className={styles["yak-poc-wrapper"]} ref={pluginGroupRef}>
            <div className={styles["yakpoc-tab-wrap"]}>
                <div className={styles["yakpoc-tab"]}>
                    {pocTabs.map((item) => (
                        <div
                            className={classNames(styles["yakpoc-tab-item"], {
                                [styles["yakpoc-tab-item-active"]]: type === item.key,
                                [styles["yakpoc-tab-item-unshowCont"]]: type === item.key && !item.contShow
                            })}
                            key={item.key}
                            onClick={() => {
                                handleTabClick(item)
                            }}
                        >
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>
            <div
                className={classNames(styles["left-wrapper"], {
                    [styles["left-wrapper-hidden"]]: hidden
                })}
            >
                <div className={styles["left-header-search"]}>
                    <div className={styles["header-type-wrapper"]}>
                        <span className={styles["header-text"]}>选择插件</span>
                    </div>
                </div>
                <PluginGroupByKeyWord
                    pageId={pageId}
                    inViewport={inViewport}
                    hidden={type === "group"}
                    defGroupKeywords={pageInfo.defGroupKeywords || ""}
                    selectGroupListByKeyWord={pageInfo.selectGroupListByKeyWord || []}
                    setSelectGroupListByKeyWord={onSetSelectGroupListByKeyWord}
                    setResponseToSelect={setKeyWordResponseToSelect}
                />
                <PluginGroupGrid
                    inViewport={inViewport}
                    hidden={type === "keyword"}
                    selectGroupList={pageInfo.selectGroup || []}
                    setSelectGroupList={onSetSelectGroupList}
                    setResponseToSelect={setResponseToSelect}
                />
            </div>
            <YakPoCExecuteContent
                hidden={hidden}
                setHidden={setHidden}
                selectGroupList={selectGroupListAll}
                executeStatus={executeStatus}
                setExecuteStatus={setExecuteStatus}
                onClearAll={onClearAll}
                pageId={pageId}
                pageInfo={pageInfo}
                onInitInputValueAfter={onInitInputValueAfter}
                type={type}
            />
        </div>
    )
})

const PluginListByGroup: React.FC<PluginListByGroupProps> = React.memo((props) => {
    const {selectGroupList, setTotal, hidden, type} = props
    const isLoadingRef = useRef<boolean>(true)
    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)
    const [loading, setLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)

    const privateDomainRef = useRef<string>("") // 私有域地址

    // 获取筛选栏展示状态
    useEffect(() => {
        getPrivateDomainAndRefList()
    }, [])

    /**获取最新的私有域,并刷新列表 */
    const getPrivateDomainAndRefList = useMemoizedFn(() => {
        getRemoteValue(getRemoteHttpSettingGV()).then((setting) => {
            if (setting) {
                const values = JSON.parse(setting)
                privateDomainRef.current = values.BaseUrl
            }
        })
    })

    useEffect(() => {
        fetchList(true)
    }, [selectGroupList])

    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            if (selectGroupList.length === 0) {
                setTotal(0)
                dispatch({
                    type: "add",
                    payload: {
                        response: {
                            Pagination: {
                                Limit: 20,
                                Page: 1,
                                OrderBy: "",
                                Order: ""
                            },
                            Total: 0,
                            Data: []
                        }
                    }
                })
                return
            }
            if (reset) {
                isLoadingRef.current = true
            }
            setLoading(true)

            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: +response.Pagination.Page + 1,
                      limit: +response.Pagination.Limit || 20
                  }
            const query: QueryYakScriptRequest = {
                IsMITMParamPlugins: 2,
                Pagination: {
                    Limit: params?.limit || 10,
                    Page: params?.page || 1,
                    OrderBy: "updated_at",
                    Order: "desc"
                }
            }
            query.Group = {UnSetGroup: false, Group: selectGroupList}
            query.Type = batchPluginType
            try {
                const res = await apiQueryYakScript(query)
                if (!res.Data) res.Data = []
                const length = +res.Pagination.Page === 1 ? res.Data.length : res.Data.length + response.Data.length
                setHasMore(length < +res.Total)
                const newData = res.Data.map((ele) => ({
                    ...ele,
                    isLocalPlugin: privateDomainRef.current !== ele.OnlineBaseUrl
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
                    setTotal(+res.Total)
                }
            } catch (error) {}
            setTimeout(() => {
                isLoadingRef.current = false
                setLoading(false)
            }, 200)
        }),
        {wait: 200, leading: true}
    ).run
    // 滚动更多加载
    const onUpdateList = useMemoizedFn(() => {
        fetchList()
    })
    /** 单项副标题组件 */
    const optExtra = useMemoizedFn((data: YakScript) => {
        if (privateDomainRef.current !== data.OnlineBaseUrl) return <></>
        if (data.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon className='icon-svg-16' />
        } else {
            return <SolidCloudpluginIcon className='icon-svg-16' />
        }
    })
    return (
        <div
            className={classNames(styles["plugin-list-by-group-wrapper"], {
                [styles["plugin-list-by-group-wrapper-hidden"]]: hidden
            })}
        >
            {selectGroupList.length === 0 || +response.Total === 0 ? (
                <YakitEmpty title='请选择关键词或插件组进行扫描' style={{paddingTop: 48}} />
            ) : (
                <RollingLoadList<YakScript>
                    data={response.Data}
                    loadMoreData={onUpdateList}
                    renderRow={(info: YakScript, i: number) => {
                        return (
                            <PluginDetailsListItem<YakScript>
                                order={i}
                                plugin={info}
                                selectUUId={""} //本地用的ScriptName代替uuid
                                check={false}
                                headImg={info.HeadImg || ""}
                                pluginUUId={info.ScriptName} //本地用的ScriptName代替uuid
                                pluginName={info.ScriptName}
                                help={info.Help}
                                content={info.Content}
                                optCheck={() => {}}
                                official={!!info.OnlineOfficial}
                                isCorePlugin={!!info.IsCorePlugin}
                                pluginType={info.Type}
                                onPluginClick={() => {}}
                                extra={optExtra}
                                enableClick={false}
                                enableCheck={false}
                            />
                        )
                    }}
                    page={response.Pagination.Page}
                    hasMore={hasMore}
                    loading={loading}
                    defItemHeight={46}
                    rowKey='ScriptName'
                    isRef={loading && isLoadingRef.current}
                    classNameRow='plugin-details-opt-wrapper'
                    classNameList={styles["plugin-by-group-list-wrapper"]}
                />
            )}
        </div>
    )
})

const PluginGroupByKeyWord: React.FC<PluginGroupByKeyWordProps> = React.memo((props) => {
    const {pageId, hidden, inViewport, setResponseToSelect, defGroupKeywords} = props
    const [selectGroupList, setSelectGroupList] = useControllableValue<string[]>(props, {
        defaultValue: [],
        valuePropName: "selectGroupListByKeyWord",
        trigger: "setSelectGroupListByKeyWord"
    })

    const [keywords, setKeywords] = useState<string>(defGroupKeywords || "")
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [response, setResponse] = useState<GroupCount[]>([])
    const [isRef, setIsRef] = useState<boolean>(false)
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)

    const initialResponseRef = useRef<GroupCount[]>([])
    const pocPluginKeywordsRef = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })

    useEffect(() => {
        if (!defGroupKeywords) return
        setKeywords(defGroupKeywords)
        onSearch(defGroupKeywords)
    }, [defGroupKeywords])

    useEffect(() => {
        if (inViewport) init()
    }, [inViewport])

    const init = useMemoizedFn(() => {
        setLoading(true)
        getQueryYakScriptGroup()
            .then((res) => {
                initialResponseRef.current = res
                setResponseToSelect(res)
                if (response.length === 0) {
                    setResponse(res)
                }
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            )
    })
    const getQueryYakScriptGroup: () => Promise<GroupCount[]> = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            apiFetchQueryYakScriptGroupLocalByPoc({PageId: pageId}).then(resolve).catch(reject)
        })
    })
    const onSelect = useMemoizedFn((val: GroupCount) => {
        const isExist = selectGroupList.includes(val.Value)
        if (isExist) {
            const newList = selectGroupList.filter((ele) => ele !== val.Value)
            setSelectGroupList(newList)
            setAllCheck(newList.length === response.length)
        } else {
            const newList = [...selectGroupList, val.Value]
            setSelectGroupList(newList)
            setAllCheck(newList.length === response.length)
        }
        setKeywords("")
        onSearch("")
    })
    const total = useCreation(() => {
        return response.length
    }, [response])
    const indeterminate: boolean = useCreation(() => {
        if (selectGroupList.length > 0 && selectGroupList.length !== response.length) return true
        return false
    }, [selectGroupList, response])
    const checked: boolean = useCreation(() => {
        return allCheck || (selectGroupList.length > 0 && selectGroupList.length === response.length)
    }, [selectGroupList, allCheck])
    const onClearSelect = useMemoizedFn(() => {
        setSelectGroupList([])
        setAllCheck(false)
    })
    const onSelectAll = useMemoizedFn((e) => {
        const {checked} = e.target
        if (checked) {
            setSelectGroupList(response.map((ele) => ele.Value))
        } else {
            setSelectGroupList([])
        }
        setAllCheck(checked)
    })
    const onSearch = useMemoizedFn((val) => {
        if (!val) {
            setResponse(initialResponseRef.current)
            setIsRef(!isRef)
            return
        }
        if (pocPluginKeywordsRef.current) {
            pocPluginKeywordsRef.current?.onSetRemoteValues(val)
        }

        const isHaveData = initialResponseRef.current.filter((ele) => {
            return ele.Value.toUpperCase() === val.toUpperCase()
        })
        if (isHaveData.length > 0) {
            setResponse([...isHaveData])
            setIsRef(!isRef)
        } else {
            // 先创建临时分组再搜索
            const addParams: SaveYakScriptGroupRequest = {
                SaveGroup: [val],
                Filter: {
                    // 该参数的page，limit无效
                    Pagination: {
                        Page: 1,
                        Limit: 1,
                        Order: "",
                        OrderBy: ""
                    },
                    Keyword: val,
                    Type: "mitm,port-scan,nuclei"
                },
                RemoveGroup: [],
                PageId: pageId
            }
            setLoading(true)
            apiFetchSaveYakScriptGroupLocal(addParams)
                .then(getQueryYakScriptGroup)
                .then((res) => {
                    const searchData = res.filter((ele) => {
                        return ele.Value.toUpperCase().includes(val.toUpperCase())
                    })
                    initialResponseRef.current = res
                    setResponse([...searchData])
                    setIsRef(!isRef)
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                )
        }
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })
    const onSelectKeywords = useMemoizedFn((value) => {
        onSearch(value)
        setKeywords(value)
    })
    return (
        <div
            className={classNames(styles["plugin-group-wrapper"], {
                [styles["plugin-group-wrapper-hidden"]]: hidden
            })}
        >
            <div className={styles["filter-wrapper"]}>
                <div className={styles["header-search"]}>
                    <YakitAutoComplete
                        ref={pocPluginKeywordsRef}
                        isCacheDefaultValue={false}
                        cacheHistoryDataKey={RemoteGV.PocPluginKeywords}
                        onSelect={onSelectKeywords}
                        value={keywords}
                        style={{flex: 1}}
                    >
                        <YakitInput.Search
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder='请输入关键词搜索'
                            onSearch={onSearch}
                            onPressEnter={onPressEnter}
                            size='large'
                        />
                    </YakitAutoComplete>
                </div>
                <div className={styles["filter-body"]}>
                    <div className={styles["filter-body-left"]}>
                        <YakitCheckbox indeterminate={indeterminate} checked={checked} onChange={onSelectAll}>
                            全选
                        </YakitCheckbox>
                        <span className={styles["count-num"]}>
                            Total<span className={styles["num-style"]}>{total}</span>
                        </span>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <span className={styles["count-num"]}>
                            Selected<span className={styles["num-style"]}>{selectGroupList.length}</span>
                        </span>
                    </div>
                    <div className={styles["filter-body-right"]}>
                        <YakitButton type='text' danger onClick={onClearSelect}>
                            清空
                        </YakitButton>
                    </div>
                </div>
            </div>
            {initialResponseRef.current.length === 0 ? (
                <div className={styles["yak-poc-empty"]}>
                    <YakitEmpty
                        title='暂无数据'
                        description='可一键获取默认关键词与插件,下载后请重启Yakit获取默认关键词'
                    />
                    <div className={styles["yak-poc-buttons"]}>
                        <YakitButton
                            type='outline1'
                            icon={<CloudDownloadIcon />}
                            onClick={() => setVisibleOnline(true)}
                        >
                            一键下载
                        </YakitButton>
                    </div>
                </div>
            ) : (
                <RollingLoadList<GroupCount>
                    data={response}
                    loadMoreData={() => {}}
                    renderRow={(rowData: GroupCount, index: number) => {
                        const checked = selectGroupList.includes(rowData.Value)
                        return <PluginGroupByKeyWordItem item={rowData} onSelect={onSelect} selected={checked} />
                    }}
                    page={1}
                    hasMore={false}
                    loading={loading}
                    defItemHeight={70}
                    isGridLayout
                    defCol={3}
                    classNameList={styles["group-list-wrapper"]}
                    rowKey='Value'
                    isRef={isRef}
                />
            )}
            <YakitGetOnlinePlugin
                visible={visibleOnline}
                setVisible={(v) => {
                    setVisibleOnline(v)
                    setTimeout(() => {
                        init()
                    }, 200)
                }}
                listType='online'
            />
        </div>
    )
})

const PluginGroupGrid: React.FC<PluginGroupGridProps> = React.memo((props) => {
    const {hidden, inViewport, setResponseToSelect} = props
    const [selectGroupList, setSelectGroupList] = useControllableValue<string[]>(props, {
        defaultValue: [],
        valuePropName: "selectGroupList",
        trigger: "setSelectGroupList"
    })
    const [keywords, setKeywords] = useState<string>("")
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [response, setResponse] = useState<GroupCount[]>([])
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)
    const [isRef, setIsRef] = useState<boolean>(false)

    const initialResponseRef = useRef<GroupCount[]>([]) // 用来做搜索

    useEffect(() => {
        if (inViewport) getQueryYakScriptGroup()
    }, [inViewport])

    const getQueryYakScriptGroup = useMemoizedFn(() => {
        setLoading(true)
        apiFetchQueryYakScriptGroupLocal(false, ["yak", "codec", "lua"], 2)
            .then((res) => {
                initialResponseRef.current = res
                if (selectGroupList.length > 0) {
                    const newSelectGroupList = selectGroupList.filter((item) => res.some((ele) => ele.Value === item))
                    if (newSelectGroupList.length > 0) {
                        setSelectGroupList(newSelectGroupList)
                    }
                }
                setResponseToSelect(res)
                setResponse(res)
                setIsRef(!isRef)
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            )
    })
    const onSelect = useMemoizedFn((val: GroupCount) => {
        const isExist = selectGroupList.includes(val.Value)
        if (isExist) {
            const newList = selectGroupList.filter((ele) => ele !== val.Value)
            setSelectGroupList(newList)
            setAllCheck(newList.length === response.length)
        } else {
            const newList = [...selectGroupList, val.Value]
            setSelectGroupList(newList)
            setAllCheck(newList.length === response.length)
        }
    })
    const total = useCreation(() => {
        return response.length
    }, [response])
    const indeterminate: boolean = useCreation(() => {
        if (selectGroupList.length > 0 && selectGroupList.length !== response.length) return true
        return false
    }, [selectGroupList, response])
    const checked: boolean = useCreation(() => {
        return allCheck || (selectGroupList.length > 0 && selectGroupList.length === response.length)
    }, [selectGroupList, allCheck])
    const onClearSelect = useMemoizedFn(() => {
        setSelectGroupList([])
        setAllCheck(false)
    })
    const onSelectAll = useMemoizedFn((e) => {
        const {checked} = e.target
        if (checked) {
            setSelectGroupList(response.map((ele) => ele.Value))
        } else {
            setSelectGroupList([])
        }
        setAllCheck(checked)
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })
    const onSearch = useMemoizedFn((val) => {
        const searchData = initialResponseRef.current.filter((ele) => {
            return ele.Value.toUpperCase().includes(val.toUpperCase())
        })
        setResponse([...searchData])
        setAllCheck(false)
        setSelectGroupList([])
        setIsRef(!isRef)
    })
    return (
        <div
            className={classNames(styles["plugin-group-wrapper"], {
                [styles["plugin-group-wrapper-hidden"]]: hidden
            })}
        >
            <div className={styles["filter-wrapper"]}>
                <div className={styles["header-search"]}>
                    <YakitInput.Search
                        placeholder='请输入组名搜索'
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        onSearch={onSearch}
                        onPressEnter={onPressEnter}
                        size='large'
                        wrapperStyle={{flex: 1}}
                    />
                </div>
                <div className={styles["filter-body"]}>
                    <div className={styles["filter-body-left"]}>
                        <YakitCheckbox indeterminate={indeterminate} checked={checked} onChange={onSelectAll}>
                            全选
                        </YakitCheckbox>
                        <span className={styles["count-num"]}>
                            Total<span className={styles["num-style"]}>{total}</span>
                        </span>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <span className={styles["count-num"]}>
                            Selected<span className={styles["num-style"]}>{selectGroupList.length}</span>
                        </span>
                    </div>
                    <div className={styles["filter-body-right"]}>
                        <YakitButton type='text' onClick={onToManageGroup}>
                            管理
                        </YakitButton>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <YakitButton type='text' danger onClick={onClearSelect}>
                            清空
                        </YakitButton>
                    </div>
                </div>
            </div>
            {initialResponseRef.current.length === 0 ? (
                <div className={styles["yak-poc-empty"]}>
                    <YakitEmpty title='暂无数据' description='可一键获取默认分组与插件,或点击管理手动新建' />
                    <div className={styles["yak-poc-buttons"]}>
                        <YakitButton
                            type='outline1'
                            icon={<CloudDownloadIcon />}
                            onClick={() => setVisibleOnline(true)}
                        >
                            一键下载
                        </YakitButton>
                        <YakitButton icon={<OutlineCogIcon />} onClick={onToManageGroup}>
                            管理
                        </YakitButton>
                    </div>
                </div>
            ) : (
                <RollingLoadList<GroupCount>
                    data={response}
                    loadMoreData={() => {}}
                    renderRow={(rowData: GroupCount, index: number) => {
                        const checked = selectGroupList.includes(rowData.Value)
                        return <PluginGroupGridItem item={rowData} onSelect={onSelect} selected={checked} />
                    }}
                    page={1}
                    hasMore={false}
                    loading={loading}
                    defItemHeight={114}
                    isGridLayout
                    defCol={3}
                    classNameList={styles["group-list-wrapper"]}
                    rowKey='Value'
                    isRef={isRef}
                />
            )}
            <YakitGetOnlinePlugin
                visible={visibleOnline}
                setVisible={(v) => {
                    setVisibleOnline(v)
                    setTimeout(() => {
                        getQueryYakScriptGroup()
                    }, 200)
                }}
                listType='online'
            />
        </div>
    )
})

const PluginGroupByKeyWordItem: React.FC<PluginGroupByKeyWordItemProps> = React.memo((props) => {
    const {item, onSelect, selected} = props
    return (
        <div
            className={classNames(styles["group-item-wrapper"], styles["group-keyword-item-wrapper"], {
                [styles["group-item-wrapper-checked"]]: selected
            })}
            onClick={() => onSelect(item)}
        >
            <div className={styles["item-tip"]}>
                <span className={styles["item-tip-name"]}>{item.Value}</span>
                <span className={styles["item-tip-number"]}>{item.Total}个插件</span>
            </div>
        </div>
    )
})
const PluginGroupGridItem: React.FC<PluginGroupGridItemProps> = React.memo((props) => {
    const {item, onSelect, selected} = props
    return (
        <div
            className={classNames(styles["group-item-wrapper"], {
                [styles["group-item-wrapper-checked"]]: selected
            })}
            onClick={() => onSelect(item)}
        >
            <FolderColorIcon />
            <div className={styles["item-tip"]}>
                <span className={styles["item-tip-name"]}>{item.Value}</span>
                <span className={styles["item-tip-number"]}>{item.Total}个插件</span>
            </div>
        </div>
    )
})
const YakPoCExecuteContent: React.FC<YakPoCExecuteContentProps> = React.memo((props) => {
    const {selectGroupList, onClearAll, pageId, pageInfo, onInitInputValueAfter, type} = props
    const pluginBatchExecuteContentRef = useRef<HybridScanExecuteContentRefProps>(null)

    const [hidden, setHidden] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "hidden",
        trigger: "setHidden"
    })

    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [progressList, setProgressList] = useState<StreamResult.Progress[]>([])
    const [executeStatus, setExecuteStatus] = useControllableValue<ExpandAndRetractExcessiveState>(props, {
        defaultValue: "default",
        valuePropName: "executeStatus",
        trigger: "setExecuteStatus"
    })
    const [total, setTotal] = useState<number>(0)
    const [showType, setShowType] = useState<"plugin" | "log">("plugin")
    const [pluginExecuteLog, setPluginExecuteLog] = useState<StreamResult.PluginExecuteLog[]>([])

    /**暂停 */
    const [pauseLoading, setPauseLoading] = useState<boolean>(false)
    /**继续 */
    const [continueLoading, setContinueLoading] = useState<boolean>(false)
    // 任务列表抽屉
    const [visibleRaskList, setVisibleRaskList] = useState<boolean>(false)

    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        if (executeStatus === "paused") return true
        return false
    }, [executeStatus])

    useEffect(() => {
        if (pageInfo.runtimeId) {
            onActionHybridScanByRuntimeId(pageInfo.runtimeId)
        } else {
            /**不带runtimeId，但是带有一些表单的默认值，例如：【发送到漏洞检测】功能 */
            const defaultFormValue = pageInfo.formValue
            if (defaultFormValue && Object.keys(defaultFormValue).length > 0) {
                pluginBatchExecuteContentRef.current?.onInitInputValue(defaultFormValue)
            }
        }
    }, [])

    /** 通过runtimeId查询该条记录详情 */
    const onActionHybridScanByRuntimeId = useMemoizedFn((runtimeId: string) => {
        if (!runtimeId) return
        pluginBatchExecuteContentRef.current
            ?.onActionHybridScanByRuntimeId(runtimeId, pageInfo.hybridScanMode)
            .then(() => {
                setIsExpand(false)
            })
    })
    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })
    const onStopExecute = useMemoizedFn(() => {
        pluginBatchExecuteContentRef.current?.onStopExecute()
    })
    const onStartExecute = useMemoizedFn(() => {
        pluginBatchExecuteContentRef.current?.onStartExecute()
    })
    const selectGroupNum = useCreation(() => {
        return selectGroupList.length
    }, [selectGroupList])
    const pluginInfo = useCreation(() => {
        return {
            selectPluginName: [],
            filters: {
                plugin_type: batchPluginType.split(",").map((ele) => ({value: ele, label: ele, count: 0})),
                plugin_group: selectGroupList.map((ele) => ({value: ele, label: ele, count: 0}))
            }
        }
    }, [selectGroupList])

    const isShowPluginAndLog = useCreation(() => {
        return selectGroupList.length > 0 || isExecuting
    }, [selectGroupList, isExecuting])

    const pluginLogDisabled = useCreation(() => {
        return !isExecuting
    }, [isExecuting])

    const onSetExecuteStatus = useMemoizedFn((val) => {
        setExecuteStatus(val)
        switch (val) {
            case "process":
            case "paused":
                setShowType("log")
                break
            case "error":
            case "finished":
                setShowType("plugin")
                break
            default:
                break
        }
    })
    const onPause = useMemoizedFn((e) => {
        pluginBatchExecuteContentRef.current?.onPause()
    })

    const onContinue = useMemoizedFn((e) => {
        pluginBatchExecuteContentRef.current?.onContinue()
    })
    const dataScanParams = useCreation(() => {
        return {
            https: pageInfo.https,
            httpFlowIds: pageInfo.httpFlowIds,
            request: pageInfo.request
        }
    }, [pageInfo.https, pageInfo.httpFlowIds, pageInfo.request])
    return (
        <>
            {isShowPluginAndLog && (
                <div className={styles["midden-wrapper"]}>
                    <div className={styles["midden-heard"]}>
                        <YakitRadioButtons
                            size='small'
                            value={showType}
                            onChange={(e) => {
                                setShowType(e.target.value)
                            }}
                            buttonStyle='solid'
                            options={[
                                {
                                    value: "plugin",
                                    label: "已选插件"
                                },
                                {
                                    value: "log",
                                    label: "插件日志",
                                    disabled: pluginLogDisabled
                                }
                            ]}
                        />
                        {showType === "plugin" && (
                            <div className={styles["heard-right"]}>
                                <span className={styles["heard-tip"]}>
                                    Total<span className={styles["heard-number"]}>{total}</span>
                                </span>
                                <YakitButton type='text' danger onClick={onClearAll}>
                                    清空
                                </YakitButton>
                            </div>
                        )}
                    </div>
                    <PluginListByGroup
                        hidden={showType !== "plugin"}
                        type={type}
                        selectGroupList={selectGroupList}
                        total={total}
                        setTotal={setTotal}
                    />
                    <PluginExecuteLog
                        hidden={showType !== "log"}
                        pluginExecuteLog={pluginExecuteLog}
                        isExecuting={executeStatus === "process"}
                    />
                </div>
            )}
            <div className={styles["yak-poc-execute-wrapper"]}>
                <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                    <div className={styles["yak-poc-executor-title"]}>
                        <span className={styles["yak-poc-executor-title-text"]}>插件执行</span>
                    </div>
                    <div className={styles["yak-poc-executor-btn"]}>
                        {progressList.length === 1 && (
                            <PluginExecuteProgress percent={progressList[0].progress} name={progressList[0].id} />
                        )}
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                setVisibleRaskList(true)
                            }}
                            style={{padding: 0}}
                        >
                            任务列表
                        </YakitButton>
                        {isExecuting
                            ? !isExpand && (
                                  <>
                                      {executeStatus === "paused" && !pauseLoading && (
                                          <YakitButton onClick={onContinue} loading={continueLoading}>
                                              继续
                                          </YakitButton>
                                      )}
                                      {(executeStatus === "process" || pauseLoading) && (
                                          <YakitButton onClick={onPause} loading={pauseLoading}>
                                              暂停
                                          </YakitButton>
                                      )}
                                      <YakitButton
                                          danger
                                          onClick={onStopExecute}
                                          disabled={pauseLoading || continueLoading}
                                      >
                                          停止
                                      </YakitButton>
                                      <div className={styles["divider-style"]}></div>
                                  </>
                              )
                            : !isExpand && (
                                  <>
                                      <YakitButton onClick={onStartExecute} disabled={selectGroupNum === 0}>
                                          执行
                                      </YakitButton>
                                      <div className={styles["divider-style"]}></div>
                                  </>
                              )}
                    </div>
                </ExpandAndRetract>
                <div className={styles["yak-poc-executor-body"]}>
                    <HybridScanExecuteContent
                        ref={pluginBatchExecuteContentRef}
                        isExpand={isExpand}
                        setIsExpand={setIsExpand}
                        onInitInputValueAfter={onInitInputValueAfter}
                        selectNum={selectGroupNum}
                        setProgressList={setProgressList}
                        pauseLoading={pauseLoading}
                        setPauseLoading={setPauseLoading}
                        continueLoading={continueLoading}
                        setContinueLoading={setContinueLoading}
                        pluginInfo={pluginInfo}
                        executeStatus={executeStatus}
                        setExecuteStatus={onSetExecuteStatus}
                        setPluginExecuteLog={setPluginExecuteLog}
                        setHidden={setHidden}
                        dataScanParams={dataScanParams}
                        pageId={pageId}
                        initRuntimeId={pageInfo.runtimeId}
                        hybridScanTaskSource='yakPoc'
                    />
                </div>
            </div>
            <React.Suspense fallback={<>loading...</>}>
                {visibleRaskList && (
                    <HybridScanTaskListDrawer
                        visible={visibleRaskList}
                        setVisible={setVisibleRaskList}
                        hybridScanTaskSource='yakPoc'
                    />
                )}
            </React.Suspense>
        </>
    )
})
/**
 * 计算两个时间戳的间隔
 * @param {number} startTime
 * @param {number} endTime
 * @returns {TimeConsumingProps}
 */
const intervalTime = (startTime: number, endTime: number) => {
    const startMoment = moment(startTime)
    const endMoment = moment(endTime)

    // 计算时间差
    const duration = endMoment.diff(startMoment)

    // 使用duration的as方法获取分钟和秒数
    const durationObj = moment.duration(duration)
    const minutes = durationObj.minutes()
    const seconds = durationObj.seconds()
    if (minutes > 60) {
        return {
            type: "danger",
            value: "超时"
        }
    }
    if (minutes > 0) {
        return {
            type: "info",
            value: `${minutes} min`
        }
    }
    return {
        type: "info",
        value: `${seconds} s`
    }
}
export const PluginExecuteLog: React.FC<PluginExecuteLogProps> = React.memo((props) => {
    const {hidden, pluginExecuteLog, isExecuting, classNameWrapper = ""} = props
    const [interval, setInterval] = useState<number | undefined>(1000)

    const [recalculation, setRecalculation] = useState<boolean>(false)
    const [data, setData] = useState<PluginLogProps[]>([])

    const clear = useInterval(() => {
        onHandleData()
    }, interval)
    useEffect(() => {
        if (hidden || !isExecuting) {
            setInterval(undefined)
        } else {
            setInterval(1000)
        }
        return () => {
            clear()
        }
    }, [hidden, isExecuting])

    const onHandleData = useMemoizedFn(() => {
        const logs: PluginLogProps[] = pluginExecuteLog
            .map((item) => {
                const newTime = Date.now()
                const timeConsuming: TimeConsumingProps = intervalTime(item.startTime, newTime)
                return {...item, timeConsuming}
            })
            .sort((a, b) => compareAsc(a, b, "Index"))
        setData(logs)
        setRecalculation(!recalculation)
    })

    return (
        <div
            className={classNames(
                styles["plugin-execute-log-wrapper"],
                {
                    [styles["plugin-execute-log-wrapper-hidden"]]: hidden
                },
                classNameWrapper
            )}
        >
            <YakitSpin spinning={isExecuting} size='small' style={{alignItems: "center", height: 20}} />
            <RollingLoadList<PluginLogProps>
                data={data}
                loadMoreData={() => {}}
                renderRow={(i: PluginLogProps, index: number) => {
                    const {value, type} = i.timeConsuming
                    return (
                        <>
                            <span className={styles["name"]}>
                                {i.Index}: [{i.PluginName}]
                            </span>
                            <span className='content-ellipsis'>执行目标: {i.Url}</span>
                            <span
                                className={classNames(styles["time"], {
                                    [styles["time-danger"]]: type === "danger"
                                })}
                            >
                                {type === "danger" ? value : `耗时: ${value}`}
                            </span>
                        </>
                    )
                }}
                page={1}
                hasMore={false}
                defItemHeight={108}
                rowKey='Index'
                recalculation={recalculation}
                loading={false}
                classNameList={styles["plugin-log-list"]}
                classNameRow={styles["plugin-log-item"]}
            />
        </div>
    )
})
