import {HybridScanInputTarget, HybridScanPluginConfig, HybridScanResponse} from "../../models/HybridScan"
import {HoldGRPCStreamParams} from "../useHoldGRPCStream/useHoldGRPCStream"
import {HoldGRPCStreamInfo, StreamResult} from "../useHoldGRPCStream/useHoldGRPCStreamType"

export interface HoldBatchGRPCStreamParams extends HoldGRPCStreamParams {
    /**获取输入值 */
    onGetInputValue?: (params: string) => void
}
export interface PluginBatchExecutorResult extends HybridScanResponse {}

export interface BatchHoldGRPCStreamInfo extends HoldGRPCStreamInfo {
    pluginExecuteLog: StreamResult.PluginExecuteLog[]
}
