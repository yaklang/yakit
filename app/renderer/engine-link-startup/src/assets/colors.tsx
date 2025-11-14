import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
}

const SolidCloseCircle = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'>
        <g clipPath='url(#clip0_37277_17516)'>
            <path
                d='M7 0.875C3.61758 0.875 0.875 3.61758 0.875 7C0.875 10.3824 3.61758 13.125 7 13.125C10.3824 13.125 13.125 10.3824 13.125 7C13.125 3.61758 10.3824 0.875 7 0.875ZM9.26133 9.32695L8.35898 9.32285L7 7.70273L5.64238 9.32148L4.73867 9.32559C4.67852 9.32559 4.6293 9.27773 4.6293 9.21621C4.6293 9.19023 4.63887 9.16563 4.65527 9.14512L6.43398 7.02598L4.65527 4.9082C4.63875 4.88817 4.62959 4.86308 4.6293 4.83711C4.6293 4.77695 4.67852 4.72773 4.73867 4.72773L5.64238 4.73184L7 6.35195L8.35762 4.7332L9.25996 4.7291C9.32012 4.7291 9.36934 4.77695 9.36934 4.83848C9.36934 4.86445 9.35977 4.88906 9.34336 4.90957L7.56738 7.02734L9.34473 9.14648C9.36113 9.16699 9.3707 9.1916 9.3707 9.21758C9.3707 9.27773 9.32148 9.32695 9.26133 9.32695Z'
                fill='var(--Colors-Use-Neutral-Disable)'
            />
        </g>
        <defs>
            <clipPath id='clip0_37277_17516'>
                <rect width='14' height='14' fill='var(--Colors-Use-Neutral-Bg)' />
            </clipPath>
        </defs>
    </svg>
)

/**
 * @description  Icon/Solid/close-circle
 */
export const SolidCloseCircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={SolidCloseCircle} {...props} />
}
