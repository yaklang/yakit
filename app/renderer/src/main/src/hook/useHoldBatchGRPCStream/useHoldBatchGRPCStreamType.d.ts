import {HybridScanInputTarget, HybridScanPluginConfig, HybridScanResponse} from "../../models/HybridScan"
import {HoldGRPCStreamParams} from "../useHoldGRPCStream/useHoldGRPCStream"

export interface HoldBatchGRPCStreamParams extends HoldGRPCStreamParams {
    /**获取输入值 */
    onGetInputValue?: (params: HybridScanInputValueProps) => void
}
export interface PluginBatchExecutorResult extends HybridScanResponse {}

export interface HybridScanInputValueProps {
    InputTarget?: HybridScanInputTarget
    PluginConfig?: HybridScanPluginConfig
}
