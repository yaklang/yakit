import Icon from "@ant-design/icons"
import { CustomIconComponentProps } from "@ant-design/icons/lib/components/Icon"

const PortScanning = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        <mask
            id='mask0_2721_76421'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2721_76421)'>
            <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M11.9999 2.25C10.4061 2.25 8.90999 2.68022 7.62193 3.43186C7.26417 3.64063 7.14339 4.09988 7.35215 4.45764C7.56092 4.8154 8.02017 4.93618 8.37793 4.72741C9.44325 4.10576 10.6794 3.75 11.9999 3.75C15.9978 3.75 19.2499 7.02114 19.2499 11.0701C19.2499 11.3814 19.2444 11.6914 19.2334 12H20.7343C20.7447 11.6913 20.7499 11.3813 20.7499 11.0701C20.7499 6.20508 16.8386 2.25 11.9999 2.25ZM20.5939 14H19.0848C18.927 15.3911 18.6583 16.7478 18.2878 18.0609C18.1753 18.4596 18.4073 18.8739 18.8059 18.9864C19.2046 19.0989 19.6189 18.8669 19.7314 18.4682C20.1388 17.0242 20.4299 15.5311 20.5939 14ZM16.7314 12C16.7437 11.6915 16.7498 11.3815 16.7498 11.0701C16.7498 8.43358 14.6293 6.28506 11.9998 6.28506C9.37033 6.28506 7.24984 8.43358 7.24984 11.0701C7.24984 11.3829 7.23926 11.693 7.21847 12H8.72157C8.74032 11.6926 8.74984 11.3825 8.74984 11.0701C8.74984 9.24964 10.2111 7.78506 11.9998 7.78506C13.7886 7.78506 15.2498 9.24964 15.2498 11.0701C15.2498 11.3816 15.2432 11.6917 15.2302 12H16.7314ZM15.0528 14H16.5656C16.5573 14.0658 16.5487 14.1314 16.5398 14.197C16.4842 14.6075 16.1064 14.8952 15.6959 14.8396C15.2869 14.7842 14.9997 14.4088 15.0528 14ZM12.7275 12C12.7423 11.6919 12.7498 11.3819 12.7498 11.0701C12.7498 10.6559 12.414 10.3201 11.9998 10.3201C11.5856 10.3201 11.2498 10.6559 11.2498 11.0701C11.2498 11.3821 11.2417 11.6921 11.2256 12H12.7275ZM11.0066 14H12.5259C12.1272 16.5838 11.2095 18.9955 9.8834 21.1221C9.66422 21.4735 9.20162 21.5808 8.85014 21.3616C8.49867 21.1424 8.39142 20.6798 8.6106 20.3284C9.79189 18.434 10.6215 16.2938 11.0066 14ZM8.46431 14H6.93185C6.59876 15.5067 6.01395 16.9144 5.22483 18.1798L5.86123 18.5767L5.22483 18.1798C5.20288 18.215 5.18144 18.2504 5.1605 18.286C4.95035 18.6429 5.06936 19.1026 5.4263 19.3128C5.78325 19.5229 6.24297 19.4039 6.45312 19.047C6.4676 19.0224 6.48243 18.9979 6.49763 18.9735C7.43218 17.4749 8.10873 15.797 8.46431 14ZM4.71087 12C4.73673 11.6934 4.74993 11.3833 4.74993 11.0701C4.74993 9.73427 5.10365 8.48438 5.7208 7.40815C5.92686 7.04882 5.8026 6.59049 5.44328 6.38444C5.08395 6.17839 4.62562 6.30264 4.41957 6.66196C3.67536 7.95974 3.24993 9.46611 3.24993 11.0701C3.24993 11.384 3.23461 11.6942 3.20469 12H4.71087ZM2.78564 14H4.35229C4.17895 14.6237 3.95163 15.2248 3.67565 15.7979C3.49593 16.1711 3.0477 16.3279 2.67451 16.1482C2.30132 15.9685 2.14448 15.5203 2.3242 15.1471C2.50206 14.7777 2.65653 14.3947 2.78564 14ZM15.8928 17.3253C16.0046 16.9264 15.772 16.5124 15.3732 16.4006C14.9744 16.2887 14.5604 16.5213 14.4485 16.9201C14.083 18.2231 13.5985 19.4763 13.0074 20.6664C12.8232 21.0374 12.9746 21.4875 13.3455 21.6717C13.7165 21.856 14.1666 21.7046 14.3509 21.3336C14.9832 20.0603 15.5017 18.7194 15.8928 17.3253Z'
                fill='#31343F'
            />
            <path d='M1 12H23' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' />
        </g>
    </svg>
)

/**
 * @description:  端口/指纹扫描
 */
export const MenuPortScanningIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={PortScanning} {...props} />
}

const BasicCrawler = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7447'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7447)'>
            <path
                d='M9 6.75H15C16.7949 6.75 18.25 8.20507 18.25 10V15C18.25 18.4518 15.4518 21.25 12 21.25C8.54822 21.25 5.75 18.4518 5.75 15V10C5.75 8.20507 7.20507 6.75 9 6.75Z'
                stroke='#31343F'
                strokeWidth='1.5'
            />
            <path d='M12 21V7' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' />
            <path
                d='M15 6C15 4.34315 13.6569 3 12 3C10.3431 3 9 4.34315 9 6'
                stroke='#1890ff'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
            <path
                d='M9 6.75H15C16.7949 6.75 18.25 8.20507 18.25 10V15C18.25 18.4518 15.4518 21.25 12 21.25C8.54822 21.25 5.75 18.4518 5.75 15V10C5.75 8.20507 7.20507 6.75 9 6.75Z'
                stroke='#31343F'
                strokeWidth='1.5'
            />
            <path
                d='M2 13H5M19 13H22M20.9999 6C20.9999 7.55248 19.8207 8.82953 18.3091 8.98427M2.99995 21C2.99995 19.3431 4.3431 18 5.99995 18M2.99995 6C2.99995 7.5282 4.14261 8.78952 5.62015 8.97619M20.9999 21C20.9999 19.3431 19.6568 18 17.9999 18'
                stroke='#31343F'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
        </g>
    </svg>
)

/**
 * @description:  基础爬虫
 */
export const MenuBasicCrawlerIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={BasicCrawler} {...props} />
}

const ComprehensiveCatalogScanningAndBlasting = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7395'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7395)'>
            <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M5.75 5C5.75 4.30964 6.30964 3.75 7 3.75H12.5858C12.6521 3.75 12.7157 3.77634 12.7626 3.82322L18.1768 9.23744C18.2237 9.28432 18.25 9.34791 18.25 9.41421V12H19.75V9.41421C19.75 8.95009 19.5656 8.50497 19.2374 8.17678L13.8232 2.76256C13.495 2.43437 13.0499 2.25 12.5858 2.25H7C5.48122 2.25 4.25 3.48122 4.25 5V12H5.75V5ZM5.75 14H4.25V19C4.25 20.5188 5.48122 21.75 7 21.75H17C18.5188 21.75 19.75 20.5188 19.75 19V14H18.25V19C18.25 19.6904 17.6904 20.25 17 20.25H7C6.30964 20.25 5.75 19.6904 5.75 19V14ZM9 10.25C8.58579 10.25 8.25 10.5858 8.25 11C8.25 11.4142 8.58579 11.75 9 11.75H15C15.4142 11.75 15.75 11.4142 15.75 11C15.75 10.5858 15.4142 10.25 15 10.25H9ZM9 15.25C8.58579 15.25 8.25 15.5858 8.25 16C8.25 16.4142 8.58579 16.75 9 16.75H15C15.4142 16.75 15.75 16.4142 15.75 16C15.75 15.5858 15.4142 15.25 15 15.25H9Z'
                fill='#31343F'
            />
            <path d='M1 12H23' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' />
        </g>
    </svg>
)

/**
 * @description:  综合目录扫描与爆破
 */
export const MenuComprehensiveCatalogScanningAndBlastingIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={ComprehensiveCatalogScanningAndBlasting} {...props} />
}

const SpecialVulnerabilityDetection = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0_3031_7833" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_3031_7833)">
            <circle cx="12" cy="12" r="9" stroke="#31343F" stroke-width="1.5" />
            <path d="M1 12H5M12 1V5M19 12H23M12 19V23" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="12" cy="12" r="3" stroke="#1890ff" stroke-width="1.5" />
        </g>
    </svg>

)

/**
 * @description:  专项漏洞检测
 */
export const MenuSpecialVulnerabilityDetectionIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={SpecialVulnerabilityDetection} {...props} />
}

const BatchVulnerabilityDetection = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7504'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7504)'>
            <circle cx='12' cy='12' r='10' stroke='#31343F' strokeWidth='1.5' />
            <circle cx='12' cy='12' r='5' stroke='#31343F' strokeWidth='1.5' />
            <circle cx='8' cy='14' r='2' fill='white' stroke='#1890ff' strokeWidth='1.5' />
            <circle cx='17' cy='15' r='1' fill='white' stroke='#1890ff' strokeWidth='1.5' />
            <circle cx='19' cy='5' r='1' fill='white' stroke='#1890ff' strokeWidth='1.5' />
        </g>
    </svg>
)

/**
 * @description:  批量漏洞检测
 */
export const MenuBatchVulnerabilityDetectionIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={BatchVulnerabilityDetection} {...props} />
}

const PluginWarehouse = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7475'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7475)'>
            <path
                d='M23 9L12 1L1 9'
                stroke='#1890ff'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M4 13V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V11'
                stroke='#31343F'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M4 16H9V21H6C4.89543 21 4 20.1046 4 19V16Z'
                stroke='#1890ff'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M9 16H12C13.1046 16 14 16.8954 14 18V21H9V16Z'
                stroke='#31343F'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M4 13C4 11.8954 4.89543 11 6 11H7C8.10457 11 9 11.8954 9 13V16H4V13Z'
                stroke='#31343F'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </g>
    </svg>
)

/**
 * @description:  插件仓库
 */
export const MenuPluginWarehouseIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={PluginWarehouse} {...props} />
}

const MITMInteractiveHijacking = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7532'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7532)'>
            <path
                d='M3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V15C21 16.1046 20.1046 17 19 17H5C3.89543 17 3 16.1046 3 15V6Z'
                stroke='#31343F'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path d='M2 20L22 20' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
            <path
                d='M6 11H8.5L10 7L12 14L14.5 8.5L15.5 11H18'
                stroke='#1890ff'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </g>
    </svg>
)

/**
 * @description:  MITM 交互式劫持
 */
export const MenuMITMInteractiveHijackingIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={MITMInteractiveHijacking} {...props} />
}

const WebFuzzer = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7361'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect opacity='0.5' width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7361)'></g>
        <mask
            id='mask1_2812_7361'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='4'
            y='4'
            width='16'
            height='16'
        >
            <rect x='4' y='4' width='16' height='16' rx='2' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask1_2812_7361)'>
            <path d='M4 4H13V11C13 12.1046 12.1046 13 11 13H4V4Z' stroke='#31343F' strokeWidth='1.5' />
            <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M12.9999 7.25201V11C12.9999 12.1045 12.1045 13 10.9999 13H7.25195C7.97551 10.1888 10.1887 7.97557 12.9999 7.25201Z'
                fill='#1890ff'
            />
            <circle cx='15' cy='15' r='8' stroke='#31343F' strokeWidth='1.5' />
            <path
                d='M13 8V11C13 12.1046 12.1046 13 11 13H8'
                stroke='#31343F'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
        </g>
        <rect x='4' y='4' width='16' height='16' rx='2' stroke='#31343F' strokeWidth='1.5' />
        <path d='M4 12V6C4 4.89543 4.89543 4 6 4H12' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='square' />
    </svg>
)

/**
 * @description: Web Fuzzer
 */
export const MenuWebFuzzerIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={WebFuzzer} {...props} />
}

const BlastingAndUnauthorizedTesting = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7557'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7557)'>
            <circle
                cx='11.5'
                cy='13.5981'
                r='8'
                transform='rotate(30 11.5 13.5981)'
                stroke='#31343F'
                strokeWidth='1.5'
            />
            <path
                d='M10.2541 8.75586C8.99872 9.0789 7.86907 9.88688 7.16972 11.0982C6.57554 12.1273 6.38881 13.2799 6.55947 14.3691'
                stroke='#1890ff'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
            <path
                d='M17 4.07183C17.8284 2.63695 19.6632 2.14533 21.0981 2.97375'
                stroke='#1890ff'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
            <path
                d='M12.5359 3.80383C13.0882 2.84724 14.3114 2.51949 15.2679 3.07178L18.732 5.07178C19.6886 5.62406 20.0164 6.84724 19.4641 7.80383L18.9641 8.66985L12.0359 4.66985L12.5359 3.80383Z'
                stroke='#31343F'
                strokeWidth='1.5'
            />
        </g>
    </svg>
)

/**
 * @description:爆破与未授权检测
 */
export const MenuBlastingAndUnauthorizedTestingIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={BlastingAndUnauthorizedTesting} {...props} />
}

const Codec = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7584'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7584)'>
            <path
                d='M9.40386 17.5556H14.596M11.9999 2V3.11111M22 11.9999H20.8889M3.11111 11.9999H2M8.07157 15.9284C5.90199 13.7588 5.90199 10.2412 8.07157 8.07165C10.2411 5.90208 13.7587 5.90208 15.9283 8.07165C18.0979 10.2412 18.0979 13.7588 15.9283 15.9284L15.3204 16.5363C14.6172 17.2395 14.2222 18.1932 14.2222 19.1877V19.7778C14.2222 21.0051 13.2272 22 11.9999 22C10.7726 22 9.77772 21.0051 9.77772 19.7778V19.1877C9.77772 18.1932 9.38266 17.2395 8.67946 16.5363L8.07157 15.9284Z'
                stroke='#31343F'
                strokeWidth='1.66667'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M11.9999 2V3.11111M22 11.9999H20.8889M3.11111 11.9999H2M8.07157 15.9284C5.90199 13.7588 5.90199 10.2412 8.07157 8.07165C10.2411 5.90208 13.7587 5.90208 15.9283 8.07165C18.0979 10.2412 18.0979 13.7588 15.9283 15.9284L15.3204 16.5363C15.1768 16.6799 14.7777 17.2756 14.596 17.5556H9.40386C9.327 17.2 8.8889 16.7279 8.67946 16.5363L8.07157 15.9284Z'
                stroke='#31343F'
                strokeWidth='1.66667'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M9.77783 19.1877V19.7778C9.77783 21.0051 10.7728 22 12.0001 22C13.2274 22 14.2223 21.0051 14.2223 19.7778V19.1877'
                stroke='#1890ff'
                strokeWidth='1.66667'
                strokeLinecap='square'
                strokeLinejoin='round'
            />
            <path
                d='M19.0708 4.92847L18.2852 5.71414M5.71439 5.71414L4.92871 4.92847'
                stroke='#1890ff'
                strokeWidth='1.66667'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </g>
    </svg>
)

/**
 * @description:Codec
 */
export const MenuCodecIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={Codec} {...props} />
}

const DataComparison = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7610'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7610)'>
            <path
                d='M3 7C3 5.89543 3.89543 5 5 5H12V19H5C3.89543 19 3 18.1046 3 17V7Z'
                stroke='#31343F'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M12.25 4.25H12C11.5858 4.25 11.25 4.58579 11.25 5V19C11.25 19.4142 11.5858 19.75 12 19.75H12.25V4.25ZM13.75 19.75H19C20.5188 19.75 21.75 18.5188 21.75 17V7C21.75 5.48122 20.5188 4.25 19 4.25H13.75V5.75H19C19.6904 5.75 20.25 6.30964 20.25 7V17C20.25 17.6904 19.6904 18.25 19 18.25H13.75V19.75Z'
                fill='#1890ff'
            />
            <path d='M12 2V22' stroke='#31343F' strokeWidth='1.5' strokeLinecap='round' />
        </g>
    </svg>
)

/**
 * @description:数据对比
 */
export const MenuDataComparisonIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={DataComparison} {...props} />
}

const PortListener = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7637'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7637)'>
            <path
                d='M22 16V13C22 7.47715 17.5228 3 12 3V3C6.47715 3 2 7.47715 2 13V16'
                stroke='#31343F'
                strokeWidth='1.5'
            />
            <path
                d='M2 14H4C5.10457 14 6 14.8954 6 16V18C6 19.1046 5.10457 20 4 20V20C2.89543 20 2 19.1046 2 18V14Z'
                stroke='#31343F'
                strokeWidth='1.5'
            />
            <path
                d='M18 16C18 14.8954 18.8954 14 20 14H22V18C22 19.1046 21.1046 20 20 20V20C18.8954 20 18 19.1046 18 18V16Z'
                stroke='#31343F'
                strokeWidth='1.5'
            />
            <path d='M9 16V19' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M12 16V19' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M15 16V19' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' />
        </g>
    </svg>
)

/**
 * @description:端口监听器
 */
export const MenuPortListenerIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={PortListener} {...props} />
}

const ReverseConnectionServer = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7666'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7666)'>
            <rect x='4' y='8' width='16' height='4' rx='2' stroke='#31343F' strokeWidth='1.5' />
            <rect x='4' y='4' width='16' height='4' rx='2' stroke='#31343F' strokeWidth='1.5' />
            <path d='M12 14V17' stroke='#1890ff' strokeWidth='1.5' />
            <path
                d='M20 17V16C20 14.8954 19.1046 14 18 14H6C4.89543 14 4 14.8954 4 16V17'
                stroke='#31343F'
                strokeWidth='1.5'
            />
            <circle cx='17' cy='6' r='1' fill='#1890ff' />
            <circle cx='17' cy='10' r='1' fill='#1890ff' />
            <circle cx='4.5' cy='18.5' r='1.5' stroke='#31343F' strokeWidth='1.5' />
            <circle cx='12' cy='18.5' r='1.5' stroke='#1890ff' strokeWidth='1.5' />
            <circle cx='19.5' cy='18.5' r='1.5' stroke='#31343F' strokeWidth='1.5' />
        </g>
    </svg>
)

/**
 * @description:反连服务器
 */
export const MenuReverseConnectionServerIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={ReverseConnectionServer} {...props} />
}

const DNSLog = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7697'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7697)'>
            <rect x='3' y='4' width='18' height='16' rx='2' stroke='#31343F' strokeWidth='1.5' />
            <path
                d='M3 9H21V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V9Z'
                stroke='#31343F'
                strokeWidth='1.5'
            />
            <path
                d='M3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V9H3V6Z'
                stroke='#31343F'
                strokeWidth='1.5'
            />
            <path
                d='M5.822 15.094C5.69 15.094 5.576 15.136 5.492 15.232C5.396 15.322 5.354 15.436 5.354 15.568C5.354 15.7 5.396 15.808 5.492 15.904C5.576 15.988 5.69 16.036 5.822 16.036C5.954 16.036 6.062 15.988 6.158 15.904C6.248 15.808 6.296 15.7 6.296 15.568C6.296 15.436 6.248 15.322 6.158 15.232C6.062 15.136 5.954 15.094 5.822 15.094Z'
                fill='#1890ff'
            />
            <path
                d='M8.40435 12.814C7.91835 12.814 7.54035 12.976 7.27035 13.3C7.01835 13.594 6.89235 13.978 6.89235 14.446C6.89235 14.926 7.01835 15.316 7.27635 15.616C7.54035 15.928 7.91235 16.084 8.39235 16.084C8.79435 16.084 9.11835 15.982 9.35835 15.784C9.60435 15.58 9.76635 15.268 9.83835 14.848H9.16035C9.10635 15.298 8.85435 15.526 8.39835 15.526C8.13435 15.526 7.93635 15.43 7.80435 15.244C7.66035 15.052 7.59435 14.782 7.59435 14.44C7.59435 14.104 7.66635 13.84 7.81035 13.654C7.95435 13.462 8.15235 13.372 8.40435 13.372C8.60835 13.372 8.77635 13.42 8.90235 13.516C9.02235 13.612 9.10635 13.756 9.14835 13.954H9.82635C9.76635 13.564 9.61035 13.276 9.36435 13.084C9.12435 12.904 8.80635 12.814 8.40435 12.814Z'
                fill='#1890ff'
            />
            <path
                d='M11.8156 12.814C11.3416 12.814 10.9636 12.964 10.6816 13.276C10.3936 13.582 10.2556 13.972 10.2556 14.452C10.2556 14.926 10.3936 15.316 10.6756 15.616C10.9636 15.928 11.3416 16.084 11.8156 16.084C12.2836 16.084 12.6676 15.928 12.9556 15.616C13.2316 15.316 13.3756 14.926 13.3756 14.452C13.3756 13.972 13.2316 13.582 12.9496 13.276C12.6616 12.964 12.2836 12.814 11.8156 12.814ZM11.8156 13.372C12.0976 13.372 12.3196 13.48 12.4756 13.708C12.6076 13.9 12.6796 14.152 12.6796 14.452C12.6796 14.746 12.6076 14.992 12.4756 15.19C12.3196 15.412 12.0976 15.526 11.8156 15.526C11.5276 15.526 11.3116 15.412 11.1556 15.19C11.0236 14.998 10.9576 14.752 10.9576 14.452C10.9576 14.152 11.0236 13.9 11.1556 13.708C11.3116 13.48 11.5276 13.372 11.8156 13.372Z'
                fill='#1890ff'
            />
            <path
                d='M15.4973 12.814C15.1973 12.814 14.9153 12.946 14.6573 13.216V12.898H13.9733V16H14.6573V14.14C14.6573 13.936 14.7173 13.756 14.8373 13.612C14.9573 13.456 15.1133 13.384 15.3113 13.384C15.7193 13.384 15.9233 13.618 15.9233 14.092V16H16.6073V14.104C16.6073 13.876 16.6613 13.702 16.7813 13.576C16.8953 13.444 17.0333 13.384 17.2013 13.384C17.4413 13.384 17.6093 13.438 17.7173 13.552C17.8193 13.66 17.8733 13.84 17.8733 14.086V16H18.5573V13.966C18.5573 13.624 18.4493 13.348 18.2453 13.132C18.0293 12.916 17.7653 12.814 17.4473 12.814C17.2373 12.814 17.0633 12.85 16.9253 12.922C16.7693 12.994 16.6193 13.126 16.4753 13.318C16.2773 12.982 15.9533 12.814 15.4973 12.814Z'
                fill='#1890ff'
            />
            <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M7.11765 13.1709C7.43161 12.7948 7.86965 12.614 8.4044 12.614C8.83548 12.614 9.19992 12.7107 9.4844 12.924L9.48747 12.9263C9.78227 13.1564 9.95816 13.4952 10.0241 13.9236L10.0595 14.154H8.98637L8.95275 13.9955C8.91836 13.8334 8.85467 13.7347 8.7793 13.6737C8.69753 13.6122 8.57674 13.572 8.4044 13.572C8.20785 13.572 8.07234 13.6381 7.9704 13.774L7.96856 13.7765C7.86137 13.9149 7.7944 14.1294 7.7944 14.44C7.7944 14.7605 7.85695 14.9807 7.9644 15.124L7.96755 15.1282C8.05674 15.2539 8.18946 15.326 8.3984 15.326C8.59384 15.326 8.71753 15.2775 8.79689 15.2066C8.87647 15.1355 8.93861 15.0176 8.96182 14.8242L8.98296 14.648H10.0633C10.0582 14.5839 10.0557 14.5186 10.0557 14.452C10.0557 13.9313 10.2067 13.4897 10.5347 13.1404C10.8607 12.7805 11.2959 12.614 11.8157 12.614C12.3311 12.614 12.7654 12.7815 13.0966 13.1404C13.417 13.488 13.5757 13.9286 13.5757 14.452C13.5757 14.9692 13.4173 15.4097 13.1029 15.7514C12.7724 16.1094 12.3323 16.284 11.8157 16.284C11.293 16.284 10.8595 16.1096 10.5293 15.7523C10.2587 15.4642 10.1088 15.1067 10.0675 14.6951L10.0355 14.8818C9.95796 15.3342 9.77883 15.6952 9.48606 15.938C9.20144 16.1728 8.828 16.284 8.3924 16.284C7.86523 16.284 7.43298 16.1103 7.12424 15.7458C6.82852 15.4016 6.6924 14.9618 6.6924 14.446C6.6924 13.9416 6.82884 13.5084 7.11765 13.1709ZM8.4044 13.014C7.96765 13.014 7.65002 13.1569 7.42404 13.4281L7.42226 13.4302C7.20768 13.6805 7.0924 14.015 7.0924 14.446C7.0924 14.8899 7.20811 15.2299 7.42803 15.4856L7.42908 15.4868C7.6483 15.7459 7.95986 15.884 8.3924 15.884C8.76071 15.884 9.03561 15.791 9.23097 15.6299C9.3871 15.5003 9.50981 15.3106 9.58754 15.048H9.32662C9.28041 15.2296 9.19607 15.3864 9.0634 15.5049C8.88926 15.6605 8.65895 15.726 8.3984 15.726C8.08026 15.726 7.81764 15.6068 7.64283 15.3619C7.46344 15.1214 7.3944 14.8024 7.3944 14.44C7.3944 14.0793 7.47118 13.7662 7.65132 13.5328C7.83731 13.2856 8.09744 13.172 8.4044 13.172C8.63873 13.172 8.8534 13.2272 9.02361 13.3569L9.02737 13.3598C9.15219 13.4597 9.24199 13.5932 9.29951 13.754H9.57694C9.50717 13.5262 9.39274 13.3604 9.24286 13.2429C9.04745 13.0969 8.77634 13.014 8.4044 13.014ZM11.8157 13.014C11.3881 13.014 11.0679 13.147 10.8301 13.4101L10.8273 13.4131C10.5803 13.6756 10.4557 14.0135 10.4557 14.452C10.4557 14.8848 10.5804 15.2226 10.8214 15.479L10.8226 15.4804C11.0684 15.7466 11.3907 15.884 11.8157 15.884C12.235 15.884 12.5632 15.7463 12.8087 15.4804C13.0461 15.2222 13.1757 14.8827 13.1757 14.452C13.1757 14.0155 13.0462 13.676 12.8027 13.4117C12.5579 13.1465 12.2363 13.014 11.8157 13.014ZM14.8573 12.797C15.0559 12.6771 15.27 12.614 15.4973 12.614C15.9085 12.614 16.2449 12.7389 16.486 12.9983C16.5949 12.8881 16.7116 12.8011 16.8372 12.7424C17.0111 12.6529 17.2178 12.614 17.4473 12.614C17.8136 12.614 18.13 12.7339 18.3868 12.9906L18.3908 12.9946C18.6331 13.2512 18.7573 13.5778 18.7573 13.966V16.2H17.6733V14.086C17.6733 13.8615 17.6228 13.7432 17.5719 13.6893C17.5181 13.6327 17.4158 13.584 17.2013 13.584C17.09 13.584 17.0077 13.6198 16.9327 13.7067L16.9263 13.7141C16.8538 13.7903 16.8073 13.9067 16.8073 14.104V16.2H15.7233V14.092C15.7233 13.8791 15.6769 13.7578 15.6192 13.6912C15.5663 13.6302 15.4768 13.584 15.3113 13.584C15.1715 13.584 15.0757 13.6302 14.9959 13.734L14.9911 13.7401C14.9047 13.8439 14.8573 13.9768 14.8573 14.14V16.2H13.7733V12.698H14.8573V12.797ZM14.4573 13.098H14.1733V15.8H14.4573V14.14C14.4573 13.8965 14.5293 13.6707 14.6812 13.487C14.6958 13.4682 14.7108 13.4503 14.7263 13.4334L14.4573 13.7148V13.098ZM14.7532 13.4052C14.9036 13.2551 15.0929 13.184 15.3113 13.184C15.5539 13.184 15.7704 13.2549 15.9215 13.4293C16.0678 13.5982 16.1233 13.831 16.1233 14.092V15.8H16.4073V14.104C16.4073 13.9069 16.4431 13.7257 16.5343 13.5728L16.4553 13.678L16.303 13.4196C16.1474 13.1554 15.8961 13.014 15.4973 13.014C15.263 13.014 15.0306 13.1149 14.8019 13.3542L14.7532 13.4052ZM16.6305 13.4445C16.6314 13.4435 16.6322 13.4426 16.6331 13.4417C16.7856 13.267 16.9782 13.184 17.2013 13.184C17.4666 13.184 17.7003 13.2432 17.8625 13.4145C18.0156 13.5766 18.0733 13.8185 18.0733 14.086V15.8H18.3573V13.966C18.3573 13.6714 18.2664 13.4466 18.1019 13.2714C17.927 13.0975 17.716 13.014 17.4473 13.014C17.2588 13.014 17.1191 13.0465 17.0178 13.0993L17.0092 13.1038C16.8929 13.1575 16.7669 13.2626 16.6353 13.438L16.6305 13.4445ZM11.8157 13.572C11.5887 13.572 11.4367 13.6514 11.3207 13.821C11.2179 13.9706 11.1577 14.1799 11.1577 14.452C11.1577 14.7226 11.217 14.9257 11.3199 15.0759C11.4376 15.2429 11.5918 15.326 11.8157 15.326C12.0339 15.326 12.1935 15.2426 12.3106 15.077C12.4168 14.9168 12.4797 14.7113 12.4797 14.452C12.4797 14.1834 12.4153 13.9732 12.3109 13.8213C12.1953 13.6524 12.0375 13.572 11.8157 13.572ZM10.9907 13.5949C11.1867 13.3086 11.4667 13.172 11.8157 13.172C12.1578 13.172 12.4441 13.3079 12.6406 13.5949C12.8001 13.8269 12.8797 14.1207 12.8797 14.452C12.8797 14.7796 12.7991 15.0655 12.6421 15.301L12.6394 15.305C12.4447 15.5821 12.1606 15.726 11.8157 15.726C11.4639 15.726 11.1863 15.5814 10.992 15.305L10.9909 15.3033C10.8302 15.0696 10.7577 14.7809 10.7577 14.452C10.7577 14.1242 10.8297 13.8292 10.9907 13.5949ZM5.34816 15.0929C5.47693 14.9504 5.64787 14.894 5.82205 14.894C6.0049 14.894 6.16444 14.9556 6.29947 15.0906C6.42713 15.2183 6.49605 15.3832 6.49605 15.568C6.49605 15.7565 6.42466 15.9121 6.30396 16.0408L6.2972 16.048L6.28975 16.0545C6.163 16.1654 6.00958 16.236 5.82205 16.236C5.63921 16.236 5.47366 16.1685 5.35063 16.0454C5.2156 15.9104 5.15405 15.7509 5.15405 15.568C5.15405 15.3922 5.21116 15.2251 5.34816 15.0929ZM5.82205 15.294C5.73524 15.294 5.68107 15.3197 5.64257 15.3637L5.63606 15.3712L5.62884 15.3779C5.57898 15.4247 5.55405 15.4828 5.55405 15.568C5.55405 15.6492 5.57651 15.7056 5.63347 15.7626C5.67844 15.8076 5.7409 15.836 5.82205 15.836C5.89558 15.836 5.95625 15.8125 6.01881 15.76C6.07329 15.6993 6.09605 15.6407 6.09605 15.568C6.09605 15.4888 6.06897 15.4258 6.01663 15.3734C5.95966 15.3165 5.90321 15.294 5.82205 15.294Z'
                fill='#1890ff'
            />
            <path d='M6 6.5H14' stroke='#31343F' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M17 6.5H18' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' />
        </g>
    </svg>
)

/**
 * @description:DNSLog
 */
export const MenuDNSLogIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={DNSLog} {...props} />
}

const ICMPSizeLog = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7727'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7727)'>
            <path
                d='M7 21L10.5858 17.4142C11.3668 16.6332 12.6332 16.6332 13.4142 17.4142L17 21'
                stroke='#1890ff'
                strokeWidth='1.5'
                strokeLinecap='round'
            />
            <path
                d='M4 3H20V14C20 15.1046 19.1046 16 18 16H6C4.89543 16 4 15.1046 4 14V3Z'
                stroke='#31343F'
                strokeWidth='1.5'
            />
            <path d='M2 3H22' stroke='#31343F' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M8 13L8 10' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M12 13V8' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M16 13L16 6' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' />
        </g>
    </svg>
)

/**
 * @description:ICMP-SizeLog
 */
export const MenuICMPSizeLogIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={ICMPSizeLog} {...props} />
}

const TCPPortLog = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7755'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7755)'>
            <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M13.3751 0.927878C12.5242 0.436638 11.476 0.436638 10.6251 0.927878L5.83305 3.69457C6.22102 3.97488 6.55744 4.33974 6.81226 4.78109C6.82386 4.80118 6.83524 4.82134 6.84639 4.84157L11.3751 2.22692C11.7618 2.00363 12.2383 2.00363 12.6251 2.22692L17.4618 5.01938C17.679 4.55476 17.9953 4.14574 18.3835 3.81948L13.3751 0.927878ZM21.4104 9.91366C21.1607 9.9702 20.9009 10 20.6341 10C20.386 10 20.1439 9.97423 19.9104 9.92513V14.8453C19.9104 15.2919 19.6721 15.7046 19.2854 15.9279L14.7425 18.5507C15.0982 18.9202 15.3624 19.3586 15.5259 19.8305L20.0354 17.2269C20.8862 16.7357 21.4104 15.8278 21.4104 14.8453V9.91366ZM8.84478 20.0443C8.9223 19.7647 9.03612 19.4903 9.18793 19.2273C9.29387 19.0438 9.41391 18.8736 9.54589 18.7171L4.71484 15.9279C4.32809 15.7046 4.08984 15.2919 4.08984 14.8453V10.0183C3.57898 10.0632 3.06662 9.99449 2.58984 9.82218V14.8453C2.58984 15.8278 3.11399 16.7357 3.96484 17.2269L8.84478 20.0443Z'
                fill='#31343F'
            />
            <path
                d='M11.5 6.28868C11.8094 6.11004 12.1906 6.11004 12.5 6.28868L15.8301 8.21132C16.1395 8.38996 16.3301 8.72008 16.3301 9.07735V12.9226C16.3301 13.2799 16.1395 13.61 15.8301 13.7887L12.5 15.7113C12.1906 15.89 11.8094 15.89 11.5 15.7113L8.16987 13.7887C7.86047 13.61 7.66987 13.2799 7.66987 12.9226V9.07735C7.66987 8.72008 7.86047 8.38996 8.16987 8.21132L11.5 6.28868Z'
                stroke='#1890ff'
                strokeWidth='1.5'
                strokeLinejoin='round'
            />
            <path d='M12.2859 20.8613L12.2106 11.5982' stroke='#31343F' strokeWidth='1.5' strokeLinecap='round' />
            <circle
                cx='12.2188'
                cy='20.9773'
                r='1.5'
                transform='rotate(120 12.2188 20.9773)'
                fill='white'
                stroke='#1890ff'
                strokeWidth='1.5'
            />
            <path d='M3.84809 6.64703L12 11.2656' stroke='#31343F' strokeWidth='1.5' strokeLinecap='round' />
            <circle
                cx='3.78097'
                cy='6.53104'
                r='1.5'
                transform='rotate(-120 3.78097 6.53104)'
                fill='white'
                stroke='#1890ff'
                strokeWidth='1.5'
            />
            <path d='M20.4999 6.5L12.3955 11.2673' stroke='#31343F' strokeWidth='1.5' strokeLinecap='round' />
            <circle cx='20.6338' cy='6.5' r='1.5' fill='white' stroke='#1890ff' strokeWidth='1.5' />
        </g>
    </svg>
)

/**
 * @description:TCP-PortLog
 */
export const MenuTCPPortLogIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={TCPPortLog} {...props} />
}

const YsoJavaHack = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7793'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7793)'>
            <path
                d='M7 18.5L3.28735 19.6138C2.64574 19.8063 2 19.3258 2 18.656V14C2 12.8954 2.89543 12 4 12H10C11.1046 12 12 12.8954 12 14M6 16.5L4 17V16'
                stroke='#1890ff'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M9 8C9 9.10457 8.10457 10 7 10C5.89543 10 5 9.10457 5 8C5 6.89543 5.89543 6 7 6C8.10457 6 9 6.89543 9 8Z'
                stroke='#1890ff'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M10 5.09173L11.0944 3.13025C11.8573 1.7629 13.8246 1.7629 14.5875 3.13025L22.3404 17.0255C23.0842 18.3586 22.1204 20 20.5938 20H20M10 21H5M9.69371 21H16.6396C16.8548 21 17.0459 20.8623 17.114 20.6581L18.7806 15.6581C18.8886 15.3343 18.6476 15 18.3063 15H11.3604C11.1452 15 10.9541 15.1377 10.886 15.3419L9.21937 20.3419C9.11145 20.6656 9.35243 21 9.69371 21Z'
                stroke='#31343F'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </g>
    </svg>
)

/**
 * @description:Yso-Java Hack
 */
export const MenuYsoJavaHackIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YsoJavaHack} {...props} />
}

const PluginBatchExecution = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2812_7819'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2812_7819)'>
            <path
                d='M3 6.48806C3 5.60484 3.57934 4.8262 4.4253 4.57241L10.4253 2.77241C11.7085 2.38744 13 3.34834 13 4.68806V19.3119C13 20.6517 11.7085 21.6126 10.4253 21.2276L4.4253 19.4276C3.57934 19.1738 3 18.3952 3 17.5119V6.48806Z'
                stroke='#31343F'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M16 19C16.2491 19.4982 17 19.3209 17 18.7639V5.23605C17 4.67904 16.2491 4.50177 16 4.99998M20 18C20.2491 18.4982 21 18.3209 21 17.7639V6.23605C21 5.67904 20.2491 5.50177 20 5.99998'
                stroke='#31343F'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path d='M5.5 9L10 8' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M5.5 12H8.5' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M5.5 15L9 16' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
        </g>
    </svg>
)

/**
 * @description:插件批量执行
 */
export const MenuPluginBatchExecutionIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={PluginBatchExecution} {...props} />
}

const DefaultPlugin = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_2879_6168'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_2879_6168)'>
            <path
                d='M10.5 3.11111C10.5 1.94518 11.4452 1 12.6111 1C13.777 1 14.7222 1.94518 14.7222 3.11111V4.16667C14.7222 4.74963 15.1948 5.22222 15.7778 5.22222H18.9444C19.5274 5.22222 20 5.69481 20 6.27778V9.44444C20 10.0274 19.5274 10.5 18.9444 10.5H17.8889C16.723 10.5 15.7778 11.4452 15.7778 12.6111C15.7778 13.777 16.723 14.7222 17.8889 14.7222H18.9444C19.5274 14.7222 20 15.1948 20 15.7778V18.9444C20 19.5274 19.5274 20 18.9444 20H15.7778C15.1948 20 14.7222 19.5274 14.7222 18.9444V17.8889C14.7222 16.723 13.777 15.7778 12.6111 15.7778C11.4452 15.7778 10.5 16.723 10.5 17.8889V18.9444C10.5 19.5274 10.0274 20 9.44444 20H6.27778C5.69481 20 5.22222 19.5274 5.22222 18.9444V15.7778C5.22222 15.1948 4.74963 14.7222 4.16667 14.7222H3.11111C1.94518 14.7222 1 13.777 1 12.6111C1 11.4452 1.94518 10.5 3.11111 10.5H4.16667C4.74963 10.5 5.22222 10.0274 5.22222 9.44444V6.27778C5.22222 5.69481 5.69481 5.22222 6.27778 5.22222H9.44444C10.0274 5.22222 10.5 4.74963 10.5 4.16667V3.11111Z'
                stroke='#31343F'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M10.5 4.16667V3.11111C10.5 1.94518 11.4452 1 12.6111 1C13.777 1 14.7222 1.94518 14.7222 3.11111V4.16667M4.16667 14.7222H3.11111C1.94518 14.7222 1 13.777 1 12.6111C1 11.4452 1.94518 10.5 3.11111 10.5H4.16667'
                stroke='#1890ff'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </g>
    </svg>
)

/**
 * @description:默认的插件菜单图标
 */
export const MenuDefaultPluginIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={DefaultPlugin} {...props} />
}

const SpaceEngineHunter = () => (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <mask
            id='mask0_166_5755'
            style={{ maskType: "alpha" }}
            maskUnits='userSpaceOnUse'
            x='0'
            y='0'
            width='24'
            height='24'
        >
            <rect width='24' height='24' fill='#D9D9D9' />
        </mask>
        <g mask='url(#mask0_166_5755)'>
            <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M8.26 11.25H3.78363C4.09288 7.81832 6.50351 4.99257 9.7189 4.06941C9.51187 4.46715 9.32825 4.91563 9.16717 5.39887C8.64952 6.95181 8.32021 8.99973 8.26 11.25ZM2.25 12C2.25 6.61522 6.61522 2.25 12 2.25C17.3848 2.25 21.75 6.61522 21.75 12C21.75 12.1094 21.7482 12.2183 21.7446 12.3269C21.311 11.7675 20.7806 11.287 20.1787 10.9102C19.7462 7.63277 17.3897 4.96192 14.2811 4.06941C14.4881 4.46715 14.6718 4.91563 14.8328 5.39887C15.2643 6.69318 15.5649 8.33133 15.6879 10.1439C15.1691 10.2596 14.6757 10.4425 14.2172 10.683C14.1221 8.79358 13.8265 7.1232 13.4098 5.87321C13.1529 5.10255 12.8636 4.53298 12.5787 4.17149C12.2871 3.80155 12.0859 3.75 12 3.75C11.9141 3.75 11.7129 3.80155 11.4213 4.17149C11.1364 4.53298 10.8471 5.10255 10.5902 5.87321C10.1323 7.24686 9.82057 9.12821 9.76056 11.25H13.3338C12.7937 11.6674 12.3268 12.1749 11.9556 12.75H9.76056C9.82057 14.8718 10.1323 16.7531 10.5902 18.1268C10.8471 18.8975 11.1364 19.467 11.4213 19.8285C11.7129 20.1985 11.9141 20.25 12 20.25C12.0758 20.25 12.2415 20.2098 12.4799 19.9459C13.0258 20.5707 13.6992 21.0813 14.4594 21.4372C13.6738 21.6413 12.8496 21.75 12 21.75C6.61522 21.75 2.25 17.3848 2.25 12ZM9.16717 18.6011C9.32825 19.0844 9.51187 19.5329 9.7189 19.9306C6.50351 19.0074 4.09288 16.1817 3.78363 12.75H8.26C8.32021 15.0003 8.64952 17.0482 9.16717 18.6011Z'
                fill='#31343F'
            />
            <path d='M20 19L22.1213 21.1213' stroke='#1890ff' strokeWidth='1.5' strokeLinecap='round' />
            <circle cx='17' cy='16' r='4' stroke='#1890ff' strokeWidth='1.5' />
        </g>
    </svg>
)

/**
 * @description:空间引擎: Hunter
 */
export const MenuSpaceEngineHunterIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={SpaceEngineHunter} {...props} />
}

const Payload = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6.0835 1.5V6.11981L6.2867 6.01821C6.526 5.89856 6.80766 5.89856 7.04696 6.01821L7.25016 6.11981V1.5H6.0835Z'
            fill='currentColor'
        />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M4.5835 1.50135V7.17153C4.5835 7.80341 5.24846 8.21438 5.81363 7.93179L6.66683 7.50519L7.52003 7.93179C8.0852 8.21438 8.75016 7.80341 8.75016 7.17153V1.5H11.3332C12.7139 1.5 13.8332 2.61929 13.8332 4V12C13.8332 13.3807 12.7139 14.5 11.3332 14.5H4.66651C3.28579 14.5 2.1665 13.3807 2.1665 12V4C2.1665 2.64707 3.24121 1.54514 4.5835 1.50135ZM3.4165 12.6667C3.4165 12.3445 3.67767 12.0834 3.99984 12.0834H12.5804C12.5376 12.7349 11.9955 13.25 11.3332 13.25H3.99984C3.67767 13.25 3.4165 12.9889 3.4165 12.6667Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description:Payload
 */
export const MenuPayloadIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={Payload} {...props} />
}

const YakRunner = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M1.59998 3.99999C1.59998 3.11634 2.31632 2.39999 3.19998 2.39999H12.8C13.6836 2.39999 14.4 3.11634 14.4 3.99999V12C14.4 12.8837 13.6836 13.6 12.8 13.6H3.19998C2.31632 13.6 1.59998 12.8837 1.59998 12V3.99999ZM4.23429 5.03431C4.54671 4.72189 5.05324 4.72189 5.36566 5.03431L7.76566 7.43431C8.07808 7.74673 8.07808 8.25326 7.76566 8.56568L5.36566 10.9657C5.05324 11.2781 4.54671 11.2781 4.23429 10.9657C3.92187 10.6533 3.92187 10.1467 4.23429 9.83431L6.0686 7.99999L4.23429 6.16568C3.92187 5.85326 3.92187 5.34673 4.23429 5.03431ZM8.79998 9.59999C8.35815 9.59999 7.99998 9.95817 7.99998 10.4C7.99998 10.8418 8.35815 11.2 8.79998 11.2H11.2C11.6418 11.2 12 10.8418 12 10.4C12 9.95817 11.6418 9.59999 11.2 9.59999H8.79998Z'
            fill='currentColor'
        />
    </svg>
)

/**
 * @description:YakRunner
 */
export const MenuYakRunnerIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YakRunner} {...props} />
}

const WebsocketFuzzer = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0_3031_9116" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_3031_9116)">
            <path d="M20 17C20 18.1046 16.4183 19 12 19C7.58172 19 4 18.1046 4 17" stroke="#31343F" stroke-width="1.5" />
            <path d="M19.25 20C19.25 19.8473 19.3557 19.9165 18.9897 20.1328C18.6739 20.3195 18.167 20.5136 17.475 20.6866C16.1023 21.0298 14.1663 21.25 12 21.25V22.75C14.252 22.75 16.316 22.5225 17.8388 22.1418C18.5944 21.9529 19.2591 21.716 19.7529 21.4241C20.1966 21.1619 20.75 20.705 20.75 20H19.25ZM12 21.25C9.83371 21.25 7.89769 21.0298 6.52505 20.6866C5.83296 20.5136 5.32609 20.3195 5.0103 20.1328C4.64431 19.9165 4.75 19.8473 4.75 20H3.25C3.25 20.705 3.80341 21.1619 4.24706 21.4241C4.74092 21.716 5.40562 21.9529 6.16124 22.1418C7.68404 22.5225 9.74801 22.75 12 22.75V21.25ZM19.25 14V20H20.75V14H19.25ZM4.75 20V14H3.25V20H4.75ZM19.25 14C19.25 13.8473 19.3557 13.9165 18.9897 14.1328C18.6739 14.3195 18.167 14.5136 17.475 14.6866C16.1023 15.0298 14.1663 15.25 12 15.25V16.75C14.252 16.75 16.316 16.5225 17.8388 16.1418C18.5944 15.9529 19.2591 15.716 19.7529 15.4241C20.1966 15.1619 20.75 14.705 20.75 14H19.25ZM12 15.25C9.83371 15.25 7.89769 15.0298 6.52505 14.6866C5.83296 14.5136 5.32609 14.3195 5.0103 14.1328C4.64431 13.9165 4.75 13.8473 4.75 14H3.25C3.25 14.705 3.80341 15.1619 4.24706 15.4241C4.74092 15.716 5.40562 15.9529 6.16124 16.1418C7.68404 16.5225 9.74801 16.75 12 16.75V15.25ZM4.75 14C4.75 14.1527 4.64431 14.0835 5.0103 13.8672C5.32609 13.6805 5.83296 13.4864 6.52505 13.3134C7.89769 12.9702 9.83371 12.75 12 12.75V11.25C9.74801 11.25 7.68404 11.4775 6.16124 11.8582C5.40562 12.0471 4.74092 12.284 4.24706 12.5759C3.80341 12.8381 3.25 13.295 3.25 14H4.75ZM12 12.75C14.1663 12.75 16.1023 12.9702 17.475 13.3134C18.167 13.4864 18.6739 13.6805 18.9897 13.8672C19.3557 14.0835 19.25 14.1527 19.25 14H20.75C20.75 13.295 20.1966 12.8381 19.7529 12.5759C19.2591 12.284 18.5944 12.0471 17.8388 11.8582C16.316 11.4775 14.252 11.25 12 11.25V12.75Z" fill="#31343F" />
            <path d="M12 6V14" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M21 8V8C21 8.85693 20.3619 9.57976 19.5116 9.68605L16.7519 10.031C15.7511 10.1561 15 11.0069 15 12.0156V13" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M3 8V8C3 8.85693 3.6381 9.57976 4.48842 9.68605L7.24807 10.031C8.24893 10.1561 9 11.0069 9 12.0156V13" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M11.75 2.14434C11.9047 2.05502 12.0953 2.05502 12.25 2.14434L13.4821 2.85566C13.6368 2.94498 13.7321 3.11004 13.7321 3.28868V4.71132C13.7321 4.88996 13.6368 5.05502 13.4821 5.14434L12.25 5.85566C12.0953 5.94498 11.9047 5.94498 11.75 5.85566L10.5179 5.14434C10.3632 5.05502 10.2679 4.88996 10.2679 4.71132V3.28868C10.2679 3.11004 10.3632 2.94498 10.5179 2.85566L11.75 2.14434Z" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M20.75 4.14434C20.9047 4.05502 21.0953 4.05502 21.25 4.14434L22.4821 4.85566C22.6368 4.94498 22.7321 5.11004 22.7321 5.28868V6.71132C22.7321 6.88996 22.6368 7.05502 22.4821 7.14434L21.25 7.85566C21.0953 7.94498 20.9047 7.94498 20.75 7.85566L19.5179 7.14434C19.3632 7.05502 19.2679 6.88996 19.2679 6.71132V5.28868C19.2679 5.11004 19.3632 4.94498 19.5179 4.85566L20.75 4.14434Z" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M2.75 4.14434C2.9047 4.05502 3.0953 4.05502 3.25 4.14434L4.48205 4.85566C4.63675 4.94498 4.73205 5.11004 4.73205 5.28868V6.71132C4.73205 6.88996 4.63675 7.05502 4.48205 7.14434L3.25 7.85566C3.0953 7.94498 2.9047 7.94498 2.75 7.85566L1.51795 7.14434C1.36325 7.05502 1.26795 6.88996 1.26795 6.71132V5.28868C1.26795 5.11004 1.36325 4.94498 1.51795 4.85566L2.75 4.14434Z" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
    </svg>

)

/**
 * @description:WebsocketFuzzer
 */
export const MenuWebsocketFuzzerIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={WebsocketFuzzer} {...props} />
}

const SubDomainCollection = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0_3031_9175" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_3031_9175)">
            <path d="M11 5H17C18.1046 5 19 5.89543 19 7V7" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6 16L10 16" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M3 11L22 11" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M22 18V9C22 7.89543 21.1046 7 20 7H13.0704C12.4017 7 11.7772 6.6658 11.4063 6.1094L10.5937 4.8906C10.2228 4.3342 9.59834 4 8.92963 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18Z" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
    </svg>

)

/**
 * @description:子域名收集
 */
export const MenuSubDomainCollectionIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={SubDomainCollection} {...props} />
}

const Report = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0_3031_9207" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_3031_9207)">
            <path d="M17 14.5V12V5C17 3.89543 16.1046 3 15 3H5C3.89543 3 3 3.89543 3 5V17C3 19.2091 4.79086 21 7 21H10" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6 8L14 8" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6 13L12 13" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
        <path d="M11 17V16.25H10.25V17H11ZM23 17H23.75V16.25H23V17ZM10.25 17C10.25 18.7949 8.79493 20.25 7 20.25V21.75C9.62335 21.75 11.75 19.6234 11.75 17H10.25ZM11 17.75H23V16.25H11V17.75ZM22.25 17C22.25 18.7949 20.7949 20.25 19 20.25V21.75C21.6234 21.75 23.75 19.6234 23.75 17H22.25ZM19 20.25H7V21.75H19V20.25Z" fill="#31343F" />
    </svg>
)

/**
 * @description:报告
 */
export const MenuReportIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={Report} {...props} />
}

const PlugExecutionResults = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0_3031_9237" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_3031_9237)">
            <path d="M8 3H15C16.1046 3 17 3.89543 17 5V9.5M3 8V19C3 20.1046 3.89543 21 5 21H11.5" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M8 6V3L3 8H6C7.10457 8 8 7.10457 8 6Z" stroke="#31343F" stroke-width="1.5" stroke-linejoin="round" />
            <path d="M6 11L14 11" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6 16L9 16" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M21.7877 13.7197C21.674 13.7256 21.5596 13.7285 21.4444 13.7285C19.737 13.7285 18.1794 13.0749 17 12C15.8205 13.0749 14.263 13.7285 12.5556 13.7285C12.4404 13.7285 12.326 13.7255 12.2123 13.7196C12.0737 14.2647 12 14.8364 12 15.4256C12 18.5887 14.1246 21.2464 17 22C19.8754 21.2464 22 18.5887 22 15.4256C22 14.8364 21.9263 14.2648 21.7877 13.7197Z" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M15.3333 17.1227L16.4444 18.2541L18.6666 15.9913" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
    </svg>

)

/**
 * @description:插件执行结果
 */
export const MenuPlugExecutionResultsIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={PlugExecutionResults} {...props} />
}

const PortAssets = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0_3031_7917" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_3031_7917)">
            <path d="M18 8H20C21.1046 8 22 8.89543 22 10V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V10C2 8.89543 2.89543 8 4 8H6" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M18 8V6C18 5.44772 17.5523 5 17 5H16M6 8V6C6 5.44772 6.44772 5 7 5H8" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M16 5V4C16 3.44772 15.5523 3 15 3H9C8.44772 3 8 3.44772 8 4V5" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6 12V16" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M9 12V16" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M12 12V16" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M15 12V16" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M18 12V16" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
    </svg>

)

/**
 * @description:端口资产
 */
export const MenuPortAssetsIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={PortAssets} {...props} />
}

const VulnerabilityRisk = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0_3031_7890" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_3031_7890)">
            <path d="M17.5 6H19C20.1046 6 21 6.89543 21 8V16C21 17.1046 20.1046 18 19 18H5C3.89543 18 3 17.1046 3 16V8C3 6.89543 3.89543 6 5 6H6.5" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M1 18H23V19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V18Z" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M12 6.375V7.5M12 9.75H12.0056M8.12134 12H15.8787C16.7406 12 17.2793 11.0625 16.8483 10.3125L12.9697 3.5625C12.5387 2.8125 11.4613 2.8125 11.0303 3.5625L7.15168 10.3125C6.72072 11.0625 7.25942 12 8.12134 12Z" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
    </svg>

)

/**
 * @description:漏洞与风险
 */
export const MenuVulnerabilityRiskIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={VulnerabilityRisk} {...props} />
}


const DomainAssets = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0_3031_9146" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_3031_9146)">
            <mask id="mask1_3031_9146" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="2" y="14" width="20" height="9">
                <path d="M11.7948 22.9077C11.9253 22.9664 12.0747 22.9664 12.2052 22.9077L21.7052 18.6327C21.8846 18.5519 22 18.3735 22 18.1767V14.7385C22 14.3848 21.6427 14.1429 21.3143 14.2743L12.1857 17.9257C12.0665 17.9734 11.9335 17.9734 11.8143 17.9257L2.6857 14.2743C2.35726 14.1429 2 14.3848 2 14.7385V18.1767C2 18.3735 2.11539 18.5519 2.29482 18.6327L11.7948 22.9077Z" fill="white" />
            </mask>
            <g mask="url(#mask1_3031_9146)">
                <path d="M11.6583 13.1243C11.879 13.044 12.121 13.044 12.3417 13.1243L20.4156 16.0602C21.2932 16.3794 21.2932 17.6206 20.4156 17.9398L12.3417 20.8757C12.121 20.956 11.879 20.956 11.6583 20.8757L3.58443 17.9398C2.70675 17.6206 2.70676 16.3794 3.58443 16.0602L11.6583 13.1243Z" stroke="#31343F" stroke-width="1.5" />
            </g>
            <mask id="mask2_3031_9146" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="2" y="9" width="20" height="9">
                <path d="M11.7948 17.9077C11.9253 17.9664 12.0747 17.9664 12.2052 17.9077L21.7052 13.6327C21.8846 13.5519 22 13.3735 22 13.1767V9.73852C22 9.38478 21.6427 9.14291 21.3143 9.27428L12.1857 12.9257C12.0665 12.9734 11.9335 12.9734 11.8143 12.9257L2.6857 9.27428C2.35726 9.14291 2 9.38478 2 9.73852V13.1767C2 13.3735 2.11539 13.5519 2.29482 13.6327L11.7948 17.9077Z" fill="white" />
            </mask>
            <g mask="url(#mask2_3031_9146)">
                <path d="M11.6583 8.12427C11.879 8.04399 12.121 8.04399 12.3417 8.12427L20.4156 11.0602C21.2932 11.3794 21.2932 12.6206 20.4156 12.9398L12.3417 15.8757C12.121 15.956 11.879 15.956 11.6583 15.8757L3.58443 12.9398C2.70675 12.6206 2.70676 11.3794 3.58443 11.0602L11.6583 8.12427Z" stroke="#1890ff" stroke-width="1.5" />
            </g>
            <path d="M11.6583 3.12427C11.879 3.04399 12.121 3.04399 12.3417 3.12427L20.4156 6.06021C21.2932 6.37936 21.2932 7.62064 20.4156 7.93979L12.3417 10.8757C12.121 10.956 11.879 10.956 11.6583 10.8757L3.58443 7.93979C2.70675 7.62064 2.70676 6.37936 3.58443 6.06021L11.6583 3.12427Z" stroke="#31343F" stroke-width="1.5" />
        </g>
    </svg>

)

/**
 * @description:域名资产
 */
export const MenuDomainAssetsIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={DomainAssets} {...props} />
}

const HTTPHistory = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0_3031_8824" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_3031_8824)">
            <path d="M13 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4H18C19.1046 4 20 4.89543 20 6V10" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6 8L9 8" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M12 8L17 8" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6 12L9 12" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6 16L9 16" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M12 12L15 12" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M12 16L13 16" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="19" cy="17" r="4" stroke="#31343F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M19 15V17L20.5 18.5" stroke="#1890ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
    </svg>

)

/**
 * @description:HTTPHistory
 */
export const MenuHTTPHistoryIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={HTTPHistory} {...props} />
}
