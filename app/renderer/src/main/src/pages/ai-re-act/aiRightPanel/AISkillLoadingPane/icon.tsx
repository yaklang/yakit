import Icon from '@ant-design/icons'
import type { IconProps } from './type'

const OutlineArrowsUpDown = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    style={{ color: 'inherit' }}
  >
    <path
      d="M7 3V21M4 6L7 3L10 6M14 18L17 21L20 18M17 21V3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** @description Outline/arrows-up-down */
export const OutlineArrowsUpDownIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineArrowsUpDown} {...props} />
}

const OutlineArrowsTransferUp = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    style={{ color: 'inherit' }}
  >
    <path
      d="M7 21V15M4 18L7 21L10 18M14 6L17 3L20 6M17 3V21M7 3V5M7 9V11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** @description Outline/arrows-transfer-up */
export const OutlineArrowsTransferUpIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineArrowsTransferUp} {...props} />
}

const OutlineArrowsTransferDown = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    style={{ color: 'inherit' }}
  >
    <path
      d="M17 3V9M14 6L17 3L20 6M4 18L7 21L10 18M7 21V3M17 21V19M17 15V13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** @description Outline/arrows-transfer-down */
export const OutlineArrowsTransferDownIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineArrowsTransferDown} {...props} />
}
