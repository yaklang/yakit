import React, {useEffect, useState} from "react";
import {Form, Input, InputNumber, Select} from "antd";

export interface TimeIntervalProps {
    defaultValue?: number
    defaultUnit?: TimeUnit
    availableUnits?: TimeUnit[]

    onChange?(interval: number): any
}

export enum TimeUnit {
    Second = 1,
    Minute = 60,
    Hour = 3600,
    Day = 3600 * 24
}

const TimeUnitToString = (unit: TimeUnit): string => {
    switch (unit) {
        case TimeUnit.Minute:
            return "Minute"
        case TimeUnit.Hour:
            return "Hour"
        case TimeUnit.Second:
            return "Second"
        case TimeUnit.Day:
            return "Day"
        default:
            return "Second"
    }
}

const InputGroup = Input.Group;

const TimeInterval: React.FC<TimeIntervalProps> = (props: TimeIntervalProps) => {
    let defaultUnit = props.defaultUnit || TimeUnit.Second;
    let defaultValue = (props.defaultValue || 0) / defaultUnit

    const [unit, setUnit] = useState(defaultUnit);
    const [value, setValue] = useState(defaultValue);
    const units = props.availableUnits || [
        TimeUnit.Second, TimeUnit.Day, TimeUnit.Hour, TimeUnit.Minute,
    ];

    useEffect(() => {
        props.onChange && props.onChange(unit * value)
    }, [unit]);

    return <div className={"div-left"}>
        <InputGroup compact={true}>
            <InputNumber
                style={{width: 140}}
                min={0}
                value={value} onChange={(e) => {
                let valueRaw: number = 0;
                switch (typeof e) {
                    case "number":
                        valueRaw = e;
                        break;
                }
                props.onChange && props.onChange(unit * (valueRaw || 0));
                setValue(valueRaw || 0);
            }}
            />
            <Select
                style={{width: 120}}
                defaultValue={unit} onChange={(e: TimeUnit) => setUnit(e)}>
                {units.map(e => <Select.Option value={e}>{TimeUnitToString(e)}</Select.Option>)}
            </Select>
        </InputGroup>
    </div>
};

export interface TimeIntervalItemProps extends TimeIntervalProps {
    label: string
}

export const TimeIntervalItem: React.FC<TimeIntervalItemProps> = (p) => {
    return <Form.Item label={p.label}>
        <TimeInterval {...p as TimeIntervalProps}/>
    </Form.Item>
}

export default TimeInterval;
