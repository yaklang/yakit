import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import type React from 'react'

interface IconProps extends CustomIconComponentProps {
  onClick: (e: React.MouseEvent) => void
  ref?: any
}
const SolidOutlineSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M13 13L9 9M10.3333 5.66667C10.3333 8.244 8.244 10.3333 5.66667 10.3333C3.08934 10.3333 1 8.244 1 5.66667C1 3.08934 3.08934 1 5.66667 1C8.244 1 10.3333 3.08934 10.3333 5.66667Z"
      stroke="var(--Colors-Use-Neutral-Text-3-Secondary)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const SolidOutlineSearchIcon = (props: Partial<IconProps>) => <Icon component={SolidOutlineSearch} {...props} />

const SolidFloatwin = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <mask id="path-1-inside-1_4936_115787" fill="white">
      <rect x="3" y="3" width="16" height="14" rx="1" />
    </mask>
    <rect
      x="3"
      y="3"
      width="16"
      height="14"
      rx="1"
      stroke="currentColor"
      strokeWidth="4"
      mask="url(#path-1-inside-1_4936_115787)"
    />
    <rect x="2" y="2" width="12" height="9" rx="1" fill="white" />
    <rect x="1" y="1" width="12" height="9" rx="1" fill="currentColor" />
  </svg>
)

/**
 * @description  Icon/Solid/Solid浮窗
 */
export const SolidFloatwinIcon = (props: Partial<IconProps>) => {
  return <Icon component={SolidFloatwin} {...props} />
}

const SolidTodown = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="11" width="16" height="6" rx="1" fill="currentColor" />
    <mask id="path-2-inside-1_4936_115788" fill="white">
      <rect x="2" y="3" width="16" height="14" rx="1" />
    </mask>
    <rect
      x="2"
      y="3"
      width="16"
      height="14"
      rx="1"
      stroke="currentColor"
      strokeWidth="4"
      mask="url(#path-2-inside-1_4936_115788)"
    />
  </svg>
)

/**
 * @description  Icon/Solid/Solid靠下
 */
export const SolidTodownIcon = (props: Partial<IconProps>) => {
  return <Icon component={SolidTodown} {...props} />
}

const SolidToright = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="3" width="6" height="14" rx="1" fill="currentColor" />
    <mask id="path-2-inside-1_4936_115789" fill="white">
      <rect x="2" y="3" width="16" height="14" rx="1" />
    </mask>
    <rect
      x="2"
      y="3"
      width="16"
      height="14"
      rx="1"
      stroke="currentColor"
      strokeWidth="4"
      mask="url(#path-2-inside-1_4936_115789)"
    />
  </svg>
)

/**
 * @description  Icon/Solid/Solid靠右
 */
export const SolidTorightIcon = (props: Partial<IconProps>) => {
  return <Icon component={SolidToright} {...props} />
}

const SolidToleft = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="6" height="14" rx="1" fill="currentColor" />
    <mask id="path-2-inside-1_4936_115790" fill="white">
      <rect x="2" y="3" width="16" height="14" rx="1" />
    </mask>
    <rect
      x="2"
      y="3"
      width="16"
      height="14"
      rx="1"
      stroke="currentColor"
      strokeWidth="4"
      mask="url(#path-2-inside-1_4936_115790)"
    />
  </svg>
)

/**
 * @description  Icon/Solid/Solid靠左
 */
export const SolidToleftIcon = (props: Partial<IconProps>) => {
  return <Icon component={SolidToleft} {...props} />
}

const SolidCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="3" fill="currentColor" />
  </svg>
)

/**
 * @description  Icon/Solid/实心圆
 */
export const SolidCircleIcon = (props: Partial<IconProps>) => {
  return <Icon component={SolidCircle} {...props} />
}

const SolidLightningBolt = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" fill="none">
    <path
      d="M6.66675 5.66667V1L0.666748 8.33333H5.33342L5.33342 13L11.3334 5.66667L6.66675 5.66667Z"
      stroke="var(--Colors-Use-Neutral-Text-3-Secondary)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const SolidLightningBoltIcon = (props: Partial<IconProps>) => {
  return <Icon component={SolidLightningBolt} {...props} />
}
