import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Space, Tag, Progress, Divider, Form, Input, Button, Cascader, Spin, Radio} from "antd"
import {AutoCard} from "@/components/AutoCard"
import styles from "./SimbleDetect.module.scss"
import classNames from "classnames"
import {ContentUploadInput} from "@/components/functionTemplate/ContentUploadTextArea"
import {failed, info, success, warn} from "@/utils/notification"
import ReactResizeDetector from "react-resize-detector"
import {RisksViewer} from "@/pages/risks/RisksViewer"
import {randomString} from "@/utils/randomUtil"
import {
    StartExecBatchYakScriptWithFilter,
    simpleQueryToFull,
    TaskResultLog
} from "../invoker/batch/BatchExecuteByFilter"
import {defTargetRequest, TargetRequest, CancelBatchYakScript} from "../invoker/batch/BatchExecutorPage"
import {ExecBatchYakScriptResult} from "../invoker/batch/YakBatchExecutorLegacy"
import {showUnfinishedBatchTaskList, UnfinishedBatchTask} from "../invoker/batch/UnfinishedBatchTaskList"
import {useCreation, useDebounce, useGetState, useMemoizedFn} from "ahooks"
import {Risk} from "../risks/schema"
import {showDrawer, showModal} from "../../utils/showModal"
import {ScanPortForm, PortScanParams, defaultPorts} from "../portscan/PortScanPage"
import {YakScript} from "../invoker/schema"
const {TextArea} = Input
const {ipcRenderer} = window.require("electron")
interface Option {
    value: string | number
    label: string
    children?: Option[]
}
const options: Option[] = [
    {
        value: "基础扫描",
        label: "基础扫描"
    },
    {
        value: "深度扫描",
        label: "深度扫描"
    },
    {
        value: "自定义",
        label: "自定义",
        children: [
            {
                value: "弱口令",
                label: "弱口令"
            },
            {
                value: "漏洞扫描",
                label: "漏洞扫描"
            },
            {
                value: "合规检测",
                label: "合规检测"
            }
        ]
    }
]
const layout = {
    labelCol: {span: 6},
    wrapperCol: {span: 16}
}
interface SimbleDetectFormProps {
    setPercent: (v: number) => void
    setExecuting: (v: boolean) => void
    token: string
    setToken: (v: string) => void
    sendTarget?: string
    executing: boolean
    target: TargetRequest
    setTarget: (v: TargetRequest) => void
    openScriptNames: string[] | undefined
    YakScriptOnlineGroup?: string
}
export const SimbleDetectForm: React.FC<SimbleDetectFormProps> = (props) => {
    const {
        setPercent,
        setExecuting,
        token,
        setToken,
        sendTarget,
        executing,
        target,
        setTarget,
        openScriptNames,
        YakScriptOnlineGroup
    } = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)

    const [params, setParams, getParams] = useGetState<PortScanParams>({
        Ports: defaultPorts,
        Mode: "fingerprint",
        Targets: sendTarget ? JSON.parse(sendTarget || "[]").join(",") : "",
        Active: true,
        Concurrent: 50,
        FingerprintMode: "all",
        Proto: ["tcp"],
        SaveClosedPorts: false,
        SaveToDB: true,
        Proxy: [],
        ProbeTimeout: 7,
        ScriptNames: [],
        ProbeMax: 100,
        EnableCClassScan: false,
        HostAlivePorts: "22,80,443",
        EnableBasicCrawler: true,
        BasicCrawlerRequestMax: 5,
        SynConcurrent: 1000
    })

    useEffect(() => {
        if (YakScriptOnlineGroup) {
            let arr: string[] = YakScriptOnlineGroup.split(",")
            let selectArr: any[] = []
            arr.map((item) => {
                switch (item) {
                    case "弱口令":
                        selectArr.push(["自定义", "弱口令"])
                        break
                    case "漏洞扫描":
                        selectArr.push(["自定义", "漏洞扫描"])
                        break
                    case "合规检测":
                        selectArr.push(["自定义", "合规检测"])
                        break
                    default:
                        selectArr.push([item])
                        break
                }
            })
            form.setFieldsValue({
                scan_type: selectArr
            })
        }
    }, [YakScriptOnlineGroup])

    // 指纹服务是否已经设置
    const [alreadySet, setAlreadySet] = useState<boolean>(false)

    const run = (include: string[], OnlineGroup: string) => {
        setPercent(0)
        const tokens = randomString(40)
        setToken(tokens)
        StartExecBatchYakScriptWithFilter(
            target,
            simpleQueryToFull(
                false,
                {
                    exclude: [],
                    include: include,
                    tags: "",
                    type: "mitm,port-scan,nuclei"
                },
                []
            ),
            tokens,
            undefined,
            undefined,
            OnlineGroup
        )
            .then(() => {
                setExecuting(true)
            })
            .catch((e) => {
                failed(`启动批量安全检测失败：${e}`)
            })
    }

    const onFinish = useMemoizedFn((values) => {
        const {scan_type} = values
        const scan_deep = values.scan_deep || "fast"
        if (!target.target && !target.targetFile) {
            warn("请输入目标或上传目标文件夹绝对路径!")
            return
        }
        if (!Array.isArray(scan_type) || scan_type.length === 0) {
            warn("请选择扫描模式")
            return
        }
        const OnlineGroup: string = scan_type.map((item) => item[item.length - 1]).join(",")
        switch (scan_deep) {
            case "slow":
                alreadySet
                    ? setParams({...getParams(), Mode: "fingerprint", SynConcurrent: 1000})
                    : setParams({...getParams(), Mode: "fingerprint", ProbeMax: 100, SynConcurrent: 1000})
                break
            case "middle":
                alreadySet
                    ? setParams({...getParams(), Mode: "all", SynConcurrent: 1000})
                    : setParams({...getParams(), Mode: "all", ProbeMax: 7, SynConcurrent: 1000})
                break
            case "fast":
                alreadySet
                    ? setParams({...getParams(), Mode: "all", SynConcurrent: 2000})
                    : setParams({...getParams(), Mode: "all", ProbeMax: 3, SynConcurrent: 2000})
                break
        }

        console.log("第二接口所需数据，getParams():", getParams())

        // 当为跳转带参
        if (Array.isArray(openScriptNames)) {
            run(openScriptNames, OnlineGroup)
        } else {
            ipcRenderer
                .invoke("QueryYakScriptByOnlineGroup", {OnlineGroup})
                .then((data: {Data: YakScript[]}) => {
                    const include: string[] = data.Data.map((item) => item.OnlineScriptName)
                    run(include, OnlineGroup)
                })
                .catch((e) => {
                    failed(`查询扫描模式错误:${e}`)
                })
                .finally(() => {})
        }
    })

    const onCancel = useMemoizedFn(() => {
        CancelBatchYakScript(token).then()
    })

    const scanType = (arr: any[]) => {
        if (arr.length > 0) {
            let endItem: any[] = arr[arr.length - 1]
            let lastArr: any[] = arr.length <= 1 ? [] : [...arr].slice(0, arr.length - 1)
            endItem.length > 1 && (lastArr.length === 0 || lastArr[lastArr.length - 1].length > 1)
                ? form.setFieldsValue({
                      scan_type: [...lastArr, endItem]
                  })
                : form.setFieldsValue({
                      scan_type: [endItem]
                  })
        } else {
            form.setFieldsValue({
                scan_type: []
            })
        }
    }

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: any) => {
            try {
                if (data.ProgressMessage) {
                    setPercent(data.ProgressPercent)
                    return
                }
            } catch (e) {
                console.info(e)
            }
        })
        ipcRenderer.on(`${token}-error`, async (e, data) => {
            if(data==="Cancelled on client"){
                return
            }
            failed(`批量执行插件遇到问题: ${data}`)
        })
        ipcRenderer.on(`${token}-end`, async (e) => {
            setTimeout(() => setExecuting(false), 300)
        })
        return () => {
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return (
        <div className={styles["simble-detect-form"]} style={{marginTop: 20}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Spin spinning={false}>
                    <ContentUploadInput
                        type='textarea'
                        beforeUpload={(f) => {
                            const typeArr: string[] = ["text/plain"]
                            if (!typeArr.includes(f.type)) {
                                failed(`${f.name}非txt文件，请上传txt格式文件！`)
                                return false
                            }

                            setTarget({...target, target: "", targetFile: f?.path || ""})
                            return false
                        }}
                        item={{
                            style: {textAlign: "left"},
                            label: "扫描目标:"
                        }}
                        textarea={{
                            isBubbing: true,
                            setValue: (Targets) => {
                                setTarget({...target, target: Targets, targetFile: ""})
                            },
                            value: target.target.length > 0 ? target.target : target.targetFile,
                            rows: 2
                            // placeholder: "内容规则 域名(:端口)/IP(:端口)/IP段，如需批量输入请在此框以逗号分割"
                        }}
                        otherHelpNode={
                            <>
                                <span
                                    onClick={() => {
                                        showDrawer({
                                            title: "设置高级参数",
                                            width: "60%",
                                            content: (
                                                <>
                                                    <ScanPortForm
                                                        isLimitShow={true}
                                                        defaultParams={params}
                                                        setParams={(value) => {
                                                            if (value?.ProbeMax !== getParams().ProbeMax) {
                                                                setAlreadySet(true)
                                                            }
                                                            setParams(value)
                                                        }}
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
                                        showUnfinishedBatchTaskList((task: UnfinishedBatchTask) => {
                                            ipcRenderer.invoke("send-to-tab", {
                                                type: "simble-batch-exec-recover",
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
                                <Button type='primary' htmlType='submit' disabled={executing} loading={loading}>
                                    开始检测
                                </Button>
                            )
                        }
                        uploadHelpText='可将TXT文件拖入框内或'
                    />
                </Spin>
                <Form.Item name='scan_type' label='扫描模式'>
                    <Cascader
                        multiple={true}
                        options={options}
                        placeholder='请选择扫描模式'
                        style={{width: 400}}
                        onChange={scanType}
                        showCheckedStrategy='SHOW_CHILD'
                        dropdownClassName={"simble-detect-dropdown-box"}
                        disabled={Array.isArray(openScriptNames)}
                    />
                </Form.Item>

                <Form.Item name='scan_deep' label='扫描速度'>
                    <Radio.Group defaultValue={"fast"}>
                        <Radio.Button value='fast'>快速探测</Radio.Button>
                        <Radio.Button value='middle'>标准扫描</Radio.Button>
                        <Radio.Button value='slow'>深度扫描</Radio.Button>
                    </Radio.Group>
                </Form.Item>
            </Form>
        </div>
    )
}

export interface SimbleDetectTableProps {
    setPercent: (v: number) => void
    token: string
}

export const SimbleDetectTable: React.FC<SimbleDetectTableProps> = (props) => {
    const {token, setPercent} = props
    const [tableContentHeight, setTableContentHeight] = useState<number>(0)
    const [progressFinished, setProgressFinished] = useState(0)
    const [progressTotal, setProgressTotal] = useState(0)
    const [progressRunning, setProgressRunning] = useState(0)
    const [scanTaskExecutingCount, setScanTaskExecutingCount] = useState(0)

    const [jsonRisks, setJsonRisks, getJsonRisks] = useGetState<Risk[]>([])
    useEffect(() => {
        const logs: TaskResultLog[] = []
        let index = 0
        let removed = false

        ipcRenderer.on(`${token}-data`, async (e, data: ExecBatchYakScriptResult) => {
            // 处理进度信息
            // if (data.ProgressMessage) {
            //     setProgressTotal(data.ProgressTotal || 0)
            //     setProgressRunning(data.ProgressRunning || 0)
            //     setProgressFinished(data.ProgressCount || 0)
            //     setScanTaskExecutingCount(data.ScanTaskExecutingCount || 0)
            //     if (!!setPercent) {
            //         setPercent(data.ProgressPercent || 0)
            //     }
            //     return
            // }

            if (data.Result && data.Result.IsMessage) {
                const info: TaskResultLog = JSON.parse(new Buffer(data.Result.Message).toString())?.content
                if (info) {
                    info.key = index
                    if (info.level === "json-risk") {
                        try {
                            const risk = JSON.parse(info.data) as Risk
                            if (!!risk.RiskType) {
                                setJsonRisks([...getJsonRisks(), risk])
                            }
                        } catch (e) {}
                    }
                    index += 1
                    logs.push(info)
                    if (logs.length > 20) {
                        logs.shift()
                    }
                }
            }
        })

        return () => {
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-end`)
            ipcRenderer.removeAllListeners(`${token}-error`)
        }
    }, [token])

    return (
        <div className={styles["simble-detect-table"]}>
            {/* <div className={styles["result-notice-body"]}>
                <div className={styles["notice-body"]}>
                    <div className={classNames(styles["notice-body-header"], styles["notice-font-in-progress"])}>
                        执行中状态
                    </div>
                    <div className={classNames(styles["notice-body-counter"])}>
                        {progressRunning}进程 / {scanTaskExecutingCount}任务
                    </div>
                </div>
                <Divider type='vertical' className={styles["notice-divider"]} />
                <div className={styles["notice-body"]}>
                    <div className={classNames(styles["notice-body-header"], styles["notice-font-completed"])}>
                        已结束/总进程
                    </div>
                    <div className={classNames(styles["notice-body-counter"])}>
                        {progressFinished}/{progressTotal}
                    </div>
                </div>
                <Divider type='vertical' className={styles["notice-divider"]} />
                <div className={styles["notice-body"]}>
                    <div className={classNames(styles["notice-body-header"], styles["notice-font-vuln"])}>
                        命中风险/漏洞
                    </div>
                    <div className={classNames(styles["notice-body-counter"])}>{jsonRisks.length}</div>
                </div>
            </div>

            <Divider style={{margin: 4}} /> */}

            <div className={styles["result-table-body"]}>
                <div style={{width: "100%", height: "100%"}}>
                    <ReactResizeDetector
                        onResize={(width, height) => {
                            if (!width || !height) return
                            setTableContentHeight(height - 4)
                        }}
                        handleWidth={true}
                        handleHeight={true}
                        refreshMode={"debounce"}
                        refreshRate={50}
                    />
                    <RisksViewer risks={jsonRisks} tableContentHeight={tableContentHeight} />
                </div>
            </div>
        </div>
    )
}

export interface SimbleDetectProps {
    Uid?: string
    BaseProgress?: number
    YakScriptOnlineGroup?: string
}

export const SimbleDetect: React.FC<SimbleDetectProps> = (props) => {
    const {Uid, BaseProgress, YakScriptOnlineGroup} = props
    console.log("Uid-BaseProgress", Uid, BaseProgress, YakScriptOnlineGroup)
    const [percent, setPercent] = useState(0)
    const [executing, setExecuting] = useState<boolean>(false)
    const [token, setToken] = useState(randomString(20))
    const [loading, setLoading] = useState<boolean>(false)

    const [target, setTarget] = useState<TargetRequest>(defTargetRequest)
    // 打开新页面任务参数
    const [openScriptNames, setOpenScriptNames] = useState<string[]>()
    useEffect(() => {
        if (BaseProgress !== undefined && BaseProgress > 0) {
            setPercent(BaseProgress)
        }
    }, [BaseProgress])

    useEffect(() => {
        if (Uid) {
            setLoading(true)
            ipcRenderer
                .invoke("GetExecBatchYakScriptUnfinishedTaskByUid", {
                    Uid
                })
                .then((req: {ScriptNames: string[]; Target: string}) => {
                    const {Target, ScriptNames} = req
                    // setQuery({include: ScriptNames, type: "mitm,port-scan,nuclei", exclude: [], tags: ""})
                    setTarget({...target, target: Target})
                    setOpenScriptNames(ScriptNames)
                })
                .catch((e) => {
                    console.info(e)
                })
                .finally(() => setTimeout(() => setLoading(false), 600))
        }
    }, [Uid])

    if (loading) {
        return <Spin tip={"正在恢复未完成的任务"} />
    }

    return (
        <AutoCard
            title={null}
            size={"small"}
            bordered={false}
            extra={
                <Space>
                    {(percent > 0 || executing) && (
                        <div style={{width: 200}}>
                            <Progress
                                status={executing ? "active" : undefined}
                                percent={parseInt((percent * 100).toFixed(0))}
                            />
                        </div>
                    )}
                </Space>
            }
            bodyStyle={{display: "flex", flexDirection: "column", padding: "0 5px", overflow: "hidden"}}
        >
            <SimbleDetectForm
                executing={executing}
                setPercent={setPercent}
                setExecuting={setExecuting}
                token={token}
                setToken={setToken}
                target={target}
                setTarget={setTarget}
                openScriptNames={openScriptNames}
                YakScriptOnlineGroup={YakScriptOnlineGroup}
            />
            {/* <Divider style={{margin: 4}} /> */}
            <div style={{flex: "1", overflow: "hidden"}}>
                <SimbleDetectTable token={token} setPercent={setPercent} />
            </div>
        </AutoCard>
    )
}
