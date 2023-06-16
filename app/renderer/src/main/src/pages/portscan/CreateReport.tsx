import React, {useEffect, useRef, useState} from "react"
import {Button, Input, Modal, Progress} from "antd"
import {useGetState} from "ahooks"
import styles from "./CreateReport.module.scss"
import {warn} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {ExecResult} from "../invoker/schema"
import {CreatReportScript} from "../simpleDetect/CreatReportScript"
import {v4 as uuidv4} from "uuid"
import {InfoState} from "@/hook/useHoldingIPCRStream"
import {Route} from "@/routes/routeSpec"
const {ipcRenderer} = window.require("electron")
export interface CreateReportProps {
    loading: boolean
    infoState: InfoState
    runPluginCount: number
    allowDownloadReport: boolean
    setAllowDownloadReport: (v: boolean) => void
}
export const CreateReport: React.FC<CreateReportProps> = (props) => {
    const {loading, infoState, runPluginCount, allowDownloadReport, setAllowDownloadReport} = props

    // 下载报告Modal
    const [reportModalVisible, setReportModalVisible] = useState<boolean>(false)
    const [reportName, setReportName] = useState<string>("默认报告名称")
    const [reportLoading, setReportLoading] = useState<boolean>(false)
    const [_, setReportId, getReportId] = useGetState<number>()
    // 是否允许更改TaskName
    const isSetTaskName = useRef<boolean>(true)
    // 报告生成进度
    const [reportPercent, setReportPercent] = useState(0)
    // 报告token
    const [reportToken, setReportToken] = useState(randomString(40))
    // 是否展示报告生成进度
    const [showReportPercent, setShowReportPercent] = useState<boolean>(false)
    useEffect(() => {
        if (!reportModalVisible) {
            setReportLoading(false)
            setShowReportPercent(false)
            ipcRenderer.invoke("cancel-ExecYakCode", reportToken)
        }
    }, [reportModalVisible])
    /** 通知生成报告 */
    const creatReport = () => {
        setReportId(undefined)
        setReportModalVisible(true)
    }
    /** 获取生成报告返回结果 */
    useEffect(() => {
        ipcRenderer.on(`${reportToken}-data`, (e, data: ExecResult) => {
            if (data.IsMessage) {
                // console.log("获取生成报告返回结果", new Buffer(data.Message).toString())
                const obj = JSON.parse(new Buffer(data.Message).toString())
                console.log(obj)
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

    useEffect(() => {
        // 报告生成成功
        if (getReportId()) {
            setReportLoading(false)
            setShowReportPercent(false)
            setReportPercent(0)
            setReportModalVisible(false)
            ipcRenderer.invoke("open-user-manage", Route.DB_Report)
            setTimeout(() => {
                ipcRenderer.invoke("simple-open-report", getReportId())
            }, 300)
        }
    }, [getReportId()])

    /** 获取扫描主机数 扫描端口数 */
    const getCardForId = (id: string) => {
        const item = infoState.statusState.filter((item) => item.tag === id)
        if (item.length > 0) {
            return item[0].info[0].Data
        }
        return null
    }
    /** 下载报告 */
    const downloadReport = () => {
        // 获取最新的唯一标识UUID
        const uuid: string = uuidv4()
        // 脚本数据
        const scriptData = CreatReportScript
        const runTaskNameEx = reportName + "-" + uuid
        let Params = [
            {Key: "task_name", Value: runTaskNameEx},
            {Key: "runtime_id", Value: getCardForId("RuntimeIDFromRisks")},
            {Key: "report_name", Value: reportName},
            {Key: "plugins", Value: runPluginCount},
            {Key: "host_total", Value: getCardForId("扫描主机数")},
            {Key: "ping_alive_host_total", Value: getCardForId("Ping存活主机数")},
            {Key: "port_total", Value: getCardForId("扫描端口数")}
        ]
        const reqParams = {
            Script: scriptData,
            Params
        }
        ipcRenderer.invoke("ExecYakCode", reqParams, reportToken)
    }
    return (
        <div>
            {!loading && allowDownloadReport ? (
                <div className={styles["hole-text"]} onClick={creatReport}>
                    生成报告
                </div>
            ) : (
                <div className={styles["disable-hole-text"]}>生成报告</div>
            )}
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
}
