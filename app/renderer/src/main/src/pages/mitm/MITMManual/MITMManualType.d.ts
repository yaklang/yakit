import {ManualHijackType, PackageType} from "@/defaultConstants/mitmV2"
import {ManualHijackListStatusType, SingleManualHijackInfoMessage} from "../MITMHacker/utils"
import {TraceInfo} from "../MITMPage"
import {RenderTypeOptionVal} from "@/utils/editors"

export interface MITMManualRefProps {
    onBatchDiscardData: () => void
    onBatchSubmitData: () => void
    onBatchHijackingResponse: () => void
    /**全部放行 */
    onSubmitAllData: () => void
}
export interface MITMManualProps {
    ref?: React.ForwardedRef<MITMManualRefProps>
    downstreamProxyStr: string
    /**劫持的数据 */
    manualHijackList: SingleManualHijackInfoMessage[]
    /**当前数据对应的操作类型 */
    manualHijackListAction: ManualHijackListAction
    /**劫持类型 */
    autoForward: ManualHijackTypeProps
    /**切换劫持类型 */
    handleAutoForward: (v: ManualHijackTypeProps) => void
    /**更改表total */
    setManualTableTotal: (v: number) => void
    /**更改表选中数 */
    setManualTableSelectNumber: (v: number) => void
    /**是否只看响应 */
    isOnlyLookResponse: boolean
}
export interface ManualHijackInfoRefProps {
    /**提交数据 */
    onSubmitData: (s: SingleManualHijackInfoMessage) => void
    /**劫持响应 */
    onHijackingResponse: (s: SingleManualHijackInfoMessage) => void
}
export interface ManualHijackInfoProps {
    ref?: React.ForwardedRef<ManualHijackInfoRefProps>
    /**当前选中的数据数组下标 */
    index?: number
    /**滚动到数据下标位置 */
    onScrollTo: (i: number) => void
    info: SingleManualHijackInfoMessage
    /**切换劫持类型 */
    handleAutoForward: (v: ManualHijackTypeProps) => void
    /**丢弃数据 */
    onDiscardData: (s: SingleManualHijackInfoMessage) => void
    loading?: boolean
    setLoading: (b: boolean) => void
    /**是否只看响应 */
    isOnlyLookResponse: boolean
}

export type ManualHijackTypeProps = `${ManualHijackType}`
export type PackageTypeProps = `${PackageType}`
export interface MITMV2ManualEditorProps {
    /**修改的包 */
    modifiedPacket: string
    setModifiedPacket: (s: string) => void
    /**当前请求包的详情 */
    currentPacketInfo: CurrentPacketInfoProps
    /**是否可操作 */
    disabled: boolean
    /**当前操作记录详情 */
    info: SingleManualHijackInfoMessage
    /**丢弃数据 */
    onDiscardData: (s: SingleManualHijackInfoMessage) => void
    /**提交数据 */
    onSubmitData: (s: SingleManualHijackInfoMessage) => void
    /**当前选中的数据数组下标 */
    index?: number
    /**滚动到数据下标位置 */
    onScrollTo?: (i: number) => void
    /**切换劫持类型 */
    handleAutoForward: (v: ManualHijackTypeProps) => void
    /**劫持响应 */
    onHijackingResponse: (s: SingleManualHijackInfoMessage) => void

    /**美化&渲染 */
    typeOptionVal?: RenderTypeOptionVal
    onTypeOptionVal?: (s?: RenderTypeOptionVal) => void

    type: PackageTypeProps
    setType: (v: PackageTypeProps) => void
}

export interface CurrentPacketInfoProps {
    /**当前记录的请求包 */
    requestPacket: string
    /**根据状态设置对应的包 */
    currentPacket: string
    TaskId: string
    isHttp: boolean
    traceInfo: TraceInfo
}
