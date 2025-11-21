import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

export interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
}

const ShieldExclamationSvg = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M16.0002 3.11084C12.6646 6.09624 8.27919 7.93266 3.46597 7.99796C3.29118 9.03919 3.2002 10.1089 3.2002 11.1998C3.2002 19.5595 8.54297 26.6714 16.0002 29.3072C23.4574 26.6714 28.8002 19.5595 28.8002 11.1998C28.8002 10.1088 28.7092 9.03919 28.5344 7.99796C23.7212 7.93265 19.3357 6.09624 16.0002 3.11084ZM17.6002 22.3997C17.6002 23.2834 16.8839 23.9997 16.0002 23.9997C15.1165 23.9997 14.4002 23.2834 14.4002 22.3997C14.4002 21.5161 15.1165 20.7997 16.0002 20.7997C16.8839 20.7997 17.6002 21.5161 17.6002 22.3997ZM17.6002 11.1997C17.6002 10.3161 16.8839 9.59971 16.0002 9.59971C15.1165 9.59971 14.4002 10.3161 14.4002 11.1997V15.9997C14.4002 16.8834 15.1165 17.5997 16.0002 17.5997C16.8839 17.5997 17.6002 16.8834 17.6002 15.9997V11.1997Z'
            fill='#FFB660'
        />
    </svg>
)
/** @name 盾牌感叹号 */
export const ShieldExclamationSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={ShieldExclamationSvg} {...props} />
}

const CloseCircle = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.33333 11.6667L10 10M10 10L11.6667 8.33333M10 10L8.33333 8.33333M10 10L11.6667 11.6667M17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5C14.1421 2.5 17.5 5.85786 17.5 10Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: CloseCircle 带圈得删除 x
 */
export const CloseCircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={CloseCircle} {...props} />
}

const CheckCircleOutline = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  CheckCircle x 圈 边框
 */
export const CheckCircleOutlineIcon = (props: Partial<IconProps>) => {
    return <Icon component={CheckCircleOutline} {...props} />
}

const ExclamationOutline = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  CheckCircle 警告 三角
 */
export const ExclamationOutlineIcon = (props: Partial<IconProps>) => {
    return <Icon component={ExclamationOutline} {...props} />
}

const Resizer = () => (
    <svg width='9' height='10' viewBox='0 0 9 10' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M0.646484 8.64941L1.00004 9.00297L9.00004 1.00297L8.64648 0.649414L0.646484 8.64941ZM5.00004 9.00297L9.00004 5.00297L8.64648 4.64941L4.64648 8.64941L5.00004 9.00297Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description: Resizer 拖拽
 */
export const ResizerIcon = (props: Partial<IconProps>) => {
    return <Icon component={Resizer} {...props} />
}

const YaklangInstallHintSvg = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M16.0002 3.11115C12.6646 6.09654 8.27919 7.93296 3.46597 7.99826C3.29118 9.0395 3.2002 10.1092 3.2002 11.2001C3.2002 19.5598 8.54297 26.6717 16.0002 29.3075C23.4574 26.6717 28.8002 19.5598 28.8002 11.2001C28.8002 10.1092 28.7092 9.0395 28.5344 7.99826C23.7212 7.93296 19.3357 6.09654 16.0002 3.11115ZM17.6002 22.4C17.6002 23.2837 16.8839 24 16.0002 24C15.1165 24 14.4002 23.2837 14.4002 22.4C14.4002 21.5164 15.1165 20.8 16.0002 20.8C16.8839 20.8 17.6002 21.5164 17.6002 22.4ZM17.6002 11.2C17.6002 10.3164 16.8839 9.60001 16.0002 9.60001C15.1165 9.60001 14.4002 10.3164 14.4002 11.2V16C14.4002 16.8837 15.1165 17.6 16.0002 17.6C16.8839 17.6 17.6002 16.8837 17.6002 16V11.2Z'
            fill='#FFB660'
        />
    </svg>
)
/** @name 安装引擎提示图标 */
export const YaklangInstallHintSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YaklangInstallHintSvg} {...props} />
}

const MacUIOpCloseSvg = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C11.0376 2.5 13.5 4.96243 13.5 8Z'
            fill='#F7544A'
            stroke='#EA4439'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M5.46967 5.46967C5.76256 5.17678 6.23744 5.17678 6.53033 5.46967L8 6.93934L9.46967 5.46967C9.76256 5.17678 10.2374 5.17678 10.5303 5.46967C10.8232 5.76256 10.8232 6.23744 10.5303 6.53033L9.06066 8L10.5303 9.46967C10.8232 9.76256 10.8232 10.2374 10.5303 10.5303C10.2374 10.8232 9.76256 10.8232 9.46967 10.5303L8 9.06066L6.53033 10.5303C6.23744 10.8232 5.76256 10.8232 5.46967 10.5303C5.17678 10.2374 5.17678 9.76256 5.46967 9.46967L6.93934 8L5.46967 6.53033C5.17678 6.23744 5.17678 5.76256 5.46967 5.46967Z'
            fill='#483A33'
        />
    </svg>
)
/** @name MAC-关闭图标 */
export const MacUIOpCloseSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={MacUIOpCloseSvg} {...props} />
}

const WinUIOpCloseSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 15L15 5M5 5L15 15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name WIN-关闭图标 */
export const WinUIOpCloseSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={WinUIOpCloseSvg} {...props} />
}

const YakitCopySvg = () => (
    <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 3.5V7.5C4 8.05228 4.44772 8.5 5 8.5H8M4 3.5V2.5C4 1.94772 4.44772 1.5 5 1.5H7.29289C7.4255 1.5 7.55268 1.55268 7.64645 1.64645L9.85355 3.85355C9.94732 3.94732 10 4.0745 10 4.20711V7.5C10 8.05228 9.55228 8.5 9 8.5H8M4 3.5V3.5C2.89543 3.5 2 4.39543 2 5.5V9.5C2 10.0523 2.44772 10.5 3 10.5H6C7.10457 10.5 8 9.60457 8 8.5V8.5'
            stroke='var(--Colors-Use-Main-Primary)'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 复制图标 */
export const YakitCopySvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YakitCopySvg} {...props} />
}

const GooglePhotosLogoSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10.3125 10.3125V1.875C11.2963 1.875 12.2552 2.18455 13.0533 2.7598C13.8514 3.33505 14.4483 4.14684 14.7595 5.08018C15.0706 6.01352 15.0801 7.02109 14.7868 7.96016C14.4934 8.89923 13.9121 9.72221 13.125 10.3125'
            fill='var(--Colors-Use-Main-Primary)'
        />
        <path
            d='M10.3125 10.3125V1.875C11.2963 1.875 12.2552 2.18455 13.0533 2.7598C13.8514 3.33505 14.4483 4.14684 14.7595 5.08018C15.0706 6.01352 15.0801 7.02109 14.7868 7.96016C14.4934 8.89923 13.9121 9.72221 13.125 10.3125'
            stroke='var(--Colors-Use-Neutral-Text-1-Title)'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M9.6875 9.6875V18.125C8.70368 18.125 7.74479 17.8154 6.94667 17.2402C6.14855 16.6649 5.55166 15.8532 5.24055 14.9198C4.92943 13.9865 4.91987 12.9789 5.21322 12.0398C5.50656 11.1008 6.08794 10.2778 6.875 9.6875'
            fill='var(--Colors-Use-Main-Primary)'
        />
        <path
            d='M9.6875 9.6875V18.125C8.70368 18.125 7.74479 17.8154 6.94667 17.2402C6.14855 16.6649 5.55166 15.8532 5.24055 14.9198C4.92943 13.9865 4.91987 12.9789 5.21322 12.0398C5.50656 11.1008 6.08794 10.2778 6.875 9.6875'
            stroke='var(--Colors-Use-Neutral-Text-1-Title)'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M10.3125 9.6875H1.875C1.875 8.70368 2.18455 7.74479 2.7598 6.94667C3.33505 6.14855 4.14684 5.55166 5.08018 5.24055C6.01352 4.92943 7.02109 4.91987 7.96016 5.21322C8.89923 5.50656 9.72221 6.08794 10.3125 6.875'
            stroke='var(--Colors-Use-Neutral-Text-1-Title)'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M9.6875 10.3125H18.125C18.125 11.2963 17.8154 12.2552 17.2402 13.0533C16.6649 13.8514 15.8532 14.4483 14.9198 14.7595C13.9865 15.0706 12.9789 15.0801 12.0398 14.7868C11.1008 14.4934 10.2778 13.9121 9.6875 13.125'
            stroke='var(--Colors-Use-Neutral-Text-1-Title)'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 小风车图标(引擎进程列表) */
export const GooglePhotosLogoSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={GooglePhotosLogoSvg} {...props} />
}

const DocumentDuplicateSvg = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5.33335 4.66667V10C5.33335 10.7364 5.93031 11.3333 6.66669 11.3333H10.6667M5.33335 4.66667V3.33333C5.33335 2.59695 5.93031 2 6.66669 2H9.72388C9.90069 2 10.0703 2.07024 10.1953 2.19526L13.1381 5.13807C13.2631 5.2631 13.3334 5.43266 13.3334 5.60948V10C13.3334 10.7364 12.7364 11.3333 12 11.3333H10.6667M5.33335 4.66667H4.66669C3.56212 4.66667 2.66669 5.5621 2.66669 6.66667V12.6667C2.66669 13.403 3.26364 14 4.00002 14H8.66669C9.77126 14 10.6667 13.1046 10.6667 12V11.3333'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 复制图标(document-duplicate) */
export const DocumentDuplicateSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={DocumentDuplicateSvg} {...props} />
}

const CheckedSvg = () => (
    <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M2.5 6.5L4.5 8.5L9.5 3.5' stroke='#56C991' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/** @name 勾选中图标 */
export const CheckedSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={CheckedSvg} {...props} />
}

const ChevronUp = () => (
    <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M2.5 7.5L6 4L9.5 7.5' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)

/**
 * @description: 方向性：向上
 */
export const ChevronUpIcon = (props: Partial<IconProps>) => {
    return <Icon component={ChevronUp} {...props} />
}

const ChevronDown = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            d='M12.6668 6L8.00016 10.6667L3.3335 6'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: 方向性：向下
 */
export const ChevronDownIcon = (props: Partial<IconProps>) => {
    return <Icon component={ChevronDown} {...props} />
}

const Check = () => (
    <svg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M2.08333 5.41667L3.74999 7.08333L7.91666 2.91667'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description:Check 对勾
 */
export const CheckIcon = (props: Partial<IconProps>) => {
    return <Icon component={Check} {...props} />
}

const Remove = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'>
        <path d='M3 9L9 3M3 3L9 9' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)

/**
 * @description: x 删除图标
 */
export const RemoveIcon = (props: Partial<IconProps>) => {
    return <Icon component={Remove} {...props} />
}

const ChevronLeft = () => (
    <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M7.5 9.5L4 6L7.5 2.5' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)

/**
 * @description:向左 left 方向性
 */
export const ChevronLeftIcon = (props: Partial<IconProps>) => {
    return <Icon component={ChevronLeft} {...props} />
}

const ChevronRight = () => (
    <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M4.5 2.5L8 6L4.5 9.5' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)

/**
 * @description:向右 right
 */
export const ChevronRightIcon = (props: Partial<IconProps>) => {
    return <Icon component={ChevronRight} {...props} />
}