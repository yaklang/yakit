import React, {useRef, useState} from "react"
import {QueryRisksRequest} from "../YakitRiskTable/YakitRiskTableType"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {Progress} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {randomString} from "@/utils/randomUtil"
import {ExpandAndRetractExcessiveState} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {useCreation} from "ahooks"
import {apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {yakitNotify} from "@/utils/notification"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {KVPair} from "@/models/kv"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
const {ipcRenderer} = window.require("electron")

export const onCreateRiskReportModal = (createRiskReportContent: CreatRiskReportContentProps) => {
    const m = showYakitModal({
        title: "下载报告",
        footer: null,
        content: <CreatRiskReportContent onCancel={() => m.destroy()} {...createRiskReportContent} />,
        onCancel: () => {
            m.destroy()
        },
        bodyStyle: {padding: 24}
    })
}

interface CreatRiskReportContentProps {
    ids: number[]
    riskTableQuery: QueryRisksRequest
    onCancel?: () => void
}
const CreatRiskReportContent: React.FC<CreatRiskReportContentProps> = React.memo((props) => {
    const {ids, riskTableQuery, onCancel} = props
    const [reportName, setReportName] = useState<string>("")

    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const tokenRef = useRef<string>(randomString(40))
    const isErrorRef = useRef<boolean>(false)
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setTimeout(() => {
                setExecuteStatus("finished")
            }, 300)

            if (!isErrorRef.current) {
                emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.DB_Report}))
                setTimeout(() => {
                    ipcRenderer.invoke("simple-open-report")
                }, 300)
                if (onCancel) onCancel()
            } else {
                isErrorRef.current = false
            }
        },
        onError: () => {
            isErrorRef.current = true
        }
    })

    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        return false
    }, [executeStatus])

    const downloadReport = () => {
        grpcFetchLocalPluginDetail({Name: "导出漏洞报告"}, true)
            .then((plugin) => {
                let ExecParams: KVPair[] = [
                    {
                        Key: "report_name",
                        Value: reportName
                    },
                    {
                        Key: "query_filter",
                        Value: JSON.stringify({})
                    }
                ]
                if (ids.length) {
                    ExecParams.push({
                        Key: "ids",
                        Value: ids.join(",")
                    })
                } else {
                    ExecParams = ExecParams.map((item) => {
                        if (item.Key === "query_filter") {
                            const {Title, TagList, Search, RiskTypeList, Network, IPList, SeverityList} = riskTableQuery

                            item.Value = JSON.stringify({
                                Title,
                                Severity: SeverityList?.join(",") || "",
                                Search,
                                RiskType: RiskTypeList?.join(",") || "",
                                Network: Network || IPList?.join(",") || "",
                                Tag: TagList?.join(",") || ""
                            })
                        }
                        return item
                    })
                }

                let executeParams: DebugPluginRequest = {
                    Code: "",
                    PluginType: plugin.Type,
                    Input: "",
                    HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                    ExecParams: ExecParams,
                    PluginName: plugin.ScriptName
                }

                debugPluginStreamEvent.reset()

                apiDebugPlugin({
                    params: executeParams,
                    token: tokenRef.current,
                    pluginCustomParams: plugin.Params
                }).then(() => {
                    setExecuteStatus("process")
                    debugPluginStreamEvent.start()
                })
            })
            .catch(() => {
                yakitNotify("info", "找不到Yak 原生插件：导出漏洞报告")
            })
    }
    return (
        <div>
            <div style={{textAlign: "center"}}>
                <YakitInput
                    placeholder='请输入漏洞报告名称'
                    allowClear
                    value={reportName}
                    onChange={(e) => {
                        setReportName(e.target.value)
                    }}
                />
                {streamInfo.progressState.length === 1 && (
                    <Progress
                        strokeColor='#F28B44'
                        trailColor='#F0F2F5'
                        percent={Math.trunc(streamInfo.progressState[0].progress * 100)}
                        format={(percent) => `${percent}%`}
                        style={{marginTop: 12}}
                    />
                )}
            </div>
            <div style={{marginTop: 20, textAlign: "right"}}>
                <YakitButton
                    style={{marginRight: 8}}
                    onClick={() => {
                        debugPluginStreamEvent.stop()
                        if (onCancel) onCancel()
                    }}
                    type='outline2'
                >
                    取消
                </YakitButton>
                <YakitButton
                    disabled={!reportName.length}
                    loading={isExecuting}
                    type={"primary"}
                    onClick={() => {
                        downloadReport()
                    }}
                >
                    确定
                </YakitButton>
            </div>
        </div>
    )
})