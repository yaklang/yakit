import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
    ref?: any
}

const YakRunnerNewFile = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.5999 3.19995C7.83259 3.19995 6.3999 4.63264 6.3999 6.39995V25.5999C6.3999 27.3673 7.83259 28.7999 9.5999 28.7999H22.3999C24.1672 28.7999 25.5999 27.3673 25.5999 25.5999V11.8627C25.5999 11.014 25.2628 10.2001 24.6626 9.59995L19.1999 4.13721C18.5998 3.53709 17.7859 3.19995 16.9372 3.19995H9.5999Z'
            fill='#F28B44'
            stroke='#31343F'
        />
        <rect x='10' y='16' width='12' height='2' rx='1' fill='white' />
        <rect x='15' y='11' width='2' height='12' rx='1' fill='white' />
    </svg>
)
export const YakRunnerNewFileIcon = (props: Partial<IconProps>) => {
    return <Icon component={YakRunnerNewFile} {...props} />
}

const YakRunnerOpenFile = () => (
    <svg width='33' height='32' viewBox='0 0 33 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M7.06641 6.39995C7.06641 4.63264 8.49909 3.19995 10.2664 3.19995H17.6037C18.4524 3.19995 19.2663 3.53709 19.8664 4.13721L25.3291 9.59995C25.9293 10.2001 26.2664 11.014 26.2664 11.8627V25.5999C26.2664 27.3673 24.8337 28.7999 23.0664 28.7999H10.2664C8.49909 28.7999 7.06641 27.3673 7.06641 25.5999V6.39995Z'
            fill='#56C991'
            stroke='#31343F'
            stroke-linejoin='round'
        />
        <rect x='10.6665' y='15' width='12' height='2' rx='1' fill='white' />
        <rect x='10.6665' y='21' width='12' height='2' rx='1' fill='white' />
    </svg>
)
export const YakRunnerOpenFileIcon = (props: Partial<IconProps>) => {
    return <Icon component={YakRunnerOpenFile} {...props} />
}

const YakRunnerOpenFolder = () => (
    <svg width='33' height='32' viewBox='0 0 33 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9.9332 19.2C9.9332 17.4327 11.3659 16 13.1332 16H25.9332C27.7005 16 29.1332 17.4327 29.1332 19.2V22.4C29.1332 24.1673 27.7005 25.6 25.9332 25.6H3.5332H6.7332C8.50051 25.6 9.9332 24.1673 9.9332 22.4V19.2Z'
            fill='#35D8EE'
            stroke='#31343F'
            stroke-linejoin='round'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M3.5332 9.5999C3.5332 7.83259 4.96589 6.3999 6.7332 6.3999H13.1332L16.3332 9.5999H22.7332C24.5005 9.5999 25.9332 11.0326 25.9332 12.7999V14.3999H13.1332C10.4822 14.3999 8.3332 16.5489 8.3332 19.1999V21.5999C8.3332 22.9254 7.25869 23.9999 5.9332 23.9999C4.60772 23.9999 3.5332 22.9254 3.5332 21.5999V9.5999Z'
            fill='#23B5C9'
            stroke='#31343F'
            stroke-linejoin='round'
        />
    </svg>
)
export const YakRunnerOpenFolderIcon = (props: Partial<IconProps>) => {
    return <Icon component={YakRunnerOpenFolder} {...props} />
}
