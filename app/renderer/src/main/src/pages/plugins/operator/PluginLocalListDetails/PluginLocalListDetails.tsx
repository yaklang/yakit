import React, {forwardRef, useEffect, useReducer, useRef, useState} from "react"
import {PluginLocalListDetailsProps} from "./PluginLocalListDetailsType"
import {PluginGroup, TagsAndGroupRender, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {PluginDetails, PluginDetailsListItem} from "../../baseTemplate"
import {useControllableValue, useCreation, useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {PluginFilterParams, PluginListPageMeta, PluginSearchParams} from "../../baseTemplateType"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {initialLocalState, pluginLocalReducer} from "../../pluginReducer"
import {apiQueryYakScript, convertLocalPluginsRequestParams} from "../../utils"
import {convertGroupParam} from "../../local/PluginsLocalDetail"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import {getRemoteValue} from "@/utils/kv"
import emiter from "@/utils/eventBus/eventBus"
import styles from "./PluginLocalListDetails.module.scss"
import {FilterPopoverBtn} from "../../funcTemplate"
import {defaultFilter, defaultSearch} from "../../builtInData"
import { getRemoteHttpSettingGV } from "@/utils/envfile"

/**
 * @description 本地插件列表，左右布局，左边为插件列表右边为传入的node
 */
export const PluginLocalListDetails: React.FC<PluginLocalListDetailsProps> = React.memo(
    forwardRef((props, ref) => {
        const {
            refreshList = true,
            children,
            pluginDetailsProps = {},
            hidden,
            fetchListInPageFirstAfter,
            showFilter,
            fixFilterList,
            defaultFilters,
            pluginGroupExcludeType = []
        } = props

        const [search, setSearch] = useControllableValue<PluginSearchParams>(props, {
            defaultValue: cloneDeep(defaultSearch),
            valuePropName: "search",
            trigger: "setSearch"
        })

        const [filters, setFilters] = useControllableValue<PluginFilterParams>(props, {
            defaultValue: cloneDeep(defaultFilter),
            valuePropName: "filters",
            trigger: "setFilters"
        })

        const [selectList, setSelectList] = useControllableValue<string[]>(props, {
            defaultValue: [],
            valuePropName: "selectList",
            trigger: "setSelectList"
        })

        const [selectNum, setSelectNum] = useControllableValue<number>(props, {
            defaultValue: 0,
            valuePropName: "selectNum",
            trigger: "setSelectNum"
        })

        const [allCheck, setAllCheck] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "allCheck",
            trigger: "setAllCheck"
        })

        const [loading, setLoading] = useState<boolean>(false)
        const [hasMore, setHasMore] = useState<boolean>(true)
        const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)

        /** 是否为初次加载 */
        const isLoadingRef = useRef<boolean>(true)
        const privateDomainRef = useRef<string>("") // 私有域地址
        const pluginListRef = useRef<HTMLDivElement>(null)

        const [inViewport = true] = useInViewport(pluginListRef)

        useEffect(() => {
            if (inViewport) {
                emiter.on("onSwitchPrivateDomain", getPrivateDomainAndRefList)
            }
            return () => {
                emiter.off("onSwitchPrivateDomain", getPrivateDomainAndRefList)
            }
        }, [inViewport])

        useUpdateEffect(() => {
            fetchList({reset: true})
        }, [refreshList])

        useEffect(() => {
            getPrivateDomainAndRefList()
        }, [])

        useEffect(() => {
            if (allCheck) return setSelectNum(response.Total)
            else return setSelectNum(selectList.length)
        }, [allCheck, selectList, response.Total])

        /**选中组 */
        const selectGroup = useCreation(() => {
            const group: YakFilterRemoteObj[] =
                filters?.plugin_group?.map((item) => ({
                    name: item.value,
                    total: item.count
                })) || []
            return group
        }, [filters])

        /**获取最新的私有域,并刷新列表 */
        const getPrivateDomainAndRefList = useMemoizedFn(() => {
            getRemoteValue(getRemoteHttpSettingGV()).then((setting) => {
                if (setting) {
                    const values = JSON.parse(setting)
                    privateDomainRef.current = values.BaseUrl
                    setTimeout(() => {
                        fetchList({reset: true})
                    }, 200)
                }
            })
        })

        const fetchList = useDebounceFn(
            useMemoizedFn(async (props: {reset?: boolean; isSearch?: boolean}) => {
                // isSearch 里面的搜索，仅仅刷新列表
                const {reset, isSearch = false} = props || {}
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
                    ...convertLocalPluginsRequestParams({filter: filters, search, pageParams: params, defaultFilters}),
                    IsMITMParamPlugins: 2
                }
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
                        setAllCheck(false)
                        setSelectList([])
                        if (!isSearch && fetchListInPageFirstAfter) fetchListInPageFirstAfter()
                    }
                } catch (error) {}
                setTimeout(() => {
                    isLoadingRef.current = false
                    setLoading(false)
                }, 200)
            }),
            {wait: 200, leading: true}
        ).run

        const onFilter = useMemoizedFn((value: PluginFilterParams) => {
            setFilters(value)
            setAllCheck(false)
            setSelectList([])
            setTimeout(() => {
                fetchList({reset: true, isSearch: true})
            }, 100)
        })
        /**全选 */
        const onCheck = useMemoizedFn((value: boolean) => {
            setSelectList([])
            setAllCheck(value)
        })
        // 滚动更多加载
        const loadMoreData = useMemoizedFn(() => {
            fetchList({reset: false, isSearch: false})
        })
        const onSearch = useMemoizedFn((val) => {
            setSearch(val)
            setTimeout(() => {
                fetchList({reset: true, isSearch: true})
            }, 200)
        })
        /** 单项勾选|取消勾选 */
        const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
            // 全选情况时的取消勾选
            if (allCheck) {
                setSelectList(
                    response.Data.filter((item) => item.ScriptName !== data.ScriptName).map((item) => item.ScriptName)
                )
                setAllCheck(false)
                return
            }
            // 单项勾选回调
            if (value) setSelectList([...selectList, data.ScriptName])
            else setSelectList(selectList.filter((item) => item !== data.ScriptName))
        })
        const onPluginClick = useMemoizedFn((data: YakScript) => {
            const value = allCheck || selectList.includes(data.ScriptName)
            optCheck(data, !value)
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
            <PluginDetails<YakScript>
                title=''
                rightHeardNode={<></>}
                checked={allCheck}
                onCheck={onCheck}
                total={response.Total}
                selected={selectNum}
                listProps={{
                    rowKey: "ScriptName",
                    data: response.Data,
                    loadMoreData: loadMoreData,
                    classNameRow: "plugin-details-opt-wrapper",
                    renderRow: (info, i) => {
                        const check = allCheck || selectList.includes(info.ScriptName)
                        return (
                            <PluginDetailsListItem<YakScript>
                                order={i}
                                plugin={info}
                                selectUUId=''
                                check={check}
                                headImg={info.HeadImg || ""}
                                pluginUUId={info.ScriptName} //本地用的ScriptName代替uuid
                                pluginName={info.ScriptName}
                                help={info.Help}
                                content={info.Content}
                                optCheck={optCheck}
                                official={!!info.OnlineOfficial}
                                isCorePlugin={!!info.IsCorePlugin}
                                pluginType={info.Type}
                                onPluginClick={onPluginClick}
                                extra={optExtra}
                            />
                        )
                    },
                    page: response.Pagination.Page,
                    hasMore,
                    loading: loading,
                    defItemHeight: 46,
                    isRef: loading && isLoadingRef.current
                }}
                onBack={() => {}}
                search={search}
                setSearch={setSearch}
                onSearch={onSearch}
                spinLoading={loading && isLoadingRef.current}
                hidden={hidden}
                filterNode={
                    <>
                        <PluginGroup
                            selectGroup={selectGroup}
                            setSelectGroup={(group) => onFilter(convertGroupParam(filters, {group}))}
                            excludeType={pluginGroupExcludeType}
                            isMITMParamPlugins={2}
                            pluginListQuery={() => {
                                const params: PluginListPageMeta = {
                                    page: +response.Pagination.Page,
                                    limit: +response.Pagination.Limit
                                }
                                const query: QueryYakScriptRequest = {
                                    ...convertLocalPluginsRequestParams({
                                        filter: filters,
                                        search,
                                        pageParams: params,
                                        defaultFilters
                                    }),
                                    IsMITMParamPlugins: 2
                                }
                                return {
                                    ...query,
                                    IncludedScriptNames: allCheck ? [] : selectList
                                }
                            }}
                            total={response.Total}
                            allChecked={allCheck}
                            checkedPlugin={allCheck ? [] : selectList}
                        />
                    </>
                }
                filterBodyBottomNode={
                    selectGroup.length > 0 && (
                        <div style={{paddingTop: 8}}>
                            <TagsAndGroupRender
                                selectGroup={selectGroup}
                                setSelectGroup={(group) => onFilter(convertGroupParam(filters, {group}))}
                                wrapStyle={{marginBottom: 0}}
                            />
                        </div>
                    )
                }
                filterExtra={
                    showFilter && (
                        <div className={"details-filter-extra-wrapper"}>
                            <FilterPopoverBtn
                                defaultFilter={filters}
                                onFilter={onFilter}
                                fixFilterList={fixFilterList || []}
                            />
                        </div>
                    )
                }
                {...pluginDetailsProps}
            >
                <div ref={pluginListRef} className={styles["plugin-list-right-wrapper"]}>
                    {children}
                </div>
            </PluginDetails>
        )
    })
)
