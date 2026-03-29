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
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces";

export interface HybridScanDemoProp {

}


const {ipcRenderer} = window.require("electron");

export const HybridScanDemo: React.FC<HybridScanDemoProp> = (props) => {
    const {t} = useI18nNamespaces(["playground"])
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
        PluginNames: [t("HybridScanDemo.xss"), t("HybridScanDemo.openRedirect")],
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
            failed(t("HybridScanDemo.error", {error: String(error)}))
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info(t("HybridScanDemo.finished"))
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
        firstNode={<AutoCard title={t("HybridScanDemo.configure")} size={"small"} extra={<div>
            <YakitButton disabled={loading} onClick={() => {
                ipcRenderer.invoke("HybridScan", {
                    Control: true, HybridScanMode: "new",
                } as HybridScanControlRequest, token).then(() => {
                    info(t("HybridScanDemo.startSuccess", {token}))
                    setLoading(true)

                    // send target / plugin
                    ipcRenderer.invoke("HybridScan", {
                        Targets: target,
                        Plugin: plugin,
                    }, token).then(() => {
                    info(t("HybridScanDemo.sendTargetsSuccess"))
                    })
                })
            }}>{t("HybridScanDemo.start")}</YakitButton>
            <YakitButton danger={true} disabled={!loading} onClick={() => {
                ipcRenderer.invoke("cancel-HybridScan", token)
                setTimeout(() => {
                    setToken(randomString(40))
                }, 100)
            }}>
                {t("HybridScanDemo.stopTask")}
            </YakitButton>
        </div>}>
            <Space direction={"vertical"}>
                <div>{t("HybridScanDemo.defaultInput")} {target.Input}</div>
                <div>{t("HybridScanDemo.pluginsEnabled")}</div>
                {plugin.PluginNames.map(i => {
                    return <Tag key={i}>{i}</Tag>
                })}
            </Space>
        </AutoCard>}
        secondNode={<AutoCard title={t("HybridScanDemo.results")} size={"small"}>
            <Space direction={"vertical"}>
                <Space>
                    <YakitTag>{t("HybridScanDemo.totalTargets")}: {status.TotalTargets}</YakitTag>
                    <YakitTag>{t("HybridScanDemo.finishedTargets")}: {status.FinishedTargets}</YakitTag>
                    <YakitTag>{t("HybridScanDemo.activeTargets")}: {status.ActiveTargets}</YakitTag>
                    <YakitTag>{t("HybridScanDemo.totalTasks")}: {status.TotalTasks}</YakitTag>
                    <YakitTag>{t("HybridScanDemo.activeTasks")}: {status.ActiveTasks}</YakitTag>
                    <YakitTag>{t("HybridScanDemo.finishedTasks")}: {status.FinishedTasks}</YakitTag>
                </Space>
                <Divider/>
                <Space direction={"vertical"}>
                    {activeTasks.map(i => {
                        return <YakitTag key={i.Index}>{i.Index}: [{i.PluginName}] {t("HybridScanDemo.target")}: {i.Url}</YakitTag>
                    })}
                </Space>
            </Space>
        </AutoCard>}
    />
};
