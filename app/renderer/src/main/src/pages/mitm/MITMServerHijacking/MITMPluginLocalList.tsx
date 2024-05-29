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
import {ImportLocalPlugin} from "../MITMPage"
import {MITMYakScriptLoader} from "../MITMYakScriptLoader"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {randomString} from "@/utils/randomUtil"
import {getReleaseEditionName, isCommunityEdition, isEnpriTraceAgent} from "@/utils/envfile"
import {
    DownloadOnlinePluginsRequest,
    apiFetchQueryYakScriptGroupLocal,
    apiFetchQueryYakScriptGroupOnlineNotLoggedIn,
    apiQueryYakScript
} from "@/pages/plugins/utils"
import emiter from "@/utils/eventBus/eventBus"
import {PluginGV} from "@/pages/plugins/builtInData"
import {YakitRoute} from "@/enums/yakitRoute"
import {API} from "@/services/swagger/resposeType"
import {useCampare} from "@/hook/useCompare/useCompare"

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
    checkList: string[]
    setCheckList: (s: string[]) => void
    onSubmitYakScriptId: (id: number, params: YakExecutorParam[]) => any
    status: "idle" | "hijacked" | "hijacking"
    tags: string[]
    searchKeyword: string
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
    onSelectAll: (b: boolean) => void
    onSendToPatch?: (s: YakScript) => void
    groupNames: string[]
    setGroupNames: (s: string[]) => void
}
export interface YakFilterRemoteObj {
    name: string
    total: number
}

export const MITMPluginLocalList: React.FC<MITMPluginLocalListProps> = React.memo((props) => {
    const {
        status,
        checkList,
        setCheckList,
        tags,
        searchKeyword,
        triggerSearch,
        selectGroup,
        setSelectGroup,
        // height,
        total,
        setTotal,
        hooks,
        setIsSelectAll,
        onSendToPatch,
        groupNames,
        setGroupNames
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
    useEffect(() => {
        if (visibleOnline || inViewport) getAllSatisfyScript()
    }, [inViewport, visibleOnline])

    const getAllSatisfyScript = useMemoizedFn(() => {
        const query: QueryYakScriptRequest = {
            Pagination: {
                Limit: 20,
                Page: 1,
                OrderBy: "updated_at",
                Order: "desc"
            },
            Keyword: searchKeyword,
            IncludedScriptNames: [],
            Type: "mitm,port-scan",
            Tag: tags,
            Group: {UnSetGroup: false, Group: groupNames}
        }

        apiQueryYakScript(query).then((res) => {
            setInitialTotal(res.Total || 0)
        })
    })
    const onRenderEmptyNode = useMemoizedFn(() => {
        if (Number(total) === 0 && (tags.length > 0 || searchKeyword || groupNames.length > 0)) {
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
                        Type: "mitm,port-scan",
                        Keyword: searchKeyword,
                        Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"},
                        Group: {UnSetGroup: false, Group: groupNames}
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
                                status={status}
                                script={i}
                                maxWidth={maxWidth}
                                // 劫持启动后
                                hooks={hooks}
                                onSendToPatch={onSendToPatch}
                                onSubmitYakScriptId={props.onSubmitYakScriptId}
                                onRemoveHook={(name: string) => {
                                    if (hooks.get(name)) {
                                        setIsSelectAll(false)
                                    }
                                }}
                                // 劫持启动前
                                defaultPlugins={checkList}
                                setDefaultPlugins={setCheckList}
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
}
/**
 * 一键下载插件
 * @param listType 'online'默认首页 mine 个人, recycle 回收站 check 审核页面"
 */
export const YakitGetOnlinePlugin: React.FC<YakitGetOnlinePluginProps> = React.memo((props) => {
    const {listType = "online", pluginType, visible, setVisible, onFinish} = props
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
                PluginType: pluginType? pluginType : []
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
    /**下载插件后需要更新 本地插件列表 */
    const onRefLocalPluginList = useMemoizedFn(() => {
        emiter.emit("onRefLocalPluginList", "")
    })
    return (
        <YakitHint
            visible={visible}
            title={`${getReleaseEditionName()} 云端插件下载中...`}
            heardIcon={<SolidCloudDownloadIcon style={{color: "var(--yakit-warning-5)"}} />}
            onCancel={() => {
                StopAllPlugin()
                setVisible(false)
            }}
            okButtonProps={{style: {display: "none"}}}
            isDrag={true}
            mask={false}
        >
            <div className={style["download-progress"]}>
                <Progress
                    strokeColor='#F28B44'
                    trailColor='#F0F2F5'
                    percent={percent}
                    format={(percent) => `已下载 ${percent}%`}
                />
            </div>
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
}
export const YakModuleListHeard: React.FC<YakModuleListHeardProps> = React.memo((props) => {
    const {isSelectAll, onSelectAll, setIsSelectAll, total, length, loading} = props
    useEffect(() => {
        if (length > 0) setIsSelectAll(length == total)
    }, [total, length])
    return (
        <div className={style["mitm-plugin-list-heard"]}>
            <div className={style["mitm-plugin-list-check"]}>
                <YakitCheckbox
                    checked={isSelectAll}
                    indeterminate={!isSelectAll && length > 0}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    disabled={loading}
                />
                <span className={style["mitm-plugin-list-check-text"]}>全选</span>
            </div>
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
}
export const PluginGroup: React.FC<PluginGroupProps> = React.memo((props) => {
    const {
        selectGroup,
        setSelectGroup,
        wrapperClassName,
        isShowGroupMagBtn = true,
        isOnline = false,
        excludeType = ["yak", "codec"]
    } = props

    const [visible, setVisible] = useState<boolean>(false)
    /**
     * @description 插件组
     */
    const [pugGroup, setPlugGroup] = useState<YakFilterRemoteObj[]>([])

    const pluginGroupRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(pluginGroupRef)
    const refreshSelectGroupRef = useRef<boolean>(false)

    const compareExcludeType = useCampare(excludeType)

    useDebounceEffect(
        () => {
            if (inViewport) {
                // 获取插件组
                if (isOnline) {
                    apiFetchQueryYakScriptGroupOnlineNotLoggedIn().then((res: API.GroupResponse) => {
                        const copyGroup = structuredClone(res.data)
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
                    apiFetchQueryYakScriptGroupLocal(false, excludeType).then((group: GroupCount[]) => {
                        const copyGroup = structuredClone(group)
                        const data: YakFilterRemoteObj[] = copyGroup.map((item) => ({
                            name: item.Value,
                            total: item.Total
                        }))
                        setPlugGroup(data)
                        filterSelectGroup(data)
                    })
                }
            } else {
                refreshSelectGroupRef.current = false
            }
        },
        [inViewport, compareExcludeType],
        {wait: 500}
    )

    const filterSelectGroup = (data: YakFilterRemoteObj[]) => {
        if (!refreshSelectGroupRef.current) return
        let groupNameSet = new Set(data.map((obj) => obj.name))
        const newSelectGroup = selectGroup.filter((item) => groupNameSet.has(item.name))
        setSelectGroup(newSelectGroup)
    }

    useEffect(() => {
        const onRefpluginGroupSelectGroup = (flag: string) => {
            refreshSelectGroupRef.current = flag === "true"
        }
        emiter.on("onRefpluginGroupSelectGroup", onRefpluginGroupSelectGroup)
        return () => {
            emiter.off("onRefpluginGroupSelectGroup", onRefpluginGroupSelectGroup)
        }
    }, [])

    return (
        <div className={classNames(style["mitm-plugin-group"], wrapperClassName)} ref={pluginGroupRef}>
            <Dropdown
                overlay={
                    <PluginGroupList pugGroup={pugGroup} selectGroup={selectGroup} setSelectGroup={setSelectGroup} />
                }
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
                <YakitButton
                    type='text'
                    onClick={() => {
                        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.Plugin_Groups}))
                    }}
                >
                    管理分组
                </YakitButton>
            )}
        </div>
    )
})

interface QueryValueProps {
    tag: string[]
    searchKeyword: string
}
interface PluginSearchProps {
    selectSize?: YakitSizeType
    inputSize?: YakitSizeType
    selectModuleTypeSize?: YakitSizeType
    tag: string[]
    searchKeyword: string
    onSearch: (v: QueryValueProps) => void
    setTag: (s: string[]) => void
    setSearchKeyword: (s: string) => void
}
export const PluginSearch: React.FC<PluginSearchProps> = React.memo((props) => {
    const {onSearch, tag, searchKeyword, setTag, setSearchKeyword, selectSize, inputSize, selectModuleTypeSize} = props
    const [searchType, setSearchType] = useState<"Tags" | "Keyword">("Keyword")
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
    return (
        <YakitCombinationSearch
            afterModuleType={afterModuleType}
            valueBeforeOption={searchType}
            onSelectBeforeOption={(o) => {
                if (o === "Keyword") {
                    setTag([])
                    setAfterModuleType("input")
                }
                if (o === "Tags") {
                    setSearchKeyword("")
                    setAfterModuleType("select")
                }
                setSearchType(o as "Tags" | "Keyword")
            }}
            addonBeforeOption={[
                {
                    label: "关键字",
                    value: "Keyword"
                },
                {
                    label: "tag",
                    value: "Tags"
                }
            ]}
            inputSearchModuleTypeProps={{
                size: inputSize,
                value: searchKeyword,
                onChange: (e) => setSearchKeyword(e.target.value),
                onSearch: () =>
                    onSearch({
                        tag,
                        searchKeyword
                    })
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
    selectGroup: YakFilterRemoteObj[]
    setSelectGroup: (p: YakFilterRemoteObj[]) => void
}
const PluginGroupList: React.FC<PluginGroupListProps> = React.memo((props) => {
    const {pugGroup, selectGroup, setSelectGroup} = props
    const onSelect = useMemoizedFn((selectItem: YakFilterRemoteObj) => {
        const checked = selectGroup.findIndex((l) => l.name === selectItem.name) === -1
        if (checked) {
            setSelectGroup([...selectGroup, selectItem])
        } else {
            const newSelectGroup = selectGroup.filter((m) => m.name !== selectItem.name)
            setSelectGroup(newSelectGroup)
        }
    })

    return (
        <div className={style["plugin-group-list"]}>
            {pugGroup.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无数据' />}
            {pugGroup.map((item) => (
                <div
                    className={classNames(style["plugin-group-item"], {
                        [style["plugin-group-item-select"]]: selectGroup.findIndex((l) => l.name === item.name) !== -1
                    })}
                    onClick={() => {
                        onSelect(item)
                    }}
                    key={item.name}
                >
                    <div className={classNames(style["plugin-group-item-name"], "content-ellipsis")} title={item.name}>
                        {item.name}
                    </div>
                    <div className={style["plugin-group-item-right"]}>
                        <span className={style["plugin-group-item-length"]}>{item.total}</span>
                    </div>
                </div>
            ))}
        </div>
    )
})
