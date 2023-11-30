import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
    ref?: any
}

const OutlineAddPayload = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'>
        <mask
            id='mask0_20841_40734'
            style={{maskType: "alpha"}}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='16'
            height='16'
        >
            <rect width='16' height='16' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_20841_40734)'>
            <path
                d='M5.83329 2V1.5H4.83329V2H5.83329ZM5.42977 7.28509L5.20617 6.83788H5.20617L5.42977 7.28509ZM6.63681 6.68157L6.86042 7.12879L6.86042 7.12879L6.63681 6.68157ZM6.69644 6.68157L6.47283 7.12879L6.47283 7.12879L6.69644 6.68157ZM7.90348 7.28509L7.67987 7.73231V7.73231L7.90348 7.28509ZM8.49996 2C8.49996 1.72386 8.2761 1.5 7.99996 1.5C7.72382 1.5 7.49996 1.72386 7.49996 2H8.49996ZM7.99996 11.8333C8.2761 11.8333 8.49996 11.6095 8.49996 11.3333C8.49996 11.0572 8.2761 10.8333 7.99996 10.8333V11.8333ZM7.99996 14.5C8.2761 14.5 8.49996 14.2761 8.49996 14C8.49996 13.7239 8.2761 13.5 7.99996 13.5V14.5ZM12.8333 8C12.8333 8.27614 13.0571 8.5 13.3333 8.5C13.6094 8.5 13.8333 8.27614 13.8333 8H12.8333ZM12.5 10C12.5 9.72386 12.2761 9.5 12 9.5C11.7238 9.5 11.5 9.72386 11.5 10H12.5ZM11.5 14C11.5 14.2761 11.7238 14.5 12 14.5C12.2761 14.5 12.5 14.2761 12.5 14H11.5ZM14 12.5C14.2761 12.5 14.5 12.2761 14.5 12C14.5 11.7239 14.2761 11.5 14 11.5V12.5ZM9.99996 11.5C9.72382 11.5 9.49996 11.7239 9.49996 12C9.49996 12.2761 9.72382 12.5 9.99996 12.5V11.5ZM4.83329 2V7.22546H5.83329V2H4.83329ZM5.65338 7.73231L6.86042 7.12879L6.4132 6.23436L5.20617 6.83788L5.65338 7.73231ZM6.47283 7.12879L7.67987 7.73231L8.12708 6.83788L6.92005 6.23436L6.47283 7.12879ZM8.49996 7.22546V2H7.49996V7.22546H8.49996ZM7.67987 7.73231C8.05665 7.9207 8.49996 7.64671 8.49996 7.22546H7.49996C7.49996 6.90333 7.83896 6.69382 8.12708 6.83788L7.67987 7.73231ZM6.86042 7.12879C6.73843 7.18979 6.59483 7.18979 6.47283 7.12879L6.92005 6.23436C6.76052 6.15459 6.57274 6.15459 6.4132 6.23436L6.86042 7.12879ZM4.83329 7.22546C4.83329 7.64672 5.2766 7.92069 5.65338 7.73231L5.20617 6.83788C5.49429 6.69382 5.83329 6.90333 5.83329 7.22546H4.83329ZM3.99996 11.8333H7.99996V10.8333H3.99996V11.8333ZM7.99996 13.5H3.99996V14.5H7.99996V13.5ZM2.16663 12.6667C2.16663 13.6792 2.98744 14.5 3.99996 14.5V13.5C3.53972 13.5 3.16663 13.1269 3.16663 12.6667H2.16663ZM3.16663 12.6667C3.16663 12.2064 3.53972 11.8333 3.99996 11.8333V10.8333C2.98744 10.8333 2.16663 11.6541 2.16663 12.6667H3.16663ZM3.99996 2.5H12V1.5H3.99996V2.5ZM3.16663 12.6667V3.33333H2.16663V12.6667H3.16663ZM12.8333 3.33333V8H13.8333V3.33333H12.8333ZM12 2.5C12.4602 2.5 12.8333 2.8731 12.8333 3.33333H13.8333C13.8333 2.32081 13.0125 1.5 12 1.5V2.5ZM3.99996 1.5C2.98744 1.5 2.16663 2.32081 2.16663 3.33333H3.16663C3.16663 2.8731 3.53972 2.5 3.99996 2.5V1.5ZM11.5 10V12H12.5V10H11.5ZM11.5 12V14H12.5V12H11.5ZM14 11.5H12V12.5H14V11.5ZM12 11.5H9.99996V12.5H12V11.5Z'
                fill='currentColor'
            />
        </g>
    </svg>
)
/**
 * @description  UI Kit/Icon/Outline/Add Payload
 */
export const OutlineAddPayloadIcon = (props: Partial<IconProps>) => {
    return <Icon component={OutlineAddPayload} {...props} />
}

const Property = () => (
    <svg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <g id='Frame 314/icon/Property 24'>
            <path
                id='Vector'
                d='M20.345 8.67831L18.2317 6.56498C17.7633 6.09665 17.1275 5.83331 16.4642 5.83331H4.16667C3.24583 5.83331 2.5 6.57915 2.5 7.49998V32.5C2.5 33.4208 3.24583 34.1666 4.16667 34.1666H35.8333C36.7542 34.1666 37.5 33.4208 37.5 32.5V10.8333C37.5 9.91248 36.7542 9.16665 35.8333 9.16665H21.5233C21.0817 9.16665 20.6575 8.99081 20.345 8.67831Z'
                fill='url(#paint0_linear_17020_244238)'
            />
            <path
                id='Vector_2'
                d='M17.9883 12.0117L20.7117 9.28835C20.7892 9.21085 20.895 9.16669 21.0058 9.16669H35.8333C36.7542 9.16669 37.5 9.91252 37.5 10.8334V32.5C37.5 33.4209 36.7542 34.1667 35.8333 34.1667H4.16667C3.24583 34.1667 2.5 33.4209 2.5 32.5V12.9167C2.5 12.6867 2.68667 12.5 2.91667 12.5H16.81C17.2517 12.5 17.6758 12.3242 17.9883 12.0117Z'
                fill='url(#paint1_linear_17020_244238)'
            />
            <circle id='Ellipse 340' cx='33.3332' cy='30' r='6.66667' fill='url(#paint2_linear_17020_244238)' />
            <g id='Plus'>
                <path id='Vector_3' d='M30.4688 30H36.1979' stroke='white' strokeWidth='1.5' strokeLinecap='round' />
                <path
                    id='Vector_4'
                    d='M33.333 27.1354V32.8645'
                    stroke='white'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                />
            </g>
        </g>
        <defs>
            <linearGradient
                id='paint0_linear_17020_244238'
                x1='20'
                y1='5.58998'
                x2='20'
                y2='12.4808'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#EBA600' />
                <stop offset='1' stopColor='#C28200' />
            </linearGradient>
            <linearGradient
                id='paint1_linear_17020_244238'
                x1='20'
                y1='9.04502'
                x2='20'
                y2='34.1525'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#FFD869' />
                <stop offset='1' stopColor='#FEC52B' />
            </linearGradient>
            <linearGradient
                id='paint2_linear_17020_244238'
                x1='28.3332'
                y1='35.4166'
                x2='38.7498'
                y2='25'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#28B46B' />
                <stop offset='1' stopColor='#0D8A49' />
            </linearGradient>
        </defs>
    </svg>
)

/**
 * @description  Frame 314/icon/Property 24
 */
export const PropertyIcon = (props: Partial<IconProps>) => {
    return <Icon component={Property} {...props} />
}

const PropertyNoAdd = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64' fill='none'>
        <path
            d='M32.552 13.8853L29.1707 10.504C28.4213 9.75467 27.404 9.33334 26.3427 9.33334H6.66667C5.19333 9.33334 4 10.5267 4 12V52C4 53.4733 5.19333 54.6667 6.66667 54.6667H57.3333C58.8067 54.6667 60 53.4733 60 52V17.3333C60 15.86 58.8067 14.6667 57.3333 14.6667H34.4373C33.7307 14.6667 33.052 14.3853 32.552 13.8853Z'
            fill='url(#paint0_linear_17512_272923)'
        />
        <path
            d='M28.7813 19.2187L33.1387 14.8613C33.2627 14.7373 33.432 14.6667 33.6093 14.6667H57.3333C58.8067 14.6667 60 15.86 60 17.3333V52C60 53.4733 58.8067 54.6667 57.3333 54.6667H6.66667C5.19333 54.6667 4 53.4733 4 52V20.6667C4 20.2987 4.29867 20 4.66667 20H26.896C27.6027 20 28.2813 19.7187 28.7813 19.2187Z'
            fill='url(#paint1_linear_17512_272923)'
        />
        <defs>
            <linearGradient
                id='paint0_linear_17512_272923'
                x1='32'
                y1='8.944'
                x2='32'
                y2='19.9693'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#EBA600' />
                <stop offset='1' stopColor='#C28200' />
            </linearGradient>
            <linearGradient
                id='paint1_linear_17512_272923'
                x1='32'
                y1='14.472'
                x2='32'
                y2='54.644'
                gradientUnits='userSpaceOnUse'
            >
                <stop stop-color='#FFD869' />
                <stop offset='1' stop-color='#FEC52B' />
            </linearGradient>
        </defs>
    </svg>
)

/**
 * @description  Frame 314/icon/Property 24
 */
export const PropertyNoAddIcon = (props: Partial<IconProps>) => {
    return <Icon component={PropertyNoAdd} {...props} />
}
