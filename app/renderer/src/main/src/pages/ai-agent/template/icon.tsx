import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import { useId } from 'react'
import type { MouseEvent } from 'react'

interface IconProps extends CustomIconComponentProps {
  onClick: (event: MouseEvent) => void
}

const OutlineAI = () => {
  const id = useId()

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 10.5V20M4 20L5.38889 15M5.38889 15L8.03648 5.46867C8.30772 4.49219 9.69228 4.49219 9.96352 5.46867L12.6111 15M5.38889 15H12.6111M14 20L12.6111 15"
        stroke={`url(#${id}-paint0)`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 7L22.1249 7.46386C22.3102 8.15215 22.8479 8.68979 23.5361 8.87511L24 9L23.5361 9.12489C22.8479 9.31021 22.3102 9.84785 22.1249 10.5361L22 11L21.8751 10.5361C21.6898 9.84785 21.1521 9.31021 20.4639 9.12489L20 9L20.4639 8.87511C21.1521 8.68979 21.6898 8.15215 21.8751 7.46386L22 7Z"
        fill={`url(#${id}-paint1)`}
      />
      <path
        d="M18 0L18.2498 0.927722C18.6204 2.3043 19.6957 3.37957 21.0723 3.75021L22 4L21.0723 4.24979C19.6957 4.62043 18.6204 5.6957 18.2498 7.07228L18 8L17.7502 7.07228C17.3796 5.6957 16.3043 4.62043 14.9277 4.24979L14 4L14.9277 3.75021C16.3043 3.37957 17.3796 2.3043 17.7502 0.927723L18 0Z"
        fill={`url(#${id}-paint2)`}
      />
      <defs>
        <linearGradient id={`${id}-paint0`} x1="4" y1="4.73631" x2="18.497" y2="5.22388" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--yakit-colors-Lake-blue-80)" />
          <stop offset="0.25" stopColor="var(--yakit-colors-Blue-70)" />
          <stop offset="0.85" stopColor="var(--yakit-colors-Magenta-60)" />
          <stop offset="1" stopColor="var(--yakit-colors-Yellow-60)" />
        </linearGradient>
        <linearGradient id={`${id}-paint1`} x1="14" y1="0" x2="24.3552" y2="0.345187" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--yakit-colors-Lake-blue-80)" />
          <stop offset="0.25" stopColor="var(--yakit-colors-Blue-70)" />
          <stop offset="0.85" stopColor="var(--yakit-colors-Magenta-60)" />
          <stop offset="1" stopColor="var(--yakit-colors-Yellow-60)" />
        </linearGradient>
        <linearGradient id={`${id}-paint2`} x1="14" y1="0" x2="24.3552" y2="0.345187" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--yakit-colors-Lake-blue-80)" />
          <stop offset="0.25" stopColor="var(--yakit-colors-Blue-70)" />
          <stop offset="0.85" stopColor="var(--yakit-colors-Magenta-60)" />
          <stop offset="1" stopColor="var(--yakit-colors-Yellow-60)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** @description Outline/AI */
export const OutlineAIIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineAI} {...props} />
}

const OutlineAt = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M15.75 12C15.75 14.0711 14.0711 15.75 12 15.75C9.92893 15.75 8.25 14.0711 8.25 12C8.25 9.92893 9.92893 8.25 12 8.25C14.0711 8.25 15.75 9.92893 15.75 12ZM15.75 12C15.75 14.0709 16.5 15.75 18.375 15.75C20.25 15.75 21 14.0709 21 12C21 10.22 20.4722 8.47991 19.4832 6.99987C18.4943 5.51983 17.0887 4.36627 15.4442 3.68508C13.7996 3.0039 11.99 2.82567 10.2442 3.17293C8.49836 3.5202 6.89471 4.37737 5.63604 5.63604C4.37737 6.89471 3.5202 8.49836 3.17293 10.2442C2.82567 11.99 3.0039 13.7996 3.68508 15.4442C4.36627 17.0887 5.51983 18.4943 6.99987 19.4832C8.47991 20.4722 10.22 21 12 21C13.8403 21 15.8241 20.4478 17.25 19.5M15.75 12V8.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** @description Outline/At */
export const OutlineAtIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineAt} {...props} />
}
