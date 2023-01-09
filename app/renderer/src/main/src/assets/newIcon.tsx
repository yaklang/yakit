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
