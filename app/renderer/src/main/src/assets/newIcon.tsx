import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: () => void
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
        <path d='M8 4V8M8 8V12M8 8H12M8 8L4 8' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
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
 * @description:向左 left
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
