import {DownloadingState} from "@/yakitGVDefine"

/** @name 处理进度条数据(防止异常数据) */
export const safeFormatDownloadProcessState = (state: DownloadingState) => {
    try {
        // 使用可选链操作符来安全地访问深层次属性，如果不存在，则默认为0
        const total = state.size?.total || 0
        const transferred = state.size?.transferred || 0
        const elapsed = state.time?.elapsed || 0
        const remaining = state.time?.remaining || 0

        return {
            percent: state.percent || 0,
            size: {total, transferred},
            speed: state.speed || 0,
            time: {elapsed, remaining}
        }
    } catch (e) {
        return {
            percent: 0,
            size: {total: 0, transferred: 0},
            speed: 0,
            time: {elapsed: 0, remaining: 0}
        }
    }
}
