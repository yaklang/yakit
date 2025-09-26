import {HoldGRPCStreamProps} from "./useHoldGRPCStreamType"
import i18n from "@/i18n/i18n"

/** @name 插件执行结果默认展示的tab集合 */
export const DefaultTabs: () => HoldGRPCStreamProps.InfoTab[] = () => {
    const zh = i18n.language === "zh"
    return [
        {tabName: zh ? "HTTP 流量" : "HTTP traffic", type: "http"},
        {tabName: zh ? "漏洞与风险" : "Vulnerabilities and risks", type: "risk"},
        {tabName: zh ? "日志" : "Log", type: "log"},
        {tabName: "Console", type: "console"}
    ]
}
