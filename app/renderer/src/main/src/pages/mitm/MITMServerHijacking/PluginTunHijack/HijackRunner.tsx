import {useEffect, useState} from "react"
import usePluginTunHijack from "./usePluginTunHijack"
import {useThrottleEffect} from "ahooks"

export interface HijackTask {
    // 单个劫持
    pid?: number
    // 如若用进程名劫持则响应会有PIDS
    pids?: number[]
    // 进程名
    pName: string
    // 服务是否在加载中
    loading: boolean
    // 进程数
    processesNum?: string
}

function HijackRunner({
    deviceName,
    task,
    onStop,
    onTaskStatus
}: {
    deviceName: string
    task: HijackTask
    onStop: (pid: number | string) => void
    onTaskStatus: (task: HijackTask) => void
}) {
    const [runtimeId, setRuntimeId] = useState<string>("")
    const [hijackProcess, hijackProcessActions] = usePluginTunHijack({
        PluginName: "劫持进程",
        setRuntimeId: (rId) => {
            setRuntimeId(rId)
        }
    })

    useEffect(() => {
        let ExecParams = [
            {Key: "name", Value: deviceName},
            {Key: "pName", Value: task.pName}
        ]
        if (task?.pid) {
            ExecParams.push({Key: "pid", Value: String(task.pid)})
        }
        setRuntimeId("")
        hijackProcessActions.startPluginTunHijack({
            ExecParams
        })
        return () => {
            hijackProcessActions.cancelPluginTunHijackById()
            onStop(task.pid || task.pName)
        }
    }, [task.pid])

    useThrottleEffect(
        () => {
            try {
                const processesNum = hijackProcess.streamInfo.cardState.filter(
                    (item) => item.tag === "监控劫持进程数"
                )?.[0]?.info?.[0]?.Data
                let cache: Partial<HijackTask> = {}
                if (typeof processesNum === "string" && task.processesNum !== processesNum) {
                    cache.processesNum = processesNum
                }
                const logState = hijackProcess.streamInfo.logState
                if (logState.length > 0) {
                    let data = logState?.[0].data
                    if (typeof data === "string" && data.startsWith("start watch process") && task.loading) {
                        cache.loading = false
                    }
                    if (!task.pid) {
                        let newPids = logState
                            .map((log) => {
                                let {data} = log
                                if (typeof data === "string" && data.startsWith("start watch process")) {
                                    const match = data.match(/\d+/)
                                    const pid = match ? Number(match[0]) : null
                                    return pid
                                }
                            })
                            .filter((pid) => !!pid) as number[]
                        if (newPids.length > 0 && task.pids?.length !== newPids.length) {
                            cache.pids = newPids
                        }
                    }
                }
                if (Object.keys(cache).length > 0) {
                    onTaskStatus({...task, ...cache})
                }
            } catch (error) {}
        },
        [hijackProcess.streamInfo],
        {
            wait: 500
        }
    )

    return null
}

export function HijackRunnerPool({
    deviceName,
    tasks,
    onTaskStop,
    onTaskStatus
}: {
    deviceName: string
    tasks: HijackTask[]
    onTaskStop: (pid: number | string) => void
    onTaskStatus: (task: HijackTask) => void
}) {
    return (
        <>
            {tasks.map((task) => (
                <HijackRunner
                    key={`${task?.pid}-${task.pName}`}
                    deviceName={deviceName}
                    task={task}
                    onStop={onTaskStop}
                    onTaskStatus={onTaskStatus}
                />
            ))}
        </>
    )
}