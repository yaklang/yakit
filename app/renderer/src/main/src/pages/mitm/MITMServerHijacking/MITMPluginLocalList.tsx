import React, {ReactNode, Ref, useEffect, useMemo, useRef, useState} from "react"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {failed, info, yakitNotify} from "@/utils/notification"
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
    PlusCircleIcon,
    SolidCloudDownloadIcon,
    SolidTrashIcon,
    TrashIcon
} from "@/assets/newIcon"
import {
    DownloadOnlinePluginAllResProps,
    DownloadOnlinePluginByTokenRequest,
    TagValue,
    YakModuleList
} from "@/pages/yakitStore/YakitStorePage"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import {YakitSizeType} from "@/components/yakitUI/YakitInputNumber/YakitInputNumberType"
import {YakScript} from "@/pages/invoker/schema"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {ImportLocalPlugin, AddLocalPluginGroup} from "../MITMPage"
import {MITMYakScriptLoader} from "../MITMYakScriptLoader"
import {CheckboxChangeEvent} from "antd/lib/checkbox"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {randomString} from "@/utils/randomUtil"
import {queryYakScriptList} from "@/pages/yakitStore/network"
import {getReleaseEditionName} from "@/utils/envfile"
import {DownloadOnlinePluginsRequest} from "@/pages/plugins/utils"
import emiter from "@/utils/eventBus/eventBus"
import {PluginGV} from "@/pages/plugins/builtInData"
import {YakitRoute} from "@/routes/newRoute"

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
    includedScriptNames: string[]
    setIncludedScriptNames: (s: string[]) => void
}
export interface YakFilterRemoteObj {
    name: string
    value: string[]
}

export const FILTER_CACHE_LIST_DATA = PluginGV.Fetch_Local_Plugin_Group
export const MITMPluginLocalList: React.FC<MITMPluginLocalListProps> = React.memo((props) => {
    const {
        status,
        checkList,
        setCheckList,
        tags,
        searchKeyword,
        setTags,
        triggerSearch,
        selectGroup,
        setSelectGroup,
        // height,
        total,
        setTotal,
        hooks,
        setIsSelectAll,
        onSelectAll,
        onSendToPatch,
        includedScriptNames,
        setIncludedScriptNames
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
        let newScriptNames: string[] = []
        selectGroup.forEach((ele) => {
            newScriptNames = [...newScriptNames, ...ele.value]
        })
        setIncludedScriptNames(Array.from(new Set(newScriptNames)))

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
        queryYakScriptList(
            "mitm,port-scan",
            (data, t) => {
                setInitialTotal(t || 0)
            },
            undefined,
            1,
            undefined,
            searchKeyword,
            {
                Tag: tags,
                Type: "mitm,port-scan",
                Keyword: searchKeyword,
                IncludedScriptNames: includedScriptNames,
                Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
            }
        )
    })
    const onRenderEmptyNode = useMemoizedFn(() => {
        if (Number(total) === 0 && (tags.length > 0 || searchKeyword || includedScriptNames.length > 0)) {
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
                        IncludedScriptNames: includedScriptNames,
                        Keyword: searchKeyword,
                        Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
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
    visible: boolean
    setVisible: (b: boolean) => void
}
/**
 * 额外使用该组件的组件:
 * 1、GlobalState
 * 2、PluginDebuggerPage
 */
export const YakitGetOnlinePlugin: React.FC<YakitGetOnlinePluginProps> = React.memo((props) => {
    const {listType = "online", visible, setVisible} = props
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
                ipcRenderer.invoke("change-main-menu")
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
            const addParams: DownloadOnlinePluginsRequest = {ListType: listType === "online" ? "" : listType}
            ipcRenderer
                .invoke("DownloadOnlinePlugins", addParams, taskToken)
                .then(() => {})
                .catch((e) => {
                    failed(`下载失败:${e}`)
                })
        }
    }, [visible])
    const StopAllPlugin = () => {
        ipcRenderer.invoke("cancel-DownloadOnlinePluginAll", taskToken).catch((e) => {
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
    selectGroup: YakFilterRemoteObj[]
    setSelectGroup: (y: YakFilterRemoteObj[]) => void
}
export const TagsAndGroupRender: React.FC<TagsAndGroupRenderProps> = React.memo((props) => {
    const {
        // tags, setTags,
        selectGroup,
        setSelectGroup
    } = props
    return (
        <>
            {/* tags.length > 0 || */}
            {selectGroup.length > 0 && (
                <div className={style["mitm-plugin-query-show"]}>
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
    selectGroup: YakFilterRemoteObj[]
    setSelectGroup: (y: YakFilterRemoteObj[]) => void
    wrapperClassName?: string
    isShowAddBtn?: boolean
    isShowDelIcon?: boolean
}
export const PluginGroup: React.FC<PluginGroupProps> = React.memo((props) => {
    const {
        selectGroup,
        setSelectGroup,
        wrapperClassName,
        isShowAddBtn = true,
        isShowDelIcon = true
    } = props

    const [visible, setVisible] = useState<boolean>(false)
    /**
     * @description 插件组
     */
    const [pugGroup, setPlugGroup] = useState<YakFilterRemoteObj[]>([])

    useEffect(() => {
        // 获取插件组
        getRemoteValue(FILTER_CACHE_LIST_DATA).then((data: string) => {
            try {
                if (!!data) {
                    const cacheData: YakFilterRemoteObj[] = JSON.parse(data)
                    setPlugGroup(cacheData)
                }
            } catch (error) {
                failed("获取插件组失败:" + error)
            }
        })
    }, [])
    /**
     * @description 删除插件组
     */
    const onDeletePlugin = useMemoizedFn((deleteItem: YakFilterRemoteObj) => {
        const newArr: YakFilterRemoteObj[] = pugGroup.filter((item) => item.name !== deleteItem.name)
        setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify(newArr))
        setPlugGroup([...newArr])
        setSelectGroup(selectGroup.filter((item) => item.name !== deleteItem.name))
    })
    return (
        <div className={classNames(style["mitm-plugin-group"], wrapperClassName)}>
            <Dropdown
                overlay={
                    <PluginGroupList
                        pugGroup={pugGroup}
                        selectGroup={selectGroup}
                        setSelectGroup={setSelectGroup}
                        onDeletePlugin={onDeletePlugin}
                        isShowDelIcon={isShowDelIcon}
                    />
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
            {isShowAddBtn && (
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
    onDeletePlugin: (p: YakFilterRemoteObj) => void
    isShowDelIcon: boolean
}
const PluginGroupList: React.FC<PluginGroupListProps> = React.memo((props) => {
    const {pugGroup, selectGroup, setSelectGroup, onDeletePlugin, isShowDelIcon} = props
    const [visibleRemove, setVisibleRemove] = useState<boolean>(false)
    const [deletePlugin, setDeletePlugin] = useState<YakFilterRemoteObj>()
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
                        if (visibleRemove) return
                        onSelect(item)
                    }}
                    key={item.name}
                >
                    <div className={classNames(style["plugin-group-item-name"], "content-ellipsis")} title={item.name}>
                        {item.name}
                    </div>
                    <div className={style["plugin-group-item-right"]}>
                        <span className={style["plugin-group-item-length"]}>{item.value.length}</span>
                        {isShowDelIcon && (
                            <TrashIcon
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setVisibleRemove(true)
                                    setDeletePlugin(item)
                                }}
                            />
                        )}
                    </div>
                </div>
            ))}
            <YakitHint
                visible={visibleRemove}
                title='删除插件组'
                content={
                    <span>
                        确认要删除“<span style={{color: "var(--yakit-warning-5)"}}>{deletePlugin?.name}</span>
                        ”插件组吗？不会删除组内插件。
                    </span>
                }
                heardIcon={<SolidTrashIcon style={{color: "var(--yakit-warning-5)"}} />}
                onCancel={() => {
                    setVisibleRemove(false)
                }}
                okButtonText='确认删除'
                okButtonProps={{colors: "danger"}}
                onOk={() => {
                    if (deletePlugin) {
                        onDeletePlugin(deletePlugin)
                        setVisibleRemove(false)
                    }
                }}
            />
        </div>
    )
})
