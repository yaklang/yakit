import Icon from '@ant-design/icons'
import { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import React from 'react'

interface IconProps extends CustomIconComponentProps {
  onClick: (e: React.MouseEvent) => void
}

const AIToDoListPending = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle
      cx="8"
      cy="8"
      r="7.6"
      fill="var(--Colors-Use-Neutral-Bg)"
      stroke="var(--Colors-Use-Neutral-Disable)"
      strokeWidth="0.8"
    />
  </svg>
)
/**
 * @description 等待中
 */
export const AIToDoListPendingIcon = (props: Partial<IconProps>) => {
  return <Icon component={AIToDoListPending} {...props} />
}

const AIToDoListDone = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="16" height="16" rx="8" fill="var(--Colors-Use-Neutral-Disable)" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.9998 16.2008C12.9763 16.2008 16.1998 12.9772 16.1998 9.00078C16.1998 5.02433 12.9763 1.80078 8.9998 1.80078C5.02335 1.80078 1.7998 5.02433 1.7998 9.00078C1.7998 12.9772 5.02335 16.2008 8.9998 16.2008ZM12.3362 7.83718C12.6877 7.48571 12.6877 6.91586 12.3362 6.56439C11.9847 6.21291 11.4149 6.21291 11.0634 6.56439L8.0998 9.52799L6.9362 8.36438C6.58473 8.01291 6.01488 8.01291 5.66341 8.36438C5.31194 8.71586 5.31194 9.2857 5.66341 9.63718L7.46341 11.4372C7.81488 11.7886 8.38473 11.7886 8.7362 11.4372L12.3362 7.83718Z"
      fill="var(--Colors-Use-Neutral-Bg)"
    />
  </svg>
)
/**
 * @description 完成
 */
export const AIToDoListDoneIcon = (props: Partial<IconProps>) => {
  return <Icon component={AIToDoListDone} {...props} />
}

const AIToDoListDeleted = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="16" height="16" rx="8" fill="var(--Colors-Use-Neutral-Disable)" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.9998 16.2008C12.9763 16.2008 16.1998 12.9772 16.1998 9.00078C16.1998 5.02433 12.9763 1.80078 8.9998 1.80078C5.02335 1.80078 1.7998 5.02433 1.7998 9.00078C1.7998 12.9772 5.02335 16.2008 8.9998 16.2008ZM7.8362 6.56439C7.48473 6.21291 6.91488 6.21291 6.56341 6.56439C6.21194 6.91586 6.21194 7.48571 6.56341 7.83718L7.72701 9.00078L6.56341 10.1644C6.21194 10.5159 6.21194 11.0857 6.56341 11.4372C6.91488 11.7886 7.48473 11.7886 7.8362 11.4372L8.9998 10.2736L10.1634 11.4372C10.5149 11.7886 11.0847 11.7886 11.4362 11.4372C11.7877 11.0857 11.7877 10.5159 11.4362 10.1644L10.2726 9.00078L11.4362 7.83718C11.7877 7.48571 11.7877 6.91586 11.4362 6.56439C11.0847 6.21291 10.5149 6.21291 10.1634 6.56439L8.9998 7.72799L7.8362 6.56439Z"
      fill="var(--Colors-Use-Neutral-Bg)"
    />
  </svg>
)
/**
 * @description 删除
 */
export const AIToDoListDeletedIcon = (props: Partial<IconProps>) => {
  return <Icon component={AIToDoListDeleted} {...props} />
}

const AIToDoListSkipped = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1 9C1 4.58172 4.58172 1 9 1C13.4183 1 17 4.58172 17 9C17 13.4183 13.4183 17 9 17C4.58172 17 1 13.4183 1 9Z"
      fill="var(--Colors-Use-Neutral-Disable)"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.9998 16.2008C12.9763 16.2008 16.1998 12.9772 16.1998 9.00078C16.1998 5.02433 12.9763 1.80078 8.9998 1.80078C5.02335 1.80078 1.7998 5.02433 1.7998 9.00078C1.7998 12.9772 5.02335 16.2008 8.9998 16.2008ZM6.2998 8.10078C5.80275 8.10078 5.3998 8.50373 5.3998 9.00078C5.3998 9.49784 5.80275 9.90078 6.2998 9.90078H11.6998C12.1969 9.90078 12.5998 9.49784 12.5998 9.00078C12.5998 8.50373 12.1969 8.10078 11.6998 8.10078H6.2998Z"
      fill="var(--Colors-Use-Neutral-Bg)"
    />
  </svg>
)
/**
 * @description 跳过
 */
export const AIToDoListSkippedIcon = (props: Partial<IconProps>) => {
  return <Icon component={AIToDoListSkipped} {...props} />
}
