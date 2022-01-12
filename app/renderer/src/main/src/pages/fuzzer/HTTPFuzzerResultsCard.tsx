import React, {useEffect, useState} from "react";
import {Card, Space} from "antd";
import {FuzzerResponse} from "./HTTPFuzzerPage";
import {SelectOne} from "../../utils/inputUtil";
import {FuzzerResponseTableEx} from "./FuzzerResponseTable";
import {AutoCard} from "../../components/AutoCard";

export interface HTTPFuzzerResultsCardProp {
    extra?: React.ReactNode
    successResponses: FuzzerResponse[]
    failedResponses: FuzzerResponse[]
    setRequest?: (s: string) => any
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
}

export const HTTPFuzzerResultsCard: React.FC<HTTPFuzzerResultsCardProp> = (props) => {
    const [showSuccess, setShowSuccess] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true)
        setTimeout(() => setLoading(false), 500)
    }, [])

    return <Card
        size={"small"} style={{height: "100%"}}
        className={"flex-card"}
        title={<Space>
            Responses
            <SelectOne size={"small"} label={" "} colon={false} data={[
                {value: true, text: "成功请求"},
                {value: false, text: "失败请求"},
            ]} value={showSuccess} setValue={setShowSuccess}
                       formItemStyle={{marginBottom: 0}}
            />
        </Space>}
        extra={props.extra}
        bodyStyle={{padding: 0, width: "100%"}}
    >
        <div style={{flex: 1}}>
            {loading && <AutoCard loading={true}/>}
            {(showSuccess && !loading) && <FuzzerResponseTableEx
                onSendToWebFuzzer={props.onSendToWebFuzzer}
                success={showSuccess}
                setRequest={s => {
                    props.setRequest && props.setRequest(s)
                }}
                content={props.successResponses}
            />}
            {(!showSuccess && !loading) && <FuzzerResponseTableEx
                success={showSuccess}
                setRequest={s => {
                    props.setRequest && props.setRequest(s)
                }}
                content={props.failedResponses}
            />}
        </div>
    </Card>
};