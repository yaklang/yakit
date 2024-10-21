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

const flipVertical = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M21 8V5C21 4.46957 20.7893 3.96086 20.4142 3.58579C20.0391 3.21071 19.5304 3 19 3H5C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5V8'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M21 16V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V16'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M4 12H2' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M10 12H8' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M16 12H14' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M22 12H20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)
/**
 * @description icon/flip-vertical
 */
export const IconFlipVertical = (props: Partial<IconProps>) => {
    return <Icon component={flipVertical} {...props} />
}

const notepadFileTypeUnknown = () => (
    <svg width='48' height='48' viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.39062 3H30.3516L40.8047 13.5703V43.8281C40.8047 44.4753 40.28 45 39.6328 45H8.39062C7.74342 45 7.21875 44.4753 7.21875 43.8281V4.17188C7.21875 3.52467 7.74342 3 8.39062 3Z'
            fill='#CCCCCC'
        />
        <path
            d='M30.3516 3V12.3984C30.3516 13.0456 30.8762 13.5703 31.5234 13.5703H40.8047L30.3516 3Z'
            fill='#EAEAEA'
        />
        <path
            d='M24 17.0859C25.6003 17.0859 27.2109 17.6106 28.4424 18.5714C29.8551 19.6736 30.6797 21.2686 30.6797 23.1328C30.6797 25.5574 29.0126 27.7745 25.8674 29.8823L25.8516 29.8929V32.625C25.8516 33.458 25.1831 34.1348 24.3533 34.1482L24.3281 34.1484C23.4867 34.1484 22.8047 33.4664 22.8047 32.625V29.0625C22.8047 28.8034 22.8707 28.5487 22.9966 28.3222C23.1225 28.0958 23.304 27.9052 23.5241 27.7685C26.3415 26.0179 27.6328 24.432 27.6328 23.1328C27.6328 22.2343 27.2602 21.5135 26.5681 20.9736C25.8866 20.4419 24.9378 20.1328 24 20.1328C23.0662 20.1328 22.1318 20.4394 21.4623 20.9681C20.7818 21.5055 20.4141 22.2276 20.4141 23.1328C20.4141 23.9742 19.732 24.6562 18.8906 24.6562C18.0492 24.6562 17.3672 23.9742 17.3672 23.1328C17.3672 21.2722 18.1785 19.6789 19.5741 18.5768C20.7964 17.6116 22.3984 17.0859 24 17.0859ZM24.3984 39.4688C25.3692 39.4688 26.1562 38.6817 26.1562 37.7109C26.1562 36.7402 25.3692 35.9531 24.3984 35.9531C23.4277 35.9531 22.6406 36.7402 22.6406 37.7109C22.6406 38.6817 23.4277 39.4688 24.3984 39.4688Z'
            fill='white'
        />
    </svg>
)
/**
 * @description icon/记事本/文件类型/未知 Icon/notepad/file type/unknown
 */
export const IconNotepadFileTypeUnknown = (props: Partial<IconProps>) => {
    return <Icon component={notepadFileTypeUnknown} {...props} />
}

const notepadFileTypeCompress = () => (
    <svg width='48' height='48' viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.39062 3H30.3516L40.8047 13.5703V43.8281C40.8047 44.4753 40.28 45 39.6328 45H8.39062C7.74342 45 7.21875 44.4753 7.21875 43.8281V4.17188C7.21875 3.52467 7.74342 3 8.39062 3Z'
            fill='#576A95'
        />
        <path
            d='M30.3516 3V12.3984C30.3516 13.0456 30.8762 13.5703 31.5234 13.5703H40.8047L30.3516 3Z'
            fill='#BBC3D4'
        />
        <path
            d='M26.8688 28.8092V34.5129C26.8687 34.7002 26.8317 34.8857 26.7598 35.0587C26.688 35.2317 26.5827 35.3889 26.4501 35.5211C26.1819 35.7886 25.8187 35.9388 25.44 35.9388H22.5225C22.1439 35.9388 21.7806 35.7887 21.5124 35.5214C21.3797 35.389 21.2744 35.2318 21.2026 35.0587C21.1307 34.8856 21.0938 34.7001 21.0938 34.5127V28.8092H26.8688ZM25.44 32.0769H22.5225V34.9408H25.44V32.0769ZM26.8209 23.1057V25.9695H23.9516V23.1056H26.821L26.8209 23.1057ZM23.9873 3V5.8875H26.8688V8.775H23.987V11.4486H26.8688V14.3361H23.9873V17.1881H26.8688V20.0402H23.9873V22.892H21.0938V20.04H23.9752V17.1879H21.0938V14.3361H23.9752V11.4486H21.0938V8.56106H23.9752V5.8875H21.0938V3H23.9873H23.9873Z'
            fill='white'
        />
    </svg>
)
/**
 * @description icon/记事本/文件类型/压缩文件 Icon/notepad/file type/Compress files
 */
export const IconNotepadFileTypeCompress = (props: Partial<IconProps>) => {
    return <Icon component={notepadFileTypeCompress} {...props} />
}

const notepadFileTypePPT = () => (
    <svg width='48' height='48' viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.39062 3H30.3516L40.8047 13.5703V43.8281C40.8047 44.4753 40.28 45 39.6328 45H8.39062C7.74342 45 7.21875 44.4753 7.21875 43.8281V4.17188C7.21875 3.52467 7.74342 3 8.39062 3Z'
            fill='#FF7861'
        />
        <path
            d='M30.3516 3V12.3984C30.3516 13.0456 30.8762 13.5703 31.5234 13.5703H40.8047L30.3516 3Z'
            fill='#FFB0A4'
        />
        <path
            d='M31.4108 22.4106C31.7758 22.7839 31.9688 23.3208 31.9688 24.1172C31.9688 24.9135 31.7758 25.4505 31.4108 25.8238C31.0212 26.2224 30.361 26.5185 29.3857 26.6719H14.9062C14.0002 26.6719 13.2656 27.4064 13.2656 28.3125V35.6719C13.2656 36.578 14.0002 37.3125 14.9062 37.3125C15.8123 37.3125 16.5469 36.578 16.5469 35.6719V29.9531H29.5078C29.5854 29.9531 29.663 29.9476 29.7398 29.9366C33.2444 29.436 35.25 27.3845 35.25 24.1172C35.25 20.8499 33.2444 18.7984 29.7398 18.2977C29.663 18.2868 29.5854 18.2813 29.5078 18.2812H14.9062C14.0002 18.2812 13.2656 19.0158 13.2656 19.9219C13.2656 20.828 14.0002 21.5625 14.9062 21.5625H29.3857C30.361 21.7158 31.0212 22.012 31.4108 22.4106Z'
            fill='white'
        />
    </svg>
)
/**
 * @description icon/记事本/文件类型/ppt Icon/notepad/file type/ppt
 */
export const IconNotepadFileTypePPT = (props: Partial<IconProps>) => {
    return <Icon component={notepadFileTypePPT} {...props} />
}

const notepadFileTypeExcel = () => (
    <svg width='48' height='48' viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.39062 3H30.3516L40.8047 13.5703V43.8281C40.8047 44.4753 40.28 45 39.6328 45H8.39062C7.74342 45 7.21875 44.4753 7.21875 43.8281V4.17188C7.21875 3.52467 7.74342 3 8.39062 3Z'
            fill='#00C090'
        />
        <path
            d='M30.3516 3V12.3984C30.3516 13.0456 30.8762 13.5703 31.5234 13.5703H40.8047L30.3516 3Z'
            fill='#68DBBF'
        />
        <path
            d='M31.7347 18.2008L13.9322 36.0502C13.2923 36.6917 13.2936 37.7305 13.9351 38.3704C14.5766 39.0103 15.6154 39.009 16.2553 38.3675L34.0578 20.5181C34.6977 19.8767 34.6964 18.8379 34.0549 18.1979C33.4134 17.5581 32.3746 17.5593 31.7347 18.2008Z'
            fill='white'
        />
        <path
            d='M13.9322 20.4712L31.7347 38.3205C32.3746 38.962 33.4134 38.9633 34.0549 38.3234C34.6964 37.6835 34.6977 36.6447 34.0578 36.0032L16.2553 18.1538C15.6154 17.5124 14.5766 17.511 13.9351 18.1509C13.2936 18.7909 13.2923 19.8297 13.9322 20.4712Z'
            fill='white'
        />
    </svg>
)
/**
 * @description icon/记事本/文件类型/excel Icon/notepad/file type/excel
 */
export const IconNotepadFileTypeExcel = (props: Partial<IconProps>) => {
    return <Icon component={notepadFileTypeExcel} {...props} />
}

const notepadFileTypePdf = () => (
    <svg width='48' height='48' viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.39062 3H30.3516L40.8047 13.5703V43.8281C40.8047 44.4753 40.28 45 39.6328 45H8.39062C7.74342 45 7.21875 44.4753 7.21875 43.8281V4.17188C7.21875 3.52467 7.74342 3 8.39062 3Z'
            fill='#FF4867'
        />
        <path
            d='M30.3516 3V12.3984C30.3516 13.0456 30.8762 13.5703 31.5234 13.5703H40.8047L30.3516 3Z'
            fill='#FF97A9'
        />
        <path
            d='M32.4337 38.0625C30.3524 38.0625 28.4859 34.4911 27.5039 32.1688C25.8518 31.4793 24.0308 30.8352 22.2618 30.4189C20.7139 31.4402 18.0799 32.9689 16.0572 32.9689C14.8019 32.9689 13.8979 32.3379 13.5662 31.2386C13.3126 30.3344 13.5272 29.7098 13.8004 29.3715C14.3337 28.643 15.4328 28.2722 17.0783 28.2722C18.4116 28.2722 20.1025 28.5064 21.9886 28.9617C23.2048 28.0965 24.4405 27.0947 25.5397 26.0344C25.0519 23.7186 24.5186 19.965 25.8714 18.2347C26.5412 17.4085 27.5624 17.1353 28.7981 17.5061C30.1509 17.8964 30.6646 18.7226 30.8207 19.3731C31.3931 21.6304 28.7981 24.6748 27.0486 26.4638C27.4388 28.012 27.9526 29.6448 28.577 31.1409C31.0874 32.2598 34.0726 33.9317 34.4108 35.7532C34.5474 36.3841 34.3523 36.9696 33.8385 37.4835C33.3962 37.8478 32.928 38.0625 32.4337 38.0625ZM30.5625 34.125C31.0204 35.1441 31.4569 35.625 31.687 35.625C31.7227 35.625 31.7725 35.6094 31.8436 35.547C31.929 35.4534 31.929 35.391 31.9148 35.3339C31.8674 35.0661 31.4806 34.6268 30.5625 34.125ZM17.3474 30C16.6152 30 16.414 30.1769 16.3527 30.2595C16.3352 30.286 16.2827 30.3656 16.3352 30.5719C16.379 30.7488 16.5015 30.9375 16.8807 30.9375C17.3561 30.9375 18.0445 30.6692 18.8437 30.1887C18.2721 30.0619 17.7674 30 17.3474 30ZM24.5156 29.0898C24.9531 29.2117 25.4067 29.3687 25.8281 29.5313C25.6751 29.1304 25.5517 28.7133 25.447 28.3125C25.1419 28.578 24.8314 28.8371 24.5156 29.0898ZM27.6078 20.2969C27.4522 20.2969 27.343 20.3545 27.2447 20.4615C26.9554 20.8263 26.9226 21.7452 27.1464 22.9219C27.9954 22.0112 28.4567 21.1746 28.3421 20.7275C28.3257 20.6617 28.2765 20.4615 27.8807 20.3462C27.7715 20.3133 27.6897 20.2969 27.6078 20.2969Z'
            fill='white'
        />
    </svg>
)
/**
 * @description icon/记事本/文件类型/pdf Icon/notepad/file type/pdf
 */
export const IconNotepadFileTypePdf = (props: Partial<IconProps>) => {
    return <Icon component={notepadFileTypePdf} {...props} />
}

const notepadFileTypeWord = () => (
    <svg width='48' height='48' viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M8.39062 3H30.3516L40.8047 13.5703V43.8281C40.8047 44.4753 40.28 45 39.6328 45H8.39062C7.74342 45 7.21875 44.4753 7.21875 43.8281V4.17188C7.21875 3.52467 7.74342 3 8.39062 3Z'
            fill='#4A8DFF'
        />
        <path
            d='M30.3516 3V12.3984C30.3516 13.0456 30.8762 13.5703 31.5234 13.5703H40.8047L30.3516 3Z'
            fill='#E5F0FF'
        />
        <path
            d='M32.4915 36.7781C33.5015 37.8842 35.3438 37.1697 35.3438 35.6719V18.2344H32.0625V31.4418L25.5397 24.2977C24.8891 23.5851 23.7671 23.5851 23.1165 24.2977L16.5938 31.4418V18.2344H13.3125V35.6719C13.3125 37.1697 15.1548 37.8842 16.1647 36.7781L24.3281 27.837L32.4915 36.7781Z'
            fill='white'
        />
    </svg>
)
/**
 * @description icon/记事本/文件类型/word Icon/notepad/file type/word
 */
export const IconNotepadFileTypeWord = (props: Partial<IconProps>) => {
    return <Icon component={notepadFileTypeWord} {...props} />
}
