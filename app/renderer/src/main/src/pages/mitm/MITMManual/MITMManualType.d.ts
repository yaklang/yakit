import {ManualHijackType} from "@/defaultConstants/mitmV2"
import {ManualHijackListStatusType, SingleManualHijackInfoMessage} from "../MITMHacker/utils"
import {TraceInfo} from "../MITMPage"

export interface MITMManualProps {
    downstreamProxyStr: string
    /**劫持的数据 */
    manualHijackList: SingleManualHijackInfoMessage[]
    /**当前数据对应的操作类型 */
    manualHijackListAction: ManualHijackListAction
    /**劫持类型 */
    autoForward: ManualHijackTypeProps
    /**切换劫持类型 */
    handleAutoForward: (v: ManualHijackTypeProps) => void
}
export interface ManualHijackInfoRefProps {
    /**提交数据 */
    onSubmitData: (s: SingleManualHijackInfoMessage) => void
    /**mitm 转发 */
    onHijackingForward: (s: SingleManualHijackInfoMessage) => void
}
export interface ManualHijackInfoProps {
    ref?: React.ForwardedRef<ManualHijackInfoRefProps>
    /**当前选中的数据数组下标 */
    index?: number
    /**滚动到数据下标位置 */
    onScrollTo: (i: number) => void
    info: SingleManualHijackInfoMessage
    /**劫持类型 */
    autoForward: ManualHijackTypeProps
    /**切换劫持类型 */
    handleAutoForward: (v: ManualHijackTypeProps) => void
    /**丢弃数据 */
    onDiscardData: (s: SingleManualHijackInfoMessage) => void
}

export type ManualHijackTypeProps = `${ManualHijackType}`

export interface MITMV2ManualEditorProps {
    /**修改的包 */
    modifiedPacket: string
    setModifiedPacket: (s: string) => void
    /**当前请求包的详情 */
    currentPacketInfo: CurrentPacketInfoProps
    /**是否为响应包 */
    isResponse: boolean
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
    /**mitm 转发 */
    onHijackingForward: (s: SingleManualHijackInfoMessage) => void
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
