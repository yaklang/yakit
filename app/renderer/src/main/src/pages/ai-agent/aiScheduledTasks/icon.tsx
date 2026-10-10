import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import type React from 'react'

interface IconProps extends CustomIconComponentProps {
  onClick: (e: React.MouseEvent) => void
}

const OutlineArrowUpFromDot = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M19 9L12 2L5 9M12 2V16M13 21C13 21.5523 12.5523 22 12 22C11.4477 22 11 21.5523 11 21C11 20.4477 11.4477 20 12 20C12.5523 20 13 20.4477 13 21Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** @description Outline/ArrowUpFromDot */
export const OutlineArrowUpFromDotIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineArrowUpFromDot} {...props} />
}
