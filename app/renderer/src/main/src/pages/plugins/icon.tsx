import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
}

const PluginsGridCheck = () => (
    <svg width='29' height='28' viewBox='0 0 29 28' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M0.333984 0H20.334C24.7523 0 28.334 3.58172 28.334 8V28L0.333984 0Z' fill='currentColor' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M23.359 6.17574C23.5933 6.41005 23.5933 6.78995 23.359 7.02426L18.559 11.8243C18.3247 12.0586 17.9448 12.0586 17.7105 11.8243L15.3105 9.42426C15.0762 9.18995 15.0762 8.81005 15.3105 8.57574C15.5448 8.34142 15.9247 8.34142 16.159 8.57574L18.1348 10.5515L22.5105 6.17574C22.7448 5.94142 23.1247 5.94142 23.359 6.17574Z'
            fill='white'
        />
    </svg>
)
/**
 * @description  插件列表页面/网格布局/勾选icon
 */
export const PluginsGridCheckIcon = (props: Partial<IconProps>) => {
    return <Icon component={PluginsGridCheck} {...props} />
}

const PluginTestError = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect width='20' height='20' rx='10' fill='#F7544A' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M10 16C13.3137 16 16 13.3137 16 10C16 6.68629 13.3137 4 10 4C6.68629 4 4 6.68629 4 10C4 13.3137 6.68629 16 10 16ZM9.03033 7.96967C8.73744 7.67678 8.26256 7.67678 7.96967 7.96967C7.67678 8.26256 7.67678 8.73744 7.96967 9.03033L8.93934 10L7.96967 10.9697C7.67678 11.2626 7.67678 11.7374 7.96967 12.0303C8.26256 12.3232 8.73744 12.3232 9.03033 12.0303L10 11.0607L10.9697 12.0303C11.2626 12.3232 11.7374 12.3232 12.0303 12.0303C12.3232 11.7374 12.3232 11.2626 12.0303 10.9697L11.0607 10L12.0303 9.03033C12.3232 8.73744 12.3232 8.26256 12.0303 7.96967C11.7374 7.67678 11.2626 7.67678 10.9697 7.96967L10 8.93934L9.03033 7.96967Z'
            fill='white'
        />
    </svg>
)
/**
 * @description  icon/log 节点状态/错误 Error
 */
export const PluginTestErrorIcon = (props: Partial<IconProps>) => {
    return <Icon component={PluginTestError} {...props} />
}

const PluginTestWarning = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect width='20' height='20' rx='10' fill='#FFB660' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M8.43123 3.78893C9.11938 2.56556 10.8808 2.56556 11.5689 3.78893L16.5912 12.7174C17.2661 13.9173 16.399 15.3999 15.0223 15.3999H4.97779C3.6011 15.3999 2.73402 13.9173 3.40896 12.7174L8.43123 3.78893ZM10.9 12.7C10.9 13.197 10.497 13.6 9.99999 13.6C9.50293 13.6 9.09999 13.197 9.09999 12.7C9.09999 12.2029 9.50293 11.8 9.99999 11.8C10.497 11.8 10.9 12.2029 10.9 12.7ZM9.99999 5.49999C9.50293 5.49999 9.09999 5.90293 9.09999 6.39999V9.09999C9.09999 9.59704 9.50293 9.99999 9.99999 9.99999C10.497 9.99999 10.9 9.59704 10.9 9.09999V6.39999C10.9 5.90293 10.497 5.49999 9.99999 5.49999Z'
            fill='white'
        />
    </svg>
)
/**
 * @description  icon/log 节点状态/警告 Warning
 */
export const PluginTestWarningIcon = (props: Partial<IconProps>) => {
    return <Icon component={PluginTestWarning} {...props} />
}
