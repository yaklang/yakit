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
