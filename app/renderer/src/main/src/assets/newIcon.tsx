import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import type React from 'react'

export interface IconProps extends CustomIconComponentProps {
  onClick: (e: React.MouseEvent) => void
}

const Refresh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M3.33325 3.33337V7.50004H3.81785M16.615 9.16671C16.2049 5.87811 13.3996 3.33337 9.99992 3.33337C7.2021 3.33337 4.80683 5.05685 3.81785 7.50004M3.81785 7.50004H7.49992M16.6666 16.6667V12.5H16.182M16.182 12.5C15.193 14.9432 12.7977 16.6667 9.99992 16.6667C6.60024 16.6667 3.79491 14.122 3.38483 10.8334M16.182 12.5H12.4999"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * @description:  刷新 两个圆弧的箭头
 */
export const RefreshIcon = (props: Partial<IconProps>) => {
  return <Icon component={Refresh} {...props} />
}

const SorterUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M4.66667 10.6666V2.66663M4.66667 2.66663L2 5.33329M4.66667 2.66663L7.33333 5.33329"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.3332 5.33337V13.3334M11.3332 13.3334L13.9998 10.6667M11.3332 13.3334L8.6665 10.6667"
      stroke="var(--Colors-Use-Neutral-Disable)"
      strokeLinecap="round"
      strokeLinejoin="round"
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
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M4.66667 10.6666V2.66663M4.66667 2.66663L2 5.33329M4.66667 2.66663L7.33333 5.33329"
      stroke="var(--Colors-Use-Neutral-Disable)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.3332 5.33337V13.3334M11.3332 13.3334L13.9998 10.6667M11.3332 13.3334L8.6665 10.6667"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
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
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M4.66667 10.6666V2.66663M4.66667 2.66663L2 5.33329M4.66667 2.66663L7.33333 5.33329"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.3332 5.33337V13.3334M11.3332 13.3334L13.9998 10.6667M11.3332 13.3334L8.6665 10.6667"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * @description: 两个箭头颜色一样 排序
 */
export const DisableSorterIcon = (props: Partial<IconProps>) => {
  return <Icon component={DisableSorter} {...props} />
}

const ChevronUp = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 7.5L6 4L9.5 7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * @description: 方向性：向上
 */
export const ChevronUpIcon = (props: Partial<IconProps>) => {
  return <Icon component={ChevronUp} {...props} />
}

const Check = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2.08333 5.41667L3.74999 7.08333L7.91666 2.91667"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
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
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.5 9.5L4 6L7.5 2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * @description:向左 left 方向性
 */
export const ChevronLeftIcon = (props: Partial<IconProps>) => {
  return <Icon component={ChevronLeft} {...props} />
}

const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * @description:向右 right
 */
export const ChevronRightIcon = (props: Partial<IconProps>) => {
  return <Icon component={ChevronRight} {...props} />
}

const CloseCircle = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8.33333 11.6667L10 10M10 10L11.6667 8.33333M10 10L8.33333 8.33333M10 10L11.6667 11.6667M17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5C14.1421 2.5 17.5 5.85786 17.5 10Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * @description: CloseCircle 带圈得删除 x
 */
export const CloseCircleIcon = (props: Partial<IconProps>) => {
  return <Icon component={CloseCircle} {...props} />
}

const ChromeSvg = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3.93188 4.78666C7.65055 0.459328 14.5466 1.31333 17.1239 6.36999H10.9286C9.81255 6.36999 9.09188 6.34466 8.31122 6.75533C7.39388 7.23866 6.70188 8.13399 6.45988 9.18533L3.93188 4.78733V4.78666Z"
      fill="#EA4335"
    />
    <path
      d="M7.33862 10C7.33862 11.4667 8.53129 12.66 9.99729 12.66C11.464 12.66 12.656 11.4667 12.656 10C12.656 8.53336 11.4633 7.34003 9.99729 7.34003C8.53062 7.34003 7.33862 8.53336 7.33862 10Z"
      fill="#4285F4"
    />
    <path
      d="M11.0293 13.482C9.53665 13.9254 7.79065 13.4334 6.83399 11.782C6.10332 10.522 4.17399 7.16069 3.29732 5.63269C0.225986 10.3394 2.87332 16.7547 8.44865 17.8494L11.0287 13.482H11.0293Z"
      fill="#34A853"
    />
    <path
      d="M12.4668 7.34002C13.0678 7.90113 13.4614 8.64908 13.5834 9.46223C13.7054 10.2754 13.5487 11.1059 13.1388 11.8187C12.5048 12.912 10.4801 16.3294 9.49878 17.984C15.2434 18.338 19.4321 12.708 17.5401 7.33936H12.4668V7.34002Z"
      fill="#FBBC05"
    />
  </svg>
)
/** @name Chrome彩色图标 */
export const ChromeSvgIcon = (props: Partial<IconProps>) => {
  return <Icon component={ChromeSvg} {...props} />
}

const DesktopComputerSvg = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8.125 14.1694L7.5 16.6694L6.66667 17.5027H13.3333L12.5 16.6694L11.875 14.1694M2.5 10.836H17.5M4.16667 14.1694H15.8333C16.7538 14.1694 17.5 13.4232 17.5 12.5027V4.16935C17.5 3.24888 16.7538 2.50269 15.8333 2.50269H4.16667C3.24619 2.50269 2.5 3.24888 2.5 4.16935V12.5027C2.5 13.4232 3.24619 14.1694 4.16667 14.1694Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** @name 电脑图标 */
export const DesktopComputerSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={DesktopComputerSvg} {...props} />
}

const ImportSvg = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8.33337 3.33337H5.33337C4.2288 3.33337 3.33337 4.2288 3.33337 5.33337V14.6667C3.33337 15.7713 4.2288 16.6667 5.33337 16.6667H14.6667C15.7713 16.6667 16.6667 15.7713 16.6667 14.6667V10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.6667 3.33337C14.1667 3.33337 10 6.66671 10 10.8334"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12.5 10L10 12.5L7.5 10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** @name 导入图标 */
export const ImportSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={ImportSvg} {...props} />
}

const YakitLogoSvg = () => (
  <svg width="104" height="33" viewBox="0 0 104 33" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M49.5481 24.393C49.6471 23.4762 49.7474 22.2782 49.849 20.7992C49.9507 19.3203 50.0106 18.1427 50.0286 17.2664L44.4574 7.47392C45.3934 7.49045 46.1225 7.49871 46.6448 7.49871C47.1422 7.49871 47.8052 7.49045 48.634 7.47392C49.0082 8.33224 49.5523 9.42029 50.2662 10.7381C50.9801 12.0559 51.5961 13.2634 52.1143 14.3608L55.8114 8.41421C55.9359 8.20755 56.1189 7.89378 56.3603 7.47288C57.1649 7.48941 57.8777 7.49768 58.4989 7.49768C58.8227 7.49768 59.4902 7.48941 60.5016 7.47288L53.705 17.5258L53.5545 20.6618C53.5033 21.587 53.4653 22.8303 53.4404 24.392C52.5535 24.3762 51.9067 24.3682 51.5 24.3682C51.0932 24.3682 50.4426 24.3765 49.5481 24.393ZM61.7842 14.552C61.9004 13.9568 61.973 13.5393 62.0021 13.2996C62.0311 13.0599 62.083 12.6965 62.1577 12.2095C63.143 11.9714 64.1402 11.7851 65.1451 11.6515C65.9749 11.5461 66.8104 11.4923 67.6469 11.4903C68.4955 11.4821 69.3413 11.5885 70.1611 11.8065C70.9221 12.0173 71.5194 12.3538 71.9532 12.816C72.3869 13.2783 72.6027 13.9437 72.6007 14.8124C72.6007 15.2835 72.5346 16.4835 72.4025 18.4123C72.2704 20.3411 72.1922 22.3347 72.168 24.393C71.5371 24.3772 70.9556 24.3693 70.4237 24.3693C69.9173 24.3693 69.3238 24.3772 68.6431 24.393C68.7524 23.3935 68.8402 22.2369 68.9066 20.9232L69.0706 17.8368C68.8365 17.9944 68.594 18.1393 68.3442 18.2708C68.1623 18.3589 67.9747 18.4352 67.7828 18.4991C67.5753 18.568 67.2101 18.6755 66.6871 18.8215C66.1641 18.9676 65.7445 19.0936 65.4284 19.1997C65.1344 19.2979 64.8491 19.4203 64.5755 19.5655C64.3412 19.6879 64.1254 19.8423 63.9342 20.0243C63.7725 20.1747 63.643 20.356 63.5534 20.5575C63.4736 20.7479 63.4334 20.9525 63.4351 21.1588C63.428 21.4845 63.536 21.8023 63.7401 22.0568C63.937 22.3044 64.2037 22.4879 64.5059 22.5837C64.857 22.6892 65.2226 22.7394 65.5892 22.7325C65.8702 22.7313 66.1507 22.7106 66.4287 22.6705C66.8333 22.6013 67.2311 22.4975 67.6179 22.3605C67.3788 23.0521 67.1752 23.7553 67.0077 24.4674C66.4183 24.5666 65.9496 24.6286 65.6017 24.6534C65.2537 24.6782 64.93 24.6906 64.6304 24.6906C63.5845 24.6906 62.7257 24.5504 62.0539 24.2701C61.4115 24.0156 60.8831 23.5386 60.566 22.9268C60.2577 22.3593 60.0932 21.7255 60.0866 21.0803C60.0898 20.3459 60.35 19.6356 60.8223 19.0716C61.0949 18.7529 61.4089 18.4717 61.7561 18.2356C62.138 17.967 62.6914 17.7066 63.4164 17.4545C64.3554 17.144 65.312 16.8893 66.2814 16.6919C66.5968 16.623 66.9247 16.5424 67.2651 16.4501C67.5432 16.3766 67.8158 16.2834 68.0806 16.1711C68.2768 16.0852 68.4563 15.9656 68.6109 15.8177C68.7484 15.6891 68.8601 15.5355 68.9398 15.3652C69.0086 15.2135 69.044 15.049 69.0436 14.8826C69.0521 14.5796 68.9402 14.2856 68.7323 14.0643C68.5083 13.8341 68.2227 13.6728 67.9094 13.5993C67.545 13.5091 67.1705 13.4653 66.795 13.4691C65.2814 13.4746 63.6111 13.8355 61.7842 14.552ZM75.2737 24.393L75.5217 21.1712L75.807 14.9859L75.943 9.69239C75.9596 8.73487 75.9679 7.99538 75.9679 7.47392C76.836 7.49045 77.4527 7.49871 77.818 7.49871C78.2476 7.49871 78.8145 7.49045 79.5187 7.47392L79.2583 11.5038L78.9615 17.9246L78.837 22.7212L78.8245 24.3941C78.0878 24.3782 77.5084 24.3703 77.0865 24.3703C76.6077 24.3696 76.0045 24.3772 75.2768 24.393H75.2737ZM79.2323 17.3346L81.7694 14.2637C81.9866 13.9991 82.2446 13.6733 82.5435 13.2862C82.8423 12.899 83.2228 12.3996 83.6849 11.7879C84.5462 11.8044 85.1757 11.8127 85.5734 11.8127C86.1213 11.8127 86.8131 11.8044 87.6487 11.7879L83.5469 16.4677L82.8112 17.3594C83.4186 18.319 85.1016 20.6635 87.8604 24.393C87.1119 24.3772 86.472 24.3693 85.9408 24.3693C85.4095 24.3693 84.7492 24.3772 83.9599 24.393C83.4756 23.6077 83.0827 22.9774 82.7811 22.5021C82.4795 22.0268 82.199 21.6111 81.9396 21.2549L79.8196 18.2398C79.7626 18.1581 79.5675 17.8554 79.2354 17.3346H79.2323ZM89.2654 24.393C89.392 23.1531 89.4805 22.1163 89.531 21.2828C89.6154 19.9602 89.6891 18.4354 89.7521 16.7084C89.815 14.9815 89.8593 13.3413 89.8849 11.7879C90.6929 11.8044 91.2989 11.8127 91.7029 11.8127C92.0743 11.8127 92.6765 11.8044 93.5094 11.7879C93.3974 13.2249 93.3071 14.5964 93.2386 15.9025C93.1701 17.2085 93.1203 18.7044 93.0892 20.3901C93.0567 22.075 93.0407 23.4093 93.0414 24.393C92.2853 24.3772 91.6786 24.3693 91.2214 24.3693C90.7918 24.3693 90.1409 24.3772 89.2685 24.393H89.2654ZM89.9471 9.63039C89.9804 8.77965 89.997 8.12523 89.997 7.66714V7.27759C90.7513 7.29412 91.3667 7.30239 91.8388 7.30239C92.4863 7.30239 93.0881 7.29412 93.6443 7.27759C93.6194 7.48425 93.6018 7.71983 93.5945 7.98436L93.5322 9.63762C92.9014 9.62109 92.3203 9.61282 91.789 9.61282C91.2577 9.61282 90.6448 9.61868 89.9503 9.63039H89.9471ZM103.829 21.8026C103.729 22.2572 103.572 23.1004 103.356 24.3321C102.814 24.4608 102.266 24.5598 101.713 24.6286C101.341 24.6685 100.967 24.6892 100.592 24.6906C100.038 24.6971 99.4845 24.6388 98.9436 24.517C98.4961 24.4213 98.0816 24.2099 97.742 23.9043C97.436 23.6259 97.2139 23.2681 97.1007 22.871C96.988 22.4736 96.9314 22.0626 96.9326 21.6496C96.9326 21.5463 96.9326 21.3975 96.9451 21.2167C96.9576 21.0359 96.9866 20.4479 97.0489 19.4601L97.3342 14.304H95.5432C95.584 13.808 95.621 13.0106 95.6543 11.9119H97.5293C97.5791 11.4297 97.6289 10.6155 97.6787 9.46919L99.1501 9.18504C99.4573 9.12718 100.051 8.9894 100.933 8.77172C100.873 9.8863 100.838 10.9317 100.829 11.9078H103.997C103.939 13.023 103.91 13.8204 103.91 14.2998H100.736C100.561 17.6629 100.474 19.6089 100.474 20.1379C100.474 20.6504 100.53 21.0472 100.642 21.3283C100.739 21.5914 100.932 21.8082 101.183 21.9348C101.43 22.0584 101.703 22.1221 101.98 22.1208C102.199 22.12 102.417 22.1034 102.634 22.0712C102.86 22.0409 103.259 21.9514 103.832 21.8026H103.829Z"
      fill="url(#paint0_linear_6508_201016)"
    />
    <path
      d="M27.4805 0.00310297H31.6975C31.79 0.00323174 31.8809 0.0268752 31.9616 0.0717957C32.0423 0.116716 32.1101 0.181433 32.1586 0.259786C32.2072 0.338139 32.2348 0.427537 32.2389 0.519509C32.243 0.611481 32.2235 0.702977 32.1821 0.785312L16.6578 31.7045C16.6126 31.7941 16.5433 31.8694 16.4577 31.9221C16.372 31.9747 16.2733 32.0026 16.1726 32.0026C16.072 32.0026 15.9733 31.9747 15.8876 31.9221C15.802 31.8694 15.7327 31.7941 15.6875 31.7045L13.8665 28.0776C13.8301 28.0038 13.8112 27.9227 13.8112 27.8405C13.8112 27.7583 13.8301 27.6772 13.8665 27.6033L26.9959 0.309987C27.0395 0.218594 27.1081 0.141311 27.1938 0.0870201C27.2795 0.0327292 27.3789 0.0036399 27.4805 0.00310297ZM8.96873 9.87517L4.44248 0.309987C4.39847 0.217607 4.32915 0.139495 4.24249 0.0846487C4.15584 0.0298028 4.05538 0.0004566 3.95271 7.10883e-08H0.542973C0.450433 -4.71978e-05 0.359419 0.0234792 0.278578 0.068327C0.197737 0.113175 0.129754 0.17786 0.0810917 0.256242C0.0324295 0.334623 0.0047029 0.424096 0.000547462 0.516154C-0.00360798 0.608212 0.0159472 0.699796 0.0573512 0.782209L6.67551 13.7965C6.72099 13.8868 6.79099 13.9627 6.87756 14.0154C6.96413 14.0681 7.06381 14.0956 7.16528 14.0947C7.26675 14.0939 7.36594 14.0647 7.4516 14.0105C7.53726 13.9563 7.60595 13.8793 7.64987 13.7882L8.96043 11.0624L9.14098 10.6873C9.17633 10.6147 9.1947 10.535 9.1947 10.4543C9.1947 10.3736 9.17633 10.294 9.14098 10.2213L8.96873 9.87517ZM23.4855 0.00310297H19.2685C19.1659 0.00338504 19.0655 0.0326724 18.979 0.0875498C18.8925 0.142427 18.8234 0.220638 18.7798 0.31309L15.5049 7.26197L12.2166 0.31309C12.1727 0.220634 12.1034 0.142448 12.0167 0.0875877C11.93 0.0327276 11.8295 0.00343674 11.7268 0.00310297H8.31189C8.21935 0.0030557 8.12834 0.0265821 8.0475 0.0714299C7.96666 0.116278 7.89868 0.180963 7.85001 0.259345C7.80135 0.337726 7.77362 0.427186 7.76947 0.519244C7.76531 0.611302 7.78487 0.702899 7.82627 0.785312L13.3954 11.7382L9.7366 19.5003C9.70021 19.5743 9.6813 19.6556 9.6813 19.7379C9.6813 19.8203 9.70021 19.9016 9.7366 19.9756L11.5577 23.6024C11.6028 23.6921 11.6721 23.7674 11.7578 23.8201C11.8434 23.8727 11.9421 23.9006 12.0428 23.9006C12.1435 23.9006 12.2421 23.8727 12.3278 23.8201C12.4135 23.7674 12.4828 23.6921 12.5279 23.6024L23.967 0.787368C24.0087 0.705191 24.0287 0.613765 24.025 0.521754C24.0212 0.429743 23.994 0.340207 23.9457 0.26164C23.8975 0.183073 23.8299 0.118077 23.7494 0.07283C23.6688 0.0275832 23.578 0.00358228 23.4855 0.00310297Z"
      fill="url(#paint1_linear_6508_201016)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_6508_201016"
        x1="44.4574"
        y1="15.9831"
        x2="103.994"
        y2="15.9831"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FA931D" />
        <stop offset="1" stopColor="#EF5B27" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_6508_201016"
        x1="-0.00594747"
        y1="16.0026"
        x2="32.2402"
        y2="16.0026"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FA931D" />
        <stop offset="1" stopColor="#EF5B27" />
      </linearGradient>
    </defs>
  </svg>
)
/** @name yakit-logo */
export const YakitLogoSvgIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={YakitLogoSvg} {...props} />
}

const Quit = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6.66667 3.33333C6.37783 3.47633 6.09956 3.63733 5.83333 3.81486C3.82336 5.15522 2.5 7.43782 2.5 10.0283C2.5 14.1548 5.85786 17.5 10 17.5C14.1421 17.5 17.5 14.1548 17.5 10.0283C17.5 7.43782 16.1766 5.15522 14.1667 3.81486C13.9004 3.63733 13.6222 3.47633 13.3333 3.33333M10 1.66667V8.33333"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)
/**
 * @description: Quit 退出
 */
export const QuitIcon = (props: Partial<IconProps>) => {
  return <Icon component={Quit} {...props} />
}

const ArrowsExpand = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 8V4M4 4H8M4 4L9 9M20 8V4M20 4H16M20 4L15 9M4 16V20M4 20H8M4 20L9 15M20 20L15 15M20 20V16M20 20H16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/**
 * @description: arrows-expand 全屏 展开
 */
export const ArrowsExpandIcon = (props: Partial<IconProps>) => {
  return <Icon component={ArrowsExpand} {...props} />
}

const ArrowsRetract = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M15 5V9M15 9H19M15 9L20 4M9 5V9M9 9H5M9 9L4 4M15 19V15M15 15H19M15 15L20 20M9 19V15M9 15H5M9 15L4 20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/**
 * @description: arrows-expand 全屏 收起
 */
export const ArrowsRetractIcon = (props: Partial<IconProps>) => {
  return <Icon component={ArrowsRetract} {...props} />
}

const PaperAirplane = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_8972_1175)">
      <path
        d="M15.1188 1.89317C15.2146 1.6057 15.1398 1.28877 14.9255 1.0745C14.7112 0.860234 14.3943 0.785417 14.1068 0.881239L2.22745 4.84104C1.92648 4.94136 1.71323 5.21006 1.68387 5.52595C1.65451 5.84184 1.81459 6.14524 2.09192 6.29931L5.72846 8.31961C6.0407 8.49307 6.43009 8.43854 6.68266 8.18597L9.26865 5.59998C9.58107 5.28756 10.0876 5.28756 10.4 5.59998C10.7124 5.9124 10.7124 6.41893 10.4 6.73135L7.81403 9.31734C7.56147 9.56991 7.50693 9.9593 7.68039 10.2715L9.7007 13.9081C9.85478 14.1854 10.1582 14.3455 10.4741 14.3161C10.79 14.2868 11.0587 14.0735 11.159 13.7726L15.1188 1.89317Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="clip0_8972_1175">
        <rect width="16" height="16" fill="currentColor" />
      </clipPath>
    </defs>
  </svg>
)
/**
 * @description:  历史 paper-airplane
 */
export const PaperAirplaneIcon = (props: Partial<IconProps>) => {
  return <Icon component={PaperAirplane} {...props} />
}

const PlusSm = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 6V12M12 12V18M12 12H18M12 12L6 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/**
 * @description:  plus sm
 */
export const PlusSmIcon = (props: Partial<IconProps>) => {
  return <Icon component={PlusSm} {...props} />
}

const Exclamation = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10.0003 7.5V9.16667M10.0003 12.5H10.0086M4.22677 15.8333H15.7738C17.0568 15.8333 17.8587 14.4444 17.2172 13.3333L11.4436 3.33333C10.8021 2.22222 9.1984 2.22222 8.5569 3.33333L2.78339 13.3333C2.14189 14.4444 2.94377 15.8333 4.22677 15.8333Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/**
 * @description:  三角形边框-感叹号
 */
export const ExclamationIcon = (props: Partial<IconProps>) => {
  return <Icon component={Exclamation} {...props} />
}

const ShieldCheck = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M7.5 10L9.16667 11.6667L12.5 8.33334M17.1816 4.98695C17.011 4.9956 16.8394 4.99998 16.6667 4.99998C14.1055 4.99998 11.7691 4.03711 9.99994 2.45361C8.23076 4.03705 5.89449 4.99987 3.33333 4.99987C3.16065 4.99987 2.98898 4.9955 2.81844 4.98685C2.61059 5.78986 2.5 6.63202 2.5 7.50001C2.5 12.1596 5.68693 16.0749 10 17.185C14.3131 16.0749 17.5 12.1596 17.5 7.50001C17.5 6.63206 17.3894 5.78993 17.1816 4.98695Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/**
 * @description:  盾牌-勾
 */
export const ShieldCheckIcon = (props: Partial<IconProps>) => {
  return <Icon component={ShieldCheck} {...props} />
}

const CheckCircleOutline = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/**
 * @description:  CheckCircle x 圈 边框
 */
export const CheckCircleOutlineIcon = (props: Partial<IconProps>) => {
  return <Icon component={CheckCircleOutline} {...props} />
}

const ExclamationOutline = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/**
 * @description:  CheckCircle 警告 三角
 */
export const ExclamationOutlineIcon = (props: Partial<IconProps>) => {
  return <Icon component={ExclamationOutline} {...props} />
}

const Resizer = () => (
  <svg width="9" height="10" viewBox="0 0 9 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0.646484 8.64941L1.00004 9.00297L9.00004 1.00297L8.64648 0.649414L0.646484 8.64941ZM5.00004 9.00297L9.00004 5.00297L8.64648 4.64941L4.64648 8.64941L5.00004 9.00297Z"
      fill="currentColor"
    />
  </svg>
)
/**
 * @description: Resizer 拖拽
 */
export const ResizerIcon = (props: Partial<IconProps>) => {
  return <Icon component={Resizer} {...props} />
}

const HollowLightningBolt = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M7 5.00293V1.50293L2.5 7.00293H6L6 10.5029L10.5 5.00293L7 5.00293Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/**
 * @description:lightning-bolt 闪电 空心
 */
export const HollowLightningBoltIcon = (props: Partial<IconProps>) => {
  return <Icon component={HollowLightningBolt} {...props} />
}

const Eye = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 6.00293C8 6.83136 7.32843 7.50293 6.5 7.50293C5.67157 7.50293 5 6.83136 5 6.00293C5 5.1745 5.67157 4.50293 6.5 4.50293C7.32843 4.50293 8 5.1745 8 6.00293Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1.72913 6.00291C2.36626 3.97437 4.2614 2.50293 6.50022 2.50293C8.73905 2.50293 10.6342 3.97439 11.2713 6.00295C10.6342 8.03149 8.73904 9.50293 6.50023 9.50293C4.2614 9.50293 2.36625 8.03148 1.72913 6.00291Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/**
 * @description:eye 眼睛
 */
export const EyeIcon = (props: Partial<IconProps>) => {
  return <Icon component={Eye} {...props} />
}

const SMViewGridAdd = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14.1666 11.6668V16.6668M11.6666 14.1668H16.6666M4.99992 8.3335H6.66659C7.58706 8.3335 8.33325 7.5873 8.33325 6.66683V5.00016C8.33325 4.07969 7.58706 3.3335 6.66659 3.3335H4.99992C4.07944 3.3335 3.33325 4.07969 3.33325 5.00016V6.66683C3.33325 7.5873 4.07944 8.3335 4.99992 8.3335ZM13.3333 8.3335H14.9999C15.9204 8.3335 16.6666 7.5873 16.6666 6.66683V5.00016C16.6666 4.07969 15.9204 3.3335 14.9999 3.3335H13.3333C12.4128 3.3335 11.6666 4.07969 11.6666 5.00016V6.66683C11.6666 7.5873 12.4128 8.3335 13.3333 8.3335ZM4.99992 16.6668H6.66659C7.58706 16.6668 8.33325 15.9206 8.33325 15.0002V13.3335C8.33325 12.413 7.58706 11.6668 6.66659 11.6668H4.99992C4.07944 11.6668 3.33325 12.413 3.33325 13.3335V15.0002C3.33325 15.9206 4.07944 16.6668 4.99992 16.6668Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/**
 * @description  sm-view-grid-add
 */
export const SMViewGridAddIcon = (props: Partial<IconProps>) => {
  return <Icon component={SMViewGridAdd} {...props} />
}

const IconSolidTag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.1657 7.43441C14.4781 7.74683 14.4781 8.25336 14.1657 8.56578L8.56566 14.1658C8.25324 14.4782 7.74671 14.4782 7.43429 14.1658L1.83429 8.56578C1.67806 8.40955 1.59995 8.20477 1.59998 8V4.0001C1.59998 2.67461 2.67449 1.6001 3.99998 1.6001H8.00019C8.20486 1.60015 8.40951 1.67826 8.56566 1.83441L14.1657 7.43441ZM3.99998 4.8001C4.4418 4.8001 4.79998 4.44193 4.79998 4.0001C4.79998 3.55827 4.4418 3.2001 3.99998 3.2001C3.55815 3.2001 3.19998 3.55827 3.19998 4.0001C3.19998 4.44193 3.55815 4.8001 3.99998 4.8001Z"
      fill="url(#paint0_linear_15674_1492)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_15674_1492"
        x1="4.79997"
        y1="1.6001"
        x2="11.0736"
        y2="15.0963"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#63DDA1" />
        <stop offset="1" stopColor="#35BC7A" />
      </linearGradient>
    </defs>
  </svg>
)
/**
 * @description  Icon/Solid/tag
 */
export const IconSolidTagIcon = (props: Partial<IconProps>) => {
  return <Icon component={IconSolidTag} {...props} />
}

const IconSolidCode = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.85303 2.44117C10.2722 2.58089 10.4987 3.03395 10.359 3.4531L7.159 13.0531C7.01928 13.4723 6.56622 13.6988 6.14707 13.5591C5.72791 13.4193 5.50138 12.9663 5.6411 12.5471L8.8411 2.94714C8.98082 2.52798 9.43388 2.30145 9.85303 2.44117ZM4.56573 5.03443C4.87815 5.34685 4.87815 5.85338 4.56573 6.1658L2.73142 8.00012L4.56573 9.83443C4.87815 10.1469 4.87815 10.6534 4.56573 10.9658C4.25331 11.2782 3.74678 11.2782 3.43436 10.9658L1.03436 8.5658C0.721944 8.25339 0.721944 7.74685 1.03436 7.43443L3.43436 5.03443C3.74678 4.72201 4.25331 4.72201 4.56573 5.03443ZM11.4344 5.03443C11.7468 4.72201 12.2533 4.72201 12.5657 5.03443L14.9657 7.43443C15.2782 7.74685 15.2782 8.25339 14.9657 8.5658L12.5657 10.9658C12.2533 11.2782 11.7468 11.2782 11.4344 10.9658C11.1219 10.6534 11.1219 10.1469 11.4344 9.83443L13.2687 8.00012L11.4344 6.1658C11.1219 5.85338 11.1219 5.34685 11.4344 5.03443Z"
      fill="url(#paint0_linear_15685_3932)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_15685_3932"
        x1="0.687576"
        y1="2.15371"
        x2="16.1287"
        y2="11.933"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#DA5FDD" />
        <stop offset="1" stopColor="#8863F7" />
      </linearGradient>
    </defs>
  </svg>
)
/**
 * @description  Icon/Solid/code
 */
export const IconSolidCodeIcon = (props: Partial<IconProps>) => {
  return <Icon component={IconSolidCode} {...props} />
}

const IconSolidSparkles = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.0001 1.6001C4.44193 1.6001 4.8001 1.95827 4.8001 2.4001V3.2001H5.6001C6.04192 3.2001 6.4001 3.55827 6.4001 4.0001C6.4001 4.44193 6.04192 4.8001 5.6001 4.8001H4.8001V5.6001C4.8001 6.04192 4.44193 6.4001 4.0001 6.4001C3.55827 6.4001 3.2001 6.04192 3.2001 5.6001V4.8001H2.4001C1.95827 4.8001 1.6001 4.44193 1.6001 4.0001C1.6001 3.55827 1.95827 3.2001 2.4001 3.2001H3.2001V2.4001C3.2001 1.95827 3.55827 1.6001 4.0001 1.6001ZM4.0001 9.6001C4.44193 9.6001 4.8001 9.95827 4.8001 10.4001V11.2001H5.6001C6.04192 11.2001 6.4001 11.5583 6.4001 12.0001C6.4001 12.4419 6.04192 12.8001 5.6001 12.8001H4.8001V13.6001C4.8001 14.0419 4.44193 14.4001 4.0001 14.4001C3.55827 14.4001 3.2001 14.0419 3.2001 13.6001V12.8001H2.4001C1.95827 12.8001 1.6001 12.4419 1.6001 12.0001C1.6001 11.5583 1.95827 11.2001 2.4001 11.2001H3.2001V10.4001C3.2001 9.95827 3.55827 9.6001 4.0001 9.6001Z"
      fill="url(#paint0_linear_15685_3942)"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.60006 1.6001C9.96304 1.6001 10.2805 1.84448 10.3734 2.19538L11.3168 5.75924L13.9998 7.30715C14.2475 7.45002 14.4001 7.71419 14.4001 8.0001C14.4001 8.286 14.2475 8.55017 13.9998 8.69305L11.3168 10.241L10.3734 13.8048C10.2805 14.1557 9.96304 14.4001 9.60006 14.4001C9.23707 14.4001 8.91958 14.1557 8.82669 13.8048L7.88332 10.241L5.20032 8.69304C4.95267 8.55017 4.8001 8.286 4.8001 8.0001C4.8001 7.71419 4.95267 7.45002 5.20032 7.30715L7.88332 5.75924L8.82669 2.19538C8.91958 1.84448 9.23707 1.6001 9.60006 1.6001Z"
      fill="url(#paint1_linear_15685_3942)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_15685_3942"
        x1="10.8445"
        y1="14.8572"
        x2="3.04667"
        y2="2.7273"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#2A82F8" />
        <stop offset="1" stopColor="#8FBFFF" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_15685_3942"
        x1="10.8445"
        y1="14.8572"
        x2="3.04667"
        y2="2.7273"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#2A82F8" />
        <stop offset="1" stopColor="#8FBFFF" />
      </linearGradient>
    </defs>
  </svg>
)

/**
 * @description  Icon/Solid/sparkles
 */
export const IconSolidSparklesIcon = (props: Partial<IconProps>) => {
  return <Icon component={IconSolidSparkles} {...props} />
}

const PaperPlaneRight = () => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18.013 9.40626L4.84898 2.03907C4.62964 1.91116 4.37707 1.85175 4.12371 1.86845C3.87034 1.88516 3.62776 1.97722 3.42711 2.13282C3.22219 2.2945 3.07341 2.51662 3.00189 2.76765C2.93037 3.01868 2.93974 3.28586 3.02867 3.53126L5.22398 9.66407C5.24619 9.72522 5.28649 9.77816 5.33953 9.81584C5.39256 9.85352 5.45581 9.87416 5.52086 9.87501H11.1615C11.3237 9.87244 11.4808 9.93149 11.6011 10.0402C11.7215 10.149 11.7961 10.2993 11.8099 10.4609C11.8153 10.5463 11.8031 10.6317 11.774 10.7121C11.745 10.7925 11.6998 10.8661 11.6413 10.9284C11.5827 10.9906 11.512 11.0402 11.4335 11.074C11.355 11.1078 11.2704 11.1252 11.1849 11.125H5.52086C5.45581 11.1259 5.39256 11.1465 5.33953 11.1842C5.28649 11.2219 5.24619 11.2748 5.22398 11.3359L3.02867 17.4688C2.9628 17.6577 2.94295 17.8596 2.97078 18.0578C2.9986 18.2559 3.07329 18.4445 3.18864 18.608C3.304 18.7715 3.45669 18.9051 3.63404 18.9977C3.81139 19.0904 4.00828 19.1394 4.20836 19.1406C4.42127 19.1397 4.63063 19.086 4.81773 18.9844L18.013 11.5938C18.2064 11.484 18.3671 11.3249 18.479 11.1328C18.5908 10.9407 18.6497 10.7223 18.6497 10.5C18.6497 10.2777 18.5908 10.0594 18.479 9.86723C18.3671 9.6751 18.2064 9.51604 18.013 9.40626Z"
      fill="currentColor"
    />
  </svg>
)
/**
 * @description  paper-plane-right
 */
export const PaperPlaneRightIcon = (props: Partial<IconProps>) => {
  return <Icon component={PaperPlaneRight} {...props} />
}

const ArrowDown = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M15.8333 11.6667L9.99996 17.5M9.99996 17.5L4.16663 11.6667M9.99996 17.5L9.99996 2.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/**
 * @description  arrow-down
 */
export const ArrowDownIcon = (props: Partial<IconProps>) => {
  return <Icon component={ArrowDown} {...props} />
}

const SolidDocumentText = () => (
  <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.43066 3.2001C3.43066 2.31644 4.14701 1.6001 5.03066 1.6001H8.69929C9.12364 1.6001 9.53061 1.76867 9.83066 2.06873L12.562 4.8001C12.8621 5.10016 13.0307 5.50712 13.0307 5.93147V12.8001C13.0307 13.6838 12.3143 14.4001 11.4307 14.4001H5.03066C4.14701 14.4001 3.43066 13.6838 3.43066 12.8001V3.2001ZM5.03066 8.0001C5.03066 7.55827 5.38884 7.2001 5.83066 7.2001H10.6307C11.0725 7.2001 11.4307 7.55827 11.4307 8.0001C11.4307 8.44193 11.0725 8.8001 10.6307 8.8001H5.83066C5.38884 8.8001 5.03066 8.44193 5.03066 8.0001ZM5.83066 10.4001C5.38884 10.4001 5.03066 10.7583 5.03066 11.2001C5.03066 11.6419 5.38884 12.0001 5.83066 12.0001H10.6307C11.0725 12.0001 11.4307 11.6419 11.4307 11.2001C11.4307 10.7583 11.0725 10.4001 10.6307 10.4001H5.83066Z"
      fill="currentColor"
    />
  </svg>
)
/**
 * @description  Solid/document-text
 */
export const SolidDocumentTextIcon = (props: Partial<IconProps>) => {
  return <Icon component={SolidDocumentText} {...props} />
}
