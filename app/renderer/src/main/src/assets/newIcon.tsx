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
export const HomeSvgIcon = (props: Partial<CustomIconComponentProps>) => {
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
export const ChromeSvgIcon = (props: Partial<CustomIconComponentProps>) => {
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
export const ChromeFrameSvgIcon = (props: Partial<CustomIconComponentProps>) => {
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
export const ArrowCircleRightSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={ArrowCircleRightSvg} {...props} />
}
