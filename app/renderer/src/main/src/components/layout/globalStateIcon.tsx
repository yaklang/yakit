import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
}

const Error = () => (
    <svg width='28' height='28' viewBox='0 0 28 28' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <circle cx='14' cy='14' r='13.5' fill='#FEF1F1' stroke='#F7544A' strokeDasharray='2 2' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M12.4314 7.78894C13.1195 6.56557 14.8809 6.56557 15.569 7.78894L20.5913 16.7174C21.2662 17.9173 20.3991 19.3999 19.0225 19.3999H8.97791C7.60123 19.3999 6.73414 17.9173 7.40908 16.7174L12.4314 7.78894ZM14.9001 16.7C14.9001 17.1971 14.4972 17.6 14.0001 17.6C13.5031 17.6 13.1001 17.1971 13.1001 16.7C13.1001 16.2029 13.5031 15.8 14.0001 15.8C14.4972 15.8 14.9001 16.2029 14.9001 16.7ZM14.0001 9.5C13.5031 9.5 13.1001 9.90295 13.1001 10.4V13.1C13.1001 13.5971 13.5031 14 14.0001 14C14.4972 14 14.9001 13.5971 14.9001 13.1V10.4C14.9001 9.90295 14.4972 9.5 14.0001 9.5Z'
            fill='#F6544A'
        />
    </svg>
)
export const ErrorIcon = (props: Partial<IconProps>) => {
    return <Icon component={Error} {...props} />
}

const Warning = () => (
    <svg width='28' height='28' viewBox='0 0 28 28' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <circle cx='14' cy='14' r='13.5' fill='#FFB660' fillOpacity='0.1' stroke='#FFB660' strokeDasharray='2 2' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M12.4314 7.78893C13.1195 6.56556 14.8809 6.56556 15.569 7.78893L20.5913 16.7174C21.2662 17.9173 20.3991 19.3999 19.0225 19.3999H8.97791C7.60123 19.3999 6.73414 17.9173 7.40908 16.7174L12.4314 7.78893ZM14.9001 16.7C14.9001 17.197 14.4972 17.6 14.0001 17.6C13.5031 17.6 13.1001 17.197 13.1001 16.7C13.1001 16.2029 13.5031 15.8 14.0001 15.8C14.4972 15.8 14.9001 16.2029 14.9001 16.7ZM14.0001 9.49999C13.5031 9.49999 13.1001 9.90293 13.1001 10.4V13.1C13.1001 13.597 13.5031 14 14.0001 14C14.4972 14 14.9001 13.597 14.9001 13.1V10.4C14.9001 9.90293 14.4972 9.49999 14.0001 9.49999Z'
            fill='#FFB660'
        />
    </svg>
)
export const WarningIcon = (props: Partial<IconProps>) => {
    return <Icon component={Warning} {...props} />
}

const Success = () => (
    <svg width='28' height='28' viewBox='0 0 28 28' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <circle cx='14' cy='14' r='13.5' fill='#56C991' fillOpacity='0.1' stroke='#56C991' strokeDasharray='2 2' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M20.0366 9.7636C20.3881 10.1151 20.3881 10.6849 20.0366 11.0364L12.8366 18.2364C12.4851 18.5879 11.9153 18.5879 11.5638 18.2364L7.9638 14.6364C7.61233 14.2849 7.61233 13.7151 7.9638 13.3636C8.31527 13.0121 8.88512 13.0121 9.23659 13.3636L12.2002 16.3272L18.7638 9.7636C19.1153 9.41213 19.6851 9.41213 20.0366 9.7636Z'
            fill='#56C991'
        />
    </svg>
)
export const SuccessIcon = (props: Partial<IconProps>) => {
    return <Icon component={Success} {...props} />
}

const Help = () => (
    <svg width='28' height='28' viewBox='0 0 28 28' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <circle cx='14' cy='14' r='13.5' fill='#8863F7' fillOpacity='0.1' stroke='#8863F7' strokeDasharray='2 2' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M21.1998 14C21.1998 17.9764 17.9763 21.2 13.9998 21.2C10.0234 21.2 6.7998 17.9764 6.7998 14C6.7998 10.0235 10.0234 6.79999 13.9998 6.79999C17.9763 6.79999 21.1998 10.0235 21.1998 14ZM13.9998 11.3C13.6678 11.3 13.3766 11.4793 13.2197 11.7506C12.9708 12.1809 12.4202 12.3279 11.99 12.079C11.5597 11.8301 11.4127 11.2796 11.6616 10.8493C12.1271 10.0447 12.9993 9.49999 13.9998 9.49999C15.491 9.49999 16.6998 10.7088 16.6998 12.2C16.6998 13.3756 15.9485 14.3757 14.8998 14.7464V14.9C14.8998 15.397 14.4969 15.8 13.9998 15.8C13.5028 15.8 13.0998 15.397 13.0998 14.9V14C13.0998 13.5029 13.5028 13.1 13.9998 13.1C14.4969 13.1 14.8998 12.697 14.8998 12.2C14.8998 11.7029 14.4969 11.3 13.9998 11.3ZM13.9998 18.5C14.4969 18.5 14.8998 18.097 14.8998 17.6C14.8998 17.1029 14.4969 16.7 13.9998 16.7C13.5027 16.7 13.0998 17.1029 13.0998 17.6C13.0998 18.097 13.5027 18.5 13.9998 18.5Z'
            fill='#8863F7'
        />
    </svg>
)
export const HelpIcon = (props: Partial<IconProps>) => {
    return <Icon component={Help} {...props} />
}

const ShieldCheck = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fill-rule='evenodd'
            clip-rule='evenodd'
            d='M3.46597 7.99825C8.27919 7.93295 12.6646 6.09653 16.0002 3.11113C19.3357 6.09653 23.7212 7.93294 28.5344 7.99825C28.7092 9.03948 28.8002 10.1091 28.8002 11.2C28.8002 19.5598 23.4574 26.6717 16.0002 29.3075C8.54297 26.6717 3.2002 19.5598 3.2002 11.2C3.2002 10.1091 3.29118 9.03948 3.46597 7.99825ZM21.9316 13.9314C22.5564 13.3065 22.5564 12.2935 21.9316 11.6686C21.3067 11.0438 20.2937 11.0438 19.6688 11.6686L14.4002 16.9373L12.3316 14.8686C11.7067 14.2438 10.6937 14.2438 10.0688 14.8686C9.44399 15.4935 9.44399 16.5065 10.0688 17.1314L13.2688 20.3314C13.8937 20.9562 14.9067 20.9562 15.5316 20.3314L21.9316 13.9314Z'
            fill='#56C991'
        />
    </svg>
)
export const ShieldCheckIcon = (props: Partial<IconProps>) => {
    return <Icon component={ShieldCheck} {...props} />
}
