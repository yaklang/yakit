import {HoldGRPCStreamProps} from "./useHoldGRPCStreamType"

/** @name 插件执行结果默认展示的tab集合 */
export const DefaultTabs: HoldGRPCStreamProps.InfoTab[] = [
    {tabName: "HTTP 流量", type: "http"},
    {tabName: "漏洞与风险", type: "risk"},
    {tabName: "日志", type: "log"},
    {tabName: "Console", type: "console"}
]
