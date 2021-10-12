import React, {useEffect, useState} from "react";
import {Col, DatePicker, Row} from "antd";
import moment from "moment";
import {TimeUnit} from "./timeInterval";

interface TimeRangeProps {
    start?: number
    end?: number

    onStart?(time: number): any

    onEnd?(time: number): any
}

export interface TimePointProps {
    value?: number
    placeholder?: string

    setValue(value: number): any
}

export const TimePoint: React.FC<TimePointProps> = ({value, placeholder, setValue}) => {
    let m;
    if (value && value > 0) {
        m = moment.unix(value)
    }

    return <div>
        <DatePicker
            style={{width: "100%"}}
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            value={m}
            placeholder={placeholder || "设置时间点"}
            onChange={e => setValue && e && setValue(e.unix())}
        />
    </div>
}

const TimeRange: React.FC<TimeRangeProps> = (props: TimeRangeProps) => {
    const [start, setStart] = useState(props.start);
    const [end, setEnd] = useState(props.end);

    useEffect(() => {
        props.onStart && props.onStart(start || 0);
    }, [start]);

    useEffect(() => {
        props.onEnd && props.onEnd(end || 0);
    }, [end]);

    return <div className={"div-left"}>
        <Row>
            <Col span={12}>
                <div style={{marginRight: 4}}>
                    <DatePicker
                        style={{width: "100%"}}
                        showTime
                        format="YYYY-MM-DD HH:mm:ss"
                        value={(start && start > 0) ? moment.unix(start) : undefined}
                        placeholder="点击这里设置开始时间"
                        onChange={e => {
                            e != null ? setStart(e.unix()) : setStart(undefined)
                        }}
                    />
                </div>
            </Col>
            <Col span={12}>
                <div style={{marginRight: 4}}>
                    <DatePicker
                        style={{width: "100%"}}
                        showTime
                        format="YYYY-MM-DD HH:mm:ss"
                        value={(end && end > 0) ? moment.unix(end) : undefined}
                        placeholder="点击这里设置结束时间"
                        onChange={e => e != null ? setEnd(e.unix()) : setEnd(undefined)}
                    />
                </div>
            </Col>
        </Row>
    </div>
};

export default TimeRange;

export const secondsToNumberAndUnit = (seconds: number): { value: number, unit: TimeUnit } => {
    return {value: seconds, unit: TimeUnit.Second}
}