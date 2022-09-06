import React from "react";
import {ResizeBox} from "@/components/ResizeBox";
import {AutoCard} from "@/components/AutoCard";
import {useGetState} from "ahooks";
import {Button, Space} from "antd";
import {YakEditor} from "@/utils/editors";

export interface WebsocketClientOperatorProp {

}

export const WebsocketClientOperator: React.FC<WebsocketClientOperatorProp> = (props) => {
    const [_executing, setExecuting, getExecuting] = useGetState(false);

    return <ResizeBox
        isVer={true}
        firstNode={() => {
            return <AutoCard
                size={"small"} bordered={true} title={"创建 Websocket 请求"}
                bodyStyle={{padding: 0}}
                extra={(
                    <Space>
                        <Button
                            size={"small"}
                            type={"primary"}
                        >
                            启动连接
                        </Button>
                    </Space>
                )}
            >
                <YakEditor
                    readOnly={getExecuting()}
                />
            </AutoCard>
        }}
        firstRatio={"200px"}
        firstMinSize={"200px"}
        secondNode={() => {
            return <>
                RawData
            </>
        }}
    />
};