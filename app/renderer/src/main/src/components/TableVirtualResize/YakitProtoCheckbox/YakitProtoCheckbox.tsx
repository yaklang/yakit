import React, {useState} from "react"
import styles from "./YakitProtoCheckbox.module.scss"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"

interface YakitProtoCheckboxProps {
    checked?: boolean
    indeterminate?: boolean
    onChange?: (e) => void
    disabled?: boolean
    wrapperClassName?: string
}
/**
 * @description: 原生 多选框
 */
export const YakitProtoCheckbox: React.FC<YakitProtoCheckboxProps> = (props) => {
    const {wrapperClassName, ...resProps} = props
    const [focus, setFocus] = useState<boolean>(false)

    return (
        <label className={classNames(styles["yakit-proto-checkbox-wrapper"], wrapperClassName)}>
            <span
                className={classNames(styles["yakit-proto-checkbox"], {
                    [styles["yakit-checkbox-input-checked"]]: props.checked,
                    [styles["yakit-proto-checkbox-focus"]]: focus,
                    [styles["yakit-checkbox-input-checked-focus"]]: props.checked && focus
                })}
            >
                <input
                    {...resProps}
                    type='checkbox'
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    className={classNames(styles["yakit-checkbox-input"])}
                />
                <span className={classNames(styles["yakit-proto-checkbox-inner"])}></span>
            </span>
        </label>
    )
}
