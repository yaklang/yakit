import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {FC, useMemo} from "react"
import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {success} from "@/utils/notification"
import {KnowledgeBaseTableProps} from "./KnowledgeBaseTable"
import {RoundedStopButton} from "@/pages/ai-re-act/aiReActChat/AIReActComponent"
import {KnowledgeBaseTableHeaderProps} from "./KnowledgeBaseTableHeader"
import {apiCancelDebugPlugin} from "@/pages/plugins/utils"
import {useKnowledgeBase} from "../hooks/useKnowledgeBase"

interface PluginExecuteDetailDrawerProps {
    buildingDrawer: {
        visible: boolean
        streamToken?: string | undefined
        type: string
        // "historyGenerate" | "routine"
    }
    onCloseViewBuildProcess: () => void
    streams: KnowledgeBaseTableProps["streams"]
    title: string
    api: KnowledgeBaseTableHeaderProps["api"]
    knowledgeBaseItems: KnowledgeBaseTableHeaderProps["knowledgeBaseItems"]
}

const PluginExecuteDetailDrawer: FC<PluginExecuteDetailDrawerProps> = (props) => {
    const {buildingDrawer, streams, knowledgeBaseItems} = props
    const {editKnowledgeBase} = useKnowledgeBase()

    const resultPluginExecuteResult = useMemo(() => {
        if (buildingDrawer.streamToken && streams && streams[buildingDrawer.streamToken]) {
            return (
                <PluginExecuteResult
                    streamInfo={streams[buildingDrawer.streamToken]}
                    runtimeId={streams[buildingDrawer.streamToken]?.runtimeId ?? ""}
                    loading={streams[buildingDrawer.streamToken]?.loading ?? false}
                    defaultActiveKey='日志'
                />
            )
        } else {
            props.onCloseViewBuildProcess()
        }
    }, [buildingDrawer.streamToken, streams])

    const onStop = async () => {
        if (buildingDrawer.streamToken) {
            props.api?.removeStream(buildingDrawer.streamToken)
            props.onCloseViewBuildProcess()
            await apiCancelDebugPlugin(buildingDrawer.streamToken)
            if (buildingDrawer.type === "routine") {
                editKnowledgeBase(knowledgeBaseItems.ID, {
                    ...knowledgeBaseItems,
                    streamstep: "success",
                    streamToken: ""
                })
            } else {
                editKnowledgeBase(knowledgeBaseItems.ID, {
                    ...knowledgeBaseItems,
                    historyGenerateKnowledgeList: knowledgeBaseItems.historyGenerateKnowledgeList.filter(
                        (it) => it.token !== buildingDrawer.streamToken
                    )
                })
            }
        }
    }

    return (
        <YakitDrawer
            visible={buildingDrawer.visible}
            onClose={props.onCloseViewBuildProcess}
            title={props.title}
            width='80%'
            footer={null}
            className={classNames(styles["plugin-execute-detail-drawer"])}
        >
            {resultPluginExecuteResult}
            <RoundedStopButton
                style={{
                    position: "absolute",
                    right: "24px",
                    transform: "translateY(12px)"
                }}
                onClick={() => onStop()}
            />
        </YakitDrawer>
    )
}

export {PluginExecuteDetailDrawer}
