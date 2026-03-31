import React, {useEffect, useState} from "react";
import {Col, DatePicker, Row} from "antd";
import moment from "moment";
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

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
    const {t, i18n} = useI18nNamespaces(["utils"])
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
            placeholder={placeholder || t("basic.TimeRange.setTimePoint")}
            onChange={e => setValue && e && setValue(e.unix())}
        />
    </div>
}

const TimeRange: React.FC<TimeRangeProps> = (props: TimeRangeProps) => {
    const {t, i18n} = useI18nNamespaces(["utils"])
    const { onStart, onEnd } = props;
    const [start, setStart] = useState(props.start);
    const [end, setEnd] = useState(props.end);

    useEffect(() => {
        onStart && onStart(start || 0);
    }, [start, onStart]);

    useEffect(() => {
        onEnd && onEnd(end || 0);
    }, [end, onEnd]);

    return <div className={"div-left"}>
        <Row>
            <Col span={12}>
                <div style={{marginRight: 4}}>
                    <DatePicker
                        style={{width: "100%"}}
                        showTime
                        format="YYYY-MM-DD HH:mm:ss"
                        value={(start && start > 0) ? moment.unix(start) : undefined}
                        placeholder={t("basic.TimeRange.setStartTime")}
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
                        placeholder={t("basic.TimeRange.setEndTime")}
                        onChange={e => e != null ? setEnd(e.unix()) : setEnd(undefined)}
                    />
                </div>
            </Col>
        </Row>
    </div>
};

export default TimeRange;
