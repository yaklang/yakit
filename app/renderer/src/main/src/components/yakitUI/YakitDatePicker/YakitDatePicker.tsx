import {DatePicker} from "antd"
import React from "react"
import {YakitDatePickerProps, YakitRangePickerProps} from "./YakitDatePickerType"
import classNames from "classnames"
import styles from "./YakitDatePicker.module.scss"
import {OutlineClockIcon} from "@/assets/icon/outline"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import zhCN from "antd/es/date-picker/locale/zh_CN"
import enUS from "antd/es/date-picker/locale/en_US"
import moment from "moment"
import "moment/locale/zh-cn"
import "moment/locale/en-gb"

const {RangePicker} = DatePicker
const InternalDatePicker: React.FC<YakitDatePickerProps> = (props) => {
    const {size, wrapperClassName, className, dropdownClassName, wrapperStyle, ...restProps} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi"])
    moment.locale(i18n.language === "zh" ? "zh-cn" : "en-gb")

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
                locale={i18n.language === "zh" ? zhCN : enUS}
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
    const {t, i18n} = useI18nNamespaces(["yakitUi"])
    moment.locale(i18n.language === "zh" ? "zh-cn" : "en-gb")

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
                locale={i18n.language === "zh" ? zhCN : enUS}
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
