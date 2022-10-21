import React, {memo, useEffect, useRef, useState} from "react"
import {AutoCard} from "../../components/AutoCard"
import {Button, Checkbox, Empty, Form, Input, List, Popconfirm, Select, Space, Tag} from "antd"
import {SelectOne} from "../../utils/inputUtil"
import {PoweroffOutlined, ReloadOutlined, SearchOutlined} from "@ant-design/icons"
import {getRemoteValue, getValue, saveValue, setRemoteValue} from "../../utils/kv"
import {EditorProps, YakCodeEditor} from "../../utils/editors"
import {YakModuleList, YakFilterModuleList} from "@/pages/yakitStore/YakitStorePage"
import {genDefaultPagination, YakScript, YakScriptHooks} from "../invoker/schema"
import {useDebounceFn, useMap, useMemoizedFn} from "ahooks"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {MITMPluginTemplateShort} from "../invoker/data/MITMPluginTamplate"
import {clearMITMPluginCache, MITMYakScriptLoader} from "./MITMYakScriptLoader"
import {failed, info} from "../../utils/notification"
import {StringToUint8Array} from "../../utils/str"
import "./MITMPluginList.scss"
import {queryYakScriptList} from "../yakitStore/network"
import {enableMITMPluginMode} from "./MITMServerHijacking"

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

const {ipcRenderer} = window.require("electron")

const updateHooks = () => {
    ipcRenderer.invoke("mitm-get-current-hook").catch((e) => {
        failed(`更新 MITM 插件状态失败: ${e}`)
    })
}

interface TagsProps {
    Value: string
    Total: number
}

export const MITMPluginList: React.FC<MITMPluginListProp> = memo((props) => {
    const [initialed, setInitialed] = useState(false)
    const [script, setScript] = useState(MITMPluginTemplateShort)
    // const [userDefined, setUserDefined] = useState(false);
    const [hooks, handlers] = useMap<string, boolean>(new Map<string, boolean>())
    const [mode, setMode] = useState<"hot-patch" | "loaded" | "all">("all")
    const [refreshTrigger, setRefreshTrigger] = useState(false)
    const [searchKeyword, setSearchKeyword] = useState("")
    const onRefresh = useMemoizedFn(() => {
        setRefreshTrigger(!refreshTrigger)
    })
    const [loading, setLoading] = useState(false)
    // 是否允许获取默认勾选值
    const isDefaultCheck = useRef<boolean>(false)
    // 热加载模块持久化
    useEffect(() => {
        getRemoteValue(MITM_HOTPATCH_CODE).then((e) => {
            if (!e) {
                return
            }
            setScript(`${e}`)
        })
    }, [])

    // 设置用户模式
    const userDefined = mode === "hot-patch"
    let hooksItem: {name: string}[] = []
    hooks.forEach((value, key) => {
        if (value) {
            hooksItem.push({name: key})
        }
    })
    hooksItem = hooksItem.sort((a, b) => a.name.localeCompare(b.name))

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
                if (!!data) {
                    const cacheData: string[] = JSON.parse(data)
                    if (cacheData.length) {
                        // console.log("读取数据",cacheData)
                        multipleMitm(cacheData)
                    }
                }
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
                // console.log("勾选项",tmp)
                handlers.setAll(tmp)
            }
        })
        updateHooks()
        setTimeout(() => {
            setInitialed(true)
        }, 500)
        return () => {
            // 组价销毁时进行本地缓存 用于后续页面进入默认选项
            const localSaveData = Array.from(new Set(cacheTmp))
            // console.log("本地缓存",localSaveData)
            setRemoteValue(CHECK_CACHE_LIST_DATA, JSON.stringify(localSaveData))
            ipcRenderer.removeAllListeners("client-mitm-hooks")
        }
    }, [])

    const [checkAll, setCheckAll] = useState<boolean>(false)
    const [tagsLoading, setTagsLoading] = useState<boolean>(false)
    // const [indeterminate, setIndeterminate] = useState(true)
    const [refresh, setRefresh] = useState(true)
    const [total, setTotal] = useState<number>(0)
    const [tagsList, setTagsList] = useState<TagsProps[]>([])
    const [tag, setTag] = useState<string[]>([])
    const [searchType, setSearchType] = useState<"Tags" | "Keyword">("Tags")
    const [listNames, setListNames] = useState<string[]>([])
    const onCheckAllChange = (checked: boolean) => {
        if (checked) {
            enableMITMPluginMode(listNames).then(() => {
                info("启动 MITM 插件成功")
            })
        } else {
            ipcRenderer.invoke("mitm-remove-hook", {
                HookName: [],
                RemoveHookID: listNames
            } as any)
        }
        setCheckAll(checked)
    }
    // 多选插件
    const multipleMitm = (checkList: string[]) => {
        enableMITMPluginMode(checkList).then(() => {
            info("启动 MITM 插件成功")
        })
    }

    useEffect(() => {
        getYakScriptTags()
    }, [searchType])
    const getYakScriptTags = useMemoizedFn(() => {
        setTagsLoading(true)
        ipcRenderer
            .invoke("GetYakScriptTags", {})
            .then((res) => {
                setTagsList(res.Tag)
            })
            .catch((err) => {
                failed("获取tag列表失败：" + err)
            })
            .finally(() => setTimeout(() => setTagsLoading(false), 100))
    })
    const onDeselect = useDebounceFn(
        useMemoizedFn(() => {
            setRefresh(!refresh)
        }),
        {wait: 200}
    ).run
    const getAllSatisfyScript = useMemoizedFn((limit: number) => {
        queryYakScriptList(
            "mitm,port-scan",
            (data, t) => {
                setTotal(t || 0)
                setListNames(data.map((i) => i.ScriptName))
            },
            undefined,
            limit || 300,
            undefined,
            searchKeyword,
            {
                Tag: tag,
                Type: "mitm,port-scan",
                Keyword: "",
                Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
            }
        )
    })
    return (
        <AutoCard
            bordered={false}
            headStyle={{padding: 0}}
            bodyStyle={{padding: 0, overflowY: "auto"}}
            loading={!initialed || loading}
            title={
                <div className='mitm-card-title'>
                    <div className='mitm-card-select'>
                        <SelectOne
                            data={[
                                {text: "热加载", value: "hot-patch"},
                                {text: "已启用", value: "loaded"},
                                {text: "全部", value: "all"}
                            ]}
                            value={mode}
                            formItemStyle={{marginBottom: 2}}
                            setValue={setMode}
                            size='small'
                        />
                        <div className='mitm-card-select-right'>
                            {mode === "hot-patch" && (
                                <Popconfirm
                                    title={"确认重置热加载代码？"}
                                    onConfirm={() => {
                                        setScript(MITMPluginTemplateShort)
                                        onRefresh()
                                    }}
                                >
                                    <Button type={"link"} icon={<ReloadOutlined />} size={"small"} />
                                </Popconfirm>
                            )}
                            {mode === "all" && (
                                <Popconfirm title={"清空所选插件？"} onConfirm={() => {
                                    onCheckAllChange(false)
                                }}>
                                    <Button size={"small"} type={"link"} danger={true}>
                                        清空
                                    </Button>
                                </Popconfirm>
                            )}
                        </div>
                    </div>
                    <div className='mitm-card-search'>
                        {mode === "all" && (
                            <YakFilterModuleList
                                TYPE='MITM'
                                refresh={refresh}
                                tagsLoading={tagsLoading}
                                searchType={searchType}
                                setTag={setTag}
                                setRefresh={setRefresh}
                                onDeselect={onDeselect}
                                tag={tag}
                                tagsList={tagsList}
                                setSearchType={setSearchType}
                                setSearchKeyword={setSearchKeyword}
                                checkAll={checkAll}
                                checkList={Array.from(hooks).map((item) => item[0])}
                                multipleCallBack={multipleMitm}
                                onCheckAllChange={onCheckAllChange}
                                setCheckAll={setCheckAll}
                            />
                        )}
                    </div>
                </div>
            }
            size={"small"}
            extra={
                <>
                    <Space>
                        {userDefined && (
                            <Button
                                size={"small"}
                                type={"primary"}
                                onClick={() => {
                                    if (!!script) {
                                        setRemoteValue(MITM_HOTPATCH_CODE, script)
                                    }
                                    props.onSubmitScriptContent && props.onSubmitScriptContent(script)
                                }}
                            >
                                加载当前代码
                            </Button>
                        )}
                    </Space>
                </>
            }
        >
            {mode === "hot-patch" && (
                <>
                    {/* 用户热加载代码 */}
                    <YakCodeEditor
                        refreshTrigger={refreshTrigger}
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
                </>
            )}
            {mode === "all" && (
                <div className='mitm-http-list'>
                    <YakModuleList
                        queryLocal={{
                            Tag: tag,
                            Type: "mitm,port-scan",
                            Keyword: searchKeyword,
                            Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
                        }}
                        refresh={refresh}
                        itemHeight={43}
                        onClicked={(script) => {}}
                        setTotal={getAllSatisfyScript}
                        onYakScriptRender={(i: YakScript, maxWidth?: number) => {
                            return (
                                <MITMYakScriptLoader
                                    script={i}
                                    hooks={hooks}
                                    maxWidth={maxWidth}
                                    onSendToPatch={(code) => {
                                        setScript(code)
                                        setMode("hot-patch")
                                    }}
                                    onSubmitYakScriptId={props.onSubmitYakScriptId}
                                    onRemoveHook={(name: string) => {
                                        if (hooks.get(name)) {
                                            setCheckAll(false)
                                        }
                                    }}
                                />
                            )
                        }}
                    />
                </div>
            )}
            {mode === "loaded" && (
                <>
                    {hooks.size > 0 ? (
                        <>
                            <List pagination={false}>
                                {hooksItem.map((i) => {
                                    return (
                                        <>
                                            <MITMYakScriptLoader
                                                key={i.name}
                                                onSendToPatch={(code) => {
                                                    setScript(code)
                                                    setMode("hot-patch")
                                                }}
                                                script={{ScriptName: i.name} as YakScript}
                                                hooks={hooks}
                                                onSubmitYakScriptId={props.onSubmitYakScriptId}
                                            />
                                        </>
                                    )
                                })}
                            </List>
                        </>
                    ) : (
                        <>
                            <Empty description={"未启用 MITM 插件"} />
                        </>
                    )}
                </>
            )}
        </AutoCard>
    )
})
