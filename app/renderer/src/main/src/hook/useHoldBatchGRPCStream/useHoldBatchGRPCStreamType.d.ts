import {HybridScanControlAfterRequest, HybridScanInputTarget, HybridScanPluginConfig, HybridScanResponse} from "../../models/HybridScan"
import {HoldGRPCStreamParams} from "../useHoldGRPCStream/useHoldGRPCStream"
import {HoldGRPCStreamInfo, StreamResult} from "../useHoldGRPCStream/useHoldGRPCStreamType"

export type TaskStatus = "executing" | "paused" | "done" | "error" | "default"
export interface HoldBatchGRPCStreamParams extends HoldGRPCStreamParams {
    /**获取输入值 */
    onGetInputValue?: (params: HybridScanControlAfterRequest) => void
    setTaskStatus?: (s: TaskStatus) => void
}
export interface PluginBatchExecutorResult extends HybridScanResponse {
    Status: TaskStatus
}

export interface BatchHoldGRPCStreamInfo extends HoldGRPCStreamInfo {
    pluginExecuteLog: StreamResult.PluginExecuteLog[]
}
