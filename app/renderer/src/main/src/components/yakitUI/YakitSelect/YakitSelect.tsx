import {Select} from "antd"
import React, {useState} from "react"
import {YakitSelectProps} from "./YakitSelectType"
import styles from "./YakitSelect.module.scss"
import classNames from "classnames"
import {BaseOptionType, DefaultOptionType, SelectProps} from "antd/lib/select"
import {BaseSelectRef, OptGroup} from "rc-select"

import {EDITION_STATUS, getJuageEnvFile} from "@/utils/envfile"

const IsNewUI: boolean = EDITION_STATUS.IS_NEW_UI === getJuageEnvFile()

const {Option} = Select

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.增加width 100%
 */

/**
 * @description: 下拉选择
 * @augments SwitchProps 继承antd的 SelectProps 默认属性
 * @param {string} wrapperClassName Switch装饰div的className
 * @param {CSSProperties} wrapperStyle Switch装饰div的style
 */
export const YakitSelectCustom = <ValueType, OptionType>(
    {className, size, wrapperClassName, wrapperStyle, dropdownRender, ...props}: YakitSelectProps<OptionType>,
    ref: React.Ref<BaseSelectRef>
) => {
    const [show, setShow] = useState<boolean>(false)
    return (
        <div
            className={classNames(
                styles["yakit-select"],
                {
                    [styles["yakit-select-wrapper-newUI"]]: IsNewUI,
                    [styles["yakit-select-wrapper-oldUI"]]: !IsNewUI,
                    [styles["yakit-select-large"]]: size === "large",
                    [styles["yakit-select-middle"]]: size === "middle",
                    [styles["yakit-select-small"]]: size === "small"
                },
                wrapperClassName
            )}
            style={wrapperStyle}
        >
            <Select
                {...props}
                size='middle'
                dropdownClassName={classNames(
                    styles["yakit-select-popup"],
                    {
                        [styles["yakit-select-wrapper-newUI"]]: IsNewUI,
                        [styles["yakit-select-wrapper-oldUI"]]: !IsNewUI,
                        [styles["yakit-select-popup-y"]]: show
                    },
                    props.dropdownClassName
                )}
                onDropdownVisibleChange={(open) => {
                    setShow(open)
                    if (props.onDropdownVisibleChange) props.onDropdownVisibleChange(open)
                }}
            >
                {props.children}
            </Select>
        </div>
    )
}

export const YakitSelect = React.forwardRef(YakitSelectCustom) as unknown as (<
    ValueType = any,
    OptionType extends BaseOptionType | DefaultOptionType = DefaultOptionType
>(
    props: React.PropsWithChildren<YakitSelectProps<ValueType, OptionType>> & {
        ref?: React.Ref<BaseSelectRef>
    }
) => React.ReactElement) & {
    SECRET_COMBOBOX_MODE_DO_NOT_USE: string
    Option: typeof Option
    OptGroup: typeof OptGroup
}

YakitSelect.Option = Option
