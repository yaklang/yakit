import React, {useEffect, useState} from "react";
import {InputInteger} from "../../../utils/inputUtil";

export interface RandStrWithLenProp {
    origin: string
    setOrigin: (origin: string) => any
}

export const RandStrWithLen: React.FC<RandStrWithLenProp> = (props) => {
    const {origin, setOrigin} = props;
    const [len, setLen] = useState(10);

    useEffect(() => {
        const strLen = len || 10;

        setOrigin(`{{randstr(${len})}}`)
    }, [len])

    return <>
        <InputInteger
            label={"随机字符串长度"}
            value={len}
            setValue={setLen}
        />
    </>
};


export interface RandStrWithMaxProp extends RandStrWithLenProp {

}

export const RandStrWithMax: React.FC<RandStrWithMaxProp> = (props) => {
    const {origin, setOrigin} = props;
    const [min, setMin] = useState(10);
    const [max, setMax] = useState(10);

    useEffect(() => {
        setOrigin(`{{randstr(${min},${max})}}`)
    }, [min, max])

    return <>
        <InputInteger label={"最大长度"} value={min} min={1} max={max} setValue={setMin}/>
        <InputInteger label={"最小长度"} value={max} min={min} setValue={setMax}/>
    </>
};

export interface RandStrWIthRepeatProp extends RandStrWithLenProp {

}

export const RandStrWIthRepeat: React.FC<RandStrWIthRepeatProp> = (props) => {
    const {origin, setOrigin} = props;
    const [min, setMin] = useState(10);
    const [max, setMax] = useState(10);
    const [count, setCount] = useState(5)

    useEffect(() => {
        setOrigin(`{{randstr(${min},${max},${count})}}`)
    }, [min, max, count])

    return <>
        <InputInteger label={"最小长度"} value={min} min={1} max={max} setValue={setMin}/>
        <InputInteger label={"最大长度"} value={max} min={min} setValue={setMax}/>
        <InputInteger label={"重复次数"}
                      value={count} min={1}
                      setValue={setCount}
        />
    </>
};

export interface RandIntProp extends RandStrWithLenProp {

}

export const RandInt: React.FC<RandIntProp> = (props) => {
    const {origin, setOrigin} = props;
    const [min, setMin] = useState(1000);
    const [max, setMax] = useState(9999);
    const [count, setCount] = useState(5)

    useEffect(() => {
        if (count > 1) {
            setOrigin(`{{randint(${min},${max},${count})}}`)
            return
        }
        setOrigin(`{{randint(${min},${max})}}`)
    }, [min, max, count])

    return <>
        <InputInteger label={"最小值"} value={min} min={1} max={max} setValue={setMin}/>
        <InputInteger label={"最大值"} value={max} min={min} setValue={setMax}/>
        <InputInteger label={"重复次数"}
                      value={count} min={1}
                      setValue={setCount}
        />
    </>
};