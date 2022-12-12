import {AutoComplete} from "antd"
import React, {useState} from "react"
import {YakitAutoCompleteProps} from "./YakitAutoCompleteType"
import styles from "./YakitAutoComplete.module.scss"
import classNames from "classnames"
import {EDITION_STATUS, getJuageEnvFile} from "@/utils/envfile"

const IsNewUI: boolean = EDITION_STATUS.IS_NEW_UI === getJuageEnvFile()

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 */

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.增加颜色变量
 */

/**
 * 更新说明
 * 1.增加环境变量加载主题色
 * 2.增加颜色变量
 */

/**
 * @description YakitAutoCompleteProps 的属性
 * @augments AutoCompleteProps 继承antd的 AutoCompleteProps 默认属性
 * @param {"small" | "middle" | "large" } size  默认middle
 */
export const YakitAutoComplete: React.FC<YakitAutoCompleteProps> = (props) => {
    const {size, className, ...restProps} = props
    const [show, setShow] = useState<boolean>(false)
    return (
        <div
            className={classNames(styles["yakit-auto-complete-wrapper"], {
                [styles["yakit-auto-complete-wrapper-newUI"]]: IsNewUI,
                [styles["yakit-auto-complete-wrapper-oldUI"]]: !IsNewUI,
                [styles["yakit-auto-complete-wrapper-large"]]: size === "large",
                [styles["yakit-auto-complete-wrapper-small"]]: size === "small",
                [styles["yakit-auto-complete-disabled"]]: !!props.disabled
            })}
        >
            <AutoComplete
                {...restProps}
                size='middle'
                dropdownClassName={classNames(
                    styles["yakit-auto-complete-popup"],
                    {
                        [styles["yakit-auto-complete-wrapper-newUI"]]: IsNewUI,
                        [styles["yakit-auto-complete-wrapper-oldUI"]]: !IsNewUI,
                        [styles["yakit-auto-complete-popup-y"]]: show
                    },
                    props.dropdownClassName
                )}
                onDropdownVisibleChange={(open) => {
                    setShow(open)
                    if (props.onDropdownVisibleChange) props.onDropdownVisibleChange(open)
                }}
            />
        </div>
    )
}
