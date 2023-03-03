import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
}

const DocumentTextSvg = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M6.3999 6.39995C6.3999 4.63264 7.83259 3.19995 9.5999 3.19995H16.9372C17.7859 3.19995 18.5998 3.53709 19.1999 4.13721L24.6626 9.59995C25.2628 10.2001 25.5999 11.014 25.5999 11.8627V25.5999C25.5999 27.3673 24.1672 28.7999 22.3999 28.7999H9.5999C7.83259 28.7999 6.3999 27.3673 6.3999 25.5999V6.39995Z'
            fill='#56C991'
            stroke='#31343F'
            strokeWidth='1.5'
            strokeLinejoin='round'
        />
        <rect x='10' y='15' width='12' height='2' rx='1' fill='white' />
        <rect x='10' y='21' width='12' height='2' rx='1' fill='white' />
    </svg>
)
/** @name 文档图标 */
export const DocumentTextSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={DocumentTextSvg} {...props} />
}

const DocumentAddSvg = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.5999 3.19995C7.83259 3.19995 6.3999 4.63264 6.3999 6.39995V25.5999C6.3999 27.3673 7.83259 28.7999 9.5999 28.7999H22.3999C24.1672 28.7999 25.5999 27.3673 25.5999 25.5999V11.8627C25.5999 11.014 25.2628 10.2001 24.6626 9.59995L19.1999 4.13721C18.5998 3.53709 17.7859 3.19995 16.9372 3.19995H9.5999Z'
            fill='#56C991'
            stroke='#31343F'
            strokeWidth='1.5'
            strokeLinejoin='round'
        />
        <rect x='10' y='16' width='12' height='2' rx='1' fill='white' />
        <rect x='15' y='11' width='2' height='12' rx='1' fill='white' />
    </svg>
)
/** @name 文档添加图标 */
export const DocumentAddSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={DocumentAddSvg} {...props} />
}

const FolderOpenSvg = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10.35 19.2C10.35 17.8469 11.4469 16.75 12.8 16.75H25.5999C26.953 16.75 28.0499 17.8469 28.0499 19.2V22.4C28.0499 23.7531 26.953 24.85 25.5999 24.85H9.49854C10.0316 24.1767 10.35 23.3255 10.35 22.4V19.2Z'
            fill='#FFB660'
            stroke='#31343F'
            strokeWidth='1.5'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M3.19995 9.60002C3.19995 7.83271 4.63264 6.40002 6.39995 6.40002H12.8L16 9.60002H22.4C24.1673 9.60002 25.5999 11.0327 25.5999 12.8V14.4H12.8C10.149 14.4 7.99995 16.5491 7.99995 19.2V21.6C7.99995 22.9255 6.92543 24 5.59995 24C4.27447 24 3.19995 22.9255 3.19995 21.6V9.60002Z'
            fill='#F28B44'
            stroke='#31343F'
            strokeWidth='1.5'
        />
    </svg>
)
/** @name 文件夹打开图标 */
export const FolderOpenSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={FolderOpenSvg} {...props} />
}

const DocumentDownloadSvg = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.60002 3.19995C7.83271 3.19995 6.40002 4.63264 6.40002 6.39995V25.5999C6.40002 27.3673 7.83271 28.7999 9.60002 28.7999H22.4C24.1673 28.7999 25.6 27.3673 25.6 25.5999V11.8627C25.6 11.014 25.2629 10.2001 24.6628 9.59995L19.2 4.13721C18.5999 3.53709 17.786 3.19995 16.9373 3.19995H9.60002Z'
            fill='#8863F7'
            stroke='#31343F'
            strokeWidth='1.5'
            strokeLinejoin='round'
        />
        <path
            d='M21 17.3333L16 22M16 22L11 17.3333M16 22V12'
            stroke='white'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 文档下载图标 */
export const DocumentDownloadSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={DocumentDownloadSvg} {...props} />
}

const ProjectDocumentTextSvg = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M4.80005 4.80002C4.80005 3.47454 5.87457 2.40002 7.20005 2.40002H12.703C13.3395 2.40002 13.95 2.65288 14.4 3.10297L18.4971 7.20002C18.9472 7.65011 19.2 8.26056 19.2 8.89708V19.2C19.2 20.5255 18.1255 21.6 16.8 21.6H7.20005C5.87456 21.6 4.80005 20.5255 4.80005 19.2V4.80002ZM7.20005 12C7.20005 11.3373 7.73731 10.8 8.40005 10.8H15.6C16.2628 10.8 16.8 11.3373 16.8 12C16.8 12.6628 16.2628 13.2 15.6 13.2H8.40005C7.73731 13.2 7.20005 12.6628 7.20005 12ZM8.40005 15.6C7.73731 15.6 7.20005 16.1373 7.20005 16.8C7.20005 17.4628 7.73731 18 8.40005 18H15.6C16.2628 18 16.8 17.4628 16.8 16.8C16.8 16.1373 16.2628 15.6 15.6 15.6H8.40005Z'
            fill='#56C991'
        />
    </svg>
)
/** @name 项目文档图标 */
export const ProjectDocumentTextSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={ProjectDocumentTextSvg} {...props} />
}

const ProjectFolderOpenSvg = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M2.3999 7.20005C2.3999 5.87457 3.47442 4.80005 4.7999 4.80005H9.5999L11.9999 7.20005H16.7999C18.1254 7.20005 19.1999 8.27457 19.1999 9.60005V10.8H9.5999C7.61168 10.8 5.9999 12.4118 5.9999 14.4V16.2C5.9999 17.1942 5.19402 18 4.1999 18C3.20579 18 2.3999 17.1941 2.3999 16.2V7.20005Z'
            fill='#FFB660'
        />
        <path
            d='M7.1999 14.4C7.1999 13.0746 8.27442 12 9.5999 12H19.1999C20.5254 12 21.5999 13.0746 21.5999 14.4V16.8C21.5999 18.1255 20.5254 19.2 19.1999 19.2H2.3999H4.7999C6.12539 19.2 7.1999 18.1255 7.1999 16.8V14.4Z'
            fill='#FFB660'
        />
    </svg>
)
/** @name 项目文件夹打开图标 */
export const ProjectFolderOpenSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={ProjectFolderOpenSvg} {...props} />
}

const ProjectViewGridSvg = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4.00002 2.40002C3.11637 2.40002 2.40002 3.11637 2.40002 4.00002V5.60002C2.40002 6.48368 3.11637 7.20002 4.00002 7.20002H5.60002C6.48368 7.20002 7.20002 6.48368 7.20002 5.60002V4.00002C7.20002 3.11637 6.48368 2.40002 5.60002 2.40002H4.00002Z'
            fill='#4A94F8'
        />
        <path
            d='M4.00002 8.80002C3.11637 8.80002 2.40002 9.51637 2.40002 10.4V12C2.40002 12.8837 3.11637 13.6 4.00002 13.6H5.60002C6.48368 13.6 7.20002 12.8837 7.20002 12V10.4C7.20002 9.51637 6.48368 8.80002 5.60002 8.80002H4.00002Z'
            fill='#4A94F8'
        />
        <path
            d='M8.80002 4.00002C8.80002 3.11637 9.51637 2.40002 10.4 2.40002H12C12.8837 2.40002 13.6 3.11637 13.6 4.00002V5.60002C13.6 6.48368 12.8837 7.20002 12 7.20002H10.4C9.51637 7.20002 8.80002 6.48368 8.80002 5.60002V4.00002Z'
            fill='#4A94F8'
        />
        <path
            d='M8.80002 10.4C8.80002 9.51637 9.51637 8.80002 10.4 8.80002H12C12.8837 8.80002 13.6 9.51637 13.6 10.4V12C13.6 12.8837 12.8837 13.6 12 13.6H10.4C9.51637 13.6 8.80002 12.8837 8.80002 12V10.4Z'
            fill='#4A94F8'
        />
    </svg>
)
/** @name 项目四格布局图标 */
export const ProjectViewGridSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={ProjectViewGridSvg} {...props} />
}

const ProjectExportSvg = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M21.9316 10.7313C21.3067 11.3562 20.2937 11.3562 19.6688 10.7313L17.6002 8.66269V16L17.6002 19.2C17.6002 20.0836 16.8839 20.8 16.0002 20.8C15.1165 20.8 14.4002 20.0836 14.4002 19.2L14.4002 16L14.4002 8.66269L12.3316 10.7313C11.7067 11.3562 10.6937 11.3562 10.0688 10.7313C9.44399 10.1065 9.44399 9.09342 10.0688 8.46858L14.8688 3.66858C15.4937 3.04374 16.5067 3.04374 17.1316 3.66858L21.9316 8.46858C22.5564 9.09342 22.5564 10.1065 21.9316 10.7313ZM24.1941 12.9941C25.1314 12.0568 25.6 10.8284 25.6 9.59995H25.6002C27.3675 9.59995 28.8002 11.0326 28.8002 12.8V24C28.8002 25.7673 27.3675 27.2 25.6002 27.2H6.4002C4.63288 27.2 3.2002 25.7673 3.2002 24V12.8C3.2002 11.0327 4.63278 9.60006 6.4 9.59995C6.39999 10.8284 6.86862 12.0568 7.80589 12.9941C8.74314 13.9313 9.97157 14.4 11.2 14.4L11.2 19.2C11.2 21.8509 13.349 24 16 24C18.651 24 20.8 21.8509 20.8 19.2L20.8 14.4C22.0284 14.4 23.2569 13.9313 24.1941 12.9941Z'
            fill='#FFB660'
        />
    </svg>
)
/** @name 项目导出图标 */
export const ProjectExportSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={ProjectExportSvg} {...props} />
}

const ProjectImportSvg = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.5999 3.2C7.83259 3.2 6.3999 4.63269 6.3999 6.4V25.6C6.3999 27.3673 7.83259 28.8 9.5999 28.8H22.3999C24.1672 28.8 25.5999 27.3673 25.5999 25.6V11.8627C25.5999 11.014 25.2628 10.2001 24.6626 9.6L19.1999 4.13726C18.5998 3.53714 17.7859 3.2 16.9372 3.2H9.5999ZM17.5999 12.8C17.5999 11.9163 16.8836 11.2 15.9999 11.2C15.1162 11.2 14.3999 11.9163 14.3999 12.8V18.5373L12.3313 16.4686C11.7064 15.8438 10.6934 15.8438 10.0685 16.4686C9.44369 17.0935 9.44369 18.1065 10.0685 18.7314L14.8685 23.5314C15.4934 24.1562 16.5064 24.1562 17.1313 23.5314L21.9313 18.7314C22.5561 18.1065 22.5561 17.0935 21.9313 16.4686C21.3064 15.8438 20.2934 15.8438 19.6685 16.4686L17.5999 18.5373V12.8Z'
            fill='#FFB660'
        />
    </svg>
)
/** @name 项目导入图标 */
export const ProjectImportSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={ProjectImportSvg} {...props} />
}

const SoftwareRemoteSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect
            x='1.6665'
            y='2.5'
            width='16.6667'
            height='12.5'
            rx='2'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M7.49996 10.143V5.83332M7.49996 5.83332L11.8096 5.83334M7.49996 5.83332L13.3334 11.6667'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M6.6665 17.5H13.3332'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 软件设置-远程连接图标 */
export const SoftwareRemoteSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={SoftwareRemoteSvg} {...props} />
}
