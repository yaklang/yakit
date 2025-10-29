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

const YakitLoadingSvg = () => (
    <svg width='1em' height='1em' viewBox='0 0 200 200' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M156.382 20.0155H177.31C177.769 20.0162 178.22 20.1344 178.621 20.3589C179.021 20.5835 179.358 20.9071 179.599 21.2988C179.84 21.6906 179.977 22.1375 179.997 22.5973C180.018 23.0572 179.921 23.5146 179.715 23.9262L102.67 178.509C102.446 178.957 102.102 179.334 101.677 179.597C101.252 179.861 100.762 180 100.263 180C99.763 180 99.2732 179.861 98.8481 179.597C98.4229 179.334 98.0791 178.957 97.8551 178.509L88.8173 160.377C88.6369 160.008 88.543 159.602 88.543 159.191C88.543 158.78 88.6369 158.374 88.8173 158.005L153.977 21.5498C154.193 21.0929 154.534 20.7065 154.959 20.4351C155.385 20.1636 155.878 20.0182 156.382 20.0155ZM64.5106 69.3718L42.0474 21.5498C41.829 21.0879 41.485 20.6974 41.0549 20.4232C40.6249 20.149 40.1263 20.0023 39.6167 20H22.6947C22.2354 19.9998 21.7837 20.1174 21.3825 20.3416C20.9813 20.5658 20.644 20.8892 20.4024 21.2811C20.1609 21.673 20.0233 22.1203 20.0027 22.5806C19.9821 23.0408 20.0791 23.4987 20.2846 23.9107L53.1297 88.9769C53.3554 89.4285 53.7027 89.8076 54.1324 90.0711C54.562 90.3347 55.0567 90.4721 55.5603 90.4678C56.0639 90.4635 56.5562 90.3176 56.9813 90.0468C57.4064 89.7759 57.7473 89.391 57.9653 88.9356L64.4694 75.3076L65.3654 73.4323C65.5409 73.0692 65.632 72.6709 65.632 72.2674C65.632 71.8638 65.5409 71.4655 65.3654 71.1024L64.5106 69.3718ZM136.555 20.0155H115.627C115.118 20.0169 114.62 20.1633 114.19 20.4377C113.761 20.7121 113.418 21.1031 113.201 21.5653L96.9488 56.3069L80.6293 21.5653C80.4114 21.1031 80.0674 20.7122 79.6373 20.4379C79.2071 20.1636 78.7083 20.0172 78.1986 20.0155H61.2508C60.7915 20.0153 60.3398 20.1329 59.9386 20.3571C59.5374 20.5813 59.2 20.9047 58.9585 21.2966C58.717 21.6885 58.5794 22.1358 58.5588 22.596C58.5382 23.0563 58.6352 23.5142 58.8407 23.9262L86.4794 78.6862L68.3214 117.493C68.1408 117.863 68.047 118.27 68.047 118.682C68.047 119.093 68.1408 119.5 68.3214 119.87L77.3592 138.003C77.5832 138.451 77.9269 138.827 78.3521 139.09C78.7773 139.354 79.2671 139.493 79.7667 139.493C80.2663 139.493 80.7561 139.354 81.1812 139.09C81.6064 138.827 81.9502 138.451 82.1742 138.003L138.945 23.9365C139.152 23.5257 139.251 23.0686 139.233 22.6086C139.214 22.1485 139.079 21.7009 138.839 21.3081C138.6 20.9153 138.265 20.5903 137.865 20.3641C137.465 20.1379 137.014 20.0179 136.555 20.0155V20.0155Z'
            stroke='var(--Colors-Use-Neutral-Bg-Hover)'
            strokeWidth='5'
        />
    </svg>
)
/** @name 加载组件底色图标 */
export const YakitLoadingSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YakitLoadingSvg} {...props} />
}

const YakitThemeLoadingSvg = () => (
    <svg width='1em' height='1em' viewBox='0 0 200 200' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M156.382 20.0155H177.31C177.769 20.0162 178.22 20.1344 178.621 20.3589C179.021 20.5835 179.358 20.9071 179.599 21.2988C179.84 21.6906 179.977 22.1375 179.997 22.5973C180.018 23.0572 179.921 23.5146 179.715 23.9262L102.67 178.509C102.446 178.957 102.102 179.334 101.677 179.597C101.252 179.861 100.762 180 100.263 180C99.763 180 99.2732 179.861 98.8481 179.597C98.4229 179.334 98.0791 178.957 97.8551 178.509L88.8173 160.377C88.6369 160.008 88.543 159.602 88.543 159.191C88.543 158.78 88.6369 158.374 88.8173 158.005L153.977 21.5498C154.193 21.0929 154.534 20.7065 154.959 20.4351C155.385 20.1636 155.878 20.0182 156.382 20.0155ZM64.5106 69.3718L42.0474 21.5498C41.829 21.0879 41.485 20.6974 41.0549 20.4232C40.6249 20.149 40.1263 20.0023 39.6167 20H22.6947C22.2354 19.9998 21.7837 20.1174 21.3825 20.3416C20.9813 20.5658 20.644 20.8892 20.4024 21.2811C20.1609 21.673 20.0233 22.1203 20.0027 22.5806C19.9821 23.0408 20.0791 23.4987 20.2846 23.9107L53.1297 88.9769C53.3554 89.4285 53.7027 89.8076 54.1324 90.0711C54.562 90.3347 55.0567 90.4721 55.5603 90.4678C56.0639 90.4635 56.5562 90.3176 56.9813 90.0468C57.4064 89.7759 57.7473 89.391 57.9653 88.9356L64.4694 75.3076L65.3654 73.4323C65.5409 73.0692 65.632 72.6709 65.632 72.2674C65.632 71.8638 65.5409 71.4655 65.3654 71.1024L64.5106 69.3718ZM136.555 20.0155H115.627C115.118 20.0169 114.62 20.1633 114.19 20.4377C113.761 20.7121 113.418 21.1031 113.201 21.5653L96.9488 56.3069L80.6293 21.5653C80.4114 21.1031 80.0674 20.7122 79.6373 20.4379C79.2071 20.1636 78.7083 20.0172 78.1986 20.0155H61.2508C60.7915 20.0153 60.3398 20.1329 59.9386 20.3571C59.5374 20.5813 59.2 20.9047 58.9585 21.2966C58.717 21.6885 58.5794 22.1358 58.5588 22.596C58.5382 23.0563 58.6352 23.5142 58.8407 23.9262L86.4794 78.6862L68.3214 117.493C68.1408 117.863 68.047 118.27 68.047 118.682C68.047 119.093 68.1408 119.5 68.3214 119.87L77.3592 138.003C77.5832 138.451 77.9269 138.827 78.3521 139.09C78.7773 139.354 79.2671 139.493 79.7667 139.493C80.2663 139.493 80.7561 139.354 81.1812 139.09C81.6064 138.827 81.9502 138.451 82.1742 138.003L138.945 23.9365C139.152 23.5257 139.251 23.0686 139.233 22.6086C139.214 22.1485 139.079 21.7009 138.839 21.3081C138.6 20.9153 138.265 20.5903 137.865 20.3641C137.465 20.1379 137.014 20.0179 136.555 20.0155V20.0155Z'
            fill='url(#paint0_linear_2905_79556)'
            stroke='var(--Colors-Use-Neutral-Bg-Hover)'
            strokeWidth='5'
        />
        <defs>
            <linearGradient
                id='paint0_linear_2905_79556'
                x1='19.9705'
                y1='100.006'
                x2='180.004'
                y2='100.006'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#FA931D' />
                <stop offset='1' stopColor='#EF5B27' />
            </linearGradient>
        </defs>
    </svg>
)
/** @name 加载组件主题色图标 */
export const YakitThemeLoadingSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YakitThemeLoadingSvg} {...props} />
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

const MacUIOpMinSvg = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C11.0376 2.5 13.5 4.96243 13.5 8Z'
            fill='#FFB660'
            stroke='#F8A94D'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M4.58337 8C4.58337 7.58579 4.91916 7.25 5.33337 7.25H10.6667C11.0809 7.25 11.4167 7.58579 11.4167 8C11.4167 8.41421 11.0809 8.75 10.6667 8.75H5.33337C4.91916 8.75 4.58337 8.41421 4.58337 8Z'
            fill='#483A33'
        />
    </svg>
)
/** @name MAC-最小化图标 */
export const MacUIOpMinSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={MacUIOpMinSvg} {...props} />
}

const MacUIOpRestoreSvg = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C11.0376 2.5 13.5 4.96243 13.5 8Z'
            fill='#56C991'
            stroke='#4BBB84'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M7.99356 7.8378C7.99702 7.92525 7.92519 7.99708 7.83773 7.99362L4.51663 7.862C4.38594 7.85682 4.32402 7.69853 4.41651 7.60605L7.60599 4.41657C7.69847 4.32408 7.85676 4.38601 7.86194 4.51669L7.99356 7.8378ZM8.16234 8.00637C8.07489 8.00291 8.00306 8.07474 8.00652 8.16219L8.13814 11.4833C8.14332 11.614 8.3016 11.6759 8.39409 11.5834L11.5836 8.39394C11.6761 8.30146 11.6141 8.14317 11.4834 8.13799L8.16234 8.00637Z'
            fill='#483A33'
        />
    </svg>
)
/** @name MAC-恢复图标-显示 */
export const MacUIOpRestoreSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={MacUIOpRestoreSvg} {...props} />
}

const MacUIOpMaxSvg = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C11.0376 2.5 13.5 4.96243 13.5 8Z'
            fill='#56C991'
            stroke='#4BBB84'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M5.35473 5.51062C5.35127 5.42316 5.4231 5.35133 5.51056 5.3548L8.83166 5.48641C8.96235 5.49159 9.02427 5.64988 8.93178 5.74236L5.7423 8.93185C5.64982 9.02433 5.49153 8.96241 5.48635 8.83172L5.35473 5.51062ZM10.4894 10.6452C10.5769 10.6487 10.6487 10.5768 10.6453 10.4894L10.5136 7.16829C10.5085 7.0376 10.3502 6.97568 10.2577 7.06816L7.0682 10.2576C6.97572 10.3501 7.03764 10.5084 7.16833 10.5136L10.4894 10.6452Z'
            fill='#483A33'
        />
    </svg>
)
/** @name MAC-最大化图标 */
export const MacUIOpMaxSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={MacUIOpMaxSvg} {...props} />
}

const WinUIOpMinSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16.6667 10H3.33333'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name WIN-最小化图标 */
export const WinUIOpMinSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={WinUIOpMinSvg} {...props} />
}

const WinUIOpRestoreSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13.3333 13.3333H15C15.9205 13.3333 16.6667 12.5871 16.6667 11.6666V4.99998C16.6667 4.07951 15.9205 3.33331 15 3.33331H8.33333C7.41286 3.33331 6.66666 4.07951 6.66666 4.99998V6.66665M11.6667 16.6666H5C4.07952 16.6666 3.33333 15.9205 3.33333 15V8.33331C3.33333 7.41284 4.07952 6.66665 5 6.66665H11.6667C12.5871 6.66665 13.3333 7.41284 13.3333 8.33331V15C13.3333 15.9205 12.5871 16.6666 11.6667 16.6666Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name WIN-恢复图标 */
export const WinUIOpRestoreSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={WinUIOpRestoreSvg} {...props} />
}

const WinUIOpMaxSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect
            x='3.33334'
            y='3.33331'
            width='13.3333'
            height='13.3333'
            rx='2'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name WIN-最大化图标 */
export const WinUIOpMaxSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={WinUIOpMaxSvg} {...props} />
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

const YakitThemeSvg = () => (
    <svg width='1em' height='1em' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15.6382 2.00155H17.731C17.7769 2.00162 17.822 2.01344 17.8621 2.03589C17.9021 2.05835 17.9358 2.09071 17.9599 2.12988C17.984 2.16906 17.9977 2.21375 17.9997 2.25973C18.0018 2.30572 17.9921 2.35146 17.9715 2.39262L10.267 17.8509C10.2446 17.8957 10.2102 17.9334 10.1677 17.9597C10.1252 17.9861 10.0762 18 10.0263 18C9.9763 18 9.92732 17.9861 9.88481 17.9597C9.84229 17.9334 9.80791 17.8957 9.78551 17.8509L8.88173 16.0377C8.86369 16.0008 8.8543 15.9602 8.8543 15.9191C8.8543 15.878 8.86369 15.8374 8.88173 15.8005L15.3977 2.15498C15.4193 2.10929 15.4534 2.07065 15.4959 2.04351C15.5385 2.01636 15.5878 2.00182 15.6382 2.00155ZM6.45106 6.93718L4.20474 2.15498C4.1829 2.10879 4.1485 2.06974 4.10549 2.04232C4.06249 2.0149 4.01263 2.00023 3.96167 2H2.26947C2.22354 1.99998 2.17837 2.01174 2.13825 2.03416C2.09813 2.05658 2.0644 2.08892 2.04024 2.12811C2.01609 2.1673 2.00233 2.21203 2.00027 2.25806C1.99821 2.30408 2.00791 2.34987 2.02846 2.39107L5.31297 8.89769C5.33554 8.94285 5.37027 8.98076 5.41324 9.00711C5.4562 9.03347 5.50567 9.04721 5.55603 9.04678C5.60639 9.04635 5.65562 9.03176 5.69813 9.00468C5.74064 8.97759 5.77473 8.9391 5.79653 8.89356L6.44694 7.53076L6.53654 7.34323C6.55409 7.30692 6.5632 7.26709 6.5632 7.22674C6.5632 7.18638 6.55409 7.14655 6.53654 7.11024L6.45106 6.93718ZM13.6555 2.00155H11.5627C11.5118 2.00169 11.462 2.01633 11.419 2.04377C11.3761 2.07121 11.3418 2.11031 11.3201 2.15653L9.69488 5.63069L8.06293 2.15653C8.04114 2.11031 8.00674 2.07122 7.96373 2.04379C7.92071 2.01636 7.87083 2.00172 7.81986 2.00155H6.12508C6.07915 2.00153 6.03398 2.01329 5.99386 2.03571C5.95374 2.05813 5.92 2.09047 5.89585 2.12966C5.8717 2.16885 5.85794 2.21358 5.85588 2.2596C5.85382 2.30563 5.86352 2.35142 5.88407 2.39262L8.64794 7.86862L6.83214 11.7493C6.81408 11.7863 6.8047 11.827 6.8047 11.8682C6.8047 11.9093 6.81408 11.95 6.83214 11.987L7.73592 13.8003C7.75832 13.8451 7.7927 13.8827 7.83521 13.909C7.87773 13.9354 7.92671 13.9493 7.97667 13.9493C8.02663 13.9493 8.07561 13.9354 8.11812 13.909C8.16064 13.8827 8.19502 13.8451 8.21742 13.8003L13.8945 2.39365C13.9152 2.35257 13.9251 2.30686 13.9233 2.26086C13.9214 2.21485 13.9079 2.17009 13.8839 2.13081C13.86 2.09153 13.8265 2.05903 13.7865 2.03641C13.7465 2.01379 13.7014 2.00179 13.6555 2.00155Z'
            fill='url(#paint0_linear_2550_13861)'
        />
        <defs>
            <linearGradient
                id='paint0_linear_2550_13861'
                x1='1.99705'
                y1='10.0006'
                x2='18.0004'
                y2='10.0006'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#FA931D' />
                <stop offset='1' stopColor='#EF5B27' />
            </linearGradient>
        </defs>
    </svg>
)
/** @name yakit主题色图标 */
export const YakitThemeSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YakitThemeSvg} {...props} />
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

const EngineLogCloseSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            opacity='0.3'
            fillRule='evenodd'
            clipRule='evenodd'
            d='M10 3.25C6.27208 3.25 3.25 6.27208 3.25 10C3.25 13.7279 6.27208 16.75 10 16.75C13.7279 16.75 16.75 13.7279 16.75 10C16.75 6.27208 13.7279 3.25 10 3.25ZM1.75 10C1.75 5.44365 5.44365 1.75 10 1.75C14.5563 1.75 18.25 5.44365 18.25 10C18.25 14.5563 14.5563 18.25 10 18.25C5.44365 18.25 1.75 14.5563 1.75 10Z'
            fill='#F0F1F3'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M7.80317 7.80301C8.09606 7.51012 8.57093 7.51012 8.86383 7.80301L10.0002 8.93935L11.1365 7.80301C11.4294 7.51012 11.9043 7.51012 12.1972 7.80301C12.4901 8.09591 12.4901 8.57078 12.1972 8.86367L11.0608 10L12.1972 11.1363C12.4901 11.4292 12.4901 11.9041 12.1972 12.197C11.9043 12.4899 11.4294 12.4899 11.1365 12.197L10.0002 11.0607L8.86383 12.197C8.57093 12.4899 8.09606 12.4899 7.80317 12.197C7.51027 11.9041 7.51027 11.4292 7.80317 11.1363L8.9395 10L7.80317 8.86367C7.51027 8.57078 7.51027 8.09591 7.80317 7.80301Z'
            fill='#F0F1F3'
        />
    </svg>
)
/** @name 引擎日志关闭图标 */
export const EngineLogCloseSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={EngineLogCloseSvg} {...props} />
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