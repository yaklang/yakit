import {ArrowsExpandIcon, ArrowsRetractIcon, PlayIcon, RefreshIcon} from "@/assets/newIcon"
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
import {info, yakitFailed} from "@/utils/notification"
import {useCreation, useMap, useMemoizedFn} from "ahooks"
import {CheckboxChangeEvent} from "antd/lib/checkbox"
import React, {useEffect, useRef, useState} from "react"
import {CONST_DEFAULT_ENABLE_INITIAL_PLUGIN} from "../MITMPage"
import {MITMYakScriptLoader} from "../MITMYakScriptLoader"
import {
    MITMPluginLocalList,
    MITM_HOTPATCH_CODE,
    PluginGroup,
    PluginSearch,
    YakFilterRemoteObj,
    YakModuleListHeard
} from "./MITMPluginLocalList"
import {enableMITMPluginMode} from "./MITMServerHijacking"
import styles from "./MITMServerHijacking.module.scss"

const {ipcRenderer} = window.require("electron")

interface MITMPluginHijackContentProps {
    checkList: string[]
    setCheckList: (s: string[]) => void
    onSubmitYakScriptId: (id: number, params: YakExecutorParam[]) => any
    status: "idle" | "hijacked" | "hijacking"
    isFullScreen: boolean
    setIsFullScreen: (b: boolean) => void
    onSelectAll: (e: boolean) => void
    setInitialed?: (b: boolean) => void
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
export const MITMPluginHijackContent: React.FC<MITMPluginHijackContentProps> = (props) => {
    const {
        onSubmitYakScriptId,
        status,
        checkList,
        setCheckList,
        isFullScreen,
        setIsFullScreen,
        onSelectAll,
        setInitialed,
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

    const [script, setScript] = useState(MITMPluginTemplateShort)

    const [hooks, handlers] = useMap<string, boolean>(new Map<string, boolean>())
    const [loading, setLoading] = useState(false)

    // 是否允许获取默认勾选值
    const isDefaultCheck = useRef<boolean>(false)

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
                    i.Hooks.map((hook) => {
                        tmp.set(hook.YakScriptName, true)
                        cacheTmp = [...cacheTmp, hook.YakScriptName]
                    })
                })
                handlers.setAll(tmp)
                setCheckList(Array.from(new Set(cacheTmp)))
            }
        })
        updateHooks()
        setTimeout(() => {
            if (setInitialed) setInitialed(true)
        }, 500)
        return () => {
            // 组价销毁时进行本地缓存 用于后续页面进入默认选项
            const localSaveData = Array.from(new Set(cacheTmp))
            // console.log("本地缓存",localSaveData)
            setRemoteValue(CHECK_CACHE_LIST_DATA, JSON.stringify(localSaveData))
            ipcRenderer.removeAllListeners("client-mitm-hooks")
            ipcRenderer.removeAllListeners("client-mitm-loading")
        }
    }, [])
    const hooksItem: YakScript[] = useCreation(() => {
        let tmpItem: YakScript[] = []
        hooks.forEach((value, key) => {
            if (!key.includes(hookScriptNameSearch)) return
            if (value) {
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
    const onSendToPatch = useMemoizedFn((code: string) => {
        setScript(code)
        setMode("hot-patch")
    })
    const onRenderHeardExtra = useMemoizedFn(() => {
        switch (mode) {
            case "hot-patch":
                return (
                    <div className={styles["hot-patch-heard-extra"]}>
                        <YakitPopconfirm
                            title={"确认重置热加载代码？"}
                            onConfirm={() => {
                                setScript(MITMPluginTemplateShort)
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
                                if (!!script) {
                                    setRemoteValue(MITM_HOTPATCH_CODE, script)
                                }
                                ipcRenderer
                                    .invoke("mitm-exec-script-content", script)
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
                    <YakitInput.Search
                        placeholder='请输入插件名称搜索'
                        value={hookScriptNameSearch}
                        onChange={(e) => setHookScriptNameSearch(e.target.value)}
                        style={{maxWidth: 200}}
                        onSearch={() => setIsHooksSearch(!isHooksSearch)}
                        onPressEnter={() => setIsHooksSearch(!isHooksSearch)}
                    />
                )
            default:
                return (
                    <div className={styles["search-plugin-hijack-content"]}>
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
                        <YakCodeEditor
                            refreshTrigger={refreshCode}
                            noHeader={true}
                            noPacketModifier={true}
                            originValue={Buffer.from(script, "utf8")}
                            onChange={(e) => setScript(e.toString("utf8"))}
                            language={"yak"}
                            extraEditorProps={
                                {
                                    noMiniMap: true,
                                    noWordWrap: true
                                } as EditorProps
                            }
                        />
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
                        />
                        <YakitSpin spinning={loading}>
                            <MITMPluginLocalList
                                height='calc(100% - 96px)'
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
    return (
        <div className={styles["mitm-plugin-hijack-content"]}>
            <div className={styles["mitm-plugin-hijack-heard"]}>
                <div className={styles["mitm-plugin-hijack-heard-left"]}>
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
                </div>
                {onRenderHeardExtra()}
            </div>
            {onRenderContent()}
        </div>
    )
}
