import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

export interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
}

const CheckCircle = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' fill='none'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM13.7071 8.70711C14.0976 8.31658 14.0976 7.68342 13.7071 7.29289C13.3166 6.90237 12.6834 6.90237 12.2929 7.29289L9 10.5858L7.70711 9.29289C7.31658 8.90237 6.68342 8.90237 6.29289 9.29289C5.90237 9.68342 5.90237 10.3166 6.29289 10.7071L8.29289 12.7071C8.68342 13.0976 9.31658 13.0976 9.70711 12.7071L13.7071 8.70711Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description:  实心的选择圆形
 */
export const CheckCircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={CheckCircle} {...props} />
}

const Refresh = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' fill='none'>
        <path
            d='M3.33325 3.33337V7.50004H3.81785M16.615 9.16671C16.2049 5.87811 13.3996 3.33337 9.99992 3.33337C7.2021 3.33337 4.80683 5.05685 3.81785 7.50004M3.81785 7.50004H7.49992M16.6666 16.6667V12.5H16.182M16.182 12.5C15.193 14.9432 12.7977 16.6667 9.99992 16.6667C6.60024 16.6667 3.79491 14.122 3.38483 10.8334M16.182 12.5H12.4999'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description:  刷新 两个圆弧的箭头
 */
export const RefreshIcon = (props: Partial<IconProps>) => {
    return <Icon component={Refresh} {...props} />
}

const Filter = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            d='M2.66675 3C2.66675 2.44772 3.11446 2 3.66675 2H12.3334C12.8857 2 13.3334 2.44772 13.3334 3V4.25245C13.3334 4.51767 13.2281 4.77202 13.0405 4.95956L9.62631 8.37377C9.43877 8.56131 9.33341 8.81566 9.33341 9.08088V12L6.66675 14V9.08088C6.66675 8.81566 6.56139 8.56131 6.37385 8.37377L2.95964 4.95956C2.7721 4.77202 2.66675 4.51767 2.66675 4.25245V3Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: 筛选
 */
export const FilterIcon = (props: Partial<IconProps>) => {
    return <Icon component={Filter} {...props} />
}

const Search = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            d='M14 14L10 10M11.3333 6.66667C11.3333 9.244 9.244 11.3333 6.66667 11.3333C4.08934 11.3333 2 9.244 2 6.66667C2 4.08934 4.08934 2 6.66667 2C9.244 2 11.3333 4.08934 11.3333 6.66667Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: 圆圈搜索
 */
export const SearchIcon = (props: Partial<IconProps>) => {
    return <Icon component={Search} {...props} />
}

const StatusOffline = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'>
        <path
            d='M9.53553 2.46447C9.34027 2.26921 9.02369 2.26921 8.82843 2.46447C8.63316 2.65973 8.63316 2.97631 8.82843 3.17158L9.53553 2.46447ZM9.18198 9.18198L8.82843 9.53554H8.82843L9.18198 9.18198ZM8.12132 3.87868C7.92606 3.68342 7.60948 3.68342 7.41421 3.87868C7.21895 4.07395 7.21895 4.39053 7.41421 4.58579L8.12132 3.87868ZM7.76777 7.76777L7.41421 8.12132L7.41421 8.12133L7.76777 7.76777ZM3.87868 8.12133C4.07394 8.31659 4.39052 8.31659 4.58579 8.12133C4.78105 7.92606 4.78105 7.60948 4.58579 7.41422L3.87868 8.12133ZM4.01999 6.28309C3.98117 6.00969 3.72806 5.81953 3.45466 5.85835C3.18126 5.89717 2.9911 6.15027 3.02992 6.42367L4.01999 6.28309ZM2.46447 9.53554C2.65973 9.7308 2.97631 9.7308 3.17157 9.53554C3.36683 9.34028 3.36683 9.02369 3.17157 8.82843L2.46447 9.53554ZM2.20852 4.72226C2.29648 4.4605 2.15559 4.177 1.89383 4.08904C1.63207 4.00107 1.34857 4.14196 1.26061 4.40372L2.20852 4.72226ZM1.85355 1.14645C1.65829 0.951184 1.34171 0.951184 1.14645 1.14645C0.951184 1.34171 0.951184 1.65829 1.14645 1.85355L1.85355 1.14645ZM10.1464 10.8536C10.3417 11.0488 10.6583 11.0488 10.8536 10.8536C11.0488 10.6583 11.0488 10.3417 10.8536 10.1464L10.1464 10.8536ZM8.82843 3.17158C10.3905 4.73367 10.3905 7.26633 8.82843 8.82843L9.53553 9.53554C11.4882 7.58292 11.4882 4.41709 9.53553 2.46447L8.82843 3.17158ZM7.41421 4.58579C8.19526 5.36684 8.19526 6.63317 7.41421 7.41422L8.12132 8.12133C9.29289 6.94975 9.29289 5.05026 8.12132 3.87868L7.41421 4.58579ZM6 6H7C7 5.44772 6.55228 5 6 5V6ZM4.58579 7.41422C4.26695 7.09538 4.07876 6.69702 4.01999 6.28309L3.02992 6.42367C3.1181 7.04471 3.40144 7.64408 3.87868 8.12133L4.58579 7.41422ZM3.17157 8.82843C2.06155 7.71841 1.73959 6.11769 2.20852 4.72226L1.26061 4.40372C0.675422 6.14512 1.07577 8.14684 2.46447 9.53554L3.17157 8.82843ZM6 6L6 6V5C5.724 5 5.47331 5.11248 5.2929 5.29289L6 6ZM1.14645 1.85355L5.29289 6L6 5.2929L1.85355 1.14645L1.14645 1.85355ZM5.29289 6L6 6.70711L6.70711 6L6 5.2929L5.29289 6ZM6 6.70711L7.41421 8.12132L8.12132 7.41422L6.70711 6L6 6.70711ZM7.41421 8.12133L8.82843 9.53554L9.53553 8.82843L8.12132 7.41422L7.41421 8.12133ZM8.82843 9.53554L10.1464 10.8536L10.8536 10.1464L9.53553 8.82843L8.82843 9.53554ZM6 6L6 6.00001L6.70711 6.70711C6.88753 6.52669 7 6.27601 7 6H6Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description: 屏蔽
 */
export const StatusOfflineIcon = (props: Partial<IconProps>) => {
    return <Icon component={StatusOffline} {...props} />
}

const SorterUp = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            d='M4.66667 10.6666V2.66663M4.66667 2.66663L2 5.33329M4.66667 2.66663L7.33333 5.33329'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M11.3332 5.33337V13.3334M11.3332 13.3334L13.9998 10.6667M11.3332 13.3334L8.6665 10.6667'
            stroke='#B4BBCA'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: 向上的箭头 排序
 */
export const SorterUpIcon = (props: Partial<IconProps>) => {
    return <Icon component={SorterUp} {...props} />
}

const SorterDown = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            d='M4.66667 10.6666V2.66663M4.66667 2.66663L2 5.33329M4.66667 2.66663L7.33333 5.33329'
            stroke='#B4BBCA'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M11.3332 5.33337V13.3334M11.3332 13.3334L13.9998 10.6667M11.3332 13.3334L8.6665 10.6667'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: 向下的箭头 排序
 */
export const SorterDownIcon = (props: Partial<IconProps>) => {
    return <Icon component={SorterDown} {...props} />
}

const DisableSorter = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            d='M4.66667 10.6666V2.66663M4.66667 2.66663L2 5.33329M4.66667 2.66663L7.33333 5.33329'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M11.3332 5.33337V13.3334M11.3332 13.3334L13.9998 10.6667M11.3332 13.3334L8.6665 10.6667'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: 两个箭头颜色一样 排序
 */
export const DisableSorterIcon = (props: Partial<IconProps>) => {
    return <Icon component={DisableSorter} {...props} />
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

const ColorSwatch = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M1.5 3.33333C1.5 2.32081 2.32081 1.5 3.33333 1.5H6C7.01252 1.5 7.83333 2.32081 7.83333 3.33333V3.68832L8.08435 3.43731C8.80031 2.72135 9.96111 2.72135 10.6771 3.43731L12.5627 5.32293C13.2787 6.03889 13.2787 7.19969 12.5627 7.91565L12.3117 8.16667H12.6667C13.6792 8.16667 14.5 8.98748 14.5 10V12.6667C14.5 13.6792 13.6792 14.5 12.6667 14.5H4.66667C2.91777 14.5 1.5 13.0822 1.5 11.3333V3.33333ZM6.97834 13.5H12.6667C13.1269 13.5 13.5 13.1269 13.5 12.6667V10C13.5 9.53976 13.1269 9.16667 12.6667 9.16667H11.3117L6.97834 13.5ZM6.1997 12.8644C6.59122 12.4724 6.83333 11.9311 6.83333 11.3333V3.33333C6.83333 2.8731 6.46024 2.5 6 2.5H3.33333C2.8731 2.5 2.5 2.8731 2.5 3.33333V11.3333C2.5 12.53 3.47005 13.5 4.66667 13.5C5.26476 13.5 5.80626 13.2577 6.19831 12.8658C6.19845 12.8657 6.19859 12.8655 6.19873 12.8654M7.83333 11.2308L11.8556 7.20854C12.181 6.88311 12.181 6.35547 11.8556 6.03003L9.96997 4.14441C9.64453 3.81898 9.11689 3.81898 8.79146 4.14441L7.83333 5.10254V11.2308ZM4.16667 11.3333C4.16667 11.0572 4.39052 10.8333 4.66667 10.8333H4.67333C4.94948 10.8333 5.17333 11.0572 5.17333 11.3333C5.17333 11.6095 4.94948 11.8333 4.67333 11.8333H4.66667C4.39052 11.8333 4.16667 11.6095 4.16667 11.3333Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description:切换颜色
 */
export const ColorSwatchIcon = (props: Partial<IconProps>) => {
    return <Icon component={ColorSwatch} {...props} />
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

const Save = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5.33333 4.66666H3.33333C2.59695 4.66666 2 5.26361 2 5.99999V12C2 12.7364 2.59695 13.3333 3.33333 13.3333H12.6667C13.403 13.3333 14 12.7364 14 12V5.99999C14 5.26361 13.403 4.66666 12.6667 4.66666H10.6667M10 7.33332L8 9.33332M8 9.33332L6 7.33332M8 9.33332L8 2.66666'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: save 导入
 */
export const SaveIcon = (props: Partial<IconProps>) => {
    return <Icon component={Save} {...props} />
}

const SortDescending = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 4H16M3 8H12M3 12H12M17 8V20M17 20L13 16M17 20L21 16'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: 排序 降序
 */
export const SortDescendingIcon = (props: Partial<IconProps>) => {
    return <Icon component={SortDescending} {...props} />
}

const SortAscending = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 4H16M3 8H12M3 12H9M13 12L17 8M17 8L21 12M17 8V20'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: 排序 降序
 */
export const SortAscendingIcon = (props: Partial<IconProps>) => {
    return <Icon component={SortAscending} {...props} />
}

const DotsHorizontal = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3.33317 7.99992H3.33984M7.99984 7.99992H8.0065M12.6665 7.99992H12.6732M3.99984 7.99992C3.99984 8.36811 3.70136 8.66659 3.33317 8.66659C2.96498 8.66659 2.6665 8.36811 2.6665 7.99992C2.6665 7.63173 2.96498 7.33325 3.33317 7.33325C3.70136 7.33325 3.99984 7.63173 3.99984 7.99992ZM8.6665 7.99992C8.6665 8.36811 8.36803 8.66659 7.99984 8.66659C7.63165 8.66659 7.33317 8.36811 7.33317 7.99992C7.33317 7.63173 7.63165 7.33325 7.99984 7.33325C8.36803 7.33325 8.6665 7.63173 8.6665 7.99992ZM13.3332 7.99992C13.3332 8.36811 13.0347 8.66659 12.6665 8.66659C12.2983 8.66659 11.9998 8.36811 11.9998 7.99992C11.9998 7.63173 12.2983 7.33325 12.6665 7.33325C13.0347 7.33325 13.3332 7.63173 13.3332 7.99992Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: 省略号 横向
 */
export const DotsHorizontalIcon = (props: Partial<IconProps>) => {
    return <Icon component={DotsHorizontal} {...props} />
}

const Export = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5.33333 6H3.33333C2.59695 6 2 6.59695 2 7.33333V12.6667C2 13.403 2.59695 14 3.33333 14H12.6667C13.403 14 14 13.403 14 12.6667V7.33333C14 6.59695 13.403 6 12.6667 6H10.6667M6 4L8 2M8 2L10 4M8 2V8.66667'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description:  导出
 */
export const ExportIcon = (props: Partial<IconProps>) => {
    return <Icon component={Export} {...props} />
}

const QuestionMarkCircle = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M8 2.5C4.96243 2.5 2.5 4.96243 2.5 8C2.5 11.0376 4.96243 13.5 8 13.5C11.0376 13.5 13.5 11.0376 13.5 8C13.5 4.96243 11.0376 2.5 8 2.5ZM1.5 8C1.5 4.41015 4.41015 1.5 8 1.5C11.5899 1.5 14.5 4.41015 14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8ZM8.00004 5.16667C6.9739 5.16667 6.19859 5.65892 5.9374 6.21315C5.81968 6.46294 5.52175 6.57001 5.27196 6.45229C5.02216 6.33457 4.9151 6.03664 5.03282 5.78685C5.50378 4.78749 6.704 4.16667 8.00004 4.16667C8.83414 4.16667 9.60852 4.41961 10.1857 4.85245C10.7629 5.28542 11.1667 5.92172 11.1667 6.66667C11.1667 7.93458 10.0368 8.84995 8.75705 9.09545C8.67554 9.11108 8.60519 9.15161 8.55928 9.2002C8.51566 9.24636 8.50004 9.29187 8.50004 9.33333C8.50004 9.60948 8.27618 9.83333 8.00004 9.83333C7.72389 9.83333 7.50004 9.60948 7.50004 9.33333C7.50004 8.67024 8.03016 8.21665 8.56865 8.11335C9.59315 7.91682 10.1667 7.26467 10.1667 6.66667C10.1667 6.30705 9.97351 5.94335 9.58565 5.65245C9.19764 5.36144 8.63869 5.16667 8.00004 5.16667ZM7.5 11.3333C7.5 11.0572 7.72386 10.8333 8 10.8333H8.00667C8.28281 10.8333 8.50667 11.0572 8.50667 11.3333C8.50667 11.6095 8.28281 11.8333 8.00667 11.8333H8C7.72386 11.8333 7.5 11.6095 7.5 11.3333Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description:  问号 带圈
 */
export const QuestionMarkCircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={QuestionMarkCircle} {...props} />
}

const Plus = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 2.66663V13.3333M13.3333 7.99996L2.66667 7.99996'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description:  + plus
 */
export const PlusIcon = (props: Partial<IconProps>) => {
    return <Icon component={Plus} {...props} />
}

const Trash = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12.6667 4.66667L12.0885 12.7617C12.0387 13.4594 11.4581 14 10.7586 14H5.24157C4.54205 14 3.96147 13.4594 3.91163 12.7617L3.33341 4.66667M6.66675 7.33333V11.3333M9.33341 7.33333V11.3333M10.0001 4.66667V2.66667C10.0001 2.29848 9.7016 2 9.33341 2H6.66675C6.29856 2 6.00008 2.29848 6.00008 2.66667V4.66667M2.66675 4.66667H13.3334'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description:Trash  删除 垃圾桶
 */
export const TrashIcon = (props: Partial<IconProps>) => {
    return <Icon component={Trash} {...props} />
}

const PencilAlt = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7.33341 3.33334H4.00008C3.2637 3.33334 2.66675 3.93029 2.66675 4.66667V12C2.66675 12.7364 3.2637 13.3333 4.00008 13.3333H11.3334C12.0698 13.3333 12.6667 12.7364 12.6667 12V8.66667M11.7239 2.39052C12.2446 1.86983 13.0889 1.86983 13.6096 2.39052C14.1303 2.91122 14.1303 3.75544 13.6096 4.27614L7.8857 10H6.00008L6.00008 8.11438L11.7239 2.39052Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description:PencilAlt 编辑
 */
export const PencilAltIcon = (props: Partial<IconProps>) => {
    return <Icon component={PencilAlt} {...props} />
}

const Ban = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12.2426 12.2426C14.5858 9.8995 14.5858 6.10051 12.2426 3.75736C9.8995 1.41421 6.10051 1.41421 3.75736 3.75736M12.2426 12.2426C9.8995 14.5858 6.10051 14.5858 3.75736 12.2426C1.41421 9.8995 1.41421 6.10051 3.75736 3.75736M12.2426 12.2426L3.75736 3.75736'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description:Ban 禁止
 */
export const BanIcon = (props: Partial<IconProps>) => {
    return <Icon component={Ban} {...props} />
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

const Adjustments = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.00008 3.99996V2.66663M8.00008 3.99996C7.2637 3.99996 6.66675 4.59691 6.66675 5.33329C6.66675 6.06967 7.2637 6.66663 8.00008 6.66663M8.00008 3.99996C8.73646 3.99996 9.33341 4.59691 9.33341 5.33329C9.33341 6.06967 8.73646 6.66663 8.00008 6.66663M4.00008 12C4.73646 12 5.33341 11.403 5.33341 10.6666C5.33341 9.93025 4.73646 9.33329 4.00008 9.33329M4.00008 12C3.2637 12 2.66675 11.403 2.66675 10.6666C2.66675 9.93025 3.2637 9.33329 4.00008 9.33329M4.00008 12V13.3333M4.00008 9.33329V2.66663M8.00008 6.66663V13.3333M12.0001 12C12.7365 12 13.3334 11.403 13.3334 10.6666C13.3334 9.93025 12.7365 9.33329 12.0001 9.33329M12.0001 12C11.2637 12 10.6667 11.403 10.6667 10.6666C10.6667 9.93025 11.2637 9.33329 12.0001 9.33329M12.0001 12V13.3333M12.0001 9.33329V2.66663'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description:调整
 */
export const AdjustmentsIcon = (props: Partial<IconProps>) => {
    return <Icon component={Adjustments} {...props} />
}

const PlusCircle = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M8 2.5C4.96243 2.5 2.5 4.96243 2.5 8C2.5 11.0376 4.96243 13.5 8 13.5C11.0376 13.5 13.5 11.0376 13.5 8C13.5 4.96243 11.0376 2.5 8 2.5ZM1.5 8C1.5 4.41015 4.41015 1.5 8 1.5C11.5899 1.5 14.5 4.41015 14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8ZM8 5.5C8.27614 5.5 8.5 5.72386 8.5 6V7.5H10C10.2761 7.5 10.5 7.72386 10.5 8C10.5 8.27614 10.2761 8.5 10 8.5H8.5V10C8.5 10.2761 8.27614 10.5 8 10.5C7.72386 10.5 7.5 10.2761 7.5 10V8.5H6C5.72386 8.5 5.5 8.27614 5.5 8C5.5 7.72386 5.72386 7.5 6 7.5H7.5V6C7.5 5.72386 7.72386 5.5 8 5.5Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description:  + plus Circle 带圈
 */
export const PlusCircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={PlusCircle} {...props} />
}

const DragSort = () => (
    <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4.2 3.59995C3.53726 3.59995 3 3.06269 3 2.39995C3 1.73721 3.53726 1.19995 4.2 1.19995C4.86274 1.19995 5.4 1.73721 5.4 2.39995C5.4 3.06269 4.86274 3.59995 4.2 3.59995Z'
            fill='currentColor'
        />
        <path
            d='M4.2 7.19995C3.53726 7.19995 3 6.66269 3 5.99995C3 5.33721 3.53726 4.79995 4.2 4.79995C4.86274 4.79995 5.4 5.33721 5.4 5.99995C5.4 6.66269 4.86274 7.19995 4.2 7.19995Z'
            fill='currentColor'
        />
        <path
            d='M4.2 10.8C3.53726 10.8 3 10.2627 3 9.59995C3 8.93721 3.53726 8.39995 4.2 8.39995C4.86274 8.39995 5.4 8.93721 5.4 9.59995C5.4 10.2627 4.86274 10.8 4.2 10.8Z'
            fill='currentColor'
        />
        <path
            d='M7.8001 3.59995C7.13736 3.59995 6.6001 3.06269 6.6001 2.39995C6.6001 1.73721 7.13736 1.19995 7.8001 1.19995C8.46284 1.19995 9.0001 1.73721 9.0001 2.39995C9.0001 3.06269 8.46284 3.59995 7.8001 3.59995Z'
            fill='currentColor'
        />
        <path
            d='M7.8001 7.19995C7.13736 7.19995 6.6001 6.66269 6.6001 5.99995C6.6001 5.33721 7.13736 4.79995 7.8001 4.79995C8.46284 4.79995 9.0001 5.33721 9.0001 5.99995C9.0001 6.66269 8.46284 7.19995 7.8001 7.19995Z'
            fill='currentColor'
        />
        <path
            d='M7.8001 10.8C7.13736 10.8 6.6001 10.2627 6.6001 9.59995C6.6001 8.93721 7.13736 8.39995 7.8001 8.39995C8.46284 8.39995 9.0001 8.93721 9.0001 9.59995C9.0001 10.2627 8.46284 10.8 7.8001 10.8Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description: 拖拽排序
 */
export const DragSortIcon = (props: Partial<IconProps>) => {
    return <Icon component={DragSort} {...props} />
}

const Photograph = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M4.80002 3.59998C3.47454 3.59998 2.40002 4.67449 2.40002 5.99998V18C2.40002 19.3255 3.47454 20.4 4.80002 20.4H19.2C20.5255 20.4 21.6 19.3255 21.6 18V5.99998C21.6 4.67449 20.5255 3.59998 19.2 3.59998H4.80002ZM19.2 18H4.80002L9.60002 8.39998L13.2 15.6L15.6 10.8L19.2 18Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description:  Photograph 图片
 */
export const PhotographIcon = (props: Partial<IconProps>) => {
    return <Icon component={Photograph} {...props} />
}

const CursorClick = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5.3374 1.52921C5.22305 1.10244 4.78438 0.84917 4.35761 0.963524C3.93083 1.07788 3.67757 1.51655 3.79192 1.94332L3.99898 2.71606C4.11333 3.14283 4.552 3.3961 4.97877 3.28175C5.40554 3.16739 5.65881 2.72872 5.54446 2.30195L5.3374 1.52921Z'
            fill='currentColor'
        />
        <path
            d='M1.94329 3.79195C1.51652 3.6776 1.07785 3.93086 0.963493 4.35764C0.84914 4.78441 1.10241 5.22308 1.52918 5.33743L2.30192 5.54449C2.72869 5.65884 3.16736 5.40557 3.28172 4.9788C3.39607 4.55203 3.1428 4.11336 2.71603 3.99901L1.94329 3.79195Z'
            fill='currentColor'
        />
        <path
            d='M8.99405 3.33723C9.30647 3.02481 9.30647 2.51827 8.99405 2.20586C8.68163 1.89344 8.1751 1.89344 7.86268 2.20586L7.29699 2.77154C6.98457 3.08396 6.98457 3.59049 7.29699 3.90291C7.60941 4.21533 8.11594 4.21533 8.42836 3.90291L8.99405 3.33723Z'
            fill='currentColor'
        />
        <path
            d='M3.33719 8.99408L3.90288 8.4284C4.2153 8.11598 4.2153 7.60944 3.90288 7.29702C3.59046 6.9846 3.08393 6.9846 2.77151 7.29702L2.20582 7.86271C1.8934 8.17513 1.8934 8.68166 2.20582 8.99408C2.51824 9.3065 3.02478 9.3065 3.33719 8.99408Z'
            fill='currentColor'
        />
        <path
            d='M5.89713 4.85724C5.6 4.73839 5.26063 4.80805 5.03434 5.03434C4.80805 5.26063 4.73839 5.6 4.85724 5.89714L8.05724 13.8971C8.17424 14.1896 8.45201 14.3862 8.76677 14.3993C9.08154 14.4124 9.37468 14.2396 9.51556 13.9578L10.6192 11.7506L13.0343 14.1657C13.3468 14.4781 13.8533 14.4781 14.1657 14.1657C14.4781 13.8533 14.4781 13.3468 14.1657 13.0343L11.7506 10.6192L13.9578 9.51557C14.2396 9.37468 14.4124 9.08154 14.3993 8.76678C14.3862 8.45202 14.1896 8.17424 13.8971 8.05724L5.89713 4.85724Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description:  CursorClick 鼠标点击
 */
export const CursorClickIcon = (props: Partial<IconProps>) => {
    return <Icon component={CursorClick} {...props} />
}

const User = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7.9999 7.19999C9.32539 7.19999 10.3999 6.12548 10.3999 4.79999C10.3999 3.47451 9.32539 2.39999 7.9999 2.39999C6.67442 2.39999 5.5999 3.47451 5.5999 4.79999C5.5999 6.12548 6.67442 7.19999 7.9999 7.19999Z'
            fill='currentColor'
        />
        <path
            d='M2.3999 14.4C2.3999 11.3072 4.90711 8.79999 7.9999 8.79999C11.0927 8.79999 13.5999 11.3072 13.5999 14.4H2.3999Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description:  User 用户
 */
export const UserIcon = (props: Partial<IconProps>) => {
    return <Icon component={User} {...props} />
}

const AcademicCap = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.31523 1.66469C8.11399 1.57844 7.8862 1.57844 7.68496 1.66469L2.08496 4.06469C1.79082 4.19075 1.6001 4.47998 1.6001 4.80001C1.6001 5.12003 1.79082 5.40926 2.08496 5.53532L4.2004 6.44194C4.27732 6.35478 4.37375 6.28379 4.48496 6.23613L7.68496 4.8647C8.09107 4.69066 8.56137 4.87878 8.73541 5.28488C8.90946 5.69098 8.72134 6.16129 8.31523 6.33533L6.13344 7.27038L7.68496 7.93532C7.8862 8.02157 8.11399 8.02157 8.31523 7.93532L13.9152 5.53532C14.2094 5.40926 14.4001 5.12003 14.4001 4.80001C14.4001 4.47998 14.2094 4.19075 13.9152 4.06469L8.31523 1.66469Z'
            fill='currentColor'
        />
        <path
            d='M2.64813 7.51739L4.0001 8.0968V11.3781C3.72588 11.3159 3.44574 11.2694 3.16066 11.2395C2.78485 11.2001 2.48785 10.9031 2.44845 10.5273C2.41647 10.2223 2.4001 9.91284 2.4001 9.59987C2.4001 8.88265 2.48603 8.18519 2.64813 7.51739Z'
            fill='currentColor'
        />
        <path
            d='M7.44006 13.258C6.90176 12.7303 6.28143 12.2867 5.6001 11.9481V8.78252L7.05469 9.40591C7.65841 9.66465 8.34179 9.66465 8.9455 9.40591L13.3521 7.51739C13.5142 8.18519 13.6001 8.88265 13.6001 9.59987C13.6001 9.91284 13.5837 10.2223 13.5517 10.5273C13.5123 10.9031 13.2153 11.2001 12.8395 11.2395C11.1813 11.4134 9.69001 12.1504 8.56013 13.258C8.24905 13.563 7.75115 13.563 7.44006 13.258Z'
            fill='currentColor'
        />
        <path
            d='M4.8001 14.4C5.24193 14.4 5.6001 14.0418 5.6001 13.6V11.9481C5.09719 11.6981 4.56103 11.5054 4.0001 11.3781V13.6C4.0001 14.0418 4.35827 14.4 4.8001 14.4Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description:  AcademicCap 专家
 */
export const AcademicCapIcon = (props: Partial<IconProps>) => {
    return <Icon component={AcademicCap} {...props} />
}

const ArrowLeft = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6.66667 12.6666L2 7.99998M2 7.99998L6.66667 3.33331M2 7.99998L14 7.99998'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description:  箭头 向左
 */
export const ArrowLeftIcon = (props: Partial<IconProps>) => {
    return <Icon component={ArrowLeft} {...props} />
}

const PrivatePlugin = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask id='path-1-inside-1_4418_4103' fill='white'>
            <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M1.64412 3.48641C4.05073 3.45052 6.24346 2.44105 7.91123 0.799988C9.579 2.44105 11.7717 3.45052 14.1783 3.48641C14.2657 4.05877 14.3112 4.64676 14.3112 5.24643C14.3112 9.84175 11.6398 13.7511 7.91123 15.2C4.18262 13.7511 1.51123 9.84175 1.51123 5.24643C1.51123 4.64676 1.55672 4.05877 1.64412 3.48641ZM9.5112 6.39998C9.5112 6.9922 9.18944 7.50928 8.7112 7.78593V9.59998C8.7112 10.0418 8.35303 10.4 7.9112 10.4C7.46937 10.4 7.1112 10.0418 7.1112 9.59998V7.78593C6.63296 7.50928 6.3112 6.9922 6.3112 6.39998C6.3112 5.51632 7.02755 4.79998 7.9112 4.79998C8.79486 4.79998 9.5112 5.51632 9.5112 6.39998Z'
            />
        </mask>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M1.64412 3.48641C4.05073 3.45052 6.24346 2.44105 7.91123 0.799988C9.579 2.44105 11.7717 3.45052 14.1783 3.48641C14.2657 4.05877 14.3112 4.64676 14.3112 5.24643C14.3112 9.84175 11.6398 13.7511 7.91123 15.2C4.18262 13.7511 1.51123 9.84175 1.51123 5.24643C1.51123 4.64676 1.55672 4.05877 1.64412 3.48641ZM9.5112 6.39998C9.5112 6.9922 9.18944 7.50928 8.7112 7.78593V9.59998C8.7112 10.0418 8.35303 10.4 7.9112 10.4C7.46937 10.4 7.1112 10.0418 7.1112 9.59998V7.78593C6.63296 7.50928 6.3112 6.9922 6.3112 6.39998C6.3112 5.51632 7.02755 4.79998 7.9112 4.79998C8.79486 4.79998 9.5112 5.51632 9.5112 6.39998Z'
            fill='url(#paint0_linear_4418_4103)'
        />
        <path
            d='M7.91123 0.799988L8.61261 0.0871949L7.91123 -0.602944L7.20986 0.087195L7.91123 0.799988ZM1.64412 3.48641L1.6292 2.48652L0.783274 2.49914L0.655574 3.33547L1.64412 3.48641ZM14.1783 3.48641L15.1669 3.33547L15.0392 2.49914L14.1933 2.48652L14.1783 3.48641ZM7.91123 15.2L7.54904 16.1321L7.91123 16.2728L8.27342 16.1321L7.91123 15.2ZM8.7112 7.78593L8.21048 6.92032L7.7112 7.20914V7.78593H8.7112ZM7.1112 7.78593H8.1112V7.20914L7.61193 6.92032L7.1112 7.78593ZM7.20986 0.087195C5.70899 1.56401 3.75639 2.4548 1.6292 2.48652L1.65903 4.4863C4.34507 4.44624 6.77792 3.31808 8.61261 1.51278L7.20986 0.087195ZM14.1933 2.48652C12.0661 2.4548 10.1135 1.56401 8.61261 0.0871949L7.20986 1.51278C9.04454 3.31808 11.4774 4.44624 14.1634 4.4863L14.1933 2.48652ZM15.3112 5.24643C15.3112 4.59614 15.2619 3.9577 15.1669 3.33547L13.1898 3.63735C13.2696 4.15985 13.3112 4.69738 13.3112 5.24643H15.3112ZM8.27342 16.1321C12.4172 14.5219 15.3112 10.2204 15.3112 5.24643H13.3112C13.3112 9.4631 10.8625 12.9803 7.54904 14.2679L8.27342 16.1321ZM0.51123 5.24643C0.51123 10.2204 3.40529 14.5219 7.54904 16.1321L8.27342 14.2679C4.95994 12.9803 2.51123 9.4631 2.51123 5.24643H0.51123ZM0.655574 3.33547C0.560564 3.9577 0.51123 4.59614 0.51123 5.24643H2.51123C2.51123 4.69738 2.55288 4.15985 2.63266 3.63735L0.655574 3.33547ZM9.21193 8.65153C9.98646 8.20349 10.5112 7.3636 10.5112 6.39998H8.5112C8.5112 6.6208 8.39242 6.81507 8.21048 6.92032L9.21193 8.65153ZM9.7112 9.59998V7.78593H7.7112V9.59998H9.7112ZM7.9112 11.4C8.90531 11.4 9.7112 10.5941 9.7112 9.59998H7.7112C7.7112 9.48952 7.80074 9.39998 7.9112 9.39998V11.4ZM6.1112 9.59998C6.1112 10.5941 6.91709 11.4 7.9112 11.4V9.39998C8.02166 9.39998 8.1112 9.48952 8.1112 9.59998H6.1112ZM6.1112 7.78593V9.59998H8.1112V7.78593H6.1112ZM5.3112 6.39998C5.3112 7.3636 5.83594 8.20349 6.61048 8.65153L7.61193 6.92032C7.42998 6.81507 7.3112 6.6208 7.3112 6.39998H5.3112ZM7.9112 3.79998C6.47526 3.79998 5.3112 4.96404 5.3112 6.39998H7.3112C7.3112 6.06861 7.57983 5.79998 7.9112 5.79998V3.79998ZM10.5112 6.39998C10.5112 4.96404 9.34714 3.79998 7.9112 3.79998V5.79998C8.24257 5.79998 8.5112 6.06861 8.5112 6.39998H10.5112Z'
            fill='#31343F'
            mask='url(#path-1-inside-1_4418_4103)'
        />
        <defs>
            <linearGradient
                id='paint0_linear_4418_4103'
                x1='4.71123'
                y1='0.799988'
                x2='12.2934'
                y2='15.2989'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#63DDA1' />
                <stop offset='1' stopColor='#35BC7A' />
            </linearGradient>
        </defs>
    </svg>
)

/**
 * @description:  私密插件 彩色
 */
export const PrivatePluginIcon = (props: Partial<IconProps>) => {
    return <Icon component={PrivatePlugin} {...props} />
}

const OfficialPlugin = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9.23431 5.83021L9.682 6.05286L9.23431 5.83021L7.99883 8.31444L6.76306 5.82959L6.31537 6.05224L6.76306 5.82959C6.59331 5.48826 6.24526 5.27102 5.86279 5.27102C5.11102 5.27102 4.63095 6.06321 4.96251 6.7299L6.98537 10.7975L6.98538 10.7975C7.40051 11.6322 8.59461 11.6424 9.01355 10.8001L9.01356 10.8001L11.0369 6.73154C11.3688 6.06409 10.8882 5.27102 10.1356 5.27102C9.75269 5.27102 9.40425 5.4885 9.23431 5.83021ZM7.88163 8.5501C7.88167 8.55002 7.88171 8.54994 7.88175 8.54986L7.88164 8.55008L7.88163 8.5501ZM8.11592 8.54987C8.11596 8.54994 8.11599 8.55002 8.11603 8.55009L8.11603 8.55009L8.11592 8.54987ZM7.5121 1.4315C7.81418 1.25615 8.18601 1.25615 8.4881 1.4315L13.4101 4.28851C13.7125 4.46404 13.9001 4.78941 13.9001 5.14298V10.857C13.9001 11.2106 13.7125 11.5359 13.4101 11.7115L8.4881 14.5685C8.18601 14.7438 7.81418 14.7438 7.5121 14.5685L2.59011 11.7115C2.28772 11.5359 2.1001 11.2106 2.1001 10.857V5.14298C2.1001 4.78941 2.28772 4.46404 2.59011 4.28851L7.5121 1.4315Z'
            fill='url(#paint0_linear_4418_2670)'
            stroke='#31343F'
        />
        <defs>
            <linearGradient
                id='paint0_linear_4418_2670'
                x1='1.59774'
                y1='8.00056'
                x2='14.4004'
                y2='8.00056'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#FA931D' />
                <stop offset='1' stopColor='#EF5B27' />
            </linearGradient>
        </defs>
    </svg>
)

/**
 * @description:  官方插件 彩色
 */
export const OfficialPluginIcon = (props: Partial<IconProps>) => {
    return <Icon component={OfficialPlugin} {...props} />
}

const Terminal = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5.33333 6.00002L7.33333 8.00002L5.33333 10M8.66667 10H10.6667M3.33333 13.3334H12.6667C13.403 13.3334 14 12.7364 14 12V4.00002C14 3.26364 13.403 2.66669 12.6667 2.66669H3.33333C2.59695 2.66669 2 3.26364 2 4.00002V12C2 12.7364 2.59695 13.3334 3.33333 13.3334Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description: terminal  代码
 */
export const TerminalIcon = (props: Partial<IconProps>) => {
    return <Icon component={Terminal} {...props} />
}

const Cube = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.7999 13.6C8.7999 13.8773 8.94347 14.1348 9.17932 14.2805C9.41517 14.4263 9.70968 14.4395 9.95767 14.3155L13.1577 12.7155C13.4287 12.58 13.5999 12.303 13.5999 12V7.38886C13.5999 7.1116 13.4563 6.8541 13.2205 6.70834C12.9846 6.56257 12.6901 6.54932 12.4421 6.67332L9.24213 8.27332C8.9711 8.40883 8.7999 8.68584 8.7999 8.98886V13.6Z'
            fill='currentColor'
        />
        <path
            d='M12.1688 5.02112C12.4398 4.88561 12.611 4.6086 12.611 4.30558C12.611 4.00256 12.4398 3.72555 12.1688 3.59004L8.35767 1.68446C8.13245 1.57185 7.86735 1.57185 7.64213 1.68446L3.83099 3.59004C3.55996 3.72555 3.38876 4.00256 3.38876 4.30558C3.38876 4.6086 3.55996 4.88561 3.83099 5.02112L7.64213 6.92669C7.86735 7.0393 8.13245 7.0393 8.35767 6.92669L12.1688 5.02112Z'
            fill='currentColor'
        />
        <path
            d='M3.55767 6.67332C3.30968 6.54932 3.01517 6.56257 2.77932 6.70834C2.54346 6.8541 2.3999 7.1116 2.3999 7.38886V12C2.3999 12.303 2.5711 12.58 2.84213 12.7155L6.04213 14.3155C6.29012 14.4395 6.58463 14.4263 6.82049 14.2805C7.05634 14.1348 7.1999 13.8773 7.1999 13.6V8.98886C7.1999 8.68584 7.0287 8.40883 6.75767 8.27332L3.55767 6.67332Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description: cube  默认
 */
export const CubeIcon = (props: Partial<IconProps>) => {
    return <Icon component={Cube} {...props} />
}

const ShieldExclamation = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M16 3.11115C12.6644 6.09654 8.27895 7.93296 3.46572 7.99826C3.29093 9.0395 3.19995 10.1092 3.19995 11.2001C3.19995 19.5598 8.54272 26.6717 16 29.3075C23.4572 26.6717 28.8 19.5598 28.8 11.2001C28.8 10.1092 28.709 9.0395 28.5342 7.99826C23.721 7.93296 19.3355 6.09654 16 3.11115ZM17.6 22.4C17.6 23.2837 16.8836 24 16 24C15.1163 24 14.4 23.2837 14.4 22.4C14.4 21.5164 15.1163 20.8 16 20.8C16.8836 20.8 17.6 21.5164 17.6 22.4ZM17.6 11.2C17.6 10.3164 16.8836 9.60001 16 9.60001C15.1163 9.60001 14.4 10.3164 14.4 11.2V16C14.4 16.8837 15.1163 17.6 16 17.6C16.8836 17.6 17.6 16.8837 17.6 16V11.2Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description: shield-exclamation 确认提示
 */
export const ShieldExclamationIcon = (props: Partial<IconProps>) => {
    return <Icon component={ShieldExclamation} {...props} />
}

const DocumentDownload = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.5999 3.2C7.83259 3.2 6.3999 4.63269 6.3999 6.4V25.6C6.3999 27.3673 7.83259 28.8 9.5999 28.8H22.3999C24.1672 28.8 25.5999 27.3673 25.5999 25.6V11.8627C25.5999 11.014 25.2628 10.2001 24.6626 9.6L19.1999 4.13726C18.5998 3.53714 17.7859 3.2 16.9372 3.2H9.5999ZM17.5999 12.8C17.5999 11.9163 16.8836 11.2 15.9999 11.2C15.1162 11.2 14.3999 11.9163 14.3999 12.8V18.5373L12.3313 16.4686C11.7064 15.8438 10.6934 15.8438 10.0685 16.4686C9.44369 17.0935 9.44369 18.1065 10.0685 18.7314L14.8685 23.5314C15.4934 24.1562 16.5064 24.1562 17.1313 23.5314L21.9313 18.7314C22.5561 18.1065 22.5561 17.0935 21.9313 16.4686C21.3064 15.8438 20.2934 15.8438 19.6685 16.4686L17.5999 18.5373V12.8Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description: DocumentDownload 下载图标
 */
export const DocumentDownloadIcon = (props: Partial<IconProps>) => {
    return <Icon component={DocumentDownload} {...props} />
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

const ChromeSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3.93188 4.78666C7.65055 0.459328 14.5466 1.31333 17.1239 6.36999H10.9286C9.81255 6.36999 9.09188 6.34466 8.31122 6.75533C7.39388 7.23866 6.70188 8.13399 6.45988 9.18533L3.93188 4.78733V4.78666Z'
            fill='#EA4335'
        />
        <path
            d='M7.33862 10C7.33862 11.4667 8.53129 12.66 9.99729 12.66C11.464 12.66 12.656 11.4667 12.656 10C12.656 8.53336 11.4633 7.34003 9.99729 7.34003C8.53062 7.34003 7.33862 8.53336 7.33862 10Z'
            fill='#4285F4'
        />
        <path
            d='M11.0293 13.482C9.53665 13.9254 7.79065 13.4334 6.83399 11.782C6.10332 10.522 4.17399 7.16069 3.29732 5.63269C0.225986 10.3394 2.87332 16.7547 8.44865 17.8494L11.0287 13.482H11.0293Z'
            fill='#34A853'
        />
        <path
            d='M12.4668 7.34002C13.0678 7.90113 13.4614 8.64908 13.5834 9.46223C13.7054 10.2754 13.5487 11.1059 13.1388 11.8187C12.5048 12.912 10.4801 16.3294 9.49878 17.984C15.2434 18.338 19.4321 12.708 17.5401 7.33936H12.4668V7.34002Z'
            fill='#FBBC05'
        />
    </svg>
)
/** @name Chrome彩色图标 */
export const ChromeSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={ChromeSvg} {...props} />
}

const ChromeFrameSvg = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 5.6C6.67452 5.6 5.6 6.67452 5.6 8C5.6 9.32548 6.67452 10.4 8 10.4C9.32548 10.4 10.4 9.32548 10.4 8C10.4 6.67452 9.32548 5.6 8 5.6ZM8 5.6H13.4M5.6 8.6L3.2 4.4M7.4 13.8766L10.1 9.20001M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name Chrome边框图标 */
export const ChromeFrameSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={ChromeFrameSvg} {...props} />
}

const ArrowCircleRightSvg = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.66667 6L10.6667 8M10.6667 8L8.66667 10M10.6667 8L5.33333 8M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 带圆形边框的向右箭头图标 */
export const ArrowCircleRightSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={ArrowCircleRightSvg} {...props} />
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

const DesktopComputerSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.125 14.1694L7.5 16.6694L6.66667 17.5027H13.3333L12.5 16.6694L11.875 14.1694M2.5 10.836H17.5M4.16667 14.1694H15.8333C16.7538 14.1694 17.5 13.4232 17.5 12.5027V4.16935C17.5 3.24888 16.7538 2.50269 15.8333 2.50269H4.16667C3.24619 2.50269 2.5 3.24888 2.5 4.16935V12.5027C2.5 13.4232 3.24619 14.1694 4.16667 14.1694Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 电脑图标 */
export const DesktopComputerSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={DesktopComputerSvg} {...props} />
}

const DotsVerticalSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9.99992 4.16671L9.99992 4.17504M9.99992 10L9.99992 10.0084M9.99992 15.8334L9.99992 15.8417M9.99992 5.00004C9.53968 5.00004 9.16659 4.62694 9.16659 4.16671C9.16659 3.70647 9.53968 3.33337 9.99992 3.33337C10.4602 3.33337 10.8333 3.70647 10.8333 4.16671C10.8333 4.62694 10.4602 5.00004 9.99992 5.00004ZM9.99992 10.8334C9.53968 10.8334 9.16659 10.4603 9.16659 10C9.16659 9.5398 9.53968 9.16671 9.99992 9.16671C10.4602 9.16671 10.8333 9.5398 10.8333 10C10.8333 10.4603 10.4602 10.8334 9.99992 10.8334ZM9.99992 16.6667C9.53968 16.6667 9.16658 16.2936 9.16659 15.8334C9.16659 15.3731 9.53968 15 9.99992 15C10.4602 15 10.8333 15.3731 10.8333 15.8334C10.8333 16.2936 10.4602 16.6667 9.99992 16.6667Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 省略纵向图标 */
export const DotsVerticalSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={DotsVerticalSvg} {...props} />
}

const ImportSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.33337 3.33337H5.33337C4.2288 3.33337 3.33337 4.2288 3.33337 5.33337V14.6667C3.33337 15.7713 4.2288 16.6667 5.33337 16.6667H14.6667C15.7713 16.6667 16.6667 15.7713 16.6667 14.6667V10'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M16.6667 3.33337C14.1667 3.33337 10 6.66671 10 10.8334'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M12.5 10L10 12.5L7.5 10'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 导入图标 */
export const ImportSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={ImportSvg} {...props} />
}

const PlusBoldSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10 3.33337V16.6667M16.6667 10L3.33337 10'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 加号图标(加粗) */
export const PlusBoldSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={PlusBoldSvg} {...props} />
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

const YakitLogoSvg = () => (
    <svg width='104' height='33' viewBox='0 0 104 33' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M49.5481 24.393C49.6471 23.4762 49.7474 22.2782 49.849 20.7992C49.9507 19.3203 50.0106 18.1427 50.0286 17.2664L44.4574 7.47392C45.3934 7.49045 46.1225 7.49871 46.6448 7.49871C47.1422 7.49871 47.8052 7.49045 48.634 7.47392C49.0082 8.33224 49.5523 9.42029 50.2662 10.7381C50.9801 12.0559 51.5961 13.2634 52.1143 14.3608L55.8114 8.41421C55.9359 8.20755 56.1189 7.89378 56.3603 7.47288C57.1649 7.48941 57.8777 7.49768 58.4989 7.49768C58.8227 7.49768 59.4902 7.48941 60.5016 7.47288L53.705 17.5258L53.5545 20.6618C53.5033 21.587 53.4653 22.8303 53.4404 24.392C52.5535 24.3762 51.9067 24.3682 51.5 24.3682C51.0932 24.3682 50.4426 24.3765 49.5481 24.393ZM61.7842 14.552C61.9004 13.9568 61.973 13.5393 62.0021 13.2996C62.0311 13.0599 62.083 12.6965 62.1577 12.2095C63.143 11.9714 64.1402 11.7851 65.1451 11.6515C65.9749 11.5461 66.8104 11.4923 67.6469 11.4903C68.4955 11.4821 69.3413 11.5885 70.1611 11.8065C70.9221 12.0173 71.5194 12.3538 71.9532 12.816C72.3869 13.2783 72.6027 13.9437 72.6007 14.8124C72.6007 15.2835 72.5346 16.4835 72.4025 18.4123C72.2704 20.3411 72.1922 22.3347 72.168 24.393C71.5371 24.3772 70.9556 24.3693 70.4237 24.3693C69.9173 24.3693 69.3238 24.3772 68.6431 24.393C68.7524 23.3935 68.8402 22.2369 68.9066 20.9232L69.0706 17.8368C68.8365 17.9944 68.594 18.1393 68.3442 18.2708C68.1623 18.3589 67.9747 18.4352 67.7828 18.4991C67.5753 18.568 67.2101 18.6755 66.6871 18.8215C66.1641 18.9676 65.7445 19.0936 65.4284 19.1997C65.1344 19.2979 64.8491 19.4203 64.5755 19.5655C64.3412 19.6879 64.1254 19.8423 63.9342 20.0243C63.7725 20.1747 63.643 20.356 63.5534 20.5575C63.4736 20.7479 63.4334 20.9525 63.4351 21.1588C63.428 21.4845 63.536 21.8023 63.7401 22.0568C63.937 22.3044 64.2037 22.4879 64.5059 22.5837C64.857 22.6892 65.2226 22.7394 65.5892 22.7325C65.8702 22.7313 66.1507 22.7106 66.4287 22.6705C66.8333 22.6013 67.2311 22.4975 67.6179 22.3605C67.3788 23.0521 67.1752 23.7553 67.0077 24.4674C66.4183 24.5666 65.9496 24.6286 65.6017 24.6534C65.2537 24.6782 64.93 24.6906 64.6304 24.6906C63.5845 24.6906 62.7257 24.5504 62.0539 24.2701C61.4115 24.0156 60.8831 23.5386 60.566 22.9268C60.2577 22.3593 60.0932 21.7255 60.0866 21.0803C60.0898 20.3459 60.35 19.6356 60.8223 19.0716C61.0949 18.7529 61.4089 18.4717 61.7561 18.2356C62.138 17.967 62.6914 17.7066 63.4164 17.4545C64.3554 17.144 65.312 16.8893 66.2814 16.6919C66.5968 16.623 66.9247 16.5424 67.2651 16.4501C67.5432 16.3766 67.8158 16.2834 68.0806 16.1711C68.2768 16.0852 68.4563 15.9656 68.6109 15.8177C68.7484 15.6891 68.8601 15.5355 68.9398 15.3652C69.0086 15.2135 69.044 15.049 69.0436 14.8826C69.0521 14.5796 68.9402 14.2856 68.7323 14.0643C68.5083 13.8341 68.2227 13.6728 67.9094 13.5993C67.545 13.5091 67.1705 13.4653 66.795 13.4691C65.2814 13.4746 63.6111 13.8355 61.7842 14.552ZM75.2737 24.393L75.5217 21.1712L75.807 14.9859L75.943 9.69239C75.9596 8.73487 75.9679 7.99538 75.9679 7.47392C76.836 7.49045 77.4527 7.49871 77.818 7.49871C78.2476 7.49871 78.8145 7.49045 79.5187 7.47392L79.2583 11.5038L78.9615 17.9246L78.837 22.7212L78.8245 24.3941C78.0878 24.3782 77.5084 24.3703 77.0865 24.3703C76.6077 24.3696 76.0045 24.3772 75.2768 24.393H75.2737ZM79.2323 17.3346L81.7694 14.2637C81.9866 13.9991 82.2446 13.6733 82.5435 13.2862C82.8423 12.899 83.2228 12.3996 83.6849 11.7879C84.5462 11.8044 85.1757 11.8127 85.5734 11.8127C86.1213 11.8127 86.8131 11.8044 87.6487 11.7879L83.5469 16.4677L82.8112 17.3594C83.4186 18.319 85.1016 20.6635 87.8604 24.393C87.1119 24.3772 86.472 24.3693 85.9408 24.3693C85.4095 24.3693 84.7492 24.3772 83.9599 24.393C83.4756 23.6077 83.0827 22.9774 82.7811 22.5021C82.4795 22.0268 82.199 21.6111 81.9396 21.2549L79.8196 18.2398C79.7626 18.1581 79.5675 17.8554 79.2354 17.3346H79.2323ZM89.2654 24.393C89.392 23.1531 89.4805 22.1163 89.531 21.2828C89.6154 19.9602 89.6891 18.4354 89.7521 16.7084C89.815 14.9815 89.8593 13.3413 89.8849 11.7879C90.6929 11.8044 91.2989 11.8127 91.7029 11.8127C92.0743 11.8127 92.6765 11.8044 93.5094 11.7879C93.3974 13.2249 93.3071 14.5964 93.2386 15.9025C93.1701 17.2085 93.1203 18.7044 93.0892 20.3901C93.0567 22.075 93.0407 23.4093 93.0414 24.393C92.2853 24.3772 91.6786 24.3693 91.2214 24.3693C90.7918 24.3693 90.1409 24.3772 89.2685 24.393H89.2654ZM89.9471 9.63039C89.9804 8.77965 89.997 8.12523 89.997 7.66714V7.27759C90.7513 7.29412 91.3667 7.30239 91.8388 7.30239C92.4863 7.30239 93.0881 7.29412 93.6443 7.27759C93.6194 7.48425 93.6018 7.71983 93.5945 7.98436L93.5322 9.63762C92.9014 9.62109 92.3203 9.61282 91.789 9.61282C91.2577 9.61282 90.6448 9.61868 89.9503 9.63039H89.9471ZM103.829 21.8026C103.729 22.2572 103.572 23.1004 103.356 24.3321C102.814 24.4608 102.266 24.5598 101.713 24.6286C101.341 24.6685 100.967 24.6892 100.592 24.6906C100.038 24.6971 99.4845 24.6388 98.9436 24.517C98.4961 24.4213 98.0816 24.2099 97.742 23.9043C97.436 23.6259 97.2139 23.2681 97.1007 22.871C96.988 22.4736 96.9314 22.0626 96.9326 21.6496C96.9326 21.5463 96.9326 21.3975 96.9451 21.2167C96.9576 21.0359 96.9866 20.4479 97.0489 19.4601L97.3342 14.304H95.5432C95.584 13.808 95.621 13.0106 95.6543 11.9119H97.5293C97.5791 11.4297 97.6289 10.6155 97.6787 9.46919L99.1501 9.18504C99.4573 9.12718 100.051 8.9894 100.933 8.77172C100.873 9.8863 100.838 10.9317 100.829 11.9078H103.997C103.939 13.023 103.91 13.8204 103.91 14.2998H100.736C100.561 17.6629 100.474 19.6089 100.474 20.1379C100.474 20.6504 100.53 21.0472 100.642 21.3283C100.739 21.5914 100.932 21.8082 101.183 21.9348C101.43 22.0584 101.703 22.1221 101.98 22.1208C102.199 22.12 102.417 22.1034 102.634 22.0712C102.86 22.0409 103.259 21.9514 103.832 21.8026H103.829Z'
            fill='url(#paint0_linear_6508_201016)'
        />
        <path
            d='M27.4805 0.00310297H31.6975C31.79 0.00323174 31.8809 0.0268752 31.9616 0.0717957C32.0423 0.116716 32.1101 0.181433 32.1586 0.259786C32.2072 0.338139 32.2348 0.427537 32.2389 0.519509C32.243 0.611481 32.2235 0.702977 32.1821 0.785312L16.6578 31.7045C16.6126 31.7941 16.5433 31.8694 16.4577 31.9221C16.372 31.9747 16.2733 32.0026 16.1726 32.0026C16.072 32.0026 15.9733 31.9747 15.8876 31.9221C15.802 31.8694 15.7327 31.7941 15.6875 31.7045L13.8665 28.0776C13.8301 28.0038 13.8112 27.9227 13.8112 27.8405C13.8112 27.7583 13.8301 27.6772 13.8665 27.6033L26.9959 0.309987C27.0395 0.218594 27.1081 0.141311 27.1938 0.0870201C27.2795 0.0327292 27.3789 0.0036399 27.4805 0.00310297ZM8.96873 9.87517L4.44248 0.309987C4.39847 0.217607 4.32915 0.139495 4.24249 0.0846487C4.15584 0.0298028 4.05538 0.0004566 3.95271 7.10883e-08H0.542973C0.450433 -4.71978e-05 0.359419 0.0234792 0.278578 0.068327C0.197737 0.113175 0.129754 0.17786 0.0810917 0.256242C0.0324295 0.334623 0.0047029 0.424096 0.000547462 0.516154C-0.00360798 0.608212 0.0159472 0.699796 0.0573512 0.782209L6.67551 13.7965C6.72099 13.8868 6.79099 13.9627 6.87756 14.0154C6.96413 14.0681 7.06381 14.0956 7.16528 14.0947C7.26675 14.0939 7.36594 14.0647 7.4516 14.0105C7.53726 13.9563 7.60595 13.8793 7.64987 13.7882L8.96043 11.0624L9.14098 10.6873C9.17633 10.6147 9.1947 10.535 9.1947 10.4543C9.1947 10.3736 9.17633 10.294 9.14098 10.2213L8.96873 9.87517ZM23.4855 0.00310297H19.2685C19.1659 0.00338504 19.0655 0.0326724 18.979 0.0875498C18.8925 0.142427 18.8234 0.220638 18.7798 0.31309L15.5049 7.26197L12.2166 0.31309C12.1727 0.220634 12.1034 0.142448 12.0167 0.0875877C11.93 0.0327276 11.8295 0.00343674 11.7268 0.00310297H8.31189C8.21935 0.0030557 8.12834 0.0265821 8.0475 0.0714299C7.96666 0.116278 7.89868 0.180963 7.85001 0.259345C7.80135 0.337726 7.77362 0.427186 7.76947 0.519244C7.76531 0.611302 7.78487 0.702899 7.82627 0.785312L13.3954 11.7382L9.7366 19.5003C9.70021 19.5743 9.6813 19.6556 9.6813 19.7379C9.6813 19.8203 9.70021 19.9016 9.7366 19.9756L11.5577 23.6024C11.6028 23.6921 11.6721 23.7674 11.7578 23.8201C11.8434 23.8727 11.9421 23.9006 12.0428 23.9006C12.1435 23.9006 12.2421 23.8727 12.3278 23.8201C12.4135 23.7674 12.4828 23.6921 12.5279 23.6024L23.967 0.787368C24.0087 0.705191 24.0287 0.613765 24.025 0.521754C24.0212 0.429743 23.994 0.340207 23.9457 0.26164C23.8975 0.183073 23.8299 0.118077 23.7494 0.07283C23.6688 0.0275832 23.578 0.00358228 23.4855 0.00310297Z'
            fill='url(#paint1_linear_6508_201016)'
        />
        <defs>
            <linearGradient
                id='paint0_linear_6508_201016'
                x1='44.4574'
                y1='15.9831'
                x2='103.994'
                y2='15.9831'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#FA931D' />
                <stop offset='1' stopColor='#EF5B27' />
            </linearGradient>
            <linearGradient
                id='paint1_linear_6508_201016'
                x1='-0.00594747'
                y1='16.0026'
                x2='32.2402'
                y2='16.0026'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#FA931D' />
                <stop offset='1' stopColor='#EF5B27' />
            </linearGradient>
        </defs>
    </svg>
)
/** @name yakit-logo */
export const YakitLogoSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YakitLogoSvg} {...props} />
}
const GithubSvg = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9.99219 1.49048C5.16211 1.48853 1.25 5.39868 1.25 10.2249C1.25 14.0413 3.69727 17.2854 7.10547 18.4768C7.56445 18.592 7.49414 18.2659 7.49414 18.0432V16.5295C4.84375 16.8401 4.73633 15.0862 4.55859 14.7932C4.19922 14.1799 3.34961 14.0237 3.60352 13.7307C4.20703 13.4202 4.82227 13.8088 5.53516 14.8616C6.05078 15.6252 7.05664 15.4963 7.56641 15.3694C7.67773 14.9104 7.91602 14.5002 8.24414 14.1819C5.49805 13.6897 4.35352 12.0139 4.35352 10.0217C4.35352 9.05493 4.67188 8.16626 5.29688 7.44946C4.89844 6.26782 5.33398 5.2561 5.39258 5.10571C6.52734 5.00415 7.70703 5.91821 7.79883 5.99048C8.44336 5.81665 9.17969 5.72485 10.0039 5.72485C10.832 5.72485 11.5703 5.82056 12.2207 5.99634C12.4414 5.82837 13.5352 5.04321 14.5898 5.13892C14.6465 5.28931 15.0723 6.27759 14.6973 7.4436C15.3301 8.16235 15.6523 9.05884 15.6523 10.0276C15.6523 12.0237 14.5 13.7014 11.7461 14.1858C12.2051 14.6389 12.4902 15.2678 12.4902 15.9631V18.1604C12.5059 18.3362 12.4902 18.51 12.7832 18.51C16.2422 17.344 18.7324 14.0764 18.7324 10.2268C18.7324 5.39868 14.8184 1.49048 9.99219 1.49048Z'
            fill='currentColor'
        />
    </svg>
)
/** @name github图标 */
export const GithubSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={GithubSvg} {...props} />
}
const FolderOpen = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M2 6C2 4.89543 2.89543 4 4 4H8L10 6H14C15.1046 6 16 6.89543 16 8V9H8C6.34315 9 5 10.3431 5 12V13.5C5 14.3284 4.32843 15 3.5 15C2.67157 15 2 14.3284 2 13.5V6Z'
            fill='currentColor'
        />
        <path
            d='M6 12C6 10.8954 6.89543 10 8 10H16C17.1046 10 18 10.8954 18 12V14C18 15.1046 17.1046 16 16 16H2H4C5.10457 16 6 15.1046 6 14V12Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description: folder-open 文件夹
 */
export const FolderOpenIcon = (props: Partial<IconProps>) => {
    return <Icon component={FolderOpen} {...props} />
}

const CloudDownload = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4.66667 10.6666C3.19391 10.6666 2 9.47268 2 7.99992C2 6.72855 2.88971 5.66499 4.08047 5.39789C4.02779 5.16255 4 4.91781 4 4.66659C4 2.82564 5.49238 1.33325 7.33333 1.33325C8.9462 1.33325 10.2915 2.47875 10.6001 4.00057C10.6223 4.00014 10.6444 3.99992 10.6667 3.99992C12.5076 3.99992 14 5.4923 14 7.33325C14 8.94589 12.8548 10.2911 11.3333 10.5999M6 12.6666L8 14.6666M8 14.6666L10 12.6666M8 14.6666V6.66659'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description: folder-open 下载 云
 */
export const CloudDownloadIcon = (props: Partial<IconProps>) => {
    return <Icon component={CloudDownload} {...props} />
}

const Import = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6.6665 2.66675H4.6665C3.56193 2.66675 2.6665 3.56218 2.6665 4.66675V11.3334C2.6665 12.438 3.56194 13.3334 4.66651 13.3334H11.3332C12.4377 13.3334 13.3332 12.438 13.3332 11.3334V8.00008'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M13.3333 2.66675C11.3333 2.66675 8 5.33341 8 8.66675'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M10 8L8 10L6 8' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description: import 导入
 */
export const ImportIcon = (props: Partial<IconProps>) => {
    return <Icon component={Import} {...props} />
}

const CloudPlugin = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3.67173 7.58167L4.2437 7.51952L4.10241 6.96181C4.03557 6.69799 3.9998 6.4204 3.9998 6.13333C3.9998 4.33031 5.40471 2.89999 7.0998 2.89999C8.54228 2.89999 9.77239 3.93308 10.1093 5.3543L10.2145 5.79805L10.6661 5.734C10.824 5.7116 10.9855 5.69999 11.1498 5.69999C13.0934 5.69999 14.6998 7.33925 14.6998 9.39999C14.6998 11.4607 13.0934 13.1 11.1498 13.1H3.9498C2.50323 13.1 1.2998 11.8786 1.2998 10.3333C1.2998 8.88889 2.35349 7.72491 3.67173 7.58167Z'
            fill='url(#paint0_linear_6675_6238)'
            stroke='#31343F'
        />
        <defs>
            <linearGradient
                id='paint0_linear_6675_6238'
                x1='11.1998'
                y1='14'
                x2='5.1998'
                y2='1.99999'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#2A82F8' />
                <stop offset='1' stopColor='#8FBFFF' />
            </linearGradient>
        </defs>
    </svg>
)
/**
 * @description: 云端插件 菜单
 */
export const CloudPluginIcon = (props: Partial<IconProps>) => {
    return <Icon component={CloudPlugin} {...props} />
}

const Cog = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6.88309 2.87821C7.16735 1.70726 8.83265 1.70726 9.11692 2.87821C9.30055 3.63462 10.1672 3.99358 10.8319 3.58857C11.8609 2.96159 13.0384 4.13914 12.4114 5.16812C12.0064 5.83284 12.3654 6.69945 13.1218 6.88308C14.2927 7.16735 14.2927 8.83265 13.1218 9.11692C12.3654 9.30055 12.0064 10.1672 12.4114 10.8319C13.0384 11.8609 11.8609 13.0384 10.8319 12.4114C10.1672 12.0064 9.30055 12.3654 9.11692 13.1218C8.83265 14.2927 7.16735 14.2927 6.88309 13.1218C6.69945 12.3654 5.83284 12.0064 5.16812 12.4114C4.13914 13.0384 2.96159 11.8609 3.58857 10.8319C3.99358 10.1672 3.63462 9.30055 2.87821 9.11692C1.70726 8.83265 1.70726 7.16735 2.87821 6.88308C3.63462 6.69945 3.99358 5.83284 3.58857 5.16812C2.96159 4.13914 4.13914 2.96159 5.16812 3.58857C5.83284 3.99358 6.69945 3.63462 6.88309 2.87821Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6C9.10457 6 10 6.89543 10 8Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description: cog 设置
 */
export const CogIcon = (props: Partial<IconProps>) => {
    return <Icon component={Cog} {...props} />
}

const Quit = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6.66667 3.33333C6.37783 3.47633 6.09956 3.63733 5.83333 3.81486C3.82336 5.15522 2.5 7.43782 2.5 10.0283C2.5 14.1548 5.85786 17.5 10 17.5C14.1421 17.5 17.5 14.1548 17.5 10.0283C17.5 7.43782 16.1766 5.15522 14.1667 3.81486C13.9004 3.63733 13.6222 3.47633 13.3333 3.33333M10 1.66667V8.33333'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description: Quit 退出
 */
export const QuitIcon = (props: Partial<IconProps>) => {
    return <Icon component={Quit} {...props} />
}

const ArrowsExpand = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 8V4M4 4H8M4 4L9 9M20 8V4M20 4H16M20 4L15 9M4 16V20M4 20H8M4 20L9 15M20 20L15 15M20 20V16M20 20H16'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description: arrows-expand 全屏 展开
 */
export const ArrowsExpandIcon = (props: Partial<IconProps>) => {
    return <Icon component={ArrowsExpand} {...props} />
}

const ArrowsRetract = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 5V9M15 9H19M15 9L20 4M9 5V9M9 9H5M9 9L4 4M15 19V15M15 15H19M15 15L20 20M9 19V15M9 15H5M9 15L4 20'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description: arrows-expand 全屏 收起
 */
export const ArrowsRetractIcon = (props: Partial<IconProps>) => {
    return <Icon component={ArrowsRetract} {...props} />
}

const LightningBolt = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.04042 0.83701C9.37344 0.941986 9.5999 1.25082 9.5999 1.6V5.6L12.7999 5.6C13.0982 5.6 13.3717 5.76597 13.5095 6.03055C13.6472 6.29514 13.6264 6.61439 13.4553 6.85877L7.85529 14.8588C7.65505 15.1448 7.29242 15.268 6.95939 15.163C6.62637 15.058 6.39991 14.7492 6.39991 14.4V10.4H3.1999C2.9016 10.4 2.62808 10.234 2.49032 9.96945C2.35256 9.70486 2.37346 9.38561 2.54452 9.14123L8.14452 1.14123C8.34476 0.855174 8.70739 0.732034 9.04042 0.83701Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description:lightning-bolt 闪电 实心
 */
export const LightningBoltIcon = (props: Partial<IconProps>) => {
    return <Icon component={LightningBolt} {...props} />
}

const Play = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M8.00001 14.4C11.5346 14.4 14.4 11.5346 14.4 8C14.4 4.46538 11.5346 1.6 8.00001 1.6C4.46538 1.6 1.60001 4.46538 1.60001 8C1.60001 11.5346 4.46538 14.4 8.00001 14.4ZM7.64377 5.73436C7.39828 5.5707 7.08265 5.55544 6.82252 5.69466C6.56239 5.83388 6.40001 6.10496 6.40001 6.4V9.6C6.40001 9.89504 6.56239 10.1661 6.82252 10.3053C7.08265 10.4446 7.39828 10.4293 7.64377 10.2656L10.0438 8.66564C10.2663 8.51727 10.4 8.26748 10.4 8C10.4 7.73252 10.2663 7.48273 10.0438 7.33436L7.64377 5.73436Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description:play
 */
export const PlayIcon = (props: Partial<IconProps>) => {
    return <Icon component={Play} {...props} />
}
const InformationCircle = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M8 2.5C4.96243 2.5 2.5 4.96243 2.5 8C2.5 11.0376 4.96243 13.5 8 13.5C11.0376 13.5 13.5 11.0376 13.5 8C13.5 4.96243 11.0376 2.5 8 2.5ZM1.5 8C1.5 4.41015 4.41015 1.5 8 1.5C11.5899 1.5 14.5 4.41015 14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8ZM7.5 5.33333C7.5 5.05719 7.72386 4.83333 8 4.83333H8.00667C8.28281 4.83333 8.50667 5.05719 8.50667 5.33333C8.50667 5.60948 8.28281 5.83333 8.00667 5.83333H8C7.72386 5.83333 7.5 5.60948 7.5 5.33333ZM6.83333 8C6.83333 7.72386 7.05719 7.5 7.33333 7.5H8C8.27614 7.5 8.5 7.72386 8.5 8V10.1667H8.66667C8.94281 10.1667 9.16667 10.3905 9.16667 10.6667C9.16667 10.9428 8.94281 11.1667 8.66667 11.1667H8C7.72386 11.1667 7.5 10.9428 7.5 10.6667V8.5H7.33333C7.05719 8.5 6.83333 8.27614 6.83333 8Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description:information-circle
 */
export const InformationCircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={InformationCircle} {...props} />
}

const SolidCloudDownload = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M3.19995 15.2001C3.19995 18.2929 5.70716 20.8001 8.79995 20.8001H14.4V24.9374L12.3313 22.8687C11.7065 22.2439 10.6934 22.2439 10.0686 22.8687C9.44374 23.4936 9.44374 24.5066 10.0686 25.1315L14.8686 29.9315C15.4934 30.5563 16.5065 30.5563 17.1313 29.9315L21.9313 25.1315C22.5562 24.5066 22.5562 23.4936 21.9313 22.8687C21.3065 22.2439 20.2934 22.2439 19.6686 22.8687L17.6 24.9374V20.8001H21.6C25.5764 20.8001 28.8 17.5765 28.8 13.6001C28.8 9.62365 25.5764 6.4001 21.6 6.4001C21.2659 6.4001 20.9371 6.42285 20.6151 6.46689C19.9282 3.6727 17.4061 1.6001 14.4 1.6001C10.8653 1.6001 7.99995 4.46548 7.99995 8.0001C7.99995 8.56366 8.07279 9.11021 8.20958 9.63085C5.39429 9.92582 3.19995 12.3067 3.19995 15.2001ZM17.6 20.8001H14.4V12.8001C14.4 11.9164 15.1163 11.2001 16 11.2001C16.8836 11.2001 17.6 11.9164 17.6 12.8001V20.8001Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description:solid-cloud-download 下载 实心
 */
export const SolidCloudDownloadIcon = (props: Partial<IconProps>) => {
    return <Icon component={SolidCloudDownload} {...props} />
}

const SolidTrash = () => (
    <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M14.3998 3.19995C13.7938 3.19995 13.2397 3.54235 12.9687 4.08441L11.811 6.39995H6.3998C5.51615 6.39995 4.7998 7.1163 4.7998 7.99995C4.7998 8.88361 5.51615 9.59995 6.39981 9.59995L6.3998 25.6C6.3998 27.3673 7.83249 28.7999 9.59981 28.7999H22.3998C24.1671 28.7999 25.5998 27.3673 25.5998 25.6V9.59995C26.4835 9.59995 27.1998 8.88361 27.1998 7.99995C27.1998 7.1163 26.4835 6.39995 25.5998 6.39995H20.1887L19.0309 4.08441C18.7599 3.54235 18.2058 3.19995 17.5998 3.19995H14.3998ZM11.1998 12.8C11.1998 11.9163 11.9161 11.2 12.7998 11.2C13.6835 11.2 14.3998 11.9163 14.3998 12.8V22.4C14.3998 23.2836 13.6835 24 12.7998 24C11.9161 24 11.1998 23.2836 11.1998 22.4V12.8ZM19.1998 11.2C18.3161 11.2 17.5998 11.9163 17.5998 12.8V22.4C17.5998 23.2836 18.3161 24 19.1998 24C20.0835 24 20.7998 23.2836 20.7998 22.4V12.8C20.7998 11.9163 20.0835 11.2 19.1998 11.2Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description:solid-trash 垃圾桶 实心
 */
export const SolidTrashIcon = (props: Partial<IconProps>) => {
    return <Icon component={SolidTrash} {...props} />
}

const Menu = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 6H20M4 12H20M4 18H20'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:menu 菜单
 */
export const MenuIcon = (props: Partial<IconProps>) => {
    return <Icon component={Menu} {...props} />
}

const SolidRefresh = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M4 2C4.55228 2 5 2.44772 5 3V5.10125C6.27009 3.80489 8.04052 3 10 3C13.0494 3 15.641 4.94932 16.6014 7.66675C16.7855 8.18747 16.5126 8.75879 15.9918 8.94284C15.4711 9.12689 14.8998 8.85396 14.7157 8.33325C14.0289 6.38991 12.1755 5 10 5C8.36507 5 6.91204 5.78502 5.99935 7H9C9.55228 7 10 7.44772 10 8C10 8.55228 9.55228 9 9 9H4C3.44772 9 3 8.55228 3 8V3C3 2.44772 3.44772 2 4 2ZM4.00817 11.0572C4.52888 10.8731 5.1002 11.146 5.28425 11.6668C5.97112 13.6101 7.82453 15 10 15C11.6349 15 13.088 14.215 14.0006 13L11 13C10.4477 13 10 12.5523 10 12C10 11.4477 10.4477 11 11 11H16C16.2652 11 16.5196 11.1054 16.7071 11.2929C16.8946 11.4804 17 11.7348 17 12V17C17 17.5523 16.5523 18 16 18C15.4477 18 15 17.5523 15 17V14.8987C13.7299 16.1951 11.9595 17 10 17C6.95059 17 4.35905 15.0507 3.39857 12.3332C3.21452 11.8125 3.48745 11.2412 4.00817 11.0572Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description:  刷新 两个圆弧的箭头 Solid
 */
export const SolidRefreshIcon = (props: Partial<IconProps>) => {
    return <Icon component={SolidRefresh} {...props} />
}

const Share = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5.78925 8.89462C5.9241 8.62543 6 8.32158 6 8C6 7.67842 5.9241 7.37457 5.78925 7.10538M5.78925 8.89462C5.46089 9.55006 4.78299 10 4 10C2.89543 10 2 9.10457 2 8C2 6.89543 2.89543 6 4 6C4.78299 6 5.46089 6.44994 5.78925 7.10538M5.78925 8.89462L10.2108 11.1054M5.78925 7.10538L10.2108 4.89462M10.2108 4.89462C10.5391 5.55006 11.217 6 12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 4.32158 10.0759 4.62543 10.2108 4.89462ZM10.2108 11.1054C10.0759 11.3746 10 11.6784 10 12C10 13.1046 10.8954 14 12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C11.217 10 10.5391 10.4499 10.2108 11.1054Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  分享 share
 */
export const ShareIcon = (props: Partial<IconProps>) => {
    return <Icon component={Share} {...props} />
}

const Clock = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 5.33333V8L10 10M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  历史 clock
 */
export const ClockIcon = (props: Partial<IconProps>) => {
    return <Icon component={Clock} {...props} />
}

const PaperAirplane = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <g clipPath='url(#clip0_8972_1175)'>
            <path
                d='M15.1188 1.89317C15.2146 1.6057 15.1398 1.28877 14.9255 1.0745C14.7112 0.860234 14.3943 0.785417 14.1068 0.881239L2.22745 4.84104C1.92648 4.94136 1.71323 5.21006 1.68387 5.52595C1.65451 5.84184 1.81459 6.14524 2.09192 6.29931L5.72846 8.31961C6.0407 8.49307 6.43009 8.43854 6.68266 8.18597L9.26865 5.59998C9.58107 5.28756 10.0876 5.28756 10.4 5.59998C10.7124 5.9124 10.7124 6.41893 10.4 6.73135L7.81403 9.31734C7.56147 9.56991 7.50693 9.9593 7.68039 10.2715L9.7007 13.9081C9.85478 14.1854 10.1582 14.3455 10.4741 14.3161C10.79 14.2868 11.0587 14.0735 11.159 13.7726L15.1188 1.89317Z'
                fill='currentColor'
            />
        </g>
        <defs>
            <clipPath id='clip0_8972_1175'>
                <rect width='16' height='16' fill='currentColor' />
            </clipPath>
        </defs>
    </svg>
)
/**
 * @description:  历史 paper-airplane
 */
export const PaperAirplaneIcon = (props: Partial<IconProps>) => {
    return <Icon component={PaperAirplane} {...props} />
}

const PlusSm = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 6V12M12 12V18M12 12H18M12 12L6 12'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  plus sm
 */
export const PlusSmIcon = (props: Partial<IconProps>) => {
    return <Icon component={PlusSm} {...props} />
}

const Wrap = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12.5 3.43921V8.43921C12.5 9.54378 11.6046 10.4392 10.5 10.4392H4.5'
            stroke='currentColor'
            strokeLinecap='round'
        />
        <path
            d='M5.62134 8.31789L3.64144 10.2978C3.56333 10.3759 3.56333 10.5025 3.64144 10.5806L5.62134 12.5605'
            stroke='currentColor'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description:  wrap 换行
 */
export const WrapIcon = (props: Partial<IconProps>) => {
    return <Icon component={Wrap} {...props} />
}

const Stop = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM8 7C7.44772 7 7 7.44772 7 8V12C7 12.5523 7.44772 13 8 13H12C12.5523 13 13 12.5523 13 12V8C13 7.44772 12.5523 7 12 7H8Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description:  stop 停止
 */
export const StopIcon = (props: Partial<IconProps>) => {
    return <Icon component={Stop} {...props} />
}
const Exclamation = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10.0003 7.5V9.16667M10.0003 12.5H10.0086M4.22677 15.8333H15.7738C17.0568 15.8333 17.8587 14.4444 17.2172 13.3333L11.4436 3.33333C10.8021 2.22222 9.1984 2.22222 8.5569 3.33333L2.78339 13.3333C2.14189 14.4444 2.94377 15.8333 4.22677 15.8333Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  三角形边框-感叹号
 */
export const ExclamationIcon = (props: Partial<IconProps>) => {
    return <Icon component={Exclamation} {...props} />
}

const ShieldCheck = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7.5 10L9.16667 11.6667L12.5 8.33334M17.1816 4.98695C17.011 4.9956 16.8394 4.99998 16.6667 4.99998C14.1055 4.99998 11.7691 4.03711 9.99994 2.45361C8.23076 4.03705 5.89449 4.99987 3.33333 4.99987C3.16065 4.99987 2.98898 4.9955 2.81844 4.98685C2.61059 5.78986 2.5 6.63202 2.5 7.50001C2.5 12.1596 5.68693 16.0749 10 17.185C14.3131 16.0749 17.5 12.1596 17.5 7.50001C17.5 6.63206 17.3894 5.78993 17.1816 4.98695Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  盾牌-勾
 */
export const ShieldCheckIcon = (props: Partial<IconProps>) => {
    return <Icon component={ShieldCheck} {...props} />
}

const Camera = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M2.5 7.49998C2.5 6.57951 3.24619 5.83331 4.16667 5.83331H4.94136C5.49862 5.83331 6.019 5.55481 6.32811 5.09115L7.00522 4.07548C7.31433 3.61181 7.83472 3.33331 8.39197 3.33331H11.608C12.1653 3.33331 12.6857 3.61181 12.9948 4.07548L13.6719 5.09115C13.981 5.55481 14.5014 5.83331 15.0586 5.83331H15.8333C16.7538 5.83331 17.5 6.57951 17.5 7.49998V15C17.5 15.9205 16.7538 16.6666 15.8333 16.6666H4.16667C3.24619 16.6666 2.5 15.9205 2.5 15V7.49998Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M12.5 10.8333C12.5 12.214 11.3807 13.3333 10 13.3333C8.61929 13.3333 7.5 12.214 7.5 10.8333C7.5 9.4526 8.61929 8.33331 10 8.33331C11.3807 8.33331 12.5 9.4526 12.5 10.8333Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  camera 相机
 */
export const CameraIcon = (props: Partial<IconProps>) => {
    return <Icon component={Camera} {...props} />
}

const CloudUpload = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4.66667 10.6666C3.19391 10.6666 2 9.47274 2 7.99998C2 6.72861 2.88971 5.66505 4.08047 5.39795C4.02779 5.16261 4 4.91787 4 4.66665C4 2.8257 5.49238 1.33331 7.33333 1.33331C8.9462 1.33331 10.2915 2.47881 10.6001 4.00063C10.6223 4.0002 10.6444 3.99998 10.6667 3.99998C12.5076 3.99998 14 5.49236 14 7.33331C14 8.94595 12.8548 10.2911 11.3333 10.6M10 8.66665L8 6.66665M8 6.66665L6 8.66665M8 6.66665L8 14.6666'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  cloud-upload 云 上传
 */
export const CloudUploadIcon = (props: Partial<IconProps>) => {
    return <Icon component={CloudUpload} {...props} />
}

const FastForward = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4.5547 5.16795C4.24784 4.96338 3.8533 4.94431 3.52814 5.11833C3.20298 5.29235 3 5.63121 3 6V14C3 14.3688 3.20298 14.7077 3.52814 14.8817C3.8533 15.0557 4.24784 15.0366 4.5547 14.8321L10 11.2019V14C10 14.3688 10.203 14.7077 10.5281 14.8817C10.8533 15.0557 11.2478 15.0366 11.5547 14.8321L17.5547 10.8321C17.8329 10.6466 18 10.3344 18 10C18 9.66565 17.8329 9.35342 17.5547 9.16795L11.5547 5.16795C11.2478 4.96338 10.8533 4.94431 10.5281 5.11833C10.203 5.29235 10 5.63121 10 6V8.79815L4.5547 5.16795Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description:  fast-forward 前进
 */
export const FastForwardIcon = (props: Partial<IconProps>) => {
    return <Icon component={FastForward} {...props} />
}

const Rewind = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.44518 14.8321C8.75203 15.0367 9.14658 15.0557 9.47174 14.8817C9.79689 14.7077 9.99988 14.3688 9.99988 14L9.99988 11.2019L15.4452 14.8321C15.752 15.0367 16.1466 15.0557 16.4717 14.8817C16.7969 14.7077 16.9999 14.3688 16.9999 14V6.00005C16.9999 5.63125 16.7969 5.29239 16.4717 5.11837C16.1466 4.94435 15.752 4.96343 15.4452 5.168L9.99988 8.7982V6.00005C9.99988 5.63125 9.79689 5.29239 9.47174 5.11837C9.14658 4.94435 8.75203 4.96343 8.44518 5.168L2.44518 9.168C2.16698 9.35346 1.99988 9.66569 1.99988 10C1.99988 10.3344 2.16698 10.6466 2.44518 10.8321L8.44518 14.8321Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description:  rewind 后退
 */
export const RewindIcon = (props: Partial<IconProps>) => {
    return <Icon component={Rewind} {...props} />
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

const SideBarClose = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M9 3V21' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
        <path
            d='M16 15L13 12L16 9'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  边栏关闭
 */
export const SideBarCloseIcon = (props: Partial<IconProps>) => {
    return <Icon component={SideBarClose} {...props} />
}

const SideBarOpen = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M9 3V21' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
        <path
            d='M14 9L17 12L14 15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  边栏打开
 */
export const SideBarOpenIcon = (props: Partial<IconProps>) => {
    return <Icon component={SideBarOpen} {...props} />
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

const HollowLightningBolt = () => (
    <svg width='13' height='13' viewBox='0 0 13 13' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 5.00293V1.50293L2.5 7.00293H6L6 10.5029L10.5 5.00293L7 5.00293Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:lightning-bolt 闪电 空心
 */
export const HollowLightningBoltIcon = (props: Partial<IconProps>) => {
    return <Icon component={HollowLightningBolt} {...props} />
}

const SolidChevronRight = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M5.83429 11.7657C5.52187 11.4533 5.52187 10.9467 5.83429 10.6343L8.4686 8L5.83429 5.36569C5.52187 5.05327 5.52187 4.54673 5.83429 4.23431C6.14671 3.9219 6.65324 3.9219 6.96566 4.23431L10.1657 7.43431C10.4781 7.74673 10.4781 8.25327 10.1657 8.56569L6.96566 11.7657C6.65324 12.0781 6.14671 12.0781 5.83429 11.7657Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description:向右 right Solid
 */
export const SolidChevronRightIcon = (props: Partial<IconProps>) => {
    return <Icon component={SolidChevronRight} {...props} />
}

const SolidChevronDown = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M4.23431 5.83429C4.54673 5.52187 5.05327 5.52187 5.36569 5.83429L8 8.4686L10.6343 5.83429C10.9467 5.52187 11.4533 5.52187 11.7657 5.83429C12.0781 6.14671 12.0781 6.65324 11.7657 6.96566L8.56569 10.1657C8.25327 10.4781 7.74673 10.4781 7.43431 10.1657L4.23431 6.96566C3.9219 6.65324 3.9219 6.14671 4.23431 5.83429Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description:向下 down Solid
 */
export const SolidChevronDownIcon = (props: Partial<IconProps>) => {
    return <Icon component={SolidChevronDown} {...props} />
}

const Eye = () => (
    <svg width='13' height='13' viewBox='0 0 13 13' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 6.00293C8 6.83136 7.32843 7.50293 6.5 7.50293C5.67157 7.50293 5 6.83136 5 6.00293C5 5.1745 5.67157 4.50293 6.5 4.50293C7.32843 4.50293 8 5.1745 8 6.00293Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M1.72913 6.00291C2.36626 3.97437 4.2614 2.50293 6.50022 2.50293C8.73905 2.50293 10.6342 3.97439 11.2713 6.00295C10.6342 8.03149 8.73904 9.50293 6.50023 9.50293C4.2614 9.50293 2.36625 8.03148 1.72913 6.00291Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:eye 眼睛
 */
export const EyeIcon = (props: Partial<IconProps>) => {
    return <Icon component={Eye} {...props} />
}

const SwitchHorizontal = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5.33325 4.66667L13.3333 4.66667M13.3333 4.66667L10.6666 2M13.3333 4.66667L10.6666 7.33333M10.6666 11.3333L2.66659 11.3333M2.66659 11.3333L5.33325 14M2.66659 11.3333L5.33325 8.66667'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  盾牌-勾
 */
export const SwitchHorizontalIcon = (props: Partial<IconProps>) => {
    return <Icon component={SwitchHorizontal} {...props} />
}

const ArrowNarrowRight = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11.3333 5.3335L14 8.00016M14 8.00016L11.3333 10.6668M14 8.00016L2 8.00016'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  右箭头
 */
export const ArrowNarrowRightIcon = (props: Partial<IconProps>) => {
    return <Icon component={ArrowNarrowRight} {...props} />
}

const SMViewGridAdd = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M14.1666 11.6668V16.6668M11.6666 14.1668H16.6666M4.99992 8.3335H6.66659C7.58706 8.3335 8.33325 7.5873 8.33325 6.66683V5.00016C8.33325 4.07969 7.58706 3.3335 6.66659 3.3335H4.99992C4.07944 3.3335 3.33325 4.07969 3.33325 5.00016V6.66683C3.33325 7.5873 4.07944 8.3335 4.99992 8.3335ZM13.3333 8.3335H14.9999C15.9204 8.3335 16.6666 7.5873 16.6666 6.66683V5.00016C16.6666 4.07969 15.9204 3.3335 14.9999 3.3335H13.3333C12.4128 3.3335 11.6666 4.07969 11.6666 5.00016V6.66683C11.6666 7.5873 12.4128 8.3335 13.3333 8.3335ZM4.99992 16.6668H6.66659C7.58706 16.6668 8.33325 15.9206 8.33325 15.0002V13.3335C8.33325 12.413 7.58706 11.6668 6.66659 11.6668H4.99992C4.07944 11.6668 3.33325 12.413 3.33325 13.3335V15.0002C3.33325 15.9206 4.07944 16.6668 4.99992 16.6668Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  sm-view-grid-add
 */
export const SMViewGridAddIcon = (props: Partial<IconProps>) => {
    return <Icon component={SMViewGridAdd} {...props} />
}

const IconSolidTag = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M14.1657 7.43441C14.4781 7.74683 14.4781 8.25336 14.1657 8.56578L8.56566 14.1658C8.25324 14.4782 7.74671 14.4782 7.43429 14.1658L1.83429 8.56578C1.67806 8.40955 1.59995 8.20477 1.59998 8V4.0001C1.59998 2.67461 2.67449 1.6001 3.99998 1.6001H8.00019C8.20486 1.60015 8.40951 1.67826 8.56566 1.83441L14.1657 7.43441ZM3.99998 4.8001C4.4418 4.8001 4.79998 4.44193 4.79998 4.0001C4.79998 3.55827 4.4418 3.2001 3.99998 3.2001C3.55815 3.2001 3.19998 3.55827 3.19998 4.0001C3.19998 4.44193 3.55815 4.8001 3.99998 4.8001Z'
            fill='url(#paint0_linear_15674_1492)'
        />
        <defs>
            <linearGradient
                id='paint0_linear_15674_1492'
                x1='4.79997'
                y1='1.6001'
                x2='11.0736'
                y2='15.0963'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#63DDA1' />
                <stop offset='1' stopColor='#35BC7A' />
            </linearGradient>
        </defs>
    </svg>
)
/**
 * @description  Icon/Solid/tag
 */
export const IconSolidTagIcon = (props: Partial<IconProps>) => {
    return <Icon component={IconSolidTag} {...props} />
}

const IconSolidCode = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.85303 2.44117C10.2722 2.58089 10.4987 3.03395 10.359 3.4531L7.159 13.0531C7.01928 13.4723 6.56622 13.6988 6.14707 13.5591C5.72791 13.4193 5.50138 12.9663 5.6411 12.5471L8.8411 2.94714C8.98082 2.52798 9.43388 2.30145 9.85303 2.44117ZM4.56573 5.03443C4.87815 5.34685 4.87815 5.85338 4.56573 6.1658L2.73142 8.00012L4.56573 9.83443C4.87815 10.1469 4.87815 10.6534 4.56573 10.9658C4.25331 11.2782 3.74678 11.2782 3.43436 10.9658L1.03436 8.5658C0.721944 8.25339 0.721944 7.74685 1.03436 7.43443L3.43436 5.03443C3.74678 4.72201 4.25331 4.72201 4.56573 5.03443ZM11.4344 5.03443C11.7468 4.72201 12.2533 4.72201 12.5657 5.03443L14.9657 7.43443C15.2782 7.74685 15.2782 8.25339 14.9657 8.5658L12.5657 10.9658C12.2533 11.2782 11.7468 11.2782 11.4344 10.9658C11.1219 10.6534 11.1219 10.1469 11.4344 9.83443L13.2687 8.00012L11.4344 6.1658C11.1219 5.85338 11.1219 5.34685 11.4344 5.03443Z'
            fill='url(#paint0_linear_15685_3932)'
        />
        <defs>
            <linearGradient
                id='paint0_linear_15685_3932'
                x1='0.687576'
                y1='2.15371'
                x2='16.1287'
                y2='11.933'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#DA5FDD' />
                <stop offset='1' stopColor='#8863F7' />
            </linearGradient>
        </defs>
    </svg>
)
/**
 * @description  Icon/Solid/code
 */
export const IconSolidCodeIcon = (props: Partial<IconProps>) => {
    return <Icon component={IconSolidCode} {...props} />
}

const IconSolidSparkles = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M4.0001 1.6001C4.44193 1.6001 4.8001 1.95827 4.8001 2.4001V3.2001H5.6001C6.04192 3.2001 6.4001 3.55827 6.4001 4.0001C6.4001 4.44193 6.04192 4.8001 5.6001 4.8001H4.8001V5.6001C4.8001 6.04192 4.44193 6.4001 4.0001 6.4001C3.55827 6.4001 3.2001 6.04192 3.2001 5.6001V4.8001H2.4001C1.95827 4.8001 1.6001 4.44193 1.6001 4.0001C1.6001 3.55827 1.95827 3.2001 2.4001 3.2001H3.2001V2.4001C3.2001 1.95827 3.55827 1.6001 4.0001 1.6001ZM4.0001 9.6001C4.44193 9.6001 4.8001 9.95827 4.8001 10.4001V11.2001H5.6001C6.04192 11.2001 6.4001 11.5583 6.4001 12.0001C6.4001 12.4419 6.04192 12.8001 5.6001 12.8001H4.8001V13.6001C4.8001 14.0419 4.44193 14.4001 4.0001 14.4001C3.55827 14.4001 3.2001 14.0419 3.2001 13.6001V12.8001H2.4001C1.95827 12.8001 1.6001 12.4419 1.6001 12.0001C1.6001 11.5583 1.95827 11.2001 2.4001 11.2001H3.2001V10.4001C3.2001 9.95827 3.55827 9.6001 4.0001 9.6001Z'
            fill='url(#paint0_linear_15685_3942)'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.60006 1.6001C9.96304 1.6001 10.2805 1.84448 10.3734 2.19538L11.3168 5.75924L13.9998 7.30715C14.2475 7.45002 14.4001 7.71419 14.4001 8.0001C14.4001 8.286 14.2475 8.55017 13.9998 8.69305L11.3168 10.241L10.3734 13.8048C10.2805 14.1557 9.96304 14.4001 9.60006 14.4001C9.23707 14.4001 8.91958 14.1557 8.82669 13.8048L7.88332 10.241L5.20032 8.69304C4.95267 8.55017 4.8001 8.286 4.8001 8.0001C4.8001 7.71419 4.95267 7.45002 5.20032 7.30715L7.88332 5.75924L8.82669 2.19538C8.91958 1.84448 9.23707 1.6001 9.60006 1.6001Z'
            fill='url(#paint1_linear_15685_3942)'
        />
        <defs>
            <linearGradient
                id='paint0_linear_15685_3942'
                x1='10.8445'
                y1='14.8572'
                x2='3.04667'
                y2='2.7273'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#2A82F8' />
                <stop offset='1' stopColor='#8FBFFF' />
            </linearGradient>
            <linearGradient
                id='paint1_linear_15685_3942'
                x1='10.8445'
                y1='14.8572'
                x2='3.04667'
                y2='2.7273'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#2A82F8' />
                <stop offset='1' stopColor='#8FBFFF' />
            </linearGradient>
        </defs>
    </svg>
)

/**
 * @description  Icon/Solid/ai
 */
export const IconSolidAIIcon = (props: Partial<IconProps>) => {
    return <Icon component={IconSolidAI} {...props} />
}

const IconSolidAI = () => (
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
  <path fillRule="evenodd" clipRule="evenodd" d="M2.59998 0.600098C1.49541 0.600098 0.599976 1.49553 0.599976 2.6001V11.4001C0.599976 12.5047 1.49541 13.4001 2.59998 13.4001H11.4C12.5045 13.4001 13.4 12.5047 13.4 11.4001V2.6001C13.4 1.49553 12.5045 0.600098 11.4 0.600098H2.59998ZM7.34563 9.11923H4.36744L3.80528 10.9661C3.78424 11.0351 3.74499 11.0948 3.69298 11.1371C3.64096 11.1794 3.57875 11.2021 3.51499 11.202H2.50741C2.45785 11.2019 2.40905 11.188 2.36517 11.1616C2.32129 11.1352 2.28363 11.0971 2.25541 11.0504C2.22719 11.0037 2.20925 10.9498 2.20312 10.8935C2.19698 10.8371 2.20284 10.7798 2.22019 10.7266L4.65159 3.26004C4.69509 3.12549 4.77341 3.00938 4.87608 2.92726C4.97874 2.84513 5.10084 2.80092 5.22603 2.80054H6.52697C6.65261 2.8007 6.77518 2.845 6.87816 2.92748C6.98115 3.00995 7.05961 3.12664 7.10295 3.26181L9.51438 10.7266C9.53173 10.7798 9.53759 10.8371 9.53146 10.8935C9.52532 10.9498 9.50738 11.0037 9.47916 11.0504C9.45095 11.0971 9.41329 11.1352 9.3694 11.1616C9.32552 11.188 9.27672 11.2019 9.22716 11.202H8.18733C8.12338 11.2019 8.06104 11.179 8.009 11.1364C7.95696 11.0938 7.91782 11.0336 7.89704 10.9643L7.34563 9.11923ZM6.88485 7.59457L5.9341 4.41146H5.80815L4.83591 7.59457H6.88485ZM10.502 2.80054H11.4927C11.5742 2.80054 11.6523 2.83763 11.7099 2.90367C11.7676 2.9697 11.7999 3.05927 11.7999 3.15265V10.8499C11.7999 10.9433 11.7676 11.0328 11.7099 11.0989C11.6523 11.1649 11.5742 11.202 11.4927 11.202H10.502C10.4206 11.202 10.3424 11.1649 10.2848 11.0989C10.2272 11.0328 10.1948 10.9433 10.1948 10.8499V3.15265C10.1948 3.05927 10.2272 2.9697 10.2848 2.90367C10.3424 2.83763 10.4206 2.80054 10.502 2.80054Z" fill="url(#paint0_linear_32108_18432)"/>
  <defs>
    <linearGradient id="paint0_linear_32108_18432" x1="1.63998" y1="0.600089" x2="15.5209" y2="12.0032" gradientUnits="userSpaceOnUse">
      <stop offset="0.083042" stopColor="#FFB263"/>
      <stop offset="0.498498" stopColor="#D084FF"/>
      <stop offset="1" stopColor="#45A6FF"/>
    </linearGradient>
  </defs>
</svg>
)

/**
 * @description  Icon/Solid/ai-white
 */
export const IconSolidAIWhiteIcon = (props: Partial<IconProps>) => {
    return <Icon component={IconSolidAIWhite} {...props} />
}

const IconSolidAIWhite = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
  <path fillRule="evenodd" clipRule="evenodd" d="M2.59998 0.600098C1.49541 0.600098 0.599976 1.49553 0.599976 2.6001V11.4001C0.599976 12.5047 1.49541 13.4001 2.59998 13.4001H11.4C12.5045 13.4001 13.4 12.5047 13.4 11.4001V2.6001C13.4 1.49553 12.5045 0.600098 11.4 0.600098H2.59998ZM7.34563 9.11923H4.36744L3.80528 10.9661C3.78424 11.0351 3.74499 11.0948 3.69298 11.1371C3.64096 11.1794 3.57875 11.2021 3.51499 11.202H2.50741C2.45785 11.2019 2.40905 11.188 2.36517 11.1616C2.32129 11.1352 2.28363 11.0971 2.25541 11.0504C2.22719 11.0037 2.20925 10.9498 2.20312 10.8935C2.19698 10.8371 2.20284 10.7798 2.22019 10.7266L4.65159 3.26004C4.69509 3.12549 4.77341 3.00938 4.87608 2.92726C4.97874 2.84513 5.10084 2.80092 5.22603 2.80054H6.52697C6.65261 2.8007 6.77518 2.845 6.87816 2.92748C6.98115 3.00995 7.05961 3.12664 7.10295 3.26181L9.51438 10.7266C9.53173 10.7798 9.53759 10.8371 9.53146 10.8935C9.52532 10.9498 9.50738 11.0037 9.47916 11.0504C9.45095 11.0971 9.41329 11.1352 9.3694 11.1616C9.32552 11.188 9.27672 11.2019 9.22716 11.202H8.18733C8.12338 11.2019 8.06104 11.179 8.009 11.1364C7.95696 11.0938 7.91782 11.0336 7.89704 10.9643L7.34563 9.11923ZM6.88485 7.59457L5.9341 4.41146H5.80815L4.83591 7.59457H6.88485ZM10.502 2.80054H11.4927C11.5742 2.80054 11.6523 2.83763 11.7099 2.90367C11.7676 2.9697 11.7999 3.05927 11.7999 3.15265V10.8499C11.7999 10.9433 11.7676 11.0328 11.7099 11.0989C11.6523 11.1649 11.5742 11.202 11.4927 11.202H10.502C10.4206 11.202 10.3424 11.1649 10.2848 11.0989C10.2272 11.0328 10.1948 10.9433 10.1948 10.8499V3.15265C10.1948 3.05927 10.2272 2.9697 10.2848 2.90367C10.3424 2.83763 10.4206 2.80054 10.502 2.80054Z" fill="#FFFFFF"/>
  <defs>
    <linearGradient id="paint0_linear_32108_18432" x1="1.63998" y1="0.600089" x2="15.5209" y2="12.0032" gradientUnits="userSpaceOnUse">
      <stop offset="0.083042" stopColor="#FFB263"/>
      <stop offset="0.498498" stopColor="#D084FF"/>
      <stop offset="1" stopColor="#45A6FF"/>
    </linearGradient>
  </defs>
</svg>
    )

/**
 * @description  Icon/Solid/sparkles
 */
export const IconSolidSparklesIcon = (props: Partial<IconProps>) => {
    return <Icon component={IconSolidSparkles} {...props} />
}

const ThumbUp = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9.33333 6.66667H12.5093C13.5005 6.66667 14.1451 7.70975 13.7019 8.59629L11.3685 13.263C11.1427 13.7147 10.681 14 10.176 14L7.49747 14C7.38846 14 7.27985 13.9866 7.17409 13.9602L4.66667 13.3333M9.33333 6.66667V3.33333C9.33333 2.59695 8.73638 2 8 2H7.93635C7.60331 2 7.33333 2.26998 7.33333 2.60302C7.33333 3.07922 7.19238 3.54477 6.92823 3.94099L4.66667 7.33333L4.66667 13.3333M9.33333 6.66667H8M4.66667 13.3333H3.33333C2.59695 13.3333 2 12.7364 2 12L2 8C2 7.26362 2.59695 6.66667 3.33333 6.66667H5'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  thumb-up
 */
export const ThumbUpIcon = (props: Partial<IconProps>) => {
    return <Icon component={ThumbUp} {...props} />
}

const ThumbDown = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6.66665 9.33333H3.49069C2.49952 9.33333 1.85486 8.29025 2.29812 7.40371L4.63146 2.73705C4.85731 2.28534 5.319 2 5.82403 2L8.50251 2C8.61152 2 8.72013 2.01337 8.82589 2.03981L11.3333 2.66667M6.66665 9.33333V12.6667C6.66665 13.403 7.2636 14 7.99998 14H8.06363C8.39667 14 8.66665 13.73 8.66665 13.397C8.66665 12.9208 8.8076 12.4552 9.07175 12.059L11.3333 8.66667V2.66667M6.66665 9.33333H7.99998M11.3333 2.66667L12.6666 2.66667C13.403 2.66667 14 3.26362 14 4V8C14 8.73638 13.403 9.33333 12.6666 9.33333H11'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  thumb-down
 */
export const ThumbDownIcon = (props: Partial<IconProps>) => {
    return <Icon component={ThumbDown} {...props} />
}

const ClipboardList = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7.49999 4.16667H5.83332C4.91285 4.16667 4.16666 4.91286 4.16666 5.83333V15.8333C4.16666 16.7538 4.91285 17.5 5.83332 17.5H14.1667C15.0871 17.5 15.8333 16.7538 15.8333 15.8333V5.83333C15.8333 4.91286 15.0871 4.16667 14.1667 4.16667H12.5M7.49999 4.16667C7.49999 5.08714 8.24618 5.83333 9.16666 5.83333H10.8333C11.7538 5.83333 12.5 5.08714 12.5 4.16667M7.49999 4.16667C7.49999 3.24619 8.24618 2.5 9.16666 2.5H10.8333C11.7538 2.5 12.5 3.24619 12.5 4.16667M9.99999 10H12.5M9.99999 13.3333H12.5M7.49999 10H7.50832M7.49999 13.3333H7.50832'
            stroke='currentColor'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  clipboard-list
 */
export const ClipboardListIcon = (props: Partial<IconProps>) => {
    return <Icon component={ClipboardList} {...props} />
}

const PaperPlaneRight = () => (
    <svg width='21' height='21' viewBox='0 0 21 21' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M18.013 9.40626L4.84898 2.03907C4.62964 1.91116 4.37707 1.85175 4.12371 1.86845C3.87034 1.88516 3.62776 1.97722 3.42711 2.13282C3.22219 2.2945 3.07341 2.51662 3.00189 2.76765C2.93037 3.01868 2.93974 3.28586 3.02867 3.53126L5.22398 9.66407C5.24619 9.72522 5.28649 9.77816 5.33953 9.81584C5.39256 9.85352 5.45581 9.87416 5.52086 9.87501H11.1615C11.3237 9.87244 11.4808 9.93149 11.6011 10.0402C11.7215 10.149 11.7961 10.2993 11.8099 10.4609C11.8153 10.5463 11.8031 10.6317 11.774 10.7121C11.745 10.7925 11.6998 10.8661 11.6413 10.9284C11.5827 10.9906 11.512 11.0402 11.4335 11.074C11.355 11.1078 11.2704 11.1252 11.1849 11.125H5.52086C5.45581 11.1259 5.39256 11.1465 5.33953 11.1842C5.28649 11.2219 5.24619 11.2748 5.22398 11.3359L3.02867 17.4688C2.9628 17.6577 2.94295 17.8596 2.97078 18.0578C2.9986 18.2559 3.07329 18.4445 3.18864 18.608C3.304 18.7715 3.45669 18.9051 3.63404 18.9977C3.81139 19.0904 4.00828 19.1394 4.20836 19.1406C4.42127 19.1397 4.63063 19.086 4.81773 18.9844L18.013 11.5938C18.2064 11.484 18.3671 11.3249 18.479 11.1328C18.5908 10.9407 18.6497 10.7223 18.6497 10.5C18.6497 10.2777 18.5908 10.0594 18.479 9.86723C18.3671 9.6751 18.2064 9.51604 18.013 9.40626Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description  paper-plane-right
 */
export const PaperPlaneRightIcon = (props: Partial<IconProps>) => {
    return <Icon component={PaperPlaneRight} {...props} />
}

const ArrowDown = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15.8333 11.6667L9.99996 17.5M9.99996 17.5L4.16663 11.6667M9.99996 17.5L9.99996 2.5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  arrow-down
 */
export const ArrowDownIcon = (props: Partial<IconProps>) => {
    return <Icon component={ArrowDown} {...props} />
}

const SolidThumbDown = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M18 9.5C18 10.3284 17.3285 11 16.5 11C15.6716 11 15 10.3284 15 9.5V3.5C15 2.67157 15.6716 2 16.5 2C17.3285 2 18 2.67157 18 3.5V9.5Z'
            fill='currentColor'
        />
        <path
            d='M14 9.66667V4.23607C14 3.47852 13.572 2.786 12.8945 2.44721L12.8446 2.42229C12.2892 2.14458 11.6767 2 11.0558 2L5.63964 2C4.68628 2 3.86545 2.67292 3.67848 3.60777L2.47848 9.60777C2.23097 10.8453 3.17755 12 4.43964 12H8.00004V16C8.00004 17.1046 8.89547 18 10 18C10.5523 18 11 17.5523 11 17V16.3333C11 15.4679 11.2807 14.6257 11.8 13.9333L13.2 12.0667C13.7193 11.3743 14 10.5321 14 9.66667Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description  solid-thumb-down
 */
export const SolidThumbDownIcon = (props: Partial<IconProps>) => {
    return <Icon component={SolidThumbDown} {...props} />
}

const Polygon = () => (
    <svg width='10' height='20' viewBox='0 0 10 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.58579 8.58579C9.36684 9.36684 9.36683 10.6332 8.58579 11.4142L-1.8279e-06 20L-9.53674e-07 -4.37114e-07L8.58579 8.58579Z'
            fill='#F05D28'
        />
    </svg>
)
/**
 * @description  polygon
 */
export const PolygonIcon = (props: Partial<IconProps>) => {
    return <Icon component={Polygon} {...props} />
}

const IconOutlinePencilAlt = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            d='M7.33329 3.33334H3.99996C3.26358 3.33334 2.66663 3.93029 2.66663 4.66667V12C2.66663 12.7364 3.26358 13.3333 3.99996 13.3333H11.3333C12.0697 13.3333 12.6666 12.7364 12.6666 12V8.66667M11.7238 2.39052C12.2445 1.86983 13.0887 1.86983 13.6094 2.39052C14.1301 2.91122 14.1301 3.75544 13.6094 4.27614L7.88557 10H5.99996L5.99996 8.11438L11.7238 2.39052Z'
            stroke='#85899E'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description  Icon/Outline/pencil-alt
 */
export const IconOutlinePencilAltIcon = (props: Partial<IconProps>) => {
    return <Icon component={IconOutlinePencilAlt} {...props} />
}

const SolidDocumentText = () => (
    <svg width='17' height='16' viewBox='0 0 17 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M3.43066 3.2001C3.43066 2.31644 4.14701 1.6001 5.03066 1.6001H8.69929C9.12364 1.6001 9.53061 1.76867 9.83066 2.06873L12.562 4.8001C12.8621 5.10016 13.0307 5.50712 13.0307 5.93147V12.8001C13.0307 13.6838 12.3143 14.4001 11.4307 14.4001H5.03066C4.14701 14.4001 3.43066 13.6838 3.43066 12.8001V3.2001ZM5.03066 8.0001C5.03066 7.55827 5.38884 7.2001 5.83066 7.2001H10.6307C11.0725 7.2001 11.4307 7.55827 11.4307 8.0001C11.4307 8.44193 11.0725 8.8001 10.6307 8.8001H5.83066C5.38884 8.8001 5.03066 8.44193 5.03066 8.0001ZM5.83066 10.4001C5.38884 10.4001 5.03066 10.7583 5.03066 11.2001C5.03066 11.6419 5.38884 12.0001 5.83066 12.0001H10.6307C11.0725 12.0001 11.4307 11.6419 11.4307 11.2001C11.4307 10.7583 11.0725 10.4001 10.6307 10.4001H5.83066Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description  Solid/document-text
 */
export const SolidDocumentTextIcon = (props: Partial<IconProps>) => {
    return <Icon component={SolidDocumentText} {...props} />
}

const OutlinePlus = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.00014 2.66675V13.3334M13.3335 8.00008L2.66681 8.00008'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/*
 * @description  Outline/plus
 */
export const OutlinePlusIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePlus} {...props} />
}
