import {Select} from "antd"
import React, {useState} from "react"
import {YakitSelectProps} from "./YakitSelectType"
import styles from "./YakitSelect.module.scss"
import classNames from "classnames"
import {BaseOptionType, DefaultOptionType, SelectProps} from "antd/lib/select"
import {BaseSelectRef, OptGroup} from "rc-select"
import {YakitTag} from "../YakitTag/YakitTag"
import {ChevronDownIcon, ChevronUpIcon} from "@/assets/newIcon"

const {Option} = Select

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.增加width 100%
 * 3.mode为tags和multiple样式问题
 * 4.更换颜色变量
 * 5.优化下拉后，Icon行为
 * */

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
                "ant-select",
                "ant-select-in-form-item",
                styles["yakit-select"],
                {
                    [styles["yakit-select-wrapper-tags"]]: props.mode === "tags" || props.mode === "multiple",
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
                        [styles["yakit-select-wrapper-tags"]]: props.mode === "tags" || props.mode === "multiple",
                        [styles["yakit-select-popup-y"]]: show
                    },
                    props.dropdownClassName
                )}
                onDropdownVisibleChange={(open) => {
                    setShow(open)
                    if (props.onDropdownVisibleChange) props.onDropdownVisibleChange(open)
                }}
                tagRender={(props) => {
                    return (
                        <YakitTag size={size} {...props}>
                            {props.label}
                        </YakitTag>
                    )
                }}
<<<<<<< HEAD
                suffixIcon={
                    show ? (
                        <ChevronUpIcon className={styles["yakit-select-icon"]} />
                    ) : (
                        <ChevronDownIcon className={styles["yakit-select-icon"]} />
                    )
                }
=======
                suffixIcon={show ? <ChevronUpIcon className={styles['yakit-select-icon']}/> : <ChevronDownIcon className={styles['yakit-select-icon']}/>}
>>>>>>> 4de4ae3a (Luoluo/feature/optimization mitm rule (#564))
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
