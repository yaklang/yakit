import React, {ReactNode, useEffect, useRef, useState} from "react"
import {
    Space,
    Tag,
    Progress,
    Divider,
    Form,
    Input,
    Button,
    Cascader,
    Spin,
    Radio,
    Popconfirm,
    Tabs,
    Timeline,
    Modal,
    Row,
    Col
} from "antd"
import {AutoCard} from "@/components/AutoCard"
import styles from "./SimbleDetect.module.scss"
import {Route} from "@/routes/routeSpec"
import classNames from "classnames"
import {ContentUploadInput} from "@/components/functionTemplate/ContentUploadTextArea"
import {failed, info, success, warn} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {TaskResultLog} from "../invoker/batch/BatchExecuteByFilter"
import {defTargetRequest, TargetRequest, CancelBatchYakScript} from "../invoker/batch/BatchExecutorPage"
import {ExecBatchYakScriptResult} from "../invoker/batch/YakBatchExecutorLegacy"
import {showUnfinishedBatchTaskList, UnfinishedBatchTask} from "../invoker/batch/UnfinishedBatchTaskList"
import {useCreation, useDebounce, useGetState, useMemoizedFn} from "ahooks"
import {Risk} from "../risks/schema"
import {showDrawer, showModal} from "../../utils/showModal"
import {ScanPortForm, PortScanParams, defaultPorts} from "../portscan/PortScanPage"
import {ExecResult, YakScript} from "../invoker/schema"
import {useStore} from "@/store"
import {DownloadOnlinePluginByTokenRequest, DownloadOnlinePluginAllResProps} from "@/pages/yakitStore/YakitStorePage"
import {OpenPortTableViewer} from "../portscan/PortTable"
import {PluginResultUI} from "../yakitStore/viewers/base"
import moment from "moment"
import CreatReportScript from "./CreatReportScript"
import useHoldingIPCRStream, {InfoState} from "../../hook/useHoldingIPCRStream"
import {ExtractExecResultMessageToYakitPort, YakitPort} from "../../components/yakitLogSchema"
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
    sendTarget?: string
    executing: boolean
    target: TargetRequest
    openScriptNames: string[] | undefined
    YakScriptOnlineGroup?: string
    isDownloadPlugin: boolean
    baseProgress?: number
    TaskName?: string
    setRunTaskName: (v: string) => void
    setRunTimeStamp: (v: number) => void
    setRunPluginCount: (v: number) => void
    reset: () => void
}
export const SimbleDetectForm: React.FC<SimbleDetectFormProps> = (props) => {
    const {
        setPercent,
        setExecuting,
        token,
        sendTarget,
        executing,
        target,
        openScriptNames,
        YakScriptOnlineGroup,
        isDownloadPlugin,
        baseProgress,
        TaskName,
        setRunTaskName,
        setRunTimeStamp,
        setRunPluginCount,
        reset
    } = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [uploadLoading, setUploadLoading] = useState(false)

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
        ScriptNames: openScriptNames || [],
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

    useEffect(() => {
        if (TaskName) {
            form.setFieldsValue({
                TaskName: TaskName || "漏洞扫描任务"
            })
        }
    }, [TaskName])

    const run = (OnlineGroup: string, TaskName: string) => {
        setPercent(0)
        // 时间戳生成
        const timeStamp: number = moment(new Date()).unix()
        setRunTimeStamp(timeStamp)
        setRunPluginCount(params.ScriptNames.length)

        reset()
        console.log("params11----", getParams())
        setRunTaskName(TaskName)
        setExecuting(true)
        ipcRenderer.invoke("PortScan", params, token)

        // StartExecBatchYakScriptWithFilter(
        //     target,
        //     simpleQueryToFull(
        //         false,
        //         {
        //             exclude: [],
        //             include: include,
        //             tags: "",
        //             type: "mitm,port-scan,nuclei"
        //         },
        //         []
        //     ),
        //     tokens,
        //     baseProgress ? true : undefined,
        //     baseProgress,
        //     OnlineGroup,
        //     TaskName
        // )
        //     .then(() => {
        // setExecuting(true)
        // setRunTaskName(TaskName)
        //     })
        //     .catch((e) => {
        //         failed(`启动批量安全检测失败：${e}`)
        //     })
    }

    const onFinish = useMemoizedFn((values) => {
        const {scan_type, TaskName} = values
        const scan_deep = values.scan_deep || "fast"
        if (!params.Targets && !params.TargetsFile) {
            warn("需要设置扫描目标")
            return
        }
        if (!Array.isArray(scan_type) || scan_type.length === 0) {
            warn("请选择扫描模式")
            return
        }
        if (TaskName.length === 0) {
            warn("请输入任务名称")
            return
        }
        const OnlineGroup: string = scan_type.map((item) => item[item.length - 1]).join(",")

        // 当为跳转带参
        if (Array.isArray(openScriptNames)) {
            run(OnlineGroup, TaskName)
        } else {
            ipcRenderer
                .invoke("QueryYakScriptByOnlineGroup", {OnlineGroup})
                .then((data: {Data: YakScript[]}) => {
                    const ScriptNames: string[] = data.Data.map((item) => item.OnlineScriptName)
                    setParams({...getParams(), ScriptNames})
                    run(OnlineGroup, TaskName)
                })
                .catch((e) => {
                    failed(`查询扫描模式错误:${e}`)
                })
                .finally(() => {})
        }
    })

    const onCancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-PortScan", token)
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

    // useEffect(() => {
    //     ipcRenderer.on(`${token}-data`, async (e, data: any) => {
    //         try {
    //             if (data.ProgressMessage) {
    //                 setPercent(data.ProgressPercent)
    //                 return
    //             }
    //         } catch (e) {
    //             console.info(e)
    //         }
    //     })
    //     ipcRenderer.on(`${token}-error`, async (e, data) => {
    //         if (data === "Cancelled on client") {
    //             return
    //         }
    //         failed(`批量执行插件遇到问题: ${data}`)
    //     })
    //     ipcRenderer.on(`${token}-end`, async (e) => {
    //         setTimeout(() => setExecuting(false), 300)
    //     })
    //     return () => {
    //         ipcRenderer.removeAllListeners(`${token}-data`)
    //         ipcRenderer.removeAllListeners(`${token}-error`)
    //         ipcRenderer.removeAllListeners(`${token}-end`)
    //     }
    // }, [token])

    return (
        <div className={styles["simble-detect-form"]} style={{marginTop: 20}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Spin spinning={uploadLoading}>
                    <ContentUploadInput
                        type='textarea'
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
                            ipcRenderer.invoke("fetch-file-content", (f as any).path).then((res) => {
                                let Targets = res
                                // 处理Excel格式文件
                                if (f.type !== "text/plain") {
                                    let str = JSON.stringify(res)
                                    Targets = str.replace(/(\[|\]|\{|\}|\")/g, "")
                                }
                                setParams({...params, Targets})
                                setTimeout(() => setUploadLoading(false), 100)
                            })
                            return false
                        }}
                        item={{
                            style: {textAlign: "left"},
                            label: "扫描目标:"
                        }}
                        textarea={{
                            isBubbing: true,
                            setValue: (Targets) => setParams({...params, Targets}),
                            value: params.Targets,
                            rows: 1,
                            placeholder: "域名/主机/IP/IP段均可，逗号分隔或按行分割"
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
                                <Button type='primary' htmlType='submit' disabled={isDownloadPlugin} loading={loading}>
                                    开始检测
                                </Button>
                            )
                        }
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

                <Form.Item name='TaskName' label='任务名称'>
                    <Input style={{width: 400}} placeholder='请输入任务名称' allowClear />
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
    token: string
    executing: boolean
    runTaskName?: string
    runTimeStamp?: number
    runPluginCount?: number
    infoState: InfoState
    setExecuting: (v: boolean) => void
}

export const SimbleDetectTable: React.FC<SimbleDetectTableProps> = (props) => {
    const {token, executing, runTaskName, runTimeStamp, runPluginCount, infoState, setExecuting} = props

    const [openPorts, setOpenPorts] = useState<YakitPort[]>([])
    const openPort = useRef<YakitPort[]>([])

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let messageJsonRaw = Buffer.from(data.Message).toString("utf8")
                    let logInfo = ExtractExecResultMessageToYakitPort(JSON.parse(messageJsonRaw))
                    if (!logInfo) return

                    if (logInfo.isOpen) {
                        openPort.current.unshift(logInfo)
                    } else {
                        // closedPort.current.unshift(logInfo)
                    }
                } catch (e) {
                    failed("解析端口扫描结果失败...")
                }
            }
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[PortScan] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            info("[PortScan] finished")
            setExecuting(false)
        })

        const syncPorts = () => {
            if (openPort.current) setOpenPorts([...openPort.current])
            // if (closedPort.current) setClosedPorts([...closedPort.current])
        }

        syncPorts()
        let id = setInterval(syncPorts, 1000)
        return () => {
            clearInterval(id)
            ipcRenderer.invoke("cancel-PortScan", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])
    /** 通知软件打开管理页面 */
    const openMenu = () => {
        ipcRenderer.invoke("open-user-manage", Route.DB_Risk)
    }
    /** 通知生成报告 */
    const creatReport = () => {
        // 脚本数据
        const scriptData = CreatReportScript()
        console.log("脚本数据", scriptData)
        console.log("TaskName", runTaskName)
        console.log("include数量", runPluginCount)
        console.log("时间戳", runTimeStamp)
        Modal.success({
            content: "报告生成成功，请跳转至报告页查看"
        })
    }
    return (
        <div className={styles["simble-detect-table"]}>
            <div className={styles["result-table-body"]}>
                <Tabs
                    className='scan-port-tabs'
                    tabBarStyle={{marginBottom: 5}}
                    tabBarExtraContent={
                        <div>
                            {runTimeStamp && (
                                <>
                                    {!executing ? (
                                        <div className={styles["hole-text"]} onClick={creatReport}>
                                            生成报告
                                        </div>
                                    ) : (
                                        <div className={styles["disable-hole-text"]}>生成报告</div>
                                    )}
                                </>
                            )}
                            <div className={styles["hole-text"]} onClick={openMenu}>
                                查看完整漏洞
                            </div>
                        </div>
                    }
                >
                    <Tabs.TabPane tab={"扫描端口列表"} key={"scanPort"} forceRender>
                        <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
                            <Row style={{marginTop: 6}} gutter={6}>
                                <Col span={24}>
                                    <OpenPortTableViewer data={openPorts} />
                                </Col>
                            </Row>
                        </div>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab={"插件日志"} key={"pluginPort"} forceRender>
                        <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
                            <PluginResultUI
                                loading={false}
                                progress={[]}
                                results={infoState.messageState}
                                risks={infoState.riskState}
                                featureType={infoState.featureTypeState}
                                feature={infoState.featureMessageState}
                                statusCards={infoState.statusState}
                            />
                        </div>
                    </Tabs.TabPane>
                </Tabs>
            </div>
        </div>
    )
}

interface DownloadAllPluginProps {
    type?: "modal" | "default"
    setDownloadPlugin?: (v: boolean) => void
    onClose?: () => void
}

export const DownloadAllPlugin: React.FC<DownloadAllPluginProps> = (props) => {
    const {setDownloadPlugin, onClose} = props
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
        let addParams: DownloadOnlinePluginByTokenRequest = {isAddToken: true, BindMe: false}
        ipcRenderer
            .invoke("DownloadOnlinePluginAll", addParams, taskToken)
            .then(() => {})
            .catch((e) => {
                failed(`添加失败:${e}`)
            })
    })
    const StopAllPlugin = () => {
        onClose && onClose()
        setAddLoading(false)
        ipcRenderer.invoke("cancel-DownloadOnlinePluginAll", taskToken).catch((e) => {
            failed(`停止添加失败:${e}`)
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
        </div>
    )
}

export interface SimbleDetectProps {
    Uid?: string
    BaseProgress?: number
    YakScriptOnlineGroup?: string
    TaskName?: string
}

export const SimbleDetect: React.FC<SimbleDetectProps> = (props) => {
    const {Uid, BaseProgress, YakScriptOnlineGroup, TaskName} = props
    // console.log("Uid-BaseProgress", Uid, BaseProgress, YakScriptOnlineGroup, TaskName)
    const [percent, setPercent] = useState(0)
    const [executing, setExecuting] = useState<boolean>(false)
    const [token, setToken] = useState(randomString(20))
    const [loading, setLoading] = useState<boolean>(false)

    const [target, setTarget] = useState<TargetRequest>(defTargetRequest)
    // 打开新页面任务参数
    const [openScriptNames, setOpenScriptNames] = useState<string[]>()

    const [isDownloadPlugin, setDownloadPlugin] = useState<boolean>(false)

    // 点击运行任务的最新TaskName
    const [runTaskName, setRunTaskName] = useState<string>()
    // 获取运行任务时间戳
    const [runTimeStamp, setRunTimeStamp] = useState<number>()
    // 获取运行任务插件数
    const [runPluginCount, setRunPluginCount] = useState<number>()

    const [infoState, {reset}] = useHoldingIPCRStream(
        "scan-port",
        "PortScan",
        token,
        () => {},
        () => {},
        (obj, content) => content.data.indexOf("isOpen") > -1 && content.data.indexOf("port") > -1
    )

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
                    {percent > 0 || executing ? (
                        <div style={{width: 200}}>
                            <Progress
                                status={executing ? "active" : undefined}
                                percent={parseInt((percent * 100).toFixed(0))}
                            />
                        </div>
                    ) : (
                        <DownloadAllPlugin setDownloadPlugin={setDownloadPlugin} />
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
                target={target}
                openScriptNames={openScriptNames}
                YakScriptOnlineGroup={YakScriptOnlineGroup}
                isDownloadPlugin={isDownloadPlugin}
                baseProgress={BaseProgress}
                TaskName={TaskName}
                setRunTaskName={setRunTaskName}
                setRunTimeStamp={setRunTimeStamp}
                setRunPluginCount={setRunPluginCount}
                reset={reset}
            />
            <Divider style={{margin: 4}} />

            <div style={{flex: "1", overflow: "hidden"}}>
                <SimbleDetectTable
                    token={token}
                    executing={executing}
                    runTaskName={runTaskName}
                    runTimeStamp={runTimeStamp}
                    runPluginCount={runPluginCount}
                    infoState={infoState}
                    setExecuting={setExecuting}
                />
            </div>
        </AutoCard>
    )
}
