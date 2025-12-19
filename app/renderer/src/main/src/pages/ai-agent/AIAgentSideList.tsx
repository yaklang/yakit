import React, {ReactNode, useEffect, useState} from "react"
import {useControllableValue, useMemoizedFn} from "ahooks"
import {AiAgentTabList, AIAgentTabListEnum, SwitchAIAgentTabEventEnum} from "./defaultConstant"
import {AIAgentSideListProps, AIAgentTriggerEventInfo} from "./aiAgentType"
import emiter from "@/utils/eventBus/eventBus"

import classNames from "classnames"
import styles from "./AIAgentSideList.module.scss"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"

const AIChatSetting = React.lazy(() => import("./AIChatSetting/AIChatSetting"))
const ForgeName = React.lazy(() => import("./forgeName/ForgeName"))
const AIToolList = React.lazy(() => import("./aiToolList/AIToolList"))
const AIModelList = React.lazy(() => import("./aiModelList/AIModelList"))
const HistoryChat = React.lazy(() => import("./historyChat/HistoryChat"))
const AIMCP = React.lazy(() => import("./aiMCP/AIMCP"))

export const AIAgentSideList: React.FC<AIAgentSideListProps> = (props) => {
    // const {} = props
    const [active, setActive] = useState<AIAgentTabListEnum>(AIAgentTabListEnum.History)
    const [show, setShow] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "show",
        trigger: "setShow"
    })
    const handleSetActive = useMemoizedFn((value: AIAgentTabListEnum) => {
        setActive(value)
    })

    useEffect(() => {
        emiter.on("switchAIAgentTab", onSwitchAIAgentTab)
        return () => {
            emiter.off("switchAIAgentTab", onSwitchAIAgentTab)
        }
    }, [])

    const onSwitchAIAgentTab = useMemoizedFn((data: string) => {
        try {
            const info: Omit<AIAgentTriggerEventInfo, "type"> & {type: `${SwitchAIAgentTabEventEnum}`} =
                JSON.parse(data)
            const {type, params} = info
            if (!params) return
            switch (type) {
                case SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE:
                    setActive(params.active as AIAgentTabListEnum)
                    setShow(params.show !== false)
                    break
                case SwitchAIAgentTabEventEnum.SET_TAB_SHOW:
                    setShow(params.show !== false)
                    break
                default:
                    break
            }
        } catch (error) {}
    })

    const renderTabContent = useMemoizedFn((key: AIAgentTabListEnum) => {
        let content: ReactNode = <></>
        switch (key) {
            case AIAgentTabListEnum.History:
                content = (
                    <React.Suspense>
                        <HistoryChat />
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
                yakitTabs={AiAgentTabList}
                activeKey={active}
                onActiveKey={(v) => handleSetActive(v as AIAgentTabListEnum)}
                className={styles["tab-wrap"]}
                show={show}
                setShow={setShow}
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
