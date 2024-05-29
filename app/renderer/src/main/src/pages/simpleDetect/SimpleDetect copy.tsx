/**
 * @deprecated 已废弃
 * TODO 简易版安全检测做完未完成任务的功能后，删除
 */
import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    Space,
    Progress,
    Divider,
    Form,
    Input,
    Button,
    Spin,
    Radio,
    Popconfirm,
    Tabs,
    Checkbox,
    Modal,
    Row,
    Col,
    Slider,
    Timeline
} from "antd"
import {AutoCard} from "@/components/AutoCard"
import {DeleteOutlined, PaperClipOutlined} from "@ant-design/icons"
import styles from "./SimpleDetect.module.scss"
import {ContentUploadInput} from "@/components/functionTemplate/ContentUploadTextArea"
import {failed, info, success, warn} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {
    showUnfinishedSimpleDetectTaskList,
    UnfinishedSimpleDetectBatchTask
} from "../invoker/batch/UnfinishedBatchTaskList"
import {useGetState, useMemoizedFn, useDebounceEffect, useInViewport} from "ahooks"
import type {SliderMarks} from "antd/es/slider"
import {showDrawer} from "../../utils/showModal"
import {ScanPortForm, PortScanParams} from "../portscan/PortScanPage"
import {ExecResult, GroupCount, YakScript} from "../invoker/schema"
import {useStore} from "@/store"
import {DownloadOnlinePluginAllResProps} from "@/pages/yakitStore/YakitStorePage"
import {OpenPortTableViewer} from "../portscan/PortTable"
import {SimpleCardBox, StatusCardInfoProps} from "../yakitStore/viewers/base"
import moment from "moment"
import {CreatReportScript} from "./CreatReportScript"
import useHoldingIPCRStream, {InfoState} from "../../hook/useHoldingIPCRStream"
import {ExtractExecResultMessageToYakitPort, YakitPort} from "../../components/yakitLogSchema"
import type {CheckboxValueType} from "antd/es/checkbox/Group"
import {RiskDetails} from "@/pages/risks/RiskTable"
import {formatTimestamp} from "../../utils/timeUtil"
import {ResizeBox} from "../../components/ResizeBox"
import {SimpleCloseInfo, setSimpleInfo, delSimpleInfo} from "@/pages/globalVariable"
import {PresetPorts} from "@/pages/portscan/schema"
import {v4 as uuidv4} from "uuid"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import emiter from "@/utils/eventBus/eventBus"
import {DownloadOnlinePluginsRequest, apiFetchQueryYakScriptGroupLocal} from "../plugins/utils"
import {LastRecordProps} from "../securityTool/newPortScan/utils"
import { YakitRoute } from "@/enums/yakitRoute"
import { StartBruteParams } from "../securityTool/newBrute/NewBruteType"

const {ipcRenderer} = window.require("electron")
const CheckboxGroup = Checkbox.Group

const layout = {
    labelCol: {span: 6},
    wrapperCol: {span: 16}
}
const marks: SliderMarks = {
    1: {
        label: <div>慢速</div>
    },
    2: {
        label: <div>适中</div>
    },
    3: {
        label: <div>快速</div>
    }
}

interface SimpleDetectFormProps {
    refreshPluginGroup: number
    setPercent: (v: number) => void
    percent: number
    setExecuting: (v: boolean) => void
    token: string
    executing: boolean
    openScriptNames: string[] | undefined
    YakScriptOnlineGroup?: string
    isDownloadPlugin: boolean
    baseProgress?: number
    TaskName?: string
    runTaskName?: string
    setRunTaskName: (v: string) => void
    setRunPluginCount: (v: number) => void
    reset: () => void
    filePtrValue: number
    oldRunParams?: OldRunParamsProps
    Uid?: string
    nowUUID: string
    setNowUUID: (v: string) => void
    setAllowDownloadReport: (v: boolean) => void
    statusCards: StatusCardInfoProps[]
    getReportParams: () => CacheReportParamsProps[]
    setIsLastReport: (v: boolean) => void
    setRunTaskNameEx: (v: string) => void
}

export const SimpleDetectForm: React.FC<SimpleDetectFormProps> = (props) => {
    const {
        refreshPluginGroup,
        percent,
        setPercent,
        setExecuting,
        token,
        executing,
        openScriptNames,
        YakScriptOnlineGroup,
        isDownloadPlugin,
        baseProgress,
        TaskName,
        runTaskName,
        setRunTaskName,
        setRunPluginCount,
        reset,
        filePtrValue,
        oldRunParams,
        Uid,
        nowUUID,
        setNowUUID,
        setAllowDownloadReport,
        statusCards,
        getReportParams,
        setIsLastReport,
        setRunTaskNameEx
    } = props
    const [form] = Form.useForm()
    const [uploadLoading, setUploadLoading] = useState(false)

    const [portParams, setPortParams, getPortParams] = useGetState<PortScanParams>({
        Ports: "",
        Mode: "all",
        Targets: "",
        TargetsFile: "",
        ScriptNames: openScriptNames || [],
        // SYN 并发
        SynConcurrent: 1000,
        // 指纹并发
        Concurrent: 50,
        Active: true,
        // 服务指纹级别
        ProbeMax: 100,
        // 主动探测超时
        ProbeTimeout: 7,
        // web/服务/all
        FingerprintMode: "all",
        Proto: ["tcp"],

        EnableBasicCrawler: true,
        BasicCrawlerRequestMax: 5,

        SaveToDB: true,
        SaveClosedPorts: false,
        EnableCClassScan: false,
        EnableBrute: true,
        SkippedHostAliveScan: false,
        HostAlivePorts: "22,80,443",
        ExcludeHosts: "",
        ExcludePorts: "",
        Proxy: [],
        HostAliveConcurrent: 200
    })

    const [bruteParams, setBruteParams, getBruteParams] = useGetState<StartBruteParams>({
        Concurrent: 50,
        DelayMax: 5,
        DelayMin: 1,
        OkToStop: true,
        PasswordFile: "",
        Passwords: [],
        PasswordsDict: [],
        ReplaceDefaultPasswordDict: true,
        PluginScriptName: "",
        Prefix: "",
        TargetFile: "",
        TargetTaskConcurrent: 1,
        Targets: "",
        Type: "",
        UsernameFile: "",
        Usernames: [],
        UsernamesDict: [],
        ReplaceDefaultUsernameDict: true,

        usernameValue: "",
        passwordValue: ""
    })
    const [_, setScanType, getScanType] = useGetState<string>("基础扫描")
    const [checkedList, setCheckedList, getCheckedList] = useGetState<CheckboxValueType[]>(["弱口令"])
    const [__, setScanDeep, getScanDeep] = useGetState<number>(3)
    const isInputValue = useRef<boolean>(false)
    // 是否已经修改速度
    const isSetSpeed = useRef<number>()

    useEffect(() => {
        let obj: any = {}
        if (getScanType() === "专项扫描" && !getCheckedList().includes("弱口令")) {
            obj.EnableBrute = false
        } else {
            obj.EnableBrute = true
        }
        switch (getScanDeep()) {
            // 快速
            case 3:
                setPortParams({...portParams, ...obj, Ports: PresetPorts["fast"]})
                break
            // 适中
            case 2:
                setPortParams({...portParams, ...obj, Ports: PresetPorts["middle"]})
                break
            // 慢速
            case 1:
                setPortParams({...portParams, ...obj, Ports: PresetPorts["slow"]})
                break
        }
    }, [getScanDeep(), getScanType(), getCheckedList()])

    // 继续任务操作屏蔽
    const [shield, setShield] = useState<boolean>(false)

    useEffect(() => {
        if (oldRunParams) {
            const {LastRecord, PortScanRequest} = oldRunParams
            const {Targets, TargetsFile} = PortScanRequest
            setPortParams({...portParams, Targets, TargetsFile})
            setShield(true)
        }
    }, [oldRunParams])

    useEffect(() => {
        if (YakScriptOnlineGroup) {
            let arr: string[] = YakScriptOnlineGroup.split(",")
            let selectArr: any[] = []
            arr.map((item) => {
                switch (item) {
                    case "弱口令":
                        selectArr.push("弱口令")
                        break
                    default:
                        setScanType(item)
                        break
                }
            })
            if (selectArr.length > 0) {
                setCheckedList(selectArr)
                setScanType("自定义")
            }
        }
    }, [YakScriptOnlineGroup])

    useEffect(() => {
        if (!isInputValue.current) {
            // 任务名称-时间戳-扫描目标
            let taskNameTimeTarget: string = moment(new Date()).unix().toString()
            if (portParams?.Targets && portParams.Targets.length > 0) {
                taskNameTimeTarget = portParams.Targets.split(",")[0].split(/\n/)[0]
            }

            form.setFieldsValue({
                TaskName: `${getScanType()}-${taskNameTimeTarget}`
            })
            setRunTaskName(`${getScanType()}-${taskNameTimeTarget}`)
        }
    }, [getScanType(), executing, portParams?.Targets])

    useEffect(() => {
        if (TaskName) {
            form.setFieldsValue({
                TaskName: TaskName || "漏洞扫描任务"
            })
        }
    }, [TaskName])

    // 保存任务
    const saveTask = (v?: string) => {
        const cacheData = v ? JSON.parse(v) : false
        let newParams: PortScanParams = {...getPortParams()}
        const OnlineGroup: string = getScanType() !== "专项扫描" ? getScanType() : [...checkedList].join(",")
        let StartBruteParams: StartBruteParams = {...getBruteParams()}
        // 继续任务暂存报告参数 用于恢复任务下载 --如果直接关闭Dom则无法存储报告
        const ReportParams = getReportParams()
        if (oldRunParams) {
            const {LastRecord, PortScanRequest} = oldRunParams
            ipcRenderer.invoke(
                "SaveCancelSimpleDetect",
                cacheData || {
                    LastRecord,
                    StartBruteParams,
                    PortScanRequest,
                    ExtraInfo: JSON.stringify({statusCards, Params: ReportParams})
                }
            )
        } else {
            ipcRenderer.invoke(
                "SaveCancelSimpleDetect",
                cacheData || {
                    LastRecord: {
                        LastRecordPtr: filePtrValue,
                        Percent: percent,
                        YakScriptOnlineGroup: OnlineGroup,
                        ExtraInfo: JSON.stringify({statusCards, Params: ReportParams})
                    },
                    StartBruteParams,
                    PortScanRequest: {...newParams, TaskName: runTaskName}
                }
            )
        }
        delSimpleInfo(token)
    }

    // 更新销毁参数
    useDebounceEffect(() => {
        let obj = {}
        if (oldRunParams) {
            const {LastRecord, PortScanRequest} = oldRunParams
            obj = {
                LastRecord,
                PortScanRequest
            }
        } else {
            let newParams: PortScanParams = {...getPortParams()}
            const OnlineGroup: string = getScanType() !== "专项扫描" ? getScanType() : [...checkedList].join(",")
            obj = {
                LastRecord: {
                    LastRecordPtr: filePtrValue,
                    Percent: percent,
                    YakScriptOnlineGroup: OnlineGroup
                },
                PortScanRequest: {...newParams, TaskName: runTaskName}
            }
        }
        setSimpleInfo(token, executing, JSON.stringify(obj))
    }, [executing, oldRunParams, filePtrValue, percent, getScanType(), runTaskName])

    useEffect(() => {
        return () => {
            // 任务运行中
            SimpleCloseInfo[token]?.status && saveTask(SimpleCloseInfo[token].info)
        }
    }, [])

    const run = (TaskName: string) => {
        setPercent(0)
        setRunPluginCount(getPortParams().ScriptNames.length)

        reset()
        setRunTaskName(TaskName)
        setExecuting(true)
        let newParams: PortScanParams = {...getPortParams()}
        let StartBruteParams: StartBruteParams = {...getBruteParams()}

        switch (getScanDeep()) {
            // 快速
            case 3:
                // 指纹并发
                newParams.Concurrent = 100
                // SYN 并发
                newParams.SynConcurrent = 2000
                newParams.ProbeTimeout = 3
                // 指纹详细程度
                newParams.ProbeMax = 3
                break
            // 适中
            case 2:
                newParams.Concurrent = 80
                newParams.SynConcurrent = 1000
                newParams.ProbeTimeout = 5
                newParams.ProbeMax = 5
                break
            // 慢速
            case 1:
                newParams.Concurrent = 50
                newParams.SynConcurrent = 1000
                newParams.ProbeTimeout = 7
                newParams.ProbeMax = 7
                break
        }
        let LastRecord = {}
        const runTaskNameEx = TaskName + "-" + nowUUID
        setRunTaskNameEx(runTaskNameEx)
        let PortScanRequest = {...newParams, TaskName: runTaskNameEx}
        setAllowDownloadReport(true)
        console.log("SimpleDetect", {
            LastRecord,
            StartBruteParams,
            PortScanRequest
        })
        ipcRenderer.invoke(
            "SimpleDetect",
            {
                LastRecord,
                StartBruteParams,
                PortScanRequest
            },
            token
        )
    }

    const recoverRun = () => {
        // 更改最新的唯一标识UUID
        const uuid: string = uuidv4()
        setNowUUID(uuid)
        reset()
        setExecuting(true)
        setIsLastReport(false)
        ipcRenderer.invoke("RecoverSimpleDetectUnfinishedTask", {Uid}, token)
    }

    const onFinish = useMemoizedFn((values) => {
        const {TaskName} = values
        if (!portParams.Targets && !portParams.TargetsFile) {
            warn("需要设置扫描目标")
            return
        }
        if (TaskName.length === 0) {
            warn("请输入任务名称")
            return
        }
        if (getScanType() === "专项扫描" && getCheckedList().length === 0) {
            warn("请选择自定义内容")
            return
        }
        if (portParams.Ports.length === 0) {
            warn("请选择或输入扫描端口")
            return
        }
        debugger
        let OnlineGroup: string = ""
        if (getScanType() !== "专项扫描") {
            OnlineGroup = getScanType()
        } else {
            // 当插件组内部没有弱口令的时候，查询插件需要排除爆破弱口令
            if (!groupWeakPwdFlag) {
                OnlineGroup = [...checkedList].filter((name) => name !== "弱口令").join(",")
            } else {
                OnlineGroup = [...checkedList].join(",")
            }
        }

        // 是否仅勾选的弱口令仅代表爆破弱口令
        const blastingWeakPwdFlag = checkedList.length === 1 && checkedList.includes("弱口令") && !groupWeakPwdFlag
        // 继续任务 参数拦截
        if (Uid) {
            recoverRun()
        }
        // 当为跳转带参
        else if (Array.isArray(openScriptNames)) {
            run(TaskName)
        }
        // 只勾选了爆破弱口令的选项
        else if (blastingWeakPwdFlag && OnlineGroup !== "基础扫描") {
            setPortParams({...getPortParams(), ScriptNames: []})
            run(TaskName)
        } else {
            ipcRenderer
                .invoke("QueryYakScriptByOnlineGroup", {OnlineGroup})
                .then((data: {Data: YakScript[]}) => {
                    const ScriptNames: string[] = data.Data.map((item) => item.OnlineScriptName)
                    setPortParams({...getPortParams(), ScriptNames})
                    run(TaskName)
                })
                .catch((e) => {
                    failed(`查询扫描模式错误:${e}`)
                })
                .finally(() => {})
        }
    })

    const onCancel = useMemoizedFn(() => {
        if (Uid) {
            ipcRenderer.invoke("cancel-RecoverSimpleDetectUnfinishedTask", token)
        } else {
            ipcRenderer.invoke("cancel-SimpleDetect", token)
        }
        saveTask()
    })

    const judgeExtra = () => {
        let str: string = ""
        switch (getScanType()) {
            case "基础扫描":
                str = "包含合规检测、小字典弱口令检测与部分漏洞检测"
                break
            case "专项扫描":
                str = "针对不同场景的专项漏洞检测扫描"
                break
        }
        return str
    }

    const simpleDetectRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(simpleDetectRef)
    const [plainOptions, setPlainOptions] = useState<string[]>([])
    const [groupWeakPwdFlag, setGroupWeakPwdFlag] = useState<boolean>(false) // 标识弱口令是否是分组里面的弱口令还是固定的爆破弱口令
    const getPluginGroup = (callBack?: () => void) => {
        apiFetchQueryYakScriptGroupLocal(false)
            .then((group: GroupCount[]) => {
                const copyGroup = structuredClone(group)
                let groups: string[] = copyGroup.map((item) => item.Value)
                if (groups.includes("基础扫描")) {
                    groups = groups.filter((item) => item !== "基础扫描")
                }
                if (!groups.includes("弱口令")) {
                    setGroupWeakPwdFlag(false)
                    groups.push("弱口令") // 塞一个固定的爆破弱口令
                } else {
                    setGroupWeakPwdFlag(true)
                }
                const checked = checkedList.filter((item) => groups.includes(item + ""))
                setCheckedList(checked)
                setPlainOptions(groups)
            })
            .finally(() => {
                callBack && callBack()
            })
    }
    useEffect(() => {
        getPluginGroup()
    }, [inViewport, refreshPluginGroup])

    return (
        <div className={styles["simple-detect-form"]} style={{marginTop: 20}} ref={simpleDetectRef}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Spin spinning={uploadLoading}>
                    <ContentUploadInput
                        type='textarea'
                        dragger={{
                            disabled: executing || shield
                        }}
                        beforeUpload={(f) => {
                            const typeArr: string[] = [
                                "text/plain",
                                ".csv",
                                ".xls",
                                ".xlsx",
                                "application/vnd.ms-excel",
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            ]
                            if (!typeArr.includes(f.type)) {
                                failed(`${f.name}非txt、Excel文件，请上传txt、Excel格式文件！`)
                                return false
                            }
                            setUploadLoading(true)
                            const TargetsFile = getPortParams().TargetsFile
                            const absPath: string = (f as any).path
                            // 当已有文件上传时
                            if (TargetsFile && TargetsFile?.length > 0) {
                                let arr = TargetsFile.split(",")
                                // 限制最多3个文件上传
                                if (arr.length >= 3) {
                                    info("最多支持3个文件上传")
                                    setUploadLoading(false)
                                    return
                                }
                                // 当不存在时添加
                                if (!arr.includes(absPath)) {
                                    setPortParams({...portParams, TargetsFile: `${TargetsFile},${absPath}`})
                                } else {
                                    info("路径已存在，请勿重复上传")
                                }
                            } // 当未上传过文件时
                            else {
                                setPortParams({...portParams, TargetsFile: absPath})
                            }
                            setUploadLoading(false)
                            return false
                        }}
                        item={{
                            style: {textAlign: "left"},
                            label: "扫描目标:"
                        }}
                        textarea={{
                            isBubbing: true,
                            setValue: (Targets) => setPortParams({...portParams, Targets}),
                            value: portParams.Targets,
                            rows: 1,
                            placeholder: "域名/主机/IP/IP段均可，逗号分隔或按行分割",
                            disabled: executing || shield
                        }}
                        otherHelpNode={
                            <>
                                <span className={styles["help-hint-title"]}>
                                    <Checkbox
                                        onClick={(e) => {
                                            setPortParams({
                                                ...portParams,
                                                SkippedHostAliveScan: !portParams.SkippedHostAliveScan
                                            })
                                        }}
                                        checked={portParams.SkippedHostAliveScan}
                                    >
                                        跳过主机存活检测
                                    </Checkbox>
                                </span>
                                <span
                                    onClick={() => {
                                        let m = showDrawer({
                                            title: "设置高级参数",
                                            width: "60%",
                                            onClose: () => {
                                                isSetSpeed.current = getScanDeep()
                                                m.destroy()
                                            },
                                            content: (
                                                <>
                                                    <ScanPortForm
                                                        isSetPort={isSetSpeed.current !== getScanDeep()}
                                                        deepLevel={getScanDeep()}
                                                        isSimpleDetectShow={true}
                                                        defaultParams={portParams}
                                                        setParams={(value) => {
                                                            setPortParams(value)
                                                        }}
                                                        bruteParams={bruteParams}
                                                        setBruteParams={setBruteParams}
                                                    />
                                                </>
                                            )
                                        })
                                    }}
                                    className={styles["help-hint-title"]}
                                >
                                    更多参数
                                </span>
                                <span
                                    onClick={() => {
                                        showUnfinishedSimpleDetectTaskList((task: UnfinishedSimpleDetectBatchTask) => {
                                            ipcRenderer.invoke("send-to-tab", {
                                                type: "simple-batch-exec-recover",
                                                data: task
                                            })
                                        })
                                    }}
                                    className={styles["help-hint-title"]}
                                >
                                    未完成任务
                                </span>
                            </>
                        }
                        suffixNode={
                            executing ? (
                                <Button type='primary' danger disabled={!executing} onClick={onCancel}>
                                    立即停止任务
                                </Button>
                            ) : (
                                <Button type='primary' htmlType='submit' disabled={isDownloadPlugin}>
                                    开始检测
                                </Button>
                            )
                        }
                    />
                </Spin>
                {getPortParams().TargetsFile && (
                    <Form.Item label=' ' colon={false}>
                        {getPortParams()
                            .TargetsFile?.split(",")
                            .map((item: string) => {
                                return (
                                    <div className={styles["upload-file-item"]}>
                                        <div className={styles["text"]}>
                                            <PaperClipOutlined
                                                style={{
                                                    marginRight: 8,
                                                    color: "#666666"
                                                }}
                                            />
                                            {item.substring(item.lastIndexOf("\\") + 1)}
                                        </div>
                                        {!executing && !!!oldRunParams && (
                                            <DeleteOutlined
                                                className={styles["icon"]}
                                                onClick={() => {
                                                    let arr = getPortParams().TargetsFile?.split(",") || []
                                                    let str = arr?.filter((itemIn: string) => itemIn !== item).join(",")
                                                    setPortParams({...portParams, TargetsFile: str})
                                                }}
                                            />
                                        )}
                                    </div>
                                )
                            })}
                    </Form.Item>
                )}
                <div style={executing ? {display: "none"} : {}}>
                    <Form.Item name='scan_type' label='扫描模式' extra={judgeExtra()}>
                        <Radio.Group
                            buttonStyle='solid'
                            defaultValue={"基础扫描"}
                            onChange={(e) => {
                                setScanType(e.target.value)
                            }}
                            value={getScanType()}
                            disabled={shield}
                        >
                            <Radio.Button value='基础扫描'>基础扫描</Radio.Button>
                            <Radio.Button value='专项扫描'>专项扫描</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    {getScanType() === "专项扫描" && (
                        <Form.Item label=' ' colon={false} style={{marginTop: "-16px"}}>
                            <CheckboxGroup
                                disabled={shield}
                                options={plainOptions}
                                value={checkedList}
                                onChange={(list) => setCheckedList(list)}
                            />
                        </Form.Item>
                    )}

                    <div style={{display: "none"}}>
                        <Form.Item name='TaskName' label='任务名称'>
                            <Input
                                disabled={shield}
                                style={{width: 400}}
                                placeholder='请输入任务名称'
                                allowClear
                                onChange={() => {
                                    isInputValue.current = true
                                }}
                            />
                        </Form.Item>
                    </div>

                    <Form.Item name='scan_deep' label='扫描速度' style={{position: "relative"}}>
                        <Slider
                            tipFormatter={null}
                            value={getScanDeep()}
                            onChange={(value) => setScanDeep(value)}
                            style={{width: 400}}
                            min={1}
                            max={3}
                            marks={marks}
                            disabled={shield}
                        />
                        <div style={{position: "absolute", top: 26, fontSize: 12, color: "gray"}}>
                            扫描速度越慢，扫描结果就越详细，可根据实际情况进行选择
                        </div>
                    </Form.Item>
                </div>
            </Form>
        </div>
    )
}

export interface SimpleDetectTableProps {
    token: string
    executing: boolean
    runTaskName?: string
    runPluginCount?: number
    infoState: InfoState
    setExecuting: (v: boolean) => void
    nowUUID: string
    allowDownloadReport: boolean
    ref: any
    oldRunParams?: OldRunParamsProps
    isLastReport: boolean
    runTaskNameEx?: string
}

export const SimpleDetectTable: React.FC<SimpleDetectTableProps> = React.forwardRef((props, ref) => {
    const {
        token,
        executing,
        runTaskName,
        runPluginCount,
        infoState,
        setExecuting,
        nowUUID,
        allowDownloadReport,
        oldRunParams,
        isLastReport,
        runTaskNameEx
    } = props

    const [openPorts, setOpenPorts] = useState<YakitPort[]>([])
    const openPort = useRef<YakitPort[]>([])
    // 下载报告Modal
    const [reportModalVisible, setReportModalVisible] = useState<boolean>(false)
    const [reportName, setReportName] = useState<string>(runTaskName || "默认报告名称")
    const [reportLoading, setReportLoading] = useState<boolean>(false)
    const [_, setReportId, getReportId] = useGetState<number>()
    // 是否允许更改TaskName
    const isSetTaskName = useRef<boolean>(true)
    // 报告token
    const [reportToken, setReportToken] = useState(randomString(40))
    // 是否展示报告生成进度
    const [showReportPercent, setShowReportPercent] = useState<boolean>(false)
    // 报告生成进度
    const [reportPercent, setReportPercent] = useState(0)

    useEffect(() => {
        if (!reportModalVisible) {
            setReportLoading(false)
            setShowReportPercent(false)
            ipcRenderer.invoke("cancel-ExecYakCode", reportToken)
        }
    }, [reportModalVisible])

    useEffect(() => {
        // 报告生成成功
        if (getReportId()) {
            setReportLoading(false)
            setShowReportPercent(false)
            setReportPercent(0)
            setReportModalVisible(false)
            ipcRenderer.invoke("open-route-page", {route: YakitRoute.DB_Report})
            setTimeout(() => {
                ipcRenderer.invoke("simple-open-report", getReportId())
            }, 300)
        }
    }, [getReportId()])

    useEffect(() => {
        if (executing) {
            openPort.current = []
            executing && setOpenPorts([])
        }
        // 重新执行任务 重置已输入报告名
        runTaskName && setReportName(runTaskName)
        isSetTaskName.current = true
    }, [executing])

    useEffect(() => {
        if (runTaskName && isSetTaskName.current) {
            setReportName(runTaskName)
        }
    }, [runTaskName])

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let messageJsonRaw = Buffer.from(data.Message).toString("utf8")
                    let logInfo = ExtractExecResultMessageToYakitPort(JSON.parse(messageJsonRaw))
                    if (!logInfo) return

                    if (logInfo.isOpen) {
                        openPort.current.unshift(logInfo)
                        // 限制20条数据
                        openPort.current = openPort.current.slice(0, 20)
                    } else {
                        // closedPort.current.unshift(logInfo)
                    }
                } catch (e) {
                    failed("解析端口扫描结果失败...")
                }
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[SimpleDetect] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            info("[SimpleDetect] finished")
            setExecuting(false)
        })

        const syncPorts = () => {
            if (openPort.current) setOpenPorts([...openPort.current])
        }

        syncPorts()
        let id = setInterval(syncPorts, 1000)
        return () => {
            clearInterval(id)
            ipcRenderer.invoke("cancel-SimpleDetect", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])
    /** 通知软件打开管理页面 */
    const openMenu = () => {
        ipcRenderer.invoke("open-route-page", {route: YakitRoute.DB_Risk})
    }
    /** 获取生成报告返回结果 */
    useEffect(() => {
        ipcRenderer.on(`${reportToken}-data`, (e, data: ExecResult) => {
            if (data.IsMessage) {
                // console.log("获取生成报告返回结果", new Buffer(data.Message).toString())
                const obj = JSON.parse(new Buffer(data.Message).toString())
                if (obj?.type === "progress") {
                    setReportPercent(obj.content.progress)
                }
                setReportId(parseInt(obj.content.data))
            }
        })
        return () => {
            ipcRenderer.removeAllListeners(`${reportToken}-data`)
        }
    }, [reportToken])
    /** 通知生成报告 */
    const creatReport = () => {
        setReportId(undefined)
        setReportModalVisible(true)
    }

    /** 获取扫描主机数 扫描端口数 */
    const getCardForId = (id: string) => {
        const item = infoState.statusState.filter((item) => item.tag === id)
        if (item.length > 0) {
            return item[0].info[0].Data
        }
        return null
    }

    /** 区分继续任务与新任务 获取扫描主机数 Ping存活主机数 */
    const getCardByJudgeOld = (v: "扫描主机数" | "Ping存活主机数") => {
        if (oldRunParams && oldRunParams.LastRecord.ExtraInfo) {
            let oldCards = JSON.parse(oldRunParams.LastRecord.ExtraInfo).statusCards
            const oldItem: StatusCardInfoProps[] = oldCards.filter((item) =>
                ["存活主机数/扫描主机数"].includes(item.tag)
            )
            if (oldItem.length > 0) {
                let strArr: string[] = oldItem[0].info[0].Data.split("/")
                if (v === "Ping存活主机数") return strArr[0]
                else return strArr[strArr.length - 1]
            }
            return getCardForId(v)
        } else {
            return getCardForId(v)
        }
    }

    /** 下载报告 */
    const downloadReport = () => {
        // 脚本数据
        const scriptData = CreatReportScript
        let Params = [
            {Key: "task_name", Value: runTaskNameEx},
            {Key: "runtime_id", Value: getCardForId("RuntimeIDFromRisks")},
            {Key: "report_name", Value: reportName},
            {Key: "plugins", Value: runPluginCount},
            {Key: "host_total", Value: getCardByJudgeOld("扫描主机数")},
            {Key: "ping_alive_host_total", Value: getCardByJudgeOld("Ping存活主机数")},
            {Key: "port_total", Value: getCardForId("扫描端口数")}
        ]
        // 老报告生成
        if (oldRunParams && isLastReport) {
            let oldParams: CacheReportParamsProps[] = (JSON.parse(oldRunParams.LastRecord.ExtraInfo) || [])?.Params
            if (oldParams) {
                Params = oldParams
            }
        }
        const reqParams = {
            Script: scriptData,
            Params
        }
        ipcRenderer.invoke("ExecYakCode", reqParams, reportToken)
    }

    // 缓存报告参数 - 用于继续任务生成报告
    // 使用 forwardRef 将子组件传递到父组件中。
    // 通过 ref 回调函数将子组件的实例传递给 childRef。
    React.useImperativeHandle(ref, () => ({
        getReportParams: () => {
            return [
                {Key: "task_name", Value: runTaskNameEx},
                {Key: "runtime_id", Value: getCardForId("RuntimeIDFromRisks")},
                {Key: "report_name", Value: reportName},
                {Key: "plugins", Value: runPluginCount},
                {Key: "host_total", Value: getCardByJudgeOld("扫描主机数")},
                {Key: "ping_alive_host_total", Value: getCardByJudgeOld("Ping存活主机数")},
                {Key: "port_total", Value: getCardForId("扫描端口数")}
            ]
        }
    }))

    return (
        <div className={styles["simple-detect-table"]}>
            <div className={styles["result-table-body"]}>
                <Tabs
                    className='scan-port-tabs'
                    tabBarStyle={{marginBottom: 5}}
                    tabBarExtraContent={
                        <div>
                            {!executing && allowDownloadReport ? (
                                <div className={styles["hole-text"]} onClick={creatReport}>
                                    生成报告
                                </div>
                            ) : (
                                <div className={styles["disable-hole-text"]}>生成报告</div>
                            )}
                        </div>
                    }
                >
                    {!!infoState.riskState && infoState.riskState.length > 0 && (
                        <Tabs.TabPane tab={`漏洞与风险`} key={"risk"} forceRender>
                            <AutoCard
                                bodyStyle={{overflowY: "auto"}}
                                extra={
                                    <div className={styles["hole-text"]} onClick={openMenu}>
                                        查看完整漏洞
                                    </div>
                                }
                            >
                                <Space direction={"vertical"} style={{width: "100%"}} size={12}>
                                    {infoState.riskState.slice(0, 10).map((i) => {
                                        return <RiskDetails info={i} shrink={true} />
                                    })}
                                </Space>
                            </AutoCard>
                        </Tabs.TabPane>
                    )}

                    <Tabs.TabPane tab={"扫描端口列表"} key={"scanPort"} forceRender>
                        <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
                            <Row style={{marginTop: 6}} gutter={6}>
                                <Col span={24}>
                                    <OpenPortTableViewer data={openPorts} isSimple={true} />
                                </Col>
                            </Row>
                        </div>
                    </Tabs.TabPane>
                    {/* <Tabs.TabPane tab={"插件日志"} key={"pluginPort"} forceRender>
                        <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
                            <PluginResultUI
                                loading={false}
                                progress={[]}
                                results={infoState.messageState}
                                featureType={infoState.featureTypeState}
                                feature={infoState.featureMessageState}
                                statusCards={infoState.statusState}
                            />
                        </div>
                    </Tabs.TabPane> */}
                </Tabs>
            </div>
            <Modal
                title='下载报告'
                visible={reportModalVisible}
                footer={null}
                onCancel={() => {
                    setReportModalVisible(false)
                    if (reportPercent < 1 && reportPercent > 0) {
                        warn("取消生成报告")
                    }
                }}
            >
                <div>
                    <div style={{textAlign: "center"}}>
                        <Input
                            style={{width: 400}}
                            placeholder='请输入任务名称'
                            allowClear
                            value={reportName}
                            onChange={(e) => {
                                isSetTaskName.current = false
                                setReportName(e.target.value)
                            }}
                        />
                        {showReportPercent && (
                            <div style={{width: 400, margin: "0 auto"}}>
                                <Progress
                                    // status={executing ? "active" : undefined}
                                    percent={parseInt((reportPercent * 100).toFixed(0))}
                                />
                            </div>
                        )}
                    </div>
                    <div style={{marginTop: 20, textAlign: "right"}}>
                        <Button
                            style={{marginRight: 8}}
                            onClick={() => {
                                setReportModalVisible(false)
                                if (reportPercent < 1 && reportPercent > 0) {
                                    warn("取消生成报告")
                                }
                            }}
                        >
                            取消
                        </Button>
                        <Button
                            loading={reportLoading}
                            type={"primary"}
                            onClick={() => {
                                setReportLoading(true)
                                downloadReport()
                                setShowReportPercent(true)
                            }}
                        >
                            确定
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
})

interface DownloadAllPluginProps {
    type?: "modal" | "default"
    setDownloadPlugin?: (v: boolean) => void
    onClose?: () => void
    delAllPlugins?: () => void
}

export const DownloadAllPlugin: React.FC<DownloadAllPluginProps> = (props) => {
    const {setDownloadPlugin, onClose, delAllPlugins} = props
    const type = props.type || "default"
    // 全局登录状态
    const {userInfo} = useStore()
    // 全部添加进度条
    const [addLoading, setAddLoading] = useState<boolean>(false)
    // 全部添加进度
    const [percent, setPercent, getPercent] = useGetState<number>(0)
    const [taskToken, setTaskToken] = useState(randomString(40))
    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: DownloadOnlinePluginAllResProps) => {
            const p = Math.floor(data.Progress * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            setTimeout(() => {
                type === "default" && setAddLoading(false)
                setPercent(0)
                setDownloadPlugin && setDownloadPlugin(false)
                onClose && onClose()
            }, 500)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {})
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    const AddAllPlugin = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            warn("我的插件需要先登录才能下载，请先登录")
            return
        }
        // 全部添加
        setAddLoading(true)
        setDownloadPlugin && setDownloadPlugin(true)
        const addParams: DownloadOnlinePluginsRequest = {ListType: ""}
        ipcRenderer
            .invoke("DownloadOnlinePlugins", addParams, taskToken)
            .then(() => {})
            .catch((e) => {
                failed(`添加失败:${e}`)
            })
    })
    const StopAllPlugin = () => {
        onClose && onClose()
        setAddLoading(false)
        ipcRenderer.invoke("cancel-DownloadOnlinePlugins", taskToken).catch((e) => {
            failed(`停止添加失败:${e}`)
        })
    }
    const onRemoveAllLocalPlugin = () => {
        // 全部删除
        ipcRenderer
            .invoke("DeleteLocalPluginsByWhere", {})
            .then(() => {
                delAllPlugins && delAllPlugins()
                success("全部删除成功")
            })
            .catch((e) => {
                failed(`删除所有本地插件错误:${e}`)
            })
    }
    if (type === "modal") {
        return (
            <div className={styles["download-all-plugin-modal"]}>
                {addLoading ? (
                    <div>
                        <div>下载进度</div>
                        <div className={styles["filter-opt-progress-modal"]}>
                            <Progress
                                size='small'
                                status={!addLoading && percent !== 0 ? "exception" : undefined}
                                percent={percent}
                            />
                        </div>
                        <div style={{textAlign: "center", marginTop: 10}}>
                            <Button type='primary' onClick={StopAllPlugin}>
                                取消
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div>检测到本地未下载任何插件，无法进行安全检测，请点击“一键导入”进行插件下载</div>
                        <div style={{textAlign: "center", marginTop: 10}}>
                            <Button type='primary' onClick={AddAllPlugin}>
                                一键导入
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        )
    }
    return (
        <div className={styles["download-all-plugin"]}>
            {addLoading && (
                <div className={styles["filter-opt-progress"]}>
                    <Progress
                        size='small'
                        status={!addLoading && percent !== 0 ? "exception" : undefined}
                        percent={percent}
                    />
                </div>
            )}
            {addLoading ? (
                <Button style={{marginLeft: 12}} size='small' type='primary' danger onClick={StopAllPlugin}>
                    停止
                </Button>
            ) : (
                <Popconfirm
                    title={"确定将插件商店所有数据导入到本地吗?"}
                    onConfirm={AddAllPlugin}
                    okText='Yes'
                    cancelText='No'
                    placement={"left"}
                >
                    <div className={styles["operation-text"]}>一键导入插件</div>
                </Popconfirm>
            )}
            {userInfo.role !== "admin" && (
                <Popconfirm
                    title={"确定将插件商店所有本地数据清除吗?"}
                    onConfirm={onRemoveAllLocalPlugin}
                    okText='Yes'
                    cancelText='No'
                    placement={"left"}
                >
                    <YakitButton type='text' colors='danger' className={styles["clean-local-plugin"]}>
                        一键清除插件
                    </YakitButton>
                </Popconfirm>
            )}
        </div>
    )
}

export interface SimpleDetectProps {
    tabId?: string
    Uid?: string
    BaseProgress?: number
    YakScriptOnlineGroup?: string
    TaskName?: string
}

interface OldRunParamsProps {
    LastRecord: LastRecordProps
    PortScanRequest: any
}

interface CacheReportParamsProps {
    Key: string
    Value: any
}

export const OldSimpleDetect: React.FC<SimpleDetectProps> = (props) => {
    const {tabId, Uid, BaseProgress, YakScriptOnlineGroup, TaskName} = props
    // console.log("Uid-BaseProgress", Uid, BaseProgress, YakScriptOnlineGroup, TaskName)
    const [percent, setPercent] = useState(0)
    const [executing, setExecuting] = useState<boolean>(false)
    const [token, setToken] = useState(randomString(20))
    const [loading, setLoading] = useState<boolean>(false)
    // 打开新页面任务参数
    const [openScriptNames, setOpenScriptNames] = useState<string[]>()
    const [oldRunParams, setOldRunParams] = useState<OldRunParamsProps>()

    const [isDownloadPlugin, setDownloadPlugin] = useState<boolean>(false)

    // 点击运行任务的最新TaskName
    const [runTaskName, setRunTaskName] = useState<string>()
    // 获取最新的唯一标识UUID
    const uuid: string = uuidv4()
    const [___, setNowUUID, getNowUUID] = useGetState<string>(uuid)
    // 获取运行任务插件数
    const [runPluginCount, setRunPluginCount] = useState<number>()
    // 是否允许下载报告
    const [allowDownloadReport, setAllowDownloadReport] = useState<boolean>(false)
    // 是否使用生成之前任务的参数生成报告
    const [isLastReport, setIsLastReport] = useState<boolean>(false)
    const [infoState, {reset, setXtermRef, resetAll}] = useHoldingIPCRStream(
        "simple-scan",
        "SimpleDetect",
        token,
        () => {},
        () => {},
        (obj, content) => content.data.indexOf("isOpen") > -1 && content.data.indexOf("port") > -1
    )
    // 缓存最新的报告参数 用于继续任务时生成报告
    const childRef = useRef<any>()

    // 是否拖动ResizeBox
    const isResize = useRef<boolean>(false)
    // 设置ResizeBox高度
    const [__, setResizeBoxSize, getResizeBoxSize] = useGetState<string>("430px")

    // 是否显示之前的卡片
    const [showOldCard, setShowOldCard] = useState<boolean>(false)

    // 下载完插件 需要刷新获取插件组接口
    const [refreshPluginGroup, setRefreshPluginGroup] = useState<number>(Math.random())

    const statusErrorCards = infoState.statusState.filter((item) => ["加载插件失败", "SYN扫描失败"].includes(item.tag))
    const statusSucceeCards = infoState.statusState.filter((item) =>
        ["加载插件", "漏洞/风险/指纹", "开放端口数/已扫主机数", "存活主机数/扫描主机数"].includes(item.tag)
    )
    const statusCards = useMemo(() => {
        if (statusErrorCards.length > 0) {
            return statusErrorCards
        }
        return statusSucceeCards
    }, [statusErrorCards, statusSucceeCards])

    // 区分新老卡片渲染
    const Cards = useMemo(() => {
        if (showOldCard && oldRunParams && oldRunParams.LastRecord.ExtraInfo) {
            let oldCards = JSON.parse(oldRunParams.LastRecord.ExtraInfo).statusCards
            return Array.isArray(oldCards) ? oldCards : []
        }
        // 继续任务运行时 保持之前的 存活主机数/扫描主机数 数据
        else if (oldRunParams && oldRunParams.LastRecord.ExtraInfo) {
            let oldCards = JSON.parse(oldRunParams.LastRecord.ExtraInfo).statusCards
            const oldItem: StatusCardInfoProps[] = oldCards.filter((item) =>
                ["存活主机数/扫描主机数"].includes(item.tag)
            )
            const nowStatusCards: StatusCardInfoProps[] = statusCards.filter(
                (item) => item.tag !== "存活主机数/扫描主机数"
            )
            return [...oldItem, ...nowStatusCards]
        }
        return statusCards
    }, [statusCards, showOldCard, oldRunParams])

    const filePtr = infoState.statusState.filter((item) => ["当前文件指针"].includes(item.tag))
    const filePtrValue: number = Array.isArray(filePtr) ? parseInt(filePtr[0]?.info[0]?.Data) : 0

    const [runTaskNameEx, setRunTaskNameEx] = useState<string>()
    useEffect(() => {
        if (statusCards.length > 0) {
            setShowOldCard(false)
        }
        if (!isResize.current) {
            if (executing) {
                let cards: any = statusCards
                if (oldRunParams && showOldCard && oldRunParams.LastRecord.ExtraInfo) {
                    let oldCards = JSON.parse(oldRunParams.LastRecord.ExtraInfo).statusCards
                    cards = Array.isArray(oldCards) ? oldCards : []
                }
                cards.length === 0 ? setResizeBoxSize("160px") : setResizeBoxSize("270px")
            } else {
                let cards: any = statusCards
                if (oldRunParams && showOldCard && oldRunParams.LastRecord.ExtraInfo) {
                    let oldCards = JSON.parse(oldRunParams.LastRecord.ExtraInfo).statusCards
                    cards = Array.isArray(oldCards) ? oldCards : []
                }
                cards.length === 0 ? setResizeBoxSize("350px") : setResizeBoxSize("455px")
            }
        }
    }, [executing, statusCards.length, showOldCard, oldRunParams])

    useEffect(() => {
        if (BaseProgress !== undefined && BaseProgress > 0) {
            setPercent(BaseProgress)
        }
        if (infoState.processState.length > 0) {
            setPercent(infoState.processState[0].progress)
        }
    }, [BaseProgress, infoState.processState])

    useEffect(() => {
        if (Uid) {
            setAllowDownloadReport(true)
            setLoading(true)
            ipcRenderer
                .invoke("GetSimpleDetectUnfinishedTaskByUid", {
                    Uid
                })
                .then(({LastRecord, PortScanRequest}) => {
                    setIsLastReport(true)
                    setShowOldCard(true)
                    const {ScriptNames, TaskName} = PortScanRequest
                    setOldRunParams({
                        LastRecord,
                        PortScanRequest
                    })
                    setOpenScriptNames(ScriptNames)
                    setRunTaskNameEx(TaskName)
                })
                .catch((e) => {
                    console.info(e)
                })
                .finally(() => setTimeout(() => setLoading(false), 600))
        }
    }, [Uid])

    useEffect(() => {
        if (tabId) {
            let status = ""
            if (executing) {
                status = "run"
            }
            if (percent > 0 && percent < 1 && !executing) {
                status = "stop"
            }
            if (percent === 1 && !executing) {
                status = "success"
            }
            let obj = {
                tabId,
                status
            }
            !!status && emiter.emit("simpleDetectTabEvent", JSON.stringify(obj))
        }
    }, [percent, executing, tabId])

    const timelineItemProps = (infoState.messageState || [])
        .filter((i) => {
            return i.level === "info"
        })
        .splice(0, 3)
    return (
        <>
            {loading && <Spin tip={"正在恢复未完成的任务"} />}
            <div className={styles["simple-detect"]} style={loading ? {display: "none"} : {}}>
                <ResizeBox
                    isVer={true}
                    firstNode={
                        <AutoCard
                            size={"small"}
                            bordered={false}
                            title={
                                !executing ? (
                                    <DownloadAllPlugin
                                        setDownloadPlugin={setDownloadPlugin}
                                        delAllPlugins={() => {
                                            setRefreshPluginGroup(Math.random())
                                        }}
                                        onClose={() => {
                                            setRefreshPluginGroup(Math.random())
                                        }}
                                    />
                                ) : null
                            }
                            bodyStyle={{display: "flex", flexDirection: "column", padding: "0 5px", overflow: "hidden"}}
                        >
                            <Row>
                                {(percent > 0 || executing) && (
                                    <Col span={6}>
                                        <div style={{display: "flex"}}>
                                            <span style={{marginRight: 10}}>任务进度:</span>
                                            <div style={{flex: 1}}>
                                                <Progress
                                                    status={executing ? "active" : undefined}
                                                    percent={parseInt((percent * 100).toFixed(0))}
                                                />
                                            </div>
                                        </div>

                                        <Timeline
                                            pending={loading}
                                            style={{marginTop: 10, marginBottom: 10, maxHeight: 90}}
                                        >
                                            {(timelineItemProps || []).map((e, index) => {
                                                return (
                                                    <div key={index} className={styles["log-list"]}>
                                                        [{formatTimestamp(e.timestamp, true)}]: {e.data}
                                                    </div>
                                                )
                                            })}
                                        </Timeline>
                                    </Col>
                                )}
                                <Col span={percent > 0 || executing ? 18 : 24}>
                                    <SimpleDetectForm
                                        refreshPluginGroup={refreshPluginGroup}
                                        executing={executing}
                                        setPercent={setPercent}
                                        percent={percent}
                                        setExecuting={setExecuting}
                                        token={token}
                                        openScriptNames={openScriptNames}
                                        YakScriptOnlineGroup={YakScriptOnlineGroup}
                                        isDownloadPlugin={isDownloadPlugin}
                                        baseProgress={BaseProgress}
                                        TaskName={TaskName}
                                        runTaskName={runTaskName}
                                        setRunTaskName={setRunTaskName}
                                        setRunPluginCount={setRunPluginCount}
                                        reset={resetAll}
                                        filePtrValue={filePtrValue}
                                        oldRunParams={oldRunParams}
                                        Uid={Uid}
                                        nowUUID={getNowUUID()}
                                        setNowUUID={setNowUUID}
                                        setAllowDownloadReport={setAllowDownloadReport}
                                        // 卡片存储
                                        statusCards={statusCards}
                                        getReportParams={() => {
                                            if (childRef.current) {
                                                return childRef.current.getReportParams()
                                            }
                                            return []
                                        }}
                                        setIsLastReport={setIsLastReport}
                                        setRunTaskNameEx={setRunTaskNameEx}
                                    />
                                </Col>
                            </Row>

                            <Divider style={{margin: 4}} />

                            <SimpleCardBox statusCards={Cards} />
                        </AutoCard>
                    }
                    firstMinSize={"200px"}
                    firstRatio={getResizeBoxSize()}
                    secondMinSize={200}
                    onChangeSize={() => {
                        isResize.current = true
                    }}
                    secondNode={() => {
                        return (
                            <SimpleDetectTable
                                token={token}
                                executing={executing}
                                runTaskName={runTaskName}
                                runPluginCount={runPluginCount}
                                infoState={infoState}
                                setExecuting={setExecuting}
                                nowUUID={getNowUUID()}
                                allowDownloadReport={allowDownloadReport}
                                ref={childRef}
                                oldRunParams={oldRunParams}
                                isLastReport={isLastReport}
                                runTaskNameEx={runTaskNameEx}
                            />
                        )
                    }}
                />
            </div>
        </>
    )
}
