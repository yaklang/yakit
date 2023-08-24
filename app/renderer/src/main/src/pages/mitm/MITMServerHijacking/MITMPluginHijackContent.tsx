import {ArrowsExpandIcon, ArrowsRetractIcon, SearchIcon, MenuIcon, PlayIcon, RefreshIcon} from "@/assets/newIcon"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {MITMPluginTemplateShort} from "@/pages/invoker/data/MITMPluginTamplate"
import {YakScript, YakScriptHooks} from "@/pages/invoker/schema"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {EditorProps, YakCodeEditor} from "@/utils/editors"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {info, yakitFailed, yakitNotify} from "@/utils/notification"
import {useCreation, useMap, useMemoizedFn} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import React, {useEffect, useMemo, useRef, useState} from "react"
import {CONST_DEFAULT_ENABLE_INITIAL_PLUGIN} from "../MITMPage"
import {MITMYakScriptLoader} from "../MITMYakScriptLoader"
import {
    MITMPluginLocalList,
    PluginGroup,
    PluginSearch,
    YakFilterRemoteObj,
    YakModuleListHeard
} from "./MITMPluginLocalList"
import {enableMITMPluginMode} from "./MITMServerHijacking"
import styles from "./MITMServerHijacking.module.scss"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import classNames from "classnames"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {Dropdown} from "antd"

const {ipcRenderer} = window.require("electron")

interface MITMPluginHijackContentProps {
    checkList: string[]
    setCheckList: (s: string[]) => void
    onSubmitYakScriptId: (id: number, params: YakExecutorParam[]) => any
    status: "idle" | "hijacked" | "hijacking"
    isFullScreen: boolean
    setIsFullScreen: (b: boolean) => void
    onSelectAll: (e: boolean) => void
    setTotal: (b: number) => void
    total: number
    isSelectAll: boolean
    setIsSelectAll: (e: boolean) => void
    includedScriptNames: string[]
    setIncludedScriptNames: (s: string[]) => void
    tags: string[]
    searchKeyword: string
    setTags: (s: string[]) => void
    setSearchKeyword: (s: string) => void
}
const HotLoadDefaultData: YakScript = {
    Id: 0,
    Content: MITMPluginTemplateShort,
    Type: "",
    Params: [],
    CreatedAt: 0,
    ScriptName: "",
    Help: "",
    Level: "",
    Author: "",
    Tags: "",
    IsHistory: false,
    OnlineId: 0,
    OnlineScriptName: "",
    OnlineContributors: "",
    UserId: 0,
    UUID: ""
}
export const MITMPluginHijackContent: React.FC<MITMPluginHijackContentProps> = (props) => {
    const {
        onSubmitYakScriptId,
        status,
        checkList,
        setCheckList,
        isFullScreen,
        setIsFullScreen,
        onSelectAll,
        total,
        setTotal,
        isSelectAll,
        setIsSelectAll,
        includedScriptNames,
        setIncludedScriptNames,
        tags,
        searchKeyword,
        setTags,
        setSearchKeyword
    } = props
    const [mode, setMode] = useState<"hot-patch" | "loaded" | "all">("all")
    const [hookScriptNameSearch, setHookScriptNameSearch] = useState<string>("")
    const [triggerSearch, setTriggerSearch] = useState<boolean>(false)
    const [isHooksSearch, setIsHooksSearch] = useState<boolean>(false)
    const [refreshCode, setRefreshCode] = useState<boolean>(false)
    /**
     * 选中的插件组
     */
    const [selectGroup, setSelectGroup] = useState<YakFilterRemoteObj[]>([])

    const [script, setScript] = useState<YakScript>(HotLoadDefaultData)

    const [hooks, handlers] = useMap<string, boolean>(new Map<string, boolean>())
    const [loading, setLoading] = useState(false)

    // 是否允许获取默认勾选值
    const isDefaultCheck = useRef<boolean>(false)

    const [visiblePluginSearch, setVisiblePluginSearch] = useState<boolean>(false)

    // 初始化加载 hooks，设置定时更新 hooks 状态
    useEffect(() => {
        updateHooks()
        const id = setInterval(() => {
            updateHooks()
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        // 加载状态(从服务端加载)
        ipcRenderer.on("client-mitm-loading", (_, flag: boolean) => {
            setLoading(flag)
        })
        const CHECK_CACHE_LIST_DATA = "CHECK_CACHE_LIST_DATA"
        getRemoteValue(CHECK_CACHE_LIST_DATA)
            .then((data: string) => {
                getRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN).then((is) => {
                    if (!!data && !!is) {
                        const cacheData: string[] = JSON.parse(data)
                        if (cacheData.length) {
                            multipleMitm(cacheData)
                        }
                    }
                })
            })
            .finally(() => {
                isDefaultCheck.current = true
            })
        let cacheTmp: string[] = []
        // 用于 MITM 的 查看当前 Hooks
        ipcRenderer.on("client-mitm-hooks", (e, data: YakScriptHooks[]) => {
            if (isDefaultCheck.current) {
                const tmp = new Map<string, boolean>()
                cacheTmp = []
                data.forEach((i) => {
                    i.Hooks.forEach((hook) => {
                        if (hook.YakScriptName) {
                            tmp.set(hook.YakScriptName, true)
                            cacheTmp = [...cacheTmp, hook.YakScriptName]
                        }
                    })
                })
                handlers.setAll(tmp)
                setCheckList(Array.from(new Set(cacheTmp)))
            }
        })
        updateHooks()
        return () => {
            // 组价销毁时进行本地缓存 用于后续页面进入默认选项
            const localSaveData = Array.from(new Set(cacheTmp))
            setRemoteValue(CHECK_CACHE_LIST_DATA, JSON.stringify(localSaveData))
            ipcRenderer.removeAllListeners("client-mitm-hooks")
            ipcRenderer.removeAllListeners("client-mitm-loading")
        }
    }, [])
    const hooksItem: YakScript[] = useCreation(() => {
        let tmpItem: YakScript[] = []
        hooks.forEach((value, key) => {
            if (!key.includes(hookScriptNameSearch)) return
            if (value && key) {
                tmpItem.push({
                    Id: 0,
                    ScriptName: key,
                    Content: "",
                    Type: "",
                    Params: [],
                    CreatedAt: 0,
                    Help: "",
                    Level: "",
                    Author: "",
                    Tags: "",
                    IsHistory: false,
                    OnlineId: 0,
                    OnlineScriptName: "",
                    OnlineContributors: "",
                    UserId: 0,
                    UUID: ""
                })
            }
        })
        return tmpItem.sort((a, b) => a.ScriptName.localeCompare(b.ScriptName))
    }, [hooks, isHooksSearch])

    /**
     * @description 多选插件
     * @param checkList
     */
    const multipleMitm = (checkList: string[]) => {
        enableMITMPluginMode(checkList).then(() => {
            info("启动 MITM 插件成功")
        })
    }
    const updateHooks = useMemoizedFn(() => {
        ipcRenderer.invoke("mitm-get-current-hook").catch((e) => {
            yakitFailed(`更新 MITM 插件状态失败: ${e}`)
        })
    })
    const onRefresh = useMemoizedFn(() => {
        setRefreshCode(!refreshCode)
    })

    const onSearch = useMemoizedFn(() => {
        setTriggerSearch(!triggerSearch)
    })
    /**
     * @description 发送到【热加载】中调试代码
     */
    const onSendToPatch = useMemoizedFn((s: YakScript) => {
        setScript(s)
        setMode("hot-patch")
    })
    /**@description 保存热加载代码到本地插件 */
    const onSaveHotCode = useMemoizedFn(() => {
        ipcRenderer
            .invoke("SaveYakScript", script)
            .then((data: YakScript) => {
                yakitNotify("success", `保存本地插件成功`)
            })
            .catch((e: any) => {
                yakitNotify("error", `保存插件失败:` + e)
            })
    })

    const onRenderHeardExtra = useMemoizedFn(() => {
        switch (mode) {
            case "hot-patch":
                return (
                    <div className={styles["hot-patch-heard-extra"]}>
                        <YakitPopconfirm
                            title={"确认重置热加载代码？"}
                            onConfirm={() => {
                                setScript(HotLoadDefaultData)
                                onRefresh()
                            }}
                            placement='top'
                        >
                            <YakitButton type='text'>
                                <RefreshIcon />
                            </YakitButton>
                        </YakitPopconfirm>
                        <YakitButton
                            type='outline1'
                            onClick={() => {
                                ipcRenderer
                                    .invoke("mitm-exec-script-content", script.Content)
                                    .then(() => {
                                        info("加载成功")
                                    })
                                    .catch((e) => {
                                        yakitFailed("加载失败：" + e)
                                    })
                            }}
                        >
                            <PlayIcon />
                            热加载
                        </YakitButton>
                        {isFullScreen ? (
                            <ArrowsRetractIcon
                                className={styles["expand-icon"]}
                                onClick={() => setIsFullScreen(false)}
                            />
                        ) : (
                            <ArrowsExpandIcon
                                className={styles["expand-icon"]}
                                onClick={() => {
                                    setIsFullScreen(true)
                                }}
                            />
                        )}
                    </div>
                )
            case "loaded":
                return (
                    <>
                        {(width > 400 && (
                            <YakitInput.Search
                                placeholder='请输入插件名称搜索'
                                value={hookScriptNameSearch}
                                onChange={(e) => setHookScriptNameSearch(e.target.value)}
                                style={{maxWidth: 180}}
                                onSearch={() => setIsHooksSearch(!isHooksSearch)}
                                onPressEnter={() => setIsHooksSearch(!isHooksSearch)}
                            />
                        )) || (
                            <YakitPopover
                                overlayClassName={styles["filter-popover"]}
                                content={
                                    <YakitInput.Search
                                        placeholder='请输入插件名称搜索'
                                        value={hookScriptNameSearch}
                                        onChange={(e) => setHookScriptNameSearch(e.target.value)}
                                        style={{maxWidth: 250}}
                                        onSearch={() => setIsHooksSearch(!isHooksSearch)}
                                        onPressEnter={() => setIsHooksSearch(!isHooksSearch)}
                                    />
                                }
                                trigger='click'
                                onVisibleChange={setVisiblePluginSearch}
                                placement='bottomLeft'
                            >
                                <YakitButton
                                    type='outline2'
                                    isHover={visiblePluginSearch}
                                    style={{padding: 4}}
                                >
                                    <SearchIcon />
                                </YakitButton>
                            </YakitPopover>
                        )}
                    </>
                )
            default:
                return (
                    <div className={styles["search-plugin-hijack-content"]}>
                        {(width > 350 && (
                            <PluginSearch
                                tag={tags}
                                setTag={setTags}
                                searchKeyword={searchKeyword}
                                setSearchKeyword={setSearchKeyword}
                                onSearch={onSearch}
                                selectSize='small'
                                inputSize='middle'
                                selectModuleTypeSize='small'
                            />
                        )) || (
                            <YakitPopover
                                overlayClassName={styles["filter-popover"]}
                                content={
                                    <PluginSearch
                                        tag={tags}
                                        setTag={setTags}
                                        searchKeyword={searchKeyword}
                                        setSearchKeyword={setSearchKeyword}
                                        onSearch={onSearch}
                                        selectSize='small'
                                        inputSize='middle'
                                        selectModuleTypeSize='small'
                                    />
                                }
                                trigger='click'
                                onVisibleChange={setVisiblePluginSearch}
                                placement='bottomLeft'
                            >
                                <YakitButton
                                    type='outline2'
                                    isHover={visiblePluginSearch}
                                    style={{padding: 4}}
                                >
                                    <SearchIcon />
                                </YakitButton>
                            </YakitPopover>
                        )}
                    </div>
                )
        }
    })

    const onRenderContent = useMemoizedFn(() => {
        switch (mode) {
            case "hot-patch":
                return (
                    <div className={styles["hot-patch-code"]}>
                        {/* 用户热加载代码 */}
                        {script.Id ? (
                            <div className={styles["hot-patch-heard"]}>
                                <span>插件名称：{script.ScriptName}</span>
                                <YakitButton type='primary' onClick={() => onSaveHotCode()}>
                                    保存源码
                                </YakitButton>
                            </div>
                        ) : (
                            <></>
                        )}
                        <div className={styles["hot-patch-code-editor"]}>
                            <YakCodeEditor
                                bordered={false}
                                refreshTrigger={refreshCode}
                                noHeader={true}
                                noPacketModifier={true}
                                originValue={Buffer.from(script.Content, "utf8")}
                                onChange={(e) =>
                                    setScript({
                                        ...script,
                                        Content: e.toString("utf8")
                                    })
                                }
                                language={"yak"}
                                extraEditorProps={
                                    {
                                        noMiniMap: true,
                                        noWordWrap: true
                                    } as EditorProps
                                }
                            />
                        </div>
                    </div>
                )
            case "loaded":
                // 已启用
                return (
                    <div className={styles["plugin-loaded-list"]}>
                        <div className={styles["plugin-loaded-list-heard"]}>
                            <div className={styles["plugin-loaded-list-heard-total"]}>
                                Total<span>&nbsp;{hooksItem.length}</span>
                            </div>
                            <div
                                className={styles["plugin-loaded-list-heard-empty"]}
                                onClick={() => onSelectAll(false)}
                            >
                                清&nbsp;空
                            </div>
                        </div>
                        <div className={styles["plugin-loaded-hooks-list"]}>
                            <RollingLoadList<YakScript>
                                data={hooksItem}
                                page={1}
                                hasMore={false}
                                loadMoreData={() => {}}
                                loading={false}
                                rowKey='ScriptName'
                                defItemHeight={44}
                                renderRow={(data: YakScript, index: number) => (
                                    <MITMYakScriptLoader
                                        status={status}
                                        key={data.ScriptName}
                                        script={data}
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
                                )}
                            />
                        </div>
                    </div>
                )
            default:
                return (
                    <div className={styles["plugin-hijack-content-list"]}>
                        <PluginGroup
                            checkList={checkList}
                            selectGroup={selectGroup}
                            setSelectGroup={setSelectGroup}
                            isSelectAll={isSelectAll}
                            wrapperClassName={styles["plugin-group"]}
                        />
                        <YakModuleListHeard
                            onSelectAll={onSelectAll}
                            setIsSelectAll={setIsSelectAll}
                            isSelectAll={isSelectAll}
                            total={total}
                            length={checkList.length}
                            loading={loading}
                        />
                        <YakitSpin spinning={loading}>
                            <MITMPluginLocalList
                                // height='calc(100% - 96px)'
                                onSubmitYakScriptId={onSubmitYakScriptId}
                                status={status}
                                checkList={checkList}
                                setCheckList={(list) => {
                                    setCheckList(list)
                                }}
                                tags={tags}
                                setTags={setTags}
                                searchKeyword={searchKeyword}
                                triggerSearch={triggerSearch}
                                setIsSelectAll={setIsSelectAll}
                                isSelectAll={isSelectAll}
                                selectGroup={selectGroup}
                                setSelectGroup={setSelectGroup}
                                total={total}
                                setTotal={setTotal}
                                hooks={hooks}
                                onSelectAll={onSelectAll}
                                onSendToPatch={onSendToPatch}
                                includedScriptNames={includedScriptNames}
                                setIncludedScriptNames={setIncludedScriptNames}
                            />
                        </YakitSpin>
                    </div>
                )
        }
    })
    const [width, setWidth] = useState<number>(0)
    return (
        <div className={styles["mitm-plugin-hijack-content"]}>
            <ReactResizeDetector
                onResize={(w, h) => {
                    if (!w) {
                        return
                    }
                    setWidth(w)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <div className={styles["mitm-plugin-hijack-heard"]}>
                <div className={styles["mitm-plugin-hijack-heard-left"]}>
                    {(width > 350 && (
                        <YakitRadioButtons
                            buttonStyle='solid'
                            value={mode}
                            options={[
                                {label: "全部", value: "all"},
                                {label: "已启用", value: "loaded"},
                                {label: "热加载", value: "hot-patch"}
                            ]}
                            onChange={(e) => setMode(e.target.value)}
                        />
                    )) || (
                        <Dropdown
                            overlay={
                                <YakitMenu
                                    data={[
                                        {
                                            key: "all",
                                            label: "全部"
                                        },
                                        {
                                            key: "loaded",
                                            label: "已启用"
                                        },
                                        {
                                            key: "hot-patch",
                                            label: "热加载"
                                        }
                                    ]}
                                    onClick={({key}) => setMode(key as "hot-patch" | "loaded" | "all")}
                                    style={{padding: 4}}
                                />
                            }
                        >
                            <YakitButton type='primary'>
                                <MenuIcon />
                                {mode === "all" && "全部"}
                                {mode === "loaded" && "已启用"}
                                {mode === "hot-patch" && "热加载"}
                            </YakitButton>
                        </Dropdown>
                    )}
                </div>
                {onRenderHeardExtra()}
            </div>
            {onRenderContent()}
        </div>
    )
}
