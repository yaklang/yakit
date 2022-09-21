import React, {memo, useEffect, useRef, useState} from "react"
import {AutoCard} from "../../components/AutoCard"
import {Button, Checkbox, Empty, Form, Input, List, Popconfirm, Select, Space, Tag} from "antd"
import {SelectOne} from "../../utils/inputUtil"
import {PoweroffOutlined, ReloadOutlined, SearchOutlined} from "@ant-design/icons"
import {getRemoteValue, getValue, saveValue, setRemoteValue} from "../../utils/kv"
import {EditorProps, YakCodeEditor} from "../../utils/editors"
import {YakModuleList} from "../yakitStore/YakitStorePage"
import {genDefaultPagination, YakScript, YakScriptHooks} from "../invoker/schema"
import {useDebounceFn, useMap, useMemoizedFn} from "ahooks"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {MITMPluginTemplateShort} from "../invoker/data/MITMPluginTamplate"
import {clearMITMPluginCache, MITMYakScriptLoader} from "./MITMYakScriptLoader"
import {failed, info} from "../../utils/notification"
import {StringToUint8Array} from "../../utils/str"
import "./MITMPluginList.scss"
import {CheckboxChangeEvent} from "antd/lib/checkbox"
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

        // 用于 MITM 的 查看当前 Hooks
        ipcRenderer.on("client-mitm-hooks", (e, data: YakScriptHooks[]) => {
            const tmp = new Map<string, boolean>()
            data.forEach((i) => {
                i.Hooks.map((hook) => {
                    tmp.set(hook.YakScriptName, true)
                })
            })
            // console.log("tmp", tmp)
            handlers.setAll(tmp)
        })
        updateHooks()
        setTimeout(() => {
            setInitialed(true)
        }, 500)
        return () => {
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
    const onCheckAllChange = (e: CheckboxChangeEvent) => {
        const {checked} = e.target
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
        console.log("limit", limit)

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
                                <Checkbox onChange={onCheckAllChange} checked={checkAll}>
                                    全选
                                </Checkbox>
                            )}
                        </div>
                    </div>
                    <div className='mitm-card-search'>
                        {mode === "all" && (
                            <Input.Group compact>
                                <Select style={{width: "27%"}} value={searchType} size='small' onSelect={setSearchType}>
                                    <Select.Option value='Tags'>Tag</Select.Option>
                                    <Select.Option value='Keyword'>关键字</Select.Option>
                                </Select>
                                {(searchType === "Tags" && (
                                    <Select
                                        mode='tags'
                                        size='small'
                                        onChange={(e) => setTag(e as string[])}
                                        style={{width: "73%"}}
                                        loading={tagsLoading}
                                        onBlur={() => {
                                            setRefresh(!refresh)
                                        }}
                                        onDeselect={onDeselect}
                                        maxTagCount='responsive'
                                        value={tag}
                                    >
                                        {tagsList.map((item) => (
                                            <Select.Option value={item.Value}>
                                                <div className='mitm-card-select-option'>
                                                    <span>{item.Value}</span>
                                                    <span>{item.Total}</span>
                                                </div>
                                            </Select.Option>
                                        ))}
                                    </Select>
                                )) || (
                                    <Input.Search
                                        onSearch={() => {
                                            setRefresh(!refresh)
                                        }}
                                        onChange={(e) => setSearchKeyword(e.target.value)}
                                        size='small'
                                        style={{width: "73%"}}
                                    />
                                )}
                            </Input.Group>
                        )}
                        <div className={`${tag.length > 0 && "mitm-card-tag"}`}>
                            {tag.map((i) => {
                                return (
                                    <Tag
                                        key={i}
                                        style={{marginBottom: 2}}
                                        color={"blue"}
                                        onClose={() => {
                                            setTag(tag.filter((element) => i !== element))
                                        }}
                                        closable={true}
                                    >
                                        {i}
                                    </Tag>
                                )
                            })}
                        </div>
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
