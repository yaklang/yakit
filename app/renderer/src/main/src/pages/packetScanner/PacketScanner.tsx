import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"

export const execPacketScan = (params: {
    httpFlowIds: number[]
    https: boolean
    request?: Uint8Array
    value: {Keyword?: string; Verbose: string}
}) => {
    const {httpFlowIds, value, https} = params
    const {Keyword, Verbose} = value
    execPacketScanWithNewTab({
        httpFlowIds,
        https,
        request: new Uint8Array(),
        keyword: Keyword || "",
        verbose: Verbose
    })
}

export const execPacketScanFromRaw = (
    https: boolean,
    request: Uint8Array,
    value: {Keyword?: string; Verbose: string}
) => {
    const {Keyword, Verbose} = value
    execPacketScanWithNewTab({httpFlowIds: [], https, request, keyword: Keyword || "", verbose: Verbose})
}

export const execPacketScanWithNewTab = (params: {
    httpFlowIds: number[] | string[]
    https: boolean
    request?: Uint8Array
    keyword: string
    verbose: string
}) => {
    const {httpFlowIds, https, request = new Uint8Array(), keyword, verbose} = params
    // keyword为undefined的时候去批量执行页面，有值去poc页面并需选中关键词组
    if (keyword) {
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.PoC,
                params: {
                    type: 2,
                    request,
                    https,
                    httpFlowIds,
                    selectGroupListByKeyWord: !!verbose ? [verbose] : []
                }
            })
        )
    } else {
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.BatchExecutorPage,
                params: {
                    request,
                    https,
                    httpFlowIds
                }
            })
        )
    }
}
