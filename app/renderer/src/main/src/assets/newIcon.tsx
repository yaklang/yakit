import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

// 实心的选择圆形
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

export const CheckCircleIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={CheckCircle} {...props} />
}

// 刷新 两个圆弧的箭头
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

export const RefreshIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={Refresh} {...props} />
}

// 筛选
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

export const FilterIcon = (props: Partial<CustomIconComponentProps>) => {
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

export const SearchIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={Search} {...props} />
}

// 屏蔽
const StatusOffline = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'>
        <path
            d='M9.53553 2.46447C9.34027 2.26921 9.02369 2.26921 8.82843 2.46447C8.63316 2.65973 8.63316 2.97631 8.82843 3.17158L9.53553 2.46447ZM9.18198 9.18198L8.82843 9.53554H8.82843L9.18198 9.18198ZM8.12132 3.87868C7.92606 3.68342 7.60948 3.68342 7.41421 3.87868C7.21895 4.07395 7.21895 4.39053 7.41421 4.58579L8.12132 3.87868ZM7.76777 7.76777L7.41421 8.12132L7.41421 8.12133L7.76777 7.76777ZM3.87868 8.12133C4.07394 8.31659 4.39052 8.31659 4.58579 8.12133C4.78105 7.92606 4.78105 7.60948 4.58579 7.41422L3.87868 8.12133ZM4.01999 6.28309C3.98117 6.00969 3.72806 5.81953 3.45466 5.85835C3.18126 5.89717 2.9911 6.15027 3.02992 6.42367L4.01999 6.28309ZM2.46447 9.53554C2.65973 9.7308 2.97631 9.7308 3.17157 9.53554C3.36683 9.34028 3.36683 9.02369 3.17157 8.82843L2.46447 9.53554ZM2.20852 4.72226C2.29648 4.4605 2.15559 4.177 1.89383 4.08904C1.63207 4.00107 1.34857 4.14196 1.26061 4.40372L2.20852 4.72226ZM1.85355 1.14645C1.65829 0.951184 1.34171 0.951184 1.14645 1.14645C0.951184 1.34171 0.951184 1.65829 1.14645 1.85355L1.85355 1.14645ZM10.1464 10.8536C10.3417 11.0488 10.6583 11.0488 10.8536 10.8536C11.0488 10.6583 11.0488 10.3417 10.8536 10.1464L10.1464 10.8536ZM8.82843 3.17158C10.3905 4.73367 10.3905 7.26633 8.82843 8.82843L9.53553 9.53554C11.4882 7.58292 11.4882 4.41709 9.53553 2.46447L8.82843 3.17158ZM7.41421 4.58579C8.19526 5.36684 8.19526 6.63317 7.41421 7.41422L8.12132 8.12133C9.29289 6.94975 9.29289 5.05026 8.12132 3.87868L7.41421 4.58579ZM6 6H7C7 5.44772 6.55228 5 6 5V6ZM4.58579 7.41422C4.26695 7.09538 4.07876 6.69702 4.01999 6.28309L3.02992 6.42367C3.1181 7.04471 3.40144 7.64408 3.87868 8.12133L4.58579 7.41422ZM3.17157 8.82843C2.06155 7.71841 1.73959 6.11769 2.20852 4.72226L1.26061 4.40372C0.675422 6.14512 1.07577 8.14684 2.46447 9.53554L3.17157 8.82843ZM6 6L6 6V5C5.724 5 5.47331 5.11248 5.2929 5.29289L6 6ZM1.14645 1.85355L5.29289 6L6 5.2929L1.85355 1.14645L1.14645 1.85355ZM5.29289 6L6 6.70711L6.70711 6L6 5.2929L5.29289 6ZM6 6.70711L7.41421 8.12132L8.12132 7.41422L6.70711 6L6 6.70711ZM7.41421 8.12133L8.82843 9.53554L9.53553 8.82843L8.12132 7.41422L7.41421 8.12133ZM8.82843 9.53554L10.1464 10.8536L10.8536 10.1464L9.53553 8.82843L8.82843 9.53554ZM6 6L6 6.00001L6.70711 6.70711C6.88753 6.52669 7 6.27601 7 6H6Z'
            fill='currentColor'
        />
    </svg>
)

export const StatusOfflineIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={StatusOffline} {...props} />
}

// 向上的箭头 排序
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

export const SorterUpIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={SorterUp} {...props} />
}

// 向下的箭头 排序
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

export const SorterDownIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={SorterDown} {...props} />
}

const Remove = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'>
        <path d='M3 9L9 3M3 3L9 9' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)

export const RemoveIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={Remove} {...props} />
}
