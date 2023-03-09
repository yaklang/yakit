import React, {ReactNode, Ref, useEffect, useRef, useState} from "react"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {useMap, useMemoizedFn, useUpdateEffect} from "ahooks"
import {failed, info, yakitFailed} from "@/utils/notification"
import {queryYakScriptList} from "@/pages/yakitStore/network"
import {enableMITMPluginMode} from "./MITMServerHijacking"
import style from "../MITMPage.module.scss"
import ReactResizeDetector from "react-resize-detector"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {Divider, Dropdown, Empty} from "antd"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import classNames from "classnames"
import {
    ChevronDownIcon,
    ChevronUpIcon,
    CloudDownloadIcon,
    FolderOpenIcon,
    ImportIcon,
    PlusCircleIcon,
    TrashIcon
} from "@/assets/newIcon"
import {TagValue, YakModuleList} from "@/pages/yakitStore/YakitStorePage"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import {YakitSizeType} from "@/components/yakitUI/YakitInputNumber/YakitInputNumberType"
import {YakScript} from "@/pages/invoker/schema"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {ImportLocalPlugin, AddPluginGroup} from "../MITMPage"
import {MITMYakScriptLoader} from "../MITMYakScriptLoader"
import {CheckboxChangeEvent} from "antd/lib/checkbox"

const {ipcRenderer} = window.require("electron")

export const MITM_HOTPATCH_CODE = `MITM_HOTPATCH_CODE`
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
    height: string | number
    renderTitle?: ReactNode
    setTotal: (n: number) => void
    hooks: Map<string, boolean>
    onSelectAll: (b: boolean) => void
    onSendToPatch?: (b: string) => void
    includedScriptNames: string[]
    setIncludedScriptNames: (s: string[]) => void
}
export interface YakFilterRemoteObj {
    name: string
    value: string[]
}

const FILTER_CACHE_LIST_DATA = `FILTER_CACHE_LIST_COMMON_DATA`
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
        height,
        setTotal,
        hooks,
        onSelectAll,
        onSendToPatch,
        includedScriptNames,
        setIncludedScriptNames
    } = props

    const [vlistHeigth, setVListHeight] = useState(0)

    const [refresh, setRefresh] = useState<boolean>(true)
    const [visibleImport, setVisibleImport] = useState<boolean>(false)

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
    }, [tags])
    return (
        <div className={style["mitm-plugin-local"]} style={{height}}>
            <div>
                <ReactResizeDetector
                    onResize={(width, height) => {
                        if (!height) {
                            return
                        }
                        setVListHeight(height > 0 ? height + 12 : 0)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                <TagsAndGroupRender
                    tags={tags}
                    setTags={setTags}
                    selectGroup={selectGroup}
                    setSelectGroup={setSelectGroup}
                />
            </div>

            <div className={style["mitm-plugin-list"]} style={{height: `calc(100% - ${vlistHeigth}px)`}}>
                <YakModuleList
                    emptyNode={
                        <div className={style["mitm-plugin-empty"]}>
                            <YakitEmpty description='可一键获取官方云端插件，或导入外部插件源' />
                            <div className={style["mitm-plugin-buttons"]}>
                                <YakitButton type='outline1' icon={<CloudDownloadIcon />}>
                                    获取云端插件
                                </YakitButton>
                                <YakitButton
                                    type='outline1'
                                    icon={<ImportIcon />}
                                    onClick={() => setVisibleImport(true)}
                                >
                                    导入插件源
                                </YakitButton>
                            </div>
                        </div>
                    }
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
                                key={i.Id}
                                script={i}
                                maxWidth={maxWidth}
                                // 劫持启动后
                                hooks={hooks}
                                onSendToPatch={onSendToPatch}
                                onSubmitYakScriptId={props.onSubmitYakScriptId}
                                onRemoveHook={(name: string) => {
                                    if (hooks.get(name)) {
                                        onSelectAll(false)
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
        </div>
    )
})

interface YakModuleListHeardProps {
    isSelectAll: boolean
    onSelectAll: (e: boolean) => void
    setIsSelectAll: (e: boolean) => void
    total: number
    length: number
}
export const YakModuleListHeard: React.FC<YakModuleListHeardProps> = React.memo((props) => {
    const {isSelectAll, onSelectAll, setIsSelectAll, total, length} = props
    useEffect(() => {
        setIsSelectAll(length == total)
    }, [total, length])
    return (
        <div className={style["mitm-plugin-list-heard"]}>
            <div className={style["mitm-plugin-list-check"]}>
                <YakitCheckbox checked={isSelectAll} onChange={(e) => onSelectAll(e.target.checked)} />
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
    tags: string[]
    setTags: (s: string[]) => void
    selectGroup: YakFilterRemoteObj[]
    setSelectGroup: (y: YakFilterRemoteObj[]) => void
}
export const TagsAndGroupRender: React.FC<TagsAndGroupRenderProps> = React.memo((props) => {
    const {tags, setTags, selectGroup, setSelectGroup} = props
    return (
        <>
            {(tags.length > 0 || selectGroup.length > 0) && (
                <div className={style["mitm-plugin-query-show"]}>
                    {tags.map((i) => {
                        return (
                            <YakitTag
                                key={i}
                                style={{marginBottom: 2}}
                                onClose={() => {
                                    const arr = tags.filter((element) => i !== element)
                                    setTags([...arr])
                                }}
                                closable={true}
                                size='small'
                            >
                                {i}
                            </YakitTag>
                        )
                    })}
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
                                size='small'
                                className={classNames(style["mitm-plugin-query-plugin-group"])}
                            >
                                <FolderOpenIcon />
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
    checkList: string[]
    selectGroup: YakFilterRemoteObj[]
    setSelectGroup: (y: YakFilterRemoteObj[]) => void
    isSelectAll: boolean
    wrapperClassName?: string
}
export const PluginGroup: React.FC<PluginGroupProps> = React.memo((props) => {
    const {checkList, selectGroup, setSelectGroup, isSelectAll, wrapperClassName} = props
    const [addGroupVisible, setAddGroupVisible] = useState<boolean>(false)
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
    /**
     * @description 保存插件组
     */
    const onSavePluginGroup = useMemoizedFn((value: YakFilterRemoteObj) => {
        getRemoteValue(FILTER_CACHE_LIST_DATA)
            .then((data: string) => {
                let obj = {
                    name: value.name,
                    value: checkList
                }
                if (!!data) {
                    const cacheData: YakFilterRemoteObj[] = JSON.parse(data)
                    const index: number = cacheData.findIndex((item) => item.name === value.name)
                    // 本地中存在插件组名称
                    if (index >= 0) {
                        cacheData[index].value = Array.from(new Set([...cacheData[index].value, ...checkList]))
                        setPlugGroup([...cacheData])
                        setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify(cacheData))
                    } else {
                        const newArr = [...cacheData, obj]
                        setPlugGroup(newArr)
                        setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify(newArr))
                    }
                } else {
                    setPlugGroup([obj])
                    setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify([obj]))
                }
                setAddGroupVisible(false)
                info("添加插件组成功")
            })
            .catch((err) => {
                failed("获取插件组失败:" + err)
            })
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
            <YakitButton
                type='text'
                onClick={() => {
                    if (checkList.length === 0) {
                        info("选中数据未获取")
                        return
                    }
                    setAddGroupVisible(true)
                }}
                disabled={isSelectAll}
            >
                添加至组
                <PlusCircleIcon className={style["plus-circle"]} />
            </YakitButton>
            <AddPluginGroup
                pugGroup={pugGroup}
                visible={addGroupVisible}
                setVisible={setAddGroupVisible}
                checkList={checkList}
                onOk={onSavePluginGroup}
            />
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
        ipcRenderer
            .invoke("GetYakScriptTags", {})
            .then((res) => {
                setAllTag(res.Tag.map((item) => ({Name: item.Value, Total: item.Total})))
            })
            .catch((e) => failed("获取插件组失败:" + e))
            .finally(() => {})
    }, [])
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
}
const PluginGroupList: React.FC<PluginGroupListProps> = React.memo((props) => {
    const {pugGroup, selectGroup, setSelectGroup, onDeletePlugin} = props
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
                    onClick={() => onSelect(item)}
                >
                    <div className={classNames(style["plugin-group-item-name"], "content-ellipsis")} title={item.name}>
                        {item.name}
                    </div>
                    <div className={style["plugin-group-item-right"]}>
                        <span className={style["plugin-group-item-length"]}>{item.value.length}</span>
                        <TrashIcon
                            onClick={(e) => {
                                e.stopPropagation()
                                onDeletePlugin(item)
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
})
