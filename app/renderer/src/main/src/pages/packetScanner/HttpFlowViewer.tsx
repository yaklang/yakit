import React, {useEffect, useState} from "react";
import {HTTPPacketEditor} from "@/utils/editors";
import {List, Space} from "antd";
import {HTTPFlow} from "@/components/HTTPFlowTable";

const {ipcRenderer} = window.require("electron");

export interface HttpFlowViewerProp {
    ids: number[]
}

export const HttpFlowViewer: React.FC<HttpFlowViewerProp> = React.memo((props) => {
    const {ids} = props;

    if (ids.length === 1) {
        return <SingleHttpFlowViewer id={ids[0]}/>
    }

    return <MultiHttpFlowViewer ids={ids}/>
});

interface MultiHttpFlowViewerProp {
    ids: number[]
}

const MultiHttpFlowViewer: React.FC<MultiHttpFlowViewerProp> = React.memo((props) => {
    const [flows, setFlows] = useState<HTTPFlow[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true)
        ipcRenderer.invoke("QueryHTTPFlowByIds", {
            Ids: props.ids,
        }).then((rsp: { Data: HTTPFlow[] }) => {
            setFlows(rsp?.Data || [])
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }, [props.ids])

    return <List<HTTPFlow>
        pagination={false}
        size={"small"}
        loading={loading}
        dataSource={flows}
        renderItem={data => {
            return <List.Item id={`${data.Id}`}>
                {data.Id}
            </List.Item>
        }}
    >

    </List>
});

interface SingleHttpFlowViewerProps {
    id: number
}

const SingleHttpFlowViewer: React.FC<SingleHttpFlowViewerProps> = React.memo(props => {
    const [flow, setFlow] = useState<HTTPFlow>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true)
        ipcRenderer.invoke("GetHTTPFlowById", {Id: props.id}).then(flow => {
            setFlow(flow)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }, [props.id])

    return (
        <HTTPPacketEditor
            loading={loading}
            noHex={true}
            hideSearch={true}
            readOnly={true}
            originValue={flow?.Request || new Uint8Array}
            extra={(
                <Space>

                </Space>
            )}
        />
    )
})