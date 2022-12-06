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
            {(type === "horizontal" && <YakitInputNumberHorizontal />) || (
                <InputNumber
                    {...props}
                    size='middle'
                    className={classNames(
                        styles["yakit-input-number"],
                        {
                            [styles["yakit-input-number-max-large"]]: size === "maxLarge",
                            [styles["yakit-input-number-large"]]: size === "large",
                            [styles["yakit-input-number-small"]]: size === "small"
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
    const {size, step = 1} = props
    const [value, setValue] = useState<ValueType | null | undefined>(props.value)
    const ref = useRef<any>()
    const isHovering = useHover(ref)
    useEffect(() => {
        setValue(props.value)
    }, [props.value])
    const onAdd = useMemoizedFn(() => {
        let newNumber: number = Number(value) || 0
        if (value === null || value === undefined) {
            newNumber = Number(step)
        } else {
            newNumber = newNumber + Number(step)
        }
        setValue(newNumber)
        if (props.onChange) props.onChange(newNumber)
    })
    const onReduce = useMemoizedFn(() => {
        let newNumber: number = Number(value) || 0
        if (value === null || value === undefined) {
            newNumber = Number(step)
        } else {
            newNumber = newNumber - Number(step)
        }
        setValue(newNumber)
        if (props.onChange) props.onChange(newNumber)
    })
    const onInputChange = useMemoizedFn((value: number | string | null) => {
        setValue(value)
        if (props.onChange) props.onChange(value)
    })
    return (
        <div
            className={classNames(styles["yakit-input-number-horizontal"], {
                [styles["yakit-input-number-horizontal-focus"]]: isHovering
            })}
            ref={ref}
        >
            <div
                className={classNames(styles["icon-left"], styles["icon-midden"], {
                    [styles["icon-small"]]: size === "small",
                    [styles["icon-large"]]: size === "large"
                })}
                onClick={() => onReduce()}
            >
                <ChevronLeftIcon />
            </div>
            {/* <YakitInput bordered={false} size={size}  /> */}
            <YakitInputNumber
                {...props}
                value={value}
                bordered={false}
                type='vertical'
                className={styles["yakit-input-number-wrapper"]}
                onChange={onInputChange}
            />
            <div
                className={classNames(styles["icon-right"], styles["icon-midden"], {
                    [styles["icon-small"]]: size === "small",
                    [styles["icon-large"]]: size === "large"
                })}
                onClick={() => onAdd()}
            >
                <ChevronRightIcon />
            </div>
        </div>
    )
}
