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


export interface WebShellManagerViewerProp {
}

const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse


export const WebShellViewer: React.FC<WebShellManagerViewerProp> = (props) => {
    const [params, setParams] = useState<QueryWebShellRequest>(defQueryWebShellRequest)
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [loading, setLoading] = useState(false)
    const [available, setAvailable] = useState(false)
    useEffect(() => {
        onIsCVEDatabaseReady()
    }, [])
    const onIsCVEDatabaseReady = useMemoizedFn(() => {
        setLoading(true)
        setAvailable(true)
        setTimeout(() => setLoading(false), 200)
    })
    console.log(loading, available, advancedQuery)
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
        console.log("onSwitchCollapse ", key)
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
                console.log("searchForCodecPacketCodecPlugin", i)

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
                console.log("searchForCodecPayloadCodecPlugin", i)
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
                        type='grey'
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
                                onRemove={() => {
                                    console.log(2222)
                                }}
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
                                onRemove={() => {
                                    console.log(2222)
                                }}
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
                        <YakitPanel
                            header='WebShell 生成'
                            key='WebShell 生成'
                            extra={
                                <YakitButton
                                    type='text'
                                    colors="danger"
                                    className={fuzzerStyles["btn-padding-right-0"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const restValue = {
                                            forceFuzz: true,
                                            isHttps: false,
                                            noFixContentLength: false,
                                            actualHost: "",
                                            timeout: 30
                                        }
                                        // onReset(restValue)
                                    }}
                                    size='small'
                                >
                                    重置
                                </YakitButton>
                            }
                        >
                            <Form.Item label='Fuzztag 辅助'>
                                <YakitButton
                                    size='small'
                                    type='outline1'
                                    onClick={() => {
                                        console.log("on")
                                    }}
                                    icon={<PlusSmIcon/>}
                                >
                                    插入 yak.fuzz 语法
                                </YakitButton>
                            </Form.Item>
                            <Form.Item
                                label={
                                    <span className={fuzzerStyles["advanced-config-form-label"]}>
                                    渲染 Fuzz
                                    <Tooltip title='关闭之后，所有的 Fuzz 标签将会失效' overlayStyle={{width: 150}}>
                                        <InformationCircleIcon className={fuzzerStyles["info-icon"]}/>
                                    </Tooltip>
                                </span>
                                }
                                name='forceFuzz'
                                valuePropName='checked'
                            >
                                <YakitSwitch/>
                            </Form.Item>

                            <Form.Item label='不修复长度' name='noFixContentLength' valuePropName='checked'>
                                <YakitSwitch/>
                            </Form.Item>

                            <Form.Item label='超时时长' name='timeout'>
                                <YakitInputNumber type='horizontal' size='small'/>
                            </Form.Item>
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