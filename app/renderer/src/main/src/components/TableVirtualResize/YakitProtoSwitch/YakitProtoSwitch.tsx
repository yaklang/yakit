import React, {useState} from "react"
import styles from "./YakitProtoSwitch.module.scss"
import classNames from "classnames"

interface YakitProtoSwitchProps {
    checked?: boolean
    onChange?: (e) => void
    disabled?: boolean
    wrapperClassName?: string
    wrapperStyle?: React.CSSProperties
}
/**
 * @description: 开关
 */
export const YakitProtoSwitch: React.FC<YakitProtoSwitchProps> = React.memo((props) => {
    const {wrapperClassName, wrapperStyle, checked, onChange, disabled} = props
    const [focus, setFocus] = useState<boolean>(false)
    return (
        <>
            <label
                className={classNames(
                    styles["yakit-proto-switch-wrapper"],
                    {
                        [styles["yakit-proto-switch-wrapper-checked"]]: checked,
                        [styles["yakit-proto-switch-wrapper-focus"]]: focus,
                        [styles["yakit-proto-switch-wrapper-checked-focus"]]: checked && focus,
                        [styles["yakit-proto-switch-wrapper-disabled"]]: disabled
                    },
                    wrapperClassName
                )}
                style={{...wrapperStyle}}
            >
                <input
                    type='checkbox'
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    className={classNames(styles["yakit-proto-switch-input"], {
                        [styles["yakit-proto-switch-input-disabled"]]: disabled
                    })}
                    onChange={(e) => {
                        e.stopPropagation()
                        if (disabled) return
                        if (onChange) onChange(!checked)
                    }}
                />
                {/* 圆点 */}
                <span
                    className={classNames(styles["yakit-proto-switch"], {
                        [styles["yakit-proto-switch-checked"]]: checked,
                        [styles["yakit-proto-switch-disabled"]]: disabled
                    })}
                ></span>
            </label>
        </>
    )
})
