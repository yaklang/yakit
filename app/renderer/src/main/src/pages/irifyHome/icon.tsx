import Icon from '@ant-design/icons'
import { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import React from 'react'
import { v4 as uuidv4 } from 'uuid'

interface IconProps extends CustomIconComponentProps {
  onClick: (e: React.MouseEvent) => void
  ref?: any
}

const IRifyHomeGhost = () => {
  const id1 = uuidv4()
  const id2 = uuidv4()
  const id3 = uuidv4()
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="244" height="145" viewBox="0 0 244 145" fill="none">
      <g opacity="0.1">
        <path
          d="M223.275 124.247H244V20.7531H223.275V0H199.744V20.7531H223.275V124.247H199.654V145H223.275V124.247Z"
          fill={`url(#${id1})`}
        />
        <path
          d="M68.601 20.7531V0H0V20.7531H23.9832V124.247H0V145H68.601V124.247H44.7083V20.7531H68.601Z"
          fill={`url(#${id2})`}
        />
        <path
          d="M127.16 76.7591L165.352 145H184.629C185.082 144.994 185.526 144.871 185.917 144.642C186.309 144.413 186.634 144.086 186.862 143.694C187.09 143.301 187.213 142.856 187.218 142.402C187.223 141.949 187.111 141.5 186.892 141.103L150.147 75.3995C155.977 73.7758 161.347 70.8106 165.828 66.7397C170.31 62.6688 173.78 57.6055 175.96 51.9534C178.141 46.3013 178.972 40.217 178.387 34.1863C177.802 28.1555 175.817 22.3454 172.592 17.219C169.428 12.217 165.116 8.04467 160.015 5.04953C154.914 2.05439 149.173 0.322969 143.269 0H83.8092V145H104.535V76.9405L127.16 76.7591ZM104.535 56.0067V20.7529H142.998C144.944 20.8625 146.846 21.3692 148.589 22.242C150.333 23.1147 151.879 24.335 153.134 25.8279C155.435 28.4132 156.947 31.6046 157.493 35.0237C158.039 38.4428 157.595 41.9465 156.215 45.1211C154.834 48.2958 152.575 51.009 149.703 52.938C146.831 54.8669 143.468 55.9318 140.011 56.0067H104.535Z"
          fill={`url(#${id3})`}
        />
      </g>
      <defs>
        <linearGradient id={id1} x1="244" y1="-2.86955e-07" x2="214.643" y2="178.348" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E1DAEE" />
          <stop offset="1" stopColor="#7957B2" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={id2} x1="244" y1="-2.86955e-07" x2="214.643" y2="178.348" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E1DAEE" />
          <stop offset="1" stopColor="#7957B2" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={id3} x1="244" y1="-2.86955e-07" x2="214.643" y2="178.348" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E1DAEE" />
          <stop offset="1" stopColor="#7957B2" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  )
}
export const IRifyHomeGhostIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyHomeGhost} {...props} />
}

const IRifyDivergency = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="303" height="224" viewBox="0 0 303 224" fill="none">
      <g filter="url(#filter0_f_52129_126008)">
        <ellipse cx="206.5" cy="49.5" rx="76.5" ry="49.5" fill="#DC5CDF" />
      </g>
      <defs>
        <filter
          id="filter0_f_52129_126008"
          x="0"
          y="-130"
          width="413"
          height="359"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="65" result="effect1_foregroundBlur_52129_126008" />
        </filter>
      </defs>
    </svg>
  )
}

export const IRifyDivergencyIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyDivergency} {...props} />
}

const IRifyHomeSerious = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="24" viewBox="0 0 6 24" fill="none">
      <rect x="0.5" y="0.5" width="5" height="23" stroke="#B93939" />
      <rect x="1" y="21" width="4" height="2" fill="#B93939" />
    </svg>
  )
}

export const IRifyHomeSeriousIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyHomeSerious} {...props} />
}

const IRifyHomeHigh = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="24" viewBox="0 0 6 24" fill="none">
      <rect x="0.5" y="0.5" width="5" height="23" stroke="#F15757" />
      <rect x="0.5" y="21" width="5" height="2" fill="#F15757" />
    </svg>
  )
}

export const IRifyHomeHighIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyHomeHigh} {...props} />
}

const IRifyHomeMedium = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="24" viewBox="0 0 6 24" fill="none">
      <rect x="0.5" y="0.5" width="5" height="23" stroke="#F6A823" />
      <rect x="1" y="9" width="4" height="14" fill="#F6A823" />
    </svg>
  )
}

export const IRifyHomeMediumIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyHomeMedium} {...props} />
}

const IRifyHomeLow = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="24" viewBox="0 0 6 24" fill="none">
      <rect x="0.5" y="0.5" width="5" height="23" stroke="#FFCE1E" />
      <rect x="1" y="9" width="4" height="14" fill="#FFCE1E" />
    </svg>
  )
}

export const IRifyHomeLowIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyHomeLow} {...props} />
}
