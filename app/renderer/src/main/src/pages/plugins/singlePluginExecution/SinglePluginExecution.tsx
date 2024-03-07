import React, {useEffect, useReducer, useRef, useState} from "react"
import {SinglePluginExecutionProps} from "./SinglePluginExecutionType"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {PluginDetailsTab, convertGroupParam} from "../local/PluginsLocalDetail"
import {QueryYakScriptRequest, YakScript, genDefaultPagination} from "@/pages/invoker/schema"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePencilaltIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
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
import {Tooltip} from "antd"
import {PluginLocalListDetails} from "../operator/PluginLocalListDetails/PluginLocalListDetails"

export const SinglePluginExecution: React.FC<SinglePluginExecutionProps> = React.memo((props) => {
    const {yakScriptId} = props

    const [refreshList, setRefreshList] = useState<boolean>(false)

    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))

    const [pluginLoading, setPluginLoading] = useState<boolean>(true)
    const [plugin, setPlugin] = useState<YakScript>()
    const [selectList, setSelectList] = useState<string[]>([])

    const pluginTypeRef = useRef<string>("")

    useEffect(() => {
        getPluginById()
    }, [yakScriptId])

    const onRefresh = useMemoizedFn((e) => {
        e.stopPropagation()
        getPluginById()
    })

    /**获取插件详情，设置插件联动类型，查询私有域,刷新插件列表 */
    const getPluginById = useMemoizedFn(() => {
        setPluginLoading(true)
        apiGetYakScriptById(yakScriptId)
            .then((res) => {
                const {PluginSelectorTypes = ""} = res
                setPlugin(res)
                if (res.Type !== "yak") return
                if (!res.EnablePluginSelector) return
                pluginTypeRef.current = PluginSelectorTypes || ""
                setFilters({
                    ...filters,
                    plugin_type: PluginSelectorTypes
                        ? PluginSelectorTypes.split(",").map((ele) => ({value: ele, label: ele, count: 0}))
                        : []
                })
                setTimeout(() => {
                    setRefreshList(!refreshList)
                }, 200)
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

    /**插件UI联动相关参数 */
    const linkPluginConfig: HybridScanPluginConfig = useCreation(() => {
        const config = {
            PluginNames: selectList,
            Filter:
                selectList.length > 0
                    ? undefined
                    : {
                          ...convertLocalPluginsRequestParams(filters, search),
                          Type: pluginTypeRef.current
                      }
        }
        return config
    }, [selectList, search, filters])
    const hidden = useCreation(() => {
        if (!plugin) return true
        if (plugin.Type !== "yak") return true
        return !plugin.EnablePluginSelector
    }, [plugin])
    const headExtraNode = useCreation(() => {
        return (
            <>
                <Tooltip title='刷新插件数据'>
                    <YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={onRefresh} />
                </Tooltip>
            </>
        )
    }, [])
    if (!plugin) return null
    return (
        <>
            <PluginLocalListDetails
                hidden={hidden}
                selectList={selectList}
                setSelectList={setSelectList}
                search={search}
                setSearch={setSearch}
                filters={filters}
                setFilters={setFilters}
            >
                <PluginDetailsTab
                    executorShow={!pluginLoading}
                    plugin={plugin}
                    headExtraNode={headExtraNode}
                    hiddenLogIssue={true}
                    linkPluginConfig={linkPluginConfig}
                />
            </PluginLocalListDetails>
        </>
    )
})
