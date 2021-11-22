import React, {useEffect, useRef, useState} from "react";
import {ResizableBox} from "react-resizable";
import "react-resizable/css/styles.css"
import {Card, Space} from "antd";
import {HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable";
import {HTTPFlowDetailMini} from "./HTTPFlowDetail";

export interface HTTPPacketFuzzable {
    sendToWebFuzzer?: (isHttps: boolean, request: string) => any
}

export interface HTTPHistoryProp extends HTTPPacketFuzzable {

}

export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const containerDiv = useRef(null);
    const [maxWidth, setMaxWidth] = useState(500);
    const [selected, setSelectedHTTPFlow] = useState<HTTPFlow>();
    const [tableHeight, setTableHeight] = useState(400);
    const [outterTableHeight, setOutterTableHeight] = useState(600);

    const tableOffset = 80;

    useEffect(() => {
        const div = containerDiv.current;
        if (!div) {
            return
        }
        const divTag = div as HTMLDivElement;
        const setHeightAndWidth = () => {
            setMaxWidth(divTag.clientWidth)
        }

        setHeightAndWidth()
        let origin = window.onresize;
        window.onresize = (e) => {
            setHeightAndWidth();
            // @ts-ignore
            if (origin) origin(e);
        };
        return () => {
            // clearInterval(id)
            window.onresize = origin;
        }
    }, [containerDiv])

    useEffect(() => {
    }, [selected])


    return <div style={{width: "100%", height: "100%"}} ref={containerDiv}>
        <Space style={{width: "100%"}} direction={"vertical"}>
            <ResizableBox
                width={maxWidth} height={outterTableHeight} axis={"y"}
                minConstraints={[maxWidth, 300]}
                maxConstraints={[maxWidth, selected ? 300 : 1200]}
                resizeHandles={["s"]}
                onResizeStop={(e, data) => {
                    setTableHeight(data.size.height - tableOffset)
                }}
            >
                <HTTPFlowTable
                    tableHeight={tableHeight}
                    noHeader={true}
                    onSendToWebFuzzer={props.sendToWebFuzzer}
                    onSelected={i => {
                        if (i) {
                            setOutterTableHeight(300)
                            setTableHeight(300 - tableOffset)
                        } else {
                            setOutterTableHeight(600)
                            setTableHeight(600 - tableOffset)
                        }
                        setSelectedHTTPFlow(i)
                    }}
                    paginationPosition={"topRight"}
                />
            </ResizableBox>
            {selected && <Card bodyStyle={{padding: 0}} bordered={false}>
                <HTTPFlowDetailMini
                    noHeader={true}
                    hash={selected.Hash}
                    // onSendToFuzzer={onSendToFuzzer}
                />
            </Card>}
        </Space>
    </div>
};