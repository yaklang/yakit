import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'

type MenuCollapseIconProps = Partial<CustomIconComponentProps> & {
  size?: number
  color?: string
}

const MenuCollapseSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" fill="none">
    <path d="M2.5 3.33331H17.5M2.5 16.6666H17.5" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
    <path
      d="M10 7.5V14.1667M10 7.5C10.4668 7.5 11.339 8.95418 11.6667 9.32292M10 7.5C9.53319 7.5 8.66103 8.95418 8.33334 9.32292"
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </svg>
)

export const MenuCollapseIcon = ({ size = 16, color = 'currentColor', style, ...props }: MenuCollapseIconProps) => (
  <Icon component={MenuCollapseSvg} style={{ fontSize: size, color, ...style }} {...props} />
)

const MenuExpandSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" fill="none">
    <path d="M2.5 3.33331H17.5M2.5 8.33331H17.5" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
    <path
      d="M9.99998 10.8333V17.5M11.6666 15.8333L9.99998 17.5L8.33331 15.8333"
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    />
  </svg>
)

export const MenuExpandIcon = ({ size = 16, color = 'currentColor', style, ...props }: MenuCollapseIconProps) => (
  <Icon component={MenuExpandSvg} style={{ fontSize: size, color, ...style }} {...props} />
)
