import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import type React from 'react'

interface IconProps extends CustomIconComponentProps {
  onClick: (e: React.MouseEvent) => void
}

const Error = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13.5" fill="#FEF1F1" stroke="#F7544A" strokeDasharray="2 2" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.4314 7.78894C13.1195 6.56557 14.8809 6.56557 15.569 7.78894L20.5913 16.7174C21.2662 17.9173 20.3991 19.3999 19.0225 19.3999H8.97791C7.60123 19.3999 6.73414 17.9173 7.40908 16.7174L12.4314 7.78894ZM14.9001 16.7C14.9001 17.1971 14.4972 17.6 14.0001 17.6C13.5031 17.6 13.1001 17.1971 13.1001 16.7C13.1001 16.2029 13.5031 15.8 14.0001 15.8C14.4972 15.8 14.9001 16.2029 14.9001 16.7ZM14.0001 9.5C13.5031 9.5 13.1001 9.90295 13.1001 10.4V13.1C13.1001 13.5971 13.5031 14 14.0001 14C14.4972 14 14.9001 13.5971 14.9001 13.1V10.4C14.9001 9.90295 14.4972 9.5 14.0001 9.5Z"
      fill="#F6544A"
    />
  </svg>
)
export const ErrorIcon = (props: Partial<IconProps>) => {
  return <Icon component={Error} {...props} />
}

const Warning = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13.5" fill="#FFB660" fillOpacity="0.1" stroke="#FFB660" strokeDasharray="2 2" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.4314 7.78893C13.1195 6.56556 14.8809 6.56556 15.569 7.78893L20.5913 16.7174C21.2662 17.9173 20.3991 19.3999 19.0225 19.3999H8.97791C7.60123 19.3999 6.73414 17.9173 7.40908 16.7174L12.4314 7.78893ZM14.9001 16.7C14.9001 17.197 14.4972 17.6 14.0001 17.6C13.5031 17.6 13.1001 17.197 13.1001 16.7C13.1001 16.2029 13.5031 15.8 14.0001 15.8C14.4972 15.8 14.9001 16.2029 14.9001 16.7ZM14.0001 9.49999C13.5031 9.49999 13.1001 9.90293 13.1001 10.4V13.1C13.1001 13.597 13.5031 14 14.0001 14C14.4972 14 14.9001 13.597 14.9001 13.1V10.4C14.9001 9.90293 14.4972 9.49999 14.0001 9.49999Z"
      fill="#FFB660"
    />
  </svg>
)
export const WarningIcon = (props: Partial<IconProps>) => {
  return <Icon component={Warning} {...props} />
}

const Success = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13.5" fill="#56C991" fillOpacity="0.1" stroke="#56C991" strokeDasharray="2 2" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M20.0366 9.7636C20.3881 10.1151 20.3881 10.6849 20.0366 11.0364L12.8366 18.2364C12.4851 18.5879 11.9153 18.5879 11.5638 18.2364L7.9638 14.6364C7.61233 14.2849 7.61233 13.7151 7.9638 13.3636C8.31527 13.0121 8.88512 13.0121 9.23659 13.3636L12.2002 16.3272L18.7638 9.7636C19.1153 9.41213 19.6851 9.41213 20.0366 9.7636Z"
      fill="#56C991"
    />
  </svg>
)
export const SuccessIcon = (props: Partial<IconProps>) => {
  return <Icon component={Success} {...props} />
}

const Help = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13.5" fill="#8863F7" fillOpacity="0.1" stroke="#8863F7" strokeDasharray="2 2" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M21.1998 14C21.1998 17.9764 17.9763 21.2 13.9998 21.2C10.0234 21.2 6.7998 17.9764 6.7998 14C6.7998 10.0235 10.0234 6.79999 13.9998 6.79999C17.9763 6.79999 21.1998 10.0235 21.1998 14ZM13.9998 11.3C13.6678 11.3 13.3766 11.4793 13.2197 11.7506C12.9708 12.1809 12.4202 12.3279 11.99 12.079C11.5597 11.8301 11.4127 11.2796 11.6616 10.8493C12.1271 10.0447 12.9993 9.49999 13.9998 9.49999C15.491 9.49999 16.6998 10.7088 16.6998 12.2C16.6998 13.3756 15.9485 14.3757 14.8998 14.7464V14.9C14.8998 15.397 14.4969 15.8 13.9998 15.8C13.5028 15.8 13.0998 15.397 13.0998 14.9V14C13.0998 13.5029 13.5028 13.1 13.9998 13.1C14.4969 13.1 14.8998 12.697 14.8998 12.2C14.8998 11.7029 14.4969 11.3 13.9998 11.3ZM13.9998 18.5C14.4969 18.5 14.8998 18.097 14.8998 17.6C14.8998 17.1029 14.4969 16.7 13.9998 16.7C13.5027 16.7 13.0998 17.1029 13.0998 17.6C13.0998 18.097 13.5027 18.5 13.9998 18.5Z"
      fill="#8863F7"
    />
  </svg>
)
export const HelpIcon = (props: Partial<IconProps>) => {
  return <Icon component={Help} {...props} />
}

const Rocket = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.25 17.5H8.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M9.60933 1.54688C8.12496 2.73438 3.16402 7.48438 7.49996 15H12.5C16.75 7.48438 11.8593 2.74219 10.3906 1.54688C10.281 1.45535 10.1427 1.40521 9.99996 1.40521C9.85717 1.40521 9.71892 1.45535 9.60933 1.54688Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.77331 8.70312L3.32018 11.6406C3.25838 11.7127 3.21478 11.7986 3.19303 11.891C3.17128 11.9835 3.17202 12.0798 3.19518 12.1719L4.15612 16.5234C4.17931 16.6269 4.22843 16.7227 4.29885 16.8019C4.36927 16.8812 4.45869 16.9412 4.5587 16.9763C4.6587 17.0115 4.766 17.0206 4.87051 17.0029C4.97502 16.9852 5.07331 16.9412 5.15612 16.875L7.49987 15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.1797 8.64062L16.6797 11.6406C16.7415 11.7127 16.7851 11.7986 16.8068 11.891C16.8286 11.9835 16.8279 12.0798 16.8047 12.1719L15.8438 16.5234C15.8206 16.6269 15.7714 16.7227 15.701 16.8019C15.6306 16.8812 15.5412 16.9412 15.4412 16.9763C15.3412 17.0115 15.2339 17.0206 15.1294 17.0029C15.0248 16.9852 14.9266 16.9412 14.8438 16.875L12.5 15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 8.4375C10.5178 8.4375 10.9375 8.01777 10.9375 7.5C10.9375 6.98223 10.5178 6.5625 10 6.5625C9.48223 6.5625 9.0625 6.98223 9.0625 7.5C9.0625 8.01777 9.48223 8.4375 10 8.4375Z"
      fill="currentColor"
    />
  </svg>
)
export const RocketIcon = (props: Partial<IconProps>) => {
  return <Icon component={Rocket} {...props} />
}
