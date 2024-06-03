import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin";
import styles from "@/pages/cve/CVETable.module.scss";
import fuzzerStyles from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig.module.scss";
import React, {useEffect, useRef, useState} from "react";
import {useCreation, useInViewport, useMemoizedFn} from "ahooks";
import {genDefaultPagination, PaginationSchema, QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema";
import {WebShellTable} from "@/pages/webShell/WebShellTable";
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch";
import {Divider, Form, Tooltip} from "antd";
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {HollowLightningBoltIcon, InformationCircleIcon, PlusSmIcon, SMViewGridAddIcon} from "@/assets/newIcon";
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber";
import {CustomCodecEditor, CustomCodecList} from "@/pages/webShell/CustomCodec";
import {CodecType} from "@/utils/encodec";
import {queryYakScriptList} from "@/pages/yakitStore/network";
import { YakitHint } from "@/components/yakitUI/YakitHint/YakitHint";
import { getRemoteValue, setRemoteValue } from "@/utils/kv";
import emiter from "@/utils/eventBus/eventBus";
import {YakitRoute} from "@/enums/yakitRoute";


export interface WebShellManagerViewerProp {
}

const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse


export const WebShellViewer: React.FC<WebShellManagerViewerProp> = (props) => {
    const [params, setParams] = useState<QueryWebShellRequest>(defQueryWebShellRequest)
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [loading, setLoading] = useState(false)
    const [available, setAvailable] = useState(false)
    // 第一次进入
    const [isFirstEnter, setFirstEnter] = useState<boolean>(false)
    const WebShellFirstViewer = "WebShellFirstViewer"
    useEffect(() => {
        onIsCVEDatabaseReady()
    }, [])
    const onIsCVEDatabaseReady = useMemoizedFn(() => {
        setLoading(true)
        setAvailable(true)
        setTimeout(() => setLoading(false), 200)
    })

    useEffect(() => {
        // 页面初次进入时
        getRemoteValue(WebShellFirstViewer).then((res) => {
            if (!res) {
                setFirstEnter(true)
            }
        })
    }, [])

    return loading ? (
        <YakitSpin spinning={true} style={{alignItems: "center", paddingTop: 150}}/>
    ) : (
        <div className={styles["cve-viewer"]}>
            {available && advancedQuery && (
                <WebShellQuery
                    onChange={setParams}
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={setAdvancedQuery}
                />
            )}
            <WebShellTable
                // filter={params}
                advancedQuery={advancedQuery}
                setAdvancedQuery={setAdvancedQuery}
                available={available}
            />
            <YakitHint
                visible={isFirstEnter}
                title='使用协议'
                content={<>
                <div>本工具是一款开源的跨平台网站管理工具，旨在为合法授权的安全研究人员、渗透测试专家以及网站管理员提供支持。它的设计目的是为了进行安全评估、教育目的以及帮助网站管理员进行日常管理工作。</div>
                <div>请用户在使用本工具时遵守所有适用的法律和道德准则。本工具不应用于任何未经授权的测试、非法入侵、数据盗窃或任何其他非法活动。用户使用本工具进行的任何行为都应当是合法、合规且具有正当授权的。</div>
                </>
                }
                onOk={() => {
                    setFirstEnter(false)
                    setRemoteValue(WebShellFirstViewer, JSON.stringify({enter: true}))
                }}
                onCancel={() => {
                    setFirstEnter(false)
                    emiter.emit("closePage", JSON.stringify({route: YakitRoute.Beta_WebShellManager}))
                }}
                okButtonText='同意'
                cancelButtonText='不同意'
            />
        </div>
    )
}

export interface QueryWebShellRequest {
    Pagination?: PaginationSchema
    Tag: string
}

export const defQueryWebShellRequest: QueryWebShellRequest = {
    Tag: ""
}

interface WebShellQueryProp {
    defaultParams?: QueryWebShellRequest
    onChange?: (req: QueryWebShellRequest) => any
    advancedQuery: boolean //是否开启高级查询
    setAdvancedQuery: (b: boolean) => void
}

const WebShellQuery: React.FC<WebShellQueryProp> = (props) => {
    const {advancedQuery, setAdvancedQuery} = props
    const [params, setParams] = useState<QueryWebShellRequest>(props.defaultParams || defQueryWebShellRequest)
    useEffect(() => {
        if (!props.onChange) {
            return
        }
        props.onChange(params)
    }, [params])

    const [activeKey, setActiveKey] = useState<string[]>() // Collapse打开的key
    const onSwitchCollapse = useMemoizedFn((key) => {
        setActiveKey(key)
    })
    const [title, setTitle] = useState<string>("")
    const [packetMode, setPacketMode] = useState<boolean>(false)
    const [resultMode, setResultMode] = useState<boolean>(false)

    const [packetCodecs, setPacketCodecs] = useState<YakScript[]>([])
    const [payloadCodecs, setPayloadCodecs] = useState<YakScript[]>([])

    const [addAction, setAddAction] = useState<boolean>(false)
    const [editAction, setEditAction] = useState<boolean>(false)
    const [visibleDrawer, setVisibleDrawer] = useState<boolean>(false)
    const queryRef = useRef(null)
    const [inViewport] = useInViewport(queryRef)
    useEffect(() => {
        if (!inViewport) setVisibleDrawer(false)
    }, [inViewport])

    const [currCodec, setCurrCodec] = useState<YakScript>({} as YakScript)

    const searchForCodecPacketCodecPlugin = useMemoizedFn(() => {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {

                if (!total || total == 0) {
                    return
                }
                setPacketCodecs(i)
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            ["webshell-packet-codec"],
        )
    })
    const [onchange, setOnchange] = useState<boolean>(false)
    const searchForCodecPayloadCodecPlugin = useMemoizedFn(() => {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                if (!total || total == 0) {
                    return
                }
                setPayloadCodecs(i)
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            ["webshell-payload-codec"],
        )
    })
    useEffect(() => {
        searchForCodecPacketCodecPlugin()
        searchForCodecPayloadCodecPlugin()
    }, [onchange])

    const onRemove = (index: number, type) => {
        const delId = type === "packetCodecs" ? packetCodecs[index].Id : payloadCodecs[index].Id
        ipcRenderer.invoke("DeleteYakScript", { Id: delId }).then(res => {
            if (type === "packetCodecs") {
                const newCodes = packetCodecs.filter(item => (item.Id !== delId))
                setPacketCodecs(newCodes)
            } else {
                const newCodes = payloadCodecs.filter(item => (item.Id !== delId))
                setPayloadCodecs(newCodes)
            }
        })
    }
    return (
        <>
            <div className={fuzzerStyles["http-query-advanced-config"]}>
                <div className={fuzzerStyles["advanced-config-heard"]}>
                    <span>高级设置</span>
                    <YakitSwitch wrapperClassName={fuzzerStyles["btn-padding-right-0"]} checked={advancedQuery}
                                 onChange={setAdvancedQuery}/>
                </div>
                <Form
                    colon={false}
                    size='small'
                    labelCol={{span: 10}}
                    wrapperCol={{span: 14}}
                    style={{overflowY: "auto"}}
                >
                    <YakitCollapse
                        activeKey={activeKey}
                        onChange={(key) => onSwitchCollapse(key)}
                        destroyInactivePanel={true}
                    >
                        <YakitPanel
                            header={
                                <div className={fuzzerStyles["matchers-panel"]}>
                                    数据包编解码器
                                    <div className={fuzzerStyles["matchers-number"]}>{packetCodecs?.length}</div>
                                </div>
                            }
                            key='数据包编解码器'
                            extra={
                                <>
                                    <Divider type='vertical' style={{margin: 0}}/>
                                    <YakitButton
                                        type='text'
                                        size='small'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setTitle("数据包编解码器")
                                            setEditAction(false)
                                            setResultMode(false)
                                            if (activeKey?.findIndex((ele) => ele === "数据包编解码器") === -1) {
                                                onSwitchCollapse([...activeKey, "数据包编解码器"])
                                            }
                                            setAddAction(true)
                                            setPacketMode(true)
                                            setVisibleDrawer(true)
                                            setCurrCodec({} as YakScript)
                                            // onAddMatchingAndExtractionCard("extractors")
                                        }}
                                        className={fuzzerStyles["btn-padding-right-0"]}
                                    >
                                        添加
                                        <SMViewGridAddIcon/>
                                    </YakitButton>
                                </>
                            }
                        >
                            <CustomCodecList
                                customCodecList={packetCodecs}
                                onRemove={(index) => onRemove(index, "packetCodecs")}
                                onEdit={(index) => {
                                    setResultMode(false)
                                    setAddAction(false)
                                    setTitle("数据包编解码器")
                                    setCurrCodec(packetCodecs[index])
                                    setVisibleDrawer(true)
                                    setPacketMode(true)
                                    setEditAction(true)
                                }}
                            />
                        </YakitPanel>

                        <YakitPanel
                            header={
                                <div className={fuzzerStyles["matchers-panel"]}>
                                    回显编解码器
                                    <div className={fuzzerStyles["matchers-number"]}>{payloadCodecs?.length}</div>
                                </div>
                            }
                            key='回显编解码器'
                            extra={
                                <>
                                    <Divider type='vertical' style={{margin: 0}}/>
                                    <YakitButton
                                        type='text'
                                        size='small'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setTitle("回显编解码器")
                                            setEditAction(false)
                                            setPacketMode(false)
                                            if (activeKey?.findIndex((ele) => ele === "回显编解码器") === -1) {
                                                onSwitchCollapse([...activeKey, "回显编解码器"])
                                            }
                                            setResultMode(true)
                                            setAddAction(true)
                                            setVisibleDrawer(true)
                                            setCurrCodec({} as YakScript)
                                        }}
                                        className={fuzzerStyles["btn-padding-right-0"]}
                                    >
                                        添加
                                        <SMViewGridAddIcon/>
                                    </YakitButton>
                                </>
                            }
                        >
                            <CustomCodecList
                                customCodecList={payloadCodecs}
                                onRemove={(index) => onRemove(index, "payloadCodecs")}
                                onEdit={(index) => {
                                    setPacketMode(false)
                                    setAddAction(false)
                                    setTitle("回显编解码器")
                                    setCurrCodec(payloadCodecs[index])
                                    setEditAction(true)
                                    setResultMode(true)
                                    setVisibleDrawer(true)
                                }}
                            />
                        </YakitPanel>
                    </YakitCollapse>

                </Form>
                <CustomCodecEditor
                    currCodec={currCodec}
                    setCurrCodec={setCurrCodec}
                    title={title}
                    addAction={addAction}
                    editAction={editAction}
                    packetMode={packetMode}
                    resultMode={resultMode}
                    onchange={onchange}
                    setOnchange={setOnchange}
                    visibleDrawer={visibleDrawer}
                    onClose={() => setVisibleDrawer(false)}
                />

            </div>
        </>
    )
}