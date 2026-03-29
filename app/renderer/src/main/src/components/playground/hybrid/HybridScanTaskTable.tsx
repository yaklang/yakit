import React, {useEffect, useState} from "react";
import {Risk} from "@/pages/risks/schema";
import {Paging} from "@/utils/yakQueryHTTPFlow";
import {DemoVirtualTable} from "@/demoComponents/virtualTable/VirtualTable";
import {
    HybridScanActiveTask,
    HybridScanControlRequest,
    HybridScanResponse,
    HybridScanStatisticResponse,
    HybridScanTask
} from "@/models/HybridScan";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {AutoCard} from "@/components/AutoCard";
import {Divider, Space} from "antd";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {randomString} from "@/utils/randomUtil";
import {failed, info} from "@/utils/notification";
import {useGetState, useMemoizedFn} from "ahooks";
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces";

export interface HybridScanTaskTableProp {

}

const {ipcRenderer} = window.require("electron");

export const HybridScanTaskTable: React.FC<HybridScanTaskTableProp> = (props) => {
    const {t} = useI18nNamespaces(["playground"])
    const [selected, setSelected] = React.useState<HybridScanTask>();
    const [token, setToken] = useState(randomString(40))
    const [loading, setLoading] = useState(false)

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
            failed(t("HybridScanTaskTable.error", {error: String(error)}))
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            setLoading(false)
            info(t("HybridScanTaskTable.finished"))
        })
        return () => {
            ipcRenderer.invoke("cancel-HybridScan", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    const cancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-HybridScan", token)
    })

    return <YakitResizeBox
        firstNode={<DemoVirtualTable<HybridScanTask>
            columns={[
                {headerTitle: t("HybridScanTaskTable.id"), key: "Id", width: 80, colRender: i => i.Id},
                {headerTitle: t("HybridScanTaskTable.taskId"), key: "Title", width: 300, colRender: i => i.TaskId},
                {headerTitle: t("HybridScanTaskTable.status"), key: "Status", width: 300, colRender: i => i.Status},
            ]}
            rowClick={item => {
                setSelected(item)
            }}
            loadMore={(data: HybridScanTask | undefined) => {
                return new Promise((resolve, reject) => {
                    if (!data) {
                        // info("加载初始化数据")
                        ipcRenderer.invoke("QueryHybridScanTask", {
                            Pagination: {Limit: 10, Page: 1, OrderBy: 'id', Order: "asc"}, // genDefaultPagination(),
                            FromId: 0,
                        }).then((rsp: {
                            Data: HybridScanTask[],
                        }) => {
                            resolve({
                                data: rsp.Data,
                            })
                            return
                        })
                        return
                    } else {
                        ipcRenderer.invoke("QueryHybridScanTask", {
                            Pagination: {Limit: 10, Page: 1, OrderBy: 'id', Order: "asc"},
                            FromId: data.Id,
                        }).then((rsp: {
                            Data: HybridScanTask[],
                            Total: number,
                            Pagination: Paging,
                        }) => {
                            resolve({
                                data: rsp.Data,
                            })
                            return
                        })
                        return
                    }
                })
            }}
            rowKey={"TaskId"}
            isScrollUpdate={true}
        />}
        secondNode={selected ? <AutoCard
            size={"small"} title={t("HybridScanTaskTable.taskTitle", {taskId: selected?.TaskId})}
            extra={<Space>
                <YakitTag>{selected?.Status}</YakitTag>
                <YakitButton
                    disabled={loading} onClick={() => {
                    ipcRenderer.invoke("HybridScan", {
                        Control: true, HybridScanMode: "resume", ResumeTaskId: selected?.TaskId,
                    } as HybridScanControlRequest, token).then(() => {
                        setLoading(true)
                    })
                }}>{t("HybridScanTaskTable.startTask")}</YakitButton>
                <YakitButton
                    disabled={!loading} danger={true}
                    onClick={() => {
                        cancel()
                    }}
                >{t("HybridScanTaskTable.stopTask")}</YakitButton>
            </Space>}
        >
            <Space direction={"vertical"}>
                <Space>
                    <YakitTag>{t("HybridScanTaskTable.totalTargets")}: {status.TotalTargets}</YakitTag>
                    <YakitTag>{t("HybridScanTaskTable.finishedTargets")}: {status.FinishedTargets}</YakitTag>
                    <YakitTag>{t("HybridScanTaskTable.activeTargets")}: {status.ActiveTargets}</YakitTag>
                    <YakitTag>{t("HybridScanTaskTable.totalTasks")}: {status.TotalTasks}</YakitTag>
                    <YakitTag>{t("HybridScanTaskTable.activeTasks")}: {status.ActiveTasks}</YakitTag>
                    <YakitTag>{t("HybridScanTaskTable.finishedTasks")}: {status.FinishedTasks}</YakitTag>
                </Space>
                <Divider/>
                <Space direction={"vertical"}>
                    {activeTasks.map(i => {
                        return <YakitTag key={i.Index}>{i.Index}: [{i.PluginName}] {t("HybridScanTaskTable.target")}: {i.Url}</YakitTag>
                    })}
                </Space>
            </Space>
        </AutoCard> : t("HybridScanTaskTable.selectTask")}
    />
};
