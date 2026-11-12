import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import { useId } from 'react'
import type { MouseEvent } from 'react'

interface IconProps extends CustomIconComponentProps {
  onClick: (event: MouseEvent) => void
}

const ColorsRisk = () => {
  const id = useId()

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
      <g>
        <path
          d="M0 20C0 8.95431 8.95431 0 20 0V0C31.0457 0 40 8.95431 40 20V20C40 31.0457 31.0457 40 20 40V40C8.95431 40 0 31.0457 0 20V20Z"
          fill={`url(#${id}-paint0_linear_0_4)`}
        />
        <g filter={`url(#${id}-filter0_d_0_4)`}>
          <path
            d="M14 20C14 16.6863 16.6863 14 20 14V14C23.3137 14 26 16.6863 26 20V26H14V20Z"
            fill={`url(#${id}-paint1_linear_0_4)`}
          />
          <mask id={`${id}-stroke0_0_4`} fill="white">
            <path d="M14 20C14 16.6863 16.6863 14 20 14V14C23.3137 14 26 16.6863 26 20V26H14V20Z" />
          </mask>
          <path
            d="M26 26V20C26 16.6863 23.3137 14 20 14V14C16.6863 14 14 16.6863 14 20V26H26Z"
            stroke="#FAEBED"
            mask={`url(#${id}-stroke0_0_4)`}
          />
        </g>
        <g>
          <path d="M13 28C13 27.4477 13.4477 27 14 27H26C26.5523 27 27 27.4477 27 28V29H13V28Z" fill="#FCDADA" />
          <path d="M12 31C12 30.4477 12.4477 30 13 30H27C27.5523 30 28 30.4477 28 31V32H12V31Z" fill="#F8ABAB" />
        </g>
        <g>
          <path
            d="M29.8923 13.1341C30.3706 12.858 30.9822 13.0219 31.2583 13.5002C31.5345 13.9785 31.3706 14.5901 30.8923 14.8662L28.2942 16.3662C27.816 16.6423 27.2044 16.4785 26.9282 16.0002C26.6521 15.5219 26.816 14.9103 27.2942 14.6341L29.8923 13.1341Z"
            fill="#F8ABAB"
          />
          <path
            d="M9.10771 14.8662C8.62942 14.5901 8.46554 13.9785 8.74169 13.5002C9.01783 13.0219 9.62942 12.858 10.1077 13.1341L12.7058 14.6341C13.1841 14.9103 13.348 15.5219 13.0718 16.0002C12.7957 16.4785 12.1841 16.6423 11.7058 16.3662L9.10771 14.8662Z"
            fill="#F8ABAB"
          />
        </g>
        <g>
          <path
            d="M19 8C19 7.44772 19.4478 7 20 7C20.5523 7 21 7.44772 21 8V11C21 11.5523 20.5523 12 20 12C19.4478 12 19 11.5523 19 11V8Z"
            fill="#FCDADA"
          />
          <path
            d="M25.134 9.1077C25.4102 8.6294 26.0218 8.46553 26.5 8.74167C26.9783 9.01781 27.1422 9.6294 26.8661 10.1077L25.3661 12.7058C25.0899 13.1841 24.4783 13.3479 24 13.0718C23.5217 12.7957 23.3579 12.1841 23.634 11.7058L25.134 9.1077Z"
            fill="#FCDADA"
          />
          <path
            d="M13.134 10.1077C12.8579 9.6294 13.0218 9.01781 13.5 8.74167C13.9783 8.46553 14.5899 8.6294 14.8661 9.10769L16.3661 11.7058C16.6422 12.1841 16.4783 12.7957 16 13.0718C15.5218 13.3479 14.9102 13.1841 14.634 12.7058L13.134 10.1077Z"
            fill="#FCDADA"
          />
        </g>
        <path
          d="M19 8C19 7.44772 19.4477 7 20 7C20.5523 7 21 7.44772 21 8V11C21 11.5523 20.5523 12 20 12C19.4477 12 19 11.5523 19 11V8Z"
          fill="#FEF0F0"
        />
      </g>
      <defs>
        <filter
          id={`${id}-filter0_d_0_4`}
          x="10"
          y="12"
          width="20"
          height="20"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="2" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.0901961 0 0 0 0 0.0901961 0 0 0 0 0.0901961 0 0 0 0.08 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_4" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_4" result="shape" />
        </filter>
        <linearGradient id={`${id}-paint0_linear_0_4`} x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F37373" />
          <stop offset="1" stopColor="#D93F3F" />
        </linearGradient>
        <linearGradient id={`${id}-paint1_linear_0_4`} x1="20" y1="14" x2="20" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="#FCDADA" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** @description 漏洞与风险（Figma 2417:97900） */
export const ColorsRiskIcon = (props: Partial<IconProps>) => {
  return <Icon component={ColorsRisk} {...props} />
}

const ColorsFlow = () => {
  const id = useId()

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
      <g>
        <path
          d="M0 20C0 8.95431 8.95431 0 20 0V0C31.0457 0 40 8.95431 40 20V20C40 31.0457 31.0457 40 20 40V40C8.95431 40 0 31.0457 0 20V20Z"
          fill={`url(#${id}-paint0_linear_0_4)`}
        />
        <g>
          <use href={`#${id}-stroke0_0_4`} fill={`url(#${id}-paint1_linear_0_4)`} />
          <mask id={`${id}-stroke1_0_4`} fill="white">
            <use href={`#${id}-stroke0_0_4`} />
          </mask>
          <path
            d="M10.7244 25.0801C10.7001 23.9766 10.7723 22.9106 11 22C12 18 18.4999 7 20 7C21.5 7 27.9282 18 29 22C29.2502 22.934 29.3291 24.0316 29.303 25.1654C29.1942 29.8854 24.7606 33 20.0394 33C15.2807 33 10.8292 29.8376 10.7244 25.0801Z"
            stroke="#97DEE8"
            mask={`url(#${id}-stroke1_0_4)`}
          />
        </g>
        <path
          d="M24.0003 20C26.5723 20.0001 28.4079 21.8387 29.1946 22.9932C29.2892 23.6764 29.3204 24.4126 29.303 25.165C29.1942 29.8851 24.7606 33 20.0394 33C15.2807 33 10.8297 29.8375 10.7249 25.0801C10.7034 24.1043 10.7569 23.1578 10.9271 22.3223C11.9177 23.3161 13.4938 24.2785 16.0003 24C18.9817 23.6685 20.0004 20 24.0003 20Z"
          fill="#EEFCFD"
        />
      </g>
      <defs>
        <linearGradient id={`${id}-paint0_linear_0_4`} x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2FBCD0" />
          <stop offset="1" stopColor="#1B8E9D" />
        </linearGradient>
        <linearGradient
          id={`${id}-paint1_linear_0_4`}
          x1="20.0138"
          y1="7"
          x2="20.0138"
          y2="33"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#52C7D8" />
          <stop offset="1" stopColor="#D1F0F5" />
        </linearGradient>
        <path
          id={`${id}-stroke0_0_4`}
          d="M11 22C10.7723 22.9106 10.7001 23.9766 10.7244 25.0801C10.8292 29.8376 15.2807 33 20.0394 33C24.7606 33 29.1942 29.8854 29.303 25.1654C29.3291 24.0316 29.2502 22.934 29 22C27.9282 18 21.5 7 20 7C18.4999 7 12 18 11 22Z"
        />
      </defs>
    </svg>
  )
}

/** @description 流量（Figma 2417:97911） */
export const ColorsFlowIcon = (props: Partial<IconProps>) => {
  return <Icon component={ColorsFlow} {...props} />
}

const ColorsFileSystem = () => {
  const id = useId()

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
      <g>
        <path
          d="M0 20C0 8.95431 8.95431 0 20 0V0C31.0457 0 40 8.95431 40 20V20C40 31.0457 31.0457 40 20 40V40C8.95431 40 0 31.0457 0 20V20Z"
          fill={`url(#${id}-paint0_linear_0_4)`}
        />
        <g>
          <path
            d="M9 16H31V28C31 29.1046 30.1046 30 29 30H11C9.89543 30 9 29.1046 9 28V16Z"
            fill={`url(#${id}-paint1_linear_0_4)`}
          />
          <mask id={`${id}-stroke0_0_4`} fill="white">
            <path d="M9 16H31V28C31 29.1046 30.1046 30 29 30H11C9.89543 30 9 29.1046 9 28V16Z" />
          </mask>
          <path
            d="M9 16H31V28C31 29.1046 30.1046 30 29 30H11C9.89543 30 9 29.1046 9 28V16Z"
            stroke="#FEF7EB"
            mask={`url(#${id}-stroke0_0_4)`}
          />
        </g>
        <path
          d="M10 15H30V14C30 12.8954 29.1046 12 28 12H22.118C21.4328 12 20.8064 11.6129 20.5 11C20.1936 10.3871 19.5672 10 18.882 10H12C10.8954 10 10 10.8954 10 12V15Z"
          fill="#FBD391"
        />
      </g>
      <defs>
        <linearGradient id={`${id}-paint0_linear_0_4`} x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF9400" />
          <stop offset="1" stopColor="#FF6402" />
        </linearGradient>
        <linearGradient id={`${id}-paint1_linear_0_4`} x1="20" y1="16" x2="20" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="#FDECCE" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** @description 文件系统（Figma 2417:97913） */
export const ColorsFileSystemIcon = (props: Partial<IconProps>) => {
  return <Icon component={ColorsFileSystem} {...props} />
}

const ColorsKnowledgeBase = () => {
  const id = useId()

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
      <g>
        <path
          d="M0 20C0 8.95431 8.95431 0 20 0V0C31.0457 0 40 8.95431 40 20V20C40 31.0457 31.0457 40 20 40V40C8.95431 40 0 31.0457 0 20V20Z"
          fill={`url(#${id}-paint0_linear_0_4)`}
        />
        <g>
          <use href={`#${id}-stroke0_0_4`} fill="#98CAFF" />
          <mask id={`${id}-stroke1_0_4`} fill="white">
            <use href={`#${id}-stroke0_0_4`} />
          </mask>
          <path
            d="M20 16H19.75V31H20H20.25V16H20ZM20 16L19.8419 16.4743L20 16.527L20.1581 16.4743L20 16ZM20 31L19.8077 31.4615L20 31.5417L20.1923 31.4615L20 31ZM9.23077 26.5128L9.03846 26.9744V26.9744L9.23077 26.5128ZM30.7692 26.5128L30.9615 26.9744L30.7692 26.5128ZM30.6838 12.4387L30.5257 11.9644L30.6838 12.4387ZM9.31623 12.4387L9.47434 11.9644L9.31623 12.4387ZM32 13.3874H31.5V24.6667H32H32.5V13.3874H32ZM8 24.6667H8.5V13.3874H8H7.5V24.6667H8ZM9.31623 12.4387L9.15811 12.9131L19.8419 16.4743L20 16L20.1581 15.5257L9.47434 11.9644L9.31623 12.4387ZM20 16L20.1581 16.4743L30.8419 12.9131L30.6838 12.4387L30.5257 11.9644L19.8419 15.5257L20 16ZM30.7692 26.5128L30.5769 26.0513L19.8077 30.5385L20 31L20.1923 31.4615L30.9615 26.9744L30.7692 26.5128ZM20 31L20.1923 30.5385L9.42308 26.0513L9.23077 26.5128L9.03846 26.9744L19.8077 31.4615L20 31ZM8 24.6667H7.5C7.5 25.6759 8.10684 26.5862 9.03846 26.9744L9.23077 26.5128L9.42308 26.0513C8.86411 25.8184 8.5 25.2722 8.5 24.6667H8ZM32 24.6667H31.5C31.5 25.2722 31.1359 25.8184 30.5769 26.0513L30.7692 26.5128L30.9615 26.9744C31.8932 26.5862 32.5 25.6759 32.5 24.6667H32ZM32 13.3874H32.5C32.5 12.3636 31.497 11.6406 30.5257 11.9644L30.6838 12.4387L30.8419 12.9131C31.1657 12.8052 31.5 13.0461 31.5 13.3874H32ZM8 13.3874H8.5C8.5 13.0461 8.83435 12.8052 9.15811 12.9131L9.31623 12.4387L9.47434 11.9644C8.50304 11.6406 7.5 12.3636 7.5 13.3874H8Z"
            fill="#B4D8FF"
            mask={`url(#${id}-stroke1_0_4)`}
          />
        </g>
        <path
          d="M12 11.2038C12 10.3446 13.0119 9.88543 13.6585 10.4512L20 16L26.3415 10.4512C26.9881 9.88543 28 10.3446 28 11.2038V22.5858C28 22.851 27.8946 23.1054 27.7071 23.2929L20 31L12.2929 23.2929C12.1054 23.1054 12 22.851 12 22.5858V11.2038Z"
          fill="#FEFEFF"
        />
        <path
          d="M12 11.2038V22.5858C12 22.851 12.1054 23.1054 12.2929 23.2929L20 31V16L13.6585 10.4512C13.0119 9.88543 12 10.3446 12 11.2038Z"
          fill={`url(#${id}-paint1_linear_0_4)`}
        />
      </g>
      <defs>
        <linearGradient id={`${id}-paint0_linear_0_4`} x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#289FF7" />
          <stop offset="1" stopColor="#2076EF" />
        </linearGradient>
        <linearGradient
          id={`${id}-paint1_linear_0_4`}
          x1="20"
          y1="19.9997"
          x2="12"
          y2="19.9997"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E5F1FE" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
        <path
          id={`${id}-stroke0_0_4`}
          d="M8 13.3874C8 12.7049 8.6687 12.2229 9.31623 12.4387L20 16L30.6838 12.4387C31.3313 12.2229 32 12.7049 32 13.3874V24.6667C32 25.4741 31.5145 26.2023 30.7692 26.5128L20 31L9.23077 26.5128C8.48548 26.2023 8 25.4741 8 24.6667V13.3874Z"
        />
      </defs>
    </svg>
  )
}

/** @description 知识库（Figma 2419:98470） */
export const ColorsKnowledgeBaseIcon = (props: Partial<IconProps>) => {
  return <Icon component={ColorsKnowledgeBase} {...props} />
}

const ColorsSkill = () => {
  const id = useId()

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
      <g>
        <path
          d="M0 20C0 8.95431 8.95431 0 20 0V0C31.0457 0 40 8.95431 40 20V20C40 31.0457 31.0457 40 20 40V40C8.95431 40 0 31.0457 0 20V20Z"
          fill={`url(#${id}-paint0_linear_0_4)`}
        />
        <path
          d="M28.6094 18C27.3966 18.5663 26.5557 19.7959 26.5557 21.2227C26.5559 23.1861 28.1478 24.7773 30.1113 24.7773C30.6021 24.7773 31 25.1752 31 25.666V29C30.9999 30.1045 30.1045 30.9999 29 31H25.666C25.1752 31 24.7773 30.6021 24.7773 30.1113C24.7773 28.1477 23.1853 26.5557 21.2217 26.5557C19.2583 26.556 17.6671 28.1479 17.667 30.1113C17.667 30.6021 17.2691 31 16.7783 31H13.4443C12.3399 30.9999 11.4444 30.1045 11.4443 29V25.666C11.4443 25.1752 11.0465 24.7773 10.5557 24.7773C8.59213 24.7773 7.00023 23.1861 7 21.2227C7 19.7959 7.84089 18.5662 9.05371 18H28.6094Z"
          fill="white"
        />
        <path
          d="M21.2227 7C23.1861 7.00023 24.7773 8.59213 24.7773 10.5557C24.7773 11.0465 25.1752 11.4443 25.666 11.4443H29C30.1045 11.4444 30.9999 12.3399 31 13.4443V16H11.4443V13.4443C11.4444 12.3399 12.3399 11.4444 13.4443 11.4443H16.7783C17.2691 11.4443 17.667 11.0465 17.667 10.5557C17.667 8.59198 19.259 7 21.2227 7Z"
          fill="#FDE499"
        />
      </g>
      <defs>
        <linearGradient id={`${id}-paint0_linear_0_4`} x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F9C901" />
          <stop offset="1" stopColor="#FFA200" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** @description 技能（Figma 2419:98632） */
export const ColorsSkillIcon = (props: Partial<IconProps>) => {
  return <Icon component={ColorsSkill} {...props} />
}

const ColorsCapability = () => {
  const id = useId()
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path
        d="M0 20C0 8.95431 8.95431 0 20 0V0C31.0457 0 40 8.95431 40 20V20C40 31.0457 31.0457 40 20 40V40C8.95431 40 0 31.0457 0 20V20Z"
        fill={`url(#${id}-gradient)`}
      />
      <use href={`#${id}-shield`} fill="#8FD9D1" />
      <path
        d="M19.3166 8.24854L10.3165 11.5213C9.52616 11.8087 9.00003 12.5584 9.00002 13.3994C9.00001 14.9372 8.99999 17.5082 9 19.905C9.00001 21.9497 9.31542 24.0541 10.6561 25.5978C13.2289 28.5604 17.4807 30.7997 19.2209 31.6391C19.7167 31.8782 20.2834 31.8782 20.7792 31.6391C22.5194 30.7997 26.771 28.5604 29.3439 25.598C30.6846 24.0542 31 21.949 31 19.9042C31 17.239 31 14.8378 31 13.3993C31 12.5583 30.4739 11.8087 29.6835 11.5213L20.6835 8.24854C20.242 8.08799 19.7581 8.08799 19.3166 8.24854Z"
        stroke="#BBF0EB"
        mask={`url(#${id}-shield-mask)`}
      />
      <path
        d="M20 31.8184C19.7344 31.8184 19.4686 31.7582 19.2207 31.6387C17.4803 30.7992 13.2289 28.56 10.6563 25.5977C9.31566 24.054 9.00004 21.9498 9.00001 19.9053C9 17.5085 9 14.9372 9.00001 13.3994C9.00002 12.5585 9.52615 11.8089 10.3164 11.5215L19.3164 8.24902C19.5372 8.16875 19.7687 8.12793 20 8.12793V31.8184Z"
        fill="white"
      />
      <path
        d="M15.4518 20.1175L20.5245 13.0157C20.7507 12.699 21.25 12.8591 21.25 13.2482V17.85C21.25 18.0709 21.4291 18.25 21.65 18.25H24.2227C24.5481 18.25 24.7373 18.6177 24.5482 18.8825L19.4755 25.9843C19.2493 26.301 18.75 26.1409 18.75 25.7518V21.15C18.75 20.9291 18.5709 20.75 18.35 20.75H15.7773C15.4519 20.75 15.2627 20.3823 15.4518 20.1175Z"
        fill="#19AD9B"
      />
      <defs>
        <linearGradient id={`${id}-gradient`} x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2FBCD0" />
          <stop offset="1" stopColor="#11A976" />
        </linearGradient>
        <path
          id={`${id}-shield`}
          d="M9.00002 13.3994C9.00003 12.5584 9.52616 11.8087 10.3165 11.5213L19.3166 8.24854C19.7581 8.08799 20.242 8.08799 20.6835 8.24854L29.6835 11.5213C30.4739 11.8087 31 12.5583 31 13.3993C31 14.8378 31 17.239 31 19.9042C31 21.949 30.6846 24.0542 29.3439 25.598C26.771 28.5604 22.5194 30.7997 20.7792 31.6391C20.2834 31.8782 19.7167 31.8782 19.2209 31.6391C17.4807 30.7997 13.2289 28.5604 10.6561 25.5978C9.31542 24.0541 9.00001 21.9497 9 19.905C8.99999 17.5082 9.00001 14.9372 9.00002 13.3994Z"
        />
        <mask id={`${id}-shield-mask`} fill="white">
          <use href={`#${id}-shield`} />
        </mask>
      </defs>
    </svg>
  )
}

/** @description 能力（Figma 2858:143284） */
export const ColorsCapabilityIcon = (props: Partial<IconProps>) => {
  return <Icon component={ColorsCapability} {...props} />
}

const ColorsTool = () => {
  const id = useId()

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
      <g clipPath={`url(#${id}-clip0_2326_53658)`}>
        <g>
          <path
            d="M0 20C0 8.95431 8.95431 0 20 0C31.0457 0 40 8.95431 40 20C40 31.0457 31.0457 40 20 40C8.95431 40 0 31.0457 0 20Z"
            fill={`url(#${id}-paint0_linear_2326_53658)`}
          />
          <path
            d="M16.317 17.8174L21.9739 23.4742L17.0241 28.424C15.462 29.9861 12.9294 29.9861 11.3673 28.424C9.80517 26.8619 9.80517 24.3292 11.3673 22.7671L16.317 17.8174Z"
            fill={`url(#${id}-paint1_linear_2326_53658)`}
          />
          <path
            d="M29.7049 14.3293C30.2064 13.8278 31.0515 13.9993 31.2026 14.6923C31.7638 17.2648 31.0451 20.0601 29.0449 22.0603C25.9207 25.1845 20.8554 25.1845 17.7312 22.0603C14.607 18.9361 14.607 13.8708 17.7312 10.7466C19.7314 8.74642 22.5267 8.02769 25.0992 8.58885C25.7922 8.74001 25.9637 9.58512 25.4622 10.0866L21.9739 13.575L22.681 17.1105L26.2165 17.8176L29.7049 14.3293Z"
            fill="white"
          />
        </g>
      </g>
      <defs>
        <linearGradient
          id={`${id}-paint0_linear_2326_53658`}
          x1="20"
          y1="0"
          x2="20"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8862F8" />
          <stop offset="1" stopColor="#724BE0" />
        </linearGradient>
        <linearGradient
          id={`${id}-paint1_linear_2326_53658`}
          x1="19.1454"
          y1="20.6458"
          x2="11.3673"
          y2="28.424"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#BEAAF5" />
          <stop offset="1" stopColor="#D7CBF8" />
        </linearGradient>
        <clipPath id={`${id}-clip0_2326_53658`}>
          <rect width="40" height="40" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

/** @description 工具（Figma 2419:98667） */
export const ColorsToolIcon = (props: Partial<IconProps>) => {
  return <Icon component={ColorsTool} {...props} />
}
