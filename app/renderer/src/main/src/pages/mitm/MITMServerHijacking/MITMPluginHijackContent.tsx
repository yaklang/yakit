import {ArrowsExpandIcon, ArrowsRetractIcon, PlayIcon, RefreshIcon} from "@/assets/newIcon"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {MITMPluginTemplateShort} from "@/pages/invoker/data/MITMPluginTamplate"
import {YakScript, YakScriptHooks} from "@/pages/invoker/schema"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {EditorProps, YakCodeEditor} from "@/utils/editors"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {info, yakitFailed, yakitNotify} from "@/utils/notification"
import {useCreation, useMap, useMemoizedFn} from "ahooks"
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
import classNames from "classnames"
import {RemoteGV} from "@/yakitGV"

const {ipcRenderer} = window.require("electron")

type tabKeys = "all" | "loaded" | "hot-patch"
interface TabsItem {
    key: tabKeys
    label: string
    contShow: boolean
}

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
    groupNames: string[]
    setGroupNames: (s: string[]) => void
    tags: string[]
    searchKeyword: string
    setTags: (s: string[]) => void
    setSearchKeyword: (s: string) => void
    onSetOpenTabsFlag: (s: boolean) => void
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
        groupNames,
        setGroupNames,
        tags,
        searchKeyword,
        setTags,
        setSearchKeyword,
        onSetOpenTabsFlag
    } = props

    const [curTabKey, setCurTabKey] = useState<tabKeys>("all")
    const [mitmTabs, setMitmTabs] = useState<Array<TabsItem>>([
        {
            key: "all",
            label: "全部",
            contShow: true // 初始为true
        },
        {
            key: "loaded",
            label: "已启用",
            contShow: false // 初始为false
        },
        {
            key: "hot-patch",
            label: "热加载",
            contShow: false // 初始为false
        }
    ])

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
        handleTabClick({
            key: "hot-patch",
            label: "热加载",
            contShow: false
        })
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

    useEffect(() => {
        if (curTabKey === "hot-patch") {
            if (!script.Id) {
                getRemoteValue(RemoteGV.MITMHotPatchCodeSave).then((setting: string) => {
                    if (setting) {
                        setScript({...script, Content: setting})
                    } else {
                        setScript({...script, Content: MITMPluginTemplateShort})
                    }
                    onRefresh()
                })
            }
        }
    }, [curTabKey])

    const onRenderHeardExtra = useMemoizedFn(() => {
        switch (curTabKey) {
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
                        {!script.Id && (
                            <YakitButton
                                type='outline1'
                                onClick={() => {
                                    setRemoteValue(RemoteGV.MITMHotPatchCodeSave, script.Content).then(() => {
                                        yakitNotify("success", `保存成功`)
                                    })
                                }}
                            >
                                保存
                            </YakitButton>
                        )}
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
                        <YakitInput.Search
                            placeholder='请输入插件名称搜索'
                            value={hookScriptNameSearch}
                            onChange={(e) => setHookScriptNameSearch(e.target.value)}
                            onSearch={() => setIsHooksSearch(!isHooksSearch)}
                            onPressEnter={() => setIsHooksSearch(!isHooksSearch)}
                            wrapperStyle={{flex: 1}}
                        />
                    </>
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
        switch (curTabKey) {
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
                                language={"mitm"}
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
                            selectGroup={selectGroup}
                            setSelectGroup={setSelectGroup}
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
                                groupNames={groupNames}
                                setGroupNames={setGroupNames}
                            />
                        </YakitSpin>
                    </div>
                )
        }
    })

    useEffect(() => {
        getRemoteValue(RemoteGV.MitmHijackedLeftTabs).then((setting: string) => {
            if (setting) {
                const tabs = JSON.parse(setting)
                setMitmTabs(tabs.mitmTabs)
                setCurTabKey(tabs.curTabKey)
            }
        })
    }, [])
    const handleTabClick = (item: TabsItem) => {
        const copyMitmTabs = structuredClone(mitmTabs)
        copyMitmTabs.forEach((i) => {
            if (i.key === item.key) {
                i.contShow = !item.contShow
            } else {
                i.contShow = false
            }
        })
        setRemoteValue(RemoteGV.MitmHijackedLeftTabs, JSON.stringify({mitmTabs: copyMitmTabs, curTabKey: item.key}))
        setMitmTabs(copyMitmTabs)
        setCurTabKey(item.key)
    }
    useEffect(() => {
        onSetOpenTabsFlag(mitmTabs.some((item) => item.contShow))
    }, [mitmTabs])

    return (
        <div className={styles["mitm-plugin-hijack-content"]}>
            <div className={styles["mitm-hijack-tab-wrap"]}>
                <div className={styles["mitm-hijack-tab"]}>
                    {mitmTabs.map((item) => (
                        <div
                            className={classNames(styles["mitm-hijack-tab-item"], {
                                [styles["mitm-hijack-tab-item-active"]]: curTabKey === item.key,
                                [styles["mitm-hijack-tab-item-unshowCont"]]: curTabKey === item.key && !item.contShow
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
                <div
                    className={classNames(styles["mitm-hijack-tab-cont-item"])}
                    style={{
                        overflowY: "hidden"
                    }}
                >
                    <div className={styles["mitm-plugin-hijack-heard"]}>{onRenderHeardExtra()}</div>
                    {onRenderContent()}
                </div>
            </div>
        </div>
    )
}
