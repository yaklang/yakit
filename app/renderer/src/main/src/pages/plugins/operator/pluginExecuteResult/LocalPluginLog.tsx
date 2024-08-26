import {LogLevelToCode} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {YakitLogFormatter} from "@/pages/invoker/YakitLogFormatter"
import {Timeline} from "antd"
import React from "react"

export interface LocalPluginLogList extends StreamResult.Log {
    id: string
}
export interface LocalPluginLogProps {
    loading: boolean
    list: LocalPluginLogList[]
}
export const LocalPluginLog: React.FC<LocalPluginLogProps> = React.memo((props) => {
    const {loading, list} = props
    return (
        <div>
            <Timeline reverse={true} pending={loading} style={{marginTop: 10, marginBottom: 10}}>
                {list.map((e, index) => {
                    return (
                        <Timeline.Item key={e.id} color={LogLevelToCode(e.level)}>
                            <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp} onlyTime={true} />
                        </Timeline.Item>
                    )
                })}
            </Timeline>
        </div>
    )
})
