import {HoldGRPCStreamProps} from "./useHoldGRPCStreamType"

export const DefaultTabs: HoldGRPCStreamProps.InfoTab[] = [
    {tabName: "HTTP 流量", type: "http"},
    {tabName: "日志", type: "log"},
    {tabName: "漏洞与风险", type: "risk"},
    {tabName: "Console", type: "console"}
]
