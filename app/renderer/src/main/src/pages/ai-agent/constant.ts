import {YakitSideTabProps} from "@/components/yakitSideTab/YakitSideTabType"

export enum AITabsEnum {
    Task_Content = "task-content",
    File_System = "file-system",
    HTTP = "http",
    Risk = "risk"
}
/** @name AI 默认展示的tab集合 */
export const AITabs: YakitSideTabProps["yakitTabs"] = [
    {label: "任务内容", value: AITabsEnum.Task_Content},
    // {label: "更新文件系统", value: AITabsEnum.File_System},
    {label: "HTTP 流量", value: AITabsEnum.HTTP},
    {label: "漏洞与风险", value: AITabsEnum.Risk}
]
