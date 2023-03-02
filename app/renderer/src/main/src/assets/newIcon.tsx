import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
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
    <svg width='41' height='40' viewBox='0 0 41 40' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <circle cx='20.5' cy='20' r='20' fill='currentColor' fill-opacity='0.2' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M20.4999 8.49207C17.5217 11.1576 13.6061 12.7973 9.30859 12.8556C9.15252 13.7852 9.07129 14.7403 9.07129 15.7143C9.07129 23.1784 13.8416 29.5283 20.4999 31.8817C27.1581 29.5283 31.9284 23.1784 31.9284 15.7143C31.9284 14.7403 31.8472 13.7852 31.6911 12.8556C27.3936 12.7973 23.478 11.1576 20.4999 8.49207ZM21.9284 25.7143C21.9284 26.5032 21.2888 27.1428 20.4999 27.1428C19.7109 27.1428 19.0713 26.5032 19.0713 25.7143C19.0713 24.9253 19.7109 24.2857 20.4999 24.2857C21.2888 24.2857 21.9284 24.9253 21.9284 25.7143ZM21.9284 15.7143C21.9284 14.9253 21.2888 14.2857 20.4999 14.2857C19.7109 14.2857 19.0713 14.9253 19.0713 15.7143V20C19.0713 20.789 19.7109 21.4286 20.4999 21.4286C21.2888 21.4286 21.9284 20.789 21.9284 20V15.7143Z'
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

// 首页图标
const HomeSvg = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.56569 1.83432C8.25327 1.5219 7.74673 1.5219 7.43431 1.83432L1.83431 7.43432C1.5219 7.74674 1.5219 8.25327 1.83431 8.56569C2.14673 8.87811 2.65327 8.87811 2.96569 8.56569L3.2 8.33138L3.2 13.6C3.2 14.0418 3.55817 14.4 4 14.4H5.6C6.04183 14.4 6.4 14.0418 6.4 13.6V12C6.4 11.5582 6.75817 11.2 7.2 11.2H8.8C9.24183 11.2 9.6 11.5582 9.6 12V13.6C9.6 14.0418 9.95817 14.4 10.4 14.4H12C12.4418 14.4 12.8 14.0418 12.8 13.6V8.33138L13.0343 8.56569C13.3467 8.87811 13.8533 8.87811 14.1657 8.56569C14.4781 8.25327 14.4781 7.74674 14.1657 7.43432L8.56569 1.83432Z'
            fill='currentColor'
        />
    </svg>
)
export const HomeSvgIcon = (props: Partial<IconProps>) => {
    return <Icon component={HomeSvg} {...props} />
}

const ChromeSvg = () => (
    <svg
        className='icon'
        viewBox='0 0 1024 1024'
        version='1.1'
        xmlns='http://www.w3.org/2000/svg'
        p-id='1473'
        width='14'
        height='14'
    >
        <path
            d='M123.648 178.346667C361.642667-98.602667 802.986667-43.946667 967.936 279.68h-396.501333c-71.424 0-117.546667-1.621333-167.509334 24.661333-58.709333 30.933333-102.997333 88.234667-118.485333 155.52L123.648 178.389333z'
            fill='#EA4335'
            p-id='1474'
        ></path>
        <path
            d='M341.674667 512c0 93.866667 76.330667 170.24 170.154666 170.24 93.866667 0 170.154667-76.373333 170.154667-170.24s-76.330667-170.24-170.154667-170.24c-93.866667 0-170.154667 76.373333-170.154666 170.24z'
            fill='#4285F4'
            p-id='1475'
        ></path>
        <path
            d='M577.877333 734.848c-95.530667 28.373333-207.274667-3.114667-268.501333-108.8-46.762667-80.64-170.24-295.765333-226.346667-393.557333-196.565333 301.226667-27.136 711.808 329.685334 781.866666l165.12-279.509333z'
            fill='#34A853'
            p-id='1476'
        ></path>
        <path
            d='M669.866667 341.76a233.130667 233.130667 0 0 1 43.008 286.634667c-40.576 69.973333-170.154667 288.682667-232.96 394.581333 367.658667 22.656 635.733333-337.664 514.645333-681.258667H669.866667z'
            fill='#FBBC05'
            p-id='1477'
        ></path>
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
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M2.66675 5.33333V2.66667M2.66675 2.66667H5.33341M2.66675 2.66667L6.00008 6M13.3334 5.33333V2.66667M13.3334 2.66667H10.6667M13.3334 2.66667L10.0001 6M2.66675 10.6667V13.3333M2.66675 13.3333H5.33341M2.66675 13.3333L6.00008 10M13.3334 13.3333L10.0001 10M13.3334 13.3333V10.6667M13.3334 13.3333H10.6667'
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
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M2.66675 5.33333V2.66667M2.66675 2.66667H5.33341M2.66675 2.66667L6.00008 6M13.3334 5.33333V2.66667M13.3334 2.66667H10.6667M13.3334 2.66667L10.0001 6M2.66675 10.6667V13.3333M2.66675 13.3333H5.33341M2.66675 13.3333L6.00008 10M13.3334 13.3333L10.0001 10M13.3334 13.3333V10.6667M13.3334 13.3333H10.6667'
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
