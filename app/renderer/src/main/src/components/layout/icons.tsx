import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'

const YakitCopySvg = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 3.5V7.5C4 8.05228 4.44772 8.5 5 8.5H8M4 3.5V2.5C4 1.94772 4.44772 1.5 5 1.5H7.29289C7.4255 1.5 7.55268 1.55268 7.64645 1.64645L9.85355 3.85355C9.94732 3.94732 10 4.0745 10 4.20711V7.5C10 8.05228 9.55228 8.5 9 8.5H8M4 3.5V3.5C2.89543 3.5 2 4.39543 2 5.5V9.5C2 10.0523 2.44772 10.5 3 10.5H6C7.10457 10.5 8 9.60457 8 8.5V8.5"
      stroke="var(--Colors-Use-Main-Primary)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** @name 复制图标 */
export const YakitCopySvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={YakitCopySvg} {...props} />
}

/** --------------------MAC系统UI操作图标---------------------- **/
const MacUIOpCloseSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C11.0376 2.5 13.5 4.96243 13.5 8Z"
      fill="#F7544A"
      stroke="#EA4439"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.46967 5.46967C5.76256 5.17678 6.23744 5.17678 6.53033 5.46967L8 6.93934L9.46967 5.46967C9.76256 5.17678 10.2374 5.17678 10.5303 5.46967C10.8232 5.76256 10.8232 6.23744 10.5303 6.53033L9.06066 8L10.5303 9.46967C10.8232 9.76256 10.8232 10.2374 10.5303 10.5303C10.2374 10.8232 9.76256 10.8232 9.46967 10.5303L8 9.06066L6.53033 10.5303C6.23744 10.8232 5.76256 10.8232 5.46967 10.5303C5.17678 10.2374 5.17678 9.76256 5.46967 9.46967L6.93934 8L5.46967 6.53033C5.17678 6.23744 5.17678 5.76256 5.46967 5.46967Z"
      fill="#483A33"
    />
  </svg>
)
/** @name MAC-关闭图标 */
export const MacUIOpCloseSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={MacUIOpCloseSvg} {...props} />
}
const MacUIOpMinSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C11.0376 2.5 13.5 4.96243 13.5 8Z"
      fill="#FFB660"
      stroke="#F8A94D"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.58337 8C4.58337 7.58579 4.91916 7.25 5.33337 7.25H10.6667C11.0809 7.25 11.4167 7.58579 11.4167 8C11.4167 8.41421 11.0809 8.75 10.6667 8.75H5.33337C4.91916 8.75 4.58337 8.41421 4.58337 8Z"
      fill="#483A33"
    />
  </svg>
)
/** @name MAC-最小化图标 */
export const MacUIOpMinSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={MacUIOpMinSvg} {...props} />
}
const MacUIOpMaxSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C11.0376 2.5 13.5 4.96243 13.5 8Z"
      fill="#56C991"
      stroke="#4BBB84"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.35473 5.51062C5.35127 5.42316 5.4231 5.35133 5.51056 5.3548L8.83166 5.48641C8.96235 5.49159 9.02427 5.64988 8.93178 5.74236L5.7423 8.93185C5.64982 9.02433 5.49153 8.96241 5.48635 8.83172L5.35473 5.51062ZM10.4894 10.6452C10.5769 10.6487 10.6487 10.5768 10.6453 10.4894L10.5136 7.16829C10.5085 7.0376 10.3502 6.97568 10.2577 7.06816L7.0682 10.2576C6.97572 10.3501 7.03764 10.5084 7.16833 10.5136L10.4894 10.6452Z"
      fill="#483A33"
    />
  </svg>
)
/** @name MAC-最大化图标 */
export const MacUIOpMaxSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={MacUIOpMaxSvg} {...props} />
}
const MacUIOpRestoreSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C11.0376 2.5 13.5 4.96243 13.5 8Z"
      fill="#56C991"
      stroke="#4BBB84"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.99356 7.8378C7.99702 7.92525 7.92519 7.99708 7.83773 7.99362L4.51663 7.862C4.38594 7.85682 4.32402 7.69853 4.41651 7.60605L7.60599 4.41657C7.69847 4.32408 7.85676 4.38601 7.86194 4.51669L7.99356 7.8378ZM8.16234 8.00637C8.07489 8.00291 8.00306 8.07474 8.00652 8.16219L8.13814 11.4833C8.14332 11.614 8.3016 11.6759 8.39409 11.5834L11.5836 8.39394C11.6761 8.30146 11.6141 8.14317 11.4834 8.13799L8.16234 8.00637Z"
      fill="#483A33"
    />
  </svg>
)
/** @name MAC-恢复图标-显示 */
export const MacUIOpRestoreSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={MacUIOpRestoreSvg} {...props} />
}

/** --------------------WIN系统UI操作图标(暂linux系统共用win系统同套图标)---------------------- **/
const WinUIOpCloseSvg = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5 15L15 5M5 5L15 15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** @name WIN-关闭图标 */
export const WinUIOpCloseSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={WinUIOpCloseSvg} {...props} />
}
const WinUIOpMaxSvg = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="3.33334"
      y="3.33331"
      width="13.3333"
      height="13.3333"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** @name WIN-最大化图标 */
export const WinUIOpMaxSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={WinUIOpMaxSvg} {...props} />
}
const WinUIOpRestoreSvg = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13.3333 13.3333H15C15.9205 13.3333 16.6667 12.5871 16.6667 11.6666V4.99998C16.6667 4.07951 15.9205 3.33331 15 3.33331H8.33333C7.41286 3.33331 6.66666 4.07951 6.66666 4.99998V6.66665M11.6667 16.6666H5C4.07952 16.6666 3.33333 15.9205 3.33333 15V8.33331C3.33333 7.41284 4.07952 6.66665 5 6.66665H11.6667C12.5871 6.66665 13.3333 7.41284 13.3333 8.33331V15C13.3333 15.9205 12.5871 16.6666 11.6667 16.6666Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** @name WIN-恢复图标 */
export const WinUIOpRestoreSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={WinUIOpRestoreSvg} {...props} />
}

/** --------------------导航栏状态&功能图标---------------------- **/
const GooglePhotosLogoSvg = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10.3125 10.3125V1.875C11.2963 1.875 12.2552 2.18455 13.0533 2.7598C13.8514 3.33505 14.4483 4.14684 14.7595 5.08018C15.0706 6.01352 15.0801 7.02109 14.7868 7.96016C14.4934 8.89923 13.9121 9.72221 13.125 10.3125"
      fill="var(--Colors-Use-Main-Primary)"
    />
    <path
      d="M10.3125 10.3125V1.875C11.2963 1.875 12.2552 2.18455 13.0533 2.7598C13.8514 3.33505 14.4483 4.14684 14.7595 5.08018C15.0706 6.01352 15.0801 7.02109 14.7868 7.96016C14.4934 8.89923 13.9121 9.72221 13.125 10.3125"
      stroke="var(--Colors-Use-Neutral-Text-1-Title)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.6875 9.6875V18.125C8.70368 18.125 7.74479 17.8154 6.94667 17.2402C6.14855 16.6649 5.55166 15.8532 5.24055 14.9198C4.92943 13.9865 4.91987 12.9789 5.21322 12.0398C5.50656 11.1008 6.08794 10.2778 6.875 9.6875"
      fill="var(--Colors-Use-Main-Primary)"
    />
    <path
      d="M9.6875 9.6875V18.125C8.70368 18.125 7.74479 17.8154 6.94667 17.2402C6.14855 16.6649 5.55166 15.8532 5.24055 14.9198C4.92943 13.9865 4.91987 12.9789 5.21322 12.0398C5.50656 11.1008 6.08794 10.2778 6.875 9.6875"
      stroke="var(--Colors-Use-Neutral-Text-1-Title)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.3125 9.6875H1.875C1.875 8.70368 2.18455 7.74479 2.7598 6.94667C3.33505 6.14855 4.14684 5.55166 5.08018 5.24055C6.01352 4.92943 7.02109 4.91987 7.96016 5.21322C8.89923 5.50656 9.72221 6.08794 10.3125 6.875"
      stroke="var(--Colors-Use-Neutral-Text-1-Title)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.6875 10.3125H18.125C18.125 11.2963 17.8154 12.2552 17.2402 13.0533C16.6649 13.8514 15.8532 14.4483 14.9198 14.7595C13.9865 15.0706 12.9789 15.0801 12.0398 14.7868C11.1008 14.4934 10.2778 13.9121 9.6875 13.125"
      stroke="var(--Colors-Use-Neutral-Text-1-Title)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** @name 小风车图标(引擎进程列表) */
export const GooglePhotosLogoSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={GooglePhotosLogoSvg} {...props} />
}
const RiskStateSvg = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <mask
      id="mask0_2434_66415"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="20"
      height="20"
    >
      <rect x="0.75" y="0.75" width="18.5" height="18.5" fill="#D9D9D9" stroke="currentColor" strokeWidth="1.5" />
    </mask>
    <g mask="url(#mask0_2434_66415)">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.8334 6.5H8.16671C6.786 6.5 5.66671 7.61928 5.66671 9V12.5C5.66671 14.8932 7.60681 16.8333 10 16.8333C12.3933 16.8333 14.3334 14.8932 14.3334 12.5V9C14.3334 7.61929 13.2141 6.5 11.8334 6.5ZM8.16671 5C5.95757 5 4.16671 6.79086 4.16671 9V12.5C4.16671 15.7217 6.77838 18.3333 10 18.3333C13.2217 18.3333 15.8334 15.7217 15.8334 12.5V9C15.8334 6.79086 14.0425 5 11.8334 5H8.16671Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.7499 5.83333V17.5H9.24995V5.83333H10.7499Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.916656 10.8333C0.916656 10.4191 1.25244 10.0833 1.66666 10.0833H4.16666C4.58087 10.0833 4.91666 10.4191 4.91666 10.8333C4.91666 11.2476 4.58087 11.5833 4.16666 11.5833H1.66666C1.25244 11.5833 0.916656 11.2476 0.916656 10.8333Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.0833 10.8333C15.0833 10.4191 15.4191 10.0833 15.8333 10.0833H18.3333C18.7475 10.0833 19.0833 10.4191 19.0833 10.8333C19.0833 11.2476 18.7475 11.5833 18.3333 11.5833H15.8333C15.4191 11.5833 15.0833 11.2476 15.0833 10.8333Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 3.25C9.0335 3.25 8.25 4.0335 8.25 5C8.25 5.41421 7.91422 5.75 7.5 5.75C7.08579 5.75 6.75 5.41421 6.75 5C6.75 3.20507 8.20508 1.75 10 1.75C11.7949 1.75 13.25 3.20507 13.25 5C13.25 5.41421 12.9142 5.75 12.5 5.75C12.0858 5.75 11.75 5.41421 11.75 5C11.75 4.0335 10.9665 3.25 10 3.25Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.4999 4.25C17.9142 4.25 18.2499 4.58578 18.2499 5C18.2499 6.79492 16.7949 8.25 14.9999 8.25C14.5857 8.25 14.2499 7.91421 14.2499 7.5C14.2499 7.08578 14.5857 6.75 14.9999 6.75C15.9664 6.75 16.7499 5.9665 16.7499 5C16.7499 4.58578 17.0857 4.25 17.4999 4.25Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.49995 18.25C2.08574 18.25 1.74995 17.9142 1.74995 17.5C1.74995 15.7051 3.20503 14.25 4.99995 14.25C5.41416 14.25 5.74995 14.5858 5.74995 15C5.74995 15.4142 5.41416 15.75 4.99995 15.75C4.03345 15.75 3.24995 16.5335 3.24995 17.5C3.24995 17.9142 2.91416 18.25 2.49995 18.25Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.49995 4.25C2.08574 4.25 1.74995 4.58578 1.74995 5C1.74995 6.79492 3.20503 8.25 4.99995 8.25C5.41416 8.25 5.74995 7.91421 5.74995 7.5C5.74995 7.08578 5.41416 6.75 4.99995 6.75C4.03345 6.75 3.24995 5.9665 3.24995 5C3.24995 4.58578 2.91416 4.25 2.49995 4.25Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.4999 18.25C17.9142 18.25 18.2499 17.9142 18.2499 17.5C18.2499 15.7051 16.7949 14.25 14.9999 14.25C14.5857 14.25 14.2499 14.5858 14.2499 15C14.2499 15.4142 14.5857 15.75 14.9999 15.75C15.9664 15.75 16.7499 16.5335 16.7499 17.5C16.7499 17.9142 17.0857 18.25 17.4999 18.25Z"
        fill="currentColor"
      />
    </g>
  </svg>
)
/** @name 风险状态提示图标 */
export const RiskStateSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={RiskStateSvg} {...props} />
}
const VersionUpdateSvg = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12.5 14.1667H16.6667L15.4959 12.9959C15.1784 12.6784 15 12.2477 15 11.7987V9.16667C15 6.98964 13.6086 5.13757 11.6667 4.45118V4.16667C11.6667 3.24619 10.9205 2.5 9.99999 2.5C9.07952 2.5 8.33333 3.24619 8.33333 4.16667V4.45118C6.39134 5.13757 4.99999 6.98964 4.99999 9.16667V11.7987C4.99999 12.2477 4.82162 12.6784 4.50411 12.9959L3.33333 14.1667H7.49999M12.5 14.1667V15C12.5 16.3807 11.3807 17.5 9.99999 17.5C8.61928 17.5 7.49999 16.3807 7.49999 15V14.1667M12.5 14.1667H7.49999"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** @name 版本更新状态图标 */
export const VersionUpdateSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={VersionUpdateSvg} {...props} />
}
const UISettingSvg = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8.60386 3.59776C8.95919 2.13408 11.0408 2.13408 11.3961 3.59776C11.6257 4.54327 12.709 4.99198 13.5398 4.48571C14.8261 3.70199 16.298 5.17392 15.5143 6.46015C15.008 7.29105 15.4567 8.37431 16.4022 8.60386C17.8659 8.95919 17.8659 11.0408 16.4022 11.3961C15.4567 11.6257 15.008 12.709 15.5143 13.5398C16.298 14.8261 14.8261 16.298 13.5398 15.5143C12.709 15.008 11.6257 15.4567 11.3961 16.4022C11.0408 17.8659 8.95919 17.8659 8.60386 16.4022C8.37431 15.4567 7.29105 15.008 6.46016 15.5143C5.17392 16.298 3.70199 14.8261 4.48571 13.5398C4.99198 12.709 4.54327 11.6257 3.59776 11.3961C2.13408 11.0408 2.13408 8.95919 3.59776 8.60386C4.54327 8.37431 4.99198 7.29105 4.48571 6.46015C3.70199 5.17392 5.17392 3.70199 6.46015 4.48571C7.29105 4.99198 8.37431 4.54327 8.60386 3.59776Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12.5 10C12.5 11.3807 11.3807 12.5 10 12.5C8.61929 12.5 7.5 11.3807 7.5 10C7.5 8.61929 8.61929 7.5 10 7.5C11.3807 7.5 12.5 8.61929 12.5 10Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** @name 设置图标 */
export const UISettingSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={UISettingSvg} {...props} />
}
const CheckedSvg = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="#56C991" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
/** @name 勾选中图标 */
export const CheckedSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={CheckedSvg} {...props} />
}
