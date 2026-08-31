import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import type React from 'react'

interface IconProps extends CustomIconComponentProps {
  onClick: (e: React.MouseEvent) => void
}

const Expand = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="18" viewBox="0 0 17 18" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.7636 6.56365C4.11508 6.21218 4.68492 6.21218 5.0364 6.56365L8 9.52726L10.9636 6.56365C11.3151 6.21218 11.8849 6.21218 12.2364 6.56365C12.5879 6.91512 12.5879 7.48497 12.2364 7.83645L8.6364 11.4364C8.28492 11.7879 7.71508 11.7879 7.3636 11.4364L3.7636 7.83645C3.41213 7.48497 3.41213 6.91512 3.7636 6.56365Z"
      fill="white"
    />
  </svg>
)
/**
 * @description  收起图标
 */
export const ExpandIcon = (props: Partial<IconProps>) => {
  return <Icon component={Expand} {...props} />
}
