import React, {useEffect, useState} from "react";
import "react-resizable/css/styles.css"
import {Card} from "antd";
import {HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable";
import {HTTPFlowDetailMini} from "./HTTPFlowDetail";
import {VerticalResize} from "../components/VerticalResize";

export interface HTTPPacketFuzzable {
    sendToWebFuzzer?: (isHttps: boolean, request: string) => any
}

export interface HTTPHistoryProp extends HTTPPacketFuzzable {

}

export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const [selected, setSelectedHTTPFlow] = useState<HTTPFlow>();
    const [tableHeight, setTableHeight] = useState(400);
    const [detailHeight, setDetailHeight] = useState(400);

    // 外部 DIV 配置
    const [height, setHeight] = useState(window.outerHeight - 230);
    const [refreshTrigger, setRefresh] = useState(false);
    const refresh = () => {
        setRefresh(!refreshTrigger)
    }

    const reseze=(l:HTMLDivElement,r:HTMLDivElement)=>{
        setTableHeight([l][0].offsetHeight-100)
        setDetailHeight([r][0].offsetHeight-50)
    }
    const showDetail=(i: HTTPFlow | undefined) =>{
        if(!i) return
        setDetailHeight(((height-230)*0.35))
        setTableHeight(height-330-detailHeight)
        setSelectedHTTPFlow(i)
    }

    useEffect(() => {
        if (selected) {
            setTableHeight(340)
            return
        }

        setTableHeight(height - 100)
    }, [selected])

    // useEffect(() => {
    //     setDetailHeight(height - tableHeight)
    // }, [tableHeight])

    return <div style={{width: "100%",flex:'1'}}>
        <VerticalResize
            firstResizable={(_, h: number) => {
                if (selected) {
                    setTableHeight(h - 98)
                }
            }}
            firstHideResize={!selected}
            firstInitHeight={340}
            firstMaxHeight={500}
            firstNode={<div style={{height:'100%'}}>
                <HTTPFlowTable
                    noHeader={true}
                    tableHeight={tableHeight}
                    onSendToWebFuzzer={props.sendToWebFuzzer}
                    onSelected={(i) => {
                        showDetail(i)
                    }}
                    paginationPosition={"topRight"}
                />
            </div>}
            secondHideResize={true} secondMinHeight={detailHeight} secondMaxHeight={detailHeight}
            secondNode={selected && <div style={{overflow: "hidden", height: '100%'}}>
                <Card bodyStyle={{padding: 0}} bordered={false}>
                    <HTTPFlowDetailMini
                        noHeader={true}
                        hash={selected.Hash}
                        sendToWebFuzzer={props.sendToWebFuzzer}
                        defaultHeight={detailHeight}
                    />
                </Card>
            </div>}
            reseze={reseze}
        />

    </div>
};