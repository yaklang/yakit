import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
}

const User = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='72' height='76' viewBox='0 0 72 76' fill='none'>
        <rect width='72' height='72' rx='36' fill='#F8F8F8' />
        <g filter='url(#filter0_d_19397_119165)'>
            <mask id='path-2-inside-1_19397_119165' fill='white'>
                <path d='M52 54C54.2091 54 56.0342 52.1971 55.6697 50.0182C55.4158 48.5008 55.0169 47.0133 54.4776 45.581C53.4725 42.9118 51.9993 40.4865 50.1421 38.4437C48.285 36.4008 46.0802 34.7803 43.6537 33.6746C41.2272 32.569 38.6264 32 36 32C33.3736 32 30.7728 32.569 28.3463 33.6747C25.9198 34.7803 23.715 36.4008 21.8579 38.4437C20.0007 40.4865 18.5275 42.9118 17.5224 45.581C16.9831 47.0133 16.5842 48.5008 16.3303 50.0182C15.9658 52.1971 17.7909 54 20 54L36 54H52Z' />
            </mask>
            <path
                d='M52 54C54.2091 54 56.0342 52.1971 55.6697 50.0182C55.4158 48.5008 55.0169 47.0133 54.4776 45.581C53.4725 42.9118 51.9993 40.4865 50.1421 38.4437C48.285 36.4008 46.0802 34.7803 43.6537 33.6746C41.2272 32.569 38.6264 32 36 32C33.3736 32 30.7728 32.569 28.3463 33.6747C25.9198 34.7803 23.715 36.4008 21.8579 38.4437C20.0007 40.4865 18.5275 42.9118 17.5224 45.581C16.9831 47.0133 16.5842 48.5008 16.3303 50.0182C15.9658 52.1971 17.7909 54 20 54L36 54H52Z'
                fill='url(#paint0_linear_19397_119165)'
                stroke='url(#paint1_linear_19397_119165)'
                strokeWidth='4'
                mask='url(#path-2-inside-1_19397_119165)'
            />
            <g filter='url(#filter1_b_19397_119165)'>
                <circle cx='36' cy='24' r='12' fill='#FFBF9D' fillOpacity='0.6' />
                <circle cx='36' cy='24' r='11.5' stroke='url(#paint2_linear_19397_119165)' />
            </g>
            <g filter='url(#filter2_b_19397_119165)'>
                <circle cx='36' cy='24' r='11.25' stroke='url(#paint3_linear_19397_119165)' strokeWidth='1.5' />
            </g>
            <path
                d='M32 28C32.3489 28.4212 32.7432 28.7877 33.1733 29.0878C34.0048 29.668 34.9703 30 36 30C37.0297 30 37.9952 29.668 38.8267 29.0878C39.2568 28.7877 39.6511 28.4212 40 28'
                stroke='white'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </g>
        <defs>
            <filter
                id='filter0_d_19397_119165'
                x='4.2832'
                y='4'
                width='63.4336'
                height='66'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
            >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feColorMatrix
                    in='SourceAlpha'
                    type='matrix'
                    values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                    result='hardAlpha'
                />
                <feOffset dy='4' />
                <feGaussianBlur stdDeviation='6' />
                <feComposite in2='hardAlpha' operator='out' />
                <feColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 0.513726 0 0 0 0 0.27451 0 0 0 0.3 0' />
                <feBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_19397_119165' />
                <feBlend mode='normal' in='SourceGraphic' in2='effect1_dropShadow_19397_119165' result='shape' />
            </filter>
            <filter
                id='filter1_b_19397_119165'
                x='18'
                y='6'
                width='36'
                height='36'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
            >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feGaussianBlur in='BackgroundImageFix' stdDeviation='3' />
                <feComposite in2='SourceAlpha' operator='in' result='effect1_backgroundBlur_19397_119165' />
                <feBlend mode='normal' in='SourceGraphic' in2='effect1_backgroundBlur_19397_119165' result='shape' />
            </filter>
            <filter
                id='filter2_b_19397_119165'
                x='18'
                y='6'
                width='36'
                height='36'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
            >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feGaussianBlur in='BackgroundImageFix' stdDeviation='3' />
                <feComposite in2='SourceAlpha' operator='in' result='effect1_backgroundBlur_19397_119165' />
                <feBlend mode='normal' in='SourceGraphic' in2='effect1_backgroundBlur_19397_119165' result='shape' />
            </filter>
            <linearGradient
                id='paint0_linear_19397_119165'
                x1='36'
                y1='37.5'
                x2='36'
                y2='54'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#FF3A00' />
                <stop offset='1' stopColor='#FF9052' />
            </linearGradient>
            <linearGradient
                id='paint1_linear_19397_119165'
                x1='36'
                y1='32'
                x2='36'
                y2='76'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#FF5318' stopOpacity='0' />
                <stop offset='1' stopColor='#F0400A' />
            </linearGradient>
            <linearGradient
                id='paint2_linear_19397_119165'
                x1='36'
                y1='12'
                x2='36'
                y2='36'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='white' stopOpacity='0.6' />
                <stop offset='1' stopColor='white' stopOpacity='0.1' />
            </linearGradient>
            <linearGradient
                id='paint3_linear_19397_119165'
                x1='24'
                y1='13.5'
                x2='51.5735'
                y2='30.0441'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='white' stopOpacity='0.4' />
                <stop offset='0.854778' stopColor='white' />
            </linearGradient>
        </defs>
    </svg>
)

/**
 * @description:  头像
 */
export const UserIcon = (props: Partial<IconProps>) => {
    return <Icon component={User} {...props} />
}
