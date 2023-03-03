import React, {Ref, useEffect, useRef, useState} from "react"
import {
    Alert,
    Button,
    Checkbox,
    Col,
    Divider,
    Dropdown,
    Empty,
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
import {MITMFilters, MITMFilterSchema} from "./MITMServerStartForm/MITMFilters"
import {showDrawer, showModal} from "../../utils/showModal"
import {MITMHTTPFlowMiniTableCard} from "./MITMHTTPFlowMiniTableCard"
import {ExecResult, YakScript} from "../invoker/schema"
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer"
import {ExtractExecResultMessage} from "../../components/yakitLogSchema"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import style from "./MITMPage.module.scss"
import {CopyableField, SelectOne} from "../../utils/inputUtil"
import {useCreation, useGetState, useHover, useInViewport, useLatest, useMap, useMemoizedFn} from "ahooks"
import {StatusCardProps} from "../yakitStore/viewers/base"
import {useHotkeys} from "react-hotkeys-hook"
import * as monaco from "monaco-editor"
import CopyToClipboard from "react-copy-to-clipboard"
import {AutoCard} from "../../components/AutoCard"
import {ResizeBox} from "../../components/ResizeBox"
import {MITMPluginLogViewer} from "./MITMPluginLogViewer"
import {MITMPluginList} from "./MITMPluginList"
import {saveABSFileToOpen} from "../../utils/openWebsite"
import {ClientCertificate, MITMServerStartForm} from "@/pages/mitm/MITMServerStartForm/MITMServerStartForm"
import {enableMITMPluginMode, MITMServerHijacking} from "@/pages/mitm/MITMServerHijacking/MITMServerHijacking"
import {Uint8ArrayToString} from "@/utils/str"
import {MITMRule} from "./MITMRule/MITMRule"
import ReactResizeDetector from "react-resize-detector"
import {MITMContentReplacerRule} from "./MITMRule/MITMRuleType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    ChevronDownIcon,
    ChevronUpIcon,
    CloudDownloadIcon,
    FolderOpenIcon,
    ImportIcon,
    PlusCircleIcon,
    RemoveIcon,
    SaveIcon,
    SearchIcon,
    TrashIcon
} from "@/assets/newIcon"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import classNames from "classnames"
import {getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    loadLocalYakitPluginCode,
    loadNucleiPoCFromLocal,
    loadYakitPluginCode,
    TagValue,
    YakModuleList
} from "../yakitStore/YakitStorePage"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {startExecYakCode} from "@/utils/basic"
import {DownloadOnlinePluginProps} from "../yakitStore/YakitPluginInfoOnline/YakitPluginInfoOnline"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {MITMYakScriptLoader} from "./MITMYakScriptLoader"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {queryYakScriptList} from "../yakitStore/network"
import {YakitCombinationSearch} from "@/components/YakitCombinationSearch/YakitCombinationSearch"
import {Test} from "@/components/baseTemplate/BaseTags"
import MITMHijackedContent, {MITMStatus} from "./MITMServerHijacking/MITMHijackedContent"
import {MITMPluginHijackContent} from "./MITMServerHijacking/MITMPluginHijackContent"
import {YakitSizeType} from "@/components/yakitUI/YakitInputNumber/YakitInputNumberType"
import {
    MITMPluginLocalList,
    PluginGroup,
    PluginSearch,
    YakFilterRemoteObj,
    YakModuleListHeard
} from "./MITMServerHijacking/MITMPluginLocalList"
import tag from "antd/lib/tag"

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
                    <MITMServer
                        onStartMITMServer={startMITMServerHandler}
                        setVisible={setVisible}
                        status={status}
                        setStatus={setStatus}
                    />
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

interface MITMServerProps {
    onStartMITMServer?: (
        host: string,
        port: number,
        downstreamProxy: string,
        enableInitialPlugin: boolean,
        defaultPlugins: string[],
        enableHttp2: boolean,
        clientCertificates: ClientCertificate[]
    ) => any
    setVisible?: (b: boolean) => void
    status: "idle" | "hijacked" | "hijacking"
    // 开启劫持后
    setStatus: (status: MITMStatus) => any
}
export const MITMServer: React.FC<MITMServerProps> = React.memo((props) => {
    const {setVisible, status, setStatus} = props
    /**
     * @description 插件勾选
     */
    const [checkList, setCheckList] = useState<string[]>([])
    const [enableInitialPlugin, setEnableInitialPlugin] = useState<boolean>(false)
    const [isFullScreenSecondNode, setIsFullScreenSecondNode] = useState<boolean>(false)
    const [isFullScreenFirstNode, setIsFullScreenFirstNode] = useState<boolean>(false)

    const [triggerSearch, setTriggerSearch] = useState<boolean>(false)
    const [isSelectAll, setIsSelectAll] = useState<boolean>(false)
    const [tags, setTags] = useState<string[]>([])
    const [searchKeyword, setSearchKeyword] = useState<string>("")

    const [total, setTotal] = useState<number>(0)
    /**
     * 选中的插件组
     */
    const [selectGroup, setSelectGroup] = useState<YakFilterRemoteObj[]>([])

    const [listNames, setListNames] = useState<string[]>([]) // 存储的全部本地插件

    const onSubmitYakScriptId = useMemoizedFn((id: number, params: YakExecutorParam[]) => {
        info(`加载 MITM 插件[${id}]`)
        ipcRenderer.invoke("mitm-exec-script-by-id", id, params)
    })
    const onStartMITMServer = useMemoizedFn(
        (host, port, downstreamProxy, enableInitialPlugin, enableHttp2, certs: ClientCertificate[]) => {
            if (props.onStartMITMServer)
                props.onStartMITMServer(
                    host,
                    port,
                    downstreamProxy,
                    enableInitialPlugin,
                    enableInitialPlugin ? checkList : [],
                    enableHttp2,
                    certs
                )
        }
    )
    /**
     * @description 插件全选 启动  批量执行最多200条
     */
    const onSelectAll = useMemoizedFn((e) => {
        const {checked} = e.target
        switch (status) {
            case "idle":
                onSelectAllIdle(checked)
                break
            case "hijacked":
                break
            case "hijacking":
                onSelectAllHijacking(checked)
                break
            default:
                break
        }
    })
    /**
     * @description 劫持开启前的全选
     */
    const onSelectAllIdle = useMemoizedFn((checked: boolean) => {
        if (checked) {
            setCheckList(listNames)
        } else {
            setCheckList([])
        }
        setIsSelectAll(checked)
    })
    /**
     * @description 劫持开启后的全选 启动插件
     */
    const onSelectAllHijacking = useMemoizedFn((checked: boolean) => {
        if (checked) {
            enableMITMPluginMode(listNames).then(() => {
                setIsSelectAll(checked)
                info("启动 MITM 插件成功")
            })
        } else {
            ipcRenderer
                .invoke("mitm-remove-hook", {
                    HookName: [],
                    RemoveHookID: listNames
                } as any)
                .then(() => {
                    setIsSelectAll(checked)
                })
        }
    })

    const getAllSatisfyScript = useMemoizedFn((limit: number) => {
        queryYakScriptList(
            "mitm,port-scan",
            (data, t) => {
                setListNames(data.map((i) => i.ScriptName))
            },
            undefined,
            limit || 200,
            undefined,
            searchKeyword,
            {
                Tag: tags,
                Type: "mitm,port-scan",
                Keyword: "",
                Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
            }
        )
    })
    const onRenderFirstNode = useMemoizedFn(() => {
        switch (status) {
            case "idle":
                return (
                    <>
                        <PluginGroup
                            checkList={checkList}
                            selectGroup={selectGroup}
                            setSelectGroup={setSelectGroup}
                            isSelectAll={isSelectAll}
                        />
                        <PluginSearch
                            tag={tags}
                            searchKeyword={searchKeyword}
                            setTag={setTags}
                            setSearchKeyword={setSearchKeyword}
                            onSearch={() => {
                                setTriggerSearch(!triggerSearch)
                            }}
                        />
                        <YakModuleListHeard
                            onSelectAll={onSelectAll}
                            isSelectAll={isSelectAll}
                            total={total}
                            length={checkList.length}
                        />
                        <MITMPluginLocalList
                            height='calc(100% - 100px)'
                            onSubmitYakScriptId={onSubmitYakScriptId}
                            status={status}
                            checkList={checkList}
                            setCheckList={(list) => {
                                if (list.length === 0) {
                                    setEnableInitialPlugin(false)
                                } else {
                                    setEnableInitialPlugin(true)
                                }
                                setCheckList(list)
                            }}
                            tags={tags}
                            setTags={setTags}
                            searchKeyword={searchKeyword}
                            triggerSearch={triggerSearch}
                            selectGroup={selectGroup}
                            setSelectGroup={setSelectGroup}
                            setIsSelectAll={setIsSelectAll}
                            isSelectAll={isSelectAll}
                            setTotal={(t) => {
                                setTotal(t)
                                getAllSatisfyScript(t)
                            }}
                        />
                    </>
                )

            default:
                return (
                    <MITMPluginHijackContent
                        onSubmitYakScriptId={onSubmitYakScriptId}
                        status={status}
                        checkList={checkList}
                        setCheckList={(list) => {
                            if (list.length === 0) {
                                setEnableInitialPlugin(false)
                            } else {
                                setEnableInitialPlugin(true)
                            }
                            setCheckList(list)
                        }}
                        isFullScreen={isFullScreenFirstNode}
                        setIsFullScreen={setIsFullScreenFirstNode}
                        onSelectAll={onSelectAll}
                    />
                )
        }
    })
    const onRenderSecondNode = useMemoizedFn(() => {
        switch (status) {
            case "idle":
                return (
                    <MITMServerStartForm
                        onStartMITMServer={onStartMITMServer}
                        setVisible={(v) => {
                            if (setVisible) setVisible(v)
                        }}
                        enableInitialPlugin={enableInitialPlugin}
                        setEnableInitialPlugin={(checked) => {
                            if (!checked) {
                                setCheckList([])
                            }
                            setEnableInitialPlugin(checked)
                        }}
                    />
                )
            default:
                return (
                    <MITMHijackedContent
                        setStatus={setStatus}
                        status={status}
                        isFullScreen={isFullScreenSecondNode}
                        setIsFullScreen={setIsFullScreenSecondNode}
                    />
                )
        }
    })
    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "410px",
            secondRatio: "50%"
        }
        if (isFullScreenSecondNode) {
            p.firstRatio = "0%"
        }
        if (isFullScreenFirstNode) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [isFullScreenSecondNode, isFullScreenFirstNode])
    return (
        <ResizeBox
            firstNode={() => (
                <div
                    className={style["mitm-server-start-pre-first"]}
                    style={{display: isFullScreenSecondNode ? "none" : ""}}
                >
                    {onRenderFirstNode()}
                    <div className={style["mitm-server-start-pre-line"]} />
                </div>
            )}
            lineStyle={{display: isFullScreenSecondNode || isFullScreenFirstNode ? "none" : ""}}
            firstMinSize={410}
            secondMinSize={600}
            secondNode={() => (
                <div
                    className={style["mitm-server-start-pre-second"]}
                    style={{display: isFullScreenFirstNode ? "none" : ""}}
                >
                    {onRenderSecondNode()}
                </div>
            )}
            {...ResizeBoxProps}
        />
    )
})

interface ImportLocalPluginProps {
    visible: boolean
    setVisible: (b: boolean) => void
}

const YAKIT_DEFAULT_LOAD_GIT_PROXY = "YAKIT_DEFAULT_LOAD_GIT_PROXY"
const YAKIT_DEFAULT_LOAD_LOCAL_PATH = "YAKIT_DEFAULT_LOAD_LOCAL_PATH"
const YAKIT_DEFAULT_LOAD_LOCAL_NUCLEI_POC_PATH = "YAKIT_DEFAULT_LOAD_LOCAL_NUCLEI_POC_PATH"
export const ImportLocalPlugin: React.FC<ImportLocalPluginProps> = React.memo((props) => {
    const {visible, setVisible} = props
    const [form] = Form.useForm()
    const [loadMode, setLoadMode] = useState<"giturl" | "local" | "local-nuclei" | "uploadId">("giturl")
    const [localPath, setLocalPath] = useState<string>("") // local
    const [localNucleiPath, setLocalNucleiPath] = useState<string>("") // localNucleiPath
    useEffect(() => {
        if (visible) {
            form.resetFields()
            setLoadMode("giturl")
            setLocalPath("")
            setLocalNucleiPath("")
        }
    }, [visible])
    const getRenderByLoadMode = useMemoizedFn((type: string) => {
        switch (type) {
            case "giturl":
                return (
                    <>
                        <Form.Item
                            name='nucleiGitUrl'
                            label='Yaml PoC URL'
                            rules={[{required: true, message: "该项为必填项"}]}
                            help='无代理设置推荐使用 ghproxy.com / gitee 镜像源'
                            initialValue='https://github.com/projectdiscovery/nuclei-templates'
                        >
                            <YakitInput />
                        </Form.Item>
                        <Form.Item name='proxy' label='代理' help='通过代理访问中国大陆无法访问的代码仓库'>
                            <YakitInput />
                        </Form.Item>
                    </>
                )
            case "local":
                return (
                    <>
                        <YakitFormDragger
                            key='localPath'
                            formItemProps={{
                                name: "localPath",
                                label: "本地仓库地址"
                            }}
                            InputProps={{
                                placeholder: "本地仓库地址需设置在yak-projects项目文件下"
                            }}
                            selectType='folder'
                            showUploadList={false}
                            setFileName={(val) => {
                                setLocalPath(val)
                                form.setFieldsValue({localPath: val})
                            }}
                            fileName={localPath}
                        />
                    </>
                )
            case "local-nuclei":
                return (
                    <>
                        <YakitFormDragger
                            key='localNucleiPath'
                            formItemProps={{
                                name: "localNucleiPath",
                                label: "Nuclei PoC 本地路径"
                            }}
                            selectType='folder'
                            showUploadList={false}
                            setFileName={(val) => {
                                setLocalNucleiPath(val)
                                form.setFieldsValue({localNucleiPath: val})
                            }}
                            fileName={localNucleiPath}
                        />
                    </>
                )
            case "uploadId":
                return (
                    <>
                        <Form.Item name='localId' label='插件ID'>
                            <YakitInput />
                        </Form.Item>
                    </>
                )
            default:
                break
        }
    })
    const onOk = useMemoizedFn(() => {
        const formValue = form.getFieldsValue()
        if (formValue.proxy) {
            setLocalValue(YAKIT_DEFAULT_LOAD_GIT_PROXY, formValue.proxy)
        }

        if (formValue.localPath) {
            setLocalValue(YAKIT_DEFAULT_LOAD_LOCAL_PATH, formValue.localPath)
        }

        if (formValue.localNucleiPath) {
            setLocalValue(YAKIT_DEFAULT_LOAD_LOCAL_NUCLEI_POC_PATH, formValue.localNucleiPath)
        }
        if (["official", "giturl"].includes(loadMode)) {
            const params: YakExecutorParam[] = [
                {Key: "giturl", Value: ""},
                {Key: "nuclei-templates-giturl", Value: formValue.nucleiGitUrl}
            ]
            if (formValue.proxy?.trim() !== "") {
                params.push({Value: formValue.proxy?.trim(), Key: "proxy"})
            }
            startExecYakCode("导入 Yak 插件", {
                Script: loadYakitPluginCode,
                Params: params
            })
        }
        if (loadMode === "local") {
            if (!formValue.localPath) {
                failed(`请输入本地路径`)
                return
            }
            startExecYakCode("导入 Yak 插件（本地）", {
                Script: loadLocalYakitPluginCode,
                Params: [{Key: "local-path", Value: formValue.localPath}]
            })
        }

        if (loadMode === "local-nuclei") {
            if (!formValue.localNucleiPath) {
                failed(`请输入Nuclei PoC 本地路径`)
                return
            }
            startExecYakCode("从 Nuclei Template Git 本地仓库更新", {
                Script: loadNucleiPoCFromLocal,
                Params: [{Key: "local-path", Value: formValue.localNucleiPath}]
            })
        }

        if (loadMode === "uploadId") {
            ipcRenderer
                .invoke("DownloadOnlinePluginById", {
                    UUID: formValue.localId
                } as DownloadOnlinePluginProps)
                .then(() => {
                    setVisible(false)
                    success("插件导入成功")
                })
                .catch((e: any) => {
                    failed(`插件导入失败: ${e}`)
                })
        }
    })
    return (
        <YakitModal
            visible={visible}
            onCancel={() => setVisible(false)}
            onOk={() => onOk()}
            width={680}
            closable={true}
            title='导入插件方式'
            className={style["import-local-plugin-modal"]}
            subTitle={
                <YakitRadioButtons
                    wrapClassName={style["import-local-plugin-subTitle"]}
                    buttonStyle='solid'
                    value={loadMode}
                    onChange={(e) => {
                        setLoadMode(e.target.value)
                    }}
                    options={[
                        {
                            label: "第三方仓库源",
                            value: "giturl"
                        },
                        {
                            label: "本地仓库",
                            value: "local"
                        },
                        {
                            label: "本地 Yaml PoC",
                            value: "local-nuclei"
                        },
                        {
                            label: "使用ID",
                            value: "uploadId"
                        }
                    ]}
                ></YakitRadioButtons>
            }
        >
            <Form
                form={form}
                labelCol={{span: 5}}
                wrapperCol={{span: 16}}
                className={style["import-local-plugin-form"]}
            >
                {getRenderByLoadMode(loadMode)}
            </Form>
        </YakitModal>
    )
})

interface AddPluginGroupProps {
    pugGroup: YakFilterRemoteObj[]
    visible: boolean
    setVisible: (b: boolean) => void
    onOk: (v: YakFilterRemoteObj) => void
    checkList: string[]
}

export const AddPluginGroup: React.FC<AddPluginGroupProps> = React.memo((props) => {
    const {pugGroup, visible, setVisible, checkList, onOk} = props
    const [name, setName] = useState<string>("")
    useEffect(() => {
        setName("")
    }, [visible])
    return (
        <YakitModal visible={visible} onCancel={() => setVisible(false)} footer={null} closable={false}>
            <div className={style["plugin-group-modal"]}>
                <div className={style["plugin-group-heard"]}>
                    <div className={style["plugin-group-title"]}>添加至插件组</div>
                    <div className={style["close-icon"]} onClick={() => setVisible(false)}>
                        <RemoveIcon />
                    </div>
                </div>
                <div className={style["plugin-group-input"]}>
                    <YakitAutoComplete
                        placeholder='请输入插件组名'
                        defaultActiveFirstOption={false}
                        value={name}
                        onChange={(value) => setName(value)}
                        options={pugGroup.map((ele) => ({value: ele.name, label: ele.name}))}
                        filterOption={(inputValue, option) => {
                            if (option?.value && typeof option?.value === "string") {
                                return option?.value?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                            return false
                        }}
                        onSelect={(val) => setName(val)}
                    />
                </div>

                <div className={style["plugin-group-tip"]}>
                    共选择了<span>{checkList.length}</span>个插件
                </div>
                <div className={style["plugin-buttons"]}>
                    <YakitButton
                        type='outline2'
                        size='large'
                        className={style["plugin-btn"]}
                        onClick={() => setVisible(false)}
                    >
                        取消
                    </YakitButton>
                    <YakitButton
                        type='primary'
                        size='large'
                        onClick={() =>
                            onOk({
                                name,
                                value: checkList
                            })
                        }
                    >
                        确定
                    </YakitButton>
                </div>
            </div>
        </YakitModal>
    )
})
