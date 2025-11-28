import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {FC, useMemo} from "react"
import styles from "../knowledgeBase.module.scss"
import classNames from "classnames"
import {success} from "@/utils/notification"
import {KnowledgeBaseTableProps} from "./KnowledgeBaseTable"

interface PluginExecuteDetailDrawerProps {
    buildingDrawer: {
        visible: boolean
        streamToken?: string | undefined
    }
    onCloseViewBuildProcess: () => void
    streams: KnowledgeBaseTableProps["streams"]
    title: string
}

const PluginExecuteDetailDrawer: FC<PluginExecuteDetailDrawerProps> = (props) => {
    const {buildingDrawer, streams} = props

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
            success("知识条目已生成完成")
            props.onCloseViewBuildProcess()
        }
    }, [buildingDrawer.streamToken, streams])
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
        </YakitDrawer>
    )
}

export {PluginExecuteDetailDrawer}
