import {InputNumber, Input} from "antd"
import React, {useEffect, useRef, useState} from "react"
import {ValueType, YakitInputNumberHorizontalProps, YakitInputNumberProps} from "./YakitInputNumberType"
import styles from "./YakitInputNumber.module.scss"
import classNames from "classnames"
import {YakitInput} from "../YakitInput/YakitInput"
import {ChevronLeftIcon, ChevronRightIcon} from "@/assets/newIcon"
import {useHover, useMemoizedFn} from "ahooks"

/**
 * @description: 两种方式的数字输入
 * @augments InputNumberProps 继承antd的InputNumber默认属性
 * @param {horizontal | vertical} type  默认vertical
 * @param {YakitSizeType} size  horizontal 不支持max-large
 */
export const YakitInputNumber: React.FC<YakitInputNumberProps> = (props) => {
    const {type, size, className} = props
    return (
        <>
            {(type === "horizontal" && <YakitInputNumberHorizontal {...props} />) || (
                <InputNumber
                    {...props}
                    size='middle'
                    className={classNames(
                        styles["yakit-input-number"],
                        {
                            [styles["yakit-input-number-max-large"]]: size === "maxLarge",
                            [styles["yakit-input-number-large"]]: size === "large",
                            [styles["yakit-input-number-small"]]: size === "small",
                            [styles["yakit-input-number-disabled"]]: !!props.disabled
                        },
                        className
                    )}
                >
                    {props.children}
                </InputNumber>
            )}
        </>
    )
}

/**
 * @description:horizontal size 不支持max-large
 * @description:不支持 bordered false ，无边框模式
 */
const YakitInputNumberHorizontal: React.FC<YakitInputNumberHorizontalProps> = (props) => {
    const {size, step = 1, controls, precision} = props
    const [value, setValue] = useState<ValueType | null | undefined>(props.value)
    const [focus, setFocus] = useState<boolean>(false)
    const precisionRef = useRef<number>(1)
    useEffect(() => {
        setValue(props.value)
    }, [props.value])
    useEffect(() => {
        const stepPrecision = getPrecision(step)
        if (precision !== undefined) {
            if (stepPrecision > precision) {
                console.warn("[Yakit Warn][InputNumber]precision should not be less than the decimal places of step")
            }
            precisionRef.current = precision
        } else {
            precisionRef.current = Math.max(getPrecision(value), stepPrecision)
        }
    }, [props.value, props.step, props.precision])
    /**
     * @description: 获取精度
     * @return {*} 精度
     */
    const getPrecision = (value) => {
        if (value === undefined) return 0
        const valueString = value.toString()
        const dotPosition = valueString.indexOf(".")
        let precision = 0
        if (dotPosition !== -1) {
            precision = valueString.length - dotPosition - 1
        }
        return precision
    }
    /**
     * @description: 根据精度计算最后的值
     */
    const toPrecision = (num) => {
        const precision = precisionRef.current
        return parseFloat(`${Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision)}`)
    }
    /**
     * @description: 增加
     */
    const onIncrease = (val, step) => {
        if (typeof val !== "number" && val === undefined) return value
        const precisionFactor = Math.pow(10, precisionRef.current)
        return toPrecision((precisionFactor * val + precisionFactor * step) / precisionFactor)
    }
    /**
     * @description: 减少
     */
    const onDecrease = (val, step) => {
        if (typeof val !== "number" && val === undefined) return value
        const precisionFactor = Math.pow(10, precisionRef.current)
        return toPrecision((precisionFactor * val - precisionFactor * step) / precisionFactor)
    }
    /**
     * @description: up
     */
    const onAdd = useMemoizedFn(() => {
        if (props.disabled) return
        const newVal = value ? onIncrease(Number(value), step) || 0 : Number(props.min || 0)
        if (newVal && props.max && newVal >= props.max) {
            const precisionFactor = Math.pow(10, precisionRef.current)
            const max = toPrecision((precisionFactor * Number(props.max)) / precisionFactor)
            setValue(max)
            if (props.onChange) props.onChange(max)
            return
        }
        setValue(newVal)
        if (props.onChange) props.onChange(newVal)
    })
    /**
     * @description: down
     */
    const onReduce = useMemoizedFn(() => {
        if (props.disabled) return
        const newVal = value ? onDecrease(Number(value), step) || 0 : Number(props.min || 0)
        if (newVal && props.min && newVal <= props.min) {
            const precisionFactor = Math.pow(10, precisionRef.current)
            const min = toPrecision((precisionFactor * Number(props.min)) / precisionFactor)
            setValue(min)
            if (props.onChange) props.onChange(min)
            return
        }
        setValue(newVal)
        if (props.onChange) props.onChange(newVal)
    })
    const onInputChange = useMemoizedFn((value: number | string | null) => {
        setValue(value)
        if (props.onChange) props.onChange(value)
    })
    const onFocus = useMemoizedFn((e) => {
        setFocus(true)
        if (props.onFocus) props.onFocus(e)
    })
    const onBlur = useMemoizedFn((e) => {
        setFocus(false)
        const precisionFactor = Math.pow(10, precisionRef.current)
        const newVal = toPrecision((precisionFactor * Number(value)) / precisionFactor)
        setValue(newVal)
        if (props.onChange) props.onChange(newVal)
        if (props.onBlur) props.onBlur(e)
    })
    return (
        <div
            className={classNames(styles["yakit-input-number-horizontal"], {
                [styles["yakit-input-number-horizontal-focus"]]: focus,
                [styles["yakit-input-number-horizontal-disabled"]]: !!props.disabled
            })}
        >
            {controls !== false && (
                <>
                    <div
                        className={classNames(styles["icon-left"], styles["icon-midden"], {
                            [styles["icon-small"]]: size === "small",
                            [styles["icon-large"]]: size === "large",
                            [styles["icon-disabled"]]: !!props.disabled
                        })}
                        onClick={() => onReduce()}
                    >
                        {(typeof controls === "object" && controls?.upIcon) || <ChevronLeftIcon />}
                    </div>
                </>
            )}
            <YakitInputNumber
                {...props}
                step={step}
                value={value}
                bordered={false}
                type='vertical'
                className={classNames(styles["yakit-input-number-wrapper"], {
                    [styles["yakit-input-number-wrapper-disabled"]]: !!props.disabled
                })}
                onChange={onInputChange}
                onFocus={onFocus}
                onBlur={onBlur}
            />
            {controls !== false && (
                <>
                    <div
                        className={classNames(styles["icon-right"], styles["icon-midden"], {
                            [styles["icon-small"]]: size === "small",
                            [styles["icon-large"]]: size === "large",
                            [styles["icon-disabled"]]: !!props.disabled
                        })}
                        onClick={() => onAdd()}
                    >
                        {(typeof controls === "object" && controls?.upIcon) || <ChevronRightIcon />}
                    </div>
                </>
            )}
        </div>
    )
}
