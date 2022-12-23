import Icon, { CustomIconComponentProps } from "@ant-design/icons/lib/components/Icon"
import React from "react"

const YakitCloseSvg = () => (
    <svg width='1em' height='1em' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 12L12 4M4 4L12 12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 关闭图标 */
export const YakitCloseSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YakitCloseSvg} {...props} />
}