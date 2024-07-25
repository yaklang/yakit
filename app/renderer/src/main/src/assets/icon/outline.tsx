import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
    ref?: any
}

const OutlineChrome = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 8.4C10.0118 8.4 8.4 10.0118 8.4 12C8.4 13.9882 10.0118 15.6 12 15.6C13.9882 15.6 15.6 13.9882 15.6 12C15.6 10.0118 13.9882 8.4 12 8.4ZM12 8.4H20.1M8.4 12.9L4.8 6.6M11.1 20.8148L15.15 13.8M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechrome
 */
export const OutlineChromeIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChrome} {...props} />
}

const OutlinePlugs = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12.375 16.875L9.46878 19.7812C9.25975 19.991 9.01136 20.1574 8.73787 20.271C8.46438 20.3846 8.17116 20.443 7.87503 20.443C7.5789 20.443 7.28568 20.3846 7.01219 20.271C6.7387 20.1574 6.49031 19.991 6.28128 19.7812L4.21878 17.7187C4.00902 17.5097 3.84259 17.2613 3.72903 16.9878C3.61546 16.7143 3.55701 16.4211 3.55701 16.125C3.55701 15.8289 3.61546 15.5356 3.72903 15.2622C3.84259 14.9887 4.00902 14.7403 4.21878 14.5312L7.12503 11.625'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M5.25 18.75L2.25 21.75'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M21.75 2.25L18.75 5.25'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M13.5 13.5L11.25 15.75'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M10.5 10.5L8.25 12.75'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M16.875 12.375L19.7812 9.46872C19.991 9.25969 20.1574 9.0113 20.271 8.73781C20.3846 8.46432 20.443 8.1711 20.443 7.87497C20.443 7.57884 20.3846 7.28562 20.271 7.01213C20.1574 6.73864 19.991 6.49025 19.7812 6.28122L17.7187 4.21872C17.5097 4.00896 17.2613 3.84253 16.9878 3.72897C16.7143 3.6154 16.4211 3.55695 16.125 3.55695C15.8289 3.55695 15.5356 3.6154 15.2622 3.72897C14.9887 3.84253 14.7403 4.00896 14.5312 4.21872L11.625 7.12497'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M10.875 6.375L17.625 13.125'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M6.375 10.875L13.125 17.625'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineplugs
 */
export const OutlinePlugsIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePlugs} {...props} />
}

const OutlineRobot = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect
            x='4'
            y='8'
            width='16'
            height='12'
            rx='6'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M1 12V16' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M23 12V16' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M12 5L12 8' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <circle
            cx='12'
            cy='4'
            r='1'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle
            cx='9'
            cy='14'
            r='1'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle
            cx='15'
            cy='14'
            r='1'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinerobot
 */
export const OutlineRobotIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineRobot} {...props} />
}

const OutlineRocketOff = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.5 21C9.5 20.4477 9.94772 20 10.5 20H13.5C14.0523 20 14.5 20.4477 14.5 21C14.5 21.5523 14.0523 22 13.5 22H10.5C9.94772 22 9.5 21.5523 9.5 21Z'
            fill='currentColor'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M12 0.686218C11.5985 0.686218 11.2097 0.825741 10.8999 1.08069C10.1257 1.70097 8.62368 3.0658 7.46917 5.12255L8.94898 6.60237C9.88438 4.71027 11.2305 3.40563 11.9986 2.76563C12.8675 3.50233 14.4724 5.09812 15.3745 7.44301C15.704 8.29953 15.945 9.2686 16.0158 10.3489C16.0148 10.4009 16.0178 10.4531 16.0248 10.5049C16.0695 11.4004 15.9968 12.3708 15.7619 13.4153L17.3914 15.0448C17.6162 14.3308 17.777 13.639 17.8819 12.9703L19.1633 14.5079L18.7457 16.399L20.4234 18.0767L21.1397 14.833C21.2023 14.5726 21.203 14.3011 21.1416 14.0402C21.0796 13.7763 20.9557 13.5309 20.7803 13.3243L17.9935 9.98008C17.8918 8.79549 17.6194 7.7081 17.2411 6.72489C16.104 3.76907 14.0518 1.85588 13.1039 1.08383C12.7935 0.826888 12.4031 0.686218 12 0.686218ZM14.6085 19L12.6085 17H9.58758C8.68829 15.3249 8.20509 13.7925 8.0135 12.405L5.81959 10.2111L3.22003 13.3239C3.04449 13.5306 2.92052 13.7761 2.85839 14.0402C2.79701 14.301 2.79773 14.5726 2.86038 14.833L4.01104 20.0437L4.01174 20.0468C4.07666 20.3365 4.21419 20.6048 4.41137 20.8267C4.60857 21.0485 4.85894 21.2165 5.13894 21.315C5.41895 21.4134 5.7194 21.439 6.01203 21.3894C6.30466 21.3397 6.58033 21.2161 6.81221 21.0308L9.3508 19H14.6085ZM4.83681 14.5081L6.08338 13.0154C6.32559 14.4847 6.84155 16.0642 7.71874 17.7444L5.87686 19.2179L4.83681 14.5081Z'
            fill='currentColor'
        />
        <path
            d='M12 10.125C12.6213 10.125 13.125 9.62132 13.125 9C13.125 8.37868 12.6213 7.875 12 7.875C11.3787 7.875 10.875 8.37868 10.875 9C10.875 9.62132 11.3787 10.125 12 10.125Z'
            fill='currentColor'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M2.38489 3.20093C2.7246 2.86121 3.31658 2.9024 3.70711 3.29292L20.6777 20.2635C21.0682 20.654 21.1094 21.246 20.7697 21.5857C20.4299 21.9254 19.838 21.8842 19.4474 21.4937L2.47688 4.52315C2.08636 4.13262 2.04517 3.54065 2.38489 3.20093Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinerocket off
 */
export const OutlineRocketOffIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineRocketOff} {...props} />
}

const OutlineRocketOff3 = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M6.28901 12.4094C6.42103 12.802 6.20979 13.2273 5.81718 13.3593C4.81072 13.6978 4.26751 14.5439 3.97232 15.4303C3.87827 15.7128 3.81406 15.9872 3.77038 16.2296C4.01285 16.186 4.28723 16.1218 4.56968 16.0277C5.45611 15.7325 6.30223 15.1893 6.64068 14.1828C6.77271 13.7902 7.19801 13.579 7.59062 13.711C7.98323 13.843 8.19447 14.2683 8.06244 14.661C7.51027 16.3029 6.14546 17.0839 5.0436 17.4509C4.48595 17.6366 3.96467 17.728 3.58469 17.7736C3.39361 17.7965 3.2354 17.8082 3.12257 17.8141C3.06609 17.8171 3.02076 17.8186 2.98815 17.8195L2.94888 17.8202L2.93671 17.8203L2.93254 17.8203L2.93095 17.8203C2.93065 17.8203 2.92969 17.8203 2.92969 17.0703C2.17969 17.0703 2.17969 17.07 2.17969 17.0697L2.17969 17.0675L2.17971 17.0633L2.17982 17.0511L2.18056 17.0119C2.18137 16.9793 2.18292 16.9339 2.1859 16.8774C2.19183 16.7646 2.20349 16.6064 2.22641 16.4153C2.27199 16.0353 2.36346 15.5141 2.54916 14.9564C2.91608 13.8546 3.69709 12.4897 5.33907 11.9376C5.73168 11.8055 6.15698 12.0168 6.28901 12.4094ZM2.92969 17.0703L2.17969 17.0697C2.17969 17.484 2.51547 17.8203 2.92969 17.8203V17.0703Z'
            fill='currentColor'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M16.4348 3.5652C15.6836 3.47639 14.0128 3.50878 12.296 5.22562L7.5216 9.99997L10 12.4784L14.7744 7.70402C16.4912 5.98718 16.5236 4.3164 16.4348 3.5652ZM16.7449 2.09319C15.7196 1.94485 13.4523 1.94795 11.2353 4.16496L5.93061 9.46964C5.78996 9.6103 5.71094 9.80106 5.71094 9.99997C5.71094 10.1989 5.78996 10.3897 5.93061 10.5303L9.46967 14.0694C9.61032 14.21 9.80109 14.289 10 14.289C10.1989 14.289 10.3897 14.21 10.5303 14.0694L15.835 8.76468C18.052 6.54771 18.0551 4.28045 17.9068 3.25514C17.8665 2.96124 17.7311 2.68854 17.5213 2.47871C17.3114 2.26889 17.0388 2.13352 16.7449 2.09319Z'
            fill='currentColor'
        />
        <path
            d='M14.4219 9.11719V14.1641C14.4195 14.3289 14.3521 14.4862 14.2344 14.6016L11.7109 17.1328C11.6309 17.2128 11.5306 17.2695 11.4208 17.297C11.3111 17.3244 11.1959 17.3215 11.0876 17.2886C10.9794 17.2558 10.882 17.1941 10.8061 17.1102C10.7301 17.0264 10.6783 16.9235 10.6562 16.8125L10 13.5391'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M5.83588 4.82806V4.82814H10.8828C11.1861 4.82814 11.4596 5.01087 11.5757 5.29113C11.6918 5.57138 11.6276 5.89397 11.4131 6.10847L6.99121 10.5303C6.81381 10.7077 6.55945 10.7847 6.31346 10.7354L3.04118 10.0794C3.04087 10.0793 3.04057 10.0792 3.04026 10.0792C2.79645 10.0305 2.57039 9.91669 2.38614 9.74976C2.20165 9.58262 2.066 9.36853 1.99366 9.13034C1.92132 8.89214 1.915 8.63877 1.97538 8.39727C2.03576 8.15576 2.16057 7.93518 2.33649 7.75905L2.33762 7.75793L4.86637 5.23699C5.11989 4.98022 5.46426 4.83336 5.8252 4.82822L5.83588 4.82806ZM5.89644 6.32814L3.56321 8.65417L6.21453 9.1857L9.0721 6.32814H5.89644Z'
            fill='currentColor'
        />
        <path d='M3 1L18.5563 16.5563' stroke='white' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path
            d='M2 2L17.5563 17.5563'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinerocket off 3
 */
export const OutlineRocketOff3Icon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineRocketOff3} {...props} />
}

const OutlineAcademiccap = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 14L21 9L12 4L3 9L12 14ZM12 14L18.1591 10.5783C18.7017 11.9466 19 13.4384 19 14.9999C19 15.7013 18.9398 16.3885 18.8244 17.0569C16.2143 17.3106 13.849 18.4006 12 20.0555C10.151 18.4006 7.78571 17.3106 5.17562 17.0569C5.06017 16.3885 5 15.7012 5 14.9999C5 13.4384 5.29824 11.9466 5.84088 10.5782L12 14ZM8 19.9999V12.5L12 10.2778'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineacademic-cap
 */
export const OutlineAcademiccapIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineAcademiccap} {...props} />
}

const OutlineAdjustments = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 6V4M12 6C10.8954 6 10 6.89543 10 8C10 9.10457 10.8954 10 12 10M12 6C13.1046 6 14 6.89543 14 8C14 9.10457 13.1046 10 12 10M6 18C7.10457 18 8 17.1046 8 16C8 14.8954 7.10457 14 6 14M6 18C4.89543 18 4 17.1046 4 16C4 14.8954 4.89543 14 6 14M6 18V20M6 14V4M12 10V20M18 18C19.1046 18 20 17.1046 20 16C20 14.8954 19.1046 14 18 14M18 18C16.8954 18 16 17.1046 16 16C16 14.8954 16.8954 14 18 14M18 18V20M18 14V4'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineadjustments
 */
export const OutlineAdjustmentsIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineAdjustments} {...props} />
}

const OutlineAnnotation = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 8H17M7 12H11M12 20L8 16H5C3.89543 16 3 15.1046 3 14V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V14C21 15.1046 20.1046 16 19 16H16L12 20Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineannotation
 */
export const OutlineAnnotationIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineAnnotation} {...props} />
}

const OutlineArchive = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 8H19M5 8C3.89543 8 3 7.10457 3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6C21 7.10457 20.1046 8 19 8M5 8L5 18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V8M10 12H14'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearchive
 */
export const OutlineArchiveIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArchive} {...props} />
}

const OutlineArrowcircledown = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 13L12 16M12 16L9 13M12 16L12 8M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-circle-down
 */
export const OutlineArrowcircledownIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowcircledown} {...props} />
}

const OutlineArrowcircleleft = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11 15L8 12M8 12L11 9M8 12L16 12M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-circle-left
 */
export const OutlineArrowcircleleftIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowcircleleft} {...props} />
}

const OutlineArrowcircleright = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13 9L16 12M16 12L13 15M16 12L8 12M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-circle-right
 */
export const OutlineArrowcirclerightIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowcircleright} {...props} />
}

const OutlineArrowcircleup = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 11L12 8M12 8L15 11M12 8L12 16M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-circle-up
 */
export const OutlineArrowcircleupIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowcircleup} {...props} />
}

const OutlineArrowdown = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19 14L12 21M12 21L5 14M12 21L12 3'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-down
 */
export const OutlineArrowdownIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowdown} {...props} />
}

const OutlineArrowleft = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10 19L3 12M3 12L10 5M3 12L21 12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-left
 */
export const OutlineArrowleftIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowleft} {...props} />
}

const OutlineArrownarrowdown = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16 17L12 21M12 21L8 17M12 21L12 3'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-narrow-down
 */
export const OutlineArrownarrowdownIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrownarrowdown} {...props} />
}

const OutlineArrownarrowleft = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 16L3 12M3 12L7 8M3 12L21 12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-narrow-left
 */
export const OutlineArrownarrowleftIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrownarrowleft} {...props} />
}

const OutlineArrownarrowright = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17 8L21 12M21 12L17 16M21 12L3 12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-narrow-right
 */
export const OutlineArrownarrowrightIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrownarrowright} {...props} />
}

const OutlineArrownarrowup = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 7L12 3M12 3L16 7M12 3V21'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-narrow-up
 */
export const OutlineArrownarrowupIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrownarrowup} {...props} />
}

const OutlineArrowright = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M14 5L21 12M21 12L14 19M21 12L3 12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-right
 */
export const OutlineArrowrightIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowright} {...props} />
}

const OutlineArrowsmdown = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17 13L12 18M12 18L7 13M12 18L12 6'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-sm-down
 */
export const OutlineArrowsmdownIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowsmdown} {...props} />
}

const OutlineArrowsmleft = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11 17L6 12M6 12L11 7M6 12L18 12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-sm-left
 */
export const OutlineArrowsmleftIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowsmleft} {...props} />
}

const OutlineArrowsmright = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13 7L18 12M18 12L13 17M18 12L6 12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-sm-right
 */
export const OutlineArrowsmrightIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowsmright} {...props} />
}

const OutlineArrowsmup = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 11L12 6M12 6L17 11M12 6V18'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-sm-up
 */
export const OutlineArrowsmupIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowsmup} {...props} />
}

const OutlineArrowup = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 10L12 3M12 3L19 10M12 3V21'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrow-up
 */
export const OutlineArrowupIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowup} {...props} />
}

const OutlineArrowsexpand = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 8V4M4 4H8M4 4L9 9M20 8V4M20 4H16M20 4L15 9M4 16V20M4 20H8M4 20L9 15M20 20L15 15M20 20V16M20 20H16'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrows-expand
 */
export const OutlineArrowsexpandIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowsexpand} {...props} />
}

const OutlineArrowscollapse = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 5V9M15 9H19M15 9L20 4M9 5V9M9 9H5M9 9L4 4M15 19V15M15 15H19M15 15L20 20M9 19V15M9 15H5M9 15L4 20'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinearrows-收起
 */
export const OutlineArrowscollapseIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowscollapse} {...props} />
}

const OutlineAtsymbol = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12ZM16 12V13.5C16 14.8807 17.1193 16 18.5 16C19.8807 16 21 14.8807 21 13.5V12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21M16.5 19.7942C15.0801 20.614 13.5296 21.0029 12 21.0015'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineat-symbol
 */
export const OutlineAtsymbolIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineAtsymbol} {...props} />
}

const OutlineBackspace = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 14L14 12M14 12L16 10M14 12L12 10M14 12L16 14M3 12L9.41421 18.4142C9.78929 18.7893 10.298 19 10.8284 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H10.8284C10.298 5 9.78929 5.21071 9.41421 5.58579L3 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinebackspace
 */
export const OutlineBackspaceIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineBackspace} {...props} />
}

const OutlineBadgecheck = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 12L11 14L15 10M7.83474 4.69705C8.55227 4.63979 9.23346 4.35763 9.78132 3.89075C11.0598 2.80123 12.9402 2.80123 14.2187 3.89075C14.7665 4.35763 15.4477 4.63979 16.1653 4.69705C17.8397 4.83067 19.1693 6.16031 19.303 7.83474C19.3602 8.55227 19.6424 9.23346 20.1093 9.78132C21.1988 11.0598 21.1988 12.9402 20.1093 14.2187C19.6424 14.7665 19.3602 15.4477 19.303 16.1653C19.1693 17.8397 17.8397 19.1693 16.1653 19.303C15.4477 19.3602 14.7665 19.6424 14.2187 20.1093C12.9402 21.1988 11.0598 21.1988 9.78132 20.1093C9.23346 19.6424 8.55227 19.3602 7.83474 19.303C6.16031 19.1693 4.83067 17.8397 4.69705 16.1653C4.63979 15.4477 4.35763 14.7665 3.89075 14.2187C2.80123 12.9402 2.80123 11.0598 3.89075 9.78132C4.35763 9.23346 4.63979 8.55227 4.69705 7.83474C4.83067 6.16031 6.16031 4.83067 7.83474 4.69705Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinebadge-check
 */
export const OutlineBadgecheckIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineBadgecheck} {...props} />
}

const OutlineBan = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M18.364 18.364C21.8787 14.8492 21.8787 9.15076 18.364 5.63604C14.8492 2.12132 9.15076 2.12132 5.63604 5.63604M18.364 18.364C14.8492 21.8787 9.15076 21.8787 5.63604 18.364C2.12132 14.8492 2.12132 9.15076 5.63604 5.63604M18.364 18.364L5.63604 5.63604'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineban
 */
export const OutlineBanIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineBan} {...props} />
}

const OutlineBeaker = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19.428 15.4282C19.1488 15.149 18.7932 14.9587 18.406 14.8812L16.0185 14.4037C14.7101 14.1421 13.3519 14.324 12.1585 14.9207L11.8411 15.0793C10.6477 15.676 9.28948 15.8579 7.98113 15.5963L6.04938 15.2099C5.39366 15.0788 4.71578 15.284 4.24294 15.7569M7.9998 4H15.9998L14.9998 5V10.1716C14.9998 10.702 15.2105 11.2107 15.5856 11.5858L20.5856 16.5858C21.8455 17.8457 20.9532 20 19.1714 20H4.82823C3.04642 20 2.15409 17.8457 3.41401 16.5858L8.41402 11.5858C8.78909 11.2107 8.9998 10.702 8.9998 10.1716V5L7.9998 4Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinebeaker
 */
export const OutlineBeakerIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineBeaker} {...props} />
}

const OutlineBell = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 17H20L18.5951 15.5951C18.2141 15.2141 18 14.6973 18 14.1585V11C18 8.38757 16.3304 6.16509 14 5.34142V5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5V5.34142C7.66962 6.16509 6 8.38757 6 11V14.1585C6 14.6973 5.78595 15.2141 5.40493 15.5951L4 17H9M15 17V18C15 19.6569 13.6569 21 12 21C10.3431 21 9 19.6569 9 18V17M15 17H9'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinebell
 */
export const OutlineBellIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineBell} {...props} />
}

const OutlineBookopen = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 6.25278V19.2528M12 6.25278C10.8321 5.47686 9.24649 5 7.5 5C5.75351 5 4.16789 5.47686 3 6.25278V19.2528C4.16789 18.4769 5.75351 18 7.5 18C9.24649 18 10.8321 18.4769 12 19.2528M12 6.25278C13.1679 5.47686 14.7535 5 16.5 5C18.2465 5 19.8321 5.47686 21 6.25278V19.2528C19.8321 18.4769 18.2465 18 16.5 18C14.7535 18 13.1679 18.4769 12 19.2528'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinebook-open
 */
export const OutlineBookopenIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineBookopen} {...props} />
}

const OutlineBookmarkalt = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16 4V16L12 14L8 16V4M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinebookmark-alt
 */
export const OutlineBookmarkaltIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineBookmarkalt} {...props} />
}

const OutlineBookmark = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21L12 17.5L5 21V5Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinebookmark
 */
export const OutlineBookmarkIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineBookmark} {...props} />
}

const OutlineBriefcase = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 13.2554C18.2207 14.3805 15.1827 15 12 15C8.8173 15 5.7793 14.3805 3 13.2554M16 6V4C16 2.89543 15.1046 2 14 2H10C8.89543 2 8 2.89543 8 4V6M12 12H12.01M5 20H19C20.1046 20 21 19.1046 21 18V8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V18C3 19.1046 3.89543 20 5 20Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinebriefcase
 */
export const OutlineBriefcaseIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineBriefcase} {...props} />
}

const OutlineBug = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_1_3136'
            style={{maskType: "alpha"}}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_1_3136)'>
            <path
                d='M6.00012 10C6.00012 8.34315 7.34327 7 9.00012 7H15.0001C16.657 7 18.0001 8.34315 18.0001 10V15C18.0001 18.3137 15.3138 21 12.0001 21C8.68642 21 6.00012 18.3137 6.00012 15V10Z'
                stroke='currentColor'
                strokeWidth='1.5'
            />
            <path d='M12 21V7' stroke='currentColor' strokeWidth='1.5' />
            <path d='M2 13H5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M19 13H22' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
            <path
                d='M15 6C15 4.34315 13.6569 3 12 3C10.3431 3 9 4.34315 9 6'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
            <path d='M21 6C21 7.65685 19.6569 9 18 9' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M3 21C3 19.3431 4.34315 18 6 18' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M3 6C3 7.65685 4.34315 9 6 9' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
            <path
                d='M21 21C21 19.3431 19.6569 18 18 18'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
        </g>
    </svg>
)
/**
 * @description  Icon/Outline/Outlinebug
 */
export const OutlineBugIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineBug} {...props} />
}

const OutlineCake = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 15.5458C20.4771 15.5458 19.9542 15.6972 19.5 16C18.5917 16.6056 17.4083 16.6056 16.5 16C15.5917 15.3944 14.4083 15.3944 13.5 16C12.5917 16.6056 11.4083 16.6056 10.5 16C9.59167 15.3944 8.40833 15.3944 7.5 16C6.59167 16.6056 5.40833 16.6056 4.5 16C4.04584 15.6972 3.52292 15.5458 3 15.5458M9 6V8M12 6V8M15 6V8M9 3H9.01M12 3H12.01M15 3H15.01M21 21V14C21 12.8954 20.1046 12 19 12H5C3.89543 12 3 12.8954 3 14V21H21ZM18 12V10C18 8.89543 17.1046 8 16 8H8C6.89543 8 6 8.89543 6 10V12H18Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecake
 */
export const OutlineCakeIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCake} {...props} />
}

const OutlineCalculator = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 7H15M15 17V14M12 17H12.01M9 17H9.01M9 14H9.01M12 14H12.01M15 11H15.01M12 11H12.01M9 11H9.01M7 21H17C18.1046 21 19 20.1046 19 19V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecalculator
 */
export const OutlineCalculatorIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCalculator} {...props} />
}

const OutlineCalendar = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecalendar
 */
export const OutlineCalendarIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCalendar} {...props} />
}

const OutlineCamera = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 9C3 7.89543 3.89543 7 5 7H5.92963C6.59834 7 7.2228 6.6658 7.59373 6.1094L8.40627 4.8906C8.7772 4.3342 9.40166 4 10.0704 4H13.9296C14.5983 4 15.2228 4.3342 15.5937 4.8906L16.4063 6.1094C16.7772 6.6658 17.4017 7 18.0704 7H19C20.1046 7 21 7.89543 21 9V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V9Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M15 13C15 14.6569 13.6569 16 12 16C10.3431 16 9 14.6569 9 13C9 11.3431 10.3431 10 12 10C13.6569 10 15 11.3431 15 13Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecamera
 */
export const OutlineCameraIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCamera} {...props} />
}

const OutlineCash = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17 9V7C17 5.89543 16.1046 5 15 5H5C3.89543 5 3 5.89543 3 7V13C3 14.1046 3.89543 15 5 15H7M9 19H19C20.1046 19 21 18.1046 21 17V11C21 9.89543 20.1046 9 19 9H9C7.89543 9 7 9.89543 7 11V17C7 18.1046 7.89543 19 9 19ZM16 14C16 15.1046 15.1046 16 14 16C12.8954 16 12 15.1046 12 14C12 12.8954 12.8954 12 14 12C15.1046 12 16 12.8954 16 14Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecash
 */
export const OutlineCashIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCash} {...props} />
}

const OutlineChartbar = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 19V13C9 11.8954 8.10457 11 7 11H5C3.89543 11 3 11.8954 3 13V19C3 20.1046 3.89543 21 5 21H7C8.10457 21 9 20.1046 9 19ZM9 19V9C9 7.89543 9.89543 7 11 7H13C14.1046 7 15 7.89543 15 9V19M9 19C9 20.1046 9.89543 21 11 21H13C14.1046 21 15 20.1046 15 19M15 19V5C15 3.89543 15.8954 3 17 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H17C15.8954 21 15 20.1046 15 19Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechart-bar
 */
export const OutlineChartbarIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChartbar} {...props} />
}

const OutlineChartpie = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11 3.05493C6.50005 3.55238 3 7.36745 3 12C3 16.9706 7.02944 21 12 21C16.6326 21 20.4476 17.5 20.9451 13H11V3.05493Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M20.4878 9H15V3.5123C17.5572 4.41613 19.5839 6.44285 20.4878 9Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechart-pie
 */
export const OutlineChartpieIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChartpie} {...props} />
}

const OutlineChartsquarebar = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16 8V16M12 11V16M8 14V16M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechart-square-bar
 */
export const OutlineChartsquarebarIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChartsquarebar} {...props} />
}

const OutlineChatalt = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 10H8.01M12 10H12.01M16 10H16.01M9 16H5C3.89543 16 3 15.1046 3 14V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V14C21 15.1046 20.1046 16 19 16H14L9 21V16Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechat-alt
 */
export const OutlineChataltIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChatalt} {...props} />
}

const OutlineChatalt2 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17 8H19C20.1046 8 21 8.89543 21 10V16C21 17.1046 20.1046 18 19 18H17V22L13 18H9C8.44772 18 7.94772 17.7761 7.58579 17.4142M7.58579 17.4142L11 14H15C16.1046 14 17 13.1046 17 12V6C17 4.89543 16.1046 4 15 4H5C3.89543 4 3 4.89543 3 6V12C3 13.1046 3.89543 14 5 14H7V18L7.58579 17.4142Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechat-alt-2
 */
export const OutlineChatalt2Icon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChatalt2} {...props} />
}

const OutlineChat = () => (
    // <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
    //     <path
    //         d='M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.28C3.51156 15.0423 3 13.5743 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z'
    //         stroke='currentColor'
    //         strokeWidth='1.5'
    //         strokeLinecap='round'
    //         strokeLinejoin='round'
    //     />
    // </svg>
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.28C3.51156 15.0423 3 13.5743 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='8' cy='12' r='1' fill='currentColor' />
        <circle cx='12' cy='12' r='1' fill='currentColor' />
        <circle cx='16' cy='12' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechat
 */
export const OutlineChatIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChat} {...props} />
}

const OutlineCheckcircle = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecheck-circle
 */
export const OutlineCheckcircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCheckcircle} {...props} />
}

const OutlineChecksquare = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <g clipPath='url(#clip0_209_7655)'>
            <rect x='0.5' y='0.5' width='15' height='15' rx='3.5' stroke='currentColor' />
        </g>
        <defs>
            <clipPath id='clip0_209_7655'>
                <rect width='16' height='16' fill='white' />
            </clipPath>
        </defs>
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecheck-square
 */
export const OutlineChecksquareIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChecksquare} {...props} />
}

const OutlineCheck = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 13L9 17L19 7'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecheck
 */
export const OutlineCheckIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCheck} {...props} />
}

const OutlineChevrondoubledown = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19 13L12 20L5 13M19 5L12 12L5 5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechevron-double-down
 */
export const OutlineChevrondoubledownIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChevrondoubledown} {...props} />
}

const OutlineChevrondoubleleft = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11 19L4 12L11 5M19 19L12 12L19 5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechevron-double-left
 */
export const OutlineChevrondoubleleftIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChevrondoubleleft} {...props} />
}

const OutlineChevrondoubleright = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13 5L20 12L13 19M5 5L12 12L5 19'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechevron-double-right
 */
export const OutlineChevrondoublerightIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChevrondoubleright} {...props} />
}

const OutlineChevrondoubleup = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 11L12 4L19 11M5 19L12 12L19 19'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechevron-double-up
 */
export const OutlineChevrondoubleupIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChevrondoubleup} {...props} />
}

const OutlineChevrondown = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19 9L12 16L5 9'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechevron-down
 */
export const OutlineChevrondownIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChevrondown} {...props} />
}

const OutlineChevronleft = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 19L8 12L15 5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechevron-left
 */
export const OutlineChevronleftIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChevronleft} {...props} />
}

const OutlineChevronright = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 5L16 12L9 19'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechevron-right
 */
export const OutlineChevronrightIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChevronright} {...props} />
}

const OutlineChevronup = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 15L12 8L19 15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechevron-up
 */
export const OutlineChevronupIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChevronup} {...props} />
}

const OutlineChip = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 3V5M15 3V5M9 19V21M15 19V21M5 9H3M5 15H3M21 9H19M21 15H19M7 19H17C18.1046 19 19 18.1046 19 17V7C19 5.89543 18.1046 5 17 5H7C5.89543 5 5 5.89543 5 7V17C5 18.1046 5.89543 19 7 19ZM9 9H15V15H9V9Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinechip
 */
export const OutlineChipIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineChip} {...props} />
}

const OutlineClipboardcheck = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9.70711 13.2929C9.31658 12.9024 8.68342 12.9024 8.29289 13.2929C7.90237 13.6834 7.90237 14.3166 8.29289 14.7071L9.70711 13.2929ZM11 16L10.2929 16.7071C10.6834 17.0976 11.3166 17.0976 11.7071 16.7071L11 16ZM15.7071 12.7071C16.0976 12.3166 16.0976 11.6834 15.7071 11.2929C15.3166 10.9024 14.6834 10.9024 14.2929 11.2929L15.7071 12.7071ZM18 7V19H20V7H18ZM17 20H7V22H17V20ZM6 19V7H4V19H6ZM7 6H9V4H7V6ZM15 6H17V4H15V6ZM7 20C6.44772 20 6 19.5523 6 19H4C4 20.6569 5.34315 22 7 22V20ZM18 19C18 19.5523 17.5523 20 17 20V22C18.6569 22 20 20.6569 20 19H18ZM20 7C20 5.34315 18.6569 4 17 4V6C17.5523 6 18 6.44772 18 7H20ZM6 7C6 6.44772 6.44772 6 7 6V4C5.34315 4 4 5.34315 4 7H6ZM8.29289 14.7071L10.2929 16.7071L11.7071 15.2929L9.70711 13.2929L8.29289 14.7071ZM11.7071 16.7071L15.7071 12.7071L14.2929 11.2929L10.2929 15.2929L11.7071 16.7071ZM11 4H13V2H11V4ZM13 6H11V8H13V6ZM11 6C10.4477 6 10 5.55228 10 5H8C8 6.65685 9.34315 8 11 8V6ZM14 5C14 5.55228 13.5523 6 13 6V8C14.6569 8 16 6.65685 16 5H14ZM13 4C13.5523 4 14 4.44772 14 5H16C16 3.34315 14.6569 2 13 2V4ZM11 2C9.34315 2 8 3.34315 8 5H10C10 4.44772 10.4477 4 11 4V2Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineclipboard-check
 */
export const OutlineClipboardcheckIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineClipboardcheck} {...props} />
}

const OutlineClipboardcopy = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H16C17.1046 21 18 20.1046 18 19V18M8 5C8 6.10457 8.89543 7 10 7H12C13.1046 7 14 6.10457 14 5M8 5C8 3.89543 8.89543 3 10 3H12C13.1046 3 14 3.89543 14 5M14 5H16C17.1046 5 18 5.89543 18 7V10M20 14H10M10 14L13 11M10 14L13 17'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineclipboard-copy
 */
export const OutlineClipboardcopyIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineClipboardcopy} {...props} />
}

const OutlineClipboardlist = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineclipboard-list
 */
export const OutlineClipboardlistIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineClipboardlist} {...props} />
}

const OutlineClipboard = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineclipboard
 */
export const OutlineClipboardIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineClipboard} {...props} />
}

const OutlineClock = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineclock
 */
export const OutlineClockIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineClock} {...props} />
}

const OutlineClouddownload = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 16C4.79086 16 3 14.2091 3 12C3 10.0929 4.33457 8.4976 6.12071 8.09695C6.04169 7.74395 6 7.37684 6 7C6 4.23858 8.23858 2 11 2C13.4193 2 15.4373 3.71825 15.9002 6.00098C15.9334 6.00033 15.9666 6 16 6C18.7614 6 21 8.23858 21 11C21 13.419 19.2822 15.4367 17 15.9M9 19L12 22M12 22L15 19M12 22V10'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecloud-download
 */
export const OutlineClouddownloadIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineClouddownload} {...props} />
}

const OutlineCloudupload = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 16C4.79086 16 3 14.2091 3 12C3 10.0929 4.33457 8.4976 6.12071 8.09695C6.04169 7.74395 6 7.37684 6 7C6 4.23858 8.23858 2 11 2C13.4193 2 15.4373 3.71825 15.9002 6.00098C15.9334 6.00033 15.9666 6 16 6C18.7614 6 21 8.23858 21 11C21 13.419 19.2822 15.4367 17 15.9M15 13L12 10M12 10L9 13M12 10L12 22'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecloud-upload
 */
export const OutlineClouduploadIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCloudupload} {...props} />
}

const OutlineCloud = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 15C3 17.2091 4.79086 19 7 19H16C18.7614 19 21 16.7614 21 14C21 11.2386 18.7614 9 16 9C15.9666 9 15.9334 9.00033 15.9002 9.00098C15.4373 6.71825 13.4193 5 11 5C8.23858 5 6 7.23858 6 10C6 10.3768 6.04169 10.7439 6.12071 11.097C4.33457 11.4976 3 13.0929 3 15Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecloud
 */
export const OutlineCloudIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCloud} {...props} />
}

const OutlineCode = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10 20L14 4M18 8L22 12L18 16M6 16L2 12L6 8'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecode
 */
export const OutlineCodeIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCode} {...props} />
}

const OutlineCog = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10.3246 4.31731C10.751 2.5609 13.249 2.5609 13.6754 4.31731C13.9508 5.45193 15.2507 5.99038 16.2478 5.38285C17.7913 4.44239 19.5576 6.2087 18.6172 7.75218C18.0096 8.74925 18.5481 10.0492 19.6827 10.3246C21.4391 10.751 21.4391 13.249 19.6827 13.6754C18.5481 13.9508 18.0096 15.2507 18.6172 16.2478C19.5576 17.7913 17.7913 19.5576 16.2478 18.6172C15.2507 18.0096 13.9508 18.5481 13.6754 19.6827C13.249 21.4391 10.751 21.4391 10.3246 19.6827C10.0492 18.5481 8.74926 18.0096 7.75219 18.6172C6.2087 19.5576 4.44239 17.7913 5.38285 16.2478C5.99038 15.2507 5.45193 13.9508 4.31731 13.6754C2.5609 13.249 2.5609 10.751 4.31731 10.3246C5.45193 10.0492 5.99037 8.74926 5.38285 7.75218C4.44239 6.2087 6.2087 4.44239 7.75219 5.38285C8.74926 5.99037 10.0492 5.45193 10.3246 4.31731Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecog
 */
export const OutlineCogIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCog} {...props} />
}

const OutlineCollection = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19 11H5M19 11C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11M19 11V9C19 7.89543 18.1046 7 17 7M5 11V9C5 7.89543 5.89543 7 7 7M7 7V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V7M7 7H17'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecollection
 */
export const OutlineCollectionIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCollection} {...props} />
}

const OutlineColorswatch = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 21C4.79086 21 3 19.2091 3 17V5C3 3.89543 3.89543 3 5 3H9C10.1046 3 11 3.89543 11 5V17C11 19.2091 9.20914 21 7 21ZM7 21H19C20.1046 21 21 20.1046 21 19V15C21 13.8954 20.1046 13 19 13H16.6569M11 7.34312L12.6569 5.68629C13.4379 4.90524 14.7042 4.90524 15.4853 5.68629L18.3137 8.51472C19.0948 9.29577 19.0948 10.5621 18.3137 11.3431L9.82843 19.8284M7 17H7.01'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='7' cy='17' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecolor-swatch
 */
export const OutlineColorswatchIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineColorswatch} {...props} />
}

const OutlineColor = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect x='4' y='4' width='16' height='16' rx='4' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecolor
 */
export const OutlineColorIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineColor} {...props} />
}

const OutlineCreditcard = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 10H21M7 15H8M12 15H13M6 19H18C19.6569 19 21 17.6569 21 16V8C21 6.34315 19.6569 5 18 5H6C4.34315 5 3 6.34315 3 8V16C3 17.6569 4.34315 19 6 19Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecredit-card
 */
export const OutlineCreditcardIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCreditcard} {...props} />
}

const OutlineCubetransparent = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M14 10L12 11M12 11L10 10M12 11V13.5M20 7L18 8M20 7L18 6M20 7V9.5M14 4L12 3L10 4M4 7L6 6M4 7L6 8M4 7V9.5M12 21L10 20M12 21L14 20M12 21V18.5M6 18L4 17V14.5M18 18L20 17V14.5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecubetransparent
 */
export const OutlineCubetransparentIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCubetransparent} {...props} />
}

const OutlineCube = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecube
 */
export const OutlineCubeIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCube} {...props} />
}

const OutlineCurrencybangladeshi = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11 11V9C11 7.89543 10.1046 7 9 7M11 11V15C11 16.1046 11.8954 17 13 17C14.1046 17 15 16.1046 15 15V14M11 11H9M11 11H15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecurrency-bangladeshi
 */
export const OutlineCurrencybangladeshiIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCurrencybangladeshi} {...props} />
}

const OutlineCurrencydollar = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13.8434 9.65538C14.2053 10.0725 14.8369 10.1173 15.254 9.7553C15.6712 9.39335 15.7159 8.76176 15.354 8.34462L13.8434 9.65538ZM10.1567 14.3446C9.79471 13.9275 9.16313 13.8827 8.74599 14.2447C8.32885 14.6067 8.28411 15.2382 8.64607 15.6554L10.1567 14.3446ZM13 7C13 6.44772 12.5523 6 12 6C11.4477 6 11 6.44772 11 7H13ZM11 17C11 17.5523 11.4477 18 12 18C12.5523 18 13 17.5523 13 17L11 17ZM20 12C20 16.4183 16.4183 20 12 20V22C17.5228 22 22 17.5228 22 12H20ZM12 20C7.58172 20 4 16.4183 4 12H2C2 17.5228 6.47715 22 12 22V20ZM4 12C4 7.58172 7.58172 4 12 4V2C6.47715 2 2 6.47715 2 12H4ZM12 4C16.4183 4 20 7.58172 20 12H22C22 6.47715 17.5228 2 12 2V4ZM12 11C11.3415 11 10.7905 10.8202 10.4334 10.5822C10.0693 10.3394 10 10.1139 10 10H8C8 10.9907 8.6023 11.7651 9.32398 12.2463C10.0526 12.732 11.0017 13 12 13V11ZM10 10C10 9.8861 10.0693 9.66058 10.4334 9.41784C10.7905 9.17976 11.3415 9 12 9V7C11.0017 7 10.0526 7.26796 9.32398 7.75374C8.6023 8.23485 8 9.00933 8 10H10ZM12 9C12.9038 9 13.563 9.33231 13.8434 9.65538L15.354 8.34462C14.5969 7.47209 13.3171 7 12 7V9ZM12 13C12.6585 13 13.2095 13.1798 13.5666 13.4178C13.9308 13.6606 14 13.8861 14 14H16C16 13.0093 15.3977 12.2348 14.676 11.7537C13.9474 11.268 12.9983 11 12 11V13ZM11 7V8H13V7H11ZM11 16L11 17L13 17L13 16L11 16ZM12 15C11.0962 15 10.437 14.6677 10.1567 14.3446L8.64607 15.6554C9.40317 16.5279 10.683 17 12 17L12 15ZM14 14C14 14.1139 13.9308 14.3394 13.5666 14.5822C13.2095 14.8202 12.6586 15 12 15V17C12.9983 17 13.9474 16.732 14.676 16.2463C15.3977 15.7651 16 14.9907 16 14H14ZM11 8L11 16L13 16L13 8L11 8Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecurrency-dollar
 */
export const OutlineCurrencydollarIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCurrencydollar} {...props} />
}

const OutlineCurrencyeuro = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M14.1213 15.5355C12.9497 17.4882 11.0503 17.4882 9.87868 15.5355C8.70711 13.5829 8.70711 10.4171 9.87868 8.46447C11.0503 6.51184 12.9497 6.51184 14.1213 8.46447M8 10.5H12M8 13.5H12M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecurrency-euro
 */
export const OutlineCurrencyeuroIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCurrencyeuro} {...props} />
}

const OutlineCurrencypound = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 9C15 7.89543 14.1046 7 13 7C11.8954 7 11 7.89543 11 9V14C11 15.1046 10.1046 16 9 16H15M9 12H13M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecurrency-pound
 */
export const OutlineCurrencypoundIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCurrencypound} {...props} />
}

const OutlineCurrencyrupee = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 8H15M10 8C11.6569 8 13 9.34315 13 11C13 12.6569 11.6569 14 10 14H9L12 17M9 11H15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecurrency-rupee
 */
export const OutlineCurrencyrupeeIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCurrencyrupee} {...props} />
}

const OutlineCurrencyyen = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 8L12 13M12 13L15 8M12 13V17M9 12H15M9 15H15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecurrency-yen
 */
export const OutlineCurrencyyenIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCurrencyyen} {...props} />
}

const OutlineCursorclick = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 15L13 20L8.99995 9L20 13L15 15ZM15 15L20 20M7.18818 2.23853L7.96464 5.1363M5.13618 7.96472L2.2384 7.18826M13.9497 4.05029L11.8283 6.17161M6.17158 11.8284L4.05026 13.9497'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinecursor-click
 */
export const OutlineCursorclickIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineCursorclick} {...props} />
}

const OutlineDatabasebackup = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19.1621 5.54991C19.1621 6.95818 15.7679 8.09981 11.581 8.09981C7.39415 8.09981 4 6.95818 4 5.54991M19.1621 5.54991C19.1621 4.14163 15.7679 3 11.581 3C7.39415 3 4 4.14163 4 5.54991M19.1621 5.54991V9.37477M4 5.54991V17.4495C4 18.6649 6.50174 19.6849 9.89636 19.9399M4 11.4997C4 12.5027 5.70995 13.3696 8.21169 13.7946M11.581 14.8996L12.6508 13.7521C13.1092 13.0451 13.7759 12.5011 14.557 12.1966C15.338 11.8921 16.194 11.8425 17.0045 12.0549C17.8149 12.2672 18.5389 12.7308 19.0744 13.3802C19.61 14.0296 19.9302 14.8323 19.9898 15.675C20.0495 16.5177 19.8456 17.3581 19.407 18.0778C18.9683 18.7974 18.317 19.3601 17.5447 19.6865C16.7724 20.0129 15.9181 20.0866 15.1021 19.8973C14.2861 19.7079 13.5495 19.265 12.9962 18.6309M11.581 14.8996V11.4997M11.581 14.8996H14.9504'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedatabase-backup
 */
export const OutlineDatabasebackupIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDatabasebackup} {...props} />
}

const OutlineDatabase = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 7V17C4 19.2091 7.58172 21 12 21C16.4183 21 20 19.2091 20 17V7M4 7C4 9.20914 7.58172 11 12 11C16.4183 11 20 9.20914 20 7M4 7C4 4.79086 7.58172 3 12 3C16.4183 3 20 4.79086 20 7M20 12C20 14.2091 16.4183 16 12 16C7.58172 16 4 14.2091 4 12'
            stroke='currentColor'
            strokeWidth='1.5'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedatabase
 */
export const OutlineDatabaseIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDatabase} {...props} />
}

const OutlineDesktopcomputer = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9.75 17L9 20L8 21H16L15 20L14.25 17M3 13H21M5 17H19C20.1046 17 21 16.1046 21 15V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V15C3 16.1046 3.89543 17 5 17Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedesktop-computer
 */
export const OutlineDesktopcomputerIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDesktopcomputer} {...props} />
}

const OutlineDevicemobile = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 18H12.01M8 21H16C17.1046 21 18 20.1046 18 19V5C18 3.89543 17.1046 3 16 3H8C6.89543 3 6 3.89543 6 5V19C6 20.1046 6.89543 21 8 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedevice-mobile
 */
export const OutlineDevicemobileIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDevicemobile} {...props} />
}

const OutlineDevicetablet = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 18H12.01M7 21H17C18.1046 21 19 20.1046 19 19V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedevice-tablet
 */
export const OutlineDevicetabletIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDevicetablet} {...props} />
}

const OutlineDocumentadd = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 13H15M12 10L12 16M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedocument-add
 */
export const OutlineDocumentaddIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDocumentadd} {...props} />
}

const OutlineDocumentdownload = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 10V16M12 16L9 13M12 16L15 13M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedocument-download
 */
export const OutlineDocumentdownloadIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDocumentdownload} {...props} />
}

const OutlineDocumentduplicate = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 7V15C8 16.1046 8.89543 17 10 17H16M8 7V5C8 3.89543 8.89543 3 10 3H14.5858C14.851 3 15.1054 3.10536 15.2929 3.29289L19.7071 7.70711C19.8946 7.89464 20 8.149 20 8.41421V15C20 16.1046 19.1046 17 18 17H16M8 7H6C4.89543 7 4 7.89543 4 9V19C4 20.1046 4.89543 21 6 21H14C15.1046 21 16 20.1046 16 19V17'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedocument-duplicate
 */
export const OutlineDocumentduplicateIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDocumentduplicate} {...props} />
}

const OutlineDocumentremove = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 13H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedocument-remove
 */
export const OutlineDocumentremoveIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDocumentremove} {...props} />
}

const OutlineDocumentreport = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 17V15M12 17V13M15 17V11M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedocument-report
 */
export const OutlineDocumentreportIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDocumentreport} {...props} />
}

const OutlineDocumentsearch = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10 21H17C18.1046 21 19 20.1046 19 19V9.41421C19 9.149 18.8946 8.89464 18.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V16M5 21L9.87868 16.1213M9.87868 16.1213C10.4216 16.6642 11.1716 17 12 17C13.6569 17 15 15.6569 15 14C15 12.3431 13.6569 11 12 11C10.3431 11 9 12.3431 9 14C9 14.8284 9.33579 15.5784 9.87868 16.1213Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedocument-search
 */
export const OutlineDocumentsearchIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDocumentsearch} {...props} />
}

const OutlineDocumenttext = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedocument-text
 */
export const OutlineDocumenttextIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDocumenttext} {...props} />
}

const OutlineDocument = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 21H17C18.1046 21 19 20.1046 19 19V9.41421C19 9.149 18.8946 8.89464 18.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedocument
 */
export const OutlineDocumentIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDocument} {...props} />
}

const OutlineDotscirclehorizontal = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='8' cy='12' r='1' fill='currentColor' />
        <circle cx='12' cy='12' r='1' fill='currentColor' />
        <circle cx='16' cy='12' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedots-circle-horizontal
 */
export const OutlineDotscirclehorizontalIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDotscirclehorizontal} {...props} />
}

const OutlineDotshorizontal = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 12H5.01M12 12H12.01M19 12H19.01M6 12C6 12.5523 5.55228 13 5 13C4.44772 13 4 12.5523 4 12C4 11.4477 4.44772 11 5 11C5.55228 11 6 11.4477 6 12ZM13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12ZM20 12C20 12.5523 19.5523 13 19 13C18.4477 13 18 12.5523 18 12C18 11.4477 18.4477 11 19 11C19.5523 11 20 11.4477 20 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedots-horizontal
 */
export const OutlineDotshorizontalIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDotshorizontal} {...props} />
}

const OutlineDotsvertical = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 5L12 5.01M12 12L12 12.01M12 19L12 19.01M12 6C11.4477 6 11 5.55228 11 5C11 4.44772 11.4477 4 12 4C12.5523 4 13 4.44772 13 5C13 5.55228 12.5523 6 12 6ZM12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12C13 12.5523 12.5523 13 12 13ZM12 20C11.4477 20 11 19.5523 11 19C11 18.4477 11.4477 18 12 18C12.5523 18 13 18.4477 13 19C13 19.5523 12.5523 20 12 20Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedots-vertical
 */
export const OutlineDotsverticalIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDotsvertical} {...props} />
}

const OutlineDownload = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16M16 12L12 16M12 16L8 12M12 16L12 4'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinedownload
 */
export const OutlineDownloadIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDownload} {...props} />
}

const OutlineDuplicate = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16 16H18C19.1046 16 20 15.1046 20 14V6C20 4.89543 19.1046 4 18 4H10C8.89543 4 8 4.89543 8 6V8M14 20H6C4.89543 20 4 19.1046 4 18V10C4 8.89543 4.89543 8 6 8H14C15.1046 8 16 8.89543 16 10V18C16 19.1046 15.1046 20 14 20Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineduplicate
 */
export const OutlineDuplicateIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDuplicate} {...props} />
}

const OutlineEmojihappy = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M14.8284 14.8284C13.2663 16.3905 10.7337 16.3905 9.17157 14.8284M9 10H9.01M15 10H15.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineemoji-happy
 */
export const OutlineEmojihappyIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineEmojihappy} {...props} />
}

const OutlineEmojisad = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9.17163 16.1716C10.7337 14.6095 13.2664 14.6095 14.8285 16.1716M9 10H9.01M15 10H15.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineemoji-sad
 */
export const OutlineEmojisadIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineEmojisad} {...props} />
}

const OutlineExclamationcircle = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 8V12M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='12' cy='16' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineexclamation-circle
 */
export const OutlineExclamationcircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineExclamationcircle} {...props} />
}

const OutlineExclamation = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 9V11M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='12' cy='15' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineexclamation
 */
export const OutlineExclamationIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineExclamation} {...props} />
}

const OutlineExternallink = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14M14 4H20M20 4V10M20 4L10 14'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineexternal-link
 */
export const OutlineExternallinkIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineExternallink} {...props} />
}

const OutlineEyeoff = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 3L6.58916 6.58916M21 21L17.4112 17.4112M13.8749 18.8246C13.2677 18.9398 12.6411 19 12.0005 19C7.52281 19 3.73251 16.0571 2.45825 12C2.80515 10.8955 3.33851 9.87361 4.02143 8.97118M9.87868 9.87868C10.4216 9.33579 11.1716 9 12 9C13.6569 9 15 10.3431 15 12C15 12.8284 14.6642 13.5784 14.1213 14.1213M9.87868 9.87868L14.1213 14.1213M9.87868 9.87868L6.58916 6.58916M14.1213 14.1213L6.58916 6.58916M14.1213 14.1213L17.4112 17.4112M6.58916 6.58916C8.14898 5.58354 10.0066 5 12.0004 5C16.4781 5 20.2684 7.94291 21.5426 12C20.8357 14.2507 19.3545 16.1585 17.4112 17.4112'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineeye-off
 */
export const OutlineEyeoffIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineEyeoff} {...props} />
}

const OutlineEye = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M2.45825 12C3.73253 7.94288 7.52281 5 12.0004 5C16.4781 5 20.2684 7.94291 21.5426 12C20.2684 16.0571 16.4781 19 12.0005 19C7.52281 19 3.73251 16.0571 2.45825 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineeye
 */
export const OutlineEyeIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineEye} {...props} />
}

const OutlineFastforward = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11.9333 12.8C12.4667 12.4 12.4667 11.6 11.9333 11.2L6.6 7.19998C5.94076 6.70556 5 7.17594 5 7.99998L5 16C5 16.824 5.94076 17.2944 6.6 16.8L11.9333 12.8Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M19.9333 12.8C20.4667 12.4 20.4667 11.6 19.9333 11.2L14.6 7.19998C13.9408 6.70556 13 7.17594 13 7.99998L13 16C13 16.824 13.9408 17.2944 14.6 16.8L19.9333 12.8Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinefast-forward
 */
export const OutlineFastforwardIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFastforward} {...props} />
}

const OutlineFilm = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 4V20M17 4V20M3 8H7M17 8H21M3 12H21M3 16H7M17 16H21M4 20H20C20.5523 20 21 19.5523 21 19V5C21 4.44772 20.5523 4 20 4H4C3.44772 4 3 4.44772 3 5V19C3 19.5523 3.44772 20 4 20Z'
            stroke='currentColor'
            strokeWidth='1.5'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinefilm
 */
export const OutlineFilmIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFilm} {...props} />
}

const OutlineFilter = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 4C4 3.44772 4.44772 3 5 3H19C19.5523 3 20 3.44772 20 4V6.58579C20 6.851 19.8946 7.10536 19.7071 7.29289L14.2929 12.7071C14.1054 12.8946 14 13.149 14 13.4142V18L10 21V13.4142C10 13.149 9.89464 12.8946 9.70711 12.7071L4.29289 7.29289C4.10536 7.10536 4 6.851 4 6.58579V4Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinefilter
 */
export const OutlineFilterIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFilter} {...props} />
}

const OutlineFingerprint = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11.9999 11C11.9999 14.5172 10.9911 17.7988 9.24707 20.5712M5.80688 18.5304C5.82459 18.5005 5.84273 18.4709 5.8613 18.4413C7.2158 16.2881 7.99991 13.7418 7.99991 11C7.99991 8.79086 9.79077 7 11.9999 7C14.209 7 15.9999 8.79086 15.9999 11C15.9999 12.017 15.9307 13.0186 15.7966 14M13.6792 20.8436C14.2909 19.6226 14.7924 18.3369 15.1707 17M19.0097 18.132C19.6547 15.8657 20 13.4732 20 11C20 6.58172 16.4183 3 12 3C10.5429 3 9.17669 3.38958 8 4.07026M3 15.3641C3.64066 14.0454 4 12.5646 4 11C4 9.54285 4.38958 8.17669 5.07026 7'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinefinger-print
 */
export const OutlineFingerprintIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFingerprint} {...props} />
}

const OutlineFire = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17.6569 18.6568C14.5327 21.781 9.46734 21.781 6.34315 18.6568C4.78105 17.0947 4 15.0474 4 13C4 10.9526 4.78105 8.90523 6.34315 7.34313C6.34315 7.34313 7.00004 8.99995 9.00004 9.99995C9.00004 7.99995 9.50004 4.99996 11.9859 3C14 5 16.0912 5.77745 17.6569 7.34313C19.219 8.90523 20 10.9526 20 13C20 15.0474 19.2189 17.0947 17.6569 18.6568Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M9.87868 16.1213C11.0503 17.2928 12.9497 17.2928 14.1213 16.1213C14.7071 15.5355 15 14.7677 15 14C15 13.2322 14.7071 12.4644 14.1213 11.8786C13.5392 11.2965 12.7775 11.0037 12.0146 11L10.9999 13.9999L9 14C9.00001 14.7677 9.2929 15.5355 9.87868 16.1213Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinefire
 */
export const OutlineFireIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFire} {...props} />
}

const OutlineFlag = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 21V17M3 17V5C3 3.89543 3.89543 3 5 3H11.5L12.5 4H21L18 10L21 16H12.5L11.5 15H5C3.89543 15 3 15.8954 3 17ZM12 3.5V9'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineflag
 */
export const OutlineFlagIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFlag} {...props} />
}

const OutlineFolderadd = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 13H15M12 10V16M3 17V7C3 5.89543 3.89543 5 5 5H11L13 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinefolder-add
 */
export const OutlineFolderaddIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFolderadd} {...props} />
}

const OutlineFolderdownload = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 10V16M12 16L9 13M12 16L15 13M3 17V7C3 5.89543 3.89543 5 5 5H11L13 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinefolder-download
 */
export const OutlineFolderdownloadIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFolderdownload} {...props} />
}

const OutlineFolderopen = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 19C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H9L11 7H15C16.1046 7 17 7.89543 17 9V10M5 19H19C20.1046 19 21 18.1046 21 17V12C21 10.8954 20.1046 10 19 10H9C7.89543 10 7 10.8954 7 12V17C7 18.1046 6.10457 19 5 19Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinefolder-open
 */
export const OutlineFolderopenIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFolderopen} {...props} />
}

const OutlineFolderremove = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 13H15M3 17V7C3 5.89543 3.89543 5 5 5H11L13 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinefolder-remove
 */
export const OutlineFolderremoveIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFolderremove} {...props} />
}

const OutlineFolder = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinefolder
 */
export const OutlineFolderIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFolder} {...props} />
}

const OutlineGift = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 8V21M12 8C12 8 12 6.50722 12 6C12 4.89543 12.8954 4 14 4C15.1046 4 16 4.89543 16 6C16 7.10457 15.1046 8 14 8C13.4027 8 12 8 12 8ZM12 8C12 8 12 6.06291 12 5.5C12 4.11929 10.8807 3 9.5 3C8.11929 3 7 4.11929 7 5.5C7 6.88071 8.11929 8 9.5 8C10.3178 8 12 8 12 8ZM5 12H19M5 12C3.89543 12 3 11.1046 3 10C3 8.89543 3.89543 8 5 8H19C20.1046 8 21 8.89543 21 10C21 11.1046 20.1046 12 19 12M5 12L5 19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinegift
 */
export const OutlineGiftIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineGift} {...props} />
}

const OutlineGlobealt = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 12C21 16.9706 16.9706 21 12 21M21 12C21 7.02944 16.9706 3 12 3M21 12H3M12 21C7.02944 21 3 16.9706 3 12M12 21C13.6569 21 15 16.9706 15 12C15 7.02944 13.6569 3 12 3M12 21C10.3431 21 9 16.9706 9 12C9 7.02944 10.3431 3 12 3M3 12C3 7.02944 7.02944 3 12 3'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineglobe-alt
 */
export const OutlineGlobealtIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineGlobealt} {...props} />
}

const OutlineGlobe = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3.05493 11H5C6.10457 11 7 11.8954 7 13V14C7 15.1046 7.89543 16 9 16C10.1046 16 11 16.8954 11 18V20.9451M8 3.93552V5.5C8 6.88071 9.11929 8 10.5 8H11C12.1046 8 13 8.89543 13 10C13 11.1046 13.8954 12 15 12C16.1046 12 17 11.1046 17 10C17 8.89543 17.8954 8 19 8L20.0645 8M15 20.4879V18C15 16.8954 15.8954 16 17 16H20.0645M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineglobe
 */
export const OutlineGlobeIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineGlobe} {...props} />
}

const OutlineHand = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 11.5V14M7 11.5V5.5C7 4.67157 7.67157 4 8.5 4C9.32843 4 10 4.67157 10 5.5M7 11.5C7 10.6716 6.32843 10 5.5 10C4.67157 10 4 10.6716 4 11.5V13.5C4 17.6421 7.35786 21 11.5 21C15.6421 21 19 17.6421 19 13.5V8.5C19 7.67157 18.3284 7 17.5 7C16.6716 7 16 7.67157 16 8.5M10 5.5V11M10 5.5V4.5C10 3.67157 10.6716 3 11.5 3C12.3284 3 13 3.67157 13 4.5V5.5M13 5.5V11M13 5.5C13 4.67157 13.6716 4 14.5 4C15.3284 4 16 4.67157 16 5.5V8.5M16 8.5V11'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinehand
 */
export const OutlineHandIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineHand} {...props} />
}

const OutlineHashtag = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 20L11 4M13 20L17 4M6 9H20M4 15H18'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinehashtag
 */
export const OutlineHashtagIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineHashtag} {...props} />
}

const OutlineHeart = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4.31802 6.31802C2.56066 8.07538 2.56066 10.9246 4.31802 12.682L12.0001 20.364L19.682 12.682C21.4393 10.9246 21.4393 8.07538 19.682 6.31802C17.9246 4.56066 15.0754 4.56066 13.318 6.31802L12.0001 7.63609L10.682 6.31802C8.92462 4.56066 6.07538 4.56066 4.31802 6.31802Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineheart
 */
export const OutlineHeartIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineHeart} {...props} />
}

const OutlineHome = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinehome
 */
export const OutlineHomeIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineHome} {...props} />
}

const OutlineIconuserremove = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 12H15M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7ZM3 20C3 16.6863 5.68629 14 9 14C12.3137 14 15 16.6863 15 20V21H3V20Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineicon-user-remove
 */
export const OutlineIconuserremoveIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineIconuserremove} {...props} />
}

const OutlineIdentification = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10 6H5C3.89543 6 3 6.89543 3 8V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V8C21 6.89543 20.1046 6 19 6H14M10 6V5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5V6M10 6C10 7.10457 10.8954 8 12 8C13.1046 8 14 7.10457 14 6M9 14C10.1046 14 11 13.1046 11 12C11 10.8954 10.1046 10 9 10C7.89543 10 7 10.8954 7 12C7 13.1046 7.89543 14 9 14ZM9 14C10.3062 14 11.4174 14.8348 11.8292 16M9 14C7.69378 14 6.58249 14.8348 6.17065 16M15 11H18M15 15H17'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineidentification
 */
export const OutlineIdentificationIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineIdentification} {...props} />
}

const OutlineInboxin = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H16M12 3V11M12 11L15 8M12 11L9 8M4 13H6.58579C6.851 13 7.10536 13.1054 7.29289 13.2929L9.70711 15.7071C9.89464 15.8946 10.149 16 10.4142 16H13.5858C13.851 16 14.1054 15.8946 14.2929 15.7071L16.7071 13.2929C16.8946 13.1054 17.149 13 17.4142 13H20'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineinbox-in
 */
export const OutlineInboxinIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineInboxin} {...props} />
}

const OutlineInbox = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M20 13V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V13M20 13V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V13M20 13H17.4142C17.149 13 16.8946 13.1054 16.7071 13.2929L14.2929 15.7071C14.1054 15.8946 13.851 16 13.5858 16H10.4142C10.149 16 9.89464 15.8946 9.70711 15.7071L7.29289 13.2929C7.10536 13.1054 6.851 13 6.58579 13H4'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineinbox
 */
export const OutlineInboxIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineInbox} {...props} />
}

const OutlineInformationcircle = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='12' cy='8' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineinformation-circle
 */
export const OutlineInformationcircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineInformationcircle} {...props} />
}

const OutlineKey = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 7C16.1046 7 17 7.89543 17 9M21 9C21 12.3137 18.3137 15 15 15C14.3938 15 13.8087 14.9101 13.2571 14.7429L11 17H9V19H7V21H4C3.44772 21 3 20.5523 3 20V17.4142C3 17.149 3.10536 16.8946 3.29289 16.7071L9.25707 10.7429C9.08989 10.1914 9 9.60617 9 9C9 5.68629 11.6863 3 15 3C18.3137 3 21 5.68629 21 9Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinekey
 */
export const OutlineKeyIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineKey} {...props} />
}

const OutlineLibrary = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 14V17M12 14V17M16 14V17M3 21H21M3 10H21M3 7L12 3L21 7M4 10H20V21H4V10Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelibrary
 */
export const OutlineLibraryIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLibrary} {...props} />
}

const OutlineLightbulb = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9.66347 17H14.3364M11.9999 3V4M18.3639 5.63604L17.6568 6.34315M21 11.9999H20M4 11.9999H3M6.34309 6.34315L5.63599 5.63604M8.46441 15.5356C6.51179 13.5829 6.51179 10.4171 8.46441 8.46449C10.417 6.51187 13.5829 6.51187 15.5355 8.46449C17.4881 10.4171 17.4881 13.5829 15.5355 15.5356L14.9884 16.0827C14.3555 16.7155 13.9999 17.5739 13.9999 18.469V19C13.9999 20.1046 13.1045 21 11.9999 21C10.8954 21 9.99995 20.1046 9.99995 19V18.469C9.99995 17.5739 9.6444 16.7155 9.01151 16.0827L8.46441 15.5356Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelight-bulb
 */
export const OutlineLightbulbIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLightbulb} {...props} />
}

const OutlineLightningbolt = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13 10V3L4 14H11L11 21L20 10L13 10Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelightning-bolt
 */
export const OutlineLightningboltIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLightningbolt} {...props} />
}

const OutlineLink1 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13.8284 10.1716C12.2663 8.60948 9.73367 8.60948 8.17157 10.1716L4.17157 14.1716C2.60948 15.7337 2.60948 18.2663 4.17157 19.8284C5.73367 21.3905 8.26633 21.3905 9.82843 19.8284L10.93 18.7269M10.1716 13.8284C11.7337 15.3905 14.2663 15.3905 15.8284 13.8284L19.8284 9.82843C21.3905 8.26633 21.3905 5.73367 19.8284 4.17157C18.2663 2.60948 15.7337 2.60948 14.1716 4.17157L13.072 5.27118'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelink1
 */
export const OutlineLink1Icon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLink1} {...props} />
}

const OutlineLink2 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_1_3058'
            style={{maskType: "alpha"}}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_1_3058)'>
            <path
                d='M16.9497 12.7071L19.7781 9.87868C21.3402 8.31658 21.3402 5.78392 19.7781 4.22182V4.22182C18.216 2.65972 15.6834 2.65972 14.1213 4.22182L11.2929 7.05025'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
            <path d='M15.5355 8.46446L8.46445 15.5355' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
            <path
                d='M7.05017 11.2929L4.22174 14.1213C2.65965 15.6834 2.65965 18.2161 4.22174 19.7782V19.7782C5.78384 21.3403 8.3165 21.3403 9.8786 19.7782L12.707 16.9497'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
        </g>
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelink2
 */
export const OutlineLink2Icon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLink2} {...props} />
}

const OutlineLinkout = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_1_3057'
            style={{maskType: "alpha"}}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_1_3057)'>
            <path
                d='M16.95 12.7071L19.7784 9.87868C21.3405 8.31658 21.3405 5.78392 19.7784 4.22182V4.22182C18.2163 2.65972 15.6836 2.65972 14.1215 4.22182L11.2931 7.05025'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
            <path d='M5.63623 8.46451L3.70438 7.94687' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M8.11108 5.98963L7.59345 4.05778' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M15.5356 18.3639L16.0533 20.2958' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M18.0105 15.889L19.9423 16.4067' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
            <path
                d='M7.05041 11.2929L4.22199 14.1213C2.65989 15.6834 2.65989 18.2161 4.22199 19.7782V19.7782C5.78409 21.3403 8.31675 21.3403 9.87884 19.7782L12.7073 16.9497'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
        </g>
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelinkout
 */
export const OutlineLinkoutIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLinkout} {...props} />
}

const OutlineLocationmarker = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17.6569 16.6569C16.7202 17.5935 14.7616 19.5521 13.4138 20.8999C12.6327 21.681 11.3677 21.6814 10.5866 20.9003C9.26234 19.576 7.34159 17.6553 6.34315 16.6569C3.21895 13.5327 3.21895 8.46734 6.34315 5.34315C9.46734 2.21895 14.5327 2.21895 17.6569 5.34315C20.781 8.46734 20.781 13.5327 17.6569 16.6569Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M15 11C15 12.6569 13.6569 14 12 14C10.3431 14 9 12.6569 9 11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelocation-marker
 */
export const OutlineLocationmarkerIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLocationmarker} {...props} />
}

const OutlineLockclosed = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelock-closed
 */
export const OutlineLockclosedIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLockclosed} {...props} />
}

const OutlineLockopen = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelock-open
 */
export const OutlineLockopenIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLockopen} {...props} />
}

const OutlineLog = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6.375 20.25C7.82475 20.25 9 19.0747 9 17.625C9 16.1753 7.82475 15 6.375 15C4.92525 15 3.75 16.1753 3.75 17.625C3.75 19.0747 4.92525 20.25 6.375 20.25Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M6.375 9C7.82475 9 9 7.82475 9 6.375C9 4.92525 7.82475 3.75 6.375 3.75C4.92525 3.75 3.75 4.92525 3.75 6.375C3.75 7.82475 4.92525 9 6.375 9Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M17.625 15.75C19.0747 15.75 20.25 14.5747 20.25 13.125C20.25 11.6753 19.0747 10.5 17.625 10.5C16.1753 10.5 15 11.6753 15 13.125C15 14.5747 16.1753 15.75 17.625 15.75Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M15 13.5H12.2344C11.5739 13.5013 10.9212 13.3566 10.3232 13.0762C9.72513 12.7958 9.19646 12.3867 8.775 11.8781L6.375 9V15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelog
 */
export const OutlineLogIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLog} {...props} />
}

const OutlineLog2 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M18.5 19.5C19.8807 19.5 21 18.3807 21 17C21 15.6193 19.8807 14.5 18.5 14.5C17.1193 14.5 16 15.6193 16 17C16 18.3807 17.1193 19.5 18.5 19.5Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M18.5 11.5C19.8807 11.5 21 10.3807 21 9C21 7.61929 19.8807 6.5 18.5 6.5C17.1193 6.5 16 7.61929 16 9C16 10.3807 17.1193 11.5 18.5 11.5Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M4 4V13C4 15.2091 5.79086 17 8 17H16'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M4 4V9H16' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelog2
 */
export const OutlineLog2Icon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLog2} {...props} />
}

const OutlineLogout = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17 16L21 12M21 12L17 8M21 12L7 12M13 16V17C13 18.6569 11.6569 20 10 20H6C4.34315 20 3 18.6569 3 17V7C3 5.34315 4.34315 4 6 4H10C11.6569 4 13 5.34315 13 7V8'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelogout
 */
export const OutlineLogoutIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLogout} {...props} />
}

const OutlineLogin = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11 16L7 12M7 12L11 8M7 12L21 12M16 16V17C16 18.6569 14.6569 20 13 20H6C4.34315 20 3 18.6569 3 17V7C3 5.34315 4.34315 4 6 4H13C14.6569 4 16 5.34315 16 7V8'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinelogin
 */
export const OutlineLoginIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLogin} {...props} />
}

const OutlineMailopen = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 19V10.0704C3 9.40166 3.3342 8.7772 3.8906 8.40627L10.8906 3.7396C11.5624 3.29174 12.4376 3.29174 13.1094 3.7396L20.1094 8.40627C20.6658 8.7772 21 9.40166 21 10.0704V19M3 19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19M3 19L9.75 14.5M21 19L14.25 14.5M3 10L9.75 14.5M21 10L14.25 14.5M14.25 14.5L13.1094 15.2604C12.4376 15.7083 11.5624 15.7083 10.8906 15.2604L9.75 14.5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinemail-open
 */
export const OutlineMailopenIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMailopen} {...props} />
}

const OutlineMail = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 8L10.8906 13.2604C11.5624 13.7083 12.4376 13.7083 13.1094 13.2604L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinemail
 */
export const OutlineMailIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMail} {...props} />
}

const OutlineMap = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 20L3.55279 17.2764C3.214 17.107 3 16.7607 3 16.382V5.61803C3 4.87465 3.78231 4.39116 4.44721 4.72361L9 7M9 20L15 17M9 20V7M15 17L19.5528 19.2764C20.2177 19.6088 21 19.1253 21 18.382V7.61803C21 7.23926 20.786 6.893 20.4472 6.72361L15 4M15 17V4M15 4L9 7'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinemap
 */
export const OutlineMapIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMap} {...props} />
}

const OutlineMenualt1 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 6H20M4 12H12M4 18H20'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinemenu-alt-1
 */
export const OutlineMenualt1Icon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMenualt1} {...props} />
}

const OutlineMenualt2 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 6H20M4 12H20M4 18H11'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinemenu-alt-2
 */
export const OutlineMenualt2Icon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMenualt2} {...props} />
}

const OutlineMenualt3 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 6H20M4 12H20M13 18H20'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinemenu-alt-3
 */
export const OutlineMenualt3Icon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMenualt3} {...props} />
}

const OutlineMenualt4 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 8H20M4 16H20'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinemenu-alt-4
 */
export const OutlineMenualt4Icon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMenualt4} {...props} />
}

const OutlineMenu = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 6H20M4 12H20M4 18H20'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinemenu
 */
export const OutlineMenuIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMenu} {...props} />
}

const OutlineMicrophone = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19 11C19 14.866 15.866 18 12 18M12 18C8.13401 18 5 14.866 5 11M12 18V22M12 22H8M12 22H16M12 14C10.3431 14 9 12.6569 9 11V5C9 3.34315 10.3431 2 12 2C13.6569 2 15 3.34315 15 5V11C15 12.6569 13.6569 14 12 14Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinemicrophone
 */
export const OutlineMicrophoneIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMicrophone} {...props} />
}

const OutlineMinuscircle = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 12H9M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineminus-circle
 */
export const OutlineMinuscircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMinuscircle} {...props} />
}

const OutlineMinussm = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M18 12H6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineminus-sm
 */
export const OutlineMinussmIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMinussm} {...props} />
}

const OutlineMinus = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M20 12H4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineminus
 */
export const OutlineMinusIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMinus} {...props} />
}

const OutlineMoon = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M20.3542 15.3542C19.3176 15.7708 18.1856 16.0001 17 16.0001C12.0294 16.0001 8 11.9706 8 7.00006C8 5.81449 8.22924 4.68246 8.64581 3.64587C5.33648 4.9758 3 8.21507 3 12.0001C3 16.9706 7.02944 21.0001 12 21.0001C15.785 21.0001 19.0243 18.6636 20.3542 15.3542Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinemoon
 */
export const OutlineMoonIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMoon} {...props} />
}

const OutlineMusicnote = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 19V6L21 3V16M9 19C9 20.1046 7.65685 21 6 21C4.34315 21 3 20.1046 3 19C3 17.8954 4.34315 17 6 17C7.65685 17 9 17.8954 9 19ZM21 16C21 17.1046 19.6569 18 18 18C16.3431 18 15 17.1046 15 16C15 14.8954 16.3431 14 18 14C19.6569 14 21 14.8954 21 16ZM9 10L21 7'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinemusic-note
 */
export const OutlineMusicnoteIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineMusicnote} {...props} />
}

const OutlineNewspaper = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19 20H5C3.89543 20 3 19.1046 3 18L3 6C3 4.89543 3.89543 4 5 4L15 4C16.1046 4 17 4.89543 17 6V7M19 20C17.8954 20 17 19.1046 17 18L17 7M19 20C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7L17 7M13 4L9 4M7 16H13M7 8H13V12H7V8Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinenewspaper
 */
export const OutlineNewspaperIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineNewspaper} {...props} />
}

const OutlineOfficebuilding = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21L21 21M19 21H14M5 21L3 21M5 21H10M9 6.99998H10M9 11H10M14 6.99998H15M14 11H15M10 21V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V21M10 21H14'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineoffice-building
 */
export const OutlineOfficebuildingIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineOfficebuilding} {...props} />
}

const OutlinePaperairplane = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <g clipPath='url(#clip0_1_2477)'>
            <path
                d='M10.0503 13.9497L15 21.7279L21.364 2.636L2.27208 8.99996L10.0503 13.9497ZM10.0503 13.9497L15.7071 8.29285'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </g>
        <defs>
            <clipPath id='clip0_1_2477'>
                <rect width='24' height='24' fill='white' />
            </clipPath>
        </defs>
    </svg>
)
/**
 * @description  Icon/Outline/Outlinepaper-airplane
 */
export const OutlinePaperairplaneIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePaperairplane} {...props} />
}

const OutlinePaperclip = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15.1716 7L8.58579 13.5858C7.80474 14.3668 7.80474 15.6332 8.58579 16.4142C9.36684 17.1953 10.6332 17.1953 11.4142 16.4142L17.8284 9.82843C19.3905 8.26633 19.3905 5.73367 17.8284 4.17157C16.2663 2.60948 13.7337 2.60948 12.1716 4.17157L5.75736 10.7574C3.41421 13.1005 3.41421 16.8995 5.75736 19.2426C8.1005 21.5858 11.8995 21.5858 14.2426 19.2426L20.5 13'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinepaper-clip
 */
export const OutlinePaperclipIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePaperclip} {...props} />
}

const OutlinePause = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10 9V15M14 9V15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinepause
 */
export const OutlinePauseIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePause} {...props} />
}

const OutlinePencilalt = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11 5H6C4.89543 5 4 5.89543 4 7V18C4 19.1046 4.89543 20 6 20H17C18.1046 20 19 19.1046 19 18V13M17.5858 3.58579C18.3668 2.80474 19.6332 2.80474 20.4142 3.58579C21.1953 4.36683 21.1953 5.63316 20.4142 6.41421L11.8284 15H9L9 12.1716L17.5858 3.58579Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinepencil-alt
 */
export const OutlinePencilaltIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePencilalt} {...props} />
}

const OutlinePencil = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15.2322 5.23223L18.7677 8.76777M16.7322 3.73223C17.7085 2.75592 19.2914 2.75592 20.2677 3.73223C21.244 4.70854 21.244 6.29146 20.2677 7.26777L6.5 21.0355H3V17.4644L16.7322 3.73223Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinepencil
 */
export const OutlinePencilIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePencil} {...props} />
}

const OutlinePhoneincoming = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 3L15 9M15 9V4M15 9H20M5 3C3.89543 3 3 3.89543 3 5V6C3 14.2843 9.71573 21 18 21H19C20.1046 21 21 20.1046 21 19V15.7208C21 15.2903 20.7246 14.9082 20.3162 14.7721L15.8228 13.2743C15.3507 13.1169 14.8347 13.3306 14.6121 13.7757L13.4835 16.033C11.0388 14.9308 9.06925 12.9612 7.96701 10.5165L10.2243 9.38787C10.6694 9.16531 10.8831 8.64932 10.7257 8.17721L9.22792 3.68377C9.09181 3.27543 8.70967 3 8.27924 3H5Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinephone-incoming
 */
export const OutlinePhoneincomingIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePhoneincoming} {...props} />
}

const OutlinePhonemissedcall = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16 8L18 6M18 6L20 4M18 6L16 4M18 6L20 8M5 3C3.89543 3 3 3.89543 3 5V6C3 14.2843 9.71573 21 18 21H19C20.1046 21 21 20.1046 21 19V15.7208C21 15.2903 20.7246 14.9082 20.3162 14.7721L15.8228 13.2743C15.3507 13.1169 14.8347 13.3306 14.6121 13.7757L13.4835 16.033C11.0388 14.9308 9.06925 12.9612 7.96701 10.5165L10.2243 9.38787C10.6694 9.16531 10.8831 8.64932 10.7257 8.17721L9.22792 3.68377C9.09181 3.27543 8.70967 3 8.27924 3H5Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinephone-missed-call
 */
export const OutlinePhonemissedcallIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePhonemissedcall} {...props} />
}

const OutlinePhoneoutgoing = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16 3H21M21 3V8M21 3L15 9M5 3C3.89543 3 3 3.89543 3 5V6C3 14.2843 9.71573 21 18 21H19C20.1046 21 21 20.1046 21 19V15.7208C21 15.2903 20.7246 14.9082 20.3162 14.7721L15.8228 13.2743C15.3507 13.1169 14.8347 13.3306 14.6121 13.7757L13.4835 16.033C11.0388 14.9308 9.06925 12.9612 7.96701 10.5165L10.2243 9.38787C10.6694 9.16531 10.8831 8.64932 10.7257 8.17721L9.22792 3.68377C9.09181 3.27543 8.70967 3 8.27924 3H5Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinephone-outgoing
 */
export const OutlinePhoneoutgoingIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePhoneoutgoing} {...props} />
}

const OutlinePhone = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 5C3 3.89543 3.89543 3 5 3H8.27924C8.70967 3 9.09181 3.27543 9.22792 3.68377L10.7257 8.17721C10.8831 8.64932 10.6694 9.16531 10.2243 9.38787L7.96701 10.5165C9.06925 12.9612 11.0388 14.9308 13.4835 16.033L14.6121 13.7757C14.8347 13.3306 15.3507 13.1169 15.8228 13.2743L20.3162 14.7721C20.7246 14.9082 21 15.2903 21 15.7208V19C21 20.1046 20.1046 21 19 21H18C9.71573 21 3 14.2843 3 6V5Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinephone
 */
export const OutlinePhoneIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePhone} {...props} />
}

const OutlinePhotograph = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 16L8.58579 11.4142C9.36683 10.6332 10.6332 10.6332 11.4142 11.4142L16 16M14 14L15.5858 12.4142C16.3668 11.6332 17.6332 11.6332 18.4142 12.4142L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='14' cy='8' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinephotograph
 */
export const OutlinePhotographIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePhotograph} {...props} />
}

const OutlinePlay = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M14.7519 11.1679L11.5547 9.03647C10.8901 8.59343 10 9.06982 10 9.86852V14.1315C10 14.9302 10.8901 15.4066 11.5547 14.9635L14.7519 12.8321C15.3457 12.4362 15.3457 11.5638 14.7519 11.1679Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineplay
 */
export const OutlinePlayIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePlay} {...props} />
}

const OutlinePlay2 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19.5708 11.1425C20.2182 11.5309 20.2182 12.4691 19.5708 12.8575L7.5145 20.0913C6.84797 20.4912 6 20.0111 6 19.2338L6 4.76619C6 3.98889 6.84797 3.50878 7.5145 3.9087L19.5708 11.1425Z'
            stroke='currentColor'
            strokeWidth='1.5'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineplay2
 */
export const OutlinePlay2Icon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePlay2} {...props} />
}

const OutlinePluscircle = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 9V12M12 12V15M12 12H15M12 12H9M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineplus-circle
 */
export const OutlinePluscircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePluscircle} {...props} />
}

const OutlinePlussm = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 6V12M12 12V18M12 12H18M12 12L6 12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineplus-sm
 */
export const OutlinePlussmIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePlussm} {...props} />
}

const OutlinePlus = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 4V20M20 12L4 12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineplus
 */
export const OutlinePlusIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePlus} {...props} />
}

const OutlinePresentationchartbar = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 13V12M12 13V10M16 13V8M8 21L12 17L16 21M3 4H21M4 4H20V16C20 16.5523 19.5523 17 19 17H5C4.44772 17 4 16.5523 4 16V4Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinepresentation-chart-bar
 */
export const OutlinePresentationchartbarIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePresentationchartbar} {...props} />
}

const OutlinePresentationchartline = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 4V3H3V4H4ZM20 4H21V3H20V4ZM6.29289 11.2929C5.90237 11.6834 5.90237 12.3166 6.29289 12.7071C6.68342 13.0976 7.31658 13.0976 7.70711 12.7071L6.29289 11.2929ZM10 9L10.7071 8.29289C10.3166 7.90237 9.68342 7.90237 9.29289 8.29289L10 9ZM13 12L12.2929 12.7071C12.6834 13.0976 13.3166 13.0976 13.7071 12.7071L13 12ZM17.7071 8.70711C18.0976 8.31658 18.0976 7.68342 17.7071 7.29289C17.3166 6.90237 16.6834 6.90237 16.2929 7.29289L17.7071 8.70711ZM7.29289 20.2929C6.90237 20.6834 6.90237 21.3166 7.29289 21.7071C7.68342 22.0976 8.31658 22.0976 8.70711 21.7071L7.29289 20.2929ZM12 17L12.7071 16.2929C12.3166 15.9024 11.6834 15.9024 11.2929 16.2929L12 17ZM15.2929 21.7071C15.6834 22.0976 16.3166 22.0976 16.7071 21.7071C17.0976 21.3166 17.0976 20.6834 16.7071 20.2929L15.2929 21.7071ZM3 3C2.44772 3 2 3.44772 2 4C2 4.55228 2.44772 5 3 5V3ZM21 5C21.5523 5 22 4.55228 22 4C22 3.44772 21.5523 3 21 3V5ZM4 5H20V3H4V5ZM19 4V16H21V4H19ZM19 16H5V18H19V16ZM5 16V4H3V16H5ZM5 16H3C3 17.1046 3.89543 18 5 18V16ZM19 16V18C20.1046 18 21 17.1046 21 16H19ZM7.70711 12.7071L10.7071 9.70711L9.29289 8.29289L6.29289 11.2929L7.70711 12.7071ZM9.29289 9.70711L12.2929 12.7071L13.7071 11.2929L10.7071 8.29289L9.29289 9.70711ZM13.7071 12.7071L17.7071 8.70711L16.2929 7.29289L12.2929 11.2929L13.7071 12.7071ZM8.70711 21.7071L12.7071 17.7071L11.2929 16.2929L7.29289 20.2929L8.70711 21.7071ZM11.2929 17.7071L15.2929 21.7071L16.7071 20.2929L12.7071 16.2929L11.2929 17.7071ZM3 5H21V3H3V5Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinepresentation-chart-line
 */
export const OutlinePresentationchartlineIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePresentationchartline} {...props} />
}

const OutlinePrinter = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17 17H19C20.1046 17 21 16.1046 21 15V11C21 9.89543 20.1046 9 19 9H5C3.89543 9 3 9.89543 3 11V15C3 16.1046 3.89543 17 5 17H7M9 21H15C16.1046 21 17 20.1046 17 19V15C17 13.8954 16.1046 13 15 13H9C7.89543 13 7 13.8954 7 15V19C7 20.1046 7.89543 21 9 21ZM17 9V5C17 3.89543 16.1046 3 15 3H9C7.89543 3 7 3.89543 7 5V9H17Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineprinter
 */
export const OutlinePrinterIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePrinter} {...props} />
}

const OutlinePuzzle = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11 4C11 2.89543 11.8954 2 13 2C14.1046 2 15 2.89543 15 4V5C15 5.55228 15.4477 6 16 6H19C19.5523 6 20 6.44772 20 7V10C20 10.5523 19.5523 11 19 11H18C16.8954 11 16 11.8954 16 13C16 14.1046 16.8954 15 18 15H19C19.5523 15 20 15.4477 20 16V19C20 19.5523 19.5523 20 19 20H16C15.4477 20 15 19.5523 15 19V18C15 16.8954 14.1046 16 13 16C11.8954 16 11 16.8954 11 18V19C11 19.5523 10.5523 20 10 20H7C6.44772 20 6 19.5523 6 19V16C6 15.4477 5.55228 15 5 15H4C2.89543 15 2 14.1046 2 13C2 11.8954 2.89543 11 4 11H5C5.55228 11 6 10.5523 6 10V7C6 6.44772 6.44772 6 7 6H10C10.5523 6 11 5.55228 11 5V4Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinepuzzle
 */
export const OutlinePuzzleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePuzzle} {...props} />
}

const OutlineQrcode = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13 4C13 3.44772 12.5523 3 12 3C11.4477 3 11 3.44772 11 4H13ZM11 5C11 5.55228 11.4477 6 12 6C12.5523 6 13 5.55228 13 5H11ZM18 15C17.4477 15 17 15.4477 17 16C17 16.5523 17.4477 17 18 17V15ZM20 17C20.5523 17 21 16.5523 21 16C21 15.4477 20.5523 15 20 15V17ZM12 16V15C11.4477 15 11 15.4477 11 16H12ZM14 17C14.5523 17 15 16.5523 15 16C15 15.4477 14.5523 15 14 15V17ZM11 20C11 20.5523 11.4477 21 12 21C12.5523 21 13 20.5523 13 20H11ZM13 9C13 8.44772 12.5523 8 12 8C11.4477 8 11 8.44772 11 9H13ZM12 12H11C11 12.5523 11.4477 13 12 13V12ZM16 19C15.4477 19 15 19.4477 15 20C15 20.5523 15.4477 21 16 21V19ZM20 21C20.5523 21 21 20.5523 21 20C21 19.4477 20.5523 19 20 19V21ZM4 11C3.44772 11 3 11.4477 3 12C3 12.5523 3.44772 13 4 13V11ZM8 13C8.55228 13 9 12.5523 9 12C9 11.4477 8.55228 11 8 11V13ZM12.01 13C12.5623 13 13.01 12.5523 13.01 12C13.01 11.4477 12.5623 11 12.01 11V13ZM16.01 13C16.5623 13 17.01 12.5523 17.01 12C17.01 11.4477 16.5623 11 16.01 11V13ZM20 11C19.4477 11 19 11.4477 19 12C19 12.5523 19.4477 13 20 13V11ZM20.01 13C20.5623 13 21.01 12.5523 21.01 12C21.01 11.4477 20.5623 11 20.01 11V13ZM5 5H7V3H5V5ZM7 5V7H9V5H7ZM7 7H5V9H7V7ZM5 7V5H3V7H5ZM5 7H3C3 8.10457 3.89543 9 5 9V7ZM7 7V9C8.10457 9 9 8.10457 9 7H7ZM7 5H9C9 3.89543 8.10457 3 7 3V5ZM5 3C3.89543 3 3 3.89543 3 5H5V3ZM17 5H19V3H17V5ZM19 5V7H21V5H19ZM19 7H17V9H19V7ZM17 7V5H15V7H17ZM17 7H15C15 8.10457 15.8954 9 17 9V7ZM19 7V9C20.1046 9 21 8.10457 21 7H19ZM19 5H21C21 3.89543 20.1046 3 19 3V5ZM17 3C15.8954 3 15 3.89543 15 5H17V3ZM5 17H7V15H5V17ZM7 17V19H9V17H7ZM7 19H5V21H7V19ZM5 19V17H3V19H5ZM5 19H3C3 20.1046 3.89543 21 5 21V19ZM7 19V21C8.10457 21 9 20.1046 9 19H7ZM7 17H9C9 15.8954 8.10457 15 7 15V17ZM5 15C3.89543 15 3 15.8954 3 17H5V15ZM11 4V5H13V4H11ZM18 17H20V15H18V17ZM12 17H14V15H12V17ZM11 16V20H13V16H11ZM11 9V12H13V9H11ZM16 21H20V19H16V21ZM4 13H8V11H4V13ZM12 13H12.01V11H12V13ZM20 13H20.01V11H20V13ZM12 13H16.01V11H12V13Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineqrcode
 */
export const OutlineQrcodeIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineQrcode} {...props} />
}

const OutlineQuestionmarkcircle = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.22766 9C8.77678 7.83481 10.2584 7 12.0001 7C14.2092 7 16.0001 8.34315 16.0001 10C16.0001 11.3994 14.7224 12.5751 12.9943 12.9066C12.4519 13.0106 12.0001 13.4477 12.0001 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='12' cy='17' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinequestion-mark-circle
 */
export const OutlineQuestionmarkcircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineQuestionmarkcircle} {...props} />
}

const OutlineReceiptrefund = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16 15V14C16 11.7909 14.2091 10 12 10H8M8 10L11 13M8 10L11 7M20 21V5C20 3.89543 19.1046 3 18 3H6C4.89543 3 4 3.89543 4 5V21L8 19L12 21L16 19L20 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinereceipt-refund
 */
export const OutlineReceiptrefundIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineReceiptrefund} {...props} />
}

const OutlineReceipttax = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 14L15 8M9.50003 8.5H9.51003M14.5 13.5H14.51M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21L8.5 19L12 21L15.5 19L19 21ZM10 8.5C10 8.77614 9.77614 9 9.5 9C9.22386 9 9 8.77614 9 8.5C9 8.22386 9.22386 8 9.5 8C9.77614 8 10 8.22386 10 8.5ZM15 13.5C15 13.7761 14.7761 14 14.5 14C14.2239 14 14 13.7761 14 13.5C14 13.2239 14.2239 13 14.5 13C14.7761 13 15 13.2239 15 13.5Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinereceipt-tax
 */
export const OutlineReceipttaxIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineReceipttax} {...props} />
}

const OutlineRefresh = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 4V9H4.58152M19.9381 11C19.446 7.05369 16.0796 4 12 4C8.64262 4 5.76829 6.06817 4.58152 9M4.58152 9H9M20 20V15H19.4185M19.4185 15C18.2317 17.9318 15.3574 20 12 20C7.92038 20 4.55399 16.9463 4.06189 13M19.4185 15H15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinerefresh
 */
export const OutlineRefreshIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineRefresh} {...props} />
}

const OutlineReply = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 10H13C17.4183 10 21 13.5817 21 18V20M3 10L9 16M3 10L9 4'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinereply
 */
export const OutlineReplyIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineReply} {...props} />
}

const OutlineRewind = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12.0666 11.2C11.5333 11.6 11.5333 12.4 12.0666 12.8L17.4 16.8C18.0592 17.2944 19 16.824 19 16V7.99999C19 7.17594 18.0592 6.70556 17.4 7.19999L12.0666 11.2Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M4.06663 11.2C3.53329 11.6 3.53329 12.4 4.06663 12.8L9.39996 16.8C10.0592 17.2944 11 16.824 11 16V7.99998C11 7.17594 10.0592 6.70556 9.39996 7.19998L4.06663 11.2Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinerewind
 */
export const OutlineRewindIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineRewind} {...props} />
}

const OutlineRss = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6 5C13.1797 5 19 10.8203 19 18M6 11C9.86599 11 13 14.134 13 18M7 18C7 18.5523 6.55228 19 6 19C5.44772 19 5 18.5523 5 18C5 17.4477 5.44772 17 6 17C6.55228 17 7 17.4477 7 18Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinerss
 */
export const OutlineRssIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineRss} {...props} />
}

const OutlineSaveas = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17 16V18C17 19.1046 16.1046 20 15 20H5C3.89543 20 3 19.1046 3 18V11C3 9.89543 3.89543 9 5 9H7M10 5H9C7.89543 5 7 5.89543 7 7V14C7 15.1046 7.89543 16 9 16H19C20.1046 16 21 15.1046 21 14V7C21 5.89543 20.1046 5 19 5H18M17 9L14 12M14 12L11 9M14 12L14 3'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinesave-as
 */
export const OutlineSaveasIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSaveas} {...props} />
}

const OutlineSave = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 7H5C3.89543 7 3 7.89543 3 9V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7H16M15 11L12 14M12 14L9 11M12 14L12 4'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinesave
 */
export const OutlineSaveIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSave} {...props} />
}

const OutlineScale = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 6L6 7M6 7L3 16C4.77253 17.3334 7.22866 17.3334 9.00119 16M6 7L9.00006 16M6 7L12 5M18 7L21 6M18 7L15 16C16.7725 17.3334 19.2287 17.3334 21.0012 16M18 7L21.0001 16M18 7L12 5M12 3V5M12 21V5M12 21H9M12 21H15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinescale
 */
export const OutlineScaleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineScale} {...props} />
}

const OutlineScissors = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M14.1213 14.1213L19 19M12 12L19 5M12 12L9.12132 14.8787M12 12L9.12132 9.12132M9.12132 14.8787C8.57843 14.3358 7.82843 14 7 14C5.34315 14 4 15.3431 4 17C4 18.6569 5.34315 20 7 20C8.65685 20 10 18.6569 10 17C10 16.1716 9.66421 15.4216 9.12132 14.8787ZM9.12132 9.12132C9.66421 8.57843 10 7.82843 10 7C10 5.34315 8.65685 4 7 4C5.34315 4 4 5.34315 4 7C4 8.65685 5.34315 10 7 10C7.82843 10 8.57843 9.66421 9.12132 9.12132Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinescissors
 */
export const OutlineScissorsIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineScissors} {...props} />
}

const OutlineSearchcircle = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 16L10.8787 13.1213M10.8787 13.1213C11.4216 13.6642 12.1716 14 13 14C14.6569 14 16 12.6569 16 11C16 9.34315 14.6569 8 13 8C11.3431 8 10 9.34315 10 11C10 11.8284 10.3358 12.5784 10.8787 13.1213ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinesearch-circle
 */
export const OutlineSearchcircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSearchcircle} {...props} />
}

const OutlineSearch = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinesearch
 */
export const OutlineSearchIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSearch} {...props} />
}

const OutlineSelector = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 9L12 5L16 9M16 15L12 19L8 15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineselector
 */
export const OutlineSelectorIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSelector} {...props} />
}

const OutlineServer = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 12H19M5 12C3.89543 12 3 11.1046 3 10V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V10C21 11.1046 20.1046 12 19 12M5 12C3.89543 12 3 12.8954 3 14V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V14C21 12.8954 20.1046 12 19 12M17 8H17.01M17 16H17.01'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='17' cy='8' r='1' fill='currentColor' />
        <circle cx='17' cy='16' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineserver
 */
export const OutlineServerIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineServer} {...props} />
}

const OutlineShare = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.68387 13.3419C8.88616 12.9381 9 12.4824 9 12C9 11.5176 8.88616 11.0619 8.68387 10.6581M8.68387 13.3419C8.19134 14.3251 7.17449 15 6 15C4.34315 15 3 13.6569 3 12C3 10.3431 4.34315 9 6 9C7.17449 9 8.19134 9.67492 8.68387 10.6581M8.68387 13.3419L15.3161 16.6581M8.68387 10.6581L15.3161 7.34193M15.3161 7.34193C15.8087 8.32508 16.8255 9 18 9C19.6569 9 21 7.65685 21 6C21 4.34315 19.6569 3 18 3C16.3431 3 15 4.34315 15 6C15 6.48237 15.1138 6.93815 15.3161 7.34193ZM15.3161 16.6581C15.1138 17.0619 15 17.5176 15 18C15 19.6569 16.3431 21 18 21C19.6569 21 21 19.6569 21 18C21 16.3431 19.6569 15 18 15C16.8255 15 15.8087 15.6749 15.3161 16.6581Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineshare
 */
export const OutlineShareIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineShare} {...props} />
}

const OutlineShieldcheck = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 12L11 14L15 10M20.6179 5.98433C20.4132 5.99471 20.2072 5.99996 20 5.99996C16.9265 5.99996 14.123 4.84452 11.9999 2.94433C9.87691 4.84445 7.07339 5.99984 4 5.99984C3.79277 5.99984 3.58678 5.99459 3.38213 5.98421C3.1327 6.94782 3 7.95842 3 9C3 14.5915 6.82432 19.2898 12 20.6219C17.1757 19.2898 21 14.5915 21 9C21 7.95846 20.8673 6.94791 20.6179 5.98433Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineshield-check
 */
export const OutlineShieldcheckIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineShieldcheck} {...props} />
}

const OutlineShieldexclamation = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 9V11M12 15H12.01M20.6179 5.98433C20.4132 5.99471 20.2072 5.99996 20 5.99996C16.9265 5.99996 14.123 4.84452 11.9999 2.94433C9.87691 4.84445 7.07339 5.99984 4 5.99984C3.79277 5.99984 3.58678 5.99459 3.38213 5.98421C3.1327 6.94782 3 7.95842 3 9C3 14.5915 6.82432 19.2898 12 20.6219C17.1757 19.2898 21 14.5915 21 9C21 7.95846 20.8673 6.94791 20.6179 5.98433Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='12' cy='15' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineshield-exclamation
 */
export const OutlineShieldexclamationIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineShieldexclamation} {...props} />
}

const OutlineShoppingbag = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M5 9H19L20 21H4L5 9Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineshopping-bag
 */
export const OutlineShoppingbagIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineShoppingbag} {...props} />
}

const OutlineShoppingcart = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.70711 15.2929C4.07714 15.9229 4.52331 17 5.41421 17H17M17 17C15.8954 17 15 17.8954 15 19C15 20.1046 15.8954 21 17 21C18.1046 21 19 20.1046 19 19C19 17.8954 18.1046 17 17 17ZM9 19C9 20.1046 8.10457 21 7 21C5.89543 21 5 20.1046 5 19C5 17.8954 5.89543 17 7 17C8.10457 17 9 17.8954 9 19Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineshopping-cart
 */
export const OutlineShoppingcartIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineShoppingcart} {...props} />
}

const OutlineSmviewgridadd = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17 14V20M14 17H20M6 10H8C9.10457 10 10 9.10457 10 8V6C10 4.89543 9.10457 4 8 4H6C4.89543 4 4 4.89543 4 6V8C4 9.10457 4.89543 10 6 10ZM16 10H18C19.1046 10 20 9.10457 20 8V6C20 4.89543 19.1046 4 18 4H16C14.8954 4 14 4.89543 14 6V8C14 9.10457 14.8954 10 16 10ZM6 20H8C9.10457 20 10 19.1046 10 18V16C10 14.8954 9.10457 14 8 14H6C4.89543 14 4 14.8954 4 16V18C4 19.1046 4.89543 20 6 20Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinesm-view-grid-add
 */
export const OutlineSmviewgridaddIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSmviewgridadd} {...props} />
}

const OutlineSortascending = () => (
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
 * @description  Icon/Outline/Outlinesort-ascending
 */
export const OutlineSortascendingIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSortascending} {...props} />
}

const OutlineSortdescending = () => (
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
 * @description  Icon/Outline/Outlinesort-descending
 */
export const OutlineSortdescendingIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSortdescending} {...props} />
}

const OutlineSparkles = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5 3V7M3 5H7M6 17V21M4 19H8M13 3L15.2857 9.85714L21 12L15.2857 14.1429L13 21L10.7143 14.1429L5 12L10.7143 9.85714L13 3Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinesparkles
 */
export const OutlineSparklesIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSparkles} {...props} />
}

const OutlineSpeakerphone = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M11 5.88218V19.2402C11 20.2121 10.2121 21 9.24018 21C8.49646 21 7.83302 20.5325 7.58288 19.8321L5.43647 13.6829M18 13C19.6569 13 21 11.6569 21 10C21 8.34315 19.6569 7 18 7M5.43647 13.6829C4.0043 13.0741 3 11.6543 3 10C3 7.79086 4.79086 6 6.99999 6H8.83208C12.9327 6 16.4569 4.7659 18 3L18 17C16.4569 15.2341 12.9327 14 8.83208 14L6.99998 14C6.44518 14 5.91677 13.887 5.43647 13.6829Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinespeakerphone
 */
export const OutlineSpeakerphoneIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSpeakerphone} {...props} />
}

const OutlineStar = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <g clipPath='url(#clip0_1_2413)'>
            <path
                d='M11.049 2.92664C11.3483 2.00537 12.6517 2.00538 12.951 2.92664L14.4699 7.60055C14.6038 8.01254 14.9877 8.29148 15.4209 8.29149L20.3354 8.29168C21.3041 8.29172 21.7068 9.53127 20.9232 10.1007L16.9474 12.9895C16.5969 13.2441 16.4503 13.6955 16.5841 14.1075L18.1026 18.7815C18.4019 19.7028 17.3475 20.4689 16.5638 19.8995L12.5878 17.011C12.2373 16.7564 11.7627 16.7564 11.4122 17.011L7.43622 19.8995C6.65252 20.4689 5.5981 19.7028 5.8974 18.7815L7.41589 14.1075C7.54974 13.6955 7.40309 13.2441 7.05263 12.9895L3.07683 10.1007C2.29317 9.53127 2.69592 8.29172 3.66461 8.29168L8.57911 8.29149C9.01231 8.29148 9.39623 8.01254 9.53011 7.60055L11.049 2.92664Z'
                stroke='currentColor'
                strokeWidth='1.5'
            />
        </g>
        <defs>
            <clipPath id='clip0_1_2413'>
                <rect width='24' height='24' fill='white' />
            </clipPath>
        </defs>
    </svg>
)
/**
 * @description  Icon/Outline/Outlinestar
 */
export const OutlineStarIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineStar} {...props} />
}

const OutlineStatusoffline = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19.0711 4.92894C18.6805 4.53842 18.0474 4.53842 17.6569 4.92894C17.2663 5.31946 17.2663 5.95263 17.6569 6.34315L19.0711 4.92894ZM18.364 18.364L17.6569 19.0711H17.6569L18.364 18.364ZM16.2426 7.75737C15.8521 7.36684 15.219 7.36684 14.8284 7.75737C14.4379 8.14789 14.4379 8.78106 14.8284 9.17158L16.2426 7.75737ZM15.5355 15.5355L14.8284 16.2426L14.8284 16.2427L15.5355 15.5355ZM7.75736 16.2427C8.14788 16.6332 8.78105 16.6332 9.17157 16.2427C9.5621 15.8521 9.5621 15.219 9.17157 14.8284L7.75736 16.2427ZM8.03998 12.5662C7.96233 12.0194 7.45612 11.6391 6.90932 11.7167C6.36252 11.7943 5.9822 12.3005 6.05984 12.8473L8.03998 12.5662ZM4.92893 19.0711C5.31946 19.4616 5.95262 19.4616 6.34315 19.0711C6.73367 18.6806 6.73367 18.0474 6.34315 17.6569L4.92893 19.0711ZM4.41704 9.44452C4.59296 8.921 4.31118 8.354 3.78767 8.17807C3.26415 8.00215 2.69714 8.28393 2.52122 8.80744L4.41704 9.44452ZM3.70711 2.29289C3.31658 1.90237 2.68342 1.90237 2.29289 2.29289C1.90237 2.68342 1.90237 3.31658 2.29289 3.70711L3.70711 2.29289ZM20.2929 21.7071C20.6834 22.0976 21.3166 22.0976 21.7071 21.7071C22.0976 21.3166 22.0976 20.6834 21.7071 20.2929L20.2929 21.7071ZM17.6569 6.34315C20.781 9.46735 20.781 14.5327 17.6569 17.6569L19.0711 19.0711C22.9763 15.1658 22.9763 8.83418 19.0711 4.92894L17.6569 6.34315ZM14.8284 9.17158C16.3905 10.7337 16.3905 13.2663 14.8284 14.8284L16.2426 16.2427C18.5858 13.8995 18.5858 10.1005 16.2426 7.75737L14.8284 9.17158ZM12 12H14C14 10.8954 13.1046 10 12 10V12ZM9.17157 14.8284C8.5339 14.1908 8.15753 13.394 8.03998 12.5662L6.05984 12.8473C6.2362 14.0894 6.80287 15.2882 7.75736 16.2427L9.17157 14.8284ZM6.34315 17.6569C4.1231 15.4368 3.47919 12.2354 4.41704 9.44452L2.52122 8.80744C1.35084 12.2902 2.15154 16.2937 4.92893 19.0711L6.34315 17.6569ZM12 12L12 12V10C11.448 10 10.9466 10.225 10.5858 10.5858L12 12ZM2.29289 3.70711L10.5858 12L12 10.5858L3.70711 2.29289L2.29289 3.70711ZM10.5858 12L12 13.4142L13.4142 12L12 10.5858L10.5858 12ZM12 13.4142L14.8284 16.2426L16.2426 14.8284L13.4142 12L12 13.4142ZM14.8284 16.2427L17.6569 19.0711L19.0711 17.6569L16.2426 14.8284L14.8284 16.2427ZM17.6569 19.0711L20.2929 21.7071L21.7071 20.2929L19.0711 17.6569L17.6569 19.0711ZM12 12L12 12L13.4142 13.4142C13.7751 13.0534 14 12.552 14 12H12Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinestatus-offline
 */
export const OutlineStatusofflineIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineStatusoffline} {...props} />
}

const OutlineStatusonline = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5.63604 18.364C2.12132 14.8492 2.12132 9.15077 5.63604 5.63605M18.364 5.63605C21.8787 9.15077 21.8787 14.8492 18.364 18.364M8.46447 15.5355C6.51184 13.5829 6.51184 10.4171 8.46447 8.46447M15.5355 8.46447C17.4882 10.4171 17.4882 13.5829 15.5355 15.5355M13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinestatus-online
 */
export const OutlineStatusonlineIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineStatusonline} {...props} />
}

const OutlineStop = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M9 10C9 9.44772 9.44772 9 10 9H14C14.5523 9 15 9.44772 15 10V14C15 14.5523 14.5523 15 14 15H10C9.44772 15 9 14.5523 9 14V10Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinestop
 */
export const OutlineStopIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineStop} {...props} />
}

const OutlineSun = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 3V4M12 20V21M21 12H20M4 12H3M18.364 18.364L17.6569 17.6569M6.34315 6.34315L5.63604 5.63604M18.364 5.63609L17.6569 6.3432M6.3432 17.6569L5.63609 18.364M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinesun
 */
export const OutlineSunIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSun} {...props} />
}

const OutlineSupport = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M20 12C20 16.4183 16.4183 20 12 20V22C17.5228 22 22 17.5228 22 12H20ZM12 20C7.58172 20 4 16.4183 4 12H2C2 17.5228 6.47715 22 12 22V20ZM4 12C4 7.58172 7.58172 4 12 4V2C6.47715 2 2 6.47715 2 12H4ZM12 4C16.4183 4 20 7.58172 20 12H22C22 6.47715 17.5228 2 12 2V4ZM15 12C15 13.6569 13.6569 15 12 15V17C14.7614 17 17 14.7614 17 12H15ZM12 15C10.3431 15 9 13.6569 9 12H7C7 14.7614 9.23858 17 12 17V15ZM9 12C9 10.3431 10.3431 9 12 9V7C9.23858 7 7 9.23858 7 12H9ZM12 9C13.6569 9 15 10.3431 15 12H17C17 9.23858 14.7614 7 12 7V9ZM17.6569 4.92893L14.1213 8.46447L15.5355 9.87868L19.0711 6.34315L17.6569 4.92893ZM14.1213 15.5355L17.6569 19.0711L19.0711 17.6569L15.5355 14.1213L14.1213 15.5355ZM9.87868 8.46447L6.34315 4.92893L4.92893 6.34315L8.46447 9.87868L9.87868 8.46447ZM8.46447 14.1213L4.92893 17.6569L6.34315 19.0711L9.87868 15.5355L8.46447 14.1213Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinesupport
 */
export const OutlineSupportIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSupport} {...props} />
}

const OutlineSwitchhorizontal = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 7L20 7M20 7L16 3M20 7L16 11M16 17L4 17M4 17L8 21M4 17L8 13'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineswitch-horizontal
 */
export const OutlineSwitchhorizontalIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSwitchhorizontal} {...props} />
}

const OutlineSwitchvertical = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M7 16V4M7 4L3 8M7 4L11 8'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M17 8V20M17 20L21 16M17 20L13 16'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineswitch-vertical
 */
export const OutlineSwitchverticalIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSwitchvertical} {...props} />
}

const OutlineTable = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 10H21M3 14H21M12 10V18M5 18H19C20.1046 18 21 17.1046 21 16V8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z'
            stroke='currentColor'
            strokeWidth='1.5'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinetable
 */
export const OutlineTableIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineTable} {...props} />
}

const OutlineTag = () => (
    // <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
    //     <path
    //         d='M13.5 3.67709L12.7503 4.33882C12.764 4.35438 12.7782 4.36952 12.7929 4.38419L13.5 3.67709ZM20.3229 13.5L19.6612 12.7503C19.6456 12.764 19.6305 12.7782 19.6158 12.7929L20.3229 13.5ZM20.5 10.6771L21.2497 10.0154C21.236 9.99979 21.2218 9.98466 21.2071 9.96998L20.5 10.6771ZM10.6771 20.5L9.96998 21.2071C9.98466 21.2218 9.99979 21.236 10.0154 21.2497L10.6771 20.5ZM13.3229 20.5L13.9846 21.2497C14.0002 21.236 14.0153 21.2218 14.03 21.2071L13.3229 20.5ZM3.67709 13.5L4.38419 12.7929L4.36217 12.7709L4.33882 12.7503L3.67709 13.5ZM7 6C6.44772 6 6 6.44772 6 7C6 7.55228 6.44772 8 7 8V6ZM7.01 8C7.56228 8 8.01 7.55228 8.01 7C8.01 6.44772 7.56228 6 7.01 6V8ZM4 7C4 5.34315 5.34315 4 7 4V2C4.23858 2 2 4.23858 2 7H4ZM4 12V7H2V12H4ZM7 4H12V2H7V4ZM12 4C12.2985 4 12.5656 4.12956 12.7503 4.33882L14.2497 3.01535C13.7015 2.3942 12.8962 2 12 2V4ZM20 12C20 12.2985 19.8704 12.5656 19.6612 12.7503L20.9846 14.2497C21.6058 13.7015 22 12.8962 22 12H20ZM19.7503 11.3388C19.9064 11.5157 20 11.7457 20 12H22C22 11.2398 21.716 10.5436 21.2497 10.0154L19.7503 11.3388ZM12 20C11.7457 20 11.5157 19.9064 11.3388 19.7503L10.0154 21.2497C10.5436 21.716 11.2398 22 12 22V20ZM12.6612 19.7503C12.4843 19.9064 12.2543 20 12 20V22C12.7602 22 13.4564 21.716 13.9846 21.2497L12.6612 19.7503ZM4.33882 12.7503C4.12956 12.5656 4 12.2985 4 12H2C2 12.8962 2.3942 13.7015 3.01535 14.2497L4.33882 12.7503ZM12.7929 4.38419L19.7929 11.3842L21.2071 9.96998L14.2071 2.96998L12.7929 4.38419ZM11.3842 19.7929L4.38419 12.7929L2.96998 14.2071L9.96998 21.2071L11.3842 19.7929ZM19.6158 12.7929L12.6158 19.7929L14.03 21.2071L21.03 14.2071L19.6158 12.7929ZM7 8H7.01V6H7V8Z'
    //         fill='currentColor'
    //     />
    //     <circle cx='7' cy='7' r='1' fill='currentColor' />
    // </svg>
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13.5 3.67709L12.7503 4.33882C12.764 4.35438 12.7782 4.36952 12.7929 4.38419L13.5 3.67709ZM20.3229 13.5L19.6612 12.7503C19.6456 12.764 19.6305 12.7782 19.6158 12.7929L20.3229 13.5ZM20.5 10.6771L21.2497 10.0154C21.236 9.99979 21.2218 9.98466 21.2071 9.96998L20.5 10.6771ZM10.6771 20.5L9.96998 21.2071C9.98466 21.2218 9.99979 21.236 10.0154 21.2497L10.6771 20.5ZM13.3229 20.5L13.9846 21.2497C14.0002 21.236 14.0153 21.2218 14.03 21.2071L13.3229 20.5ZM3.67709 13.5L4.38419 12.7929L4.36217 12.7709L4.33882 12.7503L3.67709 13.5ZM4 7C4 5.34315 5.34315 4 7 4V2C4.23858 2 2 4.23858 2 7H4ZM4 12V7H2V12H4ZM7 4H12V2H7V4ZM12 4C12.2985 4 12.5656 4.12956 12.7503 4.33882L14.2497 3.01535C13.7015 2.3942 12.8962 2 12 2V4ZM20 12C20 12.2985 19.8704 12.5656 19.6612 12.7503L20.9846 14.2497C21.6058 13.7015 22 12.8962 22 12H20ZM19.7503 11.3388C19.9064 11.5157 20 11.7457 20 12H22C22 11.2398 21.716 10.5436 21.2497 10.0154L19.7503 11.3388ZM12 20C11.7457 20 11.5157 19.9064 11.3388 19.7503L10.0154 21.2497C10.5436 21.716 11.2398 22 12 22V20ZM12.6612 19.7503C12.4843 19.9064 12.2543 20 12 20V22C12.7602 22 13.4564 21.716 13.9846 21.2497L12.6612 19.7503ZM4.33882 12.7503C4.12956 12.5656 4 12.2985 4 12H2C2 12.8962 2.3942 13.7015 3.01535 14.2497L4.33882 12.7503ZM12.7929 4.38419L19.7929 11.3842L21.2071 9.96998L14.2071 2.96998L12.7929 4.38419ZM11.3842 19.7929L4.38419 12.7929L2.96998 14.2071L9.96998 21.2071L11.3842 19.7929ZM19.6158 12.7929L12.6158 19.7929L14.03 21.2071L21.03 14.2071L19.6158 12.7929Z'
            fill='currentColor'
        />
        <circle cx='7.5' cy='7.5' r='1.5' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinetag
 */
export const OutlineTagIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineTag} {...props} />
}

const OutlineTemplate = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinetemplate
 */
export const OutlineTemplateIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineTemplate} {...props} />
}

const OutlineTerminal = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 9L11 12L8 15M13 15H16M5 20H19C20.1046 20 21 19.1046 21 18V6C21 4.89543 20.1046 4 19 4H5C3.89543 4 3 4.89543 3 6V18C3 19.1046 3.89543 20 5 20Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineterminal
 */
export const OutlineTerminalIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineTerminal} {...props} />
}

const OutlineThumbdown = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10 14H5.2361C3.74934 14 2.78235 12.4354 3.44725 11.1056L6.94725 4.10557C7.28603 3.42801 7.97856 3 8.7361 3H12.7538C12.9173 3 13.0803 3.02005 13.2389 3.05972L17 4M10 14V19C10 20.1046 10.8955 21 12 21H12.0955C12.5951 21 13 20.595 13 20.0955C13 19.3812 13.2115 18.6828 13.6077 18.0885L17 13V4M10 14H12M17 4H19C20.1046 4 21 4.89543 21 6V12C21 13.1046 20.1046 14 19 14H16.5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinethumb-down
 */
export const OutlineThumbdownIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineThumbdown} {...props} />
}

const OutlineThumbup = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M14 10H18.7639C20.2507 10 21.2177 11.5646 20.5528 12.8944L17.0528 19.8944C16.714 20.572 16.0215 21 15.2639 21H11.2462C11.0827 21 10.9198 20.9799 10.7611 20.9403L7 20M14 10V5C14 3.89543 13.1046 3 12 3H11.9045C11.405 3 11 3.40497 11 3.90453C11 4.61883 10.7886 5.31715 10.3923 5.91149L7 11V20M14 10H12M7 20H5C3.89543 20 3 19.1046 3 18V12C3 10.8954 3.89543 10 5 10H7.5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinethumb-up
 */
export const OutlineThumbupIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineThumbup} {...props} />
}

const OutlineThumbupActive = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            d='M1.59961 8.39961C1.59961 7.73687 2.13687 7.19961 2.79961 7.19961C3.46235 7.19961 3.99961 7.73687 3.99961 8.39961V13.1996C3.99961 13.8624 3.46235 14.3996 2.79961 14.3996C2.13687 14.3996 1.59961 13.8624 1.59961 13.1996V8.39961Z'
            fill='currentColor'
        />
        <path
            d='M4.79961 8.26628V12.6108C4.79961 13.2168 5.14201 13.7708 5.68407 14.0418L5.72394 14.0618C6.16828 14.2839 6.65824 14.3996 7.15503 14.3996H11.4879C12.2506 14.3996 12.9073 13.8613 13.0569 13.1134L14.0169 8.3134C14.2149 7.32333 13.4576 6.39961 12.4479 6.39961H9.59961V3.19961C9.59961 2.31595 8.88326 1.59961 7.99961 1.59961C7.55778 1.59961 7.19961 1.95778 7.19961 2.39961V2.93294C7.19961 3.62533 6.97504 4.29903 6.55961 4.85294L5.43961 6.34628C5.02418 6.90018 4.79961 7.57389 4.79961 8.26628Z'
            fill='currentColor'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinethumb-up-active
 */
export const OutlineThumbupActiveIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineThumbupActive} {...props} />
}

const OutlineTicket = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 5V7M15 11V13M15 17V19M5 5C3.89543 5 3 5.89543 3 7V10C4.10457 10 5 10.8954 5 12C5 13.1046 4.10457 14 3 14V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V14C19.8954 14 19 13.1046 19 12C19 10.8954 19.8954 10 21 10V7C21 5.89543 20.1046 5 19 5H5Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineticket
 */
export const OutlineTicketIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineTicket} {...props} />
}

const OutlineTranslate = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 5H15M9 3V5M10.0482 14.5C8.52083 12.9178 7.28073 11.0565 6.41187 9M12.5 18H19.5M11 21L16 11L21 21M12.7511 5C11.7831 10.7702 8.06969 15.6095 3 18.129'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinetranslate
 */
export const OutlineTranslateIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineTranslate} {...props} />
}

const OutlineTrash = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinetrash
 */
export const OutlineTrashIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineTrash} {...props} />
}

const OutlineTrendingdown = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13 17H21M21 17V9M21 17L13 9L9 13L3 7'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinetrending-down
 */
export const OutlineTrendingdownIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineTrendingdown} {...props} />
}

const OutlineTrendingup = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13 7H21M21 7V15M21 7L13 15L9 11L3 17'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinetrending-up
 */
export const OutlineTrendingupIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineTrendingup} {...props} />
}

const OutlineTruck = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13 16V6C13 5.44772 12.5523 5 12 5H4C3.44772 5 3 5.44772 3 6V16C3 16.5523 3.44772 17 4 17H5M13 16C13 16.5523 12.5523 17 12 17H9M13 16L13 8C13 7.44772 13.4477 7 14 7H16.5858C16.851 7 17.1054 7.10536 17.2929 7.29289L20.7071 10.7071C20.8946 10.8946 21 11.149 21 11.4142V16C21 16.5523 20.5523 17 20 17H19M13 16C13 16.5523 13.4477 17 14 17H15M5 17C5 18.1046 5.89543 19 7 19C8.10457 19 9 18.1046 9 17M5 17C5 15.8954 5.89543 15 7 15C8.10457 15 9 15.8954 9 17M15 17C15 18.1046 15.8954 19 17 19C18.1046 19 19 18.1046 19 17M15 17C15 15.8954 15.8954 15 17 15C18.1046 15 19 15.8954 19 17'
            stroke='currentColor'
            strokeWidth='1.5'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinetruck
 */
export const OutlineTruckIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineTruck} {...props} />
}

const OutlineUpload = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16M16 8L12 4M12 4L8 8M12 4L12 16'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineupload
 */
export const OutlineUploadIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineUpload} {...props} />
}

const OutlineUseradd = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M18 9V12M18 12V15M18 12H21M18 12H15M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7ZM3 20C3 16.6863 5.68629 14 9 14C12.3137 14 15 16.6863 15 20V21H3V20Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineuser-add
 */
export const OutlineUseraddIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineUseradd} {...props} />
}

const OutlineUsercircle = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5.12104 17.8037C7.15267 16.6554 9.4998 16 12 16C14.5002 16 16.8473 16.6554 18.879 17.8037M15 10C15 11.6569 13.6569 13 12 13C10.3431 13 9 11.6569 9 10C9 8.34315 10.3431 7 12 7C13.6569 7 15 8.34315 15 10ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineuser-circle
 */
export const OutlineUsercircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineUsercircle} {...props} />
}

const OutlineUsergroup = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17 20H22V18C22 16.3431 20.6569 15 19 15C18.0444 15 17.1931 15.4468 16.6438 16.1429M17 20H7M17 20V18C17 17.3438 16.8736 16.717 16.6438 16.1429M7 20H2V18C2 16.3431 3.34315 15 5 15C5.95561 15 6.80686 15.4468 7.35625 16.1429M7 20V18C7 17.3438 7.12642 16.717 7.35625 16.1429M7.35625 16.1429C8.0935 14.301 9.89482 13 12 13C14.1052 13 15.9065 14.301 16.6438 16.1429M15 7C15 8.65685 13.6569 10 12 10C10.3431 10 9 8.65685 9 7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7ZM21 10C21 11.1046 20.1046 12 19 12C17.8954 12 17 11.1046 17 10C17 8.89543 17.8954 8 19 8C20.1046 8 21 8.89543 21 10ZM7 10C7 11.1046 6.10457 12 5 12C3.89543 12 3 11.1046 3 10C3 8.89543 3.89543 8 5 8C6.10457 8 7 8.89543 7 10Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineuser-group
 */
export const OutlineUsergroupIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineUsergroup} {...props} />
}

const OutlineUser = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineuser
 */
export const OutlineUserIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineUser} {...props} />
}

const OutlineUsers = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12 4.35418C12.7329 3.52375 13.8053 3 15 3C17.2091 3 19 4.79086 19 7C19 9.20914 17.2091 11 15 11C13.8053 11 12.7329 10.4762 12 9.64582M15 21H3V20C3 16.6863 5.68629 14 9 14C12.3137 14 15 16.6863 15 20V21ZM15 21H21V20C21 16.6863 18.3137 14 15 14C13.9071 14 12.8825 14.2922 12 14.8027M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineusers
 */
export const OutlineUsersIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineUsers} {...props} />
}

const OutlineVariable = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4.87104 4C3.67341 6.40992 3 9.12632 3 12C3 14.8737 3.67341 17.5901 4.87104 20M19.0001 20C20.1977 17.5901 20.8711 14.8737 20.8711 12C20.8711 9.12632 20.1977 6.40992 19.0001 4M9 9H10.2457C10.6922 9 11.0846 9.29598 11.2072 9.72528L12.7928 15.2747C12.9154 15.704 13.3078 16 13.7543 16H15M16 9H15.9199C15.336 9 14.7813 9.25513 14.4014 9.69842L9.59864 15.3016C9.21868 15.7449 8.66398 16 8.08013 16H8'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinevariable
 */
export const OutlineVariableIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineVariable} {...props} />
}

const OutlineVideocamera = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinevideo-camera
 */
export const OutlineVideocameraIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineVideocamera} {...props} />
}

const OutlineViewboards = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 17V7M9 17C9 18.1046 8.10457 19 7 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H7C8.10457 5 9 5.89543 9 7M9 17C9 18.1046 9.89543 19 11 19H13C14.1046 19 15 18.1046 15 17M9 7C9 5.89543 9.89543 5 11 5H13C14.1046 5 15 5.89543 15 7M15 17V7M15 17C15 18.1046 15.8954 19 17 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H17C15.8954 5 15 5.89543 15 7'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineview-boards
 */
export const OutlineViewboardsIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineViewboards} {...props} />
}

const OutlineViewgrid = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 6C4 4.89543 4.89543 4 6 4H8C9.10457 4 10 4.89543 10 6V8C10 9.10457 9.10457 10 8 10H6C4.89543 10 4 9.10457 4 8V6Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M14 6C14 4.89543 14.8954 4 16 4H18C19.1046 4 20 4.89543 20 6V8C20 9.10457 19.1046 10 18 10H16C14.8954 10 14 9.10457 14 8V6Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M4 16C4 14.8954 4.89543 14 6 14H8C9.10457 14 10 14.8954 10 16V18C10 19.1046 9.10457 20 8 20H6C4.89543 20 4 19.1046 4 18V16Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M14 16C14 14.8954 14.8954 14 16 14H18C19.1046 14 20 14.8954 20 16V18C20 19.1046 19.1046 20 18 20H16C14.8954 20 14 19.1046 14 18V16Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineview-grid
 */
export const OutlineViewgridIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineViewgrid} {...props} />
}

const OutlineViewlist = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 6H20M4 10H20M4 14H20M4 18H20'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlineview-list
 */
export const OutlineViewlistIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineViewlist} {...props} />
}

const OutlineVolumeoff = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M17 14L19 12M19 12L21 10M19 12L17 10M19 12L21 14M5.58579 15.0001H4C3.44772 15.0001 3 14.5523 3 14.0001V10.0001C3 9.44777 3.44772 9.00005 4 9.00005H5.58579L10.2929 4.29294C10.9229 3.66298 12 4.10915 12 5.00005V19.0001C12 19.891 10.9229 20.3371 10.2929 19.7072L5.58579 15.0001Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinevolume-off
 */
export const OutlineVolumeoffIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineVolumeoff} {...props} />
}

const OutlineVolumeup = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M15.5355 8.46448C17.4881 10.4171 17.4881 13.5829 15.5355 15.5355M18.364 5.63599C21.8787 9.15071 21.8787 14.8492 18.364 18.3639M5.58579 15.0001H4C3.44772 15.0001 3 14.5523 3 14.0001V10.0001C3 9.44777 3.44772 9.00005 4 9.00005H5.58579L10.2929 4.29294C10.9229 3.66298 12 4.10915 12 5.00005V19.0001C12 19.891 10.9229 20.3371 10.2929 19.7072L5.58579 15.0001Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinevolume-up
 */
export const OutlineVolumeupIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineVolumeup} {...props} />
}

const OutlineWifi = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.11107 16.4039C10.259 14.256 13.7414 14.256 15.8892 16.4039M12.0002 20H12.0102M4.92913 12.9289C8.83437 9.02371 15.166 9.0237 19.0713 12.9289M1.39355 9.3934C7.25142 3.53553 16.7489 3.53553 22.6068 9.3934'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
        <circle cx='12' cy='20' r='1' fill='currentColor' />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinewifi
 */
export const OutlineWifiIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineWifi} {...props} />
}

const OutlineXcircle = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10 14L12 12M12 12L14 10M12 12L10 10M12 12L14 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinex-circle
 */
export const OutlineXcircleIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineXcircle} {...props} />
}

const OutlineX = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6 18L18 6M6 6L18 18'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinex
 */
export const OutlineXIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineX} {...props} />
}

const OutlineZoomin = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 21L15 15M10 7V10M10 10V13M10 10H13M10 10H7M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinezoom-in
 */
export const OutlineZoominIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineZoomin} {...props} />
}

const OutlineZoomout = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 21L15 15M13 10H7M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outlinezoom-out
 */
export const OutlineZoomoutIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineZoomout} {...props} />
}

const OutlineLoading = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outline加载
 */
export const OutlineLoadingIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLoading} {...props} />
}

const OutlineBigview = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect
            x='4'
            y='4'
            width='16'
            height='16'
            rx='2'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outline大窗口
 */
export const OutlineBigviewIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineBigview} {...props} />
}

const OutlineArrowBigUp = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            d='M5.99998 14V6.66667H3.33331L7.99998 2L12.6666 6.66667H9.99998V14H5.99998Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/arrow-big-up
 */
export const OutlineArrowBigUpIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineArrowBigUp} {...props} />
}

const OutlineStorage = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M20.25 8.55938V19.5C20.25 19.6989 20.171 19.8897 20.0303 20.0303C19.8897 20.171 19.6989 20.25 19.5 20.25H4.5C4.30109 20.25 4.11032 20.171 3.96967 20.0303C3.82902 19.8897 3.75 19.6989 3.75 19.5V4.5C3.75 4.30109 3.82902 4.11033 3.96967 3.96967C4.11032 3.82902 4.30109 3.75 4.5 3.75H15.4406C15.538 3.74966 15.6345 3.76853 15.7246 3.80553C15.8147 3.84253 15.8966 3.89694 15.9656 3.96563L20.0344 8.03438C20.1031 8.10341 20.1575 8.18532 20.1945 8.27541C20.2315 8.36549 20.2503 8.46199 20.25 8.55938V8.55938Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M7.5 20.25V14.25C7.5 14.0511 7.57902 13.8603 7.71967 13.7197C7.86032 13.579 8.05109 13.5 8.25 13.5H15.75C15.9489 13.5 16.1397 13.579 16.2803 13.7197C16.421 13.8603 16.5 14.0511 16.5 14.25V20.25'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M14.25 6.75H9' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  Icon/Outline/Outline存储
 */
export const OutlineStorageIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineStorage} {...props} />
}

const OutlineImport = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M10 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M20 4C17 4 12 8 12 13'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M15 12L12 15L9 12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outline导入
 */
export const OutlineImportIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineImport} {...props} />
}

const OutlineExport = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 9H5C3.89543 9 3 9.89543 3 11V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V11C21 9.89543 20.1046 9 19 9H16M9 6L12 3M12 3L15 6M12 3V13'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outline导出
 */
export const OutlineExportIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineExport} {...props} />
}

const OutlineEngine = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M12.5 13L14 10M6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM14 15C14 16.1046 13.1046 17 12 17C10.8954 17 10 16.1046 10 15C10 13.8954 10.8954 13 12 13C13.1046 13 14 13.8954 14 15Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/引擎
 */
export const OutlineEngineIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineEngine} {...props} />
}

const OutlineScreenshot = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M2 5H5M19 19V22M22 19H7C5.89543 19 5 18.1046 5 17V2M9 5H17C18.1046 5 19 5.89543 19 7V15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outline截图
 */
export const OutlineScreenshotIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineScreenshot} {...props} />
}

const OutlineWarp = () => (
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
 * @description  Icon/Outline/Outline换行
 */
export const OutlineWarpIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineWarp} {...props} />
}

const OutlineFilterate = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 7H20M6 12H18M9 17H15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outline筛选
 */
export const OutlineFilterateIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineFilterate} {...props} />
}

const OutlineRemote = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect
            x='2'
            y='3'
            width='20'
            height='15'
            rx='2'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M8.99991 12.1715V6.99997M8.99991 6.99997L14.1715 7M8.99991 6.99997L16 14'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M8 21H16' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  Icon/Outline/Outline远程
 */
export const OutlineRemoteIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineRemote} {...props} />
}

const OutlineExit = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 4C7.6534 4.1716 7.31947 4.3648 7 4.57784C4.58803 6.18626 3 8.92538 3 12.034C3 16.9858 7.02944 21 12 21C16.9706 21 21 16.9858 21 12.034C21 8.92538 19.412 6.18626 17 4.57784C16.6805 4.3648 16.3466 4.1716 16 4M12 2V10'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outline退出
 */
export const OutlineExitIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineExit} {...props} />
}

const OutlinePayload = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_17364_13205'
            style={{maskType: "alpha"}}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='16'
            height='16'
        >
            <rect width='16' height='16' fill='currentColor' />
        </mask>
        <g mask='url(#mask0_17364_13205)'>
            <rect x='2.6665' y='2' width='10.6667' height='12' rx='2' stroke='currentColor' />
            <path
                d='M5.3335 2V7.17153C5.3335 7.24587 5.41173 7.29422 5.47822 7.26097L6.62211 6.68903C6.65026 6.67495 6.6834 6.67495 6.71155 6.68903L7.85544 7.26097C7.92193 7.29422 8.00016 7.24587 8.00016 7.17153V2'
                stroke='currentColor'
                strokeLinecap='square'
            />
            <path
                d='M2.6665 12.6668C2.6665 11.9304 3.26346 11.3335 3.99984 11.3335H13.3332V12.0002C13.3332 13.1047 12.4377 14.0002 11.3332 14.0002H3.99984C3.26346 14.0002 2.6665 13.4032 2.6665 12.6668V12.6668Z'
                stroke='currentColor'
            />
            <rect x='2.6665' y='2' width='10.6667' height='12' rx='2' stroke='currentColor' />
        </g>
    </svg>
)
/**
 * @description  Icon/Outline/Payload
 * WebFuzzer 页面中下载下来的，图标库中没有这个图标  2023.8.28
 */
export const OutlinePayloadIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePayload} {...props} />
}

const OutlineClose = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        <path
            d='M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M9 3V21' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
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
 * @description:  Icon/Outline/close
 */
export const OutlineCloseIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineClose} {...props} />
}

const OutlineOpen = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        <path
            d='M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M9 3V21' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
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
 * @description:  Icon/Outline/open
 */
export const OutlineOpenIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineOpen} {...props} />
}

const OutlinePaintbrush = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M18.37 2.62999L14 6.99999L12.41 5.40999C12.0353 5.03749 11.5284 4.8284 11 4.8284C10.4716 4.8284 9.96473 5.03749 9.59 5.40999L8 6.99999L17 16L18.59 14.41C18.9625 14.0353 19.1716 13.5284 19.1716 13C19.1716 12.4716 18.9625 11.9647 18.59 11.59L17 9.99999L21.37 5.62999C21.7678 5.23216 21.9913 4.6926 21.9913 4.12999C21.9913 3.56738 21.7678 3.02781 21.37 2.62999C20.9722 2.23216 20.4326 2.00867 19.87 2.00867C19.3074 2.00867 18.7678 2.23216 18.37 2.62999Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M9 8C7 11 5 11.5 2 12L10 22C12 21 16 17 16 15'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description:  Icon/Outline/paintbrush
 */
export const OutlinePaintbrushIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinePaintbrush} {...props} />
}

const OutlineStore = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        <path
            d='M20.25 8.55938V19.5C20.25 19.6989 20.171 19.8897 20.0303 20.0303C19.8897 20.171 19.6989 20.25 19.5 20.25H4.5C4.30109 20.25 4.11032 20.171 3.96967 20.0303C3.82902 19.8897 3.75 19.6989 3.75 19.5V4.5C3.75 4.30109 3.82902 4.11033 3.96967 3.96967C4.11032 3.82902 4.30109 3.75 4.5 3.75H15.4406C15.538 3.74966 15.6345 3.76853 15.7246 3.80553C15.8147 3.84253 15.8966 3.89694 15.9656 3.96563L20.0344 8.03438C20.1031 8.10341 20.1575 8.18532 20.1945 8.27541C20.2315 8.36549 20.2503 8.46199 20.25 8.55938V8.55938Z'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M7.5 20.25V14.25C7.5 14.0511 7.57902 13.8603 7.71967 13.7197C7.86032 13.579 8.05109 13.5 8.25 13.5H15.75C15.9489 13.5 16.1397 13.579 16.2803 13.7197C16.421 13.8603 16.5 14.0511 16.5 14.25V20.25'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M14.25 6.75H9' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  Icon/Outline/存储
 */
export const OutlineStoreIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineStore} {...props} />
}

const OutlineWrench = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'>
        <path
            d='M4.77377 6.13832L7.82103 9.18558M11.8808 13.2454L9.55631 10.9209M14.9777 2.02887C13.5544 1.28595 11.7569 1.51217 10.5615 2.70755C9.36613 3.90292 9.1399 5.70045 9.88282 7.12374L2.55257 14.454C2.16204 14.8445 2.16204 15.4777 2.55257 15.8682L2.74015 16.0558C3.13067 16.4463 3.76384 16.4463 4.15436 16.0558L11.4846 8.72553C12.9079 9.46845 14.7054 9.24223 15.9008 8.04685C17.0962 6.85148 17.3224 5.05395 16.5795 3.63066L14.566 5.64416C14.2711 5.93905 13.793 5.93905 13.4981 5.64416L12.9642 5.11023C12.6693 4.81535 12.6693 4.33725 12.9642 4.04237L14.9777 2.02887ZM14.589 14.3517L13.3888 13.1516C12.9983 12.7611 12.3652 12.7611 11.9746 13.1516L11.787 13.3392C11.3965 13.7297 11.3965 14.3629 11.7871 14.7534L12.9872 15.9535C13.3777 16.344 14.0109 16.344 14.4014 15.9535L14.589 15.7659C14.9795 15.3754 14.9795 14.7422 14.589 14.3517ZM1.26476 4.76503L2.9988 6.49907C3.38932 6.88959 4.02249 6.88959 4.41301 6.49907L5.13452 5.77756C5.52505 5.38704 5.52504 4.75387 5.13452 4.36335L3.40048 2.62931C3.00995 2.23878 2.37679 2.23878 1.98626 2.62931L1.26476 3.35081C0.874233 3.74134 0.874233 4.3745 1.26476 4.76503Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/wrench
 */
export const OutlineWrenchIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineWrench} {...props} />
}

const OutlineOnlinePlugin = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_30847_28410'
            style={{maskType: "alpha"}}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='16'
            height='16'
        >
            <rect width='16' height='16' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_30847_28410)'>
            <path
                d='M15.3333 6L7.99996 0.666668L0.666626 6'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M2.66663 8.66667V13C2.66663 13.5523 3.11434 14 3.66663 14H12.3333C12.8856 14 13.3333 13.5523 13.3333 13V7.33333'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M2.66663 10.6667H5.99996V14H3.66663C3.11434 14 2.66663 13.5523 2.66663 13V10.6667Z'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M6 10.6667H7.33333C8.4379 10.6667 9.33333 11.5621 9.33333 12.6667V14H6V10.6667Z'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M2.66663 9C2.66663 8.07952 3.41282 7.33333 4.33329 7.33333V7.33333C5.25377 7.33333 5.99996 8.07952 5.99996 9V10.6667H2.66663V9Z'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </g>
    </svg>
)
/**
 * @description  Icon/Outline/插件仓库
 */
export const OutlineOnlinePluginIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineOnlinePlugin} {...props} />
}

const OutlineOwnPlugin = () => (
    <svg width='16' height='17' viewBox='0 0 16 17' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M1.69702 6.31818V3.28788C1.69702 2.85275 2.04977 2.5 2.4849 2.5H5.55211C6.10827 2.5 6.63932 2.73159 7.01775 3.13916L7.21217 3.34855H12.3334C12.7685 3.34855 13.1213 3.7013 13.1213 4.13643V4.86364'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M1.69702 6.01522C1.69702 5.46294 2.14474 5.01522 2.69702 5.01522H13.3031C13.8554 5.01522 14.3031 5.46294 14.3031 6.01522V13.1971C14.3031 13.7494 13.8554 14.1971 13.3031 14.1971H2.69702C2.14474 14.1971 1.69702 13.7494 1.69702 13.1971V6.01522Z'
            stroke='currentColor'
        />
        <circle
            cx='7.99995'
            cy='8.01515'
            r='1.57576'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M10.3636 11.9547C10.3636 10.6493 9.30539 9.59104 7.99999 9.59104C6.69459 9.59104 5.63635 10.6493 5.63635 11.9547'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <ellipse
            cx='7.99995'
            cy='8.01513'
            rx='1.57576'
            ry='1.57576'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

/**
 * @description  Icon/Outline/我的插件
 */
export const OutlineOwnPluginIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineOwnPlugin} {...props} />
}

const OutlineLocalPlugin = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <rect
            x='1.33337'
            y='2.66667'
            width='13.3333'
            height='9.33333'
            rx='1'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M7.99996 4.66667V8.66667M7.99996 8.66667L6.66663 7.55556M7.99996 8.66667L9.33329 7.55556'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M6 10H10' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M4.66663 14H11.3333' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  Icon/Outline/本地插件
 */
export const OutlineLocalPluginIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineLocalPlugin} {...props} />
}

const OutlineTrashSecond = () => (
    <svg width='16' height='17' viewBox='0 0 16 17' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M13.25 4.79631L12.5995 13.7907C12.5434 14.566 11.8903 15.1667 11.1033 15.1667H4.89668C4.10972 15.1667 3.45656 14.566 3.40049 13.7907L2.75 4.79631M13.25 4.79631H10.25M13.25 4.79631H14M2.75 4.79631H2M2.75 4.79631H5.75M10.25 4.79631V2.57408C10.25 2.16498 9.91421 1.83334 9.5 1.83334H6.5C6.08579 1.83334 5.75 2.16498 5.75 2.57408V4.79631M10.25 4.79631H5.75'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M6.53853 10.2592L6.05139 11.0926H7.09995M9.46137 10.2592L9.94851 11.0926H8.89995M7.40522 8.77662L7.99995 7.75925L8.59467 8.77662'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/trash-2
 */
export const OutlineTrashSecondIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineTrashSecond} {...props} />
}

const OutlineModScanPortData = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'>
        <mask id='mask0_30057_207490' maskUnits='userSpaceOnUse' x='0' y='0' width='18' height='18'>
            <rect width='18' height='18' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_30057_207490)'>
            <path
                d='M13.5 6H14.5C15.6046 6 16.5 6.89543 16.5 8V13C16.5 14.1046 15.6046 15 14.5 15H3.5C2.39543 15 1.5 14.1046 1.5 13V8C1.5 6.89543 2.39543 6 3.5 6H4.5'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M13.5 6V4.75C13.5 4.19772 13.0523 3.75 12.5 3.75H12M4.5 6V4.75C4.5 4.19772 4.94772 3.75 5.5 3.75H6'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M12 3.75V3.25C12 2.69772 11.5523 2.25 11 2.25H7C6.44772 2.25 6 2.69772 6 3.25V3.75'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path d='M4.5 9V12' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M6.75 9V12' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M9 9V12' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M11.25 9V12' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M13.5 9V12' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
        </g>
    </svg>
)
/**
 * @description UI Kit/Icon/Outline/端口资产
 */
export const OutlineModScanPortDataIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={OutlineModScanPortData} {...props} />
}

const OutlineStethoscope = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M5.56667 3.29222C5.56993 3.35015 5.59123 3.40557 5.62755 3.45065C5.66386 3.49573 5.71336 3.52819 5.76902 3.54342C5.82469 3.55865 5.88371 3.55589 5.93773 3.53553C5.99175 3.51517 6.03804 3.47824 6.07004 3.42997C6.10204 3.3817 6.11813 3.32452 6.11604 3.26654C6.11396 3.20856 6.09379 3.15271 6.0584 3.1069C6.023 3.06108 5.97418 3.02761 5.91883 3.01124C5.86349 2.99487 5.80442 2.99641 5.75 3.01566H4.83333C4.3471 3.01566 3.88079 3.20991 3.53697 3.55568C3.19315 3.90145 3 4.37041 3 4.8594V9.46877C3 10.9357 3.57946 12.3426 4.61091 13.3799C5.64236 14.4172 7.04131 15 8.5 15C9.95869 15 11.3576 14.4172 12.3891 13.3799C13.4205 12.3426 14 10.9357 14 9.46877V4.8594C14 4.37041 13.8068 3.90145 13.463 3.55568C13.1192 3.20991 12.6529 3.01566 12.1667 3.01566H11.25C11.2319 3.03382 11.2176 3.05538 11.2078 3.0791C11.1981 3.10283 11.193 3.12826 11.193 3.15394C11.193 3.17962 11.1981 3.20505 11.2078 3.22878C11.2176 3.2525 11.2319 3.27406 11.25 3.29222C11.2681 3.31038 11.2895 3.32479 11.3131 3.33461C11.3367 3.34444 11.362 3.3495 11.3875 3.3495C11.413 3.3495 11.4383 3.34444 11.4619 3.33461C11.4855 3.32479 11.5069 3.31038 11.525 3.29222'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M8 15.7V15.6C8 17.0322 8.57946 18.4057 9.61091 19.4184C10.6424 20.4311 12.0413 21 13.5 21C14.9587 21 16.3576 20.4311 17.3891 19.4184C18.4205 18.4057 19 17.0322 19 15.6V12'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M19 12C20.1046 12 21 11.1046 21 10C21 8.89543 20.1046 8 19 8C17.8954 8 17 8.89543 17 10C17 11.1046 17.8954 12 19 12Z'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/stethoscope
 */
export const OutlineStethoscopeIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineStethoscope} {...props} />
}

const OutlineDeprecated = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M23 12H1M20.1818 12C20.1818 16.4183 16.5187 20 12 20C7.48131 20 3.81818 16.4183 3.81818 12C3.81818 7.58172 7.48131 4 12 4C16.5187 4 20.1818 7.58172 20.1818 12Z'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/弃用
 */
export const OutlineDeprecatedIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineDeprecated} {...props} />
}

const OutlineSplitScreen = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            d='M12.6667 2.6665H3.33333C2.59695 2.6665 2 3.19713 2 3.85169V12.148C2 12.8025 2.59695 13.3332 3.33333 13.3332H12.6667C13.403 13.3332 14 12.8025 14 12.148V3.85169C14 3.19713 13.403 2.6665 12.6667 2.6665Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M14 8L2 8' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  Icon/Outline/分屏
 */
export const OutlineSplitScreenIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineSplitScreen} {...props} />
}

const OutlileHistory = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        <path
            d='M1 12H5L7.5 16.5L10.5 3.5L14 20.5L17 8L18.5 12H23'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/流量
 */
export const OutlileHistoryIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlileHistory} {...props} />
}


const OutlinCompile = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' fill='none'>
        <path
            d='M8.3335 18.3332H5.00016C4.55814 18.3332 4.13421 18.1576 3.82165 17.845C3.50909 17.5325 3.3335 17.1085 3.3335 16.6665V3.33317C3.3335 2.89114 3.50909 2.46722 3.82165 2.15466C4.13421 1.8421 4.55814 1.6665 5.00016 1.6665H12.0835L16.6668 6.24984V11.4582M11.6668 1.6665V6.6665H16.6668M16.221 14.1665L18.3335 16.2498L16.221 18.3332M12.946 18.3332L10.8335 16.2498L12.946 14.1665'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outline编译
 */
export const OutlinCompileIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinCompile} {...props} />
}

const OutlinCompileTwo = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <path
            d='M7.33333 10.6665L8.66667 5.33317M10 6.6665L11.3333 7.99984L10 9.33317M6 9.33317L4.66667 7.99984L6 6.6665M3.33333 13.3332H12.6667C13.403 13.3332 14 12.7362 14 11.9998V3.99984C14 3.26346 13.403 2.6665 12.6667 2.6665H3.33333C2.59695 2.6665 2 3.26346 2 3.99984V11.9998C2 12.7362 2.59695 13.3332 3.33333 13.3332Z'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  Icon/Outline/Outline编译2
 */
export const OutlinCompileTwoIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlinCompileTwo} {...props} />
}
