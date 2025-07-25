import {ReactNode} from "react"
import {AIForge} from "../ai-agent/type/aiChat"
import {SolidCollectionPluginIcon, SolidYakitPluginIcon} from "@/assets/icon/colors"

/** @name forge-类型 */
export const DefaultForgeTypeList: {key: AIForge["ForgeType"]; name: string; icon: ReactNode; color: string}[] = [
    {key: "yak", name: "Yak模板", icon: <SolidYakitPluginIcon />, color: "warning"},
    {key: "config", name: "简易模板", icon: <SolidCollectionPluginIcon />, color: "cyan"}
]

/** @name forge-tag预设选项 */
export const AIForgeBuiltInTag: string[] = [
    "加密技术支持",
    "模拟黑客攻击",
    "处理安全事件",
    "主动检测网络威胁",
    "渗透测试",
    "技术支持",
    "生活助手",
    "通用助手",
    "数据分析",
    "逻辑推理",
    "娱乐",
    "日志分析"
]

/** @name forge-yak类型默认源码 */
export const DefaultForgeYakToCode = `forgeHandle = func(params) {

}`
/** @name forge-config类型默认源码 */
export const DefaultForgeConfigToCode = `query = cli.String("query", cli.setRequired(true), cli.setHelp("query"))
cli.check()`
