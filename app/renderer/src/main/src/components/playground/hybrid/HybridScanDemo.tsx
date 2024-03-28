import React, {useEffect, useState} from "react";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {
    HybridScanActiveTask,
    HybridScanControlRequest,
    HybridScanInputTarget,
    HybridScanPluginConfig,
    HybridScanResponse,
    HybridScanStatisticResponse
} from "@/models/HybridScan";
import {ExecResult, genDefaultPagination} from "@/pages/invoker/schema";
import {Divider, Space, Tag} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {randomString} from "@/utils/randomUtil";
import {failed, info} from "@/utils/notification";
import {useCookieState, useGetState, useMap} from "ahooks";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";

export interface HybridScanDemoProp {

}


const {ipcRenderer} = window.require("electron");

export const HybridScanDemo: React.FC<HybridScanDemoProp> = (props) => {
    const [token, setToken] = useState(randomString(40))
    const [loading, setLoading] = useState(false);

    const [target, setTarget] = React.useState<HybridScanInputTarget>({
        Input: `http://www.example.com/`, InputFile: [],
        HTTPRequestTemplate: {
            IsHttps: false, IsRawHTTPRequest: false, RawHTTPRequest: new Uint8Array(),
            Method: "GET", Path: ["/"], GetParams: [], Headers: [], Cookie: [],
            Body: new Uint8Array(), PostParams: [], MultipartParams: [], MultipartFileParams: [],IsHttpFlowId:false,
            HTTPFlowId:[]
        },
    })
    const [plugin, setPlugin] = React.useState<HybridScanPluginConfig>({
        PluginNames: ["基础 XSS 检测", "开放 URL 重定向漏洞"],
        Filter: {Pagination: genDefaultPagination() /* Pagination is ignore for hybrid scan */}
    })

    const [status, setStatus] = React.useState<HybridScanStatisticResponse>({
        ActiveTargets: 0,
        ActiveTasks: 0,
        FinishedTargets: 0,
        FinishedTasks: 0,
        HybridScanTaskId: "",
        TotalPlugins: 0,
        TotalTargets: 0,
        TotalTasks: 0
    })
    const [activeTasks, setActiveTasks, getActiveTasks] = useGetState<HybridScanActiveTask[]>([]);

    useEffect(() => {
        setActiveTasks([])
        ipcRenderer.on(`${token}-data`, async (e, data: HybridScanResponse) => {
            setStatus(data)

            if (!!data?.UpdateActiveTask) {
                if (data.UpdateActiveTask.Operator === "remove") {
                    setActiveTasks(getActiveTasks().filter((v) => {
                        if (data?.UpdateActiveTask !== undefined) {
                            return v.Index !== data?.UpdateActiveTask.Index
                        }
                        return true
                    }))
                } else if (data.UpdateActiveTask.Operator === "create") {
                    setActiveTasks([...getActiveTasks(), data.UpdateActiveTask])
                }
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[HybridScan] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[HybridScan] finished")
            setLoading(false)
        })
        return () => {
            ipcRenderer.invoke("cancel-HybridScan", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return <YakitResizeBox
        firstRatio={"350px"}
        firstMinSize={"280px"}
        firstNode={<AutoCard title={"设置参数"} size={"small"} extra={<div>
            <YakitButton disabled={loading} onClick={() => {
                ipcRenderer.invoke("HybridScan", {
                    Control: true, HybridScanMode: "new",
                } as HybridScanControlRequest, token).then(() => {
                    info(`启动成功，任务ID: ${token}`)
                    setLoading(true)

                    // send target / plugin
                    ipcRenderer.invoke("HybridScan", {
                        Targets: target,
                        Plugin: plugin,
                    }, token).then(() => {
                        info("发送扫描目标与插件成功")
                    })
                })
            }}>启动</YakitButton>
            <YakitButton danger={true} disabled={!loading} onClick={() => {
                ipcRenderer.invoke("cancel-HybridScan", token)
                setTimeout(() => {
                    setToken(randomString(40))
                }, 100)
            }}>
                停止任务
            </YakitButton>
        </div>}>
            <Space direction={"vertical"}>
                <div>默认INPUT: {target.Input}</div>
                <div>插件启用：</div>
                {plugin.PluginNames.map(i => {
                    return <Tag>{i}</Tag>
                })}
            </Space>
        </AutoCard>}
        secondNode={<AutoCard title={"执行结果"} size={"small"}>
            <Space direction={"vertical"}>
                <Space>
                    <YakitTag>{"总目标"}: {status.TotalTargets}</YakitTag>
                    <YakitTag>{"已完成目标"}: {status.FinishedTargets}</YakitTag>
                    <YakitTag>{"正在执行的目标"}: {status.ActiveTargets}</YakitTag>
                    <YakitTag>{"总任务量"}: {status.TotalTasks}</YakitTag>
                    <YakitTag>{"正在执行的任务"}: {status.ActiveTasks}</YakitTag>
                    <YakitTag>{"已经完成的任务"}: {status.FinishedTasks}</YakitTag>
                </Space>
                <Divider/>
                <Space direction={"vertical"}>
                    {activeTasks.map(i => {
                        return <YakitTag>{i.Index}: [{i.PluginName}] 执行目标: {i.Url}</YakitTag>
                    })}
                </Space>
            </Space>
        </AutoCard>}
    />
};