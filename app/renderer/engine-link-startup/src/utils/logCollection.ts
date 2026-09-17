import { ipc } from '../../../../shared/communication/window-client'
/** 打开引擎日志文件所在文件夹 */
export const grpcOpenEngineLogFolder = () => {
  ipc.invoke('local', 'open-engine-log', {})
}

/** 打开渲染端错误收集日志文件所在文件夹 */
export const grpcOpenRenderLogFolder = () => {
  ipc.invoke('local', 'open-render-log', {})
}

/** 打开主动输出信息的日志文件所在文件夹 */
export const grpcOpenPrintLogFolder = () => {
  ipc.invoke('local', 'open-print-log', {})
}

/** 主动输出信息到信息日志的方法 */
export const debugToPrintLog = (msg: any) => {
  try {
    ipc.invoke('local', 'debug-print-log', `${msg || ''}`)
  } catch (error) {}
}
