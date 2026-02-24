import React, {ReactNode, useEffect, useMemo, useRef, useState} from "react"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {useDebounceEffect, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {failed, yakitNotify} from "@/utils/notification"
import style from "../MITMPage.module.scss"
import ReactResizeDetector from "react-resize-detector"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {Divider, Dropdown, Empty, Progress} from "antd"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import classNames from "classnames"
import {
    ChevronDownIcon,
    ChevronUpIcon,
    CloudDownloadIcon,
    FolderOpenIcon,
    ImportIcon,
    SolidCloudDownloadIcon
} from "@/assets/newIcon"
import {DownloadOnlinePluginAllResProps, TagValue, YakModuleList} from "@/pages/yakitStore/YakitStorePage"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import {YakitSizeType} from "@/components/yakitUI/YakitInputNumber/YakitInputNumberType"
import {GroupCount, QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {ImportLocalPlugin, MitmStatus} from "../MITMPage"
import {MITMYakScriptLoader} from "../MITMYakScriptLoader"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {randomString} from "@/utils/randomUtil"
import {getReleaseEditionName, isCommunityEdition, isEnpriTraceAgent} from "@/utils/envfile"
import {
    DownloadOnlinePluginsRequest,
    PluginGroupDel,
    PluginGroupRename,
    apiFetchDeleteYakScriptGroupLocal,
    apiFetchDeleteYakScriptGroupOnline,
    apiFetchGetYakScriptGroupLocal,
    apiFetchGetYakScriptGroupOnline,
    apiFetchQueryYakScriptGroupLocal,
    apiFetchQueryYakScriptGroupOnlineNotLoggedIn,
    apiFetchRenameYakScriptGroupLocal,
    apiFetchRenameYakScriptGroupOnline,
    apiFetchSaveYakScriptGroupLocal,
    apiFetchSaveYakScriptGroupOnline,
    apiQueryYakScript
} from "@/pages/plugins/utils"
import emiter from "@/utils/eventBus/eventBus"
import {API} from "@/services/swagger/resposeType"
import {useCampare} from "@/hook/useCompare/useCompare"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {OutlinePencilaltIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {UpdateGroupList, UpdateGroupListItem} from "@/pages/pluginHub/group/UpdateGroupList"
import {DelGroupConfirmPop} from "@/pages/pluginHub/group/PluginOperationGroupList"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {YakitRoute} from "@/enums/yakitRoute"

const {ipcRenderer} = window.require("electron")

export interface MITMPluginListProp {
    proxy?: string
    downloadCertNode?: () => React.ReactNode
    setFilterNode?: () => React.ReactNode
    onSubmitScriptContent?: (script: string) => any
    onSubmitYakScriptId?: (id: number, params: YakExecutorParam[]) => any
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    onExit?: () => any
}

interface MITMPluginLocalListProps {
    noParamsCheckList: string[]
    setNoParamsCheckList: (s: string[]) => void
    onSubmitYakScriptId: (id: number, params: YakExecutorParam[]) => any
    status: MitmStatus
    tags: string[]
    searchKeyword: string
    fieldKeywords: string
    setTags: (s: string[]) => void
    triggerSearch: boolean
    isSelectAll: boolean
    setIsSelectAll: (b: boolean) => void
    selectGroup: YakFilterRemoteObj[]
    setSelectGroup: (y: YakFilterRemoteObj[]) => void
    // height: string | number
    renderTitle?: ReactNode
    total: number
    setTotal: (n: number) => void
    hooks: Map<string, boolean>
    hooksID: Map<string, boolean>
    onSelectAll: (b: boolean) => void
    onSendToPatch?: (s: YakScript) => void
    groupNames: string[]
    setGroupNames: (s: string[]) => void
    isHasParams: boolean
    showPluginHistoryList?: string[]
    setShowPluginHistoryList?: (l: string[]) => void
    tempShowPluginHistory?: string
    setTempShowPluginHistory?: (t: string) => void
    hasParamsCheckList: string[]
    curTabKey?: string
}
export interface YakFilterRemoteObj {
    name: string
    total: number
}

export const MITMPluginLocalList: React.FC<MITMPluginLocalListProps> = React.memo((props) => {
    const {
        status,
        noParamsCheckList,
        setNoParamsCheckList,
        tags,
        searchKeyword,
        fieldKeywords,
        triggerSearch,
        selectGroup,
        setSelectGroup,
        // height,
        total,
        setTotal,
        hooks,
        hooksID,
        setIsSelectAll,
        onSendToPatch,
        groupNames,
        setGroupNames,
        isHasParams,
        showPluginHistoryList = [],
        setShowPluginHistoryList = () => {},
        tempShowPluginHistory,
        setTempShowPluginHistory,
        hasParamsCheckList,
        curTabKey = ""
    } = props

    const [vlistHeigth, setVListHeight] = useState(0)
    const [initialTotal, setInitialTotal] = useState<number>(0) //初始插件总数

    const [refresh, setRefresh] = useState<boolean>(true)
    const [visibleImport, setVisibleImport] = useState<boolean>(false)
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)

    const listRef = useRef(null)
    const [inViewport] = useInViewport(listRef)

    useEffect(() => {
        setRefresh(!refresh)
    }, [triggerSearch])

    useUpdateEffect(() => {
        let groupName: string[] = []
        selectGroup.forEach((ele) => {
            groupName = [...groupName, ele.name]
        })
        setGroupNames(Array.from(new Set(groupName)))
        setTimeout(() => {
            setRefresh(!refresh)
        }, 100)
    }, [selectGroup])
    useUpdateEffect(() => {
        setRefresh(!refresh)
    }, [tags, inViewport])
    useUpdateEffect(() => {
        setRefresh(!refresh)
    }, [isHasParams])
    useEffect(() => {
        if (visibleOnline || inViewport) getAllSatisfyScript()
    }, [inViewport, visibleOnline])

    const getAllSatisfyScript = useMemoizedFn(() => {
        const query: QueryYakScriptRequest = {
            Pagination: {
                Limit: 20,
                Page: 1,
                OrderBy: "",
                Order: "",
                RawOrder: "is_core_plugin desc,online_official desc,updated_at desc"
            },
            Keyword: searchKeyword,
            FieldKeywords: fieldKeywords,
            IncludedScriptNames: [],
            Type: isHasParams ? "mitm" : "mitm,port-scan",
            Tag: tags,
            Group: {UnSetGroup: false, Group: groupNames},
            IsMITMParamPlugins: isHasParams ? 1 : 2
        }

        apiQueryYakScript(query).then((res) => {
            setInitialTotal(res.Total || 0)
        })
    })
    const onRenderEmptyNode = useMemoizedFn(() => {
        if (Number(total) === 0 && (tags.length > 0 || searchKeyword || fieldKeywords || groupNames.length > 0)) {
            return (
                <div className={style["mitm-plugin-empty"]}>
                    <YakitEmpty title={null} description='搜索结果“空”' />
                </div>
            )
        }
        if (Number(initialTotal) === 0) {
            return (
                <div className={style["mitm-plugin-empty"]}>
                    <YakitEmpty description='可一键获取官方云端插件，或导入外部插件源' />
                    <div className={style["mitm-plugin-buttons"]}>
                        <YakitButton
                            type='outline1'
                            icon={<CloudDownloadIcon />}
                            onClick={() => setVisibleOnline(true)}
                        >
                            获取云端插件
                        </YakitButton>
                        <YakitButton type='outline1' icon={<ImportIcon />} onClick={() => setVisibleImport(true)}>
                            导入插件源
                        </YakitButton>
                    </div>
                </div>
            )
        }
    })
    return (
        <div className={style["mitm-plugin-local"]} ref={listRef}>
            <div>
                <ReactResizeDetector
                    onResize={(width, height) => {
                        if (!height) {
                            return
                        }
                        setVListHeight(height)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                <TagsAndGroupRender
                    // tags={tags}
                    // setTags={setTags}
                    selectGroup={selectGroup}
                    setSelectGroup={setSelectGroup}
                />
            </div>

            <div
                className={style["mitm-plugin-list"]}
                // style={{height: `calc(100% - ${tags.length || selectGroup.length > 0 ? vlistHeigth + 8 : 0}px)`}}
            >
                <YakModuleList
                    emptyNode={onRenderEmptyNode()}
                    queryLocal={{
                        Tag: tags,
                        Type: isHasParams ? "mitm" : "mitm,port-scan",
                        Keyword: searchKeyword,
                        FieldKeywords: fieldKeywords,
                        Pagination: {
                            Limit: 20,
                            Order: "",
                            Page: 1,
                            OrderBy: "",
                            RawOrder: "is_core_plugin desc,online_official desc,updated_at desc"
                        },
                        Group: {UnSetGroup: false, Group: groupNames},
                        IsMITMParamPlugins: isHasParams ? 1 : 2
                    }}
                    refresh={refresh}
                    itemHeight={44}
                    onClicked={(script) => {}}
                    setTotal={(t) => {
                        setTotal(t || 0)
                    }}
                    onYakScriptRender={(i: YakScript, maxWidth?: number) => {
                        return (
                            <MITMYakScriptLoader
                                isHasParams={isHasParams}
                                status={status}
                                script={i}
                                maxWidth={maxWidth}
                                // 劫持启动后
                                hooks={hooks}
                                hooksID={hooksID}
                                onSendToPatch={onSendToPatch}
                                onSubmitYakScriptId={props.onSubmitYakScriptId}
                                onRemoveHook={(name: string, id: string) => {
                                    if (hooks.get(name) || hooksID.get(id)) {
                                        setIsSelectAll(false)
                                    }
                                }}
                                showEditor={isHasParams ? true : false}
                                showPluginHistoryList={showPluginHistoryList}
                                setShowPluginHistoryList={setShowPluginHistoryList}
                                hasParamsCheckList={hasParamsCheckList}
                                tempShowPluginHistory={tempShowPluginHistory}
                                setTempShowPluginHistory={setTempShowPluginHistory}
                                // 劫持启动前
                                defaultPlugins={noParamsCheckList}
                                setDefaultPlugins={setNoParamsCheckList}
                                curTabKey={curTabKey}
                            />
                        )
                    }}
                />
            </div>
            <ImportLocalPlugin
                visible={visibleImport}
                setVisible={(v) => {
                    setVisibleImport(v)
                    setRefresh(!refresh)
                }}
            />
            <YakitGetOnlinePlugin
                visible={visibleOnline}
                setVisible={(v) => {
                    setVisibleOnline(v)
                    setTimeout(() => {
                        setRefresh(!refresh)
                    }, 100)
                }}
                getContainer={document.getElementById(`main-operator-page-body-${YakitRoute.MITMHacker}`) || undefined}
            />
        </div>
    )
})

export interface YakitGetOnlinePluginProps {
    /**@name 'online'默认首页 mine 个人, recycle 回收站 check 审核页面" */
    listType?: "online" | "mine" | "recycle" | "check"
    // 限制下载的类型
    pluginType?: string[]
    visible: boolean
    setVisible: (b: boolean) => void
    onFinish?: () => void
    isRereshLocalPluginList?: boolean
    getContainer?: HTMLElement
}
/**
 * 一键下载插件
 * @param listType 'online'默认首页 mine 个人, recycle 回收站 check 审核页面"
 */
export const YakitGetOnlinePlugin: React.FC<YakitGetOnlinePluginProps> = React.memo((props) => {
    const {
        listType = "online",
        pluginType,
        visible,
        setVisible,
        onFinish,
        isRereshLocalPluginList = true,
        getContainer
    } = props
    const taskToken = useMemo(() => randomString(40), [])
    const [percent, setPercent] = useState<number>(0)
    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: DownloadOnlinePluginAllResProps) => {
            const p = Math.floor(data.Progress * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            setTimeout(() => {
                setPercent(0)
                setVisible(false)
                onFinish && onFinish()
                if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                else ipcRenderer.invoke("change-main-menu")
                onRefLocalPluginList()
            }, 200)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            onRefLocalPluginList()
            yakitNotify("error", "下载失败:" + e)
        })
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    useEffect(() => {
        if (visible) {
            const addParams: DownloadOnlinePluginsRequest = {
                ListType: listType === "online" ? "" : listType,
                PluginType: pluginType ? pluginType : []
            }
            ipcRenderer
                .invoke("DownloadOnlinePlugins", addParams, taskToken)
                .then(() => {})
                .catch((e) => {
                    failed(`下载失败:${e}`)
                })
        }
    }, [visible])
    const StopAllPlugin = () => {
        ipcRenderer.invoke("cancel-DownloadOnlinePlugins", taskToken).catch((e) => {
            failed(`停止下载:${e}`)
            onRefLocalPluginList()
        })
    }
    /** 下载后需要刷新本地插件列表 */
    const onRefLocalPluginList = useMemoizedFn(() => {
        emiter.emit("onRefreshLocalPluginList", true)
    })
    return (
        <YakitHint
            visible={visible}
            title={`${getReleaseEditionName()} 云端插件下载中...`}
            heardIcon={<SolidCloudDownloadIcon style={{color: "var(--Colors-Use-Warning-Primary)"}} />}
            onCancel={() => {
                StopAllPlugin()
                setVisible(false)
            }}
            okButtonProps={{style: {display: "none"}}}
            isDrag={true}
            mask={false}
            getContainer={getContainer}
            wrapClassName={style["yakitGetOnlinePlugin"]}
        >
            <Progress
                strokeColor='var(--Colors-Use-Main-Primary)'
                trailColor='var(--Colors-Use-Neutral-Bg-Hover)'
                percent={percent}
                format={(percent) => `已下载 ${percent}%`}
            />
        </YakitHint>
    )
})

interface ApplySyntaxFlowRuleUpdateResponse {
    Percent: number
    Message: string
}

export interface IRifyApplySyntaxFlowRuleUpdateProps {
    wrapClassName?: string
    getContainer?: HTMLElement
    visible: boolean
    setVisible: (b: boolean) => void
}
/**
 * IRify一键更新规则
 */
export const IRifyApplySyntaxFlowRuleUpdate: React.FC<IRifyApplySyntaxFlowRuleUpdateProps> = React.memo((props) => {
    const {visible, setVisible, getContainer, wrapClassName} = props
    const taskToken = useMemo(() => randomString(40), [])
    const [percent, setPercent] = useState<number>(0)
    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: ApplySyntaxFlowRuleUpdateResponse) => {
            const p = Math.floor(data.Percent * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            setTimeout(() => {
                setPercent(0)
                setVisible(false)
                onRefLocalRuleList()
            }, 200)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            onRefLocalRuleList()
            yakitNotify("error", "更新失败:" + e)
        })
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    useEffect(() => {
        if (visible) {
            ipcRenderer
                .invoke("ApplySyntaxFlowRuleUpdate", taskToken)
                .then(() => {})
                .catch((e) => {
                    failed(`更新失败:${e}`)
                })
        }
    }, [visible])
    const StopAllRule = () => {
        ipcRenderer.invoke("cancel-streamApplySyntaxFlowRuleUpdate", taskToken).catch((e) => {
            failed(`停止更新:${e}`)
            onRefLocalRuleList()
        })
    }
    /** 更新后需要刷新本地规则管理 */
    const onRefLocalRuleList = useMemoizedFn(() => {
        emiter.emit("onRefreshRuleManagement")
    })
    return (
        <YakitHint
            visible={visible}
            title={`${getReleaseEditionName()} 规则更新中...`}
            heardIcon={<SolidCloudDownloadIcon style={{color: "var(--Colors-Use-Warning-Primary)"}} />}
            onCancel={() => {
                StopAllRule()
                setVisible(false)
            }}
            okButtonProps={{style: {display: "none"}}}
            isDrag={true}
            mask={false}
            getContainer={getContainer}
            wrapClassName={wrapClassName}
        >
            <Progress
                strokeColor='var(--Colors-Use-Main-Primary)'
                trailColor='var(--Colors-Use-Neutral-Bg-Hover)'
                percent={percent}
                format={(percent) => `已更新 ${percent}%`}
            />
        </YakitHint>
    )
})

interface YakModuleListHeardProps {
    isSelectAll: boolean
    onSelectAll: (e: boolean) => void
    setIsSelectAll: (e: boolean) => void
    total: number
    length: number
    loading?: boolean
    isHasParams: boolean
}
export const YakModuleListHeard: React.FC<YakModuleListHeardProps> = React.memo((props) => {
    const {isSelectAll, onSelectAll, setIsSelectAll, total, length, loading, isHasParams} = props
    useEffect(() => {
        if (length > 0 && !isHasParams) setIsSelectAll(length == total)
    }, [total, length, isHasParams])
    return (
        <div className={style["mitm-plugin-list-heard"]}>
            {!isHasParams && (
                <div className={style["mitm-plugin-list-check"]}>
                    <YakitCheckbox
                        checked={isSelectAll}
                        indeterminate={!isSelectAll && length > 0}
                        onChange={(e) => onSelectAll(e.target.checked)}
                        disabled={loading}
                    />
                    <span className={style["mitm-plugin-list-check-text"]}>全选</span>
                </div>
            )}
            <div className={style["mitm-plugin-list-tip"]}>
                <div>
                    Total<span>&nbsp;{total}</span>
                </div>
                <Divider type='vertical' style={{margin: "0 8px", height: 12, top: 0}} />
                <div>
                    Selected<span>&nbsp;{length}</span>
                </div>
            </div>
        </div>
    )
})

interface TagsAndGroupRenderProps {
    // tags: string[]
    // setTags: (s: string[]) => void
    wrapStyle?: React.CSSProperties
    selectGroup: YakFilterRemoteObj[]
    setSelectGroup: (y: YakFilterRemoteObj[]) => void
}
export const TagsAndGroupRender: React.FC<TagsAndGroupRenderProps> = React.memo((props) => {
    const {
        // tags, setTags,
        wrapStyle = {},
        selectGroup,
        setSelectGroup
    } = props
    return (
        <>
            {/* tags.length > 0 || */}
            {selectGroup.length > 0 && (
                <div className={style["mitm-plugin-query-show"]} style={wrapStyle}>
                    {/* {tags.map((i) => {
                        return (
                            <YakitTag
                                key={i}
                                style={{marginBottom: 2}}
                                onClose={() => {
                                    const arr = tags.filter((element) => i !== element)
                                    setTags([...arr])
                                }}
                                closable={true}
                            >
                                {i}
                            </YakitTag>
                        )
                    })} */}
                    {selectGroup.map((i) => {
                        return (
                            <YakitTag
                                key={i.name}
                                style={{marginBottom: 2}}
                                onClose={() => {
                                    const arr = selectGroup.filter((element) => i.name !== element.name)
                                    setSelectGroup([...arr])
                                }}
                                closable={true}
                                className={classNames(style["mitm-plugin-query-plugin-group"])}
                            >
                                <FolderOpenIcon className={style["folder-icon"]} />
                                <span
                                    className={classNames(
                                        style["mitm-plugin-query-plugin-group-name"],
                                        "content-ellipsis"
                                    )}
                                >
                                    {i.name}
                                </span>
                            </YakitTag>
                        )
                    })}
                </div>
            )}
        </>
    )
})

interface PluginGroupProps {
    isOnline?: boolean
    selectGroup: YakFilterRemoteObj[]
    setSelectGroup: (y: YakFilterRemoteObj[]) => void
    wrapperClassName?: string
    isShowGroupMagBtn?: boolean
    excludeType?: string[]
    isMITMParamPlugins?: number
    pluginListQuery?: (checkedPlugin: string[]) => any
    allChecked?: boolean
    total?: number
    checkedPlugin?: string[]
    onClickMagFun?: () => void
}
export const PluginGroup: React.FC<PluginGroupProps> = React.memo((props) => {
    const {
        selectGroup,
        setSelectGroup,
        wrapperClassName,
        isShowGroupMagBtn = true,
        isOnline = false,
        excludeType = [],
        isMITMParamPlugins = 0,
        pluginListQuery,
        allChecked = false,
        total = 0,
        checkedPlugin = []
    } = props

    const [visible, setVisible] = useState<boolean>(false)
    /**
     * @description 插件组
     */
    const [pugGroup, setPlugGroup] = useState<YakFilterRemoteObj[]>([])

    const pluginGroupRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(pluginGroupRef)

    const compareExcludeType = useCampare(excludeType)

    const [addGroupVisible, setAddGroupVisible] = useState<boolean>(false)
    const updateGroupListRef = useRef<any>()
    const [groupList, setGroupList] = useState<UpdateGroupListItem[]>([]) // 组数据

    useDebounceEffect(
        () => {
            if (inViewport) {
                getGroupList()
            }
        },
        [inViewport, compareExcludeType, isMITMParamPlugins],
        {wait: 500}
    )

    const getGroupList = () => {
        if (isOnline) {
            apiFetchQueryYakScriptGroupOnlineNotLoggedIn().then((res: API.GroupResponse) => {
                const copyGroup = structuredClone(res.data || [])
                const data: YakFilterRemoteObj[] = copyGroup
                    .filter((item) => !item.default)
                    .map((item) => ({
                        name: item.value,
                        total: item.total
                    }))
                setPlugGroup(data)
                filterSelectGroup(data)
            })
        } else {
            apiFetchQueryYakScriptGroupLocal(false, excludeType, isMITMParamPlugins).then((group: GroupCount[]) => {
                const copyGroup = structuredClone(group)
                const data: YakFilterRemoteObj[] = copyGroup.map((item) => ({
                    name: item.Value,
                    total: item.Total
                }))
                setPlugGroup(data)
                filterSelectGroup(data)
            })
        }
    }

    const filterSelectGroup = (data: YakFilterRemoteObj[]) => {
        const groupNameSet = new Set(data.map((obj) => obj.name))
        // 当选中的组在所有插件组中不存在 更新选中组
        const index = selectGroup.findIndex((item) => !groupNameSet.has(item.name))
        if (index != -1) {
            const newSelectGroup = selectGroup.filter((item) => groupNameSet.has(item.name))
            setSelectGroup(newSelectGroup)
        }
    }

    const getYakScriptGroup = () => {
        if (pluginListQuery) {
            if (!isOnline) {
                apiFetchGetYakScriptGroupLocal(pluginListQuery(checkedPlugin)).then((res) => {
                    const copySetGroup = [...res.SetGroup]
                    const newSetGroup = copySetGroup.map((name) => ({
                        groupName: name,
                        checked: true
                    }))
                    let copyAllGroup = [...res.AllGroup]
                    const newAllGroup = copyAllGroup.map((name) => ({
                        groupName: name,
                        checked: false
                    }))
                    setGroupList([...newSetGroup, ...newAllGroup])
                })
            } else {
                apiFetchGetYakScriptGroupOnline(pluginListQuery(checkedPlugin)).then((res) => {
                    const copySetGroup = Array.isArray(res.setGroup) ? [...res.setGroup] : []
                    const newSetGroup = copySetGroup.map((name) => ({
                        groupName: name,
                        checked: true
                    }))
                    let copyAllGroup = Array.isArray(res.allGroup) ? [...res.allGroup] : []
                    // 便携版 如果没有基础扫描 塞基础扫描
                    if (isEnpriTraceAgent()) {
                        const index = copySetGroup.findIndex((name) => name === "基础扫描")
                        const index2 = copyAllGroup.findIndex((name) => name === "基础扫描")

                        if (index === -1 && index2 === -1) {
                            copyAllGroup = [...copyAllGroup, "基础扫描"]
                        }
                    }
                    const newAllGroup = copyAllGroup.map((name) => ({
                        groupName: name,
                        checked: false
                    }))
                    setGroupList([...newSetGroup, ...newAllGroup])
                })
            }
        }
    }
    const updateGroupList = useMemoizedFn(() => {
        if (!pluginListQuery) return
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
        if (!saveGroup.length && !removeGroup.length) return
        if (!isOnline) {
            // 本地
            const query = pluginListQuery(checkedPlugin)
            apiFetchSaveYakScriptGroupLocal({
                Filter: query,
                SaveGroup: saveGroup,
                RemoveGroup: removeGroup
            }).then(() => {
                setAddGroupVisible(false)
                if (removeGroup.length) {
                    yakitNotify(
                        "success",
                        `${allChecked ? total : query.IncludedScriptNames?.length}个插件已从“${removeGroup.join(
                            ","
                        )}”组移除`
                    )
                }
                const addGroup: string[] = checkedGroup.filter((item) => !originCheckedGroup.includes(item))
                if (addGroup.length) {
                    yakitNotify(
                        "success",
                        `${allChecked ? total : query.IncludedScriptNames?.length}个插件已添加至“${addGroup.join(
                            ","
                        )}”组`
                    )
                }
                if (removeGroup.length || addGroup.length) {
                    getGroupList()
                }
            })
        } else {
            // 线上
            const query = {...pluginListQuery(checkedPlugin), saveGroup, removeGroup}
            apiFetchSaveYakScriptGroupOnline(query).then(() => {
                setAddGroupVisible(false)
                if (removeGroup.length) {
                    yakitNotify(
                        "success",
                        `${allChecked ? total : query.uuid.length}个插件已从“${removeGroup.join(",")}”组移除`
                    )
                }
                const addGroup: string[] = checkedGroup.filter((item) => !originCheckedGroup.includes(item))
                if (addGroup.length) {
                    yakitNotify(
                        "success",
                        `${allChecked ? total : query.uuid.length}个插件已添加至“${addGroup.join(",")}”组`
                    )
                }
                if (removeGroup.length || addGroup.length) {
                    getGroupList()
                }
            })
        }
    })

    return (
        <div className={classNames(style["mitm-plugin-group"], wrapperClassName)} ref={pluginGroupRef}>
            <Dropdown
                overlay={
                    <PluginGroupList
                        pugGroup={pugGroup}
                        isOnline={isOnline}
                        showOptBtns={isShowGroupMagBtn}
                        selectGroup={selectGroup}
                        setSelectGroup={setSelectGroup}
                        onEditInputBlur={(item, newName) => {
                            if (!newName || newName === item.name) return
                            if (!isOnline) {
                                apiFetchRenameYakScriptGroupLocal(item.name, newName).then(() => {
                                    getGroupList()
                                })
                            } else {
                                const params: PluginGroupRename = {group: item.name, newGroup: newName}
                                apiFetchRenameYakScriptGroupOnline(params).then(() => {
                                    getGroupList()
                                })
                            }
                        }}
                        onDelGroup={(item, delOk) => {
                            if (!isOnline) {
                                apiFetchDeleteYakScriptGroupLocal(item.name).then(() => {
                                    delOk()
                                    getGroupList()
                                })
                            } else {
                                const params: PluginGroupDel = {group: item.name}
                                apiFetchDeleteYakScriptGroupOnline(params).then(() => {
                                    delOk()
                                    getGroupList()
                                })
                            }
                        }}
                        closePluginGroupList={() => setVisible(false)}
                    />
                }
                visible={visible}
                onVisibleChange={setVisible}
                overlayStyle={{borderRadius: 4, width: 200}}
            >
                <div
                    className={classNames(style["mitm-plugin-group-left"], {
                        [style["mitm-plugin-group-left-open"]]: visible
                    })}
                >
                    <FolderOpenIcon />
                    <span>插件组</span>
                    <div className={style["mitm-plugin-group-number"]}>{pugGroup.length}</div>
                    {(visible && <ChevronUpIcon className={style["chevron-down"]} />) || (
                        <ChevronDownIcon className={style["chevron-down"]} />
                    )}
                </div>
            </Dropdown>
            {isShowGroupMagBtn && (
                <YakitPopover
                    visible={addGroupVisible}
                    overlayClassName={style["add-group-popover"]}
                    placement='bottomRight'
                    trigger='click'
                    content={
                        <UpdateGroupList
                            ref={updateGroupListRef}
                            originGroupList={groupList}
                            onOk={updateGroupList}
                            onCanle={() => setAddGroupVisible(false)}
                        ></UpdateGroupList>
                    }
                    onVisibleChange={(visible) => {
                        if (visible) {
                            getYakScriptGroup()
                        }
                        setAddGroupVisible(visible)
                    }}
                >
                    <YakitButton type='text' disabled={!checkedPlugin.length && !allChecked}>
                        添加分组
                    </YakitButton>
                </YakitPopover>
            )}
        </div>
    )
})

interface QueryValueProps {
    tag: string[]
    searchKeyword: string
    fieldKeywords: string
}
interface PluginSearchProps {
    selectSize?: YakitSizeType
    inputSize?: YakitSizeType
    selectModuleTypeSize?: YakitSizeType
    tag: string[]
    searchKeyword: string
    fieldKeywords: string
    onSearch: (v: QueryValueProps) => void
    setTag: (s: string[]) => void
    setSearchKeyword: (s: string) => void
    setFieldKeywords: (s: string) => void
}
type PluginSearchType = "Tags" | "Keyword" | "FieldKeywords"
export const PluginSearch: React.FC<PluginSearchProps> = React.memo((props) => {
    const {
        onSearch,
        tag,
        searchKeyword,
        fieldKeywords,
        setTag,
        setSearchKeyword,
        setFieldKeywords,
        selectSize,
        inputSize,
        selectModuleTypeSize
    } = props
    const [searchType, setSearchType] = useState<PluginSearchType>("FieldKeywords")
    const [afterModuleType, setAfterModuleType] = useState<"input" | "select">("input")
    const [allTag, setAllTag] = useState<TagValue[]>([])

    /**
     * @description 获取Tags
     */
    useEffect(() => {
        if (searchType === "Tags") {
            ipcRenderer
                .invoke("GetYakScriptTags", {})
                .then((res) => {
                    setAllTag(res.Tag.map((item) => ({Name: item.Value, Total: item.Total})))
                })
                .catch((e) => failed("获取插件组失败:" + e))
                .finally(() => {})
        }
    }, [searchType])

    // 搜索选项切换
    const onSelectChange = useMemoizedFn((o: string) => {
        if (o === "Keyword") {
            setTag([])
            setFieldKeywords("")
            setAfterModuleType("input")
        }
        if (o === "FieldKeywords") {
            setTag([])
            setSearchKeyword("")
            setAfterModuleType("input")
        }
        if (o === "Tags") {
            setFieldKeywords("")
            setSearchKeyword("")
            setAfterModuleType("select")
        }
        setSearchType(o as PluginSearchType)
    })

    // 输入框内容更新
    const onInputUpadte = useMemoizedFn((e: any) => {
        if (searchType === "FieldKeywords") setFieldKeywords(e.target.value)
        if (searchType === "Keyword") setSearchKeyword(e.target.value)
        return
    })
    // 输入框内容
    const searchValue = useMemo(() => {
        if (searchType === "FieldKeywords") return fieldKeywords
        if (searchType === "Keyword") return searchKeyword
        return ""
    }, [searchType, fieldKeywords, searchKeyword])

    const handleSearch = useMemoizedFn(() => {
        onSearch({
            tag,
            searchKeyword,
            fieldKeywords
        })
    })

    return (
        <YakitCombinationSearch
            afterModuleType={afterModuleType}
            valueBeforeOption={searchType}
            onSelectBeforeOption={onSelectChange}
            beforeOptionWidth={92}
            addonBeforeOption={[
                {
                    label: "关键字",
                    value: "FieldKeywords"
                },
                {
                    label: "全文搜索",
                    value: "Keyword"
                },
                {
                    label: "tag",
                    value: "Tags"
                }
            ]}
            inputSearchModuleTypeProps={{
                size: inputSize,
                value: searchValue,
                onChange: onInputUpadte,
                onSearch: handleSearch
            }}
            selectModuleTypeProps={{
                size: selectModuleTypeSize,
                data: allTag,
                value: tag,
                optValue: "Name",
                optionLabelProp: "Name",
                maxTagCount: "responsive",
                allowClear: true,
                renderOpt: (info: TagValue) => {
                    return (
                        <div className={classNames(style["mitm-plugin-local-tag-select-item"])}>
                            <span className={classNames(style["tag-select-item-name"], "content-ellipsis")}>
                                {info.Name}
                            </span>
                            <span>{info.Total}</span>
                        </div>
                    )
                },
                onClear: () => {
                    setTag([])
                },
                onSelect: (item) => {
                    const checked = tag.includes(item)
                    if (checked) {
                        setTag([...tag.filter((ele) => ele !== item)])
                    } else {
                        setTag([...tag, item])
                    }
                },
                onDeselect: (i) => {
                    const arr = tag.filter((element) => i !== element)
                    setTag([...arr])
                }
            }}
            selectProps={{
                size: selectSize
            }}
        />
    )
})

interface PluginGroupListProps {
    pugGroup: YakFilterRemoteObj[]
    isOnline: boolean
    showOptBtns: boolean
    selectGroup: YakFilterRemoteObj[]
    setSelectGroup: (p: YakFilterRemoteObj[]) => void
    onEditInputBlur: (p: YakFilterRemoteObj, newName: string) => void
    onDelGroup: (p: YakFilterRemoteObj, delOk: () => void) => void
    closePluginGroupList: () => void
}
const PluginGroupList: React.FC<PluginGroupListProps> = React.memo((props) => {
    const {
        pugGroup,
        isOnline,
        showOptBtns,
        selectGroup,
        setSelectGroup,
        onEditInputBlur,
        onDelGroup,
        closePluginGroupList
    } = props
    const [newName, setNewName] = useState<string>("") // 插件组新名字
    const [editGroup, setEditGroup] = useState<string>("")
    const delGroupConfirmPopRef = useRef<any>()
    const [delGroupConfirmPopVisible, setDelGroupConfirmPopVisible] = useState<boolean>(false)
    const [delGroup, setDelGroup] = useState<YakFilterRemoteObj>() // 删除插件组

    useEffect(() => {
        setNewName(editGroup)
    }, [editGroup])

    const onSelect = useMemoizedFn((selectItem: YakFilterRemoteObj) => {
        const checked = selectGroup.findIndex((l) => l.name === selectItem.name) === -1
        if (checked) {
            setSelectGroup([...selectGroup, selectItem])
        } else {
            const newSelectGroup = selectGroup.filter((m) => m.name !== selectItem.name)
            setSelectGroup(newSelectGroup)
        }
    })

    const showExtraOptBtns = (group: string) => {
        // 线上 便携版 基础扫描不允许编辑删除操作
        return showOptBtns && !(isOnline && isEnpriTraceAgent() && group === "基础扫描")
    }

    return (
        <div className={style["plugin-group-list"]}>
            {pugGroup.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无数据' />}
            {pugGroup.map((item) => (
                <div
                    className={classNames(style["plugin-group-item"], {
                        [style["plugin-group-item-select"]]: selectGroup.findIndex((l) => l.name === item.name) !== -1
                    })}
                    key={item.name}
                >
                    {editGroup === item.name ? (
                        <div className={style["plugin-group-item-input"]}>
                            <YakitInput
                                wrapperStyle={{height: "100%"}}
                                style={{height: "100%"}}
                                onBlur={() => {
                                    onEditInputBlur(item, newName)
                                    setEditGroup("")
                                }}
                                onPressEnter={() => {
                                    onEditInputBlur(item, newName)
                                    setEditGroup("")
                                }}
                                autoFocus={true}
                                value={newName}
                                onChange={(e) => setNewName(e.target.value.trim())}
                            ></YakitInput>
                        </div>
                    ) : (
                        <div
                            className={classNames(style["plugin-group-item-cont"])}
                            onClick={() => {
                                onSelect(item)
                            }}
                        >
                            <div
                                className={classNames(style["plugin-group-item-name"], "content-ellipsis")}
                                title={item.name}
                            >
                                {item.name}
                            </div>
                            <span
                                className={classNames(style["plugin-group-item-length"], {
                                    [style["plugin-number-unshow"]]: showExtraOptBtns(item.name)
                                })}
                            >
                                {item.total}
                            </span>
                            {showExtraOptBtns(item.name) && (
                                <div className={style["extra-opt-btns"]}>
                                    <YakitButton
                                        icon={<OutlinePencilaltIcon />}
                                        type='text2'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setEditGroup(item.name)
                                        }}
                                    ></YakitButton>
                                    <YakitButton
                                        icon={<OutlineTrashIcon />}
                                        type='text'
                                        colors='danger'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            getRemoteValue(RemoteGV.PluginGroupDelNoPrompt).then((result: string) => {
                                                const flag = result === "true"
                                                if (flag) {
                                                    onDelGroup(item, () => {})
                                                } else {
                                                    closePluginGroupList()
                                                    setDelGroup(item)
                                                    setDelGroupConfirmPopVisible(true)
                                                }
                                            })
                                        }}
                                    ></YakitButton>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
            <DelGroupConfirmPop
                ref={delGroupConfirmPopRef}
                visible={delGroupConfirmPopVisible}
                onCancel={() => {
                    setDelGroup(undefined)
                    setDelGroupConfirmPopVisible(false)
                }}
                delGroupName={delGroup?.name || ""}
                onOk={() => {
                    if (!delGroup) return
                    onDelGroup(delGroup, () => {
                        setDelGroup(undefined)
                        setRemoteValue(
                            RemoteGV.PluginGroupDelNoPrompt,
                            delGroupConfirmPopRef.current.delGroupConfirmNoPrompt + ""
                        )
                        setDelGroupConfirmPopVisible(false)
                    })
                }}
            ></DelGroupConfirmPop>
        </div>
    )
})
