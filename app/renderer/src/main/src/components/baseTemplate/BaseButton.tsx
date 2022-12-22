import React, {ReactNode, useEffect, useRef} from "react"
import {Button, ButtonProps} from "antd"
import "./BaseButton.scss"

export interface ButtonColorProps extends Omit<ButtonProps, "type"> {
    children: ReactNode
    type?: "primary" | "link" | "default"
    hoverTextColor?: string
    hoverBgColor?: string
    hoverBorderColor?: string
    activeTextColor?: string
    activeBgColor?: string
    activeBorderColor?: string
    focusTextColor?: string
    focusBgColor?: string
    focusBorderColor?: string
    disabledTextColor?: string
    disabledBgColor?: string
    disabledBorderColor?: string
}
/**
 * @description 目前支持type类型为 primary\link\default 按钮
 */
export const ButtonColor: React.FC<ButtonColorProps> = (props) => {
    const {
        children,
        hoverTextColor,
        hoverBgColor,
        hoverBorderColor,
        activeTextColor,
        activeBgColor,
        activeBorderColor,
        focusTextColor,
        focusBgColor,
        focusBorderColor,
        disabledTextColor,
        disabledBgColor,
        disabledBorderColor,
        ...otherProps
    } = props
    const buttonRef = useRef<any>(null)
    useEffect(() => {
        const buttonStyle = buttonRef.current.style
        let defaultHoverText: string = "" // hover文本默认颜色
        let defaultHoverBg: string = "" // hover背景默认颜色
        let defaultHoverBorder: string = "" // hover边框默认颜色
        let defaultActiveText: string = "" // active文本默认颜色
        let defaultActiveBg: string = "" // active背景默认颜色
        let defaultActiveBorder: string = "" // active边框默认颜色
        let defaultFocusText: string = "" // focus文本默认颜色
        let defaultFocusBg: string = "" // focus背景默认颜色
        let defaultFocusBorder: string = "" // focus边框默认颜色
        let defaultDisabledBg: string = "" // 默认禁用背景色
        let defaultDisabledBorder: string = "" // 默认禁用背景色
        switch (otherProps.type) {
            case "primary":
                defaultHoverText = "#fff"
                defaultHoverBg = "#40a9ff"
                defaultHoverBorder = "#40a9ff"
                defaultActiveText = "#fff"
                defaultActiveBg = "#096dd9"
                defaultActiveBorder = "#096dd9"
                defaultFocusText = "#fff"
                defaultFocusBg = "#40a9ff"
                defaultFocusBorder = "#40a9ff"
                defaultDisabledBg = "#f5f5f5"
                defaultDisabledBorder = "#d9d9d9"
                break
            case "link":
                defaultHoverText = "#1890ff"
                defaultHoverBg = "#fff"
                defaultHoverBorder = "#fff"
                defaultActiveText = "#096dd9"
                defaultActiveBg = "transparent"
                defaultActiveBorder = "transparent"
                defaultFocusText = "#40a9ff"
                defaultFocusBg = "transparent"
                defaultFocusBorder = "transparent"
                defaultDisabledBg = "transparent"
                defaultDisabledBorder = "transparent"
                break
            // case "default":
            default:
                defaultHoverText = "#40a9ff"
                defaultHoverBg = "#fff"
                defaultHoverBorder = "#40a9ff"
                defaultActiveText = "#096dd9"
                defaultActiveBg = "#fff"
                defaultActiveBorder = "#096dd9"
                defaultFocusText = "#40a9ff"
                defaultFocusBg = "#fff"
                defaultFocusBorder = "#40a9ff"
                defaultDisabledBg = "#f5f5f5"
                defaultDisabledBorder = "#d9d9d9"
                break
        }
        buttonStyle.setProperty(`--btn-hoverTextColor`, hoverTextColor || defaultHoverText)
        buttonStyle.setProperty(`--btn-hoverBgColor`, hoverBgColor || defaultHoverBg)
        buttonStyle.setProperty(`--btn-hoverBorderColor`, hoverBorderColor || defaultHoverBorder)
        buttonStyle.setProperty(`--btn-activeTextColor`, activeTextColor || defaultActiveText)
        buttonStyle.setProperty(`--btn-activeBgColor`, activeBgColor || defaultActiveBg)
        buttonStyle.setProperty(`--btn-activeBorderColor`, activeBorderColor || defaultActiveBorder)
        buttonStyle.setProperty(`--btn-focusTextColor`, focusTextColor || defaultFocusText)
        buttonStyle.setProperty(`--btn-focusBgColor`, focusBgColor || defaultFocusBg)
        buttonStyle.setProperty(`--btn-focusBorderColor`, focusBorderColor || defaultFocusBorder)
        buttonStyle.setProperty(`--btn-disabledTextColor`, disabledTextColor || "rgba(0, 0, 0, 0.25)")
        buttonStyle.setProperty(`--btn-disabledBgColor`, disabledBgColor || defaultDisabledBg)
        buttonStyle.setProperty(`--btn-disabledBorderColor`, disabledBorderColor || defaultDisabledBorder)
    }, [])

    return (
        <div className='base-button' ref={buttonRef}>
            <Button {...otherProps}>{children}</Button>
        </div>
    )
}

// UI组件测试用例
export const TestButton: React.FC = () => {
    return (
        <div>
            <ButtonColor
                hoverTextColor='white'
                hoverBgColor='pink'
                activeTextColor='pink'
                activeBgColor='green'
                focusBgColor='red'
                type='link'
            >
                66
            </ButtonColor>
            <ButtonColor
                hoverTextColor='pink'
                hoverBgColor='green'
                activeTextColor='pink'
                activeBgColor='#40a9ff'
                focusBgColor='yellow'
                type='link'
            >
                77
            </ButtonColor>
            <ButtonColor
                hoverTextColor='white'
                hoverBgColor='green'
                activeTextColor='pink'
                activeBgColor='#40a9ff'
                focusBgColor='yellow'
                disabledTextColor='red'
                disabledBgColor='yellow'
                disabled
                type='primary'
            >
                88
            </ButtonColor>
            <br />
            <ButtonColor disabled>99</ButtonColor>
            <ButtonColor type='link'>link-new</ButtonColor>
            <ButtonColor type='default'>default-new</ButtonColor>
            <ButtonColor type='primary'>primary-new</ButtonColor>
            <br />
            <Button disabled>100</Button>
            <Button type='link'>link</Button>
            <Button type='default'>default</Button>
            <Button type='primary'>primary</Button>
        </div>
    )
}
