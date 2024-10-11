import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
    ref?: any
}

const type = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M4 7V4H20V7' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M9 20H15' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M12 4V20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  icon/type
 */
export const IconType = (props: Partial<IconProps>) => {
    return <Icon component={type} {...props} />
}

const bold = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' fill='none'>
        <path
            d='M5 3.33337H11.6667C12.5507 3.33337 13.3986 3.68456 14.0237 4.30968C14.6488 4.93481 15 5.78265 15 6.66671C15 7.55076 14.6488 8.39861 14.0237 9.02373C13.3986 9.64885 12.5507 10 11.6667 10H5V3.33337Z'
            stroke='currentColor'
            strokeWidth='1.2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M5 10H12.5C13.3841 10 14.2319 10.3512 14.857 10.9763C15.4821 11.6014 15.8333 12.4493 15.8333 13.3333C15.8333 14.2174 15.4821 15.0652 14.857 15.6904C14.2319 16.3155 13.3841 16.6667 12.5 16.6667H5V10Z'
            stroke='currentColor'
            strokeWidth='1.2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  icon/bold
 */
export const IconBold = (props: Partial<IconProps>) => {
    return <Icon component={bold} {...props} />
}

const strikethrough = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M16 4H8.99999C8.51991 3.99975 8.04679 4.11471 7.62036 4.33524C7.19393 4.55576 6.82665 4.8754 6.54938 5.26731C6.2721 5.65921 6.09293 6.11194 6.02691 6.58745C5.9609 7.06297 6.00996 7.54738 6.16999 8'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M14 12C15.0609 12 16.0783 12.4214 16.8284 13.1716C17.5786 13.9217 18 14.9391 18 16C18 17.0609 17.5786 18.0783 16.8284 18.8284C16.0783 19.5786 15.0609 20 14 20H6'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M4 12H20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  icon/strikethrough
 */
export const IconStrikethrough = (props: Partial<IconProps>) => {
    return <Icon component={strikethrough} {...props} />
}

const italic = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M19 4H10' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M14 20H5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M15 4L9 20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  icon/italic
 */
export const IconItalic = (props: Partial<IconProps>) => {
    return <Icon component={italic} {...props} />
}

const underline = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6 4V10C6 11.5913 6.63214 13.1174 7.75736 14.2426C8.88258 15.3679 10.4087 16 12 16C13.5913 16 15.1174 15.3679 16.2426 14.2426C17.3679 13.1174 18 11.5913 18 10V4'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M4 20H20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  icon/underline
 */
export const IconUnderline = (props: Partial<IconProps>) => {
    return <Icon component={underline} {...props} />
}

const code2 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M18 16L22 12L18 8'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M6 8L2 12L6 16' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M14.5 4L9.5 20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description  icon/code-2
 */
export const IconCode2 = (props: Partial<IconProps>) => {
    return <Icon component={code2} {...props} />
}

const heading1 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M4 12H12' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M4 18V6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M12 18V6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path
            d='M17 12L20 10V18'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  icon/heading-1
 */
export const IconHeading1 = (props: Partial<IconProps>) => {
    return <Icon component={heading1} {...props} />
}

const heading2 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M4 12H12' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M4 18V6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M12 18V6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path
            d='M21 17.9999H17C17 13.9999 21 14.9999 21 11.9999C21 10.4999 19 9.49994 17 10.9999'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  icon/heading-2
 */
export const IconHeading2 = (props: Partial<IconProps>) => {
    return <Icon component={heading2} {...props} />
}

const heading3 = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M4 12H12' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M4 18V6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M12 18V6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path
            d='M17.5 10.4999C19.2 9.49994 21 10.4999 21 11.9999C21 12.5304 20.7893 13.0391 20.4142 13.4142C20.0391 13.7892 19.5304 13.9999 19 13.9999'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M17 17.5C19 19 21 17.8 21 16C21 15.4696 20.7893 14.9609 20.4142 14.5858C20.0391 14.2107 19.5304 14 19 14'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  icon/heading-3
 */
export const IconHeading3 = (props: Partial<IconProps>) => {
    return <Icon component={heading3} {...props} />
}

const listOrdered = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M10 6H21' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M10 12H21' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M10 18H21' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M4 6H5V10' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M4 10H6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path
            d='M6 18H4C4 17 6 16 6 15C6 14 5 13.5 4 14'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description  icon/list-ordered
 */
export const IconListOrdered = (props: Partial<IconProps>) => {
    return <Icon component={listOrdered} {...props} />
}

const list = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M8 6H21' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M8 12H21' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M8 18H21' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M3 6H3.01' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M3 12H3.01' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M3 18H3.01' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description icon/list
 */
export const IconList = (props: Partial<IconProps>) => {
    return <Icon component={list} {...props} />
}

const checkSquare = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M9 11L12 14L22 4'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description icon/check-square
 */
export const IconCheckSquare = (props: Partial<IconProps>) => {
    return <Icon component={checkSquare} {...props} />
}

const curlyBraces = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8 3H7C6.46957 3 5.96086 3.21071 5.58579 3.58579C5.21071 3.96086 5 4.46957 5 5V10C5 10.5304 4.78929 11.0391 4.41421 11.4142C4.03914 11.7893 3.53043 12 3 12C3.53043 12 4.03914 12.2107 4.41421 12.5858C4.78929 12.9609 5 13.4696 5 14V19C5 20.1 5.9 21 7 21H8'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M16 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V14C19 12.9 19.9 12 21 12C20.4696 12 19.9609 11.7893 19.5858 11.4142C19.2107 11.0391 19 10.5304 19 10V5C19 4.46957 18.7893 3.96086 18.4142 3.58579C18.0391 3.21071 17.5304 3 17 3H16'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description icon/curly-braces
 */
export const IconCurlyBraces = (props: Partial<IconProps>) => {
    return <Icon component={curlyBraces} {...props} />
}

const quote = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M3 21C6 21 10 20 10 13V5.00003C10 3.75003 9.244 2.98303 8 3.00003H4C2.75 3.00003 2 3.75003 2 4.97203V11C2 12.25 2.75 13 4 13C5 13 5 13 5 14V15C5 16 4 17 3 17C2 17 2 17.008 2 18.031V20C2 21 2 21 3 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M15 21C18 21 22 20 22 13V5.00003C22 3.75003 21.243 2.98303 20 3.00003H16C14.75 3.00003 14 3.75003 14 4.97203V11C14 12.25 14.75 13 16 13H16.75C16.75 15.25 17 17 14 17V20C14 21 14 21 15 21Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/**
 * @description icon/quote
 */
export const IconQuote = (props: Partial<IconProps>) => {
    return <Icon component={quote} {...props} />
}
