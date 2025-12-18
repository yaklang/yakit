import { useEffect } from "react"
import usePluginTunHijack from "./usePluginTunHijack"

export interface HijackTask {
  pid: number
  pName: string
}

function HijackRunner({
  deviceName,
  task,
  onStop
}: {
  deviceName: string
  task: HijackTask
  onStop: (pid: number) => void
}) {
  const [, hijackProcessActions] = usePluginTunHijack({
    PluginName: "劫持进程"
  })

  useEffect(() => {
    hijackProcessActions.startPluginTunHijack({
      ExecParams: [
        { Key: "name", Value: deviceName },
        { Key: "pName", Value: task.pName },
        { Key: "pid", Value: String(task.pid) }
      ]
    })

    return () => {
      hijackProcessActions.cancelPluginTunHijackById()
      onStop(task.pid)
    }
  }, [task.pid])

  return null
}


export function HijackRunnerPool({
  deviceName,
  tasks,
  onTaskStop
}: {
  deviceName: string
  tasks: HijackTask[]
  onTaskStop: (pid: number) => void
}) {
  return (
    <>
      {tasks.map((task) => (
        <HijackRunner
          key={task.pid}
          deviceName={deviceName}
          task={task}
          onStop={onTaskStop}
        />
      ))}
    </>
  )
}