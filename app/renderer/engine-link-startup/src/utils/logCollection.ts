import { yakitLogs } from './electronBridge'

/** 打开引擎日志文件所在文件夹 */
export const grpcOpenEngineLogFolder = () => {
  yakitLogs.openEngineLog()
}

/** 打开渲染端错误收集日志文件所在文件夹 */
export const grpcOpenRenderLogFolder = () => {
  yakitLogs.openRenderLog()
}

/** 打开主动输出信息的日志文件所在文件夹 */
export const grpcOpenPrintLogFolder = () => {
  yakitLogs.openPrintLog()
}

/** 主动输出信息到信息日志的方法 */
export const debugToPrintLog = (msg: any) => {
  try {
    yakitLogs.debugPrintLog(`${msg || ''}`)
  } catch (error) {}
}
