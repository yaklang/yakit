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
