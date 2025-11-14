import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
    ref?: any
}

const OutlineQuestionmarkcircle = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.22766 9C8.77678 7.83481 10.2584 7 12.0001 7C14.2092 7 16.0001 8.34315 16.0001 10C16.0001 11.3994 14.7224 12.5751 12.9943 12.9066C12.4519 13.0106 12.0001 13.4477 12.0001 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='12' cy='17' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinequestion-mark-circle
 */
export const OutlineQuestionmarkcircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineQuestionmarkcircle} {...props} />
}

const OutlineX = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6 18L18 6M6 6L18 18'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinex
 */
export const OutlineXIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineX} {...props} />
}

const OutlineChevronright = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 5L16 12L9 19'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechevron-right
 */
export const OutlineChevronrightIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChevronright} {...props} />
}

const OutlineCheck = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 13L9 17L19 7'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecheck
 */
export const OutlineCheckIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCheck} {...props} />
}