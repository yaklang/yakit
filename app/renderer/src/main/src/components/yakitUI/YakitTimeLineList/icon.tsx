import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
    ref?: any
}

const YakitTimeLineItem = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect width='24' height='24' rx='12' fill='#EAECF3' />
        <path
            d='M8.39999 12C8.39999 12.9941 7.5941 13.8 6.59999 13.8C5.60588 13.8 4.79999 12.9941 4.79999 12C4.79999 11.0058 5.60588 10.2 6.59999 10.2C7.5941 10.2 8.39999 11.0058 8.39999 12Z'
            fill='#85899E'
        />
        <path
            d='M13.8 12C13.8 12.9941 12.9941 13.8 12 13.8C11.0059 13.8 10.2 12.9941 10.2 12C10.2 11.0058 11.0059 10.2 12 10.2C12.9941 10.2 13.8 11.0058 13.8 12Z'
            fill='#85899E'
        />
        <path
            d='M17.4 13.8C18.3941 13.8 19.2 12.9941 19.2 12C19.2 11.0058 18.3941 10.2 17.4 10.2C16.4059 10.2 15.6 11.0058 15.6 12C15.6 12.9941 16.4059 13.8 17.4 13.8Z'
            fill='#85899E'
        />
    </svg>
)
/** yakittimeline默认icon */
export const YakitTimeLineItemIcon = (props: Partial<IconProps>) => {
    return <Icon component={YakitTimeLineItem} {...props} />
}
