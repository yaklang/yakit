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
        <rect width='16' height='16' rx='8' fill='#28C08E' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M8.00005 15.2C11.9765 15.2 15.2 11.9764 15.2 7.99999C15.2 4.02354 11.9765 0.799988 8.00005 0.799988C4.0236 0.799988 0.800049 4.02354 0.800049 7.99999C0.800049 11.9764 4.0236 15.2 8.00005 15.2ZM11.3364 6.83638C11.6879 6.48491 11.6879 5.91506 11.3364 5.56359C10.985 5.21212 10.4151 5.21212 10.0637 5.56359L7.10005 8.5272L5.93644 7.36359C5.58497 7.01212 5.01512 7.01212 4.66365 7.36359C4.31218 7.71506 4.31218 8.28491 4.66365 8.63638L6.46365 10.4364C6.81512 10.7879 7.38497 10.7879 7.73644 10.4364L11.3364 6.83638Z'
            fill='white'
        />
    </svg>
)
export const TaskSuccessIcon = (props: Partial<IconProps>) => {
    return <Icon component={TaskSuccess} {...props} />
}

const TaskError = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect width='16' height='16' rx='8' fill='#F15757' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M8.00005 15.2C11.9765 15.2 15.2 11.9764 15.2 7.99999C15.2 4.02354 11.9765 0.799988 8.00005 0.799988C4.0236 0.799988 0.800049 4.02354 0.800049 7.99999C0.800049 11.9764 4.0236 15.2 8.00005 15.2ZM6.83645 5.56359C6.48497 5.21212 5.91512 5.21212 5.56365 5.56359C5.21218 5.91506 5.21218 6.48491 5.56365 6.83638L6.72726 7.99999L5.56365 9.16359C5.21218 9.51506 5.21218 10.0849 5.56365 10.4364C5.91512 10.7879 6.48497 10.7879 6.83644 10.4364L8.00005 9.27278L9.16365 10.4364C9.51512 10.7879 10.085 10.7879 10.4364 10.4364C10.7879 10.0849 10.7879 9.51506 10.4364 9.16359L9.27284 7.99999L10.4364 6.83638C10.7879 6.48491 10.7879 5.91506 10.4364 5.56359C10.085 5.21212 9.51512 5.21212 9.16365 5.56359L8.00005 6.7272L6.83645 5.56359Z'
            fill='white'
        />
    </svg>
)
export const TaskErrorIcon = (props: Partial<IconProps>) => {
    return <Icon component={TaskError} {...props} />
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
