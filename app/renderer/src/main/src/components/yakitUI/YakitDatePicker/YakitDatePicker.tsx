import {DatePicker} from "antd"
import React from "react"
import {YakitDatePickerProps, YakitRangePickerProps} from "./YakitDatePickerType"
import classNames from "classnames"
import styles from "./YakitDatePicker.module.scss"
import {OutlineClockIcon} from "@/assets/icon/outline"

const {RangePicker} = DatePicker
const InternalDatePicker: React.FC<YakitDatePickerProps> = (props) => {
    const {size, wrapperClassName, className, dropdownClassName, wrapperStyle, ...restProps} = props
    return (
        <div
            className={classNames(
                styles["yakit-date-picker-wrapper"],
                {
                    [styles["yakit-date-picker-large"]]: size === "large",
                    [styles["yakit-date-picker-small"]]: size === "small"
                },
                wrapperClassName
            )}
            style={{...(wrapperStyle || {})}}
        >
            <DatePicker
                {...restProps}
                suffixIcon={
                    <div className={styles["picker-icon"]}>
                        <OutlineClockIcon />
                    </div>
                }
                dropdownClassName={classNames(styles["yakit-data-picker-dropdaown"], {dropdownClassName})}
                className={classNames(styles["yakit-picker"], {
                    [styles["yakit-picker-large"]]: size === "large",
                    [styles["yakit-picker-small"]]: size === "small",
                    className
                })}
            />
        </div>
    )
}

const InternalRangePicker: React.FC<YakitRangePickerProps> = (props) => {
    const {size, wrapperClassName, className, dropdownClassName, wrapperStyle, ...restProps} = props
    return (
        <div
            className={classNames(
                styles["yakit-range-picker-wrapper"],
                {
                    [styles["yakit-range-picker-wrapper-large"]]: size === "large",
                    [styles["yakit-range-picker-wrapper-small"]]: size === "small"
                },
                wrapperClassName
            )}
            style={{...(wrapperStyle || {})}}
        >
            <RangePicker
                {...restProps}
                suffixIcon={
                    <div className={styles["picker-icon"]}>
                        <OutlineClockIcon />
                    </div>
                }
                dropdownClassName={classNames(styles["yakit-range-picker-dropdaown"], {dropdownClassName})}
                className={classNames(styles["yakit-range-picker"], {
                    [styles["yakit-range-picker-large"]]: size === "large",
                    [styles["yakit-range-picker-small"]]: size === "small",
                    className
                })}
            />
        </div>
    )
}

type CompoundedComponent = React.ForwardRefExoticComponent<YakitDatePickerProps> & {
    RangePicker: typeof InternalRangePicker
}

/**
 * @description: 日期选择
 * @augments DatePickerProps 继承antd的DatePicker默认属性
 */
export const YakitDatePicker = InternalDatePicker as CompoundedComponent

YakitDatePicker.RangePicker = InternalRangePicker
