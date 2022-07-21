import React, {useEffect, useState} from "react"
import {AutoCard} from "../../components/AutoCard"
import {Button, Empty, Form, List, Popconfirm, Space} from "antd"
import {SelectOne} from "../../utils/inputUtil"
import {PoweroffOutlined, ReloadOutlined} from "@ant-design/icons"
import {getValue, saveValue} from "../../utils/kv"
import {EditorProps, YakCodeEditor} from "../../utils/editors"
import {YakModuleList} from "../yakitStore/YakitStorePage"
import {YakScript, YakScriptHooks} from "../invoker/schema"
import {useMap, useMemoizedFn} from "ahooks"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {MITMPluginTemplateShort} from "../invoker/data/MITMPluginTamplate"
import {MITMYakScriptLoader} from "./MITMYakScriptLoader"
import {failed} from "../../utils/notification"
import {StringToUint8Array} from "../../utils/str"
import "./MITMPluginList.scss"

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

export const MITMPluginList: React.FC<MITMPluginListProp> = (props) => {
    const [initialed, setInitialed] = useState(false)
    const [script, setScript] = useState(MITMPluginTemplateShort)
    // const [userDefined, setUserDefined] = useState(false);
    const [hooks, handlers] = useMap<string, boolean>(new Map<string, boolean>())
    const [mode, setMode] = useState<"hot-patch" | "loaded" | "all">("all")
    const [refreshTrigger, setRefreshTrigger] = useState(false)
    const refresh = useMemoizedFn(() => {
        setRefreshTrigger(!refreshTrigger)
    })

    useEffect(() => {
        getValue(MITM_HOTPATCH_CODE).then((e) => {
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

    useEffect(() => {
        // 用于 MITM 的 查看当前 Hooks
        ipcRenderer.on("client-mitm-hooks", (e, data: YakScriptHooks[]) => {
            const tmp = new Map<string, boolean>()
            data.forEach((i) => {
                i.Hooks.map((hook) => {
                    tmp.set(hook.YakScriptName, true)
                })
            })
            handlers.setAll(tmp)
        })
        updateHooks()
        setTimeout(() => {
            setInitialed(true)
        }, 300)
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-hooks")
        }
    }, [])
    return (
        <AutoCard
            bordered={false}
            bodyStyle={{padding: 0, overflowY: "auto"}}
            loading={!initialed}
            title={
                <Space>
                    <Form size={"small"} onSubmitCapture={(e) => e.preventDefault()}>
                        <SelectOne
                            data={[
                                {text: "热加载", value: "hot-patch"},
                                {text: "已启用", value: "loaded"},
                                {text: "全部", value: "all"}
                            ]}
                            value={mode}
                            formItemStyle={{marginBottom: 0}}
                            setValue={setMode}
                        />
                    </Form>
                    {mode === "hot-patch" && (
                        <Popconfirm
                            title={"确认重置热加载代码？"}
                            onConfirm={() => {
                                setScript(MITMPluginTemplateShort)
                                refresh()
                            }}
                        >
                            <Button type={"link"} icon={<ReloadOutlined />} size={"small"} />
                        </Popconfirm>
                    )}
                </Space>
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
                                        saveValue(MITM_HOTPATCH_CODE, script)
                                    }
                                    props.onSubmitScriptContent && props.onSubmitScriptContent(script)
                                }}
                            >
                                加载当前代码
                            </Button>
                        )}
                        {/*: <Button*/}
                        {/*    size={"small"} type={"primary"}*/}
                        {/*    onClick={() => {*/}
                        {/*        enablePlugin()*/}
                        {/*    }}*/}
                        {/*>加载插件</Button>}*/}
                        <Button
                            danger={true}
                            size={"small"}
                            type={"primary"}
                            onClick={() => {
                                props.onExit && props.onExit()
                            }}
                            icon={<PoweroffOutlined />}
                        >
                            停止
                        </Button>
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
                        itemHeight={43}
                        onClicked={(script) => {}}
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
}
