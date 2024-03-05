import React, {useEffect, useReducer, useRef, useState} from "react"
import {SinglePluginExecutionProps} from "./SinglePluginExecutionType"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {PluginDetailsTab, convertGroupParam} from "../local/PluginsLocalDetail"
import {QueryYakScriptRequest, YakScript, genDefaultPagination} from "@/pages/invoker/schema"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"
import {
    apiGetYakScriptById,
    apiQueryYakScript,
    convertLocalPluginsRequestParams,
    defaultLinkPluginConfig,
    onToEditPlugin
} from "../utils"

import styles from "./SinglePluginExecution.module.scss"
import {PluginDetails, PluginDetailsListItem, defaultFilter, defaultSearch} from "../baseTemplate"
import {PluginFilterParams, PluginListPageMeta, PluginSearchParams} from "../baseTemplateType"
import {initialLocalState, pluginLocalReducer} from "../pluginReducer"
import {getRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import emiter from "@/utils/eventBus/eventBus"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import cloneDeep from "lodash/cloneDeep"
import "../plugins.scss"
import {yakitNotify} from "@/utils/notification"
import {PluginGroup, TagsAndGroupRender, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {HybridScanPluginConfig} from "@/models/HybridScan"

export const SinglePluginExecution: React.FC<SinglePluginExecutionProps> = React.memo((props) => {
    const {yakScriptId} = props
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))
    const [loading, setLoading] = useState<boolean>(false)
    const [pluginLoading, setPluginLoading] = useState<boolean>(true)
    const [plugin, setPlugin] = useState<YakScript>()
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [selectList, setSelectList] = useState<YakScript[]>([])
    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)

    const pluginTypeRef = useRef<string>("")
    const privateDomainRef = useRef<string>("") // 私有域地址
    const singlePluginExecutionRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(singlePluginExecutionRef)
    /** 是否为初次加载 */
    const isLoadingRef = useRef<boolean>(true)

    useEffect(() => {
        getPluginById()
    }, [yakScriptId])

    useEffect(() => {
        if (inViewport) {
            emiter.on("onSwitchPrivateDomain", getPrivateDomainAndRefList)
        }
        return () => {
            emiter.off("onSwitchPrivateDomain", getPrivateDomainAndRefList)
        }
    }, [inViewport])

    /**获取最新的私有域,并刷新列表 */
    const getPrivateDomainAndRefList = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
            if (setting) {
                const values = JSON.parse(setting)
                privateDomainRef.current = values.BaseUrl
                setTimeout(() => {
                    fetchList(true)
                }, 200)
            }
        })
    })

    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
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
                ...convertLocalPluginsRequestParams(filters, search, params),
                Type: pluginTypeRef.current
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
                }
            } catch (error) {}
            setTimeout(() => {
                isLoadingRef.current = false
                setLoading(false)
            }, 200)
        }),
        {wait: 200, leading: true}
    ).run
    /**获取插件详情，设置插件联动类型，查询私有域,刷新插件列表 */
    const getPluginById = useMemoizedFn(() => {
        setPluginLoading(true)
        apiGetYakScriptById(yakScriptId)
            .then((res) => {
                setPlugin(res)
                if (res.Type !== "yak") return
                pluginTypeRef.current = res.PluginSelectorTypes || ""
                if (privateDomainRef.current) {
                    setTimeout(() => {
                        fetchList(true)
                    }, 200)
                } else {
                    getPrivateDomainAndRefList()
                }
            })
            .catch((e) => {
                yakitNotify("error", "获取插件详情失败:" + e)
            })
            .finally(() => {
                setTimeout(() => {
                    setPluginLoading(false)
                }, 200)
            })
    })
    const onClearSelect = useMemoizedFn(() => {
        setSelectList([])
        setAllCheck(false)
    })
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllCheck(value)
    })
    // 滚动更多加载
    const loadMoreData = useMemoizedFn(() => {
        fetchList()
    })
    /** 单项勾选|取消勾选 */
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
    const onPluginClick = useMemoizedFn((data: YakScript) => {
        const value = allCheck || checkList.includes(data.ScriptName)
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
    const onSearch = useMemoizedFn((val) => {
        setSearch(val)
        setTimeout(() => {
            fetchList(true)
        }, 200)
    })
    // 选中插件的数量
    const selectNum = useCreation(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList, response.Total])
    const checkList = useCreation(() => {
        return selectList.map((ele) => ele.ScriptName)
    }, [selectList])
    /**选中组 */
    const selectGroup = useCreation(() => {
        const group: YakFilterRemoteObj[] =
            filters?.plugin_group?.map((item) => ({
                name: item.value,
                total: item.count
            })) || []
        return group
    }, [filters])
    const onFilter = useMemoizedFn((value: PluginFilterParams) => {
        setFilters(value)
        setAllCheck(false)
        setSelectList([])
        setTimeout(() => {
            fetchList(true)
        }, 100)
    })
    /**插件UI联动相关参数 */
    const linkPluginConfig: HybridScanPluginConfig = useCreation(() => {
        const selectPluginName = selectList.map((item) => item.ScriptName)
        const config = {
            PluginNames: selectPluginName,
            Filter:
                selectPluginName.length > 0
                    ? undefined
                    : {
                          ...convertLocalPluginsRequestParams(filters, search),
                          Type: pluginTypeRef.current
                      }
        }
        return allCheck ? config : cloneDeep(defaultLinkPluginConfig)
    }, [selectList, search, filters, allCheck])
    if (!plugin) return null
    return (
        <>
            <PluginDetails<YakScript>
                title={plugin.ScriptName}
                filterNode={
                    <>
                        <PluginGroup
                            selectGroup={selectGroup}
                            setSelectGroup={(group) => onFilter(convertGroupParam(filters, {group}))}
                        />
                        <TagsAndGroupRender
                            selectGroup={selectGroup}
                            setSelectGroup={(group) => onFilter(convertGroupParam(filters, {group}))}
                        />
                    </>
                }
                rightHeardNode={<></>}
                filterExtra={
                    <div className={"filter-extra-wrapper"} ref={singlePluginExecutionRef}>
                        <YakitButton type='text' danger onClick={onClearSelect}>
                            清空
                        </YakitButton>
                    </div>
                }
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
                        const check = allCheck || checkList.includes(info.ScriptName)
                        return (
                            <PluginDetailsListItem<YakScript>
                                order={i}
                                plugin={info}
                                selectUUId={plugin.ScriptName} //本地用的ScriptName代替uuid
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
                hidden={plugin.Type !== "yak"}
            >
                <PluginDetailsTab
                    executorShow={!pluginLoading}
                    plugin={plugin}
                    headExtraNode={null}
                    wrapperClassName={styles["single-plugin-execution-wrapper"]}
                    hiddenLogIssue={true}
                    linkPluginConfig={linkPluginConfig}
                />
            </PluginDetails>
        </>
    )
})
