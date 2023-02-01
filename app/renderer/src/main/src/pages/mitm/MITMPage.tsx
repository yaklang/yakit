import React, {Ref, useEffect, useRef, useState} from "react"
import {
    Alert,
    Button,
    Checkbox,
    Col,
    Dropdown,
    Form,
    Input,
    Modal,
    notification,
    PageHeader,
    Row,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography
} from "antd"
import {failed, info, success} from "../../utils/notification"
import {CheckOutlined, CopyOutlined, PoweroffOutlined, ReloadOutlined} from "@ant-design/icons"
import {HTTPPacketEditor, YakEditor} from "../../utils/editors"
import {MITMFilters, MITMFilterSchema} from "./MITMFilters"
import {showDrawer, showModal} from "../../utils/showModal"
import {MITMHTTPFlowMiniTableCard} from "./MITMHTTPFlowMiniTableCard"
import {ExecResult, YakScript} from "../invoker/schema"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {ExtractExecResultMessage} from "../../components/yakitLogSchema"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import style from "./MITMPage.module.scss"
import {CopyableField, SelectOne} from "../../utils/inputUtil"
import {useGetState, useHover, useInViewport, useLatest, useMemoizedFn} from "ahooks"
import {StatusCardProps} from "../yakitStore/viewers/base"
import {useHotkeys} from "react-hotkeys-hook"
import * as monaco from "monaco-editor"
import CopyToClipboard from "react-copy-to-clipboard"
import {AutoCard} from "../../components/AutoCard"
import {ResizeBox} from "../../components/ResizeBox"
import {MITMPluginLogViewer} from "./MITMPluginLogViewer"
import {MITMPluginList} from "./MITMPluginList"
import {saveABSFileToOpen} from "../../utils/openWebsite"
import {ChromeLauncherButton} from "./MITMChromeLauncher"
import {ClientCertificate, MITMServerStartForm} from "@/pages/mitm/MITMServerStartForm"
import {MITMServerHijacking} from "@/pages/mitm/MITMServerHijacking"
import {Uint8ArrayToString} from "@/utils/str"
import {MITMRule} from "./MITMRule/MITMRule"
import ReactResizeDetector from "react-resize-detector"
import {MITMContentReplacerRule} from "./MITMRule/MITMRuleType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {ChevronDownIcon, ChevronUpIcon, FolderOpenIcon, PlusCircleIcon} from "@/assets/newIcon"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import classNames from "classnames"
import {getRemoteValue} from "@/utils/kv"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakModuleList} from "../yakitStore/YakitStorePage"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"

const {Text} = Typography
const {Item} = Form
const {ipcRenderer} = window.require("electron")

export interface MITMPageProp {}

export interface MITMResponse extends MITMFilterSchema {
    isHttps: boolean
    request: Uint8Array
    url: string
    RemoteAddr?: string
    id: number

    forResponse?: boolean
    response?: Uint8Array
    responseId?: number

    justContentReplacer?: boolean
    replacers?: MITMContentReplacerRule[]

    isWebsocket?: boolean
}

export const CONST_DEFAULT_ENABLE_INITIAL_PLUGIN = "CONST_DEFAULT_ENABLE_INITIAL_PLUGIN"

export const MITMPage: React.FC<MITMPageProp> = (props) => {
    // 整体的劫持状态
    const [status, setStatus] = useState<"idle" | "hijacked" | "hijacking">("idle")

    const [loading, setLoading] = useState(false)

    // 通过启动表单的内容
    const [addr, setAddr] = useState("")
    const [host, setHost] = useState("127.0.0.1")
    const [port, setPort] = useState(8083)
    const [enableInitialMITMPlugin, setEnableInitialMITMPlugin] = useState(false)
    const [defaultPlugins, setDefaultPlugins] = useState<string[]>([])

    // 检测当前劫持状态
    useEffect(() => {
        // 用于启动 MITM 开始之后，接受开始成功之后的第一个消息，如果收到，则认为说 MITM 启动成功了
        ipcRenderer.on("client-mitm-start-success", () => {
            setStatus("hijacking")
            setTimeout(() => {
                setLoading(false)
            }, 300)
        })

        // 加载状态(从服务端加载)
        ipcRenderer.on("client-mitm-loading", (_, flag: boolean) => {
            setLoading(flag)
        })

        ipcRenderer.on("client-mitm-notification", (_, i: Uint8Array) => {
            try {
                info(Uint8ArrayToString(i))
            } catch (e) {}
        })

        return () => {
            ipcRenderer.removeAllListeners("client-mitm-start-success")
            ipcRenderer.removeAllListeners("client-mitm-loading")
            ipcRenderer.removeAllListeners("client-mitm-notification")
        }
    }, [])

    // 通过 gRPC 调用，启动 MITM 劫持
    const startMITMServer = useMemoizedFn(
        (targetHost, targetPort, downstreamProxy, enableHttp2, certs: ClientCertificate[]) => {
            setLoading(true)
            return ipcRenderer
                .invoke("mitm-start-call", targetHost, targetPort, downstreamProxy, enableHttp2, certs)
                .catch((e: any) => {
                    notification["error"]({message: `启动中间人劫持失败：${e}`})
                })
        }
    )

    // 设置开始服务器处理函数
    const startMITMServerHandler = useMemoizedFn(
        (host, port, downstreamProxy, enableInitialPlugin, plugins, enableHttp2, certs: ClientCertificate[]) => {
            setAddr(`https://${host}:${port}`)
            setHost(host)
            setPort(port)
            setLoading(true)
            setDefaultPlugins(plugins)
            setEnableInitialMITMPlugin(enableInitialPlugin)
            startMITMServer(host, port, downstreamProxy, enableHttp2, certs)
        }
    )

    // 开始渲染组件
    // if (!initialed) {
    //     return <div style={{textAlign: "center", paddingTop: 120}}>
    //         <Spin spinning={true} tip={"正在初始化 MITM"}/>
    //     </div>
    // }

    // 在没有开始的时候，渲染任务表单
    // if (status === "idle") {
    //     return <MITMServerStartForm onStartMITMServer={startMITMServerHandler} />
    // }
    const [visible, setVisible] = useState<boolean>(false)
    const [top, setTop] = useState<number>(0)
    const [height, setHeight] = useState<number>(0)
    const mitmPageRef = useRef<any>()
    const [inViewport] = useInViewport(mitmPageRef)
    useEffect(() => {
        if (!mitmPageRef.current) return
        const client = mitmPageRef.current.getBoundingClientRect()
        setTop(client.top)
    }, [height])
    return (
        <>
            <div className={style["mitm-page"]} ref={mitmPageRef}>
                <ReactResizeDetector
                    onResize={(w, h) => {
                        if (!w || !h) {
                            return
                        }
                        setHeight(h)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />

                {/* status === "idle" 在没有开始的时候，渲染任务表单 */}
                {(status === "idle" && (
                    // <YakitInput.Search size="large"/>
                    <MITMServerStartPre onStartMITMServer={startMITMServerHandler} setVisible={setVisible} />
                )) || (
                    <MITMServerHijacking
                        port={port}
                        addr={addr}
                        host={host}
                        status={status}
                        setStatus={setStatus}
                        defaultPlugins={defaultPlugins}
                        enableInitialMITMPlugin={enableInitialMITMPlugin}
                        setVisible={setVisible}
                    />
                )}
            </div>
            <MITMRule status={status} visible={visible && !!inViewport} setVisible={setVisible} top={top} />
        </>
    )
}

interface MITMServerStartPreProps {
    onStartMITMServer: (
        host: string,
        port: number,
        downstreamProxy: string,
        enableInitialPlugin: boolean,
        defaultPlugins: string[],
        enableHttp2: boolean,
        clientCertificates: ClientCertificate[]
    ) => any
    setVisible: (b: boolean) => void
}
const MITMServerStartPre: React.FC<MITMServerStartPreProps> = React.memo((props) => {
    const {onStartMITMServer, setVisible} = props
    return (
        <ResizeBox
            firstNode={() => (
                <div className={style["mitm-server-start-pre-first"]}>
                    <MITMPluginLocalList />
                    <div className={style["mitm-server-start-pre-line"]} />
                </div>
            )}
            firstRatio='20%'
            firstMinSize={250}
            secondMinSize={600}
            secondNode={() => <MITMServerStartForm onStartMITMServer={onStartMITMServer} setVisible={setVisible} />}
        />
    )
})

interface MITMPluginLocalListProps {}
export interface YakFilterRemoteObj {
    name: string
    value: string[]
}
const FILTER_CACHE_LIST_DATA = `FILTER_CACHE_LIST_COMMON_DATA`
const MITMPluginLocalList: React.FC<MITMPluginLocalListProps> = React.memo((props) => {
    const [searchType, setSearchType] = useState<"userName" | "keyword">("keyword")

    const [visible, setVisible] = useState<boolean>(false)
    const [addGroupVisible, setAddGroupVisible] = useState<boolean>(false)

    const [pugGroup, setPlugGroup] = useState<YakFilterRemoteObj[]>([])
    const [checkList, setCheckList] = useState<string[]>([])

    const [tag, setTag] = useState<string[]>([])
    const [searchKeyword, setSearchKeyword] = useState<string>("")
    const [refresh, setRefresh] = useState<boolean>(true)
    const [total, setTotal] = useState<number>(0)

    useEffect(() => {
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
    return (
        <div className={style["mitm-plugin-local"]}>
            <YakitInput.Search />
            {/* <Input.Group compact>
                <YakitSelect value={searchType} onSelect={setSearchType} size='small' wrapperStyle={{width: 73}}>
                    <YakitSelect.Option value='keyword'>关键字</YakitSelect.Option>
                    <YakitSelect.Option value='userName'>tag</YakitSelect.Option>
                </YakitSelect>
                <YakitInput.Search />
            </Input.Group> */}
            <div className={style["mitm-plugin-group"]}>
                <Dropdown overlay={<div>4</div>} onVisibleChange={setVisible}>
                    <div
                        className={classNames(style["mitm-plugin-group-left"], {
                            [style["mitm-plugin-group-left-open"]]: visible
                        })}
                    >
                        <FolderOpenIcon />
                        <span>插件组</span>
                        <div className={style["mitm-plugin-group-number"]}>0</div>
                        {(visible && <ChevronUpIcon className={style["chevron-down"]} />) || (
                            <ChevronDownIcon className={style["chevron-down"]} />
                        )}
                    </div>
                </Dropdown>
                <YakitButton
                    type='text'
                    onClick={() => {
                        // if (checkList.length === 0) {
                        //     info("选中数据未获取")
                        //     return
                        // }
                        setAddGroupVisible(true)
                    }}
                >
                    添加至组
                    <PlusCircleIcon className={style["plus-circle"]} />
                </YakitButton>
            </div>
            {/* <YakModuleList
                queryLocal={{
                    Tag: tag,
                    Type: "mitm,port-scan",
                    Keyword: searchKeyword,
                    Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
                }}
                refresh={refresh}
                itemHeight={43}
                onClicked={(script) => {}}
                setTotal={setTotal}
                onYakScriptRender={(i: YakScript, maxWidth?: number) => {
                    return (
                        <div>{i.ScriptName}</div>
                        // <MITMYakScriptLoader
                        //     script={i}
                        //     hooks={hooks}
                        //     maxWidth={maxWidth}
                        //     onSendToPatch={(code) => {
                        //         setScript(code)
                        //         setMode("hot-patch")
                        //     }}
                        //     onSubmitYakScriptId={props.onSubmitYakScriptId}
                        //     onRemoveHook={(name: string) => {
                        //         if (hooks.get(name)) {
                        //             setCheckAll(false)
                        //         }
                        //     }}
                        // />
                    )
                }}
            /> */}
            <YakitModal title='添加至插件组' visible={addGroupVisible} onCancel={() => setAddGroupVisible(false)}>
                <YakitInput placeholder='请输入插件组名'></YakitInput>
                <div>
                    共选择了 <span>2</span> 个插件
                </div>
            </YakitModal>
        </div>
    )
})
