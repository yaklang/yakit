import React, {ReactNode, useEffect, useRef, useState} from "react"
import {useCreation, useMemoizedFn} from "ahooks"
import {AIAgentTabListEnum} from "./defaultConstant"
import {AIAgentSideListProps, AIAgentTriggerEventInfo} from "./aiAgentType"
import emiter from "@/utils/eventBus/eventBus"

import classNames from "classnames"
import styles from "./AIAgentSideList.module.scss"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {
    OutlineChipIcon,
    OutlineCogIcon,
    OutlineMCPIcon,
    OutlineSparklesIcon,
    OutlineTemplateIcon,
    OutlineWrenchIcon
} from "@/assets/icon/outline"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"

const AIChatSetting = React.lazy(() => import("./AIChatSetting/AIChatSetting"))
const ForgeName = React.lazy(() => import("./forgeName/ForgeName"))
const AIToolList = React.lazy(() => import("./aiToolList/AIToolList"))
const AIModelList = React.lazy(() => import("./aiModelList/AIModelList"))
const HistoryChat = React.lazy(() => import("./historyChat/HistoryChat"))
const AIMCP = React.lazy(() => import("./aiMCP/AIMCP"))

export const AIAgentSideList: React.FC<AIAgentSideListProps> = (props) => {
    // const {} = props
    const [active, setActive] = useState<AIAgentTabListEnum>(AIAgentTabListEnum.History)
    const [aiAgentTabList, setAiAgentTabList] = useState<YakitTabsProps[]>([
        {value: AIAgentTabListEnum.History, label: () => "历史会话", icon: <OutlineSparklesIcon />, show: true},
        {value: AIAgentTabListEnum.Setting, label: () => "配置", icon: <OutlineCogIcon />, show: false},
        {value: AIAgentTabListEnum.Forge_Name, label: () => "模板", icon: <OutlineTemplateIcon />, show: false},
        {value: AIAgentTabListEnum.Tool, label: () => "工具", icon: <OutlineWrenchIcon />, show: false},
        {value: AIAgentTabListEnum.AI_Model, label: () => "AI模型", icon: <OutlineChipIcon />, show: false},
        {value: AIAgentTabListEnum.MCP, label: "MCP", icon: <OutlineMCPIcon />, show: false}
    ])
    const handleSetActive = useMemoizedFn((value: AIAgentTabListEnum) => {
        setActive(value)
    })
    const show = useCreation(() => {
        return aiAgentTabList.find((ele) => ele.value === active)?.show !== false
    }, [aiAgentTabList, active])

    const switchAIAgentTab = useMemoizedFn((value: AIAgentTabListEnum) => {
        setAiAgentTabList((prev) => {
            prev.forEach((i) => {
                if (i.value === value) {
                    i.show = true
                } else {
                    i.show = false
                }
            })
            return [...prev]
        })
        handleSetActive(value)
    })

    useEffect(() => {
        emiter.on("switchAIAgentTab", switchAIAgentTab)
        return () => {
            emiter.off("switchAIAgentTab", switchAIAgentTab)
        }
    }, [])

    /** 向对话框组件进行事件触发的通信 */
    const onEmiter = useMemoizedFn((key: string) => {
        const info: AIAgentTriggerEventInfo = {type: ""}
        switch (key) {
            case "new-chat":
                info.type = "new-chat"

                break
            default:
                break
        }
        if (info.type) emiter.emit("onReActChatEvent", JSON.stringify(info))
    })
    const renderTabContent = useMemoizedFn((key: AIAgentTabListEnum) => {
        let content: ReactNode = <></>
        switch (key) {
            case AIAgentTabListEnum.History:
                content = (
                    <React.Suspense>
                        <HistoryChat
                            onNewChat={() => {
                                onEmiter("new-chat")
                            }}
                        />
                    </React.Suspense>
                )
                break
            case AIAgentTabListEnum.Setting:
                content = (
                    <React.Suspense>
                        <AIChatSetting />
                    </React.Suspense>
                )
                break
            case AIAgentTabListEnum.Forge_Name:
                content = (
                    <React.Suspense>
                        <ForgeName />
                    </React.Suspense>
                )
                break
            case AIAgentTabListEnum.Tool:
                content = (
                    <React.Suspense>
                        <AIToolList />
                    </React.Suspense>
                )
                break
            case AIAgentTabListEnum.AI_Model:
                content = (
                    <React.Suspense>
                        <AIModelList />
                    </React.Suspense>
                )
                break
            case AIAgentTabListEnum.MCP:
                content = (
                    <React.Suspense>
                        <AIMCP />
                    </React.Suspense>
                )
                break
            default:
                break
        }
        return content
    })
    return (
        <div className={styles["ai-agent-side-list"]}>
            <YakitSideTab
                type='vertical'
                yakitTabs={aiAgentTabList}
                setYakitTabs={setAiAgentTabList}
                activeKey={active}
                onActiveKey={(v) => handleSetActive(v as AIAgentTabListEnum)}
                className={styles["tab-wrap"]}
            >
                <div
                    className={classNames(styles["tab-content"], {
                        [styles["tab-content-hidden"]]: !show
                    })}
                >
                    {renderTabContent(active)}
                </div>
            </YakitSideTab>
        </div>
    )
}
