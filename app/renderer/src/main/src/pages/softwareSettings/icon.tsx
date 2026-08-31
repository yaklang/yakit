import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import type React from 'react'

interface IconProps extends CustomIconComponentProps {
  onClick: (e: React.MouseEvent) => void
}

const DocumentTextSvg = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.3999 6.39995C6.3999 4.63264 7.83259 3.19995 9.5999 3.19995H16.9372C17.7859 3.19995 18.5998 3.53709 19.1999 4.13721L24.6626 9.59995C25.2628 10.2001 25.5999 11.014 25.5999 11.8627V25.5999C25.5999 27.3673 24.1672 28.7999 22.3999 28.7999H9.5999C7.83259 28.7999 6.3999 27.3673 6.3999 25.5999V6.39995Z"
      fill="#56C991"
      stroke="#31343F"
      strokeLinejoin="round"
    />
    <rect x="10" y="15" width="12" height="2" rx="1" fill="white" />
    <rect x="10" y="21" width="12" height="2" rx="1" fill="white" />
  </svg>
)
/** @name 文档图标 */
export const DocumentTextSvgIcon = (props: Partial<IconProps>) => {
  return <Icon component={DocumentTextSvg} {...props} />
}

const DocumentAddSvg = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.5999 3.19995C7.83259 3.19995 6.3999 4.63264 6.3999 6.39995V25.5999C6.3999 27.3673 7.83259 28.7999 9.5999 28.7999H22.3999C24.1672 28.7999 25.5999 27.3673 25.5999 25.5999V11.8627C25.5999 11.014 25.2628 10.2001 24.6626 9.59995L19.1999 4.13721C18.5998 3.53709 17.7859 3.19995 16.9372 3.19995H9.5999Z"
      fill="#56C991"
      stroke="#31343F"
      strokeLinejoin="round"
    />
    <rect x="10" y="16" width="12" height="2" rx="1" fill="white" />
    <rect x="15" y="11" width="2" height="12" rx="1" fill="white" />
  </svg>
)
/** @name 文档添加图标 */
export const DocumentAddSvgIcon = (props: Partial<IconProps>) => {
  return <Icon component={DocumentAddSvg} {...props} />
}

const FolderOpenSvg = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10.1 19.2C10.1 17.7088 11.3088 16.5 12.8 16.5H25.5999C27.0911 16.5 28.2999 17.7088 28.2999 19.2V22.4C28.2999 23.8912 27.0911 25.1 25.5999 25.1H8.92979C9.64998 24.4249 10.1 23.465 10.1 22.4V19.2Z"
      fill="#FFB660"
      stroke="#31343F"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.19995 9.60002C3.19995 7.83271 4.63264 6.40002 6.39995 6.40002H12.8L16 9.60002H22.4C24.1673 9.60002 25.5999 11.0327 25.5999 12.8V14.4H12.8C10.149 14.4 7.99995 16.5491 7.99995 19.2V21.6C7.99995 22.9255 6.92543 24 5.59995 24C4.27447 24 3.19995 22.9255 3.19995 21.6V9.60002Z"
      fill="#F28B44"
      stroke="#31343F"
    />
  </svg>
)
/** @name 文件夹打开图标 */
export const FolderOpenSvgIcon = (props: Partial<IconProps>) => {
  return <Icon component={FolderOpenSvg} {...props} />
}

const DocumentDownloadSvg = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.60002 3.19995C7.83271 3.19995 6.40002 4.63264 6.40002 6.39995V25.5999C6.40002 27.3673 7.83271 28.7999 9.60002 28.7999H22.4C24.1673 28.7999 25.6 27.3673 25.6 25.5999V11.8627C25.6 11.014 25.2629 10.2001 24.6628 9.59995L19.2 4.13721C18.5999 3.53709 17.786 3.19995 16.9373 3.19995H9.60002Z"
      fill="#8863F7"
      stroke="#31343F"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M21 17.3333L16 22M16 22L11 17.3333M16 22V12"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** @name 文档下载图标 */
export const DocumentDownloadSvgIcon = (props: Partial<IconProps>) => {
  return <Icon component={DocumentDownloadSvg} {...props} />
}

const SoftwareRemoteSvg = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="1.6665"
      y="2.5"
      width="16.6667"
      height="12.5"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.49996 10.143V5.83332M7.49996 5.83332L11.8096 5.83334M7.49996 5.83332L13.3334 11.6667"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.6665 17.5H13.3332"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** @name 软件设置-远程连接图标 */
export const SoftwareRemoteSvgIcon = (props: Partial<IconProps>) => {
  return <Icon component={SoftwareRemoteSvg} {...props} />
}
