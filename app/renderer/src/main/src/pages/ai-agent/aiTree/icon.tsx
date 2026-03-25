import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

import styles from "./AITree.module.scss"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
    ref?: any
}

const TaskSuccess = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect width='16' height='16' rx='8' fill='var(--Colors-Use-Success-Primary)' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M7.9998 15.2C11.9763 15.2 15.1998 11.9765 15.1998 8.00005C15.1998 4.0236 11.9763 0.800049 7.9998 0.800049C4.02335 0.800049 0.799805 4.0236 0.799805 8.00005C0.799805 11.9765 4.02335 15.2 7.9998 15.2ZM11.3362 6.83644C11.6877 6.48497 11.6877 5.91512 11.3362 5.56365C10.9847 5.21218 10.4149 5.21218 10.0634 5.56365L7.0998 8.52726L5.9362 7.36365C5.58473 7.01218 5.01488 7.01218 4.66341 7.36365C4.31194 7.71512 4.31194 8.28497 4.66341 8.63644L6.46341 10.4364C6.81488 10.7879 7.38473 10.7879 7.7362 10.4364L11.3362 6.83644Z'
            fill='var(--Colors-Use-Basic-Background)'
        />
    </svg>
)
export const TaskSuccessIcon = (props: Partial<IconProps>) => {
    return <Icon component={TaskSuccess} {...props} />
}

const TaskError = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect width='16' height='16' rx='8' fill='var(--Colors-Use-Error-Primary)' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M7.9998 15.2C11.9763 15.2 15.1998 11.9765 15.1998 8.00005C15.1998 4.0236 11.9763 0.800049 7.9998 0.800049C4.02335 0.800049 0.799805 4.0236 0.799805 8.00005C0.799805 11.9765 4.02335 15.2 7.9998 15.2ZM6.8362 5.56365C6.48473 5.21218 5.91488 5.21218 5.56341 5.56365C5.21194 5.91512 5.21194 6.48497 5.56341 6.83644L6.72701 8.00005L5.56341 9.16365C5.21194 9.51512 5.21194 10.085 5.56341 10.4364C5.91488 10.7879 6.48473 10.7879 6.8362 10.4364L7.9998 9.27284L9.16341 10.4364C9.51488 10.7879 10.0847 10.7879 10.4362 10.4364C10.7877 10.085 10.7877 9.51512 10.4362 9.16365L9.2726 8.00005L10.4362 6.83644C10.7877 6.48497 10.7877 5.91512 10.4362 5.56365C10.0847 5.21218 9.51488 5.21218 9.16341 5.56365L7.9998 6.72726L6.8362 5.56365Z'
            fill='var(--Colors-Use-Basic-Background)'
        />
    </svg>
)
export const TaskErrorIcon = (props: Partial<IconProps>) => {
    return <Icon component={TaskError} {...props} />
}

const TaskSkipped = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect width='16' height='16' rx='8' fill='var(--Colors-Use-Neutral-Disable)' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M7.9998 15.2C11.9763 15.2 15.1998 11.9765 15.1998 8.00005C15.1998 4.0236 11.9763 0.800049 7.9998 0.800049C4.02335 0.800049 0.799805 4.0236 0.799805 8.00005C0.799805 11.9765 4.02335 15.2 7.9998 15.2ZM5.2998 7.10005C4.80275 7.10005 4.3998 7.50299 4.3998 8.00005C4.3998 8.4971 4.80275 8.90005 5.2998 8.90005H10.6998C11.1969 8.90005 11.5998 8.49711 11.5998 8.00005C11.5998 7.50299 11.1969 7.10005 10.6998 7.10005H5.2998Z'
            fill='var(--Colors-Use-Basic-Background)'
        />
    </svg>
)
export const TaskSkippedIcon = (props: Partial<IconProps>) => {
    return <Icon component={TaskSkipped} {...props} />
}

export const TaskWaitIcon: React.FC<{}> = React.memo((props) => {
    return <div className={styles["task-wait-icon"]}></div>
})

export const TaskInProgressIcon: React.FC<{}> = React.memo((props) => {
    return (
        <div className={styles["task-in-progress-icon"]}>
            <div className={styles["center-wrapper"]}></div>
        </div>
    )
})
